'use client'

import { formatDistanceToNow } from 'date-fns'
import { ChevronDown, Lightbulb, FileText, FileVideo, File, FileArchive, FileSpreadsheet, Headphones, Image as ImageIcon, Brain } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import { ChatMessage as ChatMessageType, ChatAction } from '@/types/chat'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import ChatMessageActions from './chat-message-actions'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { formatToolCallArguments, formatToolCallResult } from '@/lib/chat/utils'
import { useState } from 'react'
import { useChatStore } from '@/lib/chat/chat-store'
import Image from 'next/image'
import Spinner from '@/components/ui/spinner'
import { CopyButton } from '@/components/ui/copy-button'

// Import highlight.js styles
import 'highlight.js/styles/github-dark.css'

interface ChatMessageProps {
  message: ChatMessageType
  onActionClick?: (action: ChatAction) => void
}

interface MessageAttachment {
  id: string
  name: string
  size: number
  type: string
  url?: string
  data?: string // base64 data for images
}

// Helper functions for file handling
const formatFileSize = (bytes: number) => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// Helper function to format tool call names from snake_case to Title Case
const formatToolCallName = (name: string) => {
  return name
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
}

const getFileIcon = (attachment: MessageAttachment) => {
  const fileType = attachment.type
  const fileName = attachment.name

  const iconMap = {
    pdf: {
      icon: FileText,
      conditions: (type: string, name: string) =>
        type.includes("pdf") ||
        name.endsWith(".pdf") ||
        type.includes("word") ||
        name.endsWith(".doc") ||
        name.endsWith(".docx"),
    },
    archive: {
      icon: FileArchive,
      conditions: (type: string, name: string) =>
        type.includes("zip") ||
        type.includes("archive") ||
        name.endsWith(".zip") ||
        name.endsWith(".rar"),
    },
    excel: {
      icon: FileSpreadsheet,
      conditions: (type: string, name: string) =>
        type.includes("excel") ||
        name.endsWith(".xls") ||
        name.endsWith(".xlsx"),
    },
    video: {
      icon: FileVideo,
      conditions: (type: string) => type.includes("video/"),
    },
    audio: {
      icon: Headphones,
      conditions: (type: string) => type.includes("audio/"),
    },
    image: {
      icon: ImageIcon,
      conditions: (type: string) => type.startsWith("image/"),
    },
  }

  for (const { icon: Icon, conditions } of Object.values(iconMap)) {
    if (conditions(fileType, fileName)) {
      return <Icon className="size-4 opacity-60" />
    }
  }

  return <File className="size-4 opacity-60" />
}

// Citation component with popover
const CitationPopover = ({ citationNumber, citation }: { 
  citationNumber: number, 
  citation: { url: string, title: string, cited_text: string } 
}) => {
  return (
    <Popover>
      <PopoverTrigger>
        <Badge className="" variant="blue">
          {citationNumber}
        </Badge>
      </PopoverTrigger>
      <PopoverContent className="p-3" align="start">
        <div className="space-y-2">
          <Badge variant="blue" className="font-medium text-sm break-words whitespace-normal" href={citation.url}>{citation.title}</Badge>
          {citation.cited_text && (
            <div className="text-xs text-muted-foreground italic border-l-2 border-muted pl-2">
              &ldquo;{citation.cited_text.length > 150 
                ? citation.cited_text.substring(0, 150) + '...' 
                : citation.cited_text}&rdquo;
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}

// Function to render text with inline citations
const renderTextWithCitations = (text: string, citations: Array<{url: string, title: string, cited_text: string}>) => {
  // Find all citation patterns like [1], [2], etc.
  const citationRegex = /\[(\d+)\]/g
  const parts = []
  let lastIndex = 0
  let match

  while ((match = citationRegex.exec(text)) !== null) {
    // Add text before the citation
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index))
    }
    
    // Add the citation popover
    const citationNumber = parseInt(match[1])
    const citation = citations[citationNumber - 1] // Citations are 1-indexed
    
    if (citation) {
      parts.push(
        <CitationPopover 
          key={`citation-${citationNumber}-${match.index}`}
          citationNumber={citationNumber} 
          citation={citation} 
        />
      )
    } else {
      // If citation not found, just show the number
      parts.push(match[0])
    }
    
    lastIndex = match.index + match[0].length
  }
  
  // Add remaining text
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex))
  }
  
  return parts.length > 1 ? <>{parts}</> : text
}

// Loading placeholder component
export function ChatMessageLoading() {
  return (
    <div className="flex gap-1 px-0 py-2">
      <div className="flex flex-col gap-1 max-w-[85%]">
        {/* Loading message bubble */}
        <div className={cn(
          "rounded-lg px-3 py-2 text-sm",
          "bg-muted text-foreground",
          "rounded-bl-sm",
          "flex items-center gap-2"
        )}>
          <Spinner className="stroke-5 size-4 stroke-muted-foreground" />
          {/* <span className="text-muted-foreground">Thinking...</span> */}
        </div>
      </div>
    </div>
  )
}

export function ChatMessage({ message, onActionClick }: ChatMessageProps) {
  const isUser = message.role === 'user'
  const isSystem = message.role === 'system'
  const [isEditing, setIsEditing] = useState(false)
  const [editContent, setEditContent] = useState(message.content)
  const [selectedAttachment, setSelectedAttachment] = useState<MessageAttachment | null>(null)
  const { editMessage } = useChatStore()

  // Debug tool calls
  if (message.toolCalls && message.toolCalls.length > 0) {
    console.log('🔧 Message has tool calls:', message.toolCalls)
  }

  const handleEdit = () => {
    setIsEditing(true)
  }

  const handleEditSave = () => {
    if (editContent.trim() !== message.content) {
      editMessage(message.id, editContent.trim())
      toast.success("Message updated")
    }
    setIsEditing(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleEditSave()
    } else if (e.key === 'Escape') {
      handleEditCancel()
    }
  }

  const handleEditCancel = () => {
    setEditContent(message.content)
    setIsEditing(false)
  }

  const openAttachmentModal = (attachment: MessageAttachment) => {
    setSelectedAttachment(attachment)
  }

  const closeAttachmentModal = () => {
    setSelectedAttachment(null)
  }

  return (
    <div className={cn(
      "flex gap-1 px-0 py-2",
      isUser && "flex-row-reverse",
      isSystem && "justify-center"
    )}>

      <div className={cn(
        "flex flex-col gap-1 max-w-[85%]",
        isUser && "items-end",
        isSystem && "items-center max-w-full"
      )}>

        {/* Timestamp */}
        {!isSystem && (
          <div className={cn(
            "text-xs text-muted-foreground px-1",
            isUser && "text-right"
          )}>
            {formatDistanceToNow(message.timestamp, { addSuffix: true })}
          </div>
        )}

        {/* Attachments - shown for user messages */}
        {isUser && message.attachments && message.attachments.length > 0 && (
            <div className={cn(
              "flex gap-1.5 overflow-x-auto pb-1",
              "scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent",
              "max-w-72"
            )}>
              {message.attachments.map((attachment) => (
                <div
                  key={attachment.id}
                  className="bg-background relative flex flex-col rounded-md border group min-w-[60px] w-[60px] flex-shrink-0 cursor-pointer hover:bg-accent/50 transition-colors"
                  onClick={() => openAttachmentModal(attachment)}
                >
                  {/* File Preview */}
                  <div className="bg-accent flex aspect-square items-center justify-center overflow-hidden rounded-t-[inherit]">
                    {attachment.type.startsWith("image/") && attachment.data ? (
                      <img
                        src={attachment.data}
                        alt={attachment.name}
                        className="size-full rounded-t-[inherit] object-cover"
                      />
                    ) : (
                      <div className="flex items-center justify-center">
                        {getFileIcon(attachment)}
                      </div>
                    )}
                  </div>
                  
                  {/* File Info */}
                  <div className="flex min-w-0 flex-col gap-0 border-t p-1">
                    <p className="truncate text-[9px] font-medium leading-tight">
                      {attachment.name.length > 8 ? attachment.name.substring(0, 8) + '...' : attachment.name}
                    </p>
                    <p className="text-muted-foreground truncate text-[8px] leading-tight">
                      {formatFileSize(attachment.size)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
        )}

        {/* Reasoning */}
        {!isSystem && message.reasoning && (
          <div className="space-y-2 mb-2 w-72">
              <Collapsible  className="rounded-lg px-3 py-2 text-sm break-words bg-muted text-foreground rounded-bl-sm">
                <CollapsibleTrigger asChild>
                  <button className="flex items-center justify-between w-full cursor-pointer group">
                    <div className="flex items-center gap-2 font-light">
                      <Brain className="size-3 shrink-0 text-muted-foreground" strokeWidth={1.5}/>
                      <span className="text-muted-foreground group-hover:underline text-xs">
                        Reasoning
                      </span>
                    </div>
                    <ChevronDown className="size-4 shrink-0 text-muted-foreground group-data-[state=open]:rotate-180 transition-transform" strokeWidth={1.5}/>
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                <div className="space-y-2 mt-2">
                    {/* Reasoning response */}
                    <div className="text-muted-foreground text-sm font-light">
                        {message.reasoning}
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>
          </div>
        )}

        {/* Tool calls - shown before the response for non-system messages */}
        {!isSystem && message.toolCalls && message.toolCalls.length > 0 && (
          <div className="space-y-2 mb-2 w-72">
            {message.toolCalls.map((toolCall) => (
              <Collapsible key={toolCall.id} className="rounded-lg px-3 py-2 text-sm break-words bg-muted text-foreground rounded-bl-sm">
                <CollapsibleTrigger asChild>
                  <button className="flex items-center justify-between w-full cursor-pointer group">
                    <div className="flex items-center gap-2 font-light">
                      <Lightbulb className="size-3 shrink-0" strokeWidth={1.5}/>
                      <span className="text-muted-foreground group-hover:underline text-xs">
                        {formatToolCallName(toolCall.name)}
                      </span>
                    </div>
                    <ChevronDown className="size-4 shrink-0 text-muted-foreground group-data-[state=open]:rotate-180 transition-transform" strokeWidth={1.5}/>
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="space-y-2 mt-2">
                    {/* Tool Arguments */}
                    <div className="flex flex-col gap-1 bg-background/30 p-2 rounded-md relative">
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground text-xs font-medium">Request:</span>
                      </div>
                      <pre className="text-xs p-2 overflow-x-auto whitespace-pre-wrap break-words max-w-full">
                        {formatToolCallArguments(toolCall.arguments)}
                      </pre>
                      <div className="absolute top-1 right-1">
                        <CopyButton
                          textToCopy={formatToolCallArguments(toolCall.arguments)}
                          successMessage="Arguments copied to clipboard"
                          iconSize={12}
                          size="sm"
                          className="h-6 w-6 p-0"
                          showTooltip={true}
                          tooltipText="Copy arguments"
                          tooltipCopiedText="Arguments copied!"
                        />
                      </div>
                    </div>

                    {/* Tool Result */}
                    {toolCall.result && (
                      <div className="flex flex-col gap-1 bg-background/30 p-2 rounded-md relative">
                        <div className="flex items-center gap-2">
                          <div className="text-muted-foreground text-xs gap-2 flex items-center">
                            Result: 
                            {toolCall.result.success ? <Badge variant="green">Success</Badge> : <Badge variant="red">Error</Badge>}
                          </div>
                        </div>
                        <pre className="text-xs p-2 overflow-x-auto whitespace-pre-wrap break-words max-w-full">
                          {formatToolCallResult(toolCall.result)}
                        </pre>
                        <div className="absolute top-1 right-1">
                          <CopyButton
                            textToCopy={formatToolCallResult(toolCall.result)}
                            successMessage="Result copied to clipboard"
                            iconSize={12}
                            size="sm"
                            className="h-6 w-6 p-0"
                            showTooltip={true}
                            tooltipText="Copy result"
                            tooltipCopiedText="Result copied!"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            ))}
          </div>
        )}

        {/* Message bubble or editing textarea */}
        {isEditing && isUser ? (
          <div className={cn(
            "rounded-lg px-3 py-2 text-sm",
            "bg-muted text-foreground"
          )}>
            <Textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              onKeyDown={handleKeyDown}
              className="bg-transparent dark:bg-transparent shadow-none border-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-none p-0 resize-none"
              placeholder="Edit your message..."
              autoFocus
            />
            <div className="flex gap-2 items-center justify-end">
            <Button
                size="sm"
                onClick={handleEditCancel}
                variant="outline"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleEditSave}
                variant="outline"
              >
                Send
              </Button>
            </div>
          </div>
        ) : (
          <div className={cn(
            "rounded-lg px-3 py-2 text-sm",
            "break-words",
            isUser && [
              "bg-muted text-foreground",
            ],
            !isUser && !isSystem && [
              "bg-muted text-foreground",
              "rounded-bl-sm"
            ],
            isSystem && [
              "bg-muted/50 text-muted-foreground text-xs",
              "italic px-4 py-1 rounded-full"
            ]
          )}>
            {isSystem ? (
              message.content
            ) : (
              <div className={cn(
                "prose prose-sm max-w-none",
                "dark:prose-invert"
              )}>
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  rehypePlugins={[rehypeHighlight]}
                  components={{
                    // Only override what's absolutely necessary
                    code: ({ children, ...props }) => {
                      const isInline = !props.className?.includes('language-')
                      return isInline ? (
                        <code className={cn(
                          "px-1.5 py-0.5 rounded text-xs font-mono border",
                          "bg-muted/60 border-muted-foreground/20"
                        )} {...props}>
                          {children}
                        </code>
                      ) : (
                        <code className="text-xs font-mono" {...props}>
                          {children}
                        </code>
                      )
                    },
                    pre: ({ children }) => (
                      <pre className={cn(
                        "p-3 rounded-md overflow-x-auto my-2 border text-xs",
                        "bg-muted/60 border-muted-foreground/20"
                      )}>
                        {children}
                      </pre>
                    ),
                    // Custom text renderer to handle inline citations
                    p: ({ children }) => {
                      if (typeof children === 'string') {
                        return <p>{renderTextWithCitations(children, message.citations || [])}</p>
                      }
                      return <p>{children}</p>
                    },
                    // Handle list items to process citations within them
                    li: ({ children }) => {
                      if (typeof children === 'string') {
                        return <li>{renderTextWithCitations(children, message.citations || [])}</li>
                      }
                      return <li>{children}</li>
                    },
                    // Also handle text nodes that aren't in paragraphs
                    text: ({ children }) => {
                      if (typeof children === 'string') {
                        return renderTextWithCitations(children, message.citations || [])
                      }
                      return children
                    },
                  }}
                >
                  {message.content} 
                </ReactMarkdown>
              </div>
            )}
          </div>
        )}

        {/* Only show actions when not editing */}
        {!isEditing && <ChatMessageActions message={message} onEdit={handleEdit} />}

        {/* Function result indicator */}
        {message.functionResult && (
          <Badge
            variant={message.functionResult.success ? "green" : "red"}
            className="mt-1"
          >
            {message.functionResult.success ? '✓ Action completed' : '✗ Action failed'}
          </Badge>
        )}



        {/* Suggested actions */}
        {message.suggestedActions && message.suggestedActions.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {message.suggestedActions.map((action, index) => (
              <button
                key={index}
                className={cn(
                  "text-xs px-2 py-1 rounded-md",
                  "bg-secondary text-secondary-foreground",
                  "hover:bg-secondary/80 transition-colors",
                  "border border-border"
                )}
                onClick={() => onActionClick?.(action)}
              >
                {action.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Attachment Preview Modal */}
      <Dialog open={!!selectedAttachment} onOpenChange={closeAttachmentModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] p-0">
          <div className="relative">
            {selectedAttachment && (
              <div className="flex flex-col">
                {/* File Header */}
                <div className="flex items-center gap-3 p-4 border-b">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-medium truncate">
                      {selectedAttachment.name}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {selectedAttachment.type} • {formatFileSize(selectedAttachment.size)}
                    </p>
                  </div>
                </div>

                {/* File Content */}
                <div className="flex-1 overflow-auto">
                  {selectedAttachment.type.startsWith('image/') ? (
                    <div className="flex items-center justify-center p-4">
                      {/* Use img for base64 data URLs, Next.js Image for regular URLs */}
                      {selectedAttachment.data ? (
                        <img
                          src={selectedAttachment.data}
                          alt={selectedAttachment.name}
                          className="max-w-full max-h-[70vh] object-contain rounded-lg"
                        />
                      ) : selectedAttachment.url ? (
                        <Image
                          src={selectedAttachment.url}
                          alt={selectedAttachment.name}
                          width={800}
                          height={600}
                          className="max-w-full max-h-[70vh] object-contain rounded-lg"
                        />
                      ) : null}
                    </div>
                  ) : (
                    <div className="flex items-center justify-center p-8">
                      <div className="text-center">
                        {getFileIcon(selectedAttachment)}
                        <p className="mt-2 text-sm text-muted-foreground">
                          Preview not available for this file type
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {selectedAttachment.name}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
} 