import React, { useState, useEffect, useRef } from 'react'
import ChatInput from './components/ChatInput'
import ChatMessageList from './components/ChatMessageList'
import TokenStreamingDisplay from './components/TokenStreamingDisplay'
import ModelSettings from './components/ModelSettings'
import { cn } from '@/lib/utils'

interface Message {
  id: string
  type: 'user' | 'ai' | 'system'
  content: string
  timestamp: Date
  isStreaming?: boolean
  metadata?: {
    model?: string
    tokens?: number
    corrected?: boolean
  }
}

interface MainChatProps {
  selectedModel: string
  trainingMode: boolean
}

const MainChat: React.FC<MainChatProps> = ({ selectedModel, trainingMode }) => {
  const [messages, setMessages] = useState<Message[]>([])
  const [isThinking, setIsThinking] = useState(false)
  const [streamingMessage, setStreamingMessage] = useState<string>('')
  const [showModelSettings, setShowModelSettings] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, streamingMessage])

  // Initialize with welcome message
  useEffect(() => {
    const welcomeMessage: Message = {
      id: 'welcome',
      type: 'ai',
      content: `Hello! I'm your PelicanOS AI Assistant running on ${selectedModel}. I'm ready to help you with any questions or tasks.`,
      timestamp: new Date(),
      metadata: { model: selectedModel }
    }
    setMessages([welcomeMessage])
  }, [selectedModel])

  const handleSendMessage = async (content: string) => {
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      type: 'user',
      content,
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setIsThinking(true)
    setStreamingMessage('')

    try {
      // Call the AI API through Electron IPC
      const response = await window.api.chatWithAI({
        message: content,
        model: selectedModel,
        history: messages.slice(-5) // Last 5 messages for context
      })

      if (response.success) {
        const aiMessage: Message = {
          id: `ai-${Date.now()}`,
          type: 'ai',
          content: response.message,
          timestamp: new Date(),
          metadata: { 
            model: selectedModel,
            tokens: response.message.split(' ').length // Rough token estimate
          }
        }
        setMessages(prev => [...prev, aiMessage])
      } else {
        const errorMessage: Message = {
          id: `error-${Date.now()}`,
          type: 'system',
          content: `Error: ${response.message}`,
          timestamp: new Date()
        }
        setMessages(prev => [...prev, errorMessage])
      }
    } catch (error) {
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        type: 'system',
        content: `Failed to get response: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage])
    }

    setIsThinking(false)
  }

  const handleMessageCorrection = (messageId: string, newContent: string) => {
    setMessages(prev => prev.map(msg => 
      msg.id === messageId 
        ? { ...msg, content: newContent, metadata: { ...msg.metadata, corrected: true } }
        : msg
    ))
  }

  const handleMessageReaction = (messageId: string, reaction: string) => {
    // TODO: Implement message reactions
    console.log('Message reaction:', messageId, reaction)
  }

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Chat Header */}
      <div className="p-4 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold">Chat Session</h2>
            <p className="text-sm text-muted-foreground">
              Model: {selectedModel}
              {trainingMode && <span className="ml-2 text-orange-500">• Training Mode</span>}
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowModelSettings(!showModelSettings)}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Model Settings
            </button>
          </div>
        </div>
        
        {/* Model Settings Panel */}
        {showModelSettings && (
          <div className="mt-4">
            <ModelSettings model={selectedModel} />
          </div>
        )}
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-hidden flex flex-col">
        <div className="flex-1 overflow-y-auto">
          <ChatMessageList
            messages={messages}
            onMessageCorrection={handleMessageCorrection}
            onMessageReaction={handleMessageReaction}
            isThinking={isThinking}
            streamingMessage={streamingMessage}
          />
          <div ref={messagesEndRef} />
        </div>

        {/* Token Streaming Display */}
        {(isThinking || streamingMessage) && (
          <TokenStreamingDisplay
            isStreaming={isThinking}
            streamContent={streamingMessage}
            model={selectedModel}
          />
        )}

        {/* Chat Input */}
        <div className="border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <ChatInput
            onSendMessage={handleSendMessage}
            disabled={isThinking}
            placeholder={`Message ${selectedModel}...`}
          />
        </div>
      </div>
    </div>
  )
}

export default MainChat
