import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import type { ChatMessage, PageContext } from '@/types/chat'
import { availableTools, toolExecutors } from '../tools'

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
})

interface OpenAIAPIRequest {
  message: string
  context?: PageContext | null
  messages?: ChatMessage[]
  model?: string
  reasoningEffort?: 'low' | 'medium' | 'high'
  attachments?: Array<{
    file: File
    name: string
    type: string
    size: number
  }>
}

interface OpenAIAPIResponse {
  message: string
  actions?: Array<{
    type: 'filter' | 'sort' | 'navigate' | 'create' | 'function_call'
    label: string
    payload: Record<string, unknown>
  }>
  functionResult?: {
    success: boolean
    data?: unknown
    error?: string
  }
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
  rawResponse?: unknown
}

export async function POST(request: NextRequest): Promise<NextResponse<OpenAIAPIResponse>> {
  try {
    let body: OpenAIAPIRequest

    // Check if the request is multipart/form-data (file upload)
    const contentType = request.headers.get('content-type') || ''
    
    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData()
      
      const message = formData.get('message') as string
      const contextStr = formData.get('context') as string
      const messagesStr = formData.get('messages') as string
      const model = formData.get('model') as string
      const reasoningEffort = formData.get('reasoning_effort') as 'low' | 'medium' | 'high'
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
      
      body = { message, context, messages, model, reasoningEffort, attachments }
    } else {
      // Handle JSON request (backward compatibility)
      body = await request.json()
    }

    const { message, context, messages = [], model, attachments = [] } = body

    // Validate input
    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { message: 'Invalid message content' },
        { status: 400 }
      )
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { message: 'OpenAI API key is not configured' },
        { status: 500 }
      )
    }

    const response = await getOpenAIResponse(messages, message, context || null, attachments, model)

    return NextResponse.json(response)
  } catch (error) {
    console.error('OpenAI API error:', error)
    
    if (error instanceof Error) {
      if (error.message.includes('OPENAI_API_KEY')) {
        return NextResponse.json(
          { message: 'AI service is not configured. Please check the API key.' },
          { status: 500 }
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

// Convert Anthropic tools to OpenAI function format
function convertToolsToOpenAI() {
  return availableTools.map(tool => ({
    type: 'function' as const,
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.input_schema
    }
  }))
}

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

async function getOpenAIResponse(
  history: ChatMessage[],
  newUserMessage: string,
  context: PageContext | null,
  attachments: Array<{ file: File; name: string; type: string; size: number }> = [],
  model?: string
): Promise<OpenAIAPIResponse> {
  try {
    // 1. System Prompt
    let systemPrompt = `You are a helpful assistant with access to a simple tool for getting the current system date and time.

Available Tools:
- get_current_time: Returns the current system date and time in various formats (ISO, readable, timestamp, or all formats)

Guidelines:
- When users ask for the current time, date, or timestamp, use the get_current_time function
- You can specify different formats (iso, readable, timestamp, all) and timezones
- Be helpful and provide clear, formatted responses about time and date information
- If users ask about time in different timezones, use the timezone parameter

Image Processing Capabilities:
- You can analyze and understand images that users upload
- When processing images, extract relevant information and provide helpful descriptions`
    
    if (context) {
      systemPrompt += `\n\n## Current Page Context:\n- Total items: ${context.totalCount}\n- Current filters: ${JSON.stringify(context.currentFilters, null, 2)}\n- Current sorting: ${JSON.stringify(context.currentSort, null, 2)}\n- Visible data sample: ${JSON.stringify(context.visibleData.slice(0, 3), null, 2)}`
    }

    // 2. Map history to OpenAI's format (filter out system messages)
    const openaiHistory: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = history
      .filter(msg => msg.role !== 'system')
      .map(msg => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      }));

    // 3. Construct the new user message with attachments
    const newUserContent: OpenAI.Chat.Completions.ChatCompletionMessageParam = {
      role: 'user',
      content: newUserMessage
    };

    // Process attachments - OpenAI supports images via base64 data URLs
    if (attachments.length > 0) {
      const contentBlocks: OpenAI.Chat.Completions.ChatCompletionContentPart[] = [
        { type: 'text', text: newUserMessage }
      ];

      for (const attachment of attachments) {
        if (attachment.type.startsWith('image/')) {
          // Convert image to base64 data URL
          const arrayBuffer = await attachment.file.arrayBuffer();
          const base64 = Buffer.from(arrayBuffer).toString('base64');
          const dataUrl = `data:${attachment.type};base64,${base64}`;
          
          contentBlocks.push({
            type: 'image_url',
            image_url: {
              url: dataUrl,
              detail: 'auto' // Let the model decide detail level
            }
          });
        } else {
          // Non-image files as text description
          contentBlocks.push({
            type: 'text',
            text: `\n\nFile attachment: ${attachment.name} (${attachment.type}, ${formatFileSize(attachment.size)})`
          });
        }
      }

      newUserContent.content = contentBlocks;
    }
    
    const messagesForAPI: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
        { role: 'system', content: systemPrompt },
        ...openaiHistory,
        newUserContent
    ];

    // 4. Prepare tools
    const tools = convertToolsToOpenAI();

    // 5. Iterative tool calling with maximum of 5 iterations
    let maxIterations = 5;
    const currentMessages = [...messagesForAPI];
    let finalResponse = null;
    const allToolResults: Array<{ success: boolean; data?: unknown; error?: string }> = [];
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
      const response = await openai.chat.completions.create({
        model: model || 'gpt-5',
        messages: currentMessages,
        tools: tools.length > 0 ? tools : undefined,
        tool_choice: tools.length > 0 ? 'auto' : undefined,
        // max_completion_tokens: 2048,
      });

      const assistantMessage = response.choices[0]?.message;
      if (!assistantMessage) {
        break;
      }

      // Check for tool calls
      const toolCalls = assistantMessage.tool_calls;

      if (!toolCalls || toolCalls.length === 0) {
        // No more tools to execute, this is our final response
        finalResponse = response;
        break;
      }

      // Execute all tools in parallel
      const toolResults = await Promise.all(
        toolCalls.map(async (toolCall) => {
          // Type guard to check if it's a function tool call
          if (toolCall.type !== 'function') {
            console.error('Unsupported tool call type:', toolCall.type);
            return {
              role: 'tool' as const,
              tool_call_id: toolCall.id,
              content: 'Unsupported tool call type',
            };
          }

          // Parse arguments if they're a string, otherwise use as-is
          let parsedArgs: Record<string, unknown>;
          if (typeof toolCall.function.arguments === 'string') {
            try {
              parsedArgs = JSON.parse(toolCall.function.arguments);
            } catch (error) {
              console.error('Failed to parse tool arguments:', error);
              parsedArgs = {};
            }
          } else {
            parsedArgs = toolCall.function.arguments as Record<string, unknown>;
          }
          
          const functionResult = await executeFunctionCall(toolCall.function.name, parsedArgs);
          allToolResults.push(functionResult);
          
          // Store tool call information
          allToolCalls.push({
            id: toolCall.id,
            name: toolCall.function.name,
            arguments: parsedArgs,
            result: functionResult
          });
          
          return {
            role: 'tool' as const,
            tool_call_id: toolCall.id,
            content: functionResult.success ? JSON.stringify(functionResult.data) : functionResult.error || 'Unknown error',
          };
        })
      );

      // Append assistant's response to messages
      currentMessages.push(assistantMessage);
      
      // Append tool results to messages
      currentMessages.push(...toolResults);

      maxIterations--;
    }

    // Handle the final response
    if (finalResponse) {
      const assistantMessage = finalResponse.choices[0]?.message;
      const content = assistantMessage?.content || 'No response generated';

      // Get the first successful result for legacy response format
      const firstSuccessfulResult = allToolResults.find(result => result.success);

      return {
        message: content,
        functionResult: firstSuccessfulResult ? { success: true, data: firstSuccessfulResult.data } : { success: false, error: 'All tools failed' },
        toolCalls: allToolCalls.length > 0 ? allToolCalls : undefined,
        citations: [], // OpenAI doesn't provide citations like Anthropic
        actions: [],
        rawResponse: finalResponse
      }
    }

    // Fallback response if no tools were executed
    return {
      message: 'I apologize, but I encountered an error processing your request. Please try again.',
      actions: []
    }
  } catch (error) {
    console.error('OpenAI API error:', error)
    throw new Error('Failed to get response from OpenAI API')
  }
}
