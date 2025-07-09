import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Switch } from '../ui/switch'
import { Badge } from '../ui/badge'
import { ScrollArea } from '../ui/scroll-area'
import {
  Robot,
  ChatCircle,
  Gear,
  Play,
  Square,
  ArrowsClockwise,
  PaperPlaneTilt,
  Activity,
  Warning
} from 'phosphor-react'
import { useRedditService } from '../../hooks/useAdditionalServices'

export const RedditBotPanel: React.FC = () => {
  const [credentials, setCredentials] = useState({
    clientId: '',
    clientSecret: '',
    refreshToken: '',
    userAgent: 'PelicanOS:v1.0.0 (by /u/your_username)'
  })

  // Use centralized Reddit service
  const {
    status,
    config,
    stats,
    loading,
    authenticated,
    authenticate,
    startAgent,
    stopAgent,
    updateConfig,
    disconnect
  } = useRedditService()
  const [stats, setStats] = useState<any>(null)

  const loadStatus = async () => {
    try {
      const status = await window.api.redditGetStatus()
      setConnected(status.connected)
      setAgentRunning(status.agentRunning)

      if (status.connected) {
        const [configData, statsData] = await Promise.all([
          window.api.redditAgentGetConfig(),
          window.api.redditAgentGetStats()
        ])
        setConfig(configData)
        setStats(statsData)
      }
    } catch (error) {
      console.error('Failed to load Reddit status:', error)
    }
  }

  useEffect(() => {
    loadStatus()
    const interval = setInterval(loadStatus, 10000)
    return () => clearInterval(interval)
  }, [])

  const handleAuthenticate = async () => {
    setLoading(true)
    try {
      const result = await window.api.redditAuthenticate(credentials)
      if (result.success) {
        await loadStatus()
        alert('Successfully connected to Reddit!')
      } else {
        alert('Authentication failed. Please check your credentials.')
      }
    } catch (error) {
      alert(`Authentication error: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleAgentToggle = async () => {
    setLoading(true)
    try {
      if (agentRunning) {
        await window.api.redditAgentStop()
      } else {
        const result = await window.api.redditAgentStart()
        if (!result.success) {
          alert('Failed to start Reddit agent.')
          return
        }
      }
      await loadStatus()
    } catch (error) {
      alert(`Agent toggle error: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Robot className="h-5 w-5" />
              Reddit DM Bot
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant={connected ? 'default' : 'secondary'}>
                {connected ? 'Connected' : 'Disconnected'}
              </Badge>
              {agentRunning && (
                <Badge variant="default" className="bg-green-600">
                  <Activity className="h-3 w-3 mr-1" />
                  Running
                </Badge>
              )}
              <Button variant="ghost" size="sm" onClick={loadStatus} disabled={loading}>
                <ArrowsClockwise className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {!connected ? (
            <div className="space-y-4">
              <Input
                value={credentials.clientId}
                onChange={(e) => setCredentials({ ...credentials, clientId: e.target.value })}
                placeholder="Reddit Client ID"
              />
              <Input
                type="password"
                value={credentials.clientSecret}
                onChange={(e) => setCredentials({ ...credentials, clientSecret: e.target.value })}
                placeholder="Reddit Client Secret"
              />
              <Input
                type="password"
                value={credentials.refreshToken}
                onChange={(e) => setCredentials({ ...credentials, refreshToken: e.target.value })}
                placeholder="Reddit Refresh Token"
              />
              <Button onClick={handleAuthenticate} disabled={loading} className="w-full">
                Connect to Reddit
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Auto-Reply Agent</h4>
                  <p className="text-sm text-muted-foreground">Automatically respond to DMs</p>
                </div>
                <Button
                  onClick={handleAgentToggle}
                  disabled={loading}
                  variant={agentRunning ? 'destructive' : 'default'}
                >
                  {agentRunning ? (
                    <Square className="h-4 w-4 mr-2" />
                  ) : (
                    <Play className="h-4 w-4 mr-2" />
                  )}
                  {agentRunning ? 'Stop' : 'Start'}
                </Button>
              </div>

              {stats && (
                <div className="grid grid-cols-4 gap-4 mt-4">
                  <div className="text-center p-3 bg-blue-50 dark:bg-blue-950 rounded">
                    <ChatCircle className="h-5 w-5 mx-auto mb-1 text-blue-600" />
                    <div className="text-xs text-muted-foreground">Processed</div>
                    <div className="font-semibold">{stats.totalDMsProcessed}</div>
                  </div>

                  <div className="text-center p-3 bg-green-50 dark:bg-green-950 rounded">
                    <PaperPlaneTilt className="h-5 w-5 mx-auto mb-1 text-green-600" />
                    <div className="text-xs text-muted-foreground">Sent</div>
                    <div className="font-semibold">{stats.totalRepliesSent}</div>
                  </div>

                  <div className="text-center p-3 bg-purple-50 dark:bg-purple-950 rounded">
                    <Activity className="h-5 w-5 mx-auto mb-1 text-purple-600" />
                    <div className="text-xs text-muted-foreground">Running</div>
                    <div className="font-semibold">{stats.currentlyRunning ? 'Yes' : 'No'}</div>
                  </div>

                  <div className="text-center p-3 bg-red-50 dark:bg-red-950 rounded">
                    <Warning className="h-5 w-5 mx-auto mb-1 text-red-600" />
                    <div className="text-xs text-muted-foreground">Errors</div>
                    <div className="font-semibold">{stats.errors?.length || 0}</div>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
