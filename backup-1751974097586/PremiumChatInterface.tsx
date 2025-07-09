import React, { useState, useRef, useEffect } from 'react'
import {
  PaperPlaneTilt,
  Brain,
  Code,
  Cpu,
  FileText,
  Gear,
  Plus,
  CircleNotch,
  Sidebar as SidebarIcon
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
  activeAI?: 'ollama' | 'claude' | 'gemini'
  activeThread?: string
}

const PremiumChatInterface: React.FC<PremiumChatInterfaceProps> = ({
  selectedModel,
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
  const [messages, setMessages] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showMemoryContext, setShowMemoryContext] = useState(false)
  const [selectedContext, setSelectedContext] = useState<any[]>([])
  const [devMode, setDevMode] = useState(false)

  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const services = useAllServices()
  const { addToast } = useToast()

  const getModelDisplayName = (model: string) => {
    return model
      .replace(':latest', '')
      .replace('deepseek-coder', 'DeepSeek Coder')
      .replace('tinydolphin', 'TinyDolphin')
      .replace('openchat', 'OpenChat')
  }

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: inputValue.trim(),
      timestamp: new Date(),
      model: selectedModel
    }

    setMessages(prev => [...prev, userMessage])
    const messageToSend = inputValue.trim()
    setInputValue('')
    setIsLoading(true)

    try {
      let response: any

      // Route to different AI providers based on activeAI
      switch (activeAI) {
        case 'claude':
          const claudeResult = await window.api.claudeDcExecuteCommand({
            command: `echo "Claude analyzing: ${messageToSend}"`,
            timeout: 30000
          })
          response = {
            response: claudeResult.success 
              ? (claudeResult.output || 'Claude processed your request')
              : `Claude Error: ${claudeResult.error}`,
            success: claudeResult.success
          }
          break

        case 'gemini':
          const geminiResult = await window.api.geminiCliChatWithContext({
            message: messageToSend
          })
          response = {
            response: geminiResult.success 
              ? (geminiResult.response || 'Gemini analysis completed')
              : `Gemini Error: ${geminiResult.error}`,
            success: geminiResult.success
          }
          break

        case 'ollama':
        default:
          response = await window.api.chatWithAI({
            message: messageToSend,
            model: selectedModel,
            history: messages.slice(-10)
          })
          break
      }

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: response.response || response.message || 'No response received',
        timestamp: new Date(),
        model: selectedModel
      }

      setMessages(prev => [...prev, aiMessage])

      addToast({
        type: 'success',
        title: `${activeAI.charAt(0).toUpperCase() + activeAI.slice(1)} Response`,
        description: 'Message sent successfully',
        duration: 2000
      })

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: `I apologize, but I encountered an error: ${errorMessage}`,
        timestamp: new Date(),
        model: selectedModel
      }

      setMessages(prev => [...prev, aiMessage])

      addToast({
        type: 'error',
        title: 'Message Failed',
        description: errorMessage,
        duration: 3000
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  return (
    <div className="flex flex-col h-screen bg-white">
      {/* Functional Header - Only Essential Elements */}
      <header className="flex items-center justify-between px-6 py-3 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleSidebar}
            className="h-8 w-8 p-0"
          >
            <SidebarIcon size={16} />
          </Button>

          <span className="font-medium text-gray-900">PelicanOS</span>
          
          <div className={cn(
            "w-2 h-2 rounded-full",
            services.ollama.status?.connected ? "bg-green-500" : "bg-red-500"
          )} />
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowMemoryContext(!showMemoryContext)}
            className={cn(
              "h-8 w-8 p-0",
              selectedContext.length > 0 && "bg-blue-100"
            )}
          >
            <Brain size={16} />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setDevMode(!devMode)}
            className={cn(
              "h-8 w-8 p-0",
              devMode && "bg-purple-100"
            )}
          >
            <Code size={16} />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <Plus size={16} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onOpenAgentManager}>Agent Manager</DropdownMenuItem>
              <DropdownMenuItem onClick={onOpenAdvancedMemory}>Memory Store</DropdownMenuItem>
              <DropdownMenuItem onClick={onOpenCodeAnalysis}>Code Analysis</DropdownMenuItem>
              {onOpenCollaborationCanvas && (
                <DropdownMenuItem onClick={onOpenCollaborationCanvas}>AI Collaboration</DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onOpenSystemStatus}>System Health</DropdownMenuItem>
              <DropdownMenuItem onClick={onOpenSettings}>Settings</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Messages Area - Start Immediately */}
      <ScrollArea className="flex-1">
        <div className="max-w-4xl mx-auto px-6 py-6">
          {messages.length === 0 ? null : (
            <div className="space-y-6">
              {messages.map((message) => (
                <MessageComponent key={message.id} message={message} />
              ))}
              
              {isLoading && (
                <div className="flex items-center gap-3">
                  <CircleNotch size={16} className="animate-spin text-gray-400" />
                </div>
              )}
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input - Only When Needed */}
      <div className="border-t border-gray-200">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-end gap-3">
            <Textarea
              ref={textareaRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`Message ${getModelDisplayName(selectedModel)}...`}
              className="flex-1 min-h-[44px] max-h-32 resize-none border-gray-200"
              disabled={isLoading}
            />
            
            <Button
              onClick={handleSendMessage}
              disabled={!inputValue.trim() || isLoading}
              className="h-11 w-11 p-0"
            >
              {isLoading ? (
                <CircleNotch size={18} className="animate-spin" />
              ) : (
                <PaperPlaneTilt size={18} />
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default PremiumChatInterface
