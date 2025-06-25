import React, { useState, useRef, useEffect } from 'react'
import { 
  List, 
  PaperPlaneTilt, 
  Gear, 
  Code, 
  Paperclip, 
  Microphone,
  Stop,
  ArrowsClockwise
} from 'phosphor-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface Message {
  id: string
  type: 'user' | 'ai'
  content: string
  timestamp: Date
  isStreaming?: boolean
}

interface ChatInterfaceProps {
  selectedModel: string
  onToggleSidebar: () => void
  showSidebar: boolean
  onOpenSettings: () => void
  onOpenDeveloper: () => void
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({
  selectedModel,
  onToggleSidebar,
  showSidebar,
  onOpenSettings,
  onOpenDeveloper
}) => {
  const [messages, setMessages] = useState<Message[]>([])
  const [currentMessage, setCurrentMessage] = useState('')
  const [isThinking, setIsThinking] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const scrollAreaRef = useRef<HTMLDivElement>(null)

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px'
    }
  }, [currentMessage])

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight
    }
  }, [messages])

  const handleSendMessage = async () => {
    if (!currentMessage.trim() || isThinking) return

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: currentMessage.trim(),
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setCurrentMessage('')
    setIsThinking(true)

    try {
      // Simulate AI response (replace with actual API call)
      setTimeout(() => {
        const aiMessage: Message = {
          id: (Date.now() + 1).toString(),
          type: 'ai',
          content: `This is a simulated response to: "${userMessage.content}". The selected model is ${selectedModel}.`,
          timestamp: new Date()
        }
        setMessages(prev => [...prev, aiMessage])
        setIsThinking(false)
      }, 1500)
    } catch (error) {
      console.error('Error sending message:', error)
      setIsThinking(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const clearChat = () => {
    setMessages([])
  }

  return (
    <div className="flex flex-col h-full">
      {/* Top Header - Minimal Design */}
      <header className="flex items-center justify-between p-4 bg-white/95 backdrop-blur-sm border-b border-gray-100 shadow-minimal">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleSidebar}
            className="h-9 w-9 p-0 rounded-2xl hover:bg-grey-50 transition-all duration-200 shadow-minimal hover:shadow-soft border border-gray-50"
          >
            <List size={20} className="text-gray-600" />
          </Button>
          
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-semibold text-black">
              PelicanOS
            </h1>
            <Badge variant="secondary" className="text-xs bg-mint-50 text-mint border-mint shadow-minimal">
              {selectedModel}
            </Badge>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={clearChat}
            disabled={messages.length === 0}
            title="Clear chat"
            className="h-9 w-9 p-0 rounded-2xl hover:bg-grey-50 transition-all duration-200 shadow-minimal hover:shadow-soft disabled:opacity-30 border border-gray-50"
          >
            <ArrowsClockwise size={16} className="text-gray-600" />
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={onOpenDeveloper}
            title="Developer mode"
            className="h-9 w-9 p-0 rounded-2xl hover:bg-grey-50 transition-all duration-200 shadow-minimal hover:shadow-soft border border-gray-50"
          >
            <Code size={16} className="text-gray-600" />
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={onOpenSettings}
            title="Settings"
            className="h-9 w-9 p-0 rounded-2xl hover:bg-grey-50 transition-all duration-200 shadow-minimal hover:shadow-soft border border-gray-50"
          >
            <Gear size={16} className="text-gray-600" />
          </Button>
        </div>
      </header>

      {/* Chat Messages Area */}
      <ScrollArea className="flex-1" ref={scrollAreaRef}>
        <div className="max-w-4xl mx-auto">
          {messages.length === 0 ? (
            // Welcome State
            <div className="flex flex-col items-center justify-center h-full min-h-[60vh] px-4">
              <div className="text-center space-y-6">
                <div className="w-20 h-20 gradient-white-mint rounded-3xl flex items-center justify-center mx-auto shadow-soft hover:shadow-elevated transition-all duration-300 hover:-translate-y-1 border border-white/60">
                  <div className="text-3xl">🦉</div>
                </div>
                <div>
                  <h2 className="text-3xl font-bold mb-3 text-black">
                    How can I help you today?
                  </h2>
                  <p className="text-gray-500 text-lg">
                    Start a conversation with your local AI assistant. 
                    Everything runs privately on your machine.
                  </p>
                </div>
                
                {/* Quick Start Examples */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
                  {[
                    "Explain quantum computing",
                    "Write a Python function", 
                    "Help me plan a project",
                    "Analyze this data"
                  ].map((example, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentMessage(example)}
                      className="p-4 text-left gradient-white-grey border border-gray-100 rounded-2xl hover:gradient-white-mint hover:border-mint transition-all duration-300 shadow-minimal hover:shadow-soft hover:-translate-y-0.5"
                    >
                      <span className="text-sm font-medium text-gray-700">{example}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            // Messages
            <div className="space-y-6 p-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    "flex gap-4 max-w-4xl",
                    message.type === 'user' ? "ml-auto flex-row-reverse" : ""
                  )}
                >
                  {/* Avatar */}
                  <div className={cn(
                    "w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-soft border",
                    message.type === 'user' 
                      ? "bg-black text-white border-gray-200" 
                      : "gradient-white-mint text-gray-700 border-mint"
                  )}>
                    {message.type === 'user' ? (
                      <div className="w-8 h-8 bg-white/10 rounded-xl flex items-center justify-center">
                        <span className="text-xs font-bold">You</span>
                      </div>
                    ) : (
                      <span className="text-lg">🦉</span>
                    )}
                  </div>

                  {/* Message Content */}
                  <div className={cn(
                    "flex-1 space-y-2",
                    message.type === 'user' ? "text-right" : ""
                  )}>
                    <div className={cn(
                      "prose prose-sm max-w-none",
                      message.type === 'user' 
                        ? "bg-black text-white rounded-2xl p-4 inline-block shadow-soft border border-gray-800" 
                        : "gradient-white-grey border border-gray-100 rounded-2xl p-4 shadow-soft hover:shadow-elevated transition-shadow duration-300"
                    )}>
                      <p className="m-0 whitespace-pre-wrap leading-relaxed">{message.content}</p>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {message.timestamp.toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              ))}

              {/* Thinking indicator */}
              {isThinking && (
                <div className="flex gap-4 max-w-4xl">
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                    <span className="text-sm">🦉</span>
                  </div>
                  <div className="flex-1">
                    <div className="bg-background rounded-lg p-3 inline-block">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-muted-foreground rounded-full animate-pulse"></div>
                        <div className="w-2 h-2 bg-muted-foreground rounded-full animate-pulse" style={{animationDelay: '0.2s'}}></div>
                        <div className="w-2 h-2 bg-muted-foreground rounded-full animate-pulse" style={{animationDelay: '0.4s'}}></div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input Area - Minimal Design */}
      <div className="bg-white/95 backdrop-blur-sm border-t border-gray-100">
        <div className="max-w-4xl mx-auto p-6">
          <div className="relative flex items-end gap-3 gradient-white-grey border border-gray-200 rounded-3xl p-4 shadow-soft hover:shadow-elevated transition-all duration-300">
            {/* Attachment button */}
            <Button
              variant="ghost"
              size="sm"
              className="h-9 w-9 p-0 flex-shrink-0 rounded-2xl hover:bg-white transition-all duration-200 shadow-minimal hover:shadow-soft border border-gray-100"
              disabled={isThinking}
            >
              <Paperclip size={18} className="text-gray-500" />
            </Button>

            {/* Text input */}
            <Textarea
              ref={textareaRef}
              value={currentMessage}
              onChange={(e) => setCurrentMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Message PelicanOS..."
              className="min-h-[24px] max-h-[200px] border-0 bg-transparent resize-none focus-visible:ring-0 focus-visible:ring-offset-0 p-0 text-base placeholder:text-gray-400 text-gray-700"
              disabled={isThinking}
            />

            {/* Voice/Send buttons */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {currentMessage.trim() ? (
                <Button
                  size="sm"
                  onClick={handleSendMessage}
                  disabled={isThinking}
                  className="h-9 w-9 p-0 rounded-2xl bg-black hover:bg-gray-800 shadow-soft hover:shadow-elevated transition-all duration-200 hover:-translate-y-0.5 border border-gray-800"
                >
                  <PaperPlaneTilt size={16} weight="fill" className="text-white" />
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsRecording(!isRecording)}
                  className={cn(
                    "h-9 w-9 p-0 rounded-2xl transition-all duration-200 shadow-minimal hover:shadow-soft border",
                    isRecording 
                      ? "bg-black text-white border-gray-800" 
                      : "hover:bg-white border-gray-100 text-gray-500"
                  )}
                  disabled={isThinking}
                >
                  {isRecording ? <Stop size={16} /> : <Microphone size={16} />}
                </Button>
              )}
            </div>
          </div>
          
          {/* Footer info */}
          <div className="text-center text-xs text-gray-400 mt-3">
            AI responses may contain errors. Everything runs locally on your machine.
          </div>
        </div>
      </div>
    </div>
  )
}

export default ChatInterface