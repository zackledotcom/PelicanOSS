import React, { useState, useEffect } from 'react'
import { Button } from './ui/button'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Badge } from './ui/badge'
import { Switch } from './ui/switch'
import { Separator } from './ui/separator'
import { 
  Brain, 
  Clock, 
  Trash, 
  ArrowsClockwise, 
  Warning, 
  CheckCircle,
  Gear,
  Eye,
  EyeSlash
} from 'phosphor-react'
import type { MemoryStore, MemorySummary } from '../types/chat'
import type { AppSettings } from '../types/settings'

interface AdvancedMemoryPanelProps {
  isOpen: boolean
  onClose: () => void
}

const AdvancedMemoryPanel: React.FC<AdvancedMemoryPanelProps> = ({ isOpen, onClose }) => {
  const [memoryStore, setMemoryStore] = useState<MemoryStore | null>(null)
  const [settings, setSettings] = useState<AppSettings | null>(null)
  const [loading, setLoading] = useState(false)
  const [showDetails, setShowDetails] = useState(false)

  const loadData = async () => {
    setLoading(true)
    try {
      const [memStore, appSettings] = await Promise.all([
        window.api.getMemoryStore(),
        window.api.getSettings()
      ])
      setMemoryStore(memStore)
      setSettings(appSettings)
    } catch (error) {
      console.error('Failed to load memory data:', error)
    }
    setLoading(false)
  }

  const handleToggleMemory = async (enabled: boolean) => {
    if (!settings) return
    
    try {
      const updatedSettings = {
        ...settings,
        memory: {
          ...settings.memory,
          enabled
        }
      }
      
      await window.api.saveSettings(updatedSettings)
      await window.api.updateMemorySettings(enabled)
      setSettings(updatedSettings)
      
      if (memoryStore) {
        setMemoryStore({ ...memoryStore, enabled })
      }
    } catch (error) {
      console.error('Failed to toggle memory:', error)
    }
  }

  const handleClearMemory = async () => {
    if (!confirm('Are you sure you want to clear all memory? This action cannot be undone.')) {
      return
    }
    
    try {
      await window.api.clearMemory()
      await loadData()
    } catch (error) {
      console.error('Failed to clear memory:', error)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString()
  }

  const getMemoryStatus = () => {
    if (!memoryStore) return { status: 'unknown', message: 'Loading...', color: 'gray' }
    
    if (!memoryStore.enabled) {
      return { status: 'disabled', message: 'Memory Disabled', color: 'red' }
    }
    
    const now = new Date()
    const expiresAt = new Date(memoryStore.expiresAt)
    
    if (now > expiresAt) {
      return { status: 'expired', message: 'Memory Expired', color: 'orange' }
    }
    
    if ((memoryStore as any).needsMigration) {
      return { status: 'migration', message: 'Needs Migration', color: 'yellow' }
    }
    
    return { status: 'active', message: 'Active', color: 'green' }
  }

  useEffect(() => {
    if (isOpen) {
      loadData()
    }
  }, [isOpen])

  if (!isOpen) return null

  const memoryStatus = getMemoryStatus()

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-auto bg-white/95 backdrop-blur">
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-3">
            <Brain className="w-6 h-6 text-purple-600" />
            <CardTitle>Advanced Memory Management</CardTitle>
            <Badge variant={memoryStatus.color === 'green' ? 'default' : 'destructive'}>
              {memoryStatus.message}
            </Badge>
          </div>
          <Button variant="ghost" onClick={onClose}>
            ✕
          </Button>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <ArrowsClockwise className="w-6 h-6 animate-spin" />
              <span className="ml-2">Loading memory data...</span>
            </div>
          ) : (
            <>
              {/* Memory Controls */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  Memory Controls
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">Memory System</h4>
                        <p className="text-sm text-gray-600">
                          {settings?.memory.enabled ? 'Collecting and using memories' : 'Memory collection disabled'}
                        </p>
                      </div>
                      <Switch
                        checked={settings?.memory.enabled || false}
                        onCheckedChange={handleToggleMemory}
                      />
                    </div>
                  </Card>
                  
                  <Card className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">Show Details</h4>
                        <p className="text-sm text-gray-600">
                          View detailed memory summaries
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowDetails(!showDetails)}
                      >
                        {showDetails ? <EyeSlash className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </Button>
                    </div>
                  </Card>
                </div>
              </div>

              <Separator />

              {/* Memory Status */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Memory Status
                </h3>
                
                {memoryStore && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card className="p-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-purple-600">
                          {memoryStore.summaries.length}
                        </div>
                        <div className="text-sm text-gray-600">Memory Summaries</div>
                      </div>
                    </Card>
                    
                    <Card className="p-4">
                      <div className="text-center">
                        <div className="text-sm text-gray-600">Last Updated</div>
                        <div className="font-medium">
                          {formatDate(memoryStore.lastUpdated)}
                        </div>
                      </div>
                    </Card>
                    
                    <Card className="p-4">
                      <div className="text-center">
                        <div className="text-sm text-gray-600">Expires</div>
                        <div className="font-medium">
                          {formatDate(memoryStore.expiresAt)}
                        </div>
                      </div>
                    </Card>
                  </div>
                )}
              </div>

              {/* Memory Summaries */}
              {showDetails && memoryStore && memoryStore.summaries.length > 0 && (
                <>
                  <Separator />
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Memory Summaries</h3>
                    <div className="space-y-3 max-h-60 overflow-y-auto">
                      {memoryStore.summaries.slice(-10).reverse().map((summary, index) => (
                        <Card key={summary.id} className="p-4">
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <Badge variant="outline">
                                {summary.messageCount} messages
                              </Badge>
                              <span className="text-xs text-gray-500">
                                {formatDate(summary.createdAt)}
                              </span>
                            </div>
                            <p className="text-sm">{summary.summary}</p>
                            {summary.topics.length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {summary.topics.slice(0, 5).map((topic, idx) => (
                                  <Badge key={idx} variant="secondary" className="text-xs">
                                    {topic}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                        </Card>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* Memory Warnings */}
              {memoryStore && memoryStatus.status !== 'active' && (
                <>
                  <Separator />
                  <Card className="p-4 border-orange-200 bg-orange-50">
                    <div className="flex items-start gap-3">
                      <Warning className="w-5 h-5 text-orange-600 mt-0.5" />
                      <div>
                        <h4 className="font-medium text-orange-800">Memory Status Warning</h4>
                        <p className="text-sm text-orange-700 mt-1">
                          {memoryStatus.status === 'expired' && 
                            'Your memory has expired. Clear it or extend the retention period to continue using memory features.'}
                          {memoryStatus.status === 'migration' && 
                            'Your memory format needs updating. Clear and reinitialize to continue.'}
                          {memoryStatus.status === 'disabled' && 
                            'Memory is currently disabled. Enable it to start collecting conversation context.'}
                        </p>
                      </div>
                    </div>
                  </Card>
                </>
              )}

              {/* Actions */}
              <Separator />
              <div className="flex flex-wrap gap-3">
                <Button onClick={loadData} variant="outline">
                  <ArrowsClockwise className="w-4 h-4 mr-2" />
                  Refresh
                </Button>
                
                <Button 
                  onClick={handleClearMemory} 
                  variant="destructive"
                  disabled={!memoryStore || memoryStore.summaries.length === 0}
                >
                  <Trash className="w-4 h-4 mr-2" />
                  Clear All Memory
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default AdvancedMemoryPanel
