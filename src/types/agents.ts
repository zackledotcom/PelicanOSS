// Agent-related type definitions
export interface Agent {
  id: string
  name: string
  description: string
  model: string
  systemPrompt: string  // Changed from system_prompt to match frontend convention
  temperature: number
  maxTokens: number     // Changed from max_tokens to match frontend convention
  tools: string[]
  createdAt: Date       // Changed from created_at to match frontend convention
  updatedAt: Date       // Changed from updated_at to match frontend convention
  metadata: AgentMetadata
}

export interface AgentMetadata {
  version: string
  author: string
  tags: string[]
  category: string
  avatar?: string
  isActive?: boolean
  memoryEnabled?: boolean  // Added property used by the component
  usageCount?: number      // Added property used by the component
  lastUsed?: string        // Added property used by the component
}

export interface ToolRegistry {
  [key: string]: ToolDefinition
}

export interface ToolDefinition {
  name: string
  description: string
  parameters: ToolParameter[]
  category: string
  requiresPermission: boolean
}

export interface ToolParameter {
  name: string
  type: 'string' | 'number' | 'boolean' | 'array' | 'object'
  description: string
  required: boolean
  default?: any
}

export interface AgentRegistry {
  agents: Agent[]
  activeAgentId: string | null
  tools: ToolRegistry
  version: string
}
