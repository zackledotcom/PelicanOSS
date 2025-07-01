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
  CaretLeft,
  Circle,
  Gear,
  Code
} from 'phosphor-react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { ChatSession } from '../../../../types/chat'
import { useAllServices } from '@/hooks/useServices'
import ModelCard from '../ModelCard'
import ModelAvatar from '@/components/ui/model-avatar'
import NumberTicker from '@/components/ui/number-ticker'
import { useToast } from '@/components/ui/toast'

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
  onThemeChange
}) => {
  const services = useAllServices()
  
  useEffect(() => {
    console.log('LeftSidebar rendered with isOpen:', isOpen)
  }, [isOpen])
  const { addToast } = useToast()
  
  const [chatSessions] = useState<ChatSession[]>([
    { id: '1', title: 'Python Data Analysis', timestamp: new Date(), messageCount: 15 },
    { id: '2', title: 'React Component Help', timestamp: new Date(Date.now() - 86400000), messageCount: 8 },
    { id: '3', title: 'API Documentation', timestamp: new Date(Date.now() - 172800000), messageCount: 23 },
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

  const newChat = async () => {
    setIsCreatingChat(true)
    try {
      await new Promise(resolve => setTimeout(resolve, 500))
      addToast({
        type: 'success',
        title: 'New Chat Created',
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

  const editChat = (id: string) => {
    addToast({
      type: 'info',
      title: 'Edit Chat',
      description: 'Chat editing feature coming soon',
      duration: 2000
    })
  }

  const deleteChat = async (id: string) => {
    try {
      addToast({
        type: 'success',
        title: 'Chat Deleted',
        description: 'Chat session removed successfully',
        duration: 2000
      })
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Deletion Failed',
        description: 'Unable to delete chat session',
        duration: 3000
      })
    }
  }

  return (
    <div className="flex flex-col h-full bg-white border-r border-gray-200">
      {/* Clean Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <span className="text-lg font-semibold text-gray-900">Chat History</span>
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggle}
          className="h-8 w-8 p-0 hover:bg-gray-100 rounded-lg"
          title="Close sidebar"
        >
          <CaretLeft size={16} className="text-gray-600" />
        </Button>
      </div>

      {/* Scrollable Content */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">

          {/* New Chat Button */}
          <Button
            onClick={newChat}
            disabled={isCreatingChat}
            className="w-full h-10 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg disabled:opacity-50"
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
                <span>New Chat</span>
              </div>
            )}
          </Button>

          {/* Model Selection */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-900">Active Model</label>
              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                {models.length} available
              </span>
            </div>
            
            {/* Current Model Display */}
            {currentModel && (
              <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center">
                  <span className="text-white text-sm font-bold">AI</span>
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
            )}
            
            {/* Model Selector */}
            <Select value={selectedModel} onValueChange={onModelChange}>
              <SelectTrigger className="w-full h-10 rounded-lg border-gray-200 hover:border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-blue-500 flex items-center justify-center">
                    <span className="text-xs font-bold text-white">AI</span>
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
                      <ModelAvatar modelName={model.value} size="sm" editable />
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

          {/* Chat Sessions */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-gray-900">Recent Conversations</label>
            <div className="space-y-2">
              {chatSessions.map((session) => (
                <div
                  key={session.id}
                  className="group flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <div className="w-6 h-6 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                    <ChatCircle size={14} className="text-gray-600" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate text-gray-900">
                      {session.title}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <NumberTicker value={session.messageCount} suffix=" messages" className="font-mono" />
                      <span>•</span>
                      <span>{session.timestamp.toLocaleDateString()}</span>
                    </div>
                  </div>
                  
                  <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        editChat(session.id)
                      }}
                      className="h-6 w-6 p-0 hover:bg-gray-200 rounded"
                      title="Edit Chat"
                    >
                      <PencilSimple size={12} className="text-gray-600" />
                    </Button>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        deleteChat(session.id)
                      }}
                      className="h-6 w-6 p-0 hover:bg-gray-200 rounded"
                      title="Delete Chat"
                    >
                      <Trash size={12} className="text-red-500" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </ScrollArea>

      {/* Clean Footer */}
      <div className="p-4 border-t border-gray-200 space-y-4">
        {/* Theme Toggle */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-900">Theme</span>
          <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-lg">
            {(['light', 'dark', 'system'] as const).map((t) => (
              <Button
                key={t}
                variant="ghost"
                size="sm"
                onClick={() => onThemeChange(t)}
                className={cn(
                  "h-7 w-7 p-0 rounded transition-all",
                  theme === t
                    ? "bg-white shadow-sm"
                    : "hover:bg-gray-200"
                )}
                title={`${t.charAt(0).toUpperCase() + t.slice(1)} theme`}
              >
                {t === 'light' && <Sun size={12} className={theme === t ? "text-orange-500" : "text-gray-600"} />}
                {t === 'dark' && <Moon size={12} className={theme === t ? "text-blue-600" : "text-gray-600"} />}
                {t === 'system' && <Monitor size={12} className={theme === t ? "text-gray-900" : "text-gray-600"} />}
              </Button>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onOpenSettings}
            className="flex-1 justify-start gap-2 h-9 hover:bg-gray-100 rounded-lg"
          >
            <Gear size={14} className="text-gray-600" />
            <span className="text-sm">Settings</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onOpenDeveloper}
            className="flex-1 justify-start gap-2 h-9 hover:bg-gray-100 rounded-lg"
          >
            <Code size={14} className="text-gray-600" />
            <span className="text-sm">Developer</span>
          </Button>
        </div>
      </div>
      
      {/* Model Card Modal */}
      {showModelCard && (
        <ModelCard
          model={models.find(m => m.value === showModelCard)!}
          isOpen={!!showModelCard}
          onClose={() => setShowModelCard(null)}
        />
      )}
    </div>
  )
}

export default LeftSidebar