export interface Agent {
  /** Auto-generated unique identifier */
  id: string
  
  /** User-defined agent name (must be unique) */
  name: string
  
  /** Short description of agent's purpose */
  description: string
  
  /** AI model type to use */
  model: 'ollama' | 'claude' | 'hybrid'
  
  /** Raw system prompt string */
  system_prompt: string
  
  /** Whether agent can access memory system */
  memory_enabled: boolean
  
  /** Array of allowed tool keys */
  tools: string[]
  
  /** ISO timestamp when agent was created */
  created_at: string
  
  /** ISO timestamp when agent was last modified */
  updated_at: string
  
  /** Whether agent is currently active */
  is_active?: boolean
  
  /** Agent configuration metadata */
  metadata?: {
    version: string
    creator: string
    usage_count: number
    last_used?: string
  }
}

export interface AgentRegistry {
  /** Schema version for migration handling */
  version: string
  
  /** Array of all agents */
  agents: Agent[]
  
  /** Currently active agent ID */
  active_agent_id: string | null
  
  /** Registry metadata */
  metadata: {
    created_at: string
    last_updated: string
    total_agents: number
  }
}

export type AgentModel = Agent['model']

/** Available tool categories and their keys */
export interface ToolRegistry {
  chroma: string[]
  file: string[]
  ollama: string[]
  system: string[]
  memory: string[]
  network: string[]
}

/** Tool access validation */
export interface ToolAccess {
  category: keyof ToolRegistry
  key: string
  description: string
  requires_permission: boolean
}
