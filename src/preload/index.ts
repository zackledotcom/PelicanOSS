import { contextBridge, ipcRenderer } from 'electron'
import type { AppSettings } from '../types/settings'
import type { Message, MemorySummary, MemoryStore } from '../types/chat'
import type { Agent, AgentRegistry, ToolRegistry } from '../types/agents'
import { z } from 'zod'

// ===============================
// 1. Strict Schema Validation
// ===============================

const schemas = {
  chat: z.object({
    message: z.string().min(1).max(2000),
    model: z.string().min(1).max(100),
    history: z.array(z.any()).max(100)
  }),
  enhancedChat: z.object({
    message: z.string().min(1).max(2000),
    model: z.string().min(1).max(100),
    history: z.array(z.any()).max(100).optional(),
    mode: z.string().optional(),
    memoryOptions: z
      .object({
        enabled: z.boolean().optional(),
        contextLength: z.number().optional(),
        smartFilter: z.boolean().optional(),
        debugMode: z.boolean().optional()
      })
      .optional()
  }),
  streamChat: z.object({
    message: z.string().min(1).max(2000),
    model: z.string().min(1).max(100),
    streamId: z.string().min(1).max(100)
  }),
  agentCreate: z.object({
    name: z.string().min(1).max(100),
    model: z.string().min(1).max(100),
    system_prompt: z.string().max(5000),
    tools: z.array(z.string()).max(10)
  }),
  agentUpdate: z.object({
    name: z.string().min(1).max(100).optional(),
    model: z.string().min(1).max(100).optional(),
    system_prompt: z.string().max(5000).optional(),
    tools: z.array(z.string()).max(10).optional()
  }),
  uuid: z.string().uuid(),
  searchQuery: z.string().min(1).max(500),
  memoryEnrich: z.object({
    prompt: z.string().min(1).max(2000),
    options: z
      .object({
        enabled: z.boolean().optional(),
        contextLength: z.number().optional(),
        smartFilter: z.boolean().optional(),
        debugMode: z.boolean().optional()
      })
      .optional()
  }),
  mcpThinkingRequest: z.object({
    prompt: z.string().min(1).max(5000),
    context: z.string().max(2000).optional(),
    maxSteps: z.number().min(1).max(10).optional()
  })
} as const

// ===============================
// 2. Hardened IPC Wrapper
// ===============================

function createIpcInvoke<Input, Output>(
  channel: string,
  inputSchema: z.Schema<Input>,
  rateLimitChannel: string
): (input: Input) => Promise<Output> {
  return async (input: Input) => {
    rateLimit(rateLimitChannel)
    const parsed = inputSchema.safeParse(input)
    if (!parsed.success) {
      throw new Error(`IPC validation failed on ${channel}: ${parsed.error}`)
    }
    try {
      const result = await ipcRenderer.invoke(channel, parsed.data)
      return result as Output
    } catch (err: any) {
      throw new Error(`IPC error on ${channel}: ${err?.message || err}`)
    }
  }
}

const callTracker = new Map<string, { count: number; last: number }>()
function rateLimit(channel: string, maxPerSecond = 10) {
  const now = Date.now()
  const entry = callTracker.get(channel) || { count: 0, last: now }
  if (now - entry.last < 1000) entry.count += 1
  else entry.count = 1
  entry.last = now
  callTracker.set(channel, entry)
  if (entry.count > maxPerSecond) {
    throw new Error(`Rate limit exceeded for ${channel} (${entry.count}/sec)`)
  }
}

// ===============================
// 3. API Surface – Fully Typed, Validated, No Leakage
// ===============================

const api = {
  // Ollama service functions
  checkOllamaStatus: (): Promise<{ connected: boolean; message: string; models?: string[] }> => {
    rateLimit('check-ollama-status')
    return ipcRenderer.invoke('check-ollama-status')
  },
  startOllama: (): Promise<{ success: boolean; message: string }> => {
    rateLimit('start-ollama')
    return ipcRenderer.invoke('start-ollama')
  },
  getOllamaModels: (): Promise<{ success: boolean; models: string[] }> => {
    rateLimit('get-ollama-models')
    return ipcRenderer.invoke('get-ollama-models')
  },
  pullModel: async (modelName: string): Promise<boolean> => {
    rateLimit('pull-model')
    const name = z.string().min(1).max(100).parse(modelName)
    return ipcRenderer.invoke('pull-model', name)
  },

  // ChromaDB service functions
  checkChromaStatus: (): Promise<{ connected: boolean; message: string; version?: string }> => {
    rateLimit('check-chroma-status')
    return ipcRenderer.invoke('check-chroma-status')
  },
  startChroma: (): Promise<{ success: boolean; message: string }> => {
    rateLimit('start-chroma')
    return ipcRenderer.invoke('start-chroma')
  },

  // Enhanced chat functions
  chatWithAI: (
    data: z.infer<typeof schemas.enhancedChat>
  ): Promise<{
    success: boolean
    response: string
    model: string
    timestamp: string
    memoryContext?: any
  }> => {
    rateLimit('chat-with-ai')
    const parsed = schemas.enhancedChat.parse(data)
    return ipcRenderer.invoke('chat-with-ai', parsed)
  },

  // Streaming chat functions
  startChatStream: (
    data: z.infer<typeof schemas.streamChat>
  ): Promise<{ success: boolean; streamId: string; error?: string }> => {
    rateLimit('start-chat-stream')
    const parsed = schemas.streamChat.parse(data)
    return ipcRenderer.invoke('start-chat-stream', parsed)
  },
  stopChatStream: (streamId: string): Promise<{ success: boolean; error?: string }> => {
    rateLimit('stop-chat-stream')
    const safeStreamId = z.string().min(1).max(100).parse(streamId)
    return ipcRenderer.invoke('stop-chat-stream', safeStreamId)
  },

  // Memory service functions
  searchMemory: (
    query: string,
    limit?: number
  ): Promise<{ success: boolean; results?: string[]; error?: string }> => {
    rateLimit('search-memory')
    const safeQuery = z.string().min(1).max(500).parse(query)
    const safeLimit = limit ? z.number().min(1).max(20).parse(limit) : undefined
    return ipcRenderer.invoke('search-memory', safeQuery, safeLimit)
  },
  createMemorySummary: (
    messages: Message[]
  ): Promise<{ success: boolean; summary?: MemorySummary; error?: string }> => {
    rateLimit('create-memory-summary')
    const safeMessages = z.array(z.any()).max(100).parse(messages)
    return ipcRenderer.invoke('create-memory-summary', safeMessages)
  },
  enrichWithMemory: (
    data: z.infer<typeof schemas.memoryEnrich>
  ): Promise<{ success: boolean; result?: any; error?: string }> => {
    rateLimit('enrich-with-memory')
    const parsed = schemas.memoryEnrich.parse(data)
    return ipcRenderer.invoke('enrich-with-memory', parsed)
  },

  // Model avatar functions
  getModelAvatar: (
    modelName: string
  ): Promise<{ success: boolean; avatar?: any; error?: string }> => {
    rateLimit('get-model-avatar')
    const safeModelName = z.string().min(1).max(100).parse(modelName)
    return ipcRenderer.invoke('get-model-avatar', safeModelName)
  },

  // Agent management functions
  getAgentRegistry: (): Promise<{ success: boolean; registry?: any; error?: string }> => {
    rateLimit('get-agent-registry')
    return ipcRenderer.invoke('get-agent-registry')
  },
  createAgent: (agentData: any): Promise<{ success: boolean; agent?: any; error?: string }> => {
    rateLimit('create-agent')
    return ipcRenderer.invoke('create-agent', agentData)
  },
  updateAgent: (
    agentId: string,
    updates: any
  ): Promise<{ success: boolean; agent?: any; error?: string }> => {
    rateLimit('update-agent')
    const safeAgentId = z.string().min(1).max(100).parse(agentId)
    return ipcRenderer.invoke('update-agent', safeAgentId, updates)
  },
  deleteAgent: (agentId: string): Promise<{ success: boolean; error?: string }> => {
    rateLimit('delete-agent')
    const safeAgentId = z.string().min(1).max(100).parse(agentId)
    return ipcRenderer.invoke('delete-agent', safeAgentId)
  },
  executeAgentTool: (
    agentId: string,
    toolName: string,
    params: any
  ): Promise<{ success: boolean; result?: any; error?: string }> => {
    rateLimit('execute-agent-tool')
    const safeAgentId = z.string().min(1).max(100).parse(agentId)
    const safeToolName = z.string().min(1).max(100).parse(toolName)
    return ipcRenderer.invoke('execute-agent-tool', safeAgentId, safeToolName, params)
  },
  getAvailableTools: (): Promise<{ success: boolean; tools?: any; error?: string }> => {
    rateLimit('get-available-tools')
    return ipcRenderer.invoke('get-available-tools')
  },

  // Enhanced agent management functions
  getAgentAuditLog: (
    limit?: number
  ): Promise<{ success: boolean; auditLog?: any[]; error?: string }> => {
    rateLimit('get-agent-audit-log')
    const safeLimit = limit ? z.number().min(1).max(1000).parse(limit) : undefined
    return ipcRenderer.invoke('get-agent-audit-log', safeLimit)
  },
  getToolSecurityInfo: (
    toolKey: string
  ): Promise<{ success: boolean; info?: any; error?: string }> => {
    rateLimit('get-tool-security-info')
    const safeToolKey = z.string().min(1).max(100).parse(toolKey)
    return ipcRenderer.invoke('get-tool-security-info', safeToolKey)
  },
  getAllToolsWithSecurity: (): Promise<{ success: boolean; tools?: any; error?: string }> => {
    rateLimit('get-all-tools-with-security')
    return ipcRenderer.invoke('get-all-tools-with-security')
  },
  updateSecurityConfig: (config: any): Promise<{ success: boolean; error?: string }> => {
    rateLimit('update-security-config')
    return ipcRenderer.invoke('update-security-config', config)
  },
  getSecurityConfig: (): Promise<{ success: boolean; config?: any; error?: string }> => {
    rateLimit('get-security-config')
    return ipcRenderer.invoke('get-security-config')
  },
  cloneAgent: (
    agentId: string,
    newName: string
  ): Promise<{ success: boolean; agent?: any; error?: string }> => {
    rateLimit('clone-agent')
    const safeAgentId = z.string().min(1).max(100).parse(agentId)
    const safeNewName = z.string().min(1).max(100).parse(newName)
    return ipcRenderer.invoke('clone-agent', safeAgentId, safeNewName)
  },
  setActiveAgent: (agentId: string | null): Promise<{ success: boolean; error?: string }> => {
    rateLimit('set-active-agent')
    const safeAgentId = agentId ? z.string().min(1).max(100).parse(agentId) : null
    return ipcRenderer.invoke('set-active-agent', safeAgentId)
  },
  getActiveAgent: (): Promise<{ success: boolean; agent?: any; error?: string }> => {
    rateLimit('get-active-agent')
    return ipcRenderer.invoke('get-active-agent')
  },

  // Streaming event listeners
  onChatStreamChunk: (callback: (data: any) => void): (() => void) => {
    const listener = (event: Electron.IpcRendererEvent, data: any) => callback(data)
    ipcRenderer.on('chat-stream-chunk', listener)
    return () => ipcRenderer.removeListener('chat-stream-chunk', listener)
  },
  onChatStreamComplete: (callback: (data: any) => void): (() => void) => {
    const listener = (event: Electron.IpcRendererEvent, data: any) => callback(data)
    ipcRenderer.on('chat-stream-complete', listener)
    return () => ipcRenderer.removeListener('chat-stream-complete', listener)
  },
  onChatStreamError: (callback: (data: any) => void): (() => void) => {
    const listener = (event: Electron.IpcRendererEvent, data: any) => callback(data)
    ipcRenderer.on('chat-stream-error', listener)
    return () => ipcRenderer.removeListener('chat-stream-error', listener)
  },

  // Tool confirmation event listeners
  onToolConfirmationRequest: (callback: (data: any) => void): (() => void) => {
    const listener = (event: Electron.IpcRendererEvent, data: any) => callback(data)
    ipcRenderer.on('tool-confirmation-request', listener)
    return () => ipcRenderer.removeListener('tool-confirmation-request', listener)
  },

  // Secure storage API
  getSettings: (): Promise<AppSettings> => {
    rateLimit('get-settings')
    return ipcRenderer.invoke('get-settings')
  },
  saveSettings: (settings: AppSettings): Promise<void> => {
    rateLimit('save-settings')
    return ipcRenderer.invoke('save-settings', settings)
  },
  getChatHistory: (): Promise<Message[]> => {
    rateLimit('get-chat-history')
    return ipcRenderer.invoke('get-chat-history')
  },
  addMessageToHistory: (message: Message): Promise<void> => {
    rateLimit('add-message-to-history')
    return ipcRenderer.invoke('add-message-to-history', message)
  },

  // Memory management API
  getMemoryStore: (): Promise<MemoryStore> => {
    rateLimit('get-memory-store')
    return ipcRenderer.invoke('get-memory-store')
  },
  addMemorySummary: (summary: MemorySummary): Promise<void> => {
    rateLimit('add-memory-summary')
    return ipcRenderer.invoke('add-memory-summary', summary)
  },
  clearMemory: (): Promise<void> => {
    rateLimit('clear-memory')
    return ipcRenderer.invoke('clear-memory')
  },
  updateMemorySettings: (enabled: boolean, retentionDays?: number): Promise<void> => {
    rateLimit('update-memory-settings')
    return ipcRenderer.invoke('update-memory-settings', enabled, retentionDays)
  },
  getMemorySummaries: (): Promise<MemorySummary[]> => {
    rateLimit('get-memory-summaries')
    return ipcRenderer.invoke('get-memory-summaries')
  },
  summarizeMessages: (
    messages: Message[],
    model?: string
  ): Promise<{ success: boolean; summary?: MemorySummary; error?: string }> => {
    rateLimit('summarize-messages')
    return ipcRenderer.invoke('summarize-messages', messages, model)
  },

  // Agent management API
  agentRegistryLoad: (): Promise<AgentRegistry> => {
    rateLimit('agent-registry-load')
    return ipcRenderer.invoke('agent-registry-load')
  },
  agentCreate: createIpcInvoke<typeof schemas.agentCreate._type, Agent>(
    'agent-create',
    schemas.agentCreate,
    'agent-create'
  ),
  agentUpdate: async (id: string, updates: Partial<Agent>): Promise<Agent> => {
    rateLimit('agent-update')
    const safeId = schemas.uuid.parse(id)
    const sanitized = schemas.agentUpdate.parse(updates)
    return ipcRenderer.invoke('agent-update', safeId, sanitized)
  },
  agentDelete: (id: string): Promise<void> => {
    rateLimit('agent-delete')
    const safeId = schemas.uuid.parse(id)
    return ipcRenderer.invoke('agent-delete', safeId)
  },
  agentClone: (id: string, newName: string): Promise<Agent> => {
    rateLimit('agent-clone')
    const safeId = schemas.uuid.parse(id)
    const safeName = z.string().min(1).max(100).parse(newName)
    return ipcRenderer.invoke('agent-clone', safeId, safeName)
  },
  agentSetActive: (id: string | null): Promise<void> => {
    rateLimit('agent-set-active')
    return id
      ? ipcRenderer.invoke('agent-set-active', schemas.uuid.parse(id))
      : ipcRenderer.invoke('agent-set-active', null)
  },
  agentGetActive: (): Promise<Agent | null> => {
    rateLimit('agent-get-active')
    return ipcRenderer.invoke('agent-get-active')
  },
  agentGetAll: (): Promise<Agent[]> => {
    rateLimit('agent-get-all')
    return ipcRenderer.invoke('agent-get-all')
  },
  agentGetAvailableTools: (): Promise<ToolRegistry> => {
    rateLimit('agent-get-available-tools')
    return ipcRenderer.invoke('agent-get-available-tools')
  },
  agentValidateTool: (toolKey: string): Promise<boolean> => {
    rateLimit('agent-validate-tool')
    return ipcRenderer.invoke('agent-validate-tool', z.string().min(1).max(100).parse(toolKey))
  },

  // Rate limiting monitoring (for debugging/admin purposes)
  getRateLimitStatus: (): Promise<Record<string, any>> =>
    ipcRenderer.invoke('get-rate-limit-status'),

  resetRateLimits: (key?: string): Promise<void> => ipcRenderer.invoke('reset-rate-limits', key),

  // System diagnostics and monitoring
  getSystemDiagnostics: (): Promise<any> => ipcRenderer.invoke('get-system-diagnostics'),

  exportTelemetry: (options: any): Promise<string> =>
    ipcRenderer.invoke('export-telemetry', options),

  exportAudit: (options: any): Promise<string> => ipcRenderer.invoke('export-audit', options),

  searchLogs: (query: any): Promise<any[]> => ipcRenderer.invoke('search-logs', query),

  forceModelHealthCheck: (): Promise<any> => ipcRenderer.invoke('force-model-health-check'),

  // Development error simulation
  ...(process.env.NODE_ENV === 'development'
    ? {
        simulateError: (errorType: string): Promise<void> =>
          ipcRenderer.invoke('simulate-error', errorType)
      }
    : {}),

  // Reddit service API
  redditAuthenticate: (credentials: any): Promise<{ success: boolean }> =>
    ipcRenderer.invoke('reddit:authenticate', credentials),

  redditListDMs: (limit?: number): Promise<any> => ipcRenderer.invoke('reddit:list_dms', limit),

  redditReadDM: (messageId: string): Promise<any> =>
    ipcRenderer.invoke('reddit:read_dm', messageId),

  redditSendDM: (recipient: string, subject: string, message: string): Promise<any> =>
    ipcRenderer.invoke('reddit:send_dm', recipient, subject, message),

  redditReplyDM: (messageId: string, replyText: string): Promise<any> =>
    ipcRenderer.invoke('reddit:reply_dm', messageId, replyText),

  redditGetUnread: (): Promise<any> => ipcRenderer.invoke('reddit:get_unread'),

  redditDisconnect: (): Promise<{ success: boolean }> => ipcRenderer.invoke('reddit:disconnect'),

  redditGetStatus: (): Promise<any> => ipcRenderer.invoke('reddit:get_status'),

  // Reddit Agent API
  redditAgentStart: (): Promise<{ success: boolean }> => ipcRenderer.invoke('reddit-agent:start'),

  redditAgentStop: (): Promise<{ success: boolean }> => ipcRenderer.invoke('reddit-agent:stop'),

  redditAgentGetConfig: (): Promise<any> => ipcRenderer.invoke('reddit-agent:get_config'),

  redditAgentUpdateConfig: (config: any): Promise<{ success: boolean }> =>
    ipcRenderer.invoke('reddit-agent:update_config', config),

  redditAgentGetStats: (): Promise<any> => ipcRenderer.invoke('reddit-agent:get_stats'),

  redditAgentSendManualReply: (
    recipient: string,
    subject: string,
    message: string
  ): Promise<{ success: boolean }> =>
    ipcRenderer.invoke('reddit-agent:send_manual_reply', recipient, subject, message),

  redditAgentTestConnection: (): Promise<{ success: boolean }> =>
    ipcRenderer.invoke('reddit-agent:test_connection'),

  // Workflow Engine API
  workflowCreate: (workflowData: any): Promise<any> =>
    ipcRenderer.invoke('workflow:create', workflowData),

  workflowCreateFromTemplate: (templateName: string, variables: any): Promise<any> =>
    ipcRenderer.invoke('workflow:create-from-template', templateName, variables),

  workflowGetAll: (): Promise<any> => ipcRenderer.invoke('workflow:get-all'),

  workflowGet: (id: string): Promise<any> => ipcRenderer.invoke('workflow:get', id),

  workflowUpdate: (id: string, updates: any): Promise<any> =>
    ipcRenderer.invoke('workflow:update', id, updates),

  workflowDelete: (id: string): Promise<any> => ipcRenderer.invoke('workflow:delete', id),

  workflowTrigger: (workflowId: string, input: any): Promise<any> =>
    ipcRenderer.invoke('workflow:trigger', workflowId, input),

  workflowGetExecutions: (workflowId?: string, limit?: number): Promise<any> =>
    ipcRenderer.invoke('workflow:get-executions', workflowId, limit),

  workflowGetExecution: (id: string): Promise<any> =>
    ipcRenderer.invoke('workflow:get-execution', id),

  workflowCancelExecution: (id: string): Promise<any> =>
    ipcRenderer.invoke('workflow:cancel-execution', id),

  workflowEmitEvent: (eventName: string, data: any): Promise<any> =>
    ipcRenderer.invoke('workflow:emit-event', eventName, data),

  workflowGetStats: (): Promise<any> => ipcRenderer.invoke('workflow:get-stats'),

  workflowGetTemplates: (): Promise<any> => ipcRenderer.invoke('workflow:get-templates'),

  workflowValidate: (workflowId: string, testInput: any): Promise<any> =>
    ipcRenderer.invoke('workflow:validate', workflowId, testInput),

  // Model Tuning API
  getAvailableModelsForTuning: (): Promise<string[]> => {
    rateLimit('get-available-models-for-tuning')
    return ipcRenderer.invoke('get-available-models-for-tuning')
  },
  getAllTuningDatasets: (): Promise<any[]> => {
    rateLimit('get-all-tuning-datasets')
    return ipcRenderer.invoke('get-all-tuning-datasets')
  },
  getTuningDataset: (id: string): Promise<any> => {
    rateLimit('get-tuning-dataset')
    const safeId = z.string().min(1).max(100).parse(id)
    return ipcRenderer.invoke('get-tuning-dataset', safeId)
  },
  createTuningDataset: (params: {
    name: string
    description: string
    examples?: any[]
  }): Promise<any> => {
    rateLimit('create-tuning-dataset')
    const safeName = z.string().min(1).max(200).parse(params.name)
    const safeDescription = z.string().max(1000).parse(params.description)
    return ipcRenderer.invoke('create-tuning-dataset', {
      name: safeName,
      description: safeDescription,
      examples: params.examples || []
    })
  },
  updateTuningDataset: (params: { id: string; updates: any }): Promise<any> => {
    rateLimit('update-tuning-dataset')
    const safeId = z.string().min(1).max(100).parse(params.id)
    return ipcRenderer.invoke('update-tuning-dataset', { id: safeId, updates: params.updates })
  },
  deleteTuningDataset: (id: string): Promise<boolean> => {
    rateLimit('delete-tuning-dataset')
    const safeId = z.string().min(1).max(100).parse(id)
    return ipcRenderer.invoke('delete-tuning-dataset', safeId)
  },
  getAllTuningJobs: (): Promise<any[]> => {
    rateLimit('get-all-tuning-jobs')
    return ipcRenderer.invoke('get-all-tuning-jobs')
  },
  startTuningJob: (params: {
    baseModel: string
    newModelName: string
    datasetId: string
    epochs: number
    learningRate: number
    batchSize: number
  }): Promise<any> => {
    rateLimit('start-tuning-job')
    const safeBaseModel = z.string().min(1).max(100).parse(params.baseModel)
    const safeNewModelName = z.string().min(1).max(100).parse(params.newModelName)
    const safeDatasetId = z.string().min(1).max(100).parse(params.datasetId)
    const safeEpochs = z.number().min(1).max(20).parse(params.epochs)
    const safeLearningRate = z.number().min(0.00001).max(1).parse(params.learningRate)
    const safeBatchSize = z.number().min(1).max(128).parse(params.batchSize)

    return ipcRenderer.invoke('start-tuning-job', {
      baseModel: safeBaseModel,
      newModelName: safeNewModelName,
      datasetId: safeDatasetId,
      epochs: safeEpochs,
      learningRate: safeLearningRate,
      batchSize: safeBatchSize
    })
  },
  cancelTuningJob: (id: string): Promise<boolean> => {
    rateLimit('cancel-tuning-job')
    const safeId = z.string().min(1).max(100).parse(id)
    return ipcRenderer.invoke('cancel-tuning-job', safeId)
  },
  deleteTuningJob: (id: string): Promise<boolean> => {
    rateLimit('delete-tuning-job')
    const safeId = z.string().min(1).max(100).parse(id)
    return ipcRenderer.invoke('delete-tuning-job', safeId)
  },
  exportTuningDataset: (id: string): Promise<string> => {
    rateLimit('export-tuning-dataset')
    const safeId = z.string().min(1).max(100).parse(id)
    return ipcRenderer.invoke('export-tuning-dataset', safeId)
  },
  importTuningDataset: (filePath: string): Promise<any> => {
    rateLimit('import-tuning-dataset')
    const safeFilePath = z.string().min(1).max(500).parse(filePath)
    return ipcRenderer.invoke('import-tuning-dataset', safeFilePath)
  },

  // File System API for Developer Mode
  fsReadFile: (
    filePath: string
  ): Promise<{ success: boolean; content?: string; error?: string }> => {
    rateLimit('fs-read-file')
    const safeFilePath = z.string().min(1).max(500).parse(filePath)
    return ipcRenderer.invoke('fs-read-file', safeFilePath)
  },
  fsWriteFile: (
    filePath: string,
    content: string
  ): Promise<{ success: boolean; error?: string }> => {
    rateLimit('fs-write-file')
    const safeFilePath = z.string().min(1).max(500).parse(filePath)
    const safeContent = z.string().max(1000000).parse(content) // 1MB limit
    return ipcRenderer.invoke('fs-write-file', safeFilePath, safeContent)
  },
  fsListDirectory: (
    dirPath: string
  ): Promise<{ success: boolean; files?: any[]; error?: string }> => {
    rateLimit('fs-list-directory')
    const safeDirPath = z.string().min(1).max(500).parse(dirPath)
    return ipcRenderer.invoke('fs-list-directory', safeDirPath)
  },
  fsCreateFile: (
    filePath: string,
    content?: string
  ): Promise<{ success: boolean; error?: string }> => {
    rateLimit('fs-create-file')
    const safeFilePath = z.string().min(1).max(500).parse(filePath)
    const safeContent = content ? z.string().max(1000000).parse(content) : ''
    return ipcRenderer.invoke('fs-create-file', safeFilePath, safeContent)
  },
  fsDeleteFile: (filePath: string): Promise<{ success: boolean; error?: string }> => {
    rateLimit('fs-delete-file')
    const safeFilePath = z.string().min(1).max(500).parse(filePath)
    return ipcRenderer.invoke('fs-delete-file', safeFilePath)
  },
  fsExecuteCommand: (
    command: string,
    cwd?: string
  ): Promise<{ success: boolean; stdout?: string; stderr?: string; error?: string }> => {
    rateLimit('fs-execute-command')
    const safeCommand = z.string().min(1).max(1000).parse(command)
    const safeCwd = cwd ? z.string().max(500).parse(cwd) : undefined
    return ipcRenderer.invoke('fs-execute-command', safeCommand, safeCwd)
  },
  fsOpenFileDialog: (): Promise<{ success: boolean; filePath?: string; error?: string }> => {
    rateLimit('fs-open-file-dialog')
    return ipcRenderer.invoke('fs-open-file-dialog')
  },
  fsSaveFileDialog: (
    defaultName?: string,
    content?: string
  ): Promise<{ success: boolean; filePath?: string; error?: string }> => {
    rateLimit('fs-save-file-dialog')
    const safeDefaultName = defaultName ? z.string().max(255).parse(defaultName) : undefined
    const safeContent = content ? z.string().max(1000000).parse(content) : undefined
    return ipcRenderer.invoke('fs-save-file-dialog', safeDefaultName, safeContent)
  },
  fsGetFileInfo: (filePath: string): Promise<{ success: boolean; info?: any; error?: string }> => {
    rateLimit('fs-get-file-info')
    const safeFilePath = z.string().min(1).max(500).parse(filePath)
    return ipcRenderer.invoke('fs-get-file-info', safeFilePath)
  },
  fsCreateDirectory: (dirPath: string): Promise<{ success: boolean; error?: string }> => {
    rateLimit('fs-create-directory');
    const safeDirPath = z.string().min(1).max(500).parse(dirPath);
    return ipcRenderer.invoke('fs-create-directory', safeDirPath);
  },
  fsDeleteDirectory: (dirPath: string): Promise<{ success: boolean; error?: string }> => {
    rateLimit('fs-delete-directory');
    const safeDirPath = z.string().min(1).max(500).parse(dirPath);
    return ipcRenderer.invoke('fs-delete-directory', safeDirPath);
  },
  fsRenameFile: (oldPath: string, newPath: string): Promise<{ success: boolean; error?: string }> => {
    rateLimit('fs-rename-file');
    const safeOldPath = z.string().min(1).max(500).parse(oldPath);
    const safeNewPath = z.string().min(1).max(500).parse(newPath);
    return ipcRenderer.invoke('fs-rename-file', safeOldPath, safeNewPath);
  },
  fsRename: (oldPath: string, newPath: string): Promise<{ success: boolean; error?: string }> => {
    rateLimit('fs-rename');
    const safeOldPath = z.string().min(1).max(500).parse(oldPath);
    const safeNewPath = z.string().min(1).max(500).parse(newPath);
    return ipcRenderer.invoke('fs-rename', safeOldPath, safeNewPath);
  },
  fsCopy: (source: string, destination: string): Promise<{ success: boolean; error?: string }> => {
    rateLimit('fs-copy');
    const safeSource = z.string().min(1).max(500).parse(source);
    const safeDestination = z.string().min(1).max(500).parse(destination);
    return ipcRenderer.invoke('fs-copy', safeSource, safeDestination);
  },
  fsDelete: (itemPath: string): Promise<{ success: boolean; error?: string }> => {
    rateLimit('fs-delete');
    const safeItemPath = z.string().min(1).max(500).parse(itemPath);
    return ipcRenderer.invoke('fs-delete', safeItemPath);
  },

  // Code execution for Canvas mode
  executeCode: (code: string): void => {
    rateLimit('execute-code')
    const safeCode = z.string().max(10000).parse(code)
    ipcRenderer.send('execute-code', safeCode)
  },
  onExecuteResponse: (callback: (result: string) => void): void => {
    ipcRenderer.on('execute-response', (_event, result: string) => callback(result))
  },

  // Context Menu API
  showContextMenu: (data: any): void => {
    rateLimit('show-context-menu')
    ipcRenderer.send('show-context-menu', data)
  },
  onContextMenuCommand: (callback: (command: string, data: any) => void): (() => void) => {
    const listener = (_event: any, command: string, data: any) => callback(command, data)
    ipcRenderer.on('context-menu-command', listener)
    return () => ipcRenderer.removeListener('context-menu-command', listener)
  },

  // Missing API functions - following Electron patterns
  searchContext: (query: string): Promise<any> => {
    rateLimit('search-context')
    const safeQuery = z.string().min(1).max(500).parse(query)
    return ipcRenderer.invoke('search-context', safeQuery)
  },

  // Analytics object for backwards compatibility
  analytics: {
    trackMessageReceived: (data: any): void => {
      rateLimit('analytics-track')
      ipcRenderer.send('analytics:track', 'message-received', data)
    },
    trackMessageSent: (data: any): void => {
      rateLimit('analytics-track')
      ipcRenderer.send('analytics:track', 'message-sent', data)
    }
  },

  // Gemini CLI functions
  geminiCliAnalyzeProject: (data: {
    projectPath: string
    analysisType: string
  }): Promise<{
    success: boolean
    response?: string
    metadata?: any
    error?: string
  }> => {
    rateLimit('gemini-cli-analyze-project')
    const safeData = z.object({
      projectPath: z.string().min(1).max(500),
      analysisType: z.string().min(1).max(100)
    }).parse(data)
    return ipcRenderer.invoke('gemini-cli-analyze-project', safeData)
  },
  
  geminiCliGenerateModification: (data: {
    projectPath: string
    instruction: string
    targetFiles?: string[]
  }): Promise<{
    success: boolean
    response?: string
    diff?: string
    affectedFiles?: string[]
    error?: string
  }> => {
    rateLimit('gemini-cli-generate-modification')
    const safeData = z.object({
      projectPath: z.string().min(1).max(500),
      instruction: z.string().min(1).max(2000),
      targetFiles: z.array(z.string()).optional()
    }).parse(data)
    return ipcRenderer.invoke('gemini-cli-generate-modification', safeData)
  },

  geminiCliChatWithContext: (data: {
    message: string
    projectPath?: string
  }): Promise<{
    success: boolean
    response?: string
    metadata?: any
    error?: string
  }> => {
    rateLimit('gemini-cli-chat-with-context')
    const safeData = z.object({
      message: z.string().min(1).max(2000),
      projectPath: z.string().max(500).optional()
    }).parse(data)
    return ipcRenderer.invoke('gemini-cli-chat-with-context', safeData)
  },

  geminiCliApplyDiff: (data: {
    diff: string
    projectPath: string
  }): Promise<{
    success: boolean
    response?: string
    error?: string
  }> => {
    rateLimit('gemini-cli-apply-diff')
    const safeData = z.object({
      diff: z.string().min(1).max(10000),
      projectPath: z.string().min(1).max(500)
    }).parse(data)
    return ipcRenderer.invoke('gemini-cli-apply-diff', safeData)
  },

  // Claude Desktop Commander API
  claudeDcReadFile: (data: {
    filePath: string
    options?: { offset?: number; length?: number }
  }): Promise<{
    success: boolean
    output?: string
    error?: string
    metadata?: any
  }> => {
    rateLimit('claude-dc-read-file')
    const safeData = z.object({
      filePath: z.string().min(1).max(500),
      options: z.object({
        offset: z.number().optional(),
        length: z.number().optional()
      }).optional()
    }).parse(data)
    return ipcRenderer.invoke('claude-dc-read-file', safeData)
  },

  claudeDcWriteFile: (data: {
    filePath: string
    content: string
    mode?: 'rewrite' | 'append'
  }): Promise<{
    success: boolean
    output?: string
    error?: string
    metadata?: any
  }> => {
    rateLimit('claude-dc-write-file')
    const safeData = z.object({
      filePath: z.string().min(1).max(500),
      content: z.string().min(1).max(50000),
      mode: z.enum(['rewrite', 'append']).optional()
    }).parse(data)
    return ipcRenderer.invoke('claude-dc-write-file', safeData)
  },

  claudeDcListDirectory: (data: {
    dirPath: string
  }): Promise<{
    success: boolean
    output?: string
    files?: Array<{ path: string; name: string; type: 'file' | 'directory'; size?: number }>
    error?: string
    metadata?: any
  }> => {
    rateLimit('claude-dc-list-directory')
    const safeData = z.object({
      dirPath: z.string().min(1).max(500)
    }).parse(data)
    return ipcRenderer.invoke('claude-dc-list-directory', safeData)
  },

  claudeDcExecuteCommand: (data: {
    command: string
    workingDir?: string
    timeout?: number
  }): Promise<{
    success: boolean
    output?: string
    error?: string
    metadata?: any
  }> => {
    rateLimit('claude-dc-execute-command')
    const safeData = z.object({
      command: z.string().min(1).max(1000),
      workingDir: z.string().max(500).optional(),
      timeout: z.number().min(1000).max(300000).optional()
    }).parse(data)
    return ipcRenderer.invoke('claude-dc-execute-command', safeData)
  },

  claudeDcSearchFiles: (data: {
    searchPath: string
    pattern: string
    timeout?: number
  }): Promise<{
    success: boolean
    output?: string
    error?: string
    metadata?: any
  }> => {
    rateLimit('claude-dc-search-files')
    const safeData = z.object({
      searchPath: z.string().min(1).max(500),
      pattern: z.string().min(1).max(200),
      timeout: z.number().min(1000).max(300000).optional()
    }).parse(data)
    return ipcRenderer.invoke('claude-dc-search-files', safeData)
  },

  claudeDcSearchCode: (data: {
    searchPath: string
    pattern: string
    options?: {
      filePattern?: string
      contextLines?: number
      ignoreCase?: boolean
      maxResults?: number
    }
  }): Promise<{
    success: boolean
    output?: string
    error?: string
    metadata?: any
  }> => {
    rateLimit('claude-dc-search-code')
    const safeData = z.object({
      searchPath: z.string().min(1).max(500),
      pattern: z.string().min(1).max(1000),
      options: z.object({
        filePattern: z.string().max(100).optional(),
        contextLines: z.number().min(0).max(50).optional(),
        ignoreCase: z.boolean().optional(),
        maxResults: z.number().min(1).max(1000).optional()
      }).optional()
    }).parse(data)
    return ipcRenderer.invoke('claude-dc-search-code', safeData)
  },

  // Multi-AI Orchestrator API
  multiAiStartCollaboration: (data: {
    prompt: string
    providers: Array<'claude' | 'gemini' | 'ollama'>
    options?: {
      enableDiscussion?: boolean
      discussionRounds?: number
      streamingEnabled?: boolean
      timeout?: number
    }
  }): Promise<{
    requestId: string
    responses: Array<{
      provider: string
      content: string
      success: boolean
      error?: string
      responseTime: number
    }>
    discussion?: Array<{
      provider: string
      content: string
      metadata?: any
    }>
    totalTime: number
    success: boolean
  }> => {
    rateLimit('multi-ai-start-collaboration')
    const safeData = z.object({
      prompt: z.string().min(1).max(5000),
      providers: z.array(z.enum(['claude', 'gemini', 'ollama'])).min(1).max(3),
      options: z.object({
        enableDiscussion: z.boolean().optional(),
        discussionRounds: z.number().min(1).max(5).optional(),
        streamingEnabled: z.boolean().optional(),
        timeout: z.number().min(5000).max(300000).optional()
      }).optional()
    }).parse(data)
    return ipcRenderer.invoke('multi-ai-start-collaboration', safeData)
  },

  multiAiStopCollaboration: (data: {
    requestId: string
  }): Promise<{
    success: boolean
    requestId: string
  }> => {
    rateLimit('multi-ai-stop-collaboration')
    const safeData = z.object({
      requestId: z.string().min(1).max(100)
    }).parse(data)
    return ipcRenderer.invoke('multi-ai-stop-collaboration', safeData)
  },

  multiAiGetActive: (): Promise<Array<{
    id: string
    providers: string[]
    startTime: string
  }>> => {
    rateLimit('multi-ai-get-active')
    return ipcRenderer.invoke('multi-ai-get-active')
  },

  multiAiGetStats: (): Promise<{
    totalSessions: number
    activeRequests: number
    averageResponseTime: number
  }> => {
    rateLimit('multi-ai-get-stats')
    return ipcRenderer.invoke('multi-ai-get-stats')
  },

  multiAiCheckProviders: (data: {
    providers: Array<'claude' | 'gemini' | 'ollama'>
  }): Promise<Record<string, boolean>> => {
    rateLimit('multi-ai-check-providers')
    const safeData = z.object({
      providers: z.array(z.enum(['claude', 'gemini', 'ollama'])).min(1).max(3)
    }).parse(data)
    return ipcRenderer.invoke('multi-ai-check-providers', safeData)
  },

  multiAiQuickChat: (data: {
    message: string
    providers: Array<'claude' | 'gemini' | 'ollama'>
  }): Promise<{
    success: boolean
    responses: Array<{
      provider: string
      content: string
      success: boolean
      error?: string
      responseTime: number
    }>
    totalTime: number
  }> => {
    rateLimit('multi-ai-quick-chat')
    const safeData = z.object({
      message: z.string().min(1).max(2000),
      providers: z.array(z.enum(['claude', 'gemini', 'ollama'])).min(1).max(3)
    }).parse(data)
    return ipcRenderer.invoke('multi-ai-quick-chat', safeData)
  },

  multiAiTestProvider: (data: {
    provider: 'claude' | 'gemini' | 'ollama'
    testMessage?: string
  }): Promise<{
    provider: string
    available: boolean
    responseTime: number
    testResponse?: string
    error?: string
  }> => {
    rateLimit('multi-ai-test-provider')
    const safeData = z.object({
      provider: z.enum(['claude', 'gemini', 'ollama']),
      testMessage: z.string().max(500).optional()
    }).parse(data)
    return ipcRenderer.invoke('multi-ai-test-provider', safeData)
  },

  // MCP (Model Context Protocol) service functions
  mcpStartServer: (serverName: string): Promise<{ success: boolean; error?: string }> => {
    rateLimit('mcp-start-server')
    const safeName = z.string().min(1).max(100).parse(serverName)
    return ipcRenderer.invoke('mcp-start-server', safeName)
  },
  mcpStopServer: (serverName: string): Promise<{ success: boolean; error?: string }> => {
    rateLimit('mcp-stop-server')
    const safeName = z.string().min(1).max(100).parse(serverName)
    return ipcRenderer.invoke('mcp-stop-server', safeName)
  },
  mcpGetServerStatus: (serverName: string): Promise<{ isRunning: boolean; exists: boolean }> => {
    rateLimit('mcp-get-server-status')
    const safeName = z.string().min(1).max(100).parse(serverName)
    return ipcRenderer.invoke('mcp-get-server-status', safeName)
  },
  mcpGetAllServersStatus: (): Promise<Record<string, { isRunning: boolean }>> => {
    rateLimit('mcp-get-all-servers-status')
    return ipcRenderer.invoke('mcp-get-all-servers-status')
  },
  mcpThinkingRequest: (request: {
    prompt: string
    context?: string
    maxSteps?: number
  }): Promise<{
    success: boolean
    thoughts?: Array<{
      step: number
      thought: string
      reasoning: string
    }>
    finalAnswer?: string
    error?: string
  }> => {
    rateLimit('mcp-thinking-request')
    const safeRequest = z.object({
      prompt: z.string().min(1).max(5000),
      context: z.string().max(2000).optional(),
      maxSteps: z.number().min(1).max(10).optional()
    }).parse(request)
    return ipcRenderer.invoke('mcp-thinking-request', safeRequest)
  },
  mcpStopAllServers: (): Promise<{ success: boolean; error?: string }> => {
    rateLimit('mcp-stop-all-servers')
    return ipcRenderer.invoke('mcp-stop-all-servers')
  }
} as const

// ===============================
// 4. Secure Context Exposure (Strict)
// ===============================

if (process.contextIsolated) {
  try {
    // Use the standard contextBridge approach for exposing the API
    contextBridge.exposeInMainWorld('api', api)

    // Also expose electronAPI for Canvas mode compatibility
    contextBridge.exposeInMainWorld('electronAPI', {
      executeCode: (code: string) => {
        const safeCode = z.string().max(10000).parse(code)
        ipcRenderer.send('execute-code', safeCode)
      },
      onExecuteResponse: (cb: (result: string) => void) => {
        ipcRenderer.on('execute-response', (_e, result) => cb(result))
      }
    })
  } catch (error) {
    ipcRenderer.send('crash:preload', { error: String(error) })
    document.body.innerHTML =
      '<div style="color:red;background:black;padding:16px;font-size:1.2em;">Fatal preload failure. App cannot continue. See logs.</div>'
    throw error
  }
} else {
  document.body.innerHTML =
    '<div style="color:red;background:black;padding:16px;font-size:1.2em;">SECURITY ERROR: Context Isolation is DISABLED. Restart the app or reinstall.</div>'
  throw new Error('Context isolation disabled. App halted for security.')
}

// ===============================
// 5. Rate Limiting (future: optionally wrap IPC calls here)
// ===============================

// To enable rate limiting, wrap each IPC call in a tracker or proxy as shown previously.
