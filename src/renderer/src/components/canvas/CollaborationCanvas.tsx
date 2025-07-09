import React, { useState, useEffect, useRef } from 'react'
import {
  Play,
  Pause,
  Square,
  ArrowsOutCardinal,
  ArrowsInCardinal,
  Gear,
  ChatCircle,
  Robot,
  Brain,
  Lightning,
  Copy,
  Download,
  Trash
} from 'phosphor-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { useToast } from '@/components/ui/toast'

interface AIResponse {
  id: string
  provider: 'claude' | 'gemini'
  content: string
  timestamp: Date
  isStreaming: boolean
  responseTime?: number
}

interface CollaborationSession {
  id: string
  prompt: string
  responses: AIResponse[]
  status: 'idle' | 'running' | 'completed' | 'error'
  startTime: Date
  endTime?: Date
}

interface CollaborationCanvasProps {
  isOpen: boolean
  onClose: () => void
}

const CollaborationCanvas: React.FC<CollaborationCanvasProps> = ({
  isOpen,
  onClose
}) => {
  const { addToast } = useToast()
  
  // Canvas state
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [currentSession, setCurrentSession] = useState<CollaborationSession | null>(null)
  const [prompt, setPrompt] = useState('')
  const [isRunning, setIsRunning] = useState(false)
  const [discussions, setDiscussions] = useState<CollaborationSession[]>([])
  
  // Streaming refs
  const claudeStreamRef = useRef<string>('')
  const geminiStreamRef = useRef<string>('')
  
  const startCollaboration = async () => {
    if (!prompt.trim()) {
      addToast({
        type: 'error',
        title: 'Prompt Required',
        description: 'Please enter a prompt to start the collaboration',
        duration: 3000
      })
      return
    }

    setIsRunning(true)
    
    const newSession: CollaborationSession = {
      id: `session-${Date.now()}`,
      prompt: prompt.trim(),
      responses: [],
      status: 'running',
      startTime: new Date()
    }
    
    setCurrentSession(newSession)
    setDiscussions(prev => [newSession, ...prev])

    try {
      // Initialize streaming responses
      const claudeResponse: AIResponse = {
        id: `claude-${Date.now()}`,
        provider: 'claude',
        content: '',
        timestamp: new Date(),
        isStreaming: true
      }
      
      const geminiResponse: AIResponse = {
        id: `gemini-${Date.now()}`,
        provider: 'gemini',
        content: '',
        timestamp: new Date(),
        isStreaming: true
      }

      // Add initial streaming responses
      newSession.responses = [claudeResponse, geminiResponse]
      setCurrentSession({ ...newSession })

      // Start both AI providers simultaneously
      const [claudeResult, geminiResult] = await Promise.allSettled([
        startClaudeStream(prompt.trim(), claudeResponse.id),
        startGeminiStream(prompt.trim(), geminiResponse.id)
      ])

      // Update session with final results
      const updatedSession = { ...newSession }
      updatedSession.responses = updatedSession.responses.map(response => {
        if (response.provider === 'claude') {
          return {
            ...response,
            content: claudeStreamRef.current,
            isStreaming: false,
            responseTime: Date.now() - response.timestamp.getTime()
          }
        } else {
          return {
            ...response,
            content: geminiStreamRef.current,
            isStreaming: false,
            responseTime: Date.now() - response.timestamp.getTime()
          }
        }
      })
      
      updatedSession.status = 'completed'
      updatedSession.endTime = new Date()
      
      setCurrentSession(updatedSession)
      setDiscussions(prev => prev.map(session => 
        session.id === updatedSession.id ? updatedSession : session
      ))

      addToast({
        type: 'success',
        title: 'Collaboration Complete',
        description: 'Both AI responses have been generated',
        duration: 3000
      })

    } catch (error) {
      console.error('Collaboration error:', error)
      
      if (currentSession) {
        const errorSession = {
          ...currentSession,
          status: 'error' as const,
          endTime: new Date()
        }
        setCurrentSession(errorSession)
        setDiscussions(prev => prev.map(session => 
          session.id === errorSession.id ? errorSession : session
        ))
      }

      addToast({
        type: 'error',
        title: 'Collaboration Failed',
        description: 'An error occurred during the AI collaboration',
        duration: 5000
      })
    } finally {
      setIsRunning(false)
      claudeStreamRef.current = ''
      geminiStreamRef.current = ''
    }
  }

  const startClaudeStream = async (prompt: string, responseId: string): Promise<void> => {
    try {
      // Use Claude Desktop Commander for terminal-like interaction
      const result = await window.api.claudeDcExecuteCommand({
        command: `echo "Analyzing: ${prompt}"`,
        timeout: 30000
      })

      if (result.success) {
        claudeStreamRef.current = result.output || 'Claude response completed'
      } else {
        claudeStreamRef.current = `Claude Error: ${result.error}`
      }
    } catch (error) {
      claudeStreamRef.current = `Claude Error: ${error instanceof Error ? error.message : 'Unknown error'}`
    }
  }

  const startGeminiStream = async (prompt: string, responseId: string): Promise<void> => {
    try {
      // Use Gemini CLI for code analysis
      const result = await window.api.geminiCliChatWithContext({
        message: prompt
      })

      if (result.success) {
        geminiStreamRef.current = result.response || 'Gemini response completed'
      } else {
        geminiStreamRef.current = `Gemini Error: ${result.error}`
      }
    } catch (error) {
      geminiStreamRef.current = `Gemini Error: ${error instanceof Error ? error.message : 'Unknown error'}`
    }
  }

  const stopCollaboration = () => {
    setIsRunning(false)
    if (currentSession) {
      const stoppedSession = {
        ...currentSession,
        status: 'completed' as const,
        endTime: new Date()
      }
      setCurrentSession(stoppedSession)
    }
    
    addToast({
      type: 'info',
      title: 'Collaboration Stopped',
      description: 'AI collaboration has been stopped',
      duration: 2000
    })
  }

  const copyResponse = (content: string, provider: string) => {
    navigator.clipboard.writeText(content)
    addToast({
      type: 'success',
      title: 'Copied',
      description: `${provider} response copied to clipboard`,
      duration: 2000
    })
  }

  const exportSession = (session: CollaborationSession) => {
    const exportData = {
      prompt: session.prompt,
      responses: session.responses,
      timestamp: session.startTime.toISOString(),
      duration: session.endTime 
        ? session.endTime.getTime() - session.startTime.getTime() 
        : null
    }
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `collaboration-${session.id}.json`
    a.click()
    URL.revokeObjectURL(url)

    addToast({
      type: 'success',
      title: 'Export Complete',
      description: 'Collaboration session exported successfully',
      duration: 2000
    })
  }

  const getProviderIcon = (provider: 'claude' | 'gemini') => {
    switch (provider) {
      case 'claude':
        return Brain
      case 'gemini':
        return Lightning
    }
  }

  const getProviderColor = (provider: 'claude' | 'gemini') => {
    switch (provider) {
      case 'claude':
        return 'bg-orange-500'
      case 'gemini':
        return 'bg-purple-500'
    }
  }

  if (!isOpen) return null

  return (
    <div className={cn(
      "fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4",
      isFullscreen && "p-0"
    )}>
      <div className={cn(
        "bg-white rounded-xl shadow-2xl flex flex-col",
        isFullscreen ? "w-full h-full rounded-none" : "w-[95%] h-[90%] max-w-7xl"
      )}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center">
              <ChatCircle size={20} className="text-white" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">AI Collaboration Canvas</h2>
              <p className="text-sm text-gray-500">Multi-AI discussion and comparison</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="h-8 w-8 p-0"
            >
              {isFullscreen ? <ArrowsInCardinal size={16} /> : <ArrowsOutCardinal size={16} />}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0"
            >
              <X size={16} />
            </Button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col p-6">
          {/* Prompt Input */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Collaboration Prompt
            </label>
            <div className="flex gap-3">
              <Textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Enter a prompt for both AIs to respond to..."
                className="flex-1 min-h-[100px] resize-none"
                disabled={isRunning}
              />
              <div className="flex flex-col gap-2">
                <Button
                  onClick={startCollaboration}
                  disabled={isRunning || !prompt.trim()}
                  className="h-12 px-6 bg-blue-600 hover:bg-blue-700"
                >
                  {isRunning ? (
                    <div className="flex items-center gap-2">
                      <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                      <span>Running</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Play size={16} />
                      <span>Start</span>
                    </div>
                  )}
                </Button>
                {isRunning && (
                  <Button
                    onClick={stopCollaboration}
                    variant="outline"
                    className="h-12 px-6"
                  >
                    <Square size={16} />
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Response Canvas */}
          <div className="flex-1 grid grid-cols-2 gap-6">
            {/* Claude Response */}
            <Card className="flex flex-col">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <div className="w-6 h-6 rounded bg-orange-500 flex items-center justify-center">
                    <Brain size={14} className="text-white" />
                  </div>
                  <span>Claude Desktop Commander</span>
                  {currentSession?.responses.find(r => r.provider === 'claude')?.isStreaming && (
                    <Badge variant="secondary" className="animate-pulse">Streaming</Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col">
                <ScrollArea className="flex-1 border rounded-lg p-4 bg-gray-50">
                  <div className="whitespace-pre-wrap font-mono text-sm">
                    {currentSession?.responses.find(r => r.provider === 'claude')?.content || 
                     'Claude response will appear here...'}
                  </div>
                </ScrollArea>
                
                {currentSession?.responses.find(r => r.provider === 'claude') && (
                  <div className="flex items-center justify-between mt-3 pt-3 border-t">
                    <div className="text-xs text-gray-500">
                      {currentSession.responses.find(r => r.provider === 'claude')?.responseTime && (
                        <span>
                          {Math.round(currentSession.responses.find(r => r.provider === 'claude')!.responseTime! / 1000)}s
                        </span>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          const content = currentSession.responses.find(r => r.provider === 'claude')?.content
                          if (content) copyResponse(content, 'Claude')
                        }}
                        className="h-7 w-7 p-0"
                      >
                        <Copy size={12} />
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Gemini Response */}
            <Card className="flex flex-col">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <div className="w-6 h-6 rounded bg-purple-500 flex items-center justify-center">
                    <Lightning size={14} className="text-white" />
                  </div>
                  <span>Gemini CLI</span>
                  {currentSession?.responses.find(r => r.provider === 'gemini')?.isStreaming && (
                    <Badge variant="secondary" className="animate-pulse">Streaming</Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col">
                <ScrollArea className="flex-1 border rounded-lg p-4 bg-gray-50">
                  <div className="whitespace-pre-wrap font-mono text-sm">
                    {currentSession?.responses.find(r => r.provider === 'gemini')?.content || 
                     'Gemini response will appear here...'}
                  </div>
                </ScrollArea>
                
                {currentSession?.responses.find(r => r.provider === 'gemini') && (
                  <div className="flex items-center justify-between mt-3 pt-3 border-t">
                    <div className="text-xs text-gray-500">
                      {currentSession.responses.find(r => r.provider === 'gemini')?.responseTime && (
                        <span>
                          {Math.round(currentSession.responses.find(r => r.provider === 'gemini')!.responseTime! / 1000)}s
                        </span>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          const content = currentSession.responses.find(r => r.provider === 'gemini')?.content
                          if (content) copyResponse(content, 'Gemini')
                        }}
                        className="h-7 w-7 p-0"
                      >
                        <Copy size={12} />
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Session History */}
          {discussions.length > 0 && (
            <div className="mt-6 pt-6 border-t">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-gray-700">Session History</h3>
                <Badge variant="outline">{discussions.length} sessions</Badge>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-32 overflow-y-auto">
                {discussions.slice(0, 6).map((session) => (
                  <div
                    key={session.id}
                    className="p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                    onClick={() => setCurrentSession(session)}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <Badge 
                        variant={session.status === 'completed' ? 'default' : session.status === 'error' ? 'destructive' : 'secondary'}
                        className="text-xs"
                      >
                        {session.status}
                      </Badge>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            exportSession(session)
                          }}
                          className="h-6 w-6 p-0"
                        >
                          <Download size={10} />
                        </Button>
                      </div>
                    </div>
                    <p className="text-xs text-gray-600 truncate">{session.prompt}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {session.startTime instanceof Date && !isNaN(session.startTime.getTime()) ? session.startTime.toLocaleTimeString() : 'Invalid time'}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default CollaborationCanvas