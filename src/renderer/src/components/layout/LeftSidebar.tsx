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
  Monitor,
  Sparkle,
  Info,
  CaretLeft,
  CaretRight,
  Circle
} from 'phosphor-react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'
import ModelCard from '../ModelCard'

interface ChatSession {
  id: string
  title: string
  timestamp: Date
  messageCount: number
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
  const [chatSessions] = useState<ChatSession[]>([
    { id: '1', title: 'Python Data Analysis', timestamp: new Date(), messageCount: 15 },
    { id: '2', title: 'React Component Help', timestamp: new Date(Date.now() - 86400000), messageCount: 8 },
    { id: '3', title: 'API Documentation', timestamp: new Date(Date.now() - 172800000), messageCount: 23 },
  ])

  const models = [
    { 
      value: 'tinydolphin:latest', 
      label: 'TinyDolphin (1B)',
      avatar: '🐬',
      character: 'Dolphin',
      downloadDate: '2024-01-15',
      conversations: 127,
      accuracy: 85,
      strengths: ['Fast responses', 'Code generation', 'Lightweight'],
      weaknesses: ['Limited context', 'Less creative'],
      trainingData: '1.2TB',
      description: 'A nimble AI optimized for quick tasks and coding assistance.'
    },
    { 
      value: 'openchat:latest', 
      label: 'OpenChat (7B)',
      avatar: '🤖',
      character: 'Sage',
      downloadDate: '2024-01-10',
      conversations: 89,
      accuracy: 92,
      strengths: ['Conversational', 'Balanced responses', 'Good reasoning'],
      weaknesses: ['Slower than TinyDolphin', 'Higher memory usage'],
      trainingData: '4.8TB',
      description: 'A well-rounded conversational AI with strong reasoning capabilities.'
    },
    { 
      value: 'phi4-mini-reasoning:latest', 
      label: 'Phi4 Mini (3.8B)',
      avatar: '🧠',
      character: 'Scholar',
      downloadDate: '2024-01-20',
      conversations: 45,
      accuracy: 88,
      strengths: ['Reasoning', 'Analysis', 'Problem solving'],
      weaknesses: ['Limited creativity', 'Formal tone'],
      trainingData: '2.1TB',
      description: 'Specialized in logical reasoning and analytical thinking.'
    },
    { 
      value: 'deepseek-coder:1.3b', 
      label: 'DeepSeek Coder (1B)',
      avatar: '💻',
      character: 'Coder',
      downloadDate: '2024-01-25',
      conversations: 32,
      accuracy: 90,
      strengths: ['Code generation', 'Debugging', 'Technical accuracy'],
      weaknesses: ['Narrow focus', 'Non-coding tasks'],
      trainingData: '800GB',
      description: 'A specialized coding assistant with deep programming knowledge.'
    },
  ]

  const [showModelCard, setShowModelCard] = useState<string | null>(null)
  const [isCreatingChat, setIsCreatingChat] = useState(false)

  // Get current model data
  const currentModel = models.find(m => m.value === selectedModel) || models[0]

  const getThemeIcon = () => {
    switch (theme) {
      case 'light': return <Sun size={16} />
      case 'dark': return <Moon size={16} />
      default: return <Monitor size={16} />
    }
  }

  const newChat = async () => {
    setIsCreatingChat(true)
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500))
    console.log('Creating new chat...')
    setIsCreatingChat(false)
  }

  const editChat = (id: string) => {
    // Handle chat editing
    console.log('Editing chat:', id)
  }

  const deleteChat = (id: string) => {
    // Handle chat deletion
    console.log('Deleting chat:', id)
  }

  return (
    <div className="flex flex-col h-full bg-surface-gradient border-r border-grey-medium">
      {/* Header with Logo */}
      <div className="flex items-center justify-between p-4 border-b border-grey-medium flex-shrink-0 bg-gradient-to-r from-white/5 to-transparent">
        <div className="flex items-center gap-3 group">
          <div className="relative">
            <img 
              src="../../../build/icon.png" 
              alt="PelicanOS" 
              className="w-8 h-8 rounded-lg transition-transform duration-300 group-hover:scale-110 shadow-lg"
              onError={(e) => {
                const target = e.currentTarget as HTMLImageElement;
                target.style.display = 'none';
              }}
            />
            <div className="absolute -inset-1 bg-gradient-to-r from-accent-blue to-accent-blue-hover rounded-lg opacity-0 group-hover:opacity-20 transition-opacity duration-300 blur-sm" />
          </div>
          <h2 className="text-lg font-bold bg-gradient-to-r from-accent-blue via-accent-blue-hover to-accent-blue bg-clip-text text-transparent tracking-wide">
            PelicanOS
          </h2>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggle}
            className="h-8 w-8 p-0 glass-button hover:bg-accent-blue-muted/50 transition-all duration-200"
            title={isOpen ? "Close sidebar" : "Open sidebar"}
          >
            {isOpen ? (
              <CaretLeft size={16} className="text-accent-blue-hover transition-transform duration-200" />
            ) : (
              <CaretRight size={16} className="text-accent-blue-hover transition-transform duration-200" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0 lg:hidden glass-button hover:bg-red-100 transition-all duration-200"
            title="Close sidebar"
          >
            <X size={14} className="text-red-500" />
          </Button>
        </div>
      </div>

      {/* Scrollable Content Area */}
      <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          <div className="p-4 space-y-6">

            {/* New Chat Button - Made Smaller */}
            <div className="flex justify-center">
              <Button
                onClick={newChat}
                disabled={isCreatingChat}
                className={cn(
                  "h-8 w-8 p-0 rounded-lg bg-accent-gradient text-primary-foreground hover:bg-accent-blue-hover transition-all duration-300 hover-lift shadow-lg",
                  isCreatingChat && "scale-95 opacity-75"
                )}
                title="Start New Conversation"
              >
                {isCreatingChat ? (
                  <div className="animate-spin">
                    <Circle size={14} className="text-primary-foreground opacity-50" />
                  </div>
                ) : (
                  <Plus size={14} className="text-primary-foreground" />
                )}
              </Button>
              {!isCreatingChat && (
                <div className="absolute -inset-1 bg-gradient-to-r from-accent-blue to-accent-blue-hover rounded-lg opacity-0 hover:opacity-30 transition-opacity duration-300 blur-sm pointer-events-none" />
              )}
            </div>

            {/* AI Models Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Sparkle size={16} className="text-accent-blue-hover" />
                  AI Models
                </label>
                <span className="text-xs text-grey-dark bg-accent-blue-muted/20 px-2 py-1 rounded-full">
                  {models.length} available
                </span>
              </div>
              
              {/* Featured Models Grid */}
              <div className="grid grid-cols-1 gap-2">
                {models.slice(0, 3).map((model) => (
                  <div
                    key={model.value}
                    role="button"
                    tabIndex={0}
                    className={cn(
                      "group flex items-center gap-3 p-3 rounded-xl glass-card cursor-pointer transition-all duration-300 glass-shimmer relative overflow-hidden",
                      selectedModel === model.value 
                        ? "bg-accent-blue-muted border-accent-blue shadow-lg ring-2 ring-accent-blue/20" 
                        : "hover:bg-accent-blue-muted/50 hover:shadow-md hover:scale-[1.02]"
                    )}
                    onClick={() => onModelChange(model.value)}
                    onKeyDown={(e) => e.key === 'Enter' && onModelChange(model.value)}
                  >
                    {/* Selection Indicator */}
                    {selectedModel === model.value && (
                      <div className="absolute inset-0 bg-gradient-to-r from-accent-blue/10 to-transparent pointer-events-none" />
                    )}
                    
                    {/* Model Avatar */}
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center text-lg transition-all duration-300 shadow-md",
                      selectedModel === model.value
                        ? "bg-gradient-to-br from-accent-blue to-accent-blue-hover scale-110"
                        : "bg-gradient-to-br from-accent-blue/80 to-accent-blue-hover/80 group-hover:scale-105"
                    )}>
                      <span className="filter drop-shadow-sm">{model.avatar}</span>
                    </div>
                    
                    {/* Model Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          "text-sm font-medium truncate transition-colors duration-300",
                          selectedModel === model.value ? "text-accent-blue font-semibold" : "text-foreground"
                        )}>
                          {model.label}
                        </span>
                        {selectedModel === model.value && (
                          <div className="w-2 h-2 bg-accent-blue rounded-full animate-pulse" />
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-grey-dark">
                        <span>{model.conversations} chats</span>
                        <span>•</span>
                        <span>{model.accuracy}% acc</span>
                      </div>
                    </div>
                    
                    {/* Model Actions */}
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          setShowModelCard(model.value)
                        }}
                        className="h-7 w-7 p-0 glass-button hover:bg-accent-blue-muted"
                        title="Model Details"
                      >
                        <Info size={14} className="text-accent-blue-hover" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Model Selector Dropdown */}
              <div className="relative">
                <Select value={selectedModel} onValueChange={onModelChange}>
                  <SelectTrigger className="w-full h-11 rounded-xl glass-card text-foreground border-grey-medium hover:bg-accent-blue-muted/30 transition-all duration-300 focus:ring-2 focus:ring-accent-blue/20">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{currentModel.avatar}</span>
                      <SelectValue placeholder="Select model..." />
                    </div>
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border border-grey-medium bg-background/95 backdrop-blur-md text-foreground shadow-xl">
                    {models.map((model) => (
                      <SelectItem
                        key={model.value}
                        value={model.value}
                        className="rounded-lg hover:bg-accent-blue-muted transition-colors duration-200 text-foreground focus:bg-accent-blue-muted"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-lg">{model.avatar}</span>
                          <div className="flex flex-col">
                            <span className="font-medium">{model.label}</span>
                            <span className="text-xs text-grey-dark">{model.conversations} conversations</span>
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Chat Sessions */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <ChatCircle size={16} className="text-accent-blue-hover" />
                  Recent Conversations
                </label>
                <span className="text-xs text-grey-dark bg-accent-blue-muted/20 px-2 py-1 rounded-full">
                  {chatSessions.length}
                </span>
              </div>
              <div className="space-y-2">
                {chatSessions.map((session, index) => (
                  <div
                    key={session.id}
                    className="group relative flex items-center gap-3 p-3 rounded-xl glass-card hover:bg-accent-blue-muted/50 cursor-pointer transition-all duration-300 hover:shadow-md hover:scale-[1.01]"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    {/* Chat Icon */}
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent-blue/20 to-accent-blue-hover/20 flex items-center justify-center flex-shrink-0 transition-transform duration-300 group-hover:scale-110">
                      <ChatCircle size={16} className="text-accent-blue-hover" weight="duotone" />
                    </div>
                    
                    {/* Chat Info */}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold truncate text-foreground group-hover:text-accent-blue transition-colors duration-300">
                        {session.title}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-grey-dark">
                        <span>{session.messageCount} messages</span>
                        <span>•</span>
                        <span>{session.timestamp.toLocaleDateString()}</span>
                      </div>
                    </div>
                    
                    {/* Action Buttons */}
                    <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity duration-300">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          editChat(session.id)
                        }}
                        className="h-7 w-7 p-0 glass-button hover:bg-accent-blue-muted"
                        title="Edit chat"
                      >
                        <PencilSimple size={12} className="text-accent-blue-hover" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          deleteChat(session.id)
                        }}
                        className="h-7 w-7 p-0 glass-button hover:bg-red-100"
                        title="Delete chat"
                      >
                        <Trash size={12} className="text-red-500" />
                      </Button>
                    </div>

                    {/* Hover Effect */}
                    <div className="absolute inset-0 bg-gradient-to-r from-accent-blue/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl pointer-events-none" />
                  </div>
                ))}
              </div>
            </div>

          </div>
        </ScrollArea>
      </div>

      {/* Footer */}
      <div className={cn(
        "p-6 border-t backdrop-blur space-y-4",
        theme === "dark"
          ? "bg-[#FAFAFA] border-white/10"
          : "bg-[#FAFAFA] border-black/10"
      )}>
        {/* Theme Toggle - Dark Grey Background */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-[#434343]">Theme</span>
          <div className="flex items-center gap-1 rounded-2xl p-1.5 shadow-sm bg-[#D1D5DB] border border-[#E5E7EB]">
            {(['light', 'dark', 'system'] as const).map((t) => (
              <Button
                key={t}
                variant="ghost"
                size="sm"
                onClick={() => onThemeChange(t)}
                className={cn(
                  "h-8 w-8 p-0 rounded-xl transition-all duration-200 relative",
                  theme === t
                    ? "bg-accent-blue text-primary-foreground shadow-sm"
                    : "glass-button hover:bg-[#E5E7EB] bg-[#D1D5DB] border-0"
                )}
                title={`${t.charAt(0).toUpperCase() + t.slice(1)} theme`}
              >
                {t === 'light' && <Sun size={14} className={theme === t ? "text-primary-foreground" : "text-[#6B7280]"} weight={theme === t ? "fill" : "regular"} />}
                {t === 'dark' && <Moon size={14} className={theme === t ? "text-primary-foreground" : "text-[#6B7280]"} weight={theme === t ? "fill" : "regular"} />}
                {t === 'system' && <Monitor size={14} className={theme === t ? "text-primary-foreground" : "text-[#6B7280]"} weight={theme === t ? "fill" : "regular"} />}
              </Button>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2">
          <div className="flex gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={onOpenSettings}
              className="flex-1 justify-start gap-2 h-10 glass-button hover:bg-accent-blue-muted text-foreground"
            >
              Settings
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onOpenDeveloper}
              className="flex-1 justify-start gap-2 h-10 glass-button hover:bg-accent-blue-muted text-foreground"
            >
              Developer
            </Button>
          </div>
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
