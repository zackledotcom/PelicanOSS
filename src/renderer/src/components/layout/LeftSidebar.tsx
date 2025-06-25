import React, { useState } from 'react'
import { 
  Plus, 
  ChatCircle, 
  X,
  DotsThree,
  Trash,
  PencilSimple,
  Sun,
  Moon,
  Monitor
} from 'phosphor-react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'

interface ChatSession {
  id: string
  title: string
  timestamp: Date
  messageCount: number
}

interface LeftSidebarProps {
  onClose: () => void
  onOpenSettings: () => void
  onOpenDeveloper: () => void
  selectedModel: string
  onModelChange: (model: string) => void
  theme: 'light' | 'dark' | 'system'
  onThemeChange: (theme: 'light' | 'dark' | 'system') => void
}

const LeftSidebar: React.FC<LeftSidebarProps> = ({
  onClose,
  onOpenSettings,
  onOpenDeveloper,
  selectedModel,
  onModelChange,
  theme,
  onThemeChange
}) => {
  const [chatSessions] = useState<ChatSession[]>([
    { id: '1', title: 'Python Data Analysis', timestamp: new Date(), messageCount: 15 },
    { id: '2', title: 'React Component Help', timestamp: new Date(Date.now() - 86400000), messageCount: 8 },
    { id: '3', title: 'API Documentation', timestamp: new Date(Date.now() - 172800000), messageCount: 23 },
  ])

  const models = [
    { value: 'tinydolphin:latest', label: 'TinyDolphin (1B)' },
    { value: 'openchat:latest', label: 'OpenChat (7B)' },
    { value: 'phi4-mini-reasoning:latest', label: 'Phi4 Mini (3.8B)' },
    { value: 'deepseek-coder:1.3b', label: 'DeepSeek Coder (1B)' },
  ]

  const getThemeIcon = () => {
    switch (theme) {
      case 'light': return <Sun size={16} />
      case 'dark': return <Moon size={16} />
      default: return <Monitor size={16} />
    }
  }

  const newChat = () => {
    // Handle new chat creation
    console.log('Creating new chat...')
  }

  return (
    <div className="flex flex-col h-full gradient-white-grey border-r border-gray-100 shadow-elevated backdrop-blur-sm">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-white/80 backdrop-blur">
        <h2 className="font-bold text-lg text-black">Chat History</h2>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="h-8 w-8 p-0 lg:hidden rounded-xl hover:bg-white transition-all duration-200 shadow-minimal hover:shadow-soft border border-gray-100"
        >
          <X size={16} className="text-gray-600" />
        </Button>
      </div>

      {/* New Chat Button */}
      <div className="p-6">
        <Button
          onClick={newChat}
          className="w-full justify-start gap-3 h-12 rounded-2xl bg-black hover:bg-gray-800 text-white shadow-soft hover:shadow-elevated transition-all duration-300 hover:-translate-y-0.5 border border-gray-800"
        >
          <Plus size={18} />
          New Chat
        </Button>
      </div>

      {/* Model Selection */}
      <div className="px-6 pb-6">
        <label className="text-sm font-semibold text-gray-700 mb-3 block">
          AI Model
        </label>
        <Select value={selectedModel} onValueChange={onModelChange}>
          <SelectTrigger className="w-full h-12 rounded-2xl border-gray-200 bg-gradient-to-r from-white to-gray-50 shadow-sm hover:shadow-md transition-all duration-200 hover:border-blue-300">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="rounded-2xl border-gray-200 shadow-2xl">
            {models.map((model) => (
              <SelectItem 
                key={model.value} 
                value={model.value}
                className="rounded-xl hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 transition-all duration-200"
              >
                {model.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Chat Sessions */}
      <div className="flex-1 overflow-hidden">
        <div className="px-6 pb-3">
          <h3 className="text-sm font-semibold text-gray-700">Recent Conversations</h3>
        </div>
        <ScrollArea className="flex-1 px-3">
          <div className="space-y-2">
            {chatSessions.map((session) => (
              <div
                key={session.id}
                className="group flex items-center gap-3 p-4 rounded-2xl hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 hover:border-blue-200 cursor-pointer transition-all duration-300 shadow-sm hover:shadow-lg hover:shadow-blue-500/10 hover:-translate-y-0.5 border border-transparent"
              >
                <ChatCircle size={18} className="text-blue-500 flex-shrink-0" weight="duotone" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold truncate text-gray-900">
                    {session.title}
                  </div>
                  <div className="text-xs text-blue-600 font-medium">
                    {session.messageCount} messages
                  </div>
                </div>
                <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1.5 transition-opacity duration-200">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 rounded-xl hover:bg-blue-100 transition-all duration-200"
                  >
                    <PencilSimple size={14} className="text-blue-600" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 rounded-xl hover:bg-red-100 text-red-500 hover:text-red-600 transition-all duration-200"
                  >
                    <Trash size={14} />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Footer */}
      <div className="p-6 border-t border-border/50 space-y-4 bg-gradient-to-r from-background/80 to-background/60 backdrop-blur">
        {/* Theme Toggle */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-muted-foreground">Theme</span>
          <div className="flex items-center gap-1 bg-gradient-to-r from-gray-100 to-gray-200 rounded-2xl p-1.5 shadow-inner">
            {(['light', 'dark', 'system'] as const).map((t) => (
              <Button
                key={t}
                variant={theme === t ? "default" : "ghost"}
                size="sm"
                onClick={() => onThemeChange(t)}
                className={cn(
                  "h-8 w-8 p-0 rounded-xl transition-all duration-200",
                  theme === t 
                    ? "bg-gradient-to-br from-blue-500 to-purple-600 text-white shadow-lg shadow-blue-500/25" 
                    : "hover:bg-white/80 text-gray-600"
                )}
                title={`${t.charAt(0).toUpperCase() + t.slice(1)} theme`}
              >
                {t === 'light' && <Sun size={14} weight={theme === t ? "fill" : "regular"} />}
                {t === 'dark' && <Moon size={14} weight={theme === t ? "fill" : "regular"} />}
                {t === 'system' && <Monitor size={14} weight={theme === t ? "fill" : "regular"} />}
              </Button>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={onOpenSettings}
            className="flex-1 justify-start gap-2 h-10 rounded-2xl hover:bg-gradient-to-r hover:from-gray-50 hover:to-gray-100 transition-all duration-200 shadow-sm hover:shadow-md"
          >
            Settings
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onOpenDeveloper}
            className="flex-1 justify-start gap-2 h-10 rounded-2xl hover:bg-gradient-to-r hover:from-gray-50 hover:to-gray-100 transition-all duration-200 shadow-sm hover:shadow-md"
          >
            Developer
          </Button>
        </div>
      </div>
    </div>
  )
}

export default LeftSidebar