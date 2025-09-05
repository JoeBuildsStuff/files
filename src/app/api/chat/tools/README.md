# Chat API Tools

This directory contains the tool definitions and execution logic for the chat API. Tools are functions that the AI can call to perform specific actions.

## Structure

- `index.ts` - Exports all tools and executors
- `get-current-time.ts` - Sample tool for getting current system date and time
- `README.md` - This documentation file

## Adding a New Tool

To add a new tool, follow these steps:

1. Create a new file in this directory (e.g., `my-tool.ts`)
2. Define the tool schema and execution function:

```typescript
import type { Anthropic } from '@anthropic-ai/sdk'

// Tool definition
export const myTool: Anthropic.Tool = {
  name: 'my_tool_name',
  description: 'Description of what this tool does',
  input_schema: {
    type: 'object' as const,
    properties: {
      // Define your parameters here
      param1: {
        type: 'string',
        description: 'Description of parameter 1'
      }
    },
    required: ['param1'] // List required parameters
  }
}

// Execution function
export async function executeMyTool(parameters: Record<string, unknown>): Promise<{ success: boolean; data?: unknown; error?: string }> {
  try {
    // Your tool logic here
    const result = await someFunction(parameters)
    return { success: true, data: result }
  } catch (error) {
    console.error('My tool execution error:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error occurred' }
  }
}
```

3. Update `index.ts` to include your new tool:

```typescript
import { myTool, executeMyTool } from './my-tool'

export const availableTools: Anthropic.Tool[] = [
  createPersonContactTool,
  searchPersonsTool,
  createMeetingTool,
  searchMeetingsTool,
  myTool // Add your tool here
]

export const toolExecutors: Record<string, (parameters: Record<string, unknown>) => Promise<{ success: boolean; data?: unknown; error?: string }>> = {
  create_person_contact: executeCreatePersonContact,
  search_persons: executeSearchPersons,
  create_meeting: executeCreateMeeting,
  search_meetings: executeSearchMeetings,
  my_tool_name: executeMyTool // Add your executor here
}

export { myTool, executeMyTool }
```

## Current Tools

### get_current_time
Returns the current system date and time in various formats. This is a sample tool that demonstrates the tool system functionality.

**Parameters:**
- `format` (string, optional) - The format for the date/time output. Options: "iso" (ISO 8601), "readable" (human readable), "timestamp" (Unix timestamp), or "all" (all formats). Defaults to "readable".
- `timezone` (string, optional) - The timezone to display the time in. Defaults to the system timezone. Examples: "UTC", "America/New_York", "Europe/London", etc.

**Usage:** 
- Ask for current time: "What time is it?"
- Get time in specific format: "Give me the current time in ISO format"
- Get time in different timezone: "What's the current time in New York?"
- Get all formats: "Show me the current time in all formats"

**Example Response:**
```json
{
  "message": "Current system date and time retrieved successfully",
  "currentTime": {
    "readable": "January 15, 2025 at 2:30:45 PM PST",
    "iso": "2025-01-15T22:30:45.123Z",
    "timestamp": "1737054645",
    "systemTimezone": "America/Los_Angeles"
  },
  "requestedFormat": "all",
  "requestedTimezone": "system default"
}
```
