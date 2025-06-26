import React, { useState, useRef, useEffect } from 'react'
import { 
  PaperPlaneTilt, 
  Gear, 
  Code, 
  Paperclip, 
  Microphone,
  Stop,
  ArrowsClockwise,
  Cpu,
  Robot,
  Brain,
  GridNine
} from 'phosphor-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { useAllServices } from '@/hooks/useServices'
import MessageComponent from './components/MessageComponent'
import { useAnalyticsTracking } from '../../services/modelAnalytics'

interface Message {
  id: string
  type: 'user' | 'ai'
  content: string
  timestamp: Date
  isStreaming?: boolean
}

interface ChatInterfaceProps {
  selectedModel: string
  onOpenSettings: () => void
  onOpenDeveloper: () => void
  onOpenSystemStatus: () => void
  onOpenAgentManager: () => void
  onOpenAdvancedMemory: () => void
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({
  selectedModel,
  onOpenSettings,
  onOpenDeveloper,
  onOpenSystemStatus,
  onOpenAgentManager,
  onOpenAdvancedMemory
}) => {
  const [messages, setMessages] = useState<Message[]>([])
  const [currentMessage, setCurrentMessage] = useState('')
  const [isRecording, setIsRecording] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const scrollAreaRef = useRef<HTMLDivElement>(null)

  // Use actual services
  const services = useAllServices()
  const { chat, ollama } = services
  const isThinking = chat.isThinking
  const analytics = useAnalyticsTracking()

  // Generate session ID for analytics
  const [sessionId] = useState(() => `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`)

  // Model data mapping
  const modelData = {
    'tinydolphin:latest': { name: 'TinyDolphin', avatar: '🐬', subtitle: 'Fast & Efficient' },
    'openchat:latest': { name: 'OpenChat', avatar: '🤖', subtitle: 'Conversational AI' },
    'phi4-mini-reasoning:latest': { name: 'Phi4 Mini', avatar: '🧠', subtitle: 'Reasoning Expert' },
    'deepseek-coder:1.3b': { name: 'DeepSeek Coder', avatar: '💻', subtitle: 'Code Specialist' }
  }

  const currentModelData = modelData[selectedModel as keyof typeof modelData] || {
    name: selectedModel.replace(':latest', ''),
    avatar: '🤖',
    subtitle: 'AI Assistant'
  }

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

  // Check service status on mount
  useEffect(() => {
    ollama.checkStatus()
  }, [])

  const handleSendMessage = async () => {
    if (!currentMessage.trim() || isThinking) return

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: currentMessage.trim(),
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    const messageToSend = currentMessage.trim()
    setCurrentMessage('')

    const startTime = Date.now()

    try {
      // Use actual chat service
      const response = await chat.sendMessage(
        userMessage.content,
        selectedModel,
        messages
      )

      const responseTime = Date.now() - startTime

      if (response.success) {
        const aiMessage: Message = {
          id: (Date.now() + 1).toString(),
          type: 'ai',
          content: response.message,
          timestamp: new Date()
        }
        setMessages(prev => [...prev, aiMessage])

        // Track analytics
        await analytics.trackChatMessage({
          modelId: selectedModel,
          sessionId,
          prompt: messageToSend,
          response: response.message,
          responseTime,
          success: true
        })
      } else {
        const errorMessage: Message = {
          id: (Date.now() + 1).toString(),
          type: 'ai',
          content: response.message || 'Sorry, I encountered an error processing your request.',
          timestamp: new Date()
        }
        setMessages(prev => [...prev, errorMessage])

        // Track error
        await analytics.trackError({
          modelId: selectedModel,
          sessionId,
          error: response.message || 'Unknown error',
          context: { originalMessage: messageToSend }
        })
      }
    } catch (error) {
      console.error('Error sending message:', error)
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: 'Sorry, I encountered an error processing your request.',
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage])

      // Track error
      await analytics.trackError({
        modelId: selectedModel,
        sessionId,
        error: error instanceof Error ? error.message : 'Unknown error',
        context: { originalMessage: messageToSend }
      })
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
    <div className="flex flex-col h-full bg-background">
      {/* Top Header - Design Guide Colors */}
      <header className="flex items-center justify-between p-4 bg-surface-gradient border-b border-border">
        <div className="flex items-center gap-3">
          {/* Model Profile */}
          <div className="flex items-center gap-3 bg-white/10 backdrop-blur-sm rounded-2xl px-4 py-2 border border-white/20">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent-blue to-accent-blue-hover flex items-center justify-center text-lg shadow-lg">
              🐬 {/* This could be dynamic based on selectedModel */}
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-foreground text-lg">{selectedModel.replace(':latest', '').replace('tinydolphin', 'TinyDolphin')}</span>
                {/* Enhanced Online Indicator */}
                <div className="flex items-center gap-1">
                  <div className={cn(
                    "w-3 h-3 rounded-full shadow-lg border-2 border-white",
                    ollama.status.connected 
                      ? "bg-green-500 shadow-green-400/50 animate-pulse" 
                      : "bg-red-500 shadow-red-400/50"
                  )} />
                  <span className={cn(
                    "text-xs font-medium",
                    ollama.status.connected ? "text-green-600" : "text-red-600"
                  )}>
                    {ollama.status.connected ? "Online" : "Offline"}
                  </span>
                </div>
              </div>
              <span className="text-xs text-grey-dark">AI Assistant</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onOpenDeveloper}
            title="Canvas Mode"
            className="glass-button h-9 w-9 p-0 rounded-xl hover-lift border-0 hover:bg-purple-100 transition-all duration-300"
          >
            <GridNine size={16} className="text-purple-500" />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={onOpenSystemStatus}
            title="System Status & Performance"
            className="glass-button h-9 w-9 p-0 rounded-xl hover-lift border-0 hover:bg-accent-blue-muted/50 transition-all duration-300"
          >
            <Cpu size={16} className="text-accent-blue-hover" />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={onOpenAgentManager}
            title="Agent Manager"
            className="glass-button h-9 w-9 p-0 rounded-xl hover-lift border-0 hover:bg-accent-blue-muted/50 transition-all duration-300"
          >
            <Robot size={16} className="text-accent-blue-hover" />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={onOpenAdvancedMemory}
            title="Advanced Memory"
            className="glass-button h-9 w-9 p-0 rounded-xl hover-lift border-0 hover:bg-accent-blue-muted/50 transition-all duration-300"
          >
            <Brain size={16} className="text-accent-blue-hover" />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={clearChat}
            disabled={messages.length === 0}
            title="Clear chat"
            className="glass-button h-9 w-9 p-0 rounded-xl hover-lift disabled:opacity-30 border-0 hover:bg-red-100 transition-all duration-300"
          >
            <ArrowsClockwise size={16} className="text-red-500" />
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={onOpenDeveloper}
            title="Developer mode"
            className="glass-button h-9 w-9 p-0 rounded-xl hover-lift border-0 hover:bg-accent-blue-muted/50 transition-all duration-300"
          >
            <Code size={16} className="text-accent-blue-hover" />
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={onOpenSettings}
            title="Settings"
            className="glass-button h-9 w-9 p-0 rounded-xl hover-lift border-0 hover:bg-accent-blue-muted/50 transition-all duration-300"
          >
            <Gear size={16} className="text-accent-blue-hover" />
          </Button>
        </div>
      </header>

      {/* Chat Messages Area */}
      <ScrollArea className="flex-1 bg-background" ref={scrollAreaRef}>
        <div className="max-w-4xl mx-auto">
          {messages.length === 0 ? (
            // Enhanced Welcome State  
            <div className="flex flex-col items-center justify-center h-full min-h-[60vh] px-4">
              <div className="text-center space-y-8 max-w-2xl">
                {/* Animated Logo */}
                <div className="relative">
                  <div className="glass-card w-24 h-24 rounded-3xl flex items-center justify-center mx-auto glass-float border-0 group hover:scale-110 transition-transform duration-500">
                    <div className="text-4xl animate-bounce">{currentModelData.avatar}</div>
                  </div>
                  <div className="absolute -inset-4 bg-gradient-to-r from-accent-blue/20 to-accent-blue-hover/20 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                </div>
                
                {/* Welcome Text */}
                <div className="space-y-4">
                  <h2 className="text-4xl font-bold mb-3 text-foreground bg-gradient-to-r from-accent-blue to-accent-blue-hover bg-clip-text text-transparent">
                    Welcome to {currentModelData.name}
                  </h2>
                  <p className="text-grey-dark text-lg leading-relaxed">
                    Your private AI assistant is ready to help. Start a conversation below or try one of these suggestions.
                  </p>
                  <div className="flex items-center justify-center gap-2 text-sm text-grey-dark">
                    <div className={cn(
                      "w-2 h-2 rounded-full",
                      ollama.status.connected ? "bg-green-500 animate-pulse" : "bg-red-500"
                    )} />
                    <span>{ollama.status.connected ? "Connected & Ready" : "Connecting..."}</span>
                  </div>
                </div>
                
                {/* Enhanced Quick Start Examples */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-3xl">
                  {[
                    { text: "Explain quantum computing", icon: "🔬", category: "Science" },
                    { text: "Write a Python function", icon: "💻", category: "Code" }, 
                    { text: "Help me plan a project", icon: "📋", category: "Planning" },
                    { text: "Analyze this data", icon: "📊", category: "Analysis" }
                  ].map((example, index) => (
                    <Button
                      key={index}
                      variant="ghost"
                      onClick={() => setCurrentMessage(example.text)}
                      className="group glass-card p-6 text-left rounded-2xl hover:bg-accent-blue-muted hover-lift h-auto border-0 transition-all duration-300 hover:scale-[1.02]"
                      style={{ animationDelay: `${index * 100}ms` }}
                    >
                      <div className="flex items-start gap-3">
                        <div className="text-2xl group-hover:scale-110 transition-transform duration-300">
                          {example.icon}
                        </div>
                        <div className="flex-1">
                          <div className="text-sm font-medium text-gray-700 mb-1">
                            {example.text}
                          </div>
                          <div className="text-xs text-grey-dark opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                            {example.category}
                          </div>
                        </div>
                      </div>
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            // Messages
            <div className="space-y-6 p-4">
              {messages.map((message) => (
                <MessageComponent key={message.id} message={message} />
              ))}

              {/* Thinking indicator */}
              {isThinking && (
                <div className="flex gap-4 max-w-4xl">
                  <div className="w-10 h-10 rounded-2xl glass-accent flex items-center justify-center flex-shrink-0">
                    <span className="text-lg">🦉</span>
                  </div>
                  <div className="flex-1">
                    <div className="glass-card rounded-2xl p-4 inline-block border-0">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-accent-blue-hover rounded-full animate-pulse"></div>
                        <div className="w-2 h-2 bg-accent-blue-hover rounded-full animate-pulse" style={{animationDelay: '0.2s'}}></div>
                        <div className="w-2 h-2 bg-accent-blue-hover rounded-full animate-pulse" style={{animationDelay: '0.4s'}}></div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Enhanced Input Area */}
      <div className="bg-surface-gradient border-t border-border backdrop-blur-md">
        <div className="max-w-4xl mx-auto p-6">
          <div className="relative flex items-end gap-3 glass-card rounded-3xl p-4 hover-lift border-0 shadow-lg transition-all duration-300 focus-within:ring-2 focus-within:ring-accent-blue/20">
            {/* Enhanced Attachment button */}
            <Button
              variant="ghost"
              size="sm"
              className="glass-button h-10 w-10 p-0 flex-shrink-0 rounded-2xl border-0 hover:bg-accent-blue-muted/50 transition-all duration-300"
              disabled={isThinking}
              title="Attach file"
            >
              <Paperclip size={18} className="text-accent-blue-hover" />
            </Button>

            {/* Enhanced Text input */}
            <div className="flex-1 relative">
              <Textarea
                ref={textareaRef}
                value={currentMessage}
                onChange={(e) => setCurrentMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={`Message ${currentModelData.name}...`}
                className="min-h-[28px] max-h-[200px] border-0 bg-transparent resize-none focus-visible:ring-0 focus-visible:ring-offset-0 p-0 text-base placeholder:text-grey-dark text-foreground transition-all duration-300"
                disabled={isThinking}
              />
              {/* Character count */}
              {currentMessage.length > 100 && (
                <div className="absolute bottom-0 right-0 text-xs text-grey-dark bg-white/80 px-2 py-1 rounded-lg">
                  {currentMessage.length}
                </div>
              )}
            </div>

            {/* Enhanced Voice/Send buttons */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {currentMessage.trim() ? (
                <Button
                  size="sm"
                  onClick={handleSendMessage}
                  disabled={isThinking}
                  className="h-10 w-10 p-0 rounded-2xl bg-accent-gradient hover:bg-accent-blue-hover hover-lift border-0 shadow-lg transition-all duration-300 disabled:opacity-50 disabled:scale-95"
                  title="Send message"
                >
                  {isThinking ? (
                    <div className="animate-spin">
                      <ArrowsClockwise size={16} className="text-primary-foreground" />
                    </div>
                  ) : (
                    <PaperPlaneTilt size={16} weight="fill" className="text-primary-foreground" />
                  )}
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsRecording(!isRecording)}
                  className={cn(
                    "glass-button h-10 w-10 p-0 rounded-2xl hover-lift border-0 transition-all duration-300",
                    isRecording 
                      ? "bg-accent-gradient text-primary-foreground scale-110 animate-pulse" 
                      : "text-accent-blue-hover hover:bg-accent-blue-muted/50"
                  )}
                  disabled={isThinking}
                  title={isRecording ? "Stop recording" : "Start voice input"}
                >
                  {isRecording ? <Stop size={16} /> : <Microphone size={16} />}
                </Button>
              )}
            </div>
          </div>
          
          {/* Enhanced Footer info */}
          <div className="flex items-center justify-between text-xs text-grey-dark mt-3">
            <div className="flex items-center gap-2">
              <span>AI responses may contain errors.</span>
              <span>•</span>
              <span>Everything runs locally on your machine.</span>
            </div>
            <div className="flex items-center gap-2">
              <span>Press Shift+Enter for new line</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ChatInterface