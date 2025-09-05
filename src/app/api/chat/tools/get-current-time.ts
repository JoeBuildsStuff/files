import type { Anthropic } from '@anthropic-ai/sdk'

// Tool definition for getting current system date and time
export const getCurrentTimeTool: Anthropic.Tool = {
  name: 'get_current_time',
  description: 'Get the current system date and time in various formats',
  input_schema: {
    type: 'object' as const,
    properties: {
      format: {
        type: 'string',
        description: 'The format for the date/time output. Options: "iso" (ISO 8601), "readable" (human readable), "timestamp" (Unix timestamp), or "all" (all formats). Defaults to "readable".',
        enum: ['iso', 'readable', 'timestamp', 'all']
      },
      timezone: {
        type: 'string',
        description: 'The timezone to display the time in. Defaults to the system timezone. Examples: "UTC", "America/New_York", "Europe/London", etc.'
      }
    },
    required: []
  }
}

// Execution function for getting current time
export async function executeGetCurrentTime(parameters: Record<string, unknown>): Promise<{ success: boolean; data?: unknown; error?: string }> {
  try {
    const format = (parameters.format as string) || 'readable'
    const timezone = (parameters.timezone as string) || undefined
    
    const now = new Date()
    
    const result: Record<string, string> = {}
    
    if (format === 'all' || format === 'iso') {
      result.iso = now.toISOString()
    }
    
    if (format === 'all' || format === 'readable') {
      if (timezone) {
        try {
          result.readable = now.toLocaleString('en-US', { 
            timeZone: timezone,
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            timeZoneName: 'short'
          })
        } catch {
          result.readable = now.toLocaleString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            timeZoneName: 'short'
          })
        }
      } else {
        result.readable = now.toLocaleString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          timeZoneName: 'short'
        })
      }
    }
    
    if (format === 'all' || format === 'timestamp') {
      result.timestamp = Math.floor(now.getTime() / 1000).toString()
    }
    
    // Add timezone info if requested
    if (timezone) {
      result.timezone = timezone
    }
    
    // Add system timezone info
    result.systemTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone

    console.log('Current time result:', result)
    
    return {
      success: true,
      data: {
        message: 'Current system date and time retrieved successfully',
        currentTime: result,
        requestedFormat: format,
        requestedTimezone: timezone || 'system default'
      }
    }
  } catch (error) {
    console.error('Get current time execution error:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    }
  }
}
