import { app } from 'electron'
import { join } from 'path'
import { readFile, writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import { v4 as uuidv4 } from 'uuid'
import type { Agent, AgentRegistry, ToolRegistry } from '../types/agents'

const STORAGE_VERSION = '1.0.0'
const AGENTS_FILE = 'agents.json'

// Available tools registry - expandable for Phase 7-B
const AVAILABLE_TOOLS: ToolRegistry = {
  chroma: ['query', 'add', 'delete', 'list_collections'],
  file: ['read', 'write', 'list', 'search', 'move', 'delete'],
  ollama: ['generate', 'list_models', 'pull_model', 'summarize'],
  system: ['execute_command', 'get_processes', 'kill_process'],
  memory: ['get_summaries', 'add_summary', 'clear_memory'],
  network: ['http_request', 'websocket_connect', 'ping']
}

function getUserDataPath(): string {
  return app.getPath('userData')
}

function getAgentsPath(): string {
  return join(getUserDataPath(), AGENTS_FILE)
}

async function ensureStorageDirectory(): Promise<void> {
  const userDataPath = getUserDataPath()
  if (!existsSync(userDataPath)) {
    await mkdir(userDataPath, { recursive: true })
  }
}

function getDefaultAgentRegistry(): AgentRegistry {
  const now = new Date().toISOString()
  
  return {
    version: STORAGE_VERSION,
    agents: [],
    active_agent_id: null,
    metadata: {
      created_at: now,
      last_updated: now,
      total_agents: 0
    }
  }
}

function validateAgent(agent: Partial<Agent>): { valid: boolean; errors: string[] } {
  const errors: string[] = []
  
  // Required fields validation
  if (!agent.name || typeof agent.name !== 'string' || agent.name.trim().length === 0) {
    errors.push('Agent name is required')
  }
  
  if (!agent.model || !['ollama', 'claude', 'hybrid'].includes(agent.model)) {
    errors.push('Valid model selection is required (ollama, claude, or hybrid)')
  }
  
  if (!agent.system_prompt || typeof agent.system_prompt !== 'string' || agent.system_prompt.trim().length === 0) {
    errors.push('System prompt is required')
  }
  
  // Tool validation
  if (agent.tools && Array.isArray(agent.tools)) {
    for (const tool of agent.tools) {
      const [category, key] = tool.split('.')
      if (!AVAILABLE_TOOLS[category as keyof ToolRegistry]?.includes(key)) {
        errors.push(`Invalid tool: ${tool}`)
      }
    }
  }
  
  return { valid: errors.length === 0, errors }
}

function isValidAgentRegistry(data: any): data is AgentRegistry {
  return (
    typeof data === 'object' &&
    data !== null &&
    typeof data.version === 'string' &&
    Array.isArray(data.agents) &&
    data.agents.every((agent: any) => validateAgent(agent).valid) &&
    (data.active_agent_id === null || typeof data.active_agent_id === 'string') &&
    typeof data.metadata === 'object' &&
    data.metadata !== null
  )
}

export async function loadAgentRegistry(): Promise<AgentRegistry> {
  try {
    await ensureStorageDirectory()
    const agentsPath = getAgentsPath()
    
    if (!existsSync(agentsPath)) {
      console.log('📋 Agent registry not found, creating default registry')
      const defaultRegistry = getDefaultAgentRegistry()
      await saveAgentRegistry(defaultRegistry)
      return defaultRegistry
    }
    
    const fileContent = await readFile(agentsPath, 'utf-8')
    const parsedData = JSON.parse(fileContent)
    
    if (!isValidAgentRegistry(parsedData)) {
      console.warn('⚠️ Invalid agent registry format detected, resetting to default')
      const defaultRegistry = getDefaultAgentRegistry()
      await saveAgentRegistry(defaultRegistry)
      return defaultRegistry
    }
    
    console.log(`✅ Agent registry loaded: ${parsedData.agents.length} agents`)
    return parsedData
  } catch (error) {
    console.error('❌ Failed to load agent registry:', error)
    const defaultRegistry = getDefaultAgentRegistry()
    await saveAgentRegistry(defaultRegistry)
    return defaultRegistry
  }
}

export async function saveAgentRegistry(registry: AgentRegistry): Promise<void> {
  try {
    await ensureStorageDirectory()
    const agentsPath = getAgentsPath()
    
    // Update metadata
    const updatedRegistry = {
      ...registry,
      version: STORAGE_VERSION,
      metadata: {
        ...registry.metadata,
        last_updated: new Date().toISOString(),
        total_agents: registry.agents.length
      }
    }
    
    await writeFile(agentsPath, JSON.stringify(updatedRegistry, null, 2), 'utf-8')
    console.log('💾 Agent registry saved successfully')
  } catch (error) {
    console.error('❌ Failed to save agent registry:', error)
    throw error
  }
}

export async function createAgent(agentData: Omit<Agent, 'id' | 'created_at' | 'updated_at' | 'metadata'>): Promise<Agent> {
  const validation = validateAgent(agentData)
  if (!validation.valid) {
    throw new Error(`Agent validation failed: ${validation.errors.join(', ')}`)
  }
  
  const registry = await loadAgentRegistry()
  
  // Check for duplicate names
  if (registry.agents.some(agent => agent.name.toLowerCase() === agentData.name.toLowerCase())) {
    throw new Error(`Agent with name "${agentData.name}" already exists`)
  }
  
  const now = new Date().toISOString()
  const newAgent: Agent = {
    id: uuidv4(),
    ...agentData,
    created_at: now,
    updated_at: now,
    metadata: {
      version: STORAGE_VERSION,
      creator: 'user',
      usage_count: 0
    }
  }
  
  registry.agents.push(newAgent)
  await saveAgentRegistry(registry)
  
  console.log(`🤖 Created agent: ${newAgent.name} (${newAgent.id})`)
  return newAgent
}

export async function updateAgent(id: string, updates: Partial<Agent>): Promise<Agent> {
  const registry = await loadAgentRegistry()
  const agentIndex = registry.agents.findIndex(agent => agent.id === id)
  
  if (agentIndex === -1) {
    throw new Error(`Agent with id "${id}" not found`)
  }
  
  const updatedAgent = {
    ...registry.agents[agentIndex],
    ...updates,
    updated_at: new Date().toISOString()
  }
  
  const validation = validateAgent(updatedAgent)
  if (!validation.valid) {
    throw new Error(`Agent validation failed: ${validation.errors.join(', ')}`)
  }
  
  // Check for duplicate names (excluding current agent)
  if (updates.name && registry.agents.some(agent => 
    agent.id !== id && agent.name.toLowerCase() === updates.name!.toLowerCase()
  )) {
    throw new Error(`Agent with name "${updates.name}" already exists`)
  }
  
  registry.agents[agentIndex] = updatedAgent
  await saveAgentRegistry(registry)
  
  console.log(`📝 Updated agent: ${updatedAgent.name} (${id})`)
  return updatedAgent
}

export async function deleteAgent(id: string): Promise<void> {
  const registry = await loadAgentRegistry()
  const agentIndex = registry.agents.findIndex(agent => agent.id === id)
  
  if (agentIndex === -1) {
    throw new Error(`Agent with id "${id}" not found`)
  }
  
  const agentName = registry.agents[agentIndex].name
  registry.agents.splice(agentIndex, 1)
  
  // Clear active agent if deleted
  if (registry.active_agent_id === id) {
    registry.active_agent_id = null
  }
  
  await saveAgentRegistry(registry)
  console.log(`🗑️ Deleted agent: ${agentName} (${id})`)
}

export async function cloneAgent(id: string, newName: string): Promise<Agent> {
  const registry = await loadAgentRegistry()
  const sourceAgent = registry.agents.find(agent => agent.id === id)
  
  if (!sourceAgent) {
    throw new Error(`Agent with id "${id}" not found`)
  }
  
  const clonedAgentData = {
    name: newName,
    description: `${sourceAgent.description} (Clone)`,
    model: sourceAgent.model,
    system_prompt: sourceAgent.system_prompt,
    memory_enabled: sourceAgent.memory_enabled,
    tools: [...sourceAgent.tools]
  }
  
  return await createAgent(clonedAgentData)
}

export async function setActiveAgent(id: string | null): Promise<void> {
  const registry = await loadAgentRegistry()
  
  if (id !== null) {
    const agent = registry.agents.find(a => a.id === id)
    if (!agent) {
      throw new Error(`Agent with id "${id}" not found`)
    }
    
    // Update usage count
    agent.metadata = {
      ...agent.metadata,
      usage_count: (agent.metadata?.usage_count || 0) + 1,
      last_used: new Date().toISOString()
    }
  }
  
  registry.active_agent_id = id
  await saveAgentRegistry(registry)
  
  console.log(`🎯 Active agent set to: ${id ? registry.agents.find(a => a.id === id)?.name : 'None'}`)
}

export async function getActiveAgent(): Promise<Agent | null> {
  const registry = await loadAgentRegistry()
  if (!registry.active_agent_id) return null
  
  return registry.agents.find(agent => agent.id === registry.active_agent_id) || null
}

export async function getAllAgents(): Promise<Agent[]> {
  const registry = await loadAgentRegistry()
  return registry.agents
}

export function getAvailableTools(): ToolRegistry {
  return AVAILABLE_TOOLS
}

export function validateToolKey(toolKey: string): boolean {
  const [category, key] = toolKey.split('.')
  return AVAILABLE_TOOLS[category as keyof ToolRegistry]?.includes(key) || false
}
