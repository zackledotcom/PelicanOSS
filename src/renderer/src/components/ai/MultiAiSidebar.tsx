/**
 * Multi-AI Chat System for PelicanOS
 * 
 * Provides individual chat threads for:
 * - Ollama (Local AI)  
 * - Claude Desktop Commander
 * - Gemini CLI
 * 
 * Each AI behaves exactly like terminal usage with persistent history.
 */

import React, { useState, useEffect } from 'react'
import {
  Robot,
  Brain,
  Cpu,
  MessageCircle,
  Plus,
  Terminal
} from 'phosphor-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'

export type AIProvider = 'ollama' | 'claude-desktop' | 'gemini-cli'

export interface AIThread {
  id: string
  provider: AIProvider
  name: string
  messages: ChatMessage[]
  isActive: boolean
  lastActivity: Date
  status: 'online' | 'offline' | 'error'
}

export interface ChatMessage {
  id: string
  type: 'user' | 'assistant'
  content: string
  timestamp: Date
  provider: AIProvider
}

interface MultiAiSidebarProps {
  activeThread?: string
  onThreadSelect: (threadId: string) => void
  onNewThread: (provider: AIProvider) => void
  onCollaborationMode: () => void
}

const AI_CONFIGS = {
  ollama: {
    name: 'Ollama',
    icon: Cpu,
    color: 'blue',
    description: 'Local AI (Private)',
    defaultOnline: true
  },
  'claude-desktop': {
    name: 'Claude DC',
    icon: Robot, 
    color: 'purple',
    description: 'Desktop Commander',
    defaultOnline: false
  },
  'gemini-cli': {
    name: 'Gemini CLI',
    icon: Brain,
    color: 'green', 
    description: 'Google AI with Tools',
    defaultOnline: false
  }
} as const

const MultiAiSidebar: React.FC<MultiAiSidebarProps> = ({
  activeThread,
  onThreadSelect,
  onNewThread,
  onCollaborationMode
}) => {
  const [threads, setThreads] = useState<AIThread[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    initializeThreads()
  }, [])

  const initializeThreads = async () => {
    setLoading(true)
    try {
      // Create default threads for each AI
      const defaultThreads: AIThread[] = [
        {
          id: 'ollama-main',
          provider: 'ollama',
          name: 'Ollama Chat',
          messages: [],
          isActive: false,
          lastActivity: new Date(),
          status: 'online'
        },
        {
          id: 'claude-main', 
          provider: 'claude-desktop',
          name: 'Claude Desktop Commander',
          messages: [],
          isActive: false,
          lastActivity: new Date(),
          status: 'offline'
        },
        {
          id: 'gemini-main',
          provider: 'gemini-cli', 
          name: 'Gemini CLI',
          messages: [],
          isActive: false,
          lastActivity: new Date(),
          status: 'offline'
        }
      ]

      setThreads(defaultThreads)
    } catch (error) {
      console.error('Failed to initialize AI threads:', error)
    } finally {
      setLoading(false)
    }
  }

  const getAiConfig = (provider: AIProvider) => AI_CONFIGS[provider]

  const handleThreadClick = (thread: AIThread) => {
    onThreadSelect(thread.id)
  }

  const handleNewThread = (provider: AIProvider) => {
    onNewThread(provider)
  }

  const getStatusColor = (status: AIThread['status']) => {
    switch (status) {
      case 'online': return 'text-green-500'
      case 'offline': return 'text-gray-500' 
      case 'error': return 'text-red-500'
      default: return 'text-gray-500'
    }
  }

  if (loading) {
    return (
      <div className="p-4">
        <div className="animate-pulse space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-16 bg-gray-200 rounded" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">AI Assistants</h2>
          <Button
            size="sm"
            onClick={onCollaborationMode}
            className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600"
          >
            <MessageCircle size={14} className="mr-1" />
            Collaborate
          </Button>
        </div>
      </div>

      {/* AI Threads */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-3">
          {threads.map(thread => {
            const config = getAiConfig(thread.provider)
            const Icon = config.icon
            const isActive = activeThread === thread.id

            return (
              <Card
                key={thread.id}
                className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
                  isActive ? 'ring-2 ring-blue-500 bg-blue-50' : 'hover:bg-gray-50'
                }`}
                onClick={() => handleThreadClick(thread)}
              >
                <CardContent className="p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className={`w-8 h-8 rounded-lg bg-${config.color}-500 flex items-center justify-center`}>
                        <Icon size={16} className="text-white" />
                      </div>
                      <div>
                        <h3 className="text-sm font-medium">{config.name}</h3>
                        <p className="text-xs text-gray-600">{config.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className={`w-2 h-2 rounded-full ${getStatusColor(thread.status)}`} />
                      <Terminal size={12} className="text-gray-400" />
                    </div>
                  </div>

                  {thread.messages.length > 0 && (
                    <div className="text-xs text-gray-500 truncate">
                      Last: {thread.messages[thread.messages.length - 1]?.content.slice(0, 50)}...
                    </div>
                  )}

                  {thread.messages.length === 0 && (
                    <div className="text-xs text-gray-400">
                      No messages yet
                    </div>
                  )}

                  <div className="flex items-center justify-between mt-2">
                    <Badge variant="outline" className="text-xs">
                      {thread.messages.length} messages
                    </Badge>
                    <span className="text-xs text-gray-400">
                      {thread.lastActivity.toLocaleTimeString([], { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </span>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* New Thread Buttons */}
        <div className="mt-6 space-y-2">
          <h3 className="text-sm font-medium text-gray-600 mb-2">Start New Chat</h3>
          {Object.entries(AI_CONFIGS).map(([provider, config]) => {
            const Icon = config.icon
            return (
              <Button
                key={provider}
                variant="outline"
                size="sm"
                className="w-full justify-start"
                onClick={() => handleNewThread(provider as AIProvider)}
              >
                <Icon size={14} className={`mr-2 text-${config.color}-500`} />
                New {config.name} Chat
              </Button>
            )
          })}
        </div>
      </ScrollArea>
    </div>
  )
}

export default MultiAiSidebar
