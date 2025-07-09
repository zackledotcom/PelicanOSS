import React, { useState } from 'react'
import {
  Plus,
  ChatCircle,
  X,
  Trash,
  PencilSimple,
  Sun,
  Moon,
  Monitor,
  Info,
  CaretLeft,
  Circle,
  Gear,
  Code,
  Robot,
  Brain,
  Lightning,
  Terminal,
  Users
} from 'phosphor-react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { ChatSession } from '@/types/chat'
import { useAllServices } from '@/hooks/useServices'
import ModelCard from '../ModelCard'
import NumberTicker from '@/components/ui/number-ticker'
import { useToast } from '@/components/ui/toast'

type AIProvider = 'ollama' | 'claude' | 'gemini'

interface ChatThread {
  id: string
  title: string
  provider: AIProvider
  timestamp: Date
  messageCount: number
  model?: string
}

interface LeftSidebarProps {
  onClose: () => void
  onToggle: () => void
  isOpen: boolean
  onOpenSettings: () => void
  onOpenDeveloper: () => void
  selectedModel: string
  onModelChange: (model: string) => void
  theme: 'light' | 'dark' | 'system'
  onThemeChange: (theme: 'light' | 'dark' | 'system') => void
  activeAI: AIProvider
  onAIChange: (provider: AIProvider) => void
  activeThread?: string
  onThreadChange: (threadId: string) => void
}

const LeftSidebar: React.FC<LeftSidebarProps> = ({
  onClose,
  onToggle,
  isOpen,
  onOpenSettings,
  onOpenDeveloper,
  selectedModel,
  onModelChange,
  theme,
  onThemeChange,
  activeAI,
  onAIChange,
  activeThread,
  onThreadChange,
  onOpenCollaborationCanvas
}) => {
  const services = useAllServices()
  const { addToast } = useToast()
  
  // Sample chat threads for each AI provider
  const [chatThreads] = useState<ChatThread[]>([
    { 
      id: '1', 
      title: 'Python Data Analysis', 
      provider: 'ollama', 
      timestamp: new Date(), 
      messageCount: 15,
      model: 'llama2'
    },
    { 
      id: '2', 
      title: 'React Component Help', 
      provider: 'claude', 
      timestamp: new Date(Date.now() - 86400000), 
      messageCount: 8
    },
    { 
      id: '3', 
      title: 'Code Review & Analysis', 
      provider: 'gemini', 
      timestamp: new Date(Date.now() - 172800000), 
      messageCount: 23
    },
    { 
      id: '4', 
      title: 'API Documentation', 
      provider: 'ollama', 
      timestamp: new Date(Date.now() - 172800000), 
      messageCount: 12,
      model: 'deepseek-coder'
    },
    { 
      id: '5', 
      title: 'Terminal Commands', 
      provider: 'claude', 
      timestamp: new Date(Date.now() - 259200000), 
      messageCount: 34
    }
  ])

  const availableModels = services.ollama.models || []
  
  const models = availableModels.map((modelName: string) => ({
    value: modelName,
    label: modelName
      .replace(':latest', '')
      .replace('tinydolphin', 'TinyDolphin')
      .replace('openchat', 'OpenChat')
      .replace('phi4-mini-reasoning', 'Phi4 Mini')
      .replace('deepseek-coder', 'DeepSeek Coder'),
    conversations: Math.floor(Math.random() * 50),
    accuracy: Math.floor(Math.random() * 20) + 80,
  }))

  const [showModelCard, setShowModelCard] = useState<string | null>(null)
  const [isCreatingChat, setIsCreatingChat] = useState(false)

  const currentModel = models.find(m => m.value === selectedModel) || models[0]

  // AI Provider configurations
  const aiProviders = [
    {
      id: 'ollama' as AIProvider,
      name: 'Ollama',
      description: 'Local LLM',
      icon: Robot,
      color: 'bg-blue-500',
      status: services.ollama.running ? 'online' : 'offline'
    },
    {
      id: 'claude' as AIProvider,
      name: 'Claude',
      description: 'Desktop Commander',
      icon: Brain,
      color: 'bg-orange-500',
      status: 'online' // Would check Claude DC status
    },
    {
      id: 'gemini' as AIProvider,
      name: 'Gemini',
      description: 'CLI Interface',
      icon: Lightning,
      color: 'bg-purple-500',
      status: 'online' // Would check Gemini CLI status
    }
  ]

  const newChat = async () => {
    setIsCreatingChat(true)
    try {
      await new Promise(resolve => setTimeout(resolve, 500))
      addToast({
        type: 'success',
        title: `New ${activeAI.charAt(0).toUpperCase() + activeAI.slice(1)} Chat Created`,
        description: 'Ready for your next conversation',
        duration: 2000
      })
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Chat Creation Failed',
        description: 'Unable to create new chat session',
        duration: 3000
      })
    } finally {
      setIsCreatingChat(false)
    }
  }

  const editThread = (id: string) => {
    addToast({
      type: 'info',
      title: 'Edit Thread',
      description: 'Thread editing feature coming soon',
      duration: 2000
    })
  }

  const deleteThread = (id: string) => {
    addToast({
      type: 'warning',
      title: 'Delete Thread',
      description: 'Thread deletion feature coming soon',
      duration: 2000
    })
  }

  // Filter threads by active AI provider
  const filteredThreads = chatThreads.filter(thread => thread.provider === activeAI)

  return (
    <div className="h-full bg-white border-r border-gray-200 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">PelicanOS</h2>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="h-8 w-8 p-0 hover:bg-gray-100 rounded-lg"
        >
          <X size={16} />
        </Button>
      </div>

      <ScrollArea className="flex-1 p-4">
        <div className="space-y-6">
          {/* AI Provider Selection */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-gray-900">AI Provider</label>
            <div className="grid grid-cols-1 gap-2">
              {aiProviders.map((provider) => {
                const Icon = provider.icon
                const isActive = activeAI === provider.id
                const isOnline = provider.status === 'online'
                
                return (
                  <Button
                    key={provider.id}
                    variant={isActive ? "default" : "ghost"}
                    onClick={() => onAIChange(provider.id)}
                    className={cn(
                      "flex items-center justify-start gap-3 h-12 p-3 rounded-lg transition-all",
                      isActive
                        ? "bg-blue-50 border border-blue-200 text-blue-900 hover:bg-blue-100"
                        : "hover:bg-gray-50 text-gray-700"
                    )}
                  >
                    <div className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center",
                      isActive ? provider.color : "bg-gray-100"
                    )}>
                      <Icon size={16} className={isActive ? "text-white" : "text-gray-600"} />
                    </div>
                    
                    <div className="flex-1 text-left">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{provider.name}</span>
                        <Circle 
                          size={6} 
                          className={cn(
                            "fill-current",
                            isOnline ? "text-green-500" : "text-red-500"
                          )} 
                        />
                      </div>
                      <span className="text-xs text-gray-500">{provider.description}</span>
                    </div>
                    
                    {isActive && (
                      <div className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                        {filteredThreads.length} chats
                      </div>
                    )}
                  </Button>
                )
              })}
            </div>
          </div>

          {/* New Chat Button */}
          <Button
            onClick={newChat}
            disabled={isCreatingChat}
            className="w-full h-10 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            {isCreatingChat ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin">
                  <Circle size={14} className="text-white opacity-50" />
                </div>
                <span>Creating...</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Plus size={16} />
                <span>New {aiProviders.find(p => p.id === activeAI)?.name} Chat</span>
              </div>
            )}
          </Button>

          {/* Ollama Model Selection (only show for Ollama) */}
          {activeAI === 'ollama' && currentModel && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-900">Ollama Model</label>
                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                  {models.length} available
                </span>
              </div>
              
              {/* Current Model Display */}
              <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center">
                  <Robot size={16} className="text-white" />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900 truncate">
                      {currentModel.label}
                    </span>
                    <Circle size={6} className="text-blue-500 fill-blue-500" />
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-600">
                    <NumberTicker value={currentModel.conversations} suffix=" chats" className="font-mono" />
                    <span>•</span>
                    <NumberTicker value={currentModel.accuracy} suffix="% acc" className="font-mono" />
                  </div>
                </div>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowModelCard(currentModel.value)}
                  className="h-7 w-7 p-0 hover:bg-blue-100 rounded-lg"
                  title="Model Details"
                >
                  <Info size={12} className="text-blue-600" />
                </Button>
              </div>
              
              {/* Model Selector */}
              <Select value={selectedModel} onValueChange={onModelChange}>
                <SelectTrigger className="w-full h-10 rounded-lg border-gray-200 hover:border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-blue-500 flex items-center justify-center">
                      <Robot size={12} className="text-white" />
                    </div>
                    <SelectValue placeholder="Switch model..." />
                  </div>
                </SelectTrigger>
                <SelectContent className="rounded-xl border border-gray-200 bg-white shadow-lg">
                  {models.map((model) => (
                    <SelectItem
                      key={model.value}
                      value={model.value}
                      className="rounded-lg hover:bg-gray-100 focus:bg-gray-100"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-4 h-4 rounded bg-blue-500 flex items-center justify-center">
                          <Robot size={12} className="text-white" />
                        </div>
                        <div className="flex flex-col">
                          <span className="font-medium">{model.label}</span>
                          <span className="text-xs text-gray-500">{model.conversations} conversations</span>
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Chat Threads */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-900">
                {aiProviders.find(p => p.id === activeAI)?.name} Conversations
              </label>
              <span className="text-xs text-gray-500">
                {filteredThreads.length} threads
              </span>
            </div>
            
            <div className="space-y-2">
              {filteredThreads.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <ChatCircle size={32} className="mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No conversations yet</p>
                  <p className="text-xs">Start a new chat to get going!</p>
                </div>
              ) : (
                filteredThreads.map((thread) => {
                  const isActive = activeThread === thread.id
                  
                  return (
                    <div
                      key={thread.id}
                      onClick={() => onThreadChange(thread.id)}
                      className={cn(
                        "group flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all",
                        isActive
                          ? "bg-blue-50 border border-blue-200"
                          : "hover:bg-gray-50"
                      )}
                    >
                      <div className={cn(
                        "w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0",
                        isActive ? "bg-blue-500" : "bg-gray-100"
                      )}>
                        <ChatCircle size={14} className={isActive ? "text-white" : "text-gray-600"} />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className={cn(
                          "text-sm font-medium truncate",
                          isActive ? "text-blue-900" : "text-gray-900"
                        )}>
                          {thread.title}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <NumberTicker value={thread.messageCount} suffix=" messages" className="font-mono" />
                          <span>•</span>
                          <span>{thread.timestamp.toLocaleDateString()}</span>
                          {thread.model && (
                            <>
                              <span>•</span>
                              <span className="text-blue-600">{thread.model.replace(':latest', '')}</span>
                            </>
                          )}
                        </div>
                      </div>
                      
                      <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            editThread(thread.id)
                          }}
                          className="h-6 w-6 p-0 hover:bg-gray-200 rounded"
                        >
                          <PencilSimple size={12} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            deleteThread(thread.id)
                          }}
                          className="h-6 w-6 p-0 hover:bg-red-100 hover:text-red-600 rounded"
                        >
                          <Trash size={12} />
                        </Button>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>

          {/* Theme Toggle */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-gray-900">Appearance</label>
            <div className="flex items-center gap-2">
              {(['light', 'dark', 'system'] as const).map((themeOption) => {
                const icons = { light: Sun, dark: Moon, system: Monitor }
                const Icon = icons[themeOption]
                
                return (
                  <Button
                    key={themeOption}
                    variant={theme === themeOption ? "default" : "ghost"}
                    size="sm"
                    onClick={() => onThemeChange(themeOption)}
                    className="flex-1 h-8 rounded-lg"
                  >
                    <Icon size={14} />
                  </Button>
                )
              })}
            </div>
          </div>
        </div>
      </ScrollArea>

      {/* Footer Actions */}
      <div className="p-4 border-t border-gray-200 space-y-2">
        {/* Special AI Features */}
        <div className="space-y-1">
          {onOpenCollaborationCanvas && (
            <Button
              variant="ghost"
              onClick={onOpenCollaborationCanvas}
              className="w-full justify-start h-9 hover:bg-gray-50 rounded-lg"
            >
              <Users size={16} className="mr-2" />
              AI Collaboration
            </Button>
          )}
        </div>

        {/* Standard Actions */}
        <div className="pt-2 border-t border-gray-100 space-y-1">
          <Button
            variant="ghost"
            onClick={onOpenSettings}
            className="w-full justify-start h-9 hover:bg-gray-50 rounded-lg"
          >
            <Gear size={16} className="mr-2" />
            Settings
          </Button>
          <Button
            variant="ghost"
            onClick={onOpenDeveloper}
            className="w-full justify-start h-9 hover:bg-gray-50 rounded-lg"
          >
            <Code size={16} className="mr-2" />
            Developer Tools
          </Button>
        </div>
      </div>

      {/* Model Card Modal */}
      {showModelCard && (
        <ModelCard
          isOpen={!!showModelCard}
          onClose={() => setShowModelCard(null)}
          modelName={showModelCard}
        />
      )}
    </div>
  )
}

export default LeftSidebar