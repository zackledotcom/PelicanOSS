/**
 * Model Context Protocol (MCP) Type Definitions
 * Following PelicanOS privacy-first architecture
 */

export interface MCPServer {
  name: string
  command: string
  args: string[]
  isRunning: boolean
  description?: string
}

export interface MCPServerStatus {
  isRunning: boolean
  exists: boolean
  lastStarted?: number
  lastError?: string
}

export interface MCPThinkingRequest {
  prompt: string
  context?: string
  maxSteps?: number
}

export interface MCPThoughtStep {
  step: number
  thought: string
  reasoning: string
  timestamp?: number
}

export interface MCPThinkingResponse {
  success: boolean
  thoughts?: MCPThoughtStep[]
  finalAnswer?: string
  error?: string
  processingTime?: number
}

export interface MCPServiceStatus {
  servers: Record<string, MCPServerStatus>
  totalServers: number
  runningServers: number
  availableServers: string[]
}

// API Response types
export interface MCPStartServerResponse {
  success: boolean
  error?: string
  serverName?: string
}

export interface MCPStopServerResponse {
  success: boolean
  error?: string
  serverName?: string
}

// Configuration types
export interface MCPConfig {
  enabled: boolean
  autoStart: boolean
  servers: {
    [serverName: string]: {
      enabled: boolean
      autoStart: boolean
      timeout: number
    }
  }
}

// Error types
export interface MCPError {
  code: string
  message: string
  details?: any
  timestamp: number
}
