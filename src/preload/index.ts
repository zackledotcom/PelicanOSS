import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import type { AppSettings } from '../types/settings'
import type { Message, MemorySummary, MemoryStore } from '../types/chat'
import type { Agent, AgentRegistry, ToolRegistry } from '../types/agents'

// Custom APIs for renderer
const api = {
  // Ollama service functions
  checkOllamaStatus: () => ipcRenderer.invoke('check-ollama-status'),
  startOllama: () => ipcRenderer.invoke('start-ollama'),
  getOllamaModels: () => ipcRenderer.invoke('get-ollama-models'),
  pullModel: (modelName: string) => ipcRenderer.invoke('pull-model', modelName),
  
  // ChromaDB service functions
  checkChromaStatus: () => ipcRenderer.invoke('check-chroma-status'),
  startChroma: () => ipcRenderer.invoke('start-chroma'),
  
  // Chat functions
  chatWithAI: (data: { message: string; model: string; history: any[] }) => 
    ipcRenderer.invoke('chat-with-ai', data),
  searchContext: (query: string) => ipcRenderer.invoke('search-context', query),
  
  // Secure storage API
  getSettings: (): Promise<AppSettings> => ipcRenderer.invoke('get-settings'),
  saveSettings: (settings: AppSettings): Promise<void> => ipcRenderer.invoke('save-settings', settings),
  getChatHistory: (): Promise<Message[]> => ipcRenderer.invoke('get-chat-history'),
  addMessageToHistory: (message: Message): Promise<void> => ipcRenderer.invoke('add-message-to-history', message),
  
  // Memory management API
  getMemoryStore: (): Promise<MemoryStore> => ipcRenderer.invoke('get-memory-store'),
  addMemorySummary: (summary: MemorySummary): Promise<void> => ipcRenderer.invoke('add-memory-summary', summary),
  clearMemory: (): Promise<void> => ipcRenderer.invoke('clear-memory'),
  updateMemorySettings: (enabled: boolean, retentionDays?: number): Promise<void> => 
    ipcRenderer.invoke('update-memory-settings', enabled, retentionDays),
  getMemorySummaries: (): Promise<MemorySummary[]> => ipcRenderer.invoke('get-memory-summaries'),
  summarizeMessages: (messages: Message[], model?: string): Promise<{ success: boolean; summary?: MemorySummary; error?: string }> => 
    ipcRenderer.invoke('summarize-messages', messages, model),
  
  // Agent management API
  agentRegistryLoad: (): Promise<AgentRegistry> => ipcRenderer.invoke('agent-registry-load'),
  agentCreate: (agentData: Omit<Agent, 'id' | 'created_at' | 'updated_at' | 'metadata'>): Promise<Agent> => 
    ipcRenderer.invoke('agent-create', agentData),
  agentUpdate: (id: string, updates: Partial<Agent>): Promise<Agent> => 
    ipcRenderer.invoke('agent-update', id, updates),
  agentDelete: (id: string): Promise<void> => ipcRenderer.invoke('agent-delete', id),
  agentClone: (id: string, newName: string): Promise<Agent> => 
    ipcRenderer.invoke('agent-clone', id, newName),
  agentSetActive: (id: string | null): Promise<void> => ipcRenderer.invoke('agent-set-active', id),
  agentGetActive: (): Promise<Agent | null> => ipcRenderer.invoke('agent-get-active'),
  agentGetAll: (): Promise<Agent[]> => ipcRenderer.invoke('agent-get-all'),
  agentGetAvailableTools: (): Promise<ToolRegistry> => ipcRenderer.invoke('agent-get-available-tools'),
  agentValidateTool: (toolKey: string): Promise<boolean> => ipcRenderer.invoke('agent-validate-tool', toolKey)
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
