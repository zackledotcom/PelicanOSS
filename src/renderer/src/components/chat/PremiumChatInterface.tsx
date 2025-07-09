// Enhanced PremiumChatInterface with proper AI routing and model selection
import React, { useState, useRef, useEffect, useCallback } from 'react'
import {
  PaperPlaneTilt,
  Brain,
  Code,
  Cpu,
  FileText,
  Gear,
  Plus,
  CircleNotch,
  Sidebar as SidebarIcon,
  Robot,
  Lightning,
  Terminal
} from 'phosphor-react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import { useAllServices } from '@/hooks/useServices'
import { Message } from '../../../types/chat'
import MessageComponent from './components/MessageComponent'
import { useToast } from '@/components/ui/toast'

type AIProvider = 'ollama' | 'claude' | 'gemini'
interface PremiumChatInterfaceProps {
  selectedModel: string
  onModelChange: (model: string) => void
  onOpenSettings: () => void
  onOpenDeveloper: () => void
  onOpenSystemStatus: () => void
  onOpenAgentManager: () => void
  onOpenAdvancedMemory: () => void
  onOpenCodeAnalysis: () => void
  onOpenCollaborationCanvas?: () => void
  onToggleSidebar: () => void
  sidebarOpen: boolean
  onNewChat?: () => void
  activeAI?: AIProvider
  activeThread?: string
}

const PremiumChatInterface: React.FC<PremiumChatInterfaceProps> = ({
  selectedModel,
  onModelChange,
  onOpenSettings,
  onOpenDeveloper,
  onOpenSystemStatus,
  onOpenAgentManager,
  onOpenAdvancedMemory,
  onOpenCodeAnalysis,
  onOpenCollaborationCanvas,
  onToggleSidebar,
  sidebarOpen,
  onNewChat,
  activeAI = 'ollama',
  activeThread
}) => {
  const services = useAllServices()
  const { addToast } = useToast()
  
  const [messages, setMessages] = useState<Message[]>([])
  const [inputMessage, setInputMessage] = useState('')
  const [isThinking, setIsThinking] = useState(false)
  const [isStreaming, setIsStreaming] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const scrollAreaRef = useRef<HTMLDivElement>(null)

  // AI Provider configurations
  const aiProviders = {
    ollama: {
      name: 'Ollama',
      icon: Robot,
      color: 'bg-blue-500',
      models: services.ollama.models || [],
      status: services.ollama.status.connected
    },
    claude: {
      name: 'Claude DC',
      icon: Brain,
      color: 'bg-orange-500',
      models: ['claude-3-sonnet', 'claude-3-haiku'],
      status: true // Assume available via Desktop Commander
    },
    gemini: {
      name: 'Gemini CLI',
      icon: Lightning,
      color: 'bg-green-500',
      models: ['gemini-pro', 'gemini-pro-vision'],
      status: true // Assume available via CLI
    }
  }

  const currentProvider = aiProviders[activeAI]

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Handle textarea resizing
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputMessage(e.target.value)
    
    // Auto-resize textarea
    const textarea = e.target
    textarea.style.height = 'auto'
    textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px'
  }

  // Handle key events
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  // Route message to the appropriate AI service
  const routeAIMessage = async (message: string, provider: AIProvider, model: string): Promise<string> => {
    try {
      switch (provider) {
        case 'ollama':
          const ollamaResponse = await window.api.chatWithAI({
            message,
            model,
            history: messages
          })
          // Ollama response has .message property, not .response
          return ollamaResponse.success ? (ollamaResponse.message || 'No response') : (ollamaResponse.error || ollamaResponse.message || 'Error communicating with Ollama')

        case 'claude':
          const claudeResponse = await window.api.claudeDcExecuteCommand({
            command: `echo "${message.replace(/"/g, '\\"')}" | claude chat`,
            timeout: 30000
          })
          return claudeResponse.success ? claudeResponse.output || 'No response from Claude' : claudeResponse.error || 'Claude DC error'

        case 'gemini':
          const geminiResponse = await window.api.geminiCliChatWithContext({
            message,
            projectPath: '/Users/jibbr/Desktop/Wonder/PelicanOS'
          })
          return geminiResponse.success ? geminiResponse.response || 'No response from Gemini' : geminiResponse.error || 'Gemini CLI error'

        default:
          throw new Error(`Unknown AI provider: ${provider}`)
      }
    } catch (error: any) {
      console.error(`Error routing to ${provider}:`, error)
      return `Error communicating with ${provider}: ${error.message}`
    }
  }

  // Send message handler
  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isThinking) return

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: inputMessage.trim(),
      timestamp: new Date(), // Fixed: Use Date object instead of ISO string
      model: selectedModel
    }

    setMessages(prev => [...prev, userMessage])
    setInputMessage('')
    setIsThinking(true)

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = '40px'
    }

    try {
      const response = await routeAIMessage(userMessage.content, activeAI, selectedModel)
      
      // Ensure response is always a string
      const responseContent = typeof response === 'string' ? response : JSON.stringify(response)
      
      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: responseContent,
        timestamp: new Date(), // Fixed: Use Date object instead of ISO string
        model: selectedModel
      }

      setMessages(prev => [...prev, assistantMessage])
      
      addToast({
        title: `${currentProvider.name} Response`,
        description: `Message sent successfully using ${selectedModel}`,
        type: 'success'
      })
    } catch (error: any) {
      console.error('Chat error:', error)
      
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: `Sorry, I encountered an error: ${error.message}`,
        timestamp: new Date(), // Fixed: Use Date object instead of ISO string
        model: selectedModel
      }

      setMessages(prev => [...prev, errorMessage])
      
      addToast({
        title: 'Error',
        description: `Failed to get response from ${currentProvider.name}`,
        type: 'error'
      })
    } finally {
      setIsThinking(false)
    }
  }

  // Handle new chat
  const handleNewChat = () => {
    setMessages([])
    setInputMessage('')
    onNewChat?.()
    
    addToast({
      title: 'New Chat',
      description: `Started new ${currentProvider.name} conversation`,
      type: 'info'
    })
  }

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-white">
        <div className="flex items-center gap-3">
          {!sidebarOpen && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleSidebar}
              className="p-2"
            >
              <SidebarIcon size={20} />
            </Button>
          )}
          
          <div className="flex items-center gap-2">
            <div className={cn(
              'w-3 h-3 rounded-full',
              currentProvider.status ? 'bg-green-500' : 'bg-red-500'
            )} />
            <currentProvider.icon size={20} className="text-gray-600" />
            <span className="font-medium text-gray-900">{currentProvider.name}</span>
            <Badge variant="secondary" className="text-xs">
              {selectedModel}
            </Badge>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleNewChat}
            className="gap-2"
          >
            <Plus size={16} />
            New Chat
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="p-2">
                <Gear size={20} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={onOpenSettings}>
                <Gear size={16} className="mr-2" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onOpenDeveloper}>
                <Code size={16} className="mr-2" />
                Developer
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onOpenSystemStatus}>
                <Cpu size={16} className="mr-2" />
                System Status
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onOpenAgentManager}>
                <Brain size={16} className="mr-2" />
                Agent Manager
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onOpenAdvancedMemory}>
                <FileText size={16} className="mr-2" />
                Memory
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onOpenCodeAnalysis}>
                <Terminal size={16} className="mr-2" />
                Code Analysis
              </DropdownMenuItem>
              {onOpenCollaborationCanvas && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={onOpenCollaborationCanvas}>
                    <Brain size={16} className="mr-2" />
                    Collaboration Canvas
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Messages Area */}
      <ScrollArea className="flex-1 px-4" ref={scrollAreaRef}>
        <div className="py-4 space-y-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <currentProvider.icon size={48} className="text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Ready to chat with {currentProvider.name}
              </h3>
              <p className="text-sm text-gray-500 max-w-md">
                {activeAI === 'ollama' && `Using model: ${selectedModel}. Start a conversation!`}
                {activeAI === 'claude' && 'Claude Desktop Commander is ready for file operations and coding tasks.'}
                {activeAI === 'gemini' && 'Gemini CLI is ready for code analysis and project assistance.'}
              </p>
            </div>
          ) : (
            messages.map((message) => (
              <MessageComponent
                key={message.id}
                message={message}
                onEdit={(id, content) => {
                  setMessages(prev => prev.map(msg => 
                    msg.id === id ? { ...msg, content } : msg
                  ))
                }}
                onDelete={(id) => {
                  setMessages(prev => prev.filter(msg => msg.id !== id))
                }}
                onCopy={(content) => {
                  navigator.clipboard.writeText(content)
                  addToast({
                    title: 'Copied',
                    description: 'Message copied to clipboard',
                    type: 'success'
                  })
                }}
              />
            ))
          )}
          
          {isThinking && (
            <div className="flex items-center gap-2 text-gray-500">
              <CircleNotch size={16} className="animate-spin" />
              <span className="text-sm">{currentProvider.name} is thinking...</span>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Input Area */}
      <div className="p-4 border-t border-gray-200 bg-white">
        <div className="flex gap-3 items-end">
          <div className="flex-1 relative">
            <Textarea
              ref={textareaRef}
              value={inputMessage}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder={`Message ${currentProvider.name}...`}
              className="min-h-[40px] max-h-[120px] resize-none pr-12"
              disabled={isThinking}
            />
          </div>
          
          <Button
            onClick={handleSendMessage}
            disabled={!inputMessage.trim() || isThinking}
            size="sm"
            className="p-3"
          >
            {isThinking ? (
              <CircleNotch size={16} className="animate-spin" />
            ) : (
              <PaperPlaneTilt size={16} />
            )}
          </Button>
        </div>

        {/* Status Info */}
        <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
          <div className="flex items-center gap-2">
            <span>Active AI: {currentProvider.name}</span>
            <span>•</span>
            <span>Model: {selectedModel}</span>
            {currentProvider.status && (
              <>
                <span>•</span>
                <span className="text-green-600">Connected</span>
              </>
            )}
          </div>
          
          <div className="flex items-center gap-1">
            <span>Press</span>
            <Badge variant="outline" className="px-1 py-0 text-xs">Enter</Badge>
            <span>to send</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default PremiumChatInterface
