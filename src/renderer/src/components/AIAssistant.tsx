import React, { useState, useEffect } from 'react'
import { Button } from './ui/button'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Textarea } from './ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { Checkimport { CheckCircle, Circle, PaperPlaneTilt, ArrowClockwise, Trash, Download, Robot, User, Brain, Gear } from 'phosphor-react'
Circle, Circle, PaperPlaneTilt, ArrowClockwise, Trash, Download, Robot, User, Brain, Gear } from 'phosphor-react'
import { useAllServices } from '../hooks/useServices'

interface Message {
  type: 'user' | 'ai'
  content: string
  timestamp: Date
}

const AIAssistant: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([])
  const [currentMessage, setCurrentMessage] = useState('')
  const [showMemoryPanel, setShowMemoryPanel] = useState(false)

  // Use centralized services
  const {
    ollama, 
    chroma,
    chat,
    memory,
    allServicesConnected
  } = useAllServices()

  // Load memory store on mount
  useEffect(() => {
    if (allServicesConnected) {
      memory.loadMemoryStore()
    }
  }, [allServicesConnected, memory])

  const handleSendMessage = async () => {
    if (!currentMessage.trim() || chat.isThinking) return

    const userMessage: Message = {
      type: 'user',
      content: currentMessage.trim(),
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    const messageContent = currentMessage.trim()
    setCurrentMessage('')

    try {
      // Use centralized chat service
      const response = await chat.sendMessage(
        messageContent,
        ollama.models[0] || 'tinydolphin:latest',
        messages.slice(-5) // Send last 5 messages for context
      )

      const aiMessage: Message = {
        type: 'ai',
        content: response.success ? response.message : 'Sorry, I encountered an error processing your request.',
        timestamp: new Date()
      }

      setMessages(prev => [...prev, aiMessage])
    } catch (error) {
      console.error('Error sending message:', error)
      const errorMessage: Message = {
        type: 'ai',
        content: 'Sorry, I encountered an error processing your request.',
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage])
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const clearChat = () => {
    setMessages([])
  }

  const exportChat = () => {
    const chatData = {
      timestamp: new Date().toISOString(),
      messages: messages.map(msg => ({
        type: msg.type,
        content: msg.content,
        timestamp: msg.timestamp.toISOString()
      }))
    }

    const blob = new Blob([JSON.stringify(chatData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `pelican-chat-${new Date().toISOString().split('T')[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Service Status Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Brain size={28} className="text-blue-600" />
            PelicanOS AI Assistant
          </h1>

          <div className="flex items-center gap-4">
            {/* Ollama Status */}
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${ollama.status.connected ? 'bg-green-500' : 'bg-red-500'}`} />
              <span className="text-sm font-medium">Ollama</span>
              {ollama.status.starting && <ArrowClockwise size={16} className="animate-spin text-blue-500" />}
            </div>

            {/* ChromaDB Status */}
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${chroma.status.connected ? 'bg-green-500' : 'bg-red-500'}`} />
              <span className="text-sm font-medium">ChromaDB</span>
              {chroma.status.starting && <ArrowClockwise size={16} className="animate-spin text-blue-500" />}
            </div>

            {/* Memory Status */}
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${memory.memoryStore?.enabled ? 'bg-green-500' : 'bg-yellow-500'}`} />
              <span className="text-sm font-medium">Memory</span>
            </div>
          </div>
        </div>
      </div>

      {/* Service Setup Panel */}
      {!allServicesConnected && (
        <div className="p-6">
          <Card className="bg-white/60 backdrop-blur-sm border-blue-200">
            <CardHeader>
              <CardTitle className="text-blue-900">Service Setup Required</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Ollama Setup */}
              {!ollama.status.connected && (
                <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div>
                    <h3 className="font-semibold text-blue-900">Ollama Service</h3>
                    <p className="text-sm text-blue-700">{ollama.status.message}</p>
                  </div>
                  <Button
                    onClick={ollama.startService}
                    disabled={ollama.status.starting}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {ollama.status.starting ? 'Starting...' : 'Start Ollama'}
                  </Button>
                </div>
              )}

              {/* ChromaDB Setup */}
              {!chroma.status.connected && (
                <div className="flex items-center justify-between p-4 bg-indigo-50 rounded-lg border border-indigo-200">
                  <div>
                    <h3 className="font-semibold text-indigo-900">ChromaDB Service</h3>
                    <p className="text-sm text-indigo-700">{chroma.status.message}</p>
                  </div>
                  <Button
                    onClick={chroma.startService}
                    disabled={chroma.status.starting}
                    className="bg-indigo-600 hover:bg-indigo-700"
                  >
                    {chroma.status.starting ? 'Starting...' : 'Start ChromaDB'}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Chat Interface */}
      {allServicesConnected && (
        <>
          {/* Model Selector */}
          <div className="p-4 bg-white/60 backdrop-blur-sm border-b border-gray-200">
            <div className="flex items-center gap-4">
              <label className="text-sm font-medium text-gray-700">AI Model:</label>
              <Select defaultValue={ollama.models[0] || 'tinydolphin:latest'}>
                <SelectTrigger className="w-64 bg-white/80">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ollama.models.map((model) => (
                    <SelectItem key={model} value={model}>
                      {model}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                size="sm"
                onClick={ollama.getModels}
                className="bg-white/60"
              >
                <ArrowClockwise size={16} />
              </Button>

              <div className="ml-auto flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowMemoryPanel(!showMemoryPanel)}
                  className="bg-white/60"
                >
                  <Brain size={16} />
                  Memory
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearChat}
                  disabled={messages.length === 0}
                  className="bg-white/60"
                >
                  <Trash size={16} />
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={exportChat}
                  disabled={messages.length === 0}
                  className="bg-white/60"
                >
                  <Download size={16} />
                </Button>
              </div>
            </div>
          </div>

          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {messages.length === 0 ? (
              <div className="text-center py-12">
                <Robot size={64} className="mx-auto mb-4 text-blue-400" />
                <h3 className="text-xl font-semibold text-gray-700 mb-2">Ready to Chat!</h3>
                <p className="text-gray-500">Ask me anything using the input below.</p>
              </div>
            ) : (
              messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex gap-3 ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {message.type === 'ai' && (
                    <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
                      <Robot size={16} className="text-white" />
                    </div>
                  )}

                  <div
                    className={`max-w-3xl rounded-2xl p-4 shadow-sm ${
                      message.type === 'user'
                        ? 'bg-blue-600 text-white'
                        : 'bg-white/80 backdrop-blur-sm text-gray-800 border border-gray-200'
                    }`}
                  >
                    <div className="whitespace-pre-wrap">{message.content}</div>
                    <div className={`text-xs mt-2 ${message.type === 'user' ? 'text-blue-100' : 'text-gray-500'}`}>
                      {message.timestamp.toLocaleTimeString()}
                    </div>
                  </div>

                  {message.type === 'user' && (
                    <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center flex-shrink-0">
                      <User size={16} className="text-white" />
                    </div>
                  )}
                </div>
              ))
            )}

            {/* Thinking indicator */}
            {chat.isThinking && (
              <div className="flex gap-3 justify-start">
                <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
                  <Robot size={16} className="text-white" />
                </div>
                <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 shadow-sm border border-gray-200">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                    <span className="text-sm text-gray-600 ml-2">AI is thinking...</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Input Area */}
          <div className="p-6 bg-white/60 backdrop-blur-sm border-t border-gray-200">
            <div className="flex gap-3">
              <Textarea
                value={currentMessage}
                onChange={(e) => setCurrentMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type your message here..."
                className="flex-1 resize-none bg-white/80 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                rows={3}
                disabled={chat.isThinking}
              />
              <Button
                onClick={handleSendMessage}
                disabled={!currentMessage.trim() || chat.isThinking}
                className="bg-blue-600 hover:bg-blue-700 px-6"
              >
                <PaperPlaneTilt size={20} />
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default AIAssistant
