export interface Message {
  /** Unique identifier for the message */
  id: string
  
  /** Role of the message sender */
  role: 'user' | 'assistant' | 'system' | 'error'
  
  /** Text content of the message */
  content: string
  
  /** ISO timestamp when message was created */
  timestamp: string
  
  /** Internal reasoning for non-trivial responses (optional) */
  reasoning?: string
  
  /** Confidence level in response accuracy (0-100) */
  confidence?: number
  
  /** Any clarifying questions that should be asked */
  clarifications?: string[]
}

export type MessageRole = Message['role']

export interface ChatSession {
  /** Session identifier */
  id: string
  
  /** Session title/name */
  title: string
  
  /** Messages in this session */
  messages: Message[]
  
  /** ISO timestamp when session was created */
  createdAt: string
  
  /** ISO timestamp when session was last updated */
  updatedAt: string
}

export interface MemorySummary {
  /** Unique identifier for the summary */
  id: string
  
  /** Condensed context summary (no PII) */
  summary: string
  
  /** Topics or themes covered */
  topics: string[]
  
  /** Key facts or preferences learned */
  keyFacts: string[]
  
  /** ISO timestamp when summary was created */
  createdAt: string
  
  /** Number of messages this summary represents */
  messageCount: number
  
  /** Reasoning trace for how this summary was created */
  reasoningTrace?: string
  
  /** Confidence in summary accuracy (0-100) */
  confidence?: number
}

export interface MemoryStore {
  /** Schema version for migration handling */
  version: string
  
  /** Memory schema version for compatibility */
  memoryVersion: string
  
  /** ISO timestamp when memory was last updated */
  lastUpdated: string
  
  /** ISO timestamp when memory expires */
  expiresAt: string
  
  /** Array of memory summaries */
  summaries: MemorySummary[]
  
  /** Whether memory is currently enabled */
  enabled: boolean
  
  /** Maximum number of summaries to retain */
  maxSummaries: number
}
