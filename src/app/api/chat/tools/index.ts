import type { Anthropic } from '@anthropic-ai/sdk'
import { getCurrentTimeTool, executeGetCurrentTime } from './get-current-time'

// Export all tool definitions
export const availableTools: Anthropic.Tool[] = [
  getCurrentTimeTool
]

// Export all execution functions
export const toolExecutors: Record<string, (parameters: Record<string, unknown>) => Promise<{ success: boolean; data?: unknown; error?: string }>> = {
  get_current_time: executeGetCurrentTime
}

// Re-export individual tools for direct access
export { 
  getCurrentTimeTool, 
  executeGetCurrentTime
}
