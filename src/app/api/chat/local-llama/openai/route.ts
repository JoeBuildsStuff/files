import { NextRequest, NextResponse } from 'next/server'
import type { ChatMessage, PageContext } from '@/types/chat'
import { availableTools, toolExecutors } from '../../tools'
import { createClient } from '@/lib/supabase/server'

interface LocalLlamaAPIRequest {
  message: string
  context?: PageContext | null
  messages?: ChatMessage[]
  model?: string
  stream?: boolean
  max_completion_tokens?: number
  temperature?: number
  top_p?: number
  attachments?: Array<{
    file: File
    name: string
    type: string
    size: number
  }>
}

interface LocalLlamaAPIResponse {
  message: string
  stream?: ReadableStream
  rawResponse?: unknown
  toolCalls?: Array<{
    id: string
    name: string
    arguments: Record<string, unknown>
    result?: {
      success: boolean
      data?: unknown
      error?: string
    }
  }>
  citations?: Array<{
    url: string
    title: string
    cited_text: string
  }>
}

// Ollama response type interfaces

interface OllamaResponse {
  choices?: Array<{
    message?: {
      content?: string
      tool_calls?: Array<{
        id: string
        function: {
          name: string
          arguments: string
        }
      }>
    }
  }>
}

// Convert tools to Ollama format (OpenAI Chat Completions format)
function convertToolsToOllamaFormat(tools: Array<{ name: string; description?: string; input_schema: Record<string, unknown> }>) {
  return tools.map(tool => ({
    type: "function",
    function: {
      name: tool.name,
      description: tool.description || `Tool for ${tool.name}`,
      parameters: tool.input_schema
    }
  }))
}

// Execute function calls for Ollama
async function executeFunctionCall(functionName: string, parameters: Record<string, unknown>): Promise<{ success: boolean; data?: unknown; error?: string }> {
  try {
    const executor = toolExecutors[functionName]
    if (!executor) {
      return { success: false, error: `Unknown function: ${functionName}` }
    }
    
    return await executor(parameters)
  } catch (error) {
    console.error('Function execution error:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error occurred' }
  }
}

export async function POST(request: NextRequest): Promise<NextResponse<LocalLlamaAPIResponse>> {
  try {
    // Check authentication
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error('User not authenticated for Local Llama chat API:', userError);
      return NextResponse.json({ 
        message: 'User not authenticated'
      }, { status: 401 });
    }

    let body: LocalLlamaAPIRequest

    // Check if the request is multipart/form-data (file upload)
    const contentType = request.headers.get('content-type') || ''
    
    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData()
      
      const message = formData.get('message') as string
      const contextStr = formData.get('context') as string
      const messagesStr = formData.get('messages') as string
      const model = formData.get('model') as string
      const stream = formData.get('stream') === 'true'
      const maxCompletionTokens = parseInt(formData.get('max_completion_tokens') as string || '4096')
      const temperature = parseFloat(formData.get('temperature') as string || '0.7')
      const topP = parseFloat(formData.get('top_p') as string || '0.9')
      const attachmentCount = parseInt(formData.get('attachmentCount') as string || '0')
      
      const context = contextStr && contextStr !== 'null' ? JSON.parse(contextStr) : null
      const messages = messagesStr ? JSON.parse(messagesStr) : []
      
      const attachments: Array<{ file: File; name: string; type: string; size: number }> = []
      
      // Process attachments
      for (let i = 0; i < attachmentCount; i++) {
        const file = formData.get(`attachment-${i}`) as File
        const name = formData.get(`attachment-${i}-name`) as string
        const type = formData.get(`attachment-${i}-type`) as string
        const size = parseInt(formData.get(`attachment-${i}-size`) as string || '0')
        
        if (file) {
          attachments.push({ file, name, type, size })
        }
      }
      
      body = { 
        message, 
        context, 
        messages, 
        model, 
        stream,
        max_completion_tokens: maxCompletionTokens,
        temperature,
        top_p: topP,
        attachments 
      }
    } else {
      // Handle JSON request
      body = await request.json()
    }

    const { 
      message, 
      context, 
      messages = [], 
      model = 'gpt-oss:20b',
      stream = false,
      max_completion_tokens = 4096,
      temperature = 0.7,
      top_p = 0.9,
      attachments = [] 
    } = body

    // Validate input
    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { message: 'Invalid message content' },
        { status: 400 }
      )
    }

    const response = await getOllamaResponse(
      messages, 
      message, 
      context || null, 
      attachments, 
      model,
      stream,
      max_completion_tokens,
      temperature,
      top_p
    )

    return NextResponse.json(response)
  } catch (error) {
    console.error('Local Llama API error:', error)
    
    // More specific error handling
    if (error instanceof Error) {
      if (error.message.includes('ECONNREFUSED') || error.message.includes('fetch')) {
        return NextResponse.json(
          { message: 'Cannot connect to local Ollama instance. Please ensure Ollama is running on localhost:11434' },
          { status: 503 }
        )
      }
      
      return NextResponse.json(
        { message: `Error: ${error.message}` },
        { status: 500 }
      )
    }
    
    return NextResponse.json(
      { message: 'I apologize, but I encountered an error processing your request. Please try again.' },
      { status: 500 }
    )
  }
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

async function getOllamaResponse(
  history: ChatMessage[],
  newUserMessage: string,
  context: PageContext | null,
  attachments: Array<{ file: File; name: string; type: string; size: number }> = [],
  model: string = 'gpt-oss:20b',
  stream: boolean = false,
  max_completion_tokens: number = 4096,
  temperature: number = 0.7,
  top_p: number = 0.9
): Promise<LocalLlamaAPIResponse> {
  try {
    // 1. System Prompt
    let systemPrompt = `You are a helpful assistant with access to a simple tool for getting the current system date and time.

Available Tools:
- get_current_time: Returns the current system date and time in various formats (ISO, readable, timestamp, or all formats)

Guidelines:
- When users ask for the current time, date, or timestamp, use the get_current_time function
- You can specify different formats (iso, readable, timestamp, all) and timezones
- Be helpful and provide clear, formatted responses about time and date information
- If users ask about time in different timezones, use the timezone parameter`
    
    if (context) {
      systemPrompt += `\n\n## Current Page Context:\n- Total items: ${context.totalCount}\n- Current filters: ${JSON.stringify(context.currentFilters, null, 2)}\n- Current sorting: ${JSON.stringify(context.currentSort, null, 2)}\n- Visible data sample: ${JSON.stringify(context.visibleData.slice(0, 3), null, 2)}`
    }

    // 2. Convert tools to Ollama format
    const ollamaTools = convertToolsToOllamaFormat(availableTools)

    // 3. Map history to Ollama format (filter out system messages)
    type OllamaMessage = 
      | { role: 'system'; content: string }
      | { role: 'user'; content: string }
      | { role: 'assistant'; content: string; tool_calls?: Array<{ id: string; type: 'function'; function: { name: string; arguments: string } }> }
      | { role: 'tool'; content: string; tool_call_id: string };

    const ollamaHistory: OllamaMessage[] = [
      { role: 'system', content: systemPrompt }
    ];

    // Add conversation history - only include user messages and final assistant responses
    // Tool calls and their results should be handled in the current conversation flow, not from history
    history
      .filter(msg => msg.role !== 'system')
      .forEach(msg => {
        if (msg.role === 'assistant' && msg.toolCalls && msg.toolCalls.length > 0) {
          // Skip assistant messages with tool calls from history
          // These will be handled in the current conversation flow
          return;
        } else {
          ollamaHistory.push({
            role: msg.role as 'user' | 'assistant',
            content: msg.content,
          });
        }
      });

    // 4. Construct the new user message with attachments
    let userContent = newUserMessage;

    for (const attachment of attachments) {
      if (attachment.type.startsWith('image/')) {
        const arrayBuffer = await attachment.file.arrayBuffer();
        const base64 = Buffer.from(arrayBuffer).toString('base64');
        
        // Add image description to the message
        userContent += `\n\nImage attachment: ${attachment.name} (${attachment.type}, ${formatFileSize(attachment.size)})\nBase64 data: ${base64}`;
      } else {
        userContent += `\n\nFile attachment: ${attachment.name} (${attachment.type}, ${formatFileSize(attachment.size)})`;
      }
    }

    // Add the new user message
    ollamaHistory.push({
      role: 'user',
      content: userContent
    });

    // 5. Multi-turn tool calling with maximum of 5 iterations
    let maxIterations = 5;
    const currentMessages = [...ollamaHistory];
    let finalResponse = null;
    const allToolCalls: Array<{
      id: string
      name: string
      arguments: Record<string, unknown>
      result?: {
        success: boolean
        data?: unknown
        error?: string
      }
    }> = [];

    while (maxIterations > 0) {
      // 6. Make the API call to local Ollama instance
      const ollamaUrl = 'http://localhost:11434/v1/chat/completions';
      
      if (stream) {
        // Handle streaming response (simplified - no tool calls in streaming mode)
        const streamResponse = await fetch(ollamaUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messages: currentMessages,
            model: model,
            stream: true,
            max_tokens: max_completion_tokens,
            temperature: temperature,
            top_p: top_p
          })
        });

        if (!streamResponse.ok) {
          throw new Error(`Ollama API error: ${streamResponse.status} ${streamResponse.statusText}`);
        }

        // Create a ReadableStream for the response
        const readableStream = new ReadableStream({
          async start(controller) {
            try {
              const reader = streamResponse.body?.getReader();
              if (!reader) {
                throw new Error('No response body');
              }

              while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = new TextDecoder().decode(value);
                const lines = chunk.split('\n').filter(line => line.trim());
                
                for (const line of lines) {
                  if (line.startsWith('data: ')) {
                    const data = line.slice(6);
                    if (data === '[DONE]') {
                      controller.close();
                      return;
                    }
                    
                    try {
                      const parsed = JSON.parse(data);
                      const content = parsed.choices?.[0]?.delta?.content || '';
                      if (content) {
                        controller.enqueue(new TextEncoder().encode(content));
                      }
                    } catch {
                      // Skip invalid JSON chunks
                    }
                  }
                }
              }
              controller.close();
            } catch (error) {
              controller.error(error);
            }
          }
        });

        return {
          message: 'Streaming response initiated',
          stream: readableStream,
          rawResponse: streamResponse
        };
      } else {
        // Handle non-streaming response with tool calling
        const response = await fetch(ollamaUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messages: currentMessages,
            model: model,
            stream: false,
            max_tokens: max_completion_tokens,
            temperature: temperature,
            top_p: top_p,
            tools: ollamaTools
          })
        });

        if (!response.ok) {
          throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
        }

        const responseData = await response.json() as OllamaResponse;
        const message = responseData.choices?.[0]?.message;
        
        if (!message) {
          throw new Error('No message in response');
        }

        // Check for tool calls
        if (message.tool_calls && message.tool_calls.length > 0) {
          // Save the assistant's message exactly as returned (including tool_calls)
          currentMessages.push({
            role: 'assistant',
            content: message.content || '',
            tool_calls: message.tool_calls.map(tc => ({
              id: tc.id,
              type: 'function' as const,
              function: tc.function
            }))
          });

          // Execute all tools in parallel
          const toolResults = await Promise.all(
            message.tool_calls.map(async (toolCall) => {
              const functionResult = await executeFunctionCall(
                toolCall.function.name, 
                JSON.parse(toolCall.function.arguments)
              );
              
              // Store tool call information
              allToolCalls.push({
                id: toolCall.id,
                name: toolCall.function.name,
                arguments: JSON.parse(toolCall.function.arguments),
                result: functionResult
              });
              
              return {
                role: 'tool' as const,
                content: functionResult.success ? JSON.stringify(functionResult.data) : functionResult.error || 'Unknown error',
                tool_call_id: toolCall.id
              };
            })
          );
          
          // Append tool results to messages
          currentMessages.push(...toolResults);

          maxIterations--;
        } else {
          // No more tools to execute, this is our final response
          finalResponse = responseData;
          break;
        }
      }
    }

    // Handle the final response
    if (finalResponse) {
      const content = finalResponse.choices?.[0]?.message?.content || 'No response generated';

      return {
        message: content,
        toolCalls: allToolCalls.length > 0 ? allToolCalls : undefined,
        rawResponse: finalResponse
      };
    }

    // Fallback response if no tools were executed
    return {
      message: 'I apologize, but I encountered an error processing your request. Please try again.',
    }
  } catch (error) {
    console.error('Ollama API error:', error)
    throw new Error('Failed to get response from local Ollama instance')
  }
}
