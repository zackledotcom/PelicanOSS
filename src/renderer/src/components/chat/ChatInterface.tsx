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
import { Message } from '@/types/chat'
import MessageComponent from './components/MessageComponent'
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
  const [isRecording, setIsRecording] = useState(false)
  const [messageCount, setMessageCount] = useState(0)
  const [developerMode, setDeveloperMode] = useState(false)
  const [responseTime, setResponseTime] = useState(0)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
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
    setMessageCount(prev => prev + 1)
    const messageToSend = currentMessage.trim()
    setCurrentMessage('')

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
          content: response.message,
          timestamp: new Date()
        }
        setMessages(prev => [...prev, aiMessage])

        addToast({
          type: 'success',
          title: 'Response Generated',
          description: `Completed in ${responseTimeMs}ms`,
          duration: 3000
        })

        await analytics.trackChatMessage({
          modelId: selectedModel,
          sessionId,
          prompt: messageToSend,
          response: response.message,
          responseTime: responseTimeMs,
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

        addToast({
          type: 'error',
          title: 'Generation Failed',
          description: response.message || 'Unknown error occurred',
          duration: 5000
        })
      }
    } catch (error) {
      console.error('Error sending message:', error)
      addToast({
        type: 'error',
        title: 'Connection Error',
        description: 'Failed to connect to AI service',
        duration: 5000
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
    setMessageCount(0)
    setResponseTime(0)
    addToast({
      type: 'info',
      title: 'Chat Cleared',
      description: 'All messages have been removed',
      duration: 2000
    })
  }
  return (
    <div className="flex flex-col h-full bg-white">
      {/* Clean Professional Header */}
      <div className="border-b border-gray-200 bg-white/95 backdrop-blur-sm">
        <div className="flex items-center justify-between px-6 py-4">
          {/* Left: Logo and Model */}
          <div className="flex items-center gap-6">
            {/* Sidebar Toggle + Logo */}
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={onToggleSidebar}
                className="h-8 w-8 p-0 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Sidebar size={16} className="text-gray-600" />
              </Button>
              
              <div className="flex items-center gap-2">
                <img 
                  src="../../../build/icon.png" 
                  alt="PelicanOS" 
                  className="w-6 h-6 rounded"
                  onError={(e) => {
                    const target = e.currentTarget as HTMLImageElement;
                    target.style.display = 'none';
                  }}
                />
                <span className="text-lg font-semibold text-gray-900">PelicanOS</span>
              </div>
            </div>

            {/* Model Info */}
            <div className="flex items-center gap-3 px-3 py-2 bg-gray-50 rounded-lg border border-gray-200">
              <div className="w-2 h-2 rounded-full bg-blue-500"></div>
              <span className="text-sm font-medium text-gray-700">
                {getModelDisplayName(selectedModel)}
              </span>
              <div className="flex items-center gap-1">
                <Circle 
                  size={6} 
                  className={cn(
                    ollama.status.connected ? "text-green-500 fill-green-500" : "text-red-500 fill-red-500"
                  )} 
                />
                <span className="text-xs text-gray-500">
                  {ollama.status.connected ? "Online" : "Offline"}
                </span>
              </div>
            </div>
          </div>

          {/* Right: Stats and Actions */}
          <div className="flex items-center gap-6">
            {/* Stats */}
            <div className="flex items-center gap-4 text-sm text-gray-600">
              <div className="flex items-center gap-1">
                <span>Messages:</span>
                <NumberTicker 
                  value={messageCount} 
                  className="font-mono text-blue-600 font-medium"
                />
              </div>
              {responseTime > 0 && (
                <div className="flex items-center gap-1">
                  <span>Response:</span>
                  <NumberTicker 
                    value={responseTime} 
                    suffix="ms"
                    className="font-mono text-blue-600 font-medium"
                  />
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setDeveloperMode(!developerMode)}
                className={cn(
                  "h-8 px-3 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors",
                  developerMode && "bg-blue-50 text-blue-600 hover:bg-blue-100"
                )}
                title="Toggle Canvas Mode"
              >
                <Lightning size={16} />
                <span className="ml-1.5 text-xs font-medium">Canvas</span>
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={onOpenSystemStatus}
                className="h-8 w-8 p-0 hover:bg-gray-100 rounded-lg"
                title="System Status"
              >
                <Cpu size={16} className="text-gray-600" />
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={clearChat}
                disabled={messages.length === 0}
                className="h-8 w-8 p-0 hover:bg-gray-100 rounded-lg disabled:opacity-50"
                title="Clear Chat"
              >
                <ArrowsClockwise size={16} className="text-gray-600" />
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={onOpenSettings}
                className="h-8 w-8 p-0 hover:bg-gray-100 rounded-lg"
                title="Settings"
              >
                <Gear size={16} className="text-gray-600" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className={`flex-1 flex ${developerMode ? '' : 'flex-col'}`}>
        {/* Chat Section */}
        <div className={`flex flex-col ${developerMode ? 'w-3/5 border-r border-gray-200' : 'flex-1'}`}>
          {/* Chat Area */}
          <ScrollArea className="flex-1 bg-gray-50" ref={scrollAreaRef}>
        <div className="max-w-4xl mx-auto">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full min-h-[60vh] px-6">
              <div className="text-center space-y-6 max-w-xl">
                <div className="w-16 h-16 rounded-2xl bg-blue-500 flex items-center justify-center mx-auto">
                  <span className="text-2xl text-white font-bold">AI</span>
                </div>
                
                <div className="space-y-3">
                  <h2 className="text-2xl font-semibold text-gray-900">
                    Welcome to {getModelDisplayName(selectedModel)}
                  </h2>
                  <p className="text-gray-600">
                    Your private AI assistant is ready to help. Start a conversation below.
                  </p>
                  <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
                    <Circle 
                      size={8} 
                      className={cn(
                        ollama.status.connected ? "text-green-500 fill-green-500" : "text-red-500 fill-red-500"
                      )} 
                    />
                    <span>{ollama.status.connected ? "Connected & Ready" : "Connecting..."}</span>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-3 max-w-lg">
                  {[
                    { text: "Explain quantum computing", category: "Science" },
                    { text: "Write a Python function", category: "Code" }, 
                    { text: "Help me plan a project", category: "Planning" },
                    { text: "Analyze this data", category: "Analysis" }
                  ].map((example, index) => (
                    <Button
                      key={index}
                      variant="ghost"
                      onClick={() => setCurrentMessage(example.text)}
                      className="p-4 text-left rounded-xl hover:bg-white border border-gray-200 hover:border-gray-300 h-auto transition-all"
                    >
                      <div className="space-y-1">
                        <div className="text-sm font-medium text-gray-900">
                          {example.text}
                        </div>
                        <div className="text-xs text-gray-500">
                          {example.category}
                        </div>
                      </div>
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6 p-6">
              {messages.map((message) => (
                <MessageComponent key={message.id} message={message} />
              ))}

              {isThinking && (
                <div className="flex gap-4 max-w-4xl">
                  <div className="w-8 h-8 rounded-xl bg-blue-500 flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-sm font-bold">AI</span>
                  </div>
                  <div className="flex-1">
                    <div className="bg-white rounded-xl p-4 border border-gray-200 inline-block">
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" style={{animationDelay: '0.2s'}}></div>
                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" style={{animationDelay: '0.4s'}}></div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Clean Input Area */}
      <div className="border-t border-gray-200 bg-white p-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-end gap-3 p-4 border border-gray-200 rounded-xl bg-white focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 transition-all">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 flex-shrink-0 hover:bg-gray-100 rounded-lg"
              disabled={isThinking}
              title="Attach file"
            >
              <Paperclip size={16} className="text-gray-600" />
            </Button>

            <div className="flex-1 relative">
              <Textarea
                ref={textareaRef}
                value={currentMessage}
                onChange={(e) => setCurrentMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={`Message ${getModelDisplayName(selectedModel)}...`}
                className="min-h-[24px] max-h-[120px] border-0 bg-transparent resize-none focus-visible:ring-0 focus-visible:ring-offset-0 p-0 text-sm placeholder:text-gray-500 text-gray-900"
                disabled={isThinking}
              />
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              {currentMessage.trim() ? (
                <Button
                  onClick={handleSendMessage}
                  disabled={isThinking}
                  className="h-8 w-8 p-0 bg-blue-500 hover:bg-blue-600 rounded-lg disabled:opacity-50"
                  title="Send message"
                >
                  {isThinking ? (
                    <div className="animate-spin">
                      <ArrowsClockwise size={14} className="text-white" />
                    </div>
                  ) : (
                    <PaperPlaneTilt size={14} weight="fill" className="text-white" />
                  )}
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsRecording(!isRecording)}
                  className={cn(
                    "h-8 w-8 p-0 rounded-lg transition-all",
                    isRecording 
                      ? "bg-red-500 text-white" 
                      : "hover:bg-gray-100 text-gray-600"
                  )}
                  disabled={isThinking}
                  title={isRecording ? "Stop recording" : "Start voice input"}
                >
                  {isRecording ? <Stop size={14} /> : <Microphone size={14} />}
                </Button>
              )}
            </div>
          </div>
          
          <div className="flex items-center justify-between text-xs text-gray-500 mt-3">
            <div className="flex items-center gap-2">
              <span>AI responses may contain errors.</span>
              <span>•</span>
              <span>Everything runs locally on your machine.</span>
            </div>
            <div>
              <span>Press Shift+Enter for new line</span>
            </div>
          </div>
        </div>
        </div>

        {/* Canvas Panel */}
        {developerMode && (
          <div className="w-2/5 bg-gray-900 text-white flex flex-col">
            <div className="p-4 bg-gray-800 border-b border-gray-700 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Lightning size={20} className="text-blue-400" />
                <span className="font-semibold">Canvas</span>
              </div>
              <Button 
                size="sm" 
                variant="ghost" 
                className="h-8 w-8 p-0 text-gray-300 hover:text-white hover:bg-gray-700"
                onClick={() => setDeveloperMode(false)}
              >
                ✕
              </Button>
            </div>
            <div className="flex-1 flex flex-col">
              <div className="p-2 bg-gray-800 border-b border-gray-700 text-sm text-gray-400">
                code.js
              </div>
              <Textarea
                className="flex-1 bg-gray-900 text-green-400 font-mono text-sm border-0 rounded-none resize-none focus:ring-0"
                placeholder="// Canvas - AI Code Editor
console.log('Hello from Canvas!');

// Ask the AI to write code here"
                style={{ minHeight: '400px' }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default ChatInterface