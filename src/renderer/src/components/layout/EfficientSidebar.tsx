// Simplified EfficientSidebar with working model selection
import React, { useState, useEffect } from 'react'
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
  Circle,
  Gear,
  Code,
  Robot,
  Brain,
  Lightning,
  Users,
  Check,
  Download,
  Play,
  CircleNotch
} from 'phosphor-react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { useAllServices } from '@/hooks/useServices'
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
  onOpenCollaborationCanvas?: () => void
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
    }
  ])

  // Available models management
  const [availableModels, setAvailableModels] = useState<string[]>([])
  const [isRefreshingModels, setIsRefreshingModels] = useState(false)

  // Load models when Ollama connects
  useEffect(() => {
    if (services.ollama.status.connected && services.ollama.models) {
      setAvailableModels(services.ollama.models)
    }
  }, [services.ollama.status.connected, services.ollama.models])

  const loadOllamaModels = async () => {
    try {
      setIsRefreshingModels(true)
      const response = await window.api.getOllamaModels()
      if (response.success) {
        setAvailableModels(response.models)
        addToast({
          title: 'Models Refreshed',
          description: `Found ${response.models.length} models`,
          type: 'success'
        })
      }
    } catch (error) {
      console.error('Failed to load models:', error)
      addToast({
        title: 'Error',
        description: 'Failed to load Ollama models',
        type: 'error'
      })
    } finally {
      setIsRefreshingModels(false)
    }
  }

  const handlePullModel = async (modelName: string) => {
    try {
      addToast({
        title: 'Downloading Model',
        description: `Starting download of ${modelName}...`,
        type: 'info'
      })

      const success = await window.api.pullModel(modelName)
      
      if (success) {
        await loadOllamaModels() // Refresh the model list
        addToast({
          title: 'Model Downloaded',
          description: `${modelName} is now available`,
          type: 'success'
        })
      } else {
        throw new Error('Failed to download model')
      }
    } catch (error) {
      addToast({
        title: 'Download Failed',
        description: `Failed to download ${modelName}`,
        type: 'error'
      })
    }
  }

  const startOllamaService = async () => {
    try {
      addToast({
        title: 'Starting Ollama',
        description: 'Please wait while Ollama starts...',
        type: 'info'
      })
      
      const result = await services.ollama.startService()
      if (result.success) {
        addToast({
          title: 'Ollama Started',
          description: 'Ollama service is now running',
          type: 'success'
        })
        await loadOllamaModels()
      }
    } catch (error) {
      console.error('Failed to start Ollama:', error)
      addToast({
        title: 'Failed to Start',
        description: 'Could not start Ollama service',
        type: 'error'
      })
    }
  }

  const formatModelName = (modelName: string) => {
    return modelName
      .replace(':latest', '')
      .replace('tinydolphin', 'TinyDolphin')
      .replace('openchat', 'OpenChat')
      .replace('phi4-mini-reasoning', 'Phi4 Mini')
      .replace('deepseek-coder', 'DeepSeek Coder')
  }

  // AI Provider configurations
  const aiProviders = [
    {
      id: 'ollama' as AIProvider,
      name: 'Ollama',
      description: 'Local LLM',
      icon: Robot,
      color: 'bg-blue-500',
      status: services.ollama.status.connected ? 'online' : 'offline',
      models: availableModels
    },
    {
      id: 'claude' as AIProvider,
      name: 'Claude',
      description: 'Desktop Commander',
      icon: Brain,
      color: 'bg-orange-500',
      status: 'online',
      models: ['claude-3-sonnet', 'claude-3-haiku', 'claude-3-opus']
    },
    {
      id: 'gemini' as AIProvider,
      name: 'Gemini',
      description: 'CLI Integration',
      icon: Lightning,
      color: 'bg-green-500',
      status: 'online',
      models: ['gemini-pro', 'gemini-pro-vision', 'gemini-ultra']
    }
  ]

  const handleNewChat = async () => {
    try {
      addToast({
        title: 'New Chat Created',
        description: `Started new ${aiProviders.find(p => p.id === activeAI)?.name} conversation`,
        type: 'success'
      })
    } catch (error) {
      addToast({
        title: 'Error',
        description: 'Failed to create new chat',
        type: 'error'
      })
    }
  }

  const filteredThreads = chatThreads.filter(thread => thread.provider === activeAI)

  const getRelativeTime = (timestamp: Date) => {
    const now = new Date()
    const diff = now.getTime() - timestamp.getTime()
    const hours = Math.floor(diff / (1000 * 60 * 60))
    
    if (hours < 1) return 'Just now'
    if (hours < 24) return `${hours}h ago`
    if (hours < 48) return 'Yesterday'
    return `${Math.floor(hours / 24)}d ago`
  }

  return (
    <div className="flex flex-col h-full bg-gray-50 border-r border-gray-200">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-white">
        <div className="flex items-center gap-2">
          <Brain size={20} className="text-blue-600" />
          <span className="font-semibold text-gray-900">PelicanOS</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="p-1"
        >
          <X size={16} />
        </Button>
      </div>

      {/* AI Provider Selection */}
      <div className="p-4 border-b border-gray-200 bg-white">
        <h3 className="text-sm font-medium text-gray-900 mb-3">AI Providers</h3>
        <div className="space-y-2">
          {aiProviders.map((provider) => (
            <button
              key={provider.id}
              onClick={() => onAIChange(provider.id)}
              className={cn(
                'w-full flex items-center gap-3 p-3 rounded-lg border transition-all',
                activeAI === provider.id
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              )}
            >
              <div className={cn(
                'w-10 h-10 rounded-lg flex items-center justify-center text-white',
                provider.color
              )}>
                <provider.icon size={20} />
              </div>
              
              <div className="flex-1 text-left">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-900">{provider.name}</span>
                  <div className={cn(
                    'w-2 h-2 rounded-full',
                    provider.status === 'online' ? 'bg-green-500' : 'bg-red-500'
                  )} />
                </div>
                <p className="text-xs text-gray-500">{provider.description}</p>
              </div>
              
              {activeAI === provider.id && (
                <Check size={16} className="text-blue-600" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Model Selection for Ollama */}
      {activeAI === 'ollama' && (
        <div className="p-4 border-b border-gray-200 bg-white">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-gray-900">Ollama Models</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={loadOllamaModels}
              disabled={isRefreshingModels}
              className="p-1"
            >
              {isRefreshingModels ? (
                <CircleNotch size={14} className="animate-spin" />
              ) : (
                <Download size={14} />
              )}
            </Button>
          </div>

          {!services.ollama.status.connected ? (
            <div className="text-center py-4">
              <Robot size={32} className="mx-auto text-gray-400 mb-2" />
              <p className="text-sm text-gray-500 mb-3">Ollama is not running</p>
              <Button
                size="sm"
                onClick={startOllamaService}
                className="gap-2"
              >
                <Play size={14} />
                Start Ollama
              </Button>
            </div>
          ) : availableModels.length === 0 ? (
            <div className="text-center py-4">
              <p className="text-sm text-gray-500 mb-3">No models available</p>
              <Button
                size="sm"
                onClick={() => handlePullModel('llama2')}
                className="gap-2"
              >
                <Download size={14} />
                Download Llama2
              </Button>
            </div>
          ) : (
            <Select value={selectedModel} onValueChange={onModelChange}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a model" />
              </SelectTrigger>
              <SelectContent>
                {availableModels.map((model) => (
                  <SelectItem key={model} value={model}>
                    <div className="flex items-center gap-2">
                      <span>{formatModelName(model)}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {selectedModel && availableModels.includes(selectedModel) && (
            <div className="mt-3 p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">{formatModelName(selectedModel)}</span>
                <div
                  role="button"
                  tabIndex={0}
                  className="p-1 rounded hover:bg-gray-200 cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation()
                    // Handle info click
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.stopPropagation()
                      // Handle info click
                    }
                  }}
                >
                  <Info size={14} />
                </div>
              </div>
              <div className="flex gap-4 text-xs text-gray-500">
                <span>Available</span>
                <span>•</span>
                <span>Ready to use</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Model Selection for Claude/Gemini */}
      {(activeAI === 'claude' || activeAI === 'gemini') && (
        <div className="p-4 border-b border-gray-200 bg-white">
          <h3 className="text-sm font-medium text-gray-900 mb-3">
            {activeAI === 'claude' ? 'Claude Models' : 'Gemini Models'}
          </h3>
          <Select 
            value={selectedModel} 
            onValueChange={onModelChange}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select a model" />
            </SelectTrigger>
            <SelectContent>
              {aiProviders.find(p => p.id === activeAI)?.models.map((model) => (
                <SelectItem key={model} value={model}>
                  {model}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* New Chat Button */}
      <div className="p-4 border-b border-gray-200">
        <Button
          onClick={handleNewChat}
          className="w-full gap-2"
        >
          <Plus size={16} />
          New Chat
        </Button>
      </div>

      {/* Chat Threads */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-2">
          <h3 className="text-sm font-medium text-gray-900 mb-3">
            Recent Chats ({filteredThreads.length})
          </h3>
          
          {filteredThreads.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <ChatCircle size={32} className="mx-auto mb-2" />
              <p className="text-sm">No chats yet</p>
            </div>
          ) : (
            filteredThreads.map((thread) => (
              <button
                key={thread.id}
                onClick={() => onThreadChange(thread.id)}
                className={cn(
                  'w-full text-left p-3 rounded-lg border transition-all group',
                  activeThread === thread.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                )}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-gray-900 truncate">
                      {thread.title}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-gray-500">
                        {thread.messageCount} messages
                      </span>
                      <Circle size={3} className="text-gray-400" />
                      <span className="text-xs text-gray-500">
                        {getRelativeTime(thread.timestamp)}
                      </span>
                    </div>
                    {thread.model && (
                      <span className="text-xs text-blue-600 mt-1 block">
                        {formatModelName(thread.model)}
                      </span>
                    )}
                  </div>
                  
                  <div className="flex gap-1 ml-2">
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={(e) => {
                        e.stopPropagation()
                        // Handle edit
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.stopPropagation()
                          // Handle edit
                        }
                      }}
                      className="p-1 opacity-0 group-hover:opacity-100 rounded hover:bg-gray-200 cursor-pointer"
                    >
                      <PencilSimple size={12} />
                    </div>
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={(e) => {
                        e.stopPropagation()
                        // Handle delete
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.stopPropagation()
                          // Handle delete
                        }
                      }}
                      className="p-1 opacity-0 group-hover:opacity-100 text-red-600 rounded hover:bg-red-50 cursor-pointer"
                    >
                      <Trash size={12} />
                    </div>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </ScrollArea>

      {/* Footer Actions */}
      <div className="p-4 border-t border-gray-200 space-y-2">
        {onOpenCollaborationCanvas && (
          <Button
            variant="outline"
            onClick={onOpenCollaborationCanvas}
            className="w-full gap-2"
          >
            <Users size={16} />
            Collaboration Canvas
          </Button>
        )}
        
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={onOpenSettings}
            className="flex-1 gap-2"
          >
            <Gear size={16} />
            Settings
          </Button>
          <Button
            variant="outline"
            onClick={onOpenDeveloper}
            className="flex-1 gap-2"
          >
            <Code size={16} />
            Dev
          </Button>
        </div>

        {/* Theme Selector */}
        <Select value={theme} onValueChange={onThemeChange}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="light">
              <div className="flex items-center gap-2">
                <Sun size={14} />
                Light
              </div>
            </SelectItem>
            <SelectItem value="dark">
              <div className="flex items-center gap-2">
                <Moon size={14} />
                Dark
              </div>
            </SelectItem>
            <SelectItem value="system">
              <div className="flex items-center gap-2">
                <Monitor size={14} />
                System
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}

export default LeftSidebar
