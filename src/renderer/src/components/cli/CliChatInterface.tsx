import React, { useState, useRef, useEffect } from 'react'
import { 
  Terminal, 
  Play, 
  Square, 
  ArrowClockwise, 
  Folder, 
  Eye,
  Settings,
  ChatCircle,
  Robot
} from 'phosphor-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { useToast } from '@/components/ui/toast'
import CliMessage from './CliMessage'

type AIProvider = 'ollama' | 'claude' | 'gemini'

interface CliChatMessage {
  id: string
  type: 'user' | 'ai'
  content: string
  provider?: AIProvider
  timestamp: Date
  isStreaming?: boolean
  metadata?: any
}

interface CliChatInterfaceProps {
  selectedProvider: AIProvider
  onProviderChange: (provider: AIProvider) => void
  workingDirectory?: string
  onDirectoryChange?: (dir: string) => void
  onOpenCollaborationCanvas?: () => void
}

const CliChatInterface: React.FC<CliChatInterfaceProps> = ({
  selectedProvider,
  onProviderChange,
  workingDirectory = '/Users/user',
  onDirectoryChange,
  onOpenCollaborationCanvas
}) => {
  const { addToast } = useToast()
  const [messages, setMessages] = useState<CliChatMessage[]>([])
  const [input, setInput] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [commandHistory, setCommandHistory] = useState<string[]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight
    }
  }, [messages])

  // Focus input on mount
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus()
    }
  }, [])

  const handleSubmit = async (command: string = input.trim()) => {
    if (!command || isStreaming) return

    // Add command to history
    setCommandHistory(prev => [...prev, command])
    setHistoryIndex(-1)

    // Add user message
    const userMessage: CliChatMessage = {
      id: `user-${Date.now()}`,
      type: 'user',
      content: command,
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsStreaming(true)

    // Add streaming AI response
    const aiMessage: CliChatMessage = {
      id: `ai-${Date.now()}`,
      type: 'ai',
      content: '',
      provider: selectedProvider,
      timestamp: new Date(),
      isStreaming: true
    }

    setMessages(prev => [...prev, aiMessage])

    try {
      let response = ''

      // Execute command based on provider
      switch (selectedProvider) {
        case 'claude':
          const claudeResult = await window.api.claudeDcExecuteCommand({
            command: command,
            workingDir: workingDirectory,
            timeout: 30000
          })
          response = claudeResult.success 
            ? (claudeResult.output || 'Command executed successfully')
            : `Error: ${claudeResult.error}`
          break

        case 'gemini':
          const geminiResult = await window.api.geminiCliChatWithContext({
            message: command,
            projectPath: workingDirectory
          })
          response = geminiResult.success 
            ? (geminiResult.response || 'Analysis completed')
            : `Error: ${geminiResult.error}`
          break

        case 'ollama':
          // For Ollama, treat as a chat message
          const ollamaResult = await window.api.chatWithAI({
            message: command,
            model: 'tinydolphin:latest',
            history: messages.slice(-10).map(m => ({
              role: m.type === 'user' ? 'user' : 'assistant',
              content: m.content
            }))
          })
          response = ollamaResult.response || 'No response received'
          break

        default:
          response = 'Unknown provider'
      }

      // Update the streaming message with final content
      setMessages(prev => prev.map(msg => 
        msg.id === aiMessage.id 
          ? { ...msg, content: response, isStreaming: false }
          : msg
      ))

      addToast({
        type: 'success',
        title: `${selectedProvider.charAt(0).toUpperCase() + selectedProvider.slice(1)} Response`,
        description: 'Command executed successfully',
        duration: 2000
      })

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      
      setMessages(prev => prev.map(msg => 
        msg.id === aiMessage.id 
          ? { ...msg, content: `Error: ${errorMessage}`, isStreaming: false }
          : msg
      ))

      addToast({
        type: 'error',
        title: 'Command Failed',
        description: errorMessage,
        duration: 3000
      })
    } finally {
      setIsStreaming(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (commandHistory.length > 0) {
        const newIndex = Math.min(historyIndex + 1, commandHistory.length - 1)
        setHistoryIndex(newIndex)
        setInput(commandHistory[commandHistory.length - 1 - newIndex])
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1
        setHistoryIndex(newIndex)
        setInput(commandHistory[commandHistory.length - 1 - newIndex])
      } else if (historyIndex === 0) {
        setHistoryIndex(-1)
        setInput('')
      }
    }
  }

  const clearSession = () => {
    setMessages([])
    addToast({
      type: 'info',
      title: 'Session Cleared',
      description: 'All messages have been cleared',
      duration: 2000
    })
  }

  const stopCurrentCommand = () => {
    setIsStreaming(false)
    setMessages(prev => prev.map(msg => 
      msg.isStreaming ? { ...msg, content: msg.content + '\n[Command interrupted]', isStreaming: false } : msg
    ))
    
    addToast({
      type: 'warning',
      title: 'Command Stopped',
      description: 'Current command execution has been interrupted',
      duration: 2000
    })
  }

  const providerOptions = [
    { value: 'ollama', label: 'Ollama Local', icon: Robot, color: 'text-blue-500' },
    { value: 'claude', label: 'Claude DC', icon: Terminal, color: 'text-orange-500' },
    { value: 'gemini', label: 'Gemini CLI', icon: Terminal, color: 'text-purple-500' }
  ] as const

  return (
    <Card className="h-full flex flex-col bg-black text-green-400 font-mono">
      {/* Terminal Header */}
      <CardHeader className="pb-3 border-b border-gray-800">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-green-400">
            <Terminal size={20} />
            <span>PelicanOS Terminal</span>
            <Badge variant="outline" className="border-green-600 text-green-400">
              {selectedProvider}
            </Badge>
          </CardTitle>
          
          <div className="flex items-center gap-2">
            {/* Provider Selector */}
            <Select value={selectedProvider} onValueChange={onProviderChange}>
              <SelectTrigger className="w-32 h-8 bg-gray-900 border-gray-700 text-green-400">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-gray-900 border-gray-700">
                {providerOptions.map(option => {
                  const Icon = option.icon
                  return (
                    <SelectItem key={option.value} value={option.value} className="text-green-400">
                      <div className="flex items-center gap-2">
                        <Icon size={14} className={option.color} />
                        <span>{option.label}</span>
                      </div>
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>

            {/* Action Buttons */}
            <Button
              variant="ghost"
              size="sm"
              onClick={clearSession}
              className="h-8 w-8 p-0 text-green-400 hover:bg-gray-800"
              title="Clear Session"
            >
              <ArrowClockwise size={14} />
            </Button>

            {onOpenCollaborationCanvas && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onOpenCollaborationCanvas}
                className="h-8 w-8 p-0 text-green-400 hover:bg-gray-800"
                title="Open Collaboration Canvas"
              >
                <ChatCircle size={14} />
              </Button>
            )}

            {onDirectoryChange && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  const newDir = prompt('Enter working directory:', workingDirectory)
                  if (newDir) onDirectoryChange(newDir)
                }}
                className="h-8 w-8 p-0 text-green-400 hover:bg-gray-800"
                title="Change Directory"
              >
                <Folder size={14} />
              </Button>
            )}
          </div>
        </div>

        {/* Working Directory */}
        <div className="text-xs text-gray-500 mt-2">
          <span className="text-green-500">pwd:</span> {workingDirectory}
        </div>
      </CardHeader>

      {/* Messages Area */}
      <CardContent className="flex-1 flex flex-col p-0">
        <ScrollArea 
          ref={scrollAreaRef}
          className="flex-1 p-4 bg-black"
        >
          {messages.length === 0 ? (
            <div className="text-center text-gray-600 mt-8">
              <Terminal size={48} className="mx-auto mb-4 opacity-50" />
              <p>Welcome to PelicanOS Terminal</p>
              <p className="text-sm mt-2">
                Type commands to interact with {selectedProvider}
              </p>
              <p className="text-xs mt-1 text-gray-700">
                Use ↑/↓ arrows to navigate command history
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {messages.map((message) => (
                <CliMessage
                  key={message.id}
                  type={message.type}
                  content={message.content}
                  provider={message.provider}
                  timestamp={message.timestamp}
                  isStreaming={message.isStreaming}
                />
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Command Input */}
        <div className="border-t border-gray-800 p-4">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 text-green-500 text-sm">
              <Terminal size={14} />
              <span>$</span>
            </div>
            
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`Enter command for ${selectedProvider}...`}
              disabled={isStreaming}
              className="flex-1 bg-transparent border-none text-green-400 placeholder-gray-600 focus:ring-0 font-mono"
            />

            {isStreaming ? (
              <Button
                onClick={stopCurrentCommand}
                size="sm"
                variant="ghost"
                className="h-8 px-3 text-red-400 hover:bg-gray-800"
              >
                <Square size={14} />
              </Button>
            ) : (
              <Button
                onClick={() => handleSubmit()}
                disabled={!input.trim()}
                size="sm"
                variant="ghost"
                className="h-8 px-3 text-green-400 hover:bg-gray-800"
              >
                <Play size={14} />
              </Button>
            )}
          </div>

          {/* Status Bar */}
          <div className="flex items-center justify-between mt-2 text-xs text-gray-600">
            <div className="flex items-center gap-3">
              <span>History: {commandHistory.length}</span>
              <span>Provider: {selectedProvider}</span>
              {isStreaming && (
                <Badge variant="outline" className="border-yellow-600 text-yellow-400 animate-pulse">
                  Processing...
                </Badge>
              )}
            </div>
            <div>
              Press Enter to execute • ↑/↓ for history
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default CliChatInterface