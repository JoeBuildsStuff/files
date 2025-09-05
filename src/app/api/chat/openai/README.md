# OpenAI Chat API

This directory contains the OpenAI integration for the chat API, supporting GPT-5 models with function calling capabilities.

## Features

- **GPT-5 Models**: Support for `gpt-5`, `gpt-5-mini`, and `gpt-5-nano`
- **Function Calling**: Full support for the existing tool system (contacts, meetings, etc.)
- **Reasoning Effort**: Configurable reasoning effort levels (low, medium, high)
- **File Attachments**: Support for file uploads (converted to text descriptions)
- **Context Awareness**: Full integration with page context and chat history

## Environment Variables

Set the following environment variable:

```bash
OPENAI_API_KEY=your_openai_api_key_here
```

## API Endpoint

- **URL**: `/api/chat/openai`
- **Method**: `POST`
- **Content-Type**: `multipart/form-data` or `application/json`

## Request Parameters

- `message` (string, required): The user's message
- `context` (string, optional): JSON stringified page context
- `messages` (string, optional): JSON stringified chat history
- `model` (string, optional): OpenAI model name (defaults to `gpt-5`)
- `reasoning_effort` (string, optional): Reasoning effort level - `low`, `medium`, or `high` (defaults to `medium`)
- `attachments` (files, optional): File attachments

## Response Format

```typescript
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
```

## Function Calling

The OpenAI integration automatically converts the existing Anthropic tool definitions to OpenAI function format, supporting:

- `create_person_contact`: Create new person contacts
- `update_person_contact`: Update existing person contacts
- `create_meeting`: Create new meetings
- `search_meetings`: Search for existing meetings
- `search_persons`: Search for person contacts

## Usage Example

```typescript
const formData = new FormData()
formData.append('message', 'Create a new contact for John Doe')
formData.append('model', 'gpt-5')
formData.append('reasoning_effort', 'high')

const response = await fetch('/api/chat/openai', {
  method: 'POST',
  body: formData
})

const result = await response.json()
console.log(result.message)
```

## Differences from Anthropic

- **No Web Search**: OpenAI doesn't have built-in web search capabilities
- **No Citations**: OpenAI doesn't provide citation information like Anthropic
- **File Handling**: File attachments are converted to text descriptions since OpenAI doesn't support file uploads in chat completions
- **Reasoning Effort**: The `reasoning_effort` parameter is passed but not currently used by OpenAI (kept for future compatibility)

## Error Handling

The API includes comprehensive error handling for:
- Missing API keys
- Invalid requests
- OpenAI API errors
- Function execution errors

## Security

- API key validation
- Input sanitization
- Function execution sandboxing
- Rate limiting (handled by OpenAI)