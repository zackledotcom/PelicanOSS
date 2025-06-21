import React, { useState, useEffect } from 'react'
import { Button } from './ui/button'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Textarea } from './ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { CheckCircle, Circle, Send, RefreshCw, Trash2, Download, Bot, User, Brain, Settings } from 'lucide-react'
import AdvancedMemoryPanel from './AdvancedMemoryPanel'
import MemoryHealthIndicator from './MemoryHealthIndicator'
import type { MemoryStore } from '../types/chat'

interface Message {
  type: 'user' | 'ai'
  content: string
  timestamp: Date
}

interface ServiceStatus {
  connected: boolean
  message: string
  starting: boolean
}

const AIAssistant: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([])
  const [currentMessage, setCurrentMessage] = useState('')
  const [isThinking, setIsThinking] = useState(false)
  const [selectedModel, setSelectedModel] = useState('tinydolphin:latest')
  const [availableModels, setAvailableModels] = useState<string[]>([])
  const [showMemoryPanel, setShowMemoryPanel] = useState(false)
  const [memoryStore, setMemoryStore] = useState<MemoryStore | null>(null)

  const [ollamaStatus, setOllamaStatus] = useState<ServiceStatus>({
    connected: false,
    message: 'Checking connection...',
    starting: false
  })

  const [chromaStatus, setChromaStatus] = useState<ServiceStatus>({
    connected: false,
    message: 'Checking connection...',
    starting: false
  })

  const allServicesConnected = ollamaStatus.connected && chromaStatus.connected

  const checkOllamaStatus = async () => {
    try {
      const response = await window.api.checkOllamaStatus()
      setOllamaStatus({
        connected: response.connected,
        message: response.message,
        starting: false
      })
      
      if (response.connected && response.models) {
        setAvailableModels(response.models)
        if (response.models.length > 0 && !response.models.includes(selectedModel)) {
          setSelectedModel(response.models[0])
        }
      }
    } catch (error) {
      setOllamaStatus({
        connected: false,
        message: 'Failed to connect to Ollama',
        starting: false
      })
    }
  }

  const startOllama = async () => {
    setOllamaStatus(prev => ({ ...prev, starting: true }))
    try {
      const response = await window.api.startOllama()
      setOllamaStatus({
        connected: response.success,
        message: response.message,
        starting: false
      })
      
      if (response.success) {
        await checkOllamaStatus()
      }
    } catch (error) {
      setOllamaStatus({
        connected: false,
        message: 'Failed to start Ollama',
        starting: false
      })
    }
  }

  const checkChromaStatus = async () => {
    try {
      const response = await window.api.checkChromaStatus()
      setChromaStatus({
        connected: response.connected,
        message: response.message,
        starting: false
      })
    } catch (error) {
      setChromaStatus({
        connected: false,
        message: 'Failed to connect to ChromaDB',
        starting: false
      })
    }
  }

  const startChroma = async () => {
    setChromaStatus(prev => ({ ...prev, starting: true }))
    try {
      const response = await window.api.startChroma()
      setChromaStatus({
        connected: response.success,
        message: response.message,
        starting: false
      })
    } catch (error) {
      setChromaStatus({
        connected: false,
        message: 'Failed to start ChromaDB',
        starting: false
      })
    }
  }

  const sendMessage = async () => {
    if (!currentMessage.trim() || isThinking) return
    
    const userMessage = currentMessage.trim()
    const newMessage: Message = {
      type: 'user',
      content: userMessage,
      timestamp: new Date()
    }
    setMessages(prev => [...prev, newMessage])
    setCurrentMessage('')
    setIsThinking(true)
    
    try {
      const response = await window.api.chatWithAI({
        message: userMessage,
        model: selectedModel,
        history: messages.slice(-10)
      })
      
      const aiMessage: Message = {
        type: 'ai',
        content: response.success ? response.message : 'Sorry, I encountered an error.',
        timestamp: new Date()
      }
      setMessages(prev => [...prev, aiMessage])
    } catch (error) {
      const errorMessage: Message = {
        type: 'ai',
        content: 'Sorry, I encountered an error.',
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage])
    }
    
    setIsThinking(false)
  }

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      sendMessage()
    }
  }

  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  const clearChat = () => setMessages([])

  const loadMemoryStore = async () => {
    try {
      const store = await window.api.getMemoryStore()
      setMemoryStore(store)
    } catch (error) {
      console.error('Failed to load memory store:', error)
      setMemoryStore(null)
    }
  }

  const exportChat = () => {
    const chatData = {
      timestamp: new Date().toISOString(),
      messages: messages
    }
    
    const dataStr = JSON.stringify(chatData, null, 2)
    const dataBlob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(dataBlob)
    
    const link = document.createElement('a')
    link.href = url
    link.download = `chat-export-${new Date().toISOString().split('T')[0]}.json`
    link.click()
    
    URL.revokeObjectURL(url)
  }

  useEffect(() => {
    const initializeServices = async () => {
      await checkOllamaStatus()
      await checkChromaStatus()
      await loadMemoryStore()
      
      const welcomeMessage: Message = {
        type: 'ai',
        content: 'Hello! I\'m your PelicanOS AI Assistant. How can I help you today?',
        timestamp: new Date()
      }
      setMessages([welcomeMessage])
    }
    
    initializeServices()
  }, [])

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-black/20 backdrop-blur-sm border-b border-white/10">
        <div>
          <h1 className="text-2xl font-bold text-white">🕊️ PelicanOS AI Assistant</h1>
          <div className="flex gap-4 mt-2">
            <div className="flex items-center gap-2">
              {ollamaStatus.connected ? (
                <CheckCircle className="w-4 h-4 text-green-400" />
              ) : (
                <Circle className="w-4 h-4 text-red-400" />
              )}
              <span className="text-sm text-white/80">
                Ollama {ollamaStatus.connected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {chromaStatus.connected ? (
                <CheckCircle className="w-4 h-4 text-green-400" />
              ) : (
                <Circle className="w-4 h-4 text-red-400" />
              )}
              <span className="text-sm text-white/80">
                ChromaDB {chromaStatus.connected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
          </div>
        </div>
        
        {/* Memory Health Indicator */}
        <div className="group relative">
          <MemoryHealthIndicator 
            memoryStore={memoryStore} 
            className="text-white/80"
          />
        </div>
      </div>

      {/* Service Setup Panel */}
      {!allServicesConnected && (
        <div className="flex-1 p-6 overflow-auto">
          <div className="max-w-4xl mx-auto">
            <Card className="bg-white/10 backdrop-blur-sm border-white/20">
              <CardHeader>
                <CardTitle className="text-white">Service Management</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-white">🦙 Ollama Service</h3>
                    <Button variant="outline" size="sm" onClick={checkOllamaStatus}>
                      Check Status
                    </Button>
                  </div>
                  <p className="text-white/80">{ollamaStatus.message}</p>
                  {!ollamaStatus.connected && (
                    <Button 
                      onClick={startOllama} 
                      disabled={ollamaStatus.starting}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      {ollamaStatus.starting ? 'Starting...' : 'Start Ollama'}
                    </Button>
                  )}
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-white">🧬 ChromaDB Service</h3>
                    <Button variant="outline" size="sm" onClick={checkChromaStatus}>
                      Check Status
                    </Button>
                  </div>
                  <p className="text-white/80">{chromaStatus.message}</p>
                  {!chromaStatus.connected && (
                    <Button 
                      onClick={startChroma} 
                      disabled={chromaStatus.starting}
                      className="bg-orange-600 hover:bg-orange-700"
                    >
                      {chromaStatus.starting ? 'Starting...' : 'Start ChromaDB'}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Chat Interface */}
      {allServicesConnected && (
        <div className="flex flex-col flex-1 min-h-0">
          {/* Model Selector */}
          <div className="flex items-center gap-4 p-4 bg-black/10 backdrop-blur-sm">
            <label className="text-white font-medium">AI Model:</label>
            <Select value={selectedModel} onValueChange={setSelectedModel}>
              <SelectTrigger className="w-64">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableModels.map(model => (
                  <SelectItem key={model} value={model}>
                    {model}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={() => setShowMemoryPanel(true)}>
              <Brain className="w-4 h-4 mr-2" />
              Memory
            </Button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-auto p-4">
            <div className="space-y-4 max-w-4xl mx-auto">
              {messages.map((message, index) => (
                <div key={index} className={`flex gap-3 ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <Card className="max-w-[80%] bg-white/10 backdrop-blur-sm border-white/20">
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-white">
                          {message.type === 'user' ? 'You' : 'AI'}
                        </span>
                        <span className="text-xs text-white/60">
                          {formatTime(message.timestamp)}
                        </span>
                      </div>
                      <p className="text-white">{message.content}</p>
                    </CardContent>
                  </Card>
                </div>
              ))}

              {isThinking && (
                <div className="flex gap-3 justify-start">
                  <Card className="max-w-[80%] bg-white/10 backdrop-blur-sm border-white/20">
                    <CardContent className="p-3">
                      <div className="flex items-center gap-2">
                        <div className="flex space-x-1">
                          <div className="w-2 h-2 bg-white rounded-full animate-bounce"></div>
                          <div className="w-2 h-2 bg-white rounded-full animate-bounce [animation-delay:0.1s]"></div>
                          <div className="w-2 h-2 bg-white rounded-full animate-bounce [animation-delay:0.2s]"></div>
                        </div>
                        <span className="text-white/80">Thinking...</span>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          </div>

          {/* Input Area */}
          <div className="p-4 bg-black/10 backdrop-blur-sm">
            <div className="max-w-4xl mx-auto space-y-3">
              <div className="flex gap-3">
                <Textarea
                  value={currentMessage}
                  onChange={(e) => setCurrentMessage(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask me anything..."
                  className="flex-1 bg-white/10 border-white/20 text-white placeholder:text-white/50"
                  disabled={isThinking}
                />
                <Button
                  onClick={sendMessage}
                  disabled={!currentMessage.trim() || isThinking}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
              
              <div className="flex justify-center gap-3">
                <Button variant="outline" size="sm" onClick={clearChat}>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Clear
                </Button>
                <Button variant="outline" size="sm" onClick={exportChat}>
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Advanced Memory Panel */}
      <AdvancedMemoryPanel 
        isOpen={showMemoryPanel} 
        onClose={() => {
          setShowMemoryPanel(false)
          loadMemoryStore() // Refresh memory store when panel closes
        }} 
      />
    </div>
  )
}

export default AIAssistant
