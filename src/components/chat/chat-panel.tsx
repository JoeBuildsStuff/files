'use client'

import { useChatStore } from '@/lib/chat/chat-store'
import { useChat } from '@/hooks/use-chat'
import { cn } from '@/lib/utils'
import { ChatHeader } from '@/components/chat/chat-header'
import { ChatMessagesList } from '@/components/chat/chat-messages-list'
import { ChatInput } from '@/components/chat/chat-input'
import { ChatHistory } from '@/components/chat/chat-history'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

export function ChatPanel() {
  const { isOpen, isMinimized, isMaximized, showHistory } = useChatStore()
  const router = useRouter()
  
  const { handleActionClick } = useChat({
    onActionClick: (action) => {
      // Handle different action types
      switch (action.type) {
        case 'filter':
          // Apply filter to current page
          const filterParams = new URLSearchParams(window.location.search)
          filterParams.set(`${action.payload.columnId}`, String(action.payload.value))
          router.push(`${window.location.pathname}?${filterParams.toString()}`)
          break
          
        case 'sort':
          // Apply sorting to current page
          const sortParams = new URLSearchParams(window.location.search)
          sortParams.set('sortBy', String(action.payload.columnId))
          sortParams.set('sortOrder', String(action.payload.direction))
          router.push(`${window.location.pathname}?${sortParams.toString()}`)
          break
          
        case 'navigate':
          // Navigate to different page
          const targetPath = action.payload.clearFilters 
            ? String(action.payload.pathname)
            : `${action.payload.pathname}?${window.location.search}`
          router.push(targetPath)
          break
          
        case 'create':
          // Handle create actions (could open forms, etc.)
          toast.success(`Action: ${action.label}`)
          break
          
        case 'function_call':
          // Function calls are handled by the API, just show feedback
          toast.success(`Executed: ${action.label}`)
          // Refresh the page to show new data
          router.refresh()
          break
          
        default:
          console.log('Unknown action type:', action)
      }
    }
  })

  // Don't render if not open or minimized
  if (!isOpen || isMinimized) {
    return null
  }

  return (
    <div 
      className={cn(
        "z-40 bg-background border border-border flex flex-col transition-all duration-300 ease-in-out",
        // Maximized state - takes up right side of layout
        isMaximized && [
          "fixed top-0 right-0 h-full w-96",
          "border-l border-t-0 border-r-0 border-b-0 rounded-none"
        ],
        // Normal state - floating panel
        !isMaximized && [
          "fixed bottom-2 right-2",
          "w-full sm:w-96 h-full sm:h-[600px]",
          "rounded-3xl shadow-2xl"
        ]
      )}
    >
      {showHistory ? (
        // Chat History View
        <ChatHistory />
      ) : (
        // Regular Chat View
        <>
          {/* Chat Header */}
          <ChatHeader />
          
          {/* Messages Area */}
          <div className="flex-1 flex flex-col min-h-0">
            <ScrollArea className="flex-1 h-full">
              <div className="p-3">
                <ChatMessagesList onActionClick={handleActionClick} />
              </div>
            </ScrollArea>
          </div>
          
          {/* Input Area */}
          <div className="bg-transparent">
            <ChatInput />
          </div>
        </>
      )}
    </div>
  )
} 