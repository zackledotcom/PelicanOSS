// Chat-related type definitions
export interface Message {
  id: string
  type: 'user' | 'ai'
  content: string
  timestamp: Date
  isStreaming?: boolean
  model?: string
}

export interface ChatSession {
  id: string
  title: string
  timestamp: Date
  messageCount: number
  lastMessage?: string
}

export interface ChatHistory {
  id: string
  messages: Message[]
  created_at: Date
  updated_at: Date
  title?: string
}

export interface MemorySummary {
  id: string
  content: string
  timestamp: Date
  importance: number
  topics: string[]
  metadata?: Record<string, any>
}

export interface MemoryStore {
  summaries: MemorySummary[]
  settings: MemorySettings
  version: number
}

export interface MemorySettings {
  enabled: boolean
  retentionDays: number
  maxSummaries: number
  compressionLevel: number
}
