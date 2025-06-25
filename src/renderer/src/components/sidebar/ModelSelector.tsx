import React from 'react'
import { 
  Brain, 
  CaretDown, 
  Cpu, 
  Lightning, 
  Warning,
  CheckCircle
} from 'phosphor-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'

interface Model {
  id: string
  name: string
  size: string
  type: 'local' | 'remote'
  status: 'available' | 'loading' | 'error' | 'updating'
  performance: 'fast' | 'balanced' | 'quality'
}

interface ModelSelectorProps {
  currentModel: string
  models: Model[]
  onModelChange: (modelId: string) => void
  onRefresh: () => void
  fallbackModel?: string
  multiModelEnabled?: boolean
  onToggleMultiModel?: () => void
  className?: string
}

export default function ModelSelector({
  currentModel,
  models,
  onModelChange,
  onRefresh,
  fallbackModel,
  multiModelEnabled = false,
  onToggleMultiModel,
  className
}: ModelSelectorProps) {
  const activeModel = models.find(m => m.id === currentModel)
  
  const getStatusIcon = (status: Model['status']) => {
    switch (status) {
      case 'available': return <CheckCircle className="w-3 h-3 text-green-500" />
      case 'loading': return <div className="w-3 h-3 border border-blue-500 border-t-transparent rounded-full animate-spin" />
      case 'error': return <Warning className="w-3 h-3 text-red-500" />
      case 'updating': return <div className="w-3 h-3 border border-yellow-500 border-t-transparent rounded-full animate-spin" />
    }
  }

  const getPerformanceIcon = (performance: Model['performance']) => {
    switch (performance) {
      case 'fast': return <Lightning className="w-3 h-3" />
      case 'balanced': return <Cpu className="w-3 h-3" />
      case 'quality': return <Brain className="w-3 h-3" />
    }
  }

  const getPerformanceColor = (performance: Model['performance']) => {
    switch (performance) {
      case 'fast': return 'text-yellow-500'
      case 'balanced': return 'text-blue-500'
      case 'quality': return 'text-purple-500'
    }
  }

  return (
    <Card className={cn("w-80", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Brain className="w-4 h-4" />
            Model Selector
          </CardTitle>
          <div className="flex gap-1">
            {onToggleMultiModel && (
              <Button
                size="sm"
                variant={multiModelEnabled ? "default" : "outline"}
                onClick={onToggleMultiModel}
                className="h-6 px-2 text-xs"
              >
                Multi
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              onClick={onRefresh}
              className="h-6 w-6 p-0"
            >
              <Brain className="w-3 h-3" />
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Current model display */}
        {activeModel && (
          <div className="p-3 rounded-md bg-muted/50">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className={cn("flex items-center", getPerformanceColor(activeModel.performance))}>
                  {getPerformanceIcon(activeModel.performance)}
                </div>
                <span className="font-medium text-sm">{activeModel.name}</span>
              </div>
              {getStatusIcon(activeModel.status)}
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Badge variant="outline" className="text-xs">
                {activeModel.size}
              </Badge>
              <Badge variant={activeModel.type === 'local' ? 'default' : 'secondary'} className="text-xs">
                {activeModel.type}
              </Badge>
              <Badge variant="outline" className="text-xs capitalize">
                {activeModel.performance}
              </Badge>
            </div>
          </div>
        )}

        {/* Model selector */}
        <div className="space-y-2">
          <Select value={currentModel} onValueChange={onModelChange}>
            <SelectTrigger>
              <SelectValue placeholder="Select model" />
            </SelectTrigger>
            <SelectContent>
              {models.map((model) => (
                <SelectItem key={model.id} value={model.id} disabled={model.status === 'error'}>
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-2">
                      <div className={cn("flex items-center", getPerformanceColor(model.performance))}>
                        {getPerformanceIcon(model.performance)}
                      </div>
                      <div>
                        <div className="font-medium">{model.name}</div>
                        <div className="text-xs text-muted-foreground">{model.size} • {model.type}</div>
                      </div>
                    </div>
                    {getStatusIcon(model.status)}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Fallback model */}
        {fallbackModel && (
          <div className="text-xs text-muted-foreground">
            Fallback: {models.find(m => m.id === fallbackModel)?.name || fallbackModel}
          </div>
        )}

        {/* Multi-model routing info */}
        {multiModelEnabled && (
          <div className="p-2 rounded-md bg-blue-500/10 border border-blue-500/20">
            <p className="text-xs text-blue-600">
              Multi-model routing enabled. Requests will be distributed across available models.
            </p>
          </div>
        )}

        {/* Quick stats */}
        <div className="grid grid-cols-3 gap-2 pt-2 border-t text-center">
          <div>
            <p className="text-sm font-semibold">{models.filter(m => m.status === 'available').length}</p>
            <p className="text-xs text-muted-foreground">Available</p>
          </div>
          <div>
            <p className="text-sm font-semibold">{models.filter(m => m.type === 'local').length}</p>
            <p className="text-xs text-muted-foreground">Local</p>
          </div>
          <div>
            <p className="text-sm font-semibold">{models.filter(m => m.type === 'remote').length}</p>
            <p className="text-xs text-muted-foreground">Remote</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}