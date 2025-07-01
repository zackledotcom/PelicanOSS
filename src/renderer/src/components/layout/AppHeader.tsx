import React from 'react'
import { 
  Sidebar,
  Cpu,
  Activity,
  Clock,
  ChatCircle,
  Gear,
  Bug,
  Database,
  Users,
  Brain,
  Sparkle,
  ChevronDown
} from 'phosphor-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import NumberTicker from '@/components/ui/number-ticker'
import TextShimmer from '@/components/ui/text-shimmer'
import ModelAvatar from '@/components/ui/model-avatar'
import { cn } from '@/lib/utils'
import { useAllServices } from '@/hooks/useServices'

interface AppHeaderProps {
  selectedModel: string
  onModelChange: (model: string) => void
  onToggleSidebar: () => void
  sidebarOpen: boolean
  onOpenSettings: () => void
  onOpenDeveloper: () => void
  onOpenSystemStatus: () => void
  onOpenAgentManager: () => void
  messageCount: number
  responseTime: number
  className?: string
}

const AppHeader: React.FC<AppHeaderProps> = ({
  selectedModel,
  onModelChange,
  onToggleSidebar,
  sidebarOpen,
  onOpenSettings,
  onOpenDeveloper,
  onOpenSystemStatus,
  onOpenAgentManager,
  messageCount = 0,
  responseTime = 0,
  className
}) => {
  const services = useAllServices()
  const availableModels = services.ollama.models || []

  const models = availableModels.map((modelName: string) => ({
    value: modelName,
    label: modelName
      .replace(':latest', '')
      .replace('tinydolphin', 'TinyDolphin')
      .replace('openchat', 'OpenChat')
      .replace('phi4-mini-reasoning', 'Phi4 Mini')
      .replace('deepseek-coder', 'DeepSeek Coder'),
    size: modelName.includes('1b') ? '1B' : 
          modelName.includes('3b') ? '3B' :
          modelName.includes('7b') ? '7B' : 
          modelName.includes('13b') ? '13B' : 'Small'
  }))

  const currentModel = models.find(m => m.value === selectedModel) || models[0]

  const getModelIcon = (modelName: string) => {
    // This function is now deprecated - replaced by ModelAvatar component
    return null
  }

  const getStatusColor = () => {
    if (services.ollama.isConnected && services.chroma.isConnected) return 'text-green-500'
    if (services.ollama.isConnected || services.chroma.isConnected) return 'text-yellow-500'
    return 'text-red-500'
  }

  return (
    <header className={cn(
      "w-full h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4 shadow-sm",
      "fixed top-0 left-0 right-0 z-40",
      className
    )}>
      {/* Left Section - Logo & Sidebar Toggle */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleSidebar}
          className="h-8 w-8 p-0 hover:bg-gray-100"
        >
          <Sidebar size={18} className={cn(
            "transition-colors duration-200",
            sidebarOpen ? "text-blue-600" : "text-gray-600"
          )} />
        </Button>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">P</span>
            </div>
            <div>
              <h1 className="font-bold text-gray-900 text-lg">PelicanOS</h1>
            </div>
          </div>

          <div className="h-6 w-px bg-gray-300" />

          {/* Model Selector */}
          <div className="flex items-center gap-3">
            <Select value={selectedModel} onValueChange={onModelChange}>
              <SelectTrigger className="w-48 h-8 border-gray-200 hover:border-gray-300 transition-colors">
                <div className="flex items-center gap-2 flex-1">
                  {ModelAvatar ? (
                    <ModelAvatar modelName={selectedModel} size="sm" />
                  ) : (
                    <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-xs font-semibold">
                      AI
                    </div>
                  )}
                  <div className="flex flex-col items-start">
                    <SelectValue>
                      {currentModel ? (
                        <div className="flex items-center gap-2">
                          <TextShimmer className="text-sm font-medium">
                            {currentModel.label}
                          </TextShimmer>
                          <Badge variant="secondary" className="text-xs h-4">
                            {currentModel.size}
                          </Badge>
                        </div>
                      ) : (
                        'Select Model'
                      )}
                    </SelectValue>
                  </div>
                </div>
              </SelectTrigger>
              <SelectContent>
                {models.map((model) => (
                  <SelectItem key={model.value} value={model.value}>
                    <div className="flex items-center gap-3">
                      {ModelAvatar ? (
                        <ModelAvatar modelName={model.value} size="sm" />
                      ) : (
                        <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-xs font-semibold">
                          AI
                        </div>
                      )}
                      <div className="flex flex-col">
                        <span className="font-medium">{model.label}</span>
                        <span className="text-xs text-gray-500">{model.size} parameters</span>
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Status Indicator */}
            <div className="flex items-center gap-1">
              <div className={cn("w-2 h-2 rounded-full", {
                "bg-green-500": services.ollama.isConnected && services.chroma.isConnected,
                "bg-yellow-500": services.ollama.isConnected || services.chroma.isConnected,
                "bg-red-500": !services.ollama.isConnected && !services.chroma.isConnected
              })} />
              <span className={cn("text-xs font-medium", getStatusColor())}>
                {services.ollama.isConnected && services.chroma.isConnected ? 'Online' :
                 services.ollama.isConnected || services.chroma.isConnected ? 'Partial' : 'Offline'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Right Section - Stats & Actions */}
      <div className="flex items-center gap-4">
        {/* Live Stats */}
        <div className="flex items-center gap-4 text-sm text-gray-600">
          <div className="flex items-center gap-1">
            <ChatCircle size={14} />
            <NumberTicker value={messageCount} className="font-mono" />
            <span>messages</span>
          </div>
          
          <div className="flex items-center gap-1">
            <Clock size={14} />
            <NumberTicker value={responseTime} className="font-mono" />
            <span>ms</span>
          </div>

          <div className="flex items-center gap-1">
            <Activity size={14} className={getStatusColor()} />
            <span className={getStatusColor()}>
              {services.ollama.isConnected ? 'Ready' : 'Disconnected'}
            </span>
          </div>
        </div>

        <div className="h-6 w-px bg-gray-300" />

        {/* Action Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 hover:bg-gray-100"
            >
              <Gear size={16} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={onOpenSettings}>
              <Gear size={14} className="mr-2" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onOpenSystemStatus}>
              <Activity size={14} className="mr-2" />
              System Status
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onOpenAgentManager}>
              <Users size={14} className="mr-2" />
              Agent Manager
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onOpenDeveloper}>
              <Bug size={14} className="mr-2" />
              Developer Tools
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}

export default AppHeader