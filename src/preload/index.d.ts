import { ElectronAPI } from '@electron-toolkit/preload'
import type { AppSettings } from '../types/settings'
import type { Message, MemorySummary, MemoryStore } from '../types/chat'
import type { Agent, AgentRegistry, ToolRegistry } from '../types/agents'

interface AIAssistantAPI {
  // Ollama service functions
  checkOllamaStatus: () => Promise<{ connected: boolean; message: string; models?: string[] }>
  startOllama: () => Promise<{ success: boolean; message: string }>
  getOllamaModels: () => Promise<{ success: boolean; models: string[] }>
  pullModel: (modelName: string) => Promise<{ success: boolean }>
  
  // ChromaDB service functions
  checkChromaStatus: () => Promise<{ connected: boolean; message: string }>
  startChroma: () => Promise<{ success: boolean; message: string }>
  
  // Chat functions
  chatWithAI: (data: { message: string; model: string; history: any[] }) => 
    Promise<{ success: boolean; message: string }>
  searchContext: (query: string) => Promise<{ success: boolean; results: any[] }>
  
  // Secure storage API
  getSettings: () => Promise<AppSettings>
  saveSettings: (settings: AppSettings) => Promise<void>
  getChatHistory: () => Promise<Message[]>
  addMessageToHistory: (message: Message) => Promise<void>
  
  // Memory management API
  getMemoryStore: () => Promise<MemoryStore>
  addMemorySummary: (summary: MemorySummary) => Promise<void>
  clearMemory: () => Promise<void>
  updateMemorySettings: (enabled: boolean, retentionDays?: number) => Promise<void>
  getMemorySummaries: () => Promise<MemorySummary[]>
  summarizeMessages: (messages: Message[], model?: string) => Promise<{ success: boolean; summary?: MemorySummary; error?: string }>
  
  // Agent management API
  agentRegistryLoad: () => Promise<AgentRegistry>
  agentCreate: (agentData: Omit<Agent, 'id' | 'created_at' | 'updated_at' | 'metadata'>) => Promise<Agent>
  agentUpdate: (id: string, updates: Partial<Agent>) => Promise<Agent>
  agentDelete: (id: string) => Promise<void>
  agentClone: (id: string, newName: string) => Promise<Agent>
  agentSetActive: (id: string | null) => Promise<void>
  agentGetActive: () => Promise<Agent | null>
  agentGetAll: () => Promise<Agent[]>
  agentGetAvailableTools: () => Promise<ToolRegistry>
  agentValidateTool: (toolKey: string) => Promise<boolean>
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: AIAssistantAPI
  }
}
