import React from 'react'
import { 
  Circle, 
  CheckCircle, 
  WarningCircle, 
  CircleNotch,
  Activity,
  Server
} from 'phosphor-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

type OllamaStatus = 'connected' | 'disconnected' | 'loading' | 'error' | 'starting'

interface OllamaStatusProps {
  status: OllamaStatus
  version?: string
  modelsLoaded?: number
  totalModels?: number
  lastHeartbeat?: Date
  onRetry?: () => void
  className?: string
}

export default function OllamaStatusIndicator({
  status,
  version,
  modelsLoaded = 0,
  totalModels = 0,
  lastHeartbeat,
  onRetry,
  className
}: OllamaStatusProps) {
  const getStatusConfig = (status: OllamaStatus) => {
    switch (status) {
      case 'connected':
        return {
          icon: <CheckCircle className="w-4 h-4" />,
          color: 'text-green-500',
          bg: 'bg-green-500/10',
          border: 'border-green-500/20',
          label: 'Connected',
          pulse: false
        }
      case 'loading':
        return {
          icon: <CircleNotch className="w-4 h-4 animate-spin" />,
          color: 'text-blue-500',
          bg: 'bg-blue-500/10',
          border: 'border-blue-500/20',
          label: 'Loading',
          pulse: true
        }
      case 'starting':
        return {
          icon: <Activity className="w-4 h-4" />,
          color: 'text-yellow-500',
          bg: 'bg-yellow-500/10',
          border: 'border-yellow-500/20',
          label: 'Starting',
          pulse: true
        }
      case 'error':
        return {
          icon: <WarningCircle className="w-4 h-4" />,
          color: 'text-red-500',
          bg: 'bg-red-500/10',
          border: 'border-red-500/20',
          label: 'Error',
          pulse: false
        }
      case 'disconnected':
      default:
        return {
          icon: <Circle className="w-4 h-4" />,
          color: 'text-gray-500',
          bg: 'bg-gray-500/10',
          border: 'border-gray-500/20',
          label: 'Disconnected',
          pulse: false
        }
    }
  }

  const config = getStatusConfig(status)

  return (
    <Card className={cn(
      "w-fit transition-all duration-200",
      config.bg,
      config.border,
      config.pulse && "animate-pulse",
      className
    )}>
      <CardContent className="p-3">
        <div className="flex items-center gap-3">
          {/* Status icon */}
          <div className={cn("flex items-center", config.color)}>
            {config.icon}
          </div>

          {/* Status info */}
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Server className="w-3 h-3 text-muted-foreground" />
              <span className="text-sm font-medium">Ollama</span>
              <Badge 
                variant={status === 'connected' ? 'default' : 'secondary'}
                className="text-xs"
              >
                {config.label}
              </Badge>
            </div>
            
            {/* Additional info */}
            <div className="text-xs text-muted-foreground space-y-0.5">
              {version && (
                <div>Version: {version}</div>
              )}
              
              {status === 'connected' && (
                <div>
                  Models: {modelsLoaded}/{totalModels} loaded
                </div>
              )}
              
              {lastHeartbeat && status === 'connected' && (
                <div>
                  Last ping: {new Date().getTime() - lastHeartbeat.getTime() < 5000 ? 'now' : 'stale'}
                </div>
              )}
              
              {status === 'error' && onRetry && (
                <button 
                  onClick={onRetry}
                  className="text-blue-500 hover:text-blue-400 underline cursor-pointer"
                >
                  Retry connection
                </button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}