import React, { useState, useRef, useEffect } from 'react'
import { 
  PaperPlaneTilt, 
  Gear, 
  Paperclip, 
  Microphone,
  Stop,
  ArrowsClockwise,
  Cpu,
  Code,
  Sidebar,
  Circle,
  Lightning
} from 'phosphor-react'
import { Button } from '@/components/ui/button'
import { ShimmerButton } from '@/components/ui/shimmer-button'
import { Ripple } from '@/components/ui/ripple'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Card, CardContent } from '@/components/ui/card'
import NumberTicker from '@/components/ui/number-ticker'
import TextShimmer from '@/components/ui/text-shimmer'
import { cn } from '@/lib/utils'
import { useAllServices } from '@/hooks/useServices'
import { Message } from '../../../../types/chat'
import MessageComponent from './components/MessageComponent'
import EnhancedChatCanvas from './EnhancedChatCanvas'
import InputBar from './InputBar'
import { useAnalyticsTracking } from '../../services/modelAnalytics'
import { useToast } from '@/components/ui/toast'

interface ChatInterfaceProps {
  selectedModel: string
  onOpenSettings: () => void
  onOpenDeveloper: () => void
  onOpenSystemStatus: () => void
  onOpenAgentManager: () => void
  onOpenAdvancedMemory: () => void
  onToggleSidebar: () => void
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({
  selectedModel,
  onOpenSettings,
  onOpenDeveloper,
  onOpenSystemStatus,
  onOpenAgentManager,
  onOpenAdvancedMemory,
  onToggleSidebar
}) => {
  const [messages, setMessages] = useState<Message[]>([])
  const [currentMessage, setCurrentMessage] = useState('')
  const [messageCount, setMessageCount] = useState(0)
  const [canvasOpen, setCanvasOpen] = useState(false)
  const [responseTime, setResponseTime] = useState(0)
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const { addToast } = useToast()

  // Use actual services
  const services = useAllServices()
  const { chat, ollama } = services
  const isThinking = chat.isThinking
  const analytics = useAnalyticsTracking()

  // Generate session ID for analytics
  const [sessionId] = useState(() => `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`)

  // Clean model name display
  const getModelDisplayName = (model: string) => {
    return model
      .replace(':latest', '')
      .replace('tinydolphin', 'TinyDolphin')
      .replace('openchat', 'OpenChat')
      .replace('phi4-mini-reasoning', 'Phi4 Mini')
      .replace('deepseek-coder', 'DeepSeek Coder')
  }

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight
    }
  }, [messages])

  // Check service status on mount
  useEffect(() => {
    ollama.checkStatus()
  }, [])

  // Handle Escape key to close canvas
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && canvasOpen) {
        setCanvasOpen(false)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [canvasOpen])

  // Handle click outside canvas to close
  const handleCanvasBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      setCanvasOpen(false)
    }
  }

  const handleSendMessage = async (message: string, attachments?: File[]) => {
    if (!message.trim() || isThinking) return

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: message.trim(),
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setMessageCount(prev => prev + 1)

    const startTime = Date.now()

    try {
      const response = await chat.sendMessage(
        userMessage.content,
        selectedModel,
        messages
      )

      const responseTimeMs = Date.now() - startTime
      setResponseTime(responseTimeMs)

      if (response.success) {
        const aiMessage: Message = {
          id: (Date.now() + 1).toString(),
          type: 'ai',
          content: response.content || 'No response received',
          timestamp: new Date()
        }

        setMessages(prev => [...prev, aiMessage])

        // Track analytics
        await analytics.trackChatMessage({
          modelId: selectedModel,
          sessionId,
          prompt: userMessage.content,
          response: aiMessage.content,
          responseTime: responseTimeMs,
          success: true
        })

        addToast({
          type: 'success',
          title: 'Message Sent',
          description: `Response received in ${responseTimeMs}ms`,
          duration: 2000
        })
      } else {
        addToast({
          type: 'error',
          title: 'Send Failed',
          description: response.error || 'Failed to send message',
          duration: 3000
        })
      }
    } catch (error) {
      const responseTimeMs = Date.now() - startTime
      
      addToast({
        type: 'error',
        title: 'Error',
        description: 'Failed to send message to AI',
        duration: 3000
      })

      // Track failed message
      await analytics.trackChatMessage({
        modelId: selectedModel,
        sessionId,
        prompt: userMessage.content,
        response: '',
        responseTime: responseTimeMs,
        success: false
      })
    }
  }

  const clearChat = () => {
    setMessages([])
    setMessageCount(0)
    addToast({
      type: 'success',
      title: 'Chat Cleared',
      description: 'All messages have been removed',
      duration: 2000
    })
  }

  const handleUpdateMessage = (id: string, updates: any) => {
    setMessages(prev => prev.map(msg => 
      msg.id === id ? { ...msg, ...updates } : msg
    ))
  }

  const handleDeleteMessage = (id: string) => {
    setMessages(prev => prev.filter(msg => msg.id !== id))
  }

  const handleCorrectMessage = (id: string, newContent: string) => {
    setMessages(prev => prev.map(msg => 
      msg.id === id ? { ...msg, content: newContent } : msg
    ))
  }

  const handleAddMessage = (message: any) => {
    const newMessage: Message = {
      id: Date.now().toString(),
      type: message.type || 'user',
      content: message.content,
      timestamp: new Date(),
      ...message
    }
    setMessages(prev => [...prev, newMessage])
  }

  return (
    <div className="flex h-full bg-background">
      {/* Main Chat Area */}
      <div className={cn(
        "flex flex-col transition-all duration-300 ease-in-out",
        canvasOpen ? "w-3/5" : "w-full"
      )}>
        {/* Enhanced Header */}
        <div className="px-6 py-4 border-b border-border bg-card/50 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={onToggleSidebar}
                className="h-8 w-8 p-0 hover:bg-accent rounded-lg"
                title="Toggle Sidebar"
              >
                <Sidebar size={16} className="text-muted-foreground" />
              </Button>

              {/* Enhanced Model Profile */}
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Circle size={12} className="text-primary fill-current" />
                </div>
                <div className="flex flex-col">
                  <TextShimmer className="text-sm font-medium text-foreground">
                    {getModelDisplayName(selectedModel)}
                  </TextShimmer>
                  <span className="text-xs text-muted-foreground">Local AI Model</span>
                </div>
              </div>
            </div>

            {/* Enhanced Stats & Actions */}
            <div className="flex items-center gap-4">
              {/* Live Stats */}
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <span>Messages:</span>
                  <NumberTicker value={messageCount} className="font-mono text-foreground" />
                </div>
                <div className="flex items-center gap-1">
                  <span>Response:</span>
                  <NumberTicker value={responseTime} className="font-mono text-foreground" />ms
                </div>
              </div>

              {/* Action Buttons - Canvas button removed as per requirements */}
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onOpenSystemStatus}
                  className="h-8 w-8 p-0 hover:bg-accent rounded-lg"
                  title="System Status"
                >
                  <Cpu size={16} className="text-muted-foreground" />
                </Button>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearChat}
                  disabled={messages.length === 0}
                  className="h-8 w-8 p-0 hover:bg-accent rounded-lg disabled:opacity-50"
                  title="Clear Chat"
                >
                  <ArrowsClockwise size={16} className="text-muted-foreground" />
                </Button>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onOpenSettings}
                  className="h-8 w-8 p-0 hover:bg-accent rounded-lg"
                  title="Settings"
                >
                  <Gear size={16} className="text-muted-foreground" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Messages Area */}
        <ScrollArea ref={scrollAreaRef} className="flex-1 px-6">
          <div className="max-w-4xl mx-auto py-6 space-y-6">
            {messages.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Circle size={24} className="text-primary" />
                </div>
                <h3 className="text-lg font-medium text-foreground mb-2">
                  Welcome to {getModelDisplayName(selectedModel)}
                </h3>
                <p className="text-muted-foreground mb-4">
                  Start a conversation with your local AI assistant
                </p>
                <div className="flex justify-center gap-2 text-sm text-muted-foreground">
                  <span>100% Local</span>
                  <span>•</span>
                  <span>Privacy First</span>
                  <span>•</span>
                  <span>No Internet Required</span>
                </div>
              </div>
            ) : (
              messages.map((message) => (
                <MessageComponent 
                  key={message.id} 
                  message={message}
                  isThinking={false}
                />
              ))
            )}

            {isThinking && (
              <div className="flex justify-start">
                <div className="bg-accent/50 rounded-2xl px-4 py-3 max-w-xs">
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                      <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce"></div>
                      <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce [animation-delay:0.1s]"></div>
                      <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce [animation-delay:0.2s]"></div>
                    </div>
                    <span className="text-sm text-muted-foreground">Thinking...</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Enhanced Input Area with embedded canvas toggle */}
        <div className="border-t border-border bg-card/50 backdrop-blur-sm p-6">
          <div className="max-w-4xl mx-auto">
            <InputBar
              value={currentMessage}
              onChange={setCurrentMessage}
              onSend={handleSendMessage}
              isLoading={isThinking}
              canvasOpen={canvasOpen}
              onOpenCanvas={() => setCanvasOpen(!canvasOpen)}
              placeholder={`Message ${getModelDisplayName(selectedModel)}...`}
            />
          </div>
        </div>
      </div>

      {/* Canvas Panel with smooth animations */}
      <div 
        className={cn(
          "border-l border-border bg-background flex flex-col transition-all duration-300 ease-in-out overflow-hidden",
          canvasOpen ? "w-2/5 opacity-100" : "w-0 opacity-0"
        )}
        onClick={handleCanvasBackdropClick}
      >
        <div className="p-4 border-b border-border bg-card/50 backdrop-blur-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Lightning size={20} className="text-primary" />
            <span className="font-semibold text-foreground">Canvas</span>
          </div>
          <Button 
            size="sm" 
            variant="ghost" 
            className="h-8 w-8 p-0"
            onClick={() => setCanvasOpen(false)}
          >
            <ArrowsClockwise size={14} className="text-muted-foreground" />
          </Button>
        </div>
        <div className="flex-1">
          <EnhancedChatCanvas
            messages={messages}
            onUpdateMessage={handleUpdateMessage}
            onDeleteMessage={handleDeleteMessage}
            onCorrectMessage={handleCorrectMessage}
            onAddMessage={handleAddMessage}
          />
        </div>
      </div>
    </div>
  )
}

export default ChatInterface
