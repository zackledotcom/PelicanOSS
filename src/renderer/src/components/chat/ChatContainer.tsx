import React, { useRef, useEffect } from 'react'
import { Warning, Robot } from 'phosphor-react'
import Message from './Message'
import InputBar from './InputBar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface ChatMessage {
  id: string
  type: 'user' | 'ai'
  content: string
  timestamp: Date
  isStreaming?: boolean
  model?: string
  reactions?: Array<{ type: string; count: number; userReacted: boolean }>
}

interface ChatContainerProps {
  messages: ChatMessage[]
  currentMessage: string
  onMessageChange: (value: string) => void
  onSendMessage: (message: string, attachments?: File[]) => void
  onEditMessage?: (id: string, newContent: string) => void
  onReaction?: (id: string, reaction: string) => void
  onDeleteMessage?: (id: string) => void
  onStopStreaming?: (id: string) => void
  onTerminal?: () => void
  onBrowse?: () => void
  onCanvas?: () => void
  onTrain?: () => void
  isLoading?: boolean
  error?: string
  systemStatus?: {
    model: string
    status: 'connected' | 'connecting' | 'error'
    responseTime?: number
  }
  className?: string
}

export default function ChatContainer({
  messages,
  currentMessage,
  onMessageChange,
  onSendMessage,
  onEditMessage,
  onReaction,
  onDeleteMessage,
  onStopStreaming,
  onTerminal,
  onBrowse,
  onCanvas,
  onTrain,
  isLoading = false,
  error,
  systemStatus,
  className
}: ChatContainerProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const scrollAreaRef = useRef<HTMLDivElement>(null)

  // Auto scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  const getStatusBadge = () => {
    if (!systemStatus) return null
    
    const { status, model, responseTime } = systemStatus
    
    switch (status) {
      case 'connected':
        return (
          <Badge variant="default" className="gap-1">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            {model}
            {responseTime && <span className="text-xs">({responseTime}ms)</span>}
          </Badge>
        )
      case 'connecting':
        return (
          <Badge variant="secondary" className="gap-1">
            <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
            Connecting...
          </Badge>
        )
      case 'error':
        return (
          <Badge variant="destructive" className="gap-1">
            <div className="w-2 h-2 bg-red-500 rounded-full" />
            Connection Error
          </Badge>
        )
    }
  }

  return (
    <div className={cn("flex flex-col h-full bg-background", className)}>
      {/* Header with status */}
      {systemStatus && (
        <div className="border-b p-3">
          <div className="flex items-center justify-between max-w-4xl mx-auto">
            <div className="flex items-center gap-2">
              <Robot className="w-4 h-4" />
              <span className="text-sm font-medium">AI Assistant</span>
            </div>
            {getStatusBadge()}
          </div>
        </div>
      )}

      {/* Error display */}
      {error && (
        <div className="p-4 max-w-4xl mx-auto w-full">
          <Alert variant="destructive">
            <Warning className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </div>
      )}

      {/* Messages area */}
      <div className="flex-1 relative">
        <ScrollArea ref={scrollAreaRef} className="h-full">
          <div className="max-w-4xl mx-auto p-4">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center">
                <Robot className="w-16 h-16 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Start a conversation</h3>
                <p className="text-muted-foreground mb-6 max-w-md">
                  Ask me anything, upload files, or use commands to get started. 
                  I can help with coding, analysis, writing, and more.
                </p>
                <div className="flex flex-wrap gap-2 justify-center">
                  <Badge variant="outline">Type / for commands</Badge>
                  <Badge variant="outline">Drag & drop files</Badge>
                  <Badge variant="outline">Shift+Enter for new line</Badge>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {messages.map((message) => (
                  <Message
                    key={message.id}
                    {...message}
                    onEdit={onEditMessage}
                    onReaction={onReaction}
                    onDelete={onDeleteMessage}
                    onStop={onStopStreaming}
                  />
                ))}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Scroll to bottom button */}
        {messages.length > 3 && (
          <div className="absolute bottom-4 right-4">
            <button
              onClick={() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })}
              className="bg-background border rounded-full p-2 shadow-lg hover:shadow-xl transition-shadow"
              title="Scroll to bottom"
            >
              <Robot className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Input area */}
      <div className="border-t bg-background/80 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto p-4">
          <InputBar
            value={currentMessage}
            onChange={onMessageChange}
            onSend={onSendMessage}
            onTerminal={onTerminal}
            onBrowse={onBrowse}
            onCanvas={onCanvas}
            onTrain={onTrain}
            isLoading={isLoading}
            placeholder={
              messages.length === 0 
                ? "Ask me anything... (type / for commands)" 
                : "Continue the conversation..."
            }
          />
        </div>
      </div>
    </div>
  )
}