import React, { useState } from 'react'
import { 
  X, 
  Terminal, 
  Database, 
  Activity, 
  Code, 
  Bug,
  FileText,
  ArrowsClockwise
} from 'phosphor-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Switch } from '@/components/ui/switch'

interface DeveloperModalProps {
  isOpen: boolean
  onClose: () => void
}

const DeveloperModal: React.FC<DeveloperModalProps> = ({ isOpen, onClose }) => {
  const [ollamaStatus, setOllamaStatus] = useState<'connected' | 'disconnected' | 'loading'>('connected')
  const [chromaStatus, setChromaStatus] = useState<'connected' | 'disconnected' | 'loading'>('disconnected')
  const [debugMode, setDebugMode] = useState(false)
  const [logs, setLogs] = useState([
    { level: 'info', message: 'Application started', timestamp: new Date() },
    { level: 'success', message: 'Ollama service connected', timestamp: new Date() },
    { level: 'warning', message: 'ChromaDB connection failed', timestamp: new Date() },
  ])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected': return 'bg-green-500'
      case 'disconnected': return 'bg-red-500'
      case 'loading': return 'bg-yellow-500'
      default: return 'bg-gray-500'
    }
  }

  const getLogColor = (level: string) => {
    switch (level) {
      case 'error': return 'text-red-600'
      case 'warning': return 'text-yellow-600'
      case 'success': return 'text-green-600'
      default: return 'text-blue-600'
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Code size={20} />
            Developer Mode
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="services" className="flex-1 overflow-hidden">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="services">Services</TabsTrigger>
            <TabsTrigger value="logs">Logs</TabsTrigger>
            <TabsTrigger value="memory">Memory</TabsTrigger>
            <TabsTrigger value="debug">Debug</TabsTrigger>
          </TabsList>

          <TabsContent value="services" className="flex-1 overflow-hidden">
            <ScrollArea className="h-full">
              <div className="space-y-4">
                {/* Ollama Service */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Terminal size={20} />
                        Ollama Service
                      </div>
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${getStatusColor(ollamaStatus)}`} />
                        <Badge variant={ollamaStatus === 'connected' ? 'default' : 'destructive'}>
                          {ollamaStatus}
                        </Badge>
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">URL:</span>
                        <div className="font-mono">http://localhost:11434</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Models:</span>
                        <div>4 available</div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline">
                        <ArrowsClockwise size={14} className="mr-1" />
                        Check Status
                      </Button>
                      <Button size="sm" variant="outline">
                        Start Service
                      </Button>
                      <Button size="sm" variant="outline">
                        View Models
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* ChromaDB Service */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Database size={20} />
                        ChromaDB Service
                      </div>
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${getStatusColor(chromaStatus)}`} />
                        <Badge variant={chromaStatus === 'connected' ? 'default' : 'destructive'}>
                          {chromaStatus}
                        </Badge>
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">URL:</span>
                        <div className="font-mono">http://localhost:8000</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Collections:</span>
                        <div>1 active</div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline">
                        <ArrowsClockwise size={14} className="mr-1" />
                        Check Status
                      </Button>
                      <Button size="sm" variant="outline">
                        Start Service
                      </Button>
                      <Button size="sm" variant="outline">
                        View Collections
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="logs" className="flex-1 overflow-hidden">
            <ScrollArea className="h-full">
              <div className="space-y-2">
                {logs.map((log, index) => (
                  <div key={index} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                    <Badge variant="outline" className={getLogColor(log.level)}>
                      {log.level}
                    </Badge>
                    <div className="flex-1">
                      <div className="text-sm">{log.message}</div>
                      <div className="text-xs text-muted-foreground">
                        {log.timestamp.toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="memory" className="flex-1 overflow-hidden">
            <ScrollArea className="h-full">
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Activity size={20} />
                      Memory Usage
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-sm text-muted-foreground">Conversations</div>
                        <div className="text-2xl font-semibold">12</div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">Summaries</div>
                        <div className="text-2xl font-semibold">3</div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Memory Store Size</span>
                        <span>2.4 MB</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Last Updated</span>
                        <span>2 minutes ago</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline">
                        Clear Memory
                      </Button>
                      <Button size="sm" variant="outline">
                        Export Data
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="debug" className="flex-1 overflow-hidden">
            <ScrollArea className="h-full">
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Bug size={20} />
                      Debug Settings
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">Debug Mode</div>
                        <div className="text-sm text-muted-foreground">
                          Show detailed logs and development info
                        </div>
                      </div>
                      <Switch
                        checked={debugMode}
                        onCheckedChange={setDebugMode}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">Verbose Logging</div>
                        <div className="text-sm text-muted-foreground">
                          Include all system messages in logs
                        </div>
                      </div>
                      <Switch />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">Performance Metrics</div>
                        <div className="text-sm text-muted-foreground">
                          Track response times and resource usage
                        </div>
                      </div>
                      <Switch />
                    </div>

                    <div className="pt-4 border-t space-y-2">
                      <Button size="sm" variant="outline" className="w-full">
                        <FileText size={14} className="mr-1" />
                        Export Debug Report
                      </Button>
                      <Button size="sm" variant="outline" className="w-full">
                        Open DevTools
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}

export default DeveloperModal