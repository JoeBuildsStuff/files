# Local Llama API Route

This route provides a local alternative to the Cerebras API by connecting to a locally running Ollama instance with gpt-oss models.

## Prerequisites

1. **Install Ollama**: Download and install from [ollama.ai](https://ollama.ai)
2. **Pull gpt-oss model**: Run one of these commands:
   ```bash
   # For 20B model (recommended for most systems)
   ollama pull gpt-oss:20b
   
   # For 120B model (requires more resources)
   ollama pull gpt-oss:120b
   ```
3. **Start Ollama**: Ensure Ollama is running on `localhost:11434`

## Usage

The local-llama route provides the same API interface as the Cerebras route, making it a drop-in replacement when you don't have internet access.

### API Endpoint
```
POST /api/chat/local-llama
```

### Request Format
The route accepts the same request format as the Cerebras route:

```typescript
interface LocalLlamaAPIRequest {
  message: string
  context?: PageContext | null
  messages?: ChatMessage[]
  model?: string // Default: 'gpt-oss:20b'
  stream?: boolean // Default: false
  max_completion_tokens?: number // Default: 4096
  temperature?: number // Default: 0.7
  top_p?: number // Default: 0.9
  attachments?: Array<{
    file: File
    name: string
    type: string
    size: number
  }>
}
```

### Response Format
```typescript
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
}
```

## Features

- ✅ **Tool Calling**: Supports function calling with the same tools as Cerebras
- ✅ **Streaming**: Real-time response streaming
- ✅ **File Attachments**: Image and file upload support
- ✅ **Context Awareness**: Page context integration
- ✅ **Authentication**: Supabase auth integration
- ✅ **Error Handling**: Comprehensive error handling with fallbacks

## Configuration

### Model Selection
- `gpt-oss:20b` - Smaller model, good for most use cases
- `gpt-oss:120b` - Larger model, requires more resources

### Performance Tuning
- `max_completion_tokens`: Adjust based on your needs (default: 4096)
- `temperature`: Control randomness (0.0-1.0, default: 0.7)
- `top_p`: Control diversity (0.0-1.0, default: 0.9)

## Error Handling

The route includes specific error handling for common issues:

- **Connection Refused**: When Ollama is not running
- **Model Not Found**: When the specified model isn't available
- **Authentication**: Supabase auth validation
- **Tool Execution**: Function call error handling

## Switching Between APIs

To switch from Cerebras to local-llama, simply change the API endpoint in your frontend code:

```typescript
// From:
const response = await fetch('/api/chat/cerebras', { ... })

// To:
const response = await fetch('/api/chat/local-llama', { ... })
```

The request and response formats are identical, making the switch seamless.

## Troubleshooting

### Ollama Not Running
```
Error: Cannot connect to local Ollama instance
```
**Solution**: Start Ollama service or check if it's running on port 11434

### Model Not Available
```
Error: Model 'gpt-oss:20b' not found
```
**Solution**: Pull the model with `ollama pull gpt-oss:20b`

### Performance Issues
- Try the smaller 20B model instead of 120B
- Reduce `max_completion_tokens`
- Adjust `temperature` and `top_p` parameters
- Ensure sufficient system resources (RAM/VRAM)

## Development

The route is built to be a drop-in replacement for the Cerebras API, maintaining the same interface while connecting to your local Ollama instance. This allows for seamless offline development and testing.