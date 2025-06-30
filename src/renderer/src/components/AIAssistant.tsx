import React, { useState, useEffect } from 'react'
import { Button } from './ui/button'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Textarea } from './ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { Lightning, ArrowClockwise, Trash, Download, Robot, User, Brain, Terminal } from 'phosphor-react'
import { useAllServices } from '../hooks/useServices'

interface Message {
  type: 'user' | 'ai'
  content: string
  timestamp: Date
}

const AIAssistant: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([])
  const [currentMessage, setCurrentMessage] = useState('')
  const [developerMode, setDeveloperMode] = useState(false)

  const {
    ollama, 
    chroma,
    chat,
    memory,
    allServicesConnected
  } = useAllServices()

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
      const response = await chat.sendMessage(
        messageContent,
        ollama.models[0] || 'tinydolphin:latest',
        messages.slice(-5)
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

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Brain size={28} className="text-blue-600" />
            PelicanOS AI Assistant
          </h1>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${ollama.status.connected ? 'bg-green-500' : 'bg-red-500'}`} />
              <span className="text-sm font-medium">Ollama</span>
            </div>

            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${chroma.status.connected ? 'bg-green-500' : 'bg-red-500'}`} />
              <span className="text-sm font-medium">ChromaDB</span>
            </div>

            <Button
              onClick={() => setDeveloperMode(!developerMode)}
              variant={developerMode ? "default" : "outline"}
              className={`flex items-center gap-2 ${developerMode ? 'bg-green-600 hover:bg-green-700' : 'hover:bg-green-50'}`}
            >
              <Lightning size={16} />
              Canvas
            </Button>
          </div>
        </div>
      </div>

      {!allServicesConnected && (
        <div className="p-6">
          <Card className="bg-white/60 backdrop-blur-sm border-blue-200">
            <CardHeader>
              <CardTitle className="text-blue-900">Service Setup Required</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {!ollama.status.connected && (
                <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div>
                    <h3 className="font-semibold text-blue-900">Ollama Service</h3>
                    <p className="text-sm text-blue-700">{ollama.status.message}</p>
                  </div>
                  <Button onClick={ollama.startService} disabled={ollama.status.starting} className="bg-blue-600 hover:bg-blue-700">
                    {ollama.status.starting ? 'Starting...' : 'Start Ollama'}
                  </Button>
                </div>
              )}

              {!chroma.status.connected && (
                <div className="flex items-center justify-between p-4 bg-indigo-50 rounded-lg border border-indigo-200">
                  <div>
                    <h3 className="font-semibold text-indigo-900">ChromaDB Service</h3>
                    <p className="text-sm text-indigo-700">{chroma.status.message}</p>
                  </div>
                  <Button onClick={chroma.startService} disabled={chroma.status.starting} className="bg-indigo-600 hover:bg-indigo-700">
                    {chroma.status.starting ? 'Starting...' : 'Start ChromaDB'}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {allServicesConnected && (
        <div className={`flex-1 flex ${developerMode ? '' : 'flex-col'}`}>
          <div className={`flex flex-col ${developerMode ? 'w-3/5 border-r border-gray-200' : 'flex-1'}`}>
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

                <div className="ml-auto flex gap-2">
                  <Button variant="outline" size="sm" onClick={clearChat} disabled={messages.length === 0} className="bg-white/60">
                    <Trash size={16} />
                  </Button>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {messages.length === 0 ? (
                <div className="text-center py-12">
                  <Robot size={64} className="mx-auto mb-4 text-blue-400" />
                  <h3 className="text-xl font-semibold text-gray-700 mb-2">Ready to Chat!</h3>
                  <p className="text-gray-500">Ask me anything using the input below.</p>
                </div>
              ) : (
                messages.map((message, index) => (
                  <div key={index} className={`flex gap-3 ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                    {message.type === 'ai' && (
                      <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
                        <Robot size={16} className="text-white" />
                      </div>
                    )}

                    <div className={`max-w-3xl rounded-2xl p-4 shadow-sm ${
                      message.type === 'user'
                        ? 'bg-blue-600 text-white'
                        : 'bg-white/80 backdrop-blur-sm text-gray-800 border border-gray-200'
                    }`}>
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
                  Send
                </Button>
              </div>
            </div>
          </div>

          {developerMode && (
            <div className="w-2/5 bg-gray-900 text-white flex flex-col">
              <div className="p-4 bg-gray-800 border-b border-gray-700 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Lightning size={20} className="text-green-400" />
                  <span className="font-semibold">Canvas</span>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" className="bg-gray-700 hover:bg-gray-600 border-gray-600">
                    <Terminal size={16} />
                  </Button>
                  <Button size="sm" variant="outline" className="bg-gray-700 hover:bg-gray-600 border-gray-600" onClick={() => setDeveloperMode(false)}>
                    ✕
                  </Button>
                </div>
              </div>

              <div className="flex-1 flex flex-col">
                <div className="p-2 bg-gray-800 border-b border-gray-700 text-sm text-gray-400">
                  code.js
                </div>
                <Textarea
                  className="flex-1 bg-gray-900 text-green-400 font-mono text-sm border-0 rounded-none resize-none focus:ring-0"
                  placeholder="// Welcome to Canvas
console.log('Hello from PelicanOS Canvas!');

// Ask the AI to write code and it will appear here
// This is your collaborative coding space"
                  style={{ minHeight: '400px' }}
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default AIAssistant