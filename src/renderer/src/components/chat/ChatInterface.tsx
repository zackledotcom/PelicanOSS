import React, { useState, useRef, useEffect } from 'react'
import { 
  PaperPlaneTilt, 
  Code,
  Sparkle,
  ArrowsOut,
  ArrowsIn
} from 'phosphor-react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import { useAllServices } from '@/hooks/useServices'
import { Message } from '../../../../types/chat'
import MessageComponent from './components/MessageComponent'
import CodeCanvas from '../canvas/CodeCanvas'
import InputBar from './InputBar'
import AppHeader from '../layout/AppHeader'
import { useAnalyticsTracking } from '../../services/modelAnalytics'
import { useToast } from '@/components/ui/toast'

interface ChatInterfaceProps {
  selectedModel: string
  onModelChange: (model: string) => void
  onOpenSettings: () => void
  onOpenDeveloper: () => void
  onOpenSystemStatus: () => void
  onOpenAgentManager: () => void
  onOpenAdvancedMemory: () => void
  onToggleSidebar: () => void
  sidebarOpen: boolean
  onSetSidebarOpen: (open: boolean) => void
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({
  selectedModel,
  onModelChange,
  onOpenSettings,
  onOpenDeveloper,
  onOpenSystemStatus,
  onOpenAgentManager,
  onOpenAdvancedMemory,
  onToggleSidebar,
  sidebarOpen,
  onSetSidebarOpen
}) => {
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [canvasContent, setCanvasContent] = useState<{
    content: string
    language: string
    title: string
    fileName?: string
    visible: boolean
    isFullscreen: boolean
  } | null>(null)
  const [isCanvasAnimating, setIsCanvasAnimating] = useState(false)
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const services = useAllServices()
  const analytics = useAnalyticsTracking()
  const { addToast } = useToast()

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Handle Escape key and click outside canvas
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && canvasContent?.visible) {
        closeCanvas()
      }
    }

    const handleClickOutside = (event: MouseEvent) => {
      if (canvasContent?.visible && event.target instanceof Element) {
        const canvasElement = document.querySelector('[data-canvas-panel]')
        if (canvasElement && !canvasElement.contains(event.target)) {
          closeCanvas()
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('mousedown', handleClickOutside)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [canvasContent?.visible])

  const handleSendMessage = async (content: string, attachments?: File[]) => {
    if (!content.trim() || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content,
      timestamp: new Date(),
      model: selectedModel
    }

    setMessages(prev => [...prev, userMessage])
    setIsLoading(true)

    try {
      const startTime = Date.now()
      
      // Send to backend
      const response = await window.api.chatWithAI({
        message: content,
        model: selectedModel,
        history: messages.slice(-10) // Last 10 messages for context
      })

      const endTime = Date.now()
      const responseTime = endTime - startTime

      if (response.success) {
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          type: 'assistant',
          content: response.message,
          timestamp: new Date(),
          model: selectedModel,
          responseTime
        }

        setMessages(prev => [...prev, assistantMessage])

        // Check if response contains code and auto-open canvas
        const codeMatch = response.message.match(/```(\w+)?\n([\s\S]*?)```/)
        if (codeMatch) {
          const language = codeMatch[1] || 'text'
          const code = codeMatch[2].trim()
          
          setCanvasContent({
            content: code,
            language,
            title: `${language.charAt(0).toUpperCase() + language.slice(1)} Code`,
            fileName: `code.${language}`,
            visible: true,
            isFullscreen: false
          })

          addToast({
            type: 'info',
            title: 'Code Canvas Opened',
            description: 'Your code is now available in the canvas for editing',
            duration: 3000
          })
        }

        // Track analytics
        analytics.trackResponse(selectedModel, responseTime, response.message.length)
      } else {
        throw new Error(response.error || 'Failed to get response')
      }
    } catch (error) {
      console.error('Chat error:', error)
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'system',
        content: `Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`,
        timestamp: new Date(),
        model: selectedModel
      }
      setMessages(prev => [...prev, errorMessage])
      
      addToast({
        type: 'error',
        title: 'Chat Error',
        description: 'Failed to get response from AI model',
        duration: 4000
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleOpenCanvas = (content: string, language: string = 'text', title: string = 'Code Canvas') => {
    setIsCanvasAnimating(true)
    
    // First collapse the sidebar
    if (sidebarOpen) {
      onSetSidebarOpen(false)
    }
    
    // Then animate the canvas in after a brief delay
    setTimeout(() => {
      setCanvasContent({
        content,
        language,
        title,
        fileName: `code.${language}`,
        visible: true,
        isFullscreen: false
      })
      setIsCanvasAnimating(false)
    }, sidebarOpen ? 300 : 0) // Wait for sidebar animation if it was open
  }

  const handleCanvasContentChange = (content: string) => {
    if (canvasContent) {
      setCanvasContent({
        ...canvasContent,
        content
      })
    }
  }

  const handleSuggestImprovements = async (content: string) => {
    const improvementPrompt = `Please analyze this code and suggest improvements:\n\n\`\`\`${canvasContent?.language}\n${content}\n\`\`\``
    await handleSendMessage(improvementPrompt)
  }

  const handleExecuteCode = async (content: string, language: string) => {
    addToast({
      type: 'info',
      title: 'Code Execution',
      description: `Executing ${language} code...`,
      duration: 2000
    })
    
    // TODO: Implement code execution
    console.log('Execute code:', { content, language })
  }

  const toggleCanvasFullscreen = () => {
    if (canvasContent) {
      setCanvasContent({
        ...canvasContent,
        isFullscreen: !canvasContent.isFullscreen
      })
    }
  }

  const closeCanvas = () => {
    setIsCanvasAnimating(true)
    setCanvasContent(null)
    
    // Brief delay for animation completion
    setTimeout(() => {
      setIsCanvasAnimating(false)
    }, 300)
  }

  return (
    <div className="flex flex-col h-screen bg-white">
      {/* Fixed Header */}
      <AppHeader
        selectedModel={selectedModel}
        onModelChange={onModelChange}
        onToggleSidebar={onToggleSidebar}
        sidebarOpen={sidebarOpen}
        onOpenSettings={onOpenSettings}
        onOpenDeveloper={onOpenDeveloper}
        onOpenSystemStatus={onOpenSystemStatus}
        onOpenAgentManager={onOpenAgentManager}
        messageCount={messages.length}
        responseTime={analytics.getAverageResponseTime(selectedModel)}
      />

      {/* Main Content Area */}
      <div className="flex flex-1 pt-14"> {/* pt-14 to account for fixed header */}
        {/* Chat Area */}
        <div className={cn(
          "flex flex-col transition-all duration-300 ease-out",
          canvasContent?.visible 
            ? canvasContent.isFullscreen 
              ? "w-0 overflow-hidden opacity-0" 
              : "w-1/2 opacity-100"
            : "w-full opacity-100"
        )}>
          {/* Messages */}
          <ScrollArea className="flex-1 px-4">
            <div className="max-w-4xl mx-auto py-4 space-y-4">
              {messages.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl mx-auto mb-4 flex items-center justify-center">
                    <Sparkle size={24} className="text-white" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Welcome to PelicanOS</h3>
                  <p className="text-gray-600 mb-4">Start a conversation with your AI assistant</p>
                  <div className="flex flex-wrap justify-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSendMessage("Write a Python function to calculate fibonacci numbers")}
                    >
                      <Code size={14} className="mr-1" />
                      Write Python code
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSendMessage("Explain how neural networks work")}
                    >
                      <Sparkle size={14} className="mr-1" />
                      Explain concepts
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSendMessage("Help me debug this JavaScript error")}
                    >
                      <Code size={14} className="mr-1" />
                      Debug code
                    </Button>
                  </div>
                </div>
              ) : (
                messages.map((message) => (
                  <MessageComponent
                    key={message.id}
                    message={message}
                    onOpenCanvas={handleOpenCanvas}
                    onEditMessage={(id, content) => {
                      setMessages(prev => prev.map(msg => 
                        msg.id === id ? { ...msg, content } : msg
                      ))
                    }}
                    onDeleteMessage={(id) => {
                      setMessages(prev => prev.filter(msg => msg.id !== id))
                    }}
                  />
                ))
              )}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 rounded-lg p-4 max-w-xs">
                    <div className="flex items-center gap-2 text-gray-600">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                      <span className="text-sm ml-2">Thinking...</span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          {/* Input Bar */}
          <div className="border-t border-gray-200 p-4">
            <div className="max-w-4xl mx-auto">
              <InputBar
                onSendMessage={handleSendMessage}
                disabled={isLoading}
                placeholder={`Message ${selectedModel.replace(':latest', '')}...`}
                onOpenCanvas={handleOpenCanvas}
              />
            </div>
          </div>
        </div>

        {/* Canvas Area */}
        {canvasContent?.visible && (
          <div 
            data-canvas-panel
            className={cn(
              "border-l border-gray-200 transition-all duration-300 ease-out transform",
              canvasContent.isFullscreen ? "w-full opacity-100 translate-x-0" : "w-1/2 opacity-100 translate-x-0",
              isCanvasAnimating ? "opacity-0 translate-x-4" : "opacity-100 translate-x-0"
            )}
          >
            <div className="h-full relative">
              {/* Canvas Header */}
              <div className="h-10 bg-gray-50 border-b border-gray-200 flex items-center justify-between px-3">
                <h3 className="text-sm font-medium text-gray-700">Canvas</h3>
                <div className="flex items-center gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={toggleCanvasFullscreen}
                    className="h-6 w-6 p-0"
                  >
                    {canvasContent.isFullscreen ? <ArrowsIn size={12} /> : <ArrowsOut size={12} />}
                  </Button>
                </div>
              </div>

              {/* Canvas Content */}
              <div className="h-[calc(100%-2.5rem)]">
                <CodeCanvas
                  content={canvasContent.content}
                  language={canvasContent.language}
                  title={canvasContent.title}
                  fileName={canvasContent.fileName}
                  onContentChange={handleCanvasContentChange}
                  onClose={closeCanvas}
                  onSuggestImprovements={handleSuggestImprovements}
                  onExecute={handleExecuteCode}
                  isFullscreen={canvasContent.isFullscreen}
                  onToggleFullscreen={toggleCanvasFullscreen}
                  className="h-full border-0 rounded-none"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default ChatInterface