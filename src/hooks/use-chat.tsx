'use client'

import { useCallback, useMemo } from 'react'
import { useChatStore } from '@/lib/chat/chat-store'
import { toast } from 'sonner'
import type { ChatMessage, ChatAction, PageContext } from '@/types/chat'
import type { Attachment } from '@/components/chat/chat-input'

interface UseChatProps {
  onSendMessage?: (message: string, attachments?: Attachment[]) => Promise<void>
  onActionClick?: (action: ChatAction) => void
}

export function useChat({ onSendMessage, onActionClick }: UseChatProps = {}) {
  const {
    messages,
    isOpen,
    isMinimized,
    isLoading,
    currentContext,
    currentSessionId,
    createSession,
    addMessage,
    updateMessage,
    deleteMessage,
    clearMessages,
    setOpen,
    setMinimized,
    setLoading,
    toggleChat,
    updatePageContext,
  } = useChatStore()

  // Default API handler
  const sendToAPI = useCallback(async (content: string, context: PageContext | null, attachments?: Attachment[], model?: string, reasoningEffort?: 'low' | 'medium' | 'high') => {
    const formData = new FormData()
    formData.append('message', content)
    formData.append('context', JSON.stringify(context))
    formData.append('messages', JSON.stringify(messages.slice(-10))) // Send last 10 messages for context
    if (model) {
      formData.append('model', model)
    }
    if (reasoningEffort) {
      formData.append('reasoning_effort', reasoningEffort)
    }
    
    // Add attachments if any
    if (attachments && attachments.length > 0) {
      attachments.forEach((attachment, index) => {
        formData.append(`attachment-${index}`, attachment.file)
        formData.append(`attachment-${index}-name`, attachment.name)
        formData.append(`attachment-${index}-type`, attachment.type)
        formData.append(`attachment-${index}-size`, attachment.size.toString())
      })
      formData.append('attachmentCount', attachments.length.toString())
    }

    const response = await fetch('/api/chat', {
      method: 'POST',
      body: formData,
    })

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`)
    }

    const result = await response.json()
    
    // Add the assistant message with tool calls and citations if available
    const assistantMessage: Omit<ChatMessage, 'id' | 'timestamp'> = {
      role: 'assistant',
      content: result.message || 'I apologize, but I couldn\'t generate a response.',
      suggestedActions: result.actions || [],
      toolCalls: result.toolCalls || undefined,
      citations: result.citations || undefined
    }
    
    addMessage(assistantMessage)
  }, [messages, addMessage])

  // Handle sending a new message
  const sendMessage = useCallback(async (content: string, attachments?: Attachment[], model?: string, reasoningEffort?: 'low' | 'medium' | 'high') => {
    if (!content.trim() && (!attachments || attachments.length === 0) || isLoading) return

    // Ensure we have a current session
    if (!currentSessionId) {
      createSession()
    }

    // Process attachments to include base64 data for images
    const processedAttachments = await Promise.all(
      (attachments || []).map(async (attachment) => {
        const baseAttachment = {
          id: attachment.id,
          name: attachment.name,
          size: attachment.size,
          type: attachment.type
        }

        // Convert images to base64 for preview in message bubbles
        if (attachment.type.startsWith('image/')) {
          try {
            const arrayBuffer = await attachment.file.arrayBuffer()
            const base64 = Buffer.from(arrayBuffer).toString('base64')
            return {
              ...baseAttachment,
              data: `data:${attachment.type};base64,${base64}`
            }
          } catch (error) {
            console.error('Failed to convert image to base64:', error)
            return baseAttachment
          }
        }

        return baseAttachment
      })
    )

    // Add user message immediately
    const userMessage: Omit<ChatMessage, 'id' | 'timestamp'> = {
      role: 'user',
      content: content.trim() || 'Sent with attachments',
      attachments: processedAttachments,
      context: currentContext ? {
        filters: currentContext.currentFilters,
        data: {
          totalCount: currentContext.totalCount,
          visibleDataSample: currentContext.visibleData.slice(0, 3) // Limit context data
        }
      } : undefined
    }

    try {
      addMessage(userMessage)
    } catch (error) {
      console.error('Failed to add message due to storage quota:', error)
      toast.error('Storage quota exceeded', {
        description: 'Old sessions have been cleared to make room for your message.',
        duration: 6000,
      })
      // Add a system message to inform the user
      addMessage({
        role: 'system',
        content: '⚠️ Storage quota exceeded. Some old chat sessions have been automatically cleared to make room for new messages.',
      })
      // Try to add the user message again
      addMessage(userMessage)
    }

    // Set loading state
    setLoading(true)

    try {
      // Call custom send handler if provided, otherwise use default API call
      if (onSendMessage) {
        await onSendMessage(content, attachments)
      } else {
        // Determine which API to use based on model selection
        const isCerebrasModel = model?.startsWith('gpt-oss-120b') && !model.includes(':')
        const isLocalLlamaModel = model?.startsWith('gpt-oss:')
        const isOpenAIModel = model?.startsWith('gpt-5')
        
        if (isCerebrasModel) {
          // Use Cerebras API
          const cerebrasFormData = new FormData()
          cerebrasFormData.append('message', content)
          cerebrasFormData.append('context', JSON.stringify(currentContext))
          cerebrasFormData.append('messages', JSON.stringify(messages.slice(-10)))
          if (model) {
            cerebrasFormData.append('model', model)
          }
          if (reasoningEffort) {
            cerebrasFormData.append('reasoning_effort', reasoningEffort)
          }
          
          // Add attachments if any
          if (attachments && attachments.length > 0) {
            attachments.forEach((attachment, index) => {
              cerebrasFormData.append(`attachment-${index}`, attachment.file)
              cerebrasFormData.append(`attachment-${index}-name`, attachment.name)
              cerebrasFormData.append(`attachment-${index}-type`, attachment.type)
              cerebrasFormData.append(`attachment-${index}-size`, attachment.size.toString())
            })
            cerebrasFormData.append('attachmentCount', attachments.length.toString())
          }

          const response = await fetch('/api/chat/cerebras', {
            method: 'POST',
            body: cerebrasFormData,
          })

          if (!response.ok) {
            throw new Error(`Cerebras API error: ${response.status}`)
          }

          const result = await response.json()
          
          // Add the assistant message with tool calls and citations if available
          const assistantMessage: Omit<ChatMessage, 'id' | 'timestamp'> = {
            role: 'assistant',
            content: result.message || 'I apologize, but I couldn\'t generate a response.',
            suggestedActions: result.actions || [],
            toolCalls: result.toolCalls || undefined,
            citations: result.citations || undefined
          }
          
          addMessage(assistantMessage)
        } else if (isLocalLlamaModel) {
          // Use Local Llama API
          const localLlamaFormData = new FormData()
          localLlamaFormData.append('message', content)
          localLlamaFormData.append('context', JSON.stringify(currentContext))
          localLlamaFormData.append('messages', JSON.stringify(messages.slice(-10)))
          if (model) {
            localLlamaFormData.append('model', model)
          }
          if (reasoningEffort) {
            localLlamaFormData.append('reasoning_effort', reasoningEffort)
          }
          
          // Add attachments if any
          if (attachments && attachments.length > 0) {
            attachments.forEach((attachment, index) => {
              localLlamaFormData.append(`attachment-${index}`, attachment.file)
              localLlamaFormData.append(`attachment-${index}-name`, attachment.name)
              localLlamaFormData.append(`attachment-${index}-type`, attachment.type)
              localLlamaFormData.append(`attachment-${index}-size`, attachment.size.toString())
            })
            localLlamaFormData.append('attachmentCount', attachments.length.toString())
          }

          const response = await fetch('/api/chat/local-llama/openai', {
            method: 'POST',
            body: localLlamaFormData,
          })

          if (!response.ok) {
            throw new Error(`Local Llama API error: ${response.status}`)
          }

          const result = await response.json()
          
          // Add the assistant message with tool calls and citations if available
          const assistantMessage: Omit<ChatMessage, 'id' | 'timestamp'> = {
            role: 'assistant',
            content: result.message || 'I apologize, but I couldn\'t generate a response.',
            reasoning: result.reasoning || undefined,
            suggestedActions: result.actions || [],
            toolCalls: result.toolCalls || undefined,
            citations: result.citations || undefined
          }
          
          addMessage(assistantMessage)
        } else if (isOpenAIModel) {
          // Use OpenAI API
          const openaiFormData = new FormData()
          openaiFormData.append('message', content)
          openaiFormData.append('context', JSON.stringify(currentContext))
          openaiFormData.append('messages', JSON.stringify(messages.slice(-10)))
          if (model) {
            openaiFormData.append('model', model)
          }
          if (reasoningEffort) {
            openaiFormData.append('reasoning_effort', reasoningEffort)
          }
          
          // Add attachments if any
          if (attachments && attachments.length > 0) {
            attachments.forEach((attachment, index) => {
              openaiFormData.append(`attachment-${index}`, attachment.file)
              openaiFormData.append(`attachment-${index}-name`, attachment.name)
              openaiFormData.append(`attachment-${index}-type`, attachment.type)
              openaiFormData.append(`attachment-${index}-size`, attachment.size.toString())
            })
            openaiFormData.append('attachmentCount', attachments.length.toString())
          }

          const response = await fetch('/api/chat/openai', {
            method: 'POST',
            body: openaiFormData,
          })

          if (!response.ok) {
            throw new Error(`OpenAI API error: ${response.status}`)
          }

          const result = await response.json()
          
          // Add the assistant message with tool calls and citations if available
          const assistantMessage: Omit<ChatMessage, 'id' | 'timestamp'> = {
            role: 'assistant',
            content: result.message || 'I apologize, but I couldn\'t generate a response.',
            suggestedActions: result.actions || [],
            toolCalls: result.toolCalls || undefined,
            citations: result.citations || undefined
          }
          
          addMessage(assistantMessage)
        } else {
          // Default API call (Anthropic)
          await sendToAPI(content, currentContext, attachments, model, reasoningEffort)
        }
      }
    } catch (error) {
      console.error('Failed to send message:', error)
      // Add error message
      addMessage({
        role: 'assistant',
        content: 'Sorry, I encountered an error while processing your message. Please try again.',
      })
    } finally {
      // Always clear loading state
      setLoading(false)
    }
  }, [currentContext, currentSessionId, createSession, addMessage, onSendMessage, isLoading, setLoading, sendToAPI])

  // Handle action clicks
  const handleActionClick = useCallback((action: ChatAction) => {
    if (onActionClick) {
      onActionClick(action)
    } else {
      // Default action handling
      console.log('Action clicked:', action)
      // Add confirmation message
      addMessage({
        role: 'system',
        content: `Action executed: ${action.label}`,
      })
    }
  }, [onActionClick, addMessage])

  // Get unread message count
  const getUnreadCount = useCallback(() => {
    if (isOpen) return 0
    // Count assistant messages since last opened
    // For now, just return 0 - this could be enhanced with proper read tracking
    return 0
  }, [isOpen])

  // Chat state utilities
  const chatState = useMemo(() => ({
    isEmpty: messages.length === 0,
    hasMessages: messages.length > 0,
    lastMessage: messages[messages.length - 1] || null,
    messageCount: messages.length,
    isTyping: isLoading, // Use loading state as typing indicator
  }), [messages, isLoading])

  // Context utilities
  const contextInfo = useMemo(() => {
    if (!currentContext) {
      return {
        hasContext: false,
        pageDescription: 'No page context available',
        summary: 'Unable to determine current page context'
      }
    }

    const { totalCount, currentFilters, currentSort, visibleData } = currentContext
    const hasFilters = (currentFilters as Record<string, unknown>)?.activeFiltersCount as number > 0
    const hasSorting = (currentSort as Record<string, unknown>)?.activeSortsCount as number > 0

    return {
      hasContext: true,
      pageDescription: 'Current data view',
      summary: `Viewing ${totalCount} items${hasFilters ? ' (filtered)' : ''}${hasSorting ? ' (sorted)' : ''}`,
      hasFilters,
      hasSorting,
      dataCount: totalCount,
      visibleCount: visibleData.length
    }
  }, [currentContext])

  return {
    // State
    messages,
    isOpen,
    isMinimized,
    isLoading,
    currentContext,
    chatState,
    contextInfo,

    // Actions
    sendMessage,
    addMessage,
    updateMessage,
    deleteMessage,
    clearMessages,
    handleActionClick,

    // UI State
    setOpen,
    setMinimized,
    toggleChat,
    openChat: () => setOpen(true),
    closeChat: () => setOpen(false),
    minimizeChat: () => setMinimized(true),
    maximizeChat: () => setMinimized(false),

    // Context
    updatePageContext,

    // Utilities
    getUnreadCount,
    hasUnread: getUnreadCount() > 0,

    // Convenience methods
    clearAndClose: () => {
      clearMessages()
      setOpen(false)
    },
    
    canSendMessage: (content: string) => {
      return content.trim().length > 0 && !isLoading
    },

    // Get context summary for display
    getContextSummary: () => {
      if (!currentContext) return null
      
      const { totalCount, currentFilters, currentSort } = currentContext
      const hasFilters = (currentFilters as Record<string, unknown>)?.activeFiltersCount as number > 0
      const hasSorting = (currentSort as Record<string, unknown>)?.activeSortsCount as number > 0
      
      let summary = `${totalCount} items`
      if (hasFilters) summary += ' (filtered)'
      if (hasSorting) summary += ' (sorted)'
      
      return summary
    },

    // Get suggested prompts based on context
    getSuggestedPrompts: () => {
      if (!currentContext) return []
      
      const { totalCount } = currentContext
      const hasData = totalCount > 0
      
      if (!hasData) {
        return [
          `Why are there no items?`,
          `How can I add a new item?`,
          `Show me how to import items`
        ]
      }

      return [
        `Filter items by status`,
        `Show me recent items`,
        `Sort items by priority`
      ]
    }
  }
} 