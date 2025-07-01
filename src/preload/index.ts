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
  searchQuery: z.string().min(1).max(500)
} as const;

// ===============================
// 2. Hardened IPC Wrapper
// ===============================

function createIpcInvoke<Input, Output>(
  channel: string,
  inputSchema: z.Schema<Input>,
  rateLimitChannel: string
): (input: Input) => Promise<Output> {
  return async (input: Input) => {
    rateLimit(rateLimitChannel);
    const parsed = inputSchema.safeParse(input);
    if (!parsed.success) {
      throw new Error(`IPC validation failed on ${channel}: ${parsed.error}`);
    }
    try {
      const result = await ipcRenderer.invoke(channel, parsed.data);
      return result as Output;
    } catch (err: any) {
      throw new Error(`IPC error on ${channel}: ${err?.message || err}`);
    }
  };
}

const callTracker = new Map<string, { count: number; last: number }>();
function rateLimit(channel: string, maxPerSecond = 10) {
  const now = Date.now();
  const entry = callTracker.get(channel) || { count: 0, last: now };
  if (now - entry.last < 1000) entry.count += 1;
  else entry.count = 1;
  entry.last = now;
  callTracker.set(channel, entry);
  if (entry.count > maxPerSecond) {
    throw new Error(`Rate limit exceeded for ${channel} (${entry.count}/sec)`);
  }
}

// ===============================
// 3. API Surface – Fully Typed, Validated, No Leakage
// ===============================

const api = {
  // Ollama service functions
  checkOllamaStatus: (): Promise<{connected: boolean, message: string, models?: string[]}> => {
    rateLimit('check-ollama-status');
    return ipcRenderer.invoke('check-ollama-status');
  },
  startOllama: (): Promise<{success: boolean, message: string}> => {
    rateLimit('start-ollama');
    return ipcRenderer.invoke('start-ollama');
  },
  getOllamaModels: (): Promise<{success: boolean, models: string[]}> => {
    rateLimit('get-ollama-models');
    return ipcRenderer.invoke('get-ollama-models');
  },
  pullModel: async (modelName: string): Promise<boolean> => {
    rateLimit('pull-model');
    const name = z.string().min(1).max(100).parse(modelName);
    return ipcRenderer.invoke('pull-model', name);
  },

  // ChromaDB service functions
  checkChromaStatus: (): Promise<{connected: boolean, message: string}> => {
    rateLimit('check-chroma-status');
    return ipcRenderer.invoke('check-chroma-status');
  },
  startChroma: (): Promise<{success: boolean, message: string}> => {
    rateLimit('start-chroma');
    return ipcRenderer.invoke('start-chroma');
  },

  // Chat functions
  chatWithAI: createIpcInvoke<typeof schemas.chat._type, Message>('chat-with-ai-working', schemas.chat, 'chat-with-ai-working'),
  searchContext: async (query: string): Promise<any> => {
    rateLimit('search-context');
    const q = schemas.searchQuery.parse(query);
    return ipcRenderer.invoke('search-context', q);
  },

  // Universal memory enrichment for ANY operation
  enrichWithMemory: async (data: { prompt: string; operation: string; options?: any }): Promise<any> => {
    rateLimit('enrich-with-memory');
    return ipcRenderer.invoke('enrich-with-memory', data);
  },
  getContextDebugInfo: (): Promise<any> => {
    rateLimit('get-context-debug-info');
    return ipcRenderer.invoke('get-context-debug-info');
  },

  // Secure storage API
  getSettings: (): Promise<AppSettings> => {
    rateLimit('get-settings');
    return ipcRenderer.invoke('get-settings');
  },
  saveSettings: (settings: AppSettings): Promise<void> => {
    rateLimit('save-settings');
    return ipcRenderer.invoke('save-settings', settings);
  },
  getChatHistory: (): Promise<Message[]> => {
    rateLimit('get-chat-history');
    return ipcRenderer.invoke('get-chat-history');
  },
  addMessageToHistory: (message: Message): Promise<void> => {
    rateLimit('add-message-to-history');
    return ipcRenderer.invoke('add-message-to-history', message);
  },

  // Memory management API
  getMemoryStore: (): Promise<MemoryStore> => {
    rateLimit('get-memory-store');
    return ipcRenderer.invoke('get-memory-store');
  },
  addMemorySummary: (summary: MemorySummary): Promise<void> => {
    rateLimit('add-memory-summary');
    return ipcRenderer.invoke('add-memory-summary', summary);
  },
  clearMemory: (): Promise<void> => {
    rateLimit('clear-memory');
    return ipcRenderer.invoke('clear-memory');
  },
  updateMemorySettings: (enabled: boolean, retentionDays?: number): Promise<void> => {
    rateLimit('update-memory-settings');
    return ipcRenderer.invoke('update-memory-settings', enabled, retentionDays);
  },
  getMemorySummaries: (): Promise<MemorySummary[]> => {
    rateLimit('get-memory-summaries');
    return ipcRenderer.invoke('get-memory-summaries');
  },
  summarizeMessages: (messages: Message[], model?: string): Promise<{ success: boolean; summary?: MemorySummary; error?: string }> => {
    rateLimit('summarize-messages');
    return ipcRenderer.invoke('summarize-messages', messages, model);
  },

  // Agent management API
  agentRegistryLoad: (): Promise<AgentRegistry> => {
    rateLimit('agent-registry-load');
    return ipcRenderer.invoke('agent-registry-load');
  },
  agentCreate: createIpcInvoke<typeof schemas.agentCreate._type, Agent>('agent-create', schemas.agentCreate, 'agent-create'),
  agentUpdate: async (id: string, updates: Partial<Agent>): Promise<Agent> => {
    rateLimit('agent-update');
    const safeId = schemas.uuid.parse(id);
    const sanitized = schemas.agentUpdate.parse(updates);
    return ipcRenderer.invoke('agent-update', safeId, sanitized);
  },
  agentDelete: (id: string): Promise<void> => {
    rateLimit('agent-delete');
    const safeId = schemas.uuid.parse(id);
    return ipcRenderer.invoke('agent-delete', safeId);
  },
  agentClone: (id: string, newName: string): Promise<Agent> => {
    rateLimit('agent-clone');
    const safeId = schemas.uuid.parse(id);
    const safeName = z.string().min(1).max(100).parse(newName);
    return ipcRenderer.invoke('agent-clone', safeId, safeName);
  },
  agentSetActive: (id: string | null): Promise<void> => {
    rateLimit('agent-set-active');
    return id ? ipcRenderer.invoke('agent-set-active', schemas.uuid.parse(id)) : ipcRenderer.invoke('agent-set-active', null);
  },
  agentGetActive: (): Promise<Agent | null> => {
    rateLimit('agent-get-active');
    return ipcRenderer.invoke('agent-get-active');
  },
  agentGetAll: (): Promise<Agent[]> => {
    rateLimit('agent-get-all');
    return ipcRenderer.invoke('agent-get-all');
  },
  agentGetAvailableTools: (): Promise<ToolRegistry> => {
    rateLimit('agent-get-available-tools');
    return ipcRenderer.invoke('agent-get-available-tools');
  },
  agentValidateTool: (toolKey: string): Promise<boolean> => {
    rateLimit('agent-validate-tool');
    return ipcRenderer.invoke('agent-validate-tool', z.string().min(1).max(100).parse(toolKey));
  },

  // Rate limiting monitoring (for debugging/admin purposes)
  getRateLimitStatus: (): Promise<Record<string, any>> =>
    ipcRenderer.invoke('get-rate-limit-status'),

  resetRateLimits: (key?: string): Promise<void> =>
    ipcRenderer.invoke('reset-rate-limits', key),

  // System diagnostics and monitoring
  getSystemDiagnostics: (): Promise<any> =>
    ipcRenderer.invoke('get-system-diagnostics'),

  exportTelemetry: (options: any): Promise<string> =>
    ipcRenderer.invoke('export-telemetry', options),

  exportAudit: (options: any): Promise<string> =>
    ipcRenderer.invoke('export-audit', options),

  searchLogs: (query: any): Promise<any[]> =>
    ipcRenderer.invoke('search-logs', query),

  forceModelHealthCheck: (): Promise<any> =>
    ipcRenderer.invoke('force-model-health-check'),

  // Development error simulation
  ...(process.env.NODE_ENV === 'development' ? {
    simulateError: (errorType: string): Promise<void> =>
      ipcRenderer.invoke('simulate-error', errorType)
  } : {}),

  // Reddit service API
  redditAuthenticate: (credentials: any): Promise<{ success: boolean }> =>
    ipcRenderer.invoke('reddit:authenticate', credentials),

  redditListDMs: (limit?: number): Promise<any> =>
    ipcRenderer.invoke('reddit:list_dms', limit),

  redditReadDM: (messageId: string): Promise<any> =>
    ipcRenderer.invoke('reddit:read_dm', messageId),

  redditSendDM: (recipient: string, subject: string, message: string): Promise<any> =>
    ipcRenderer.invoke('reddit:send_dm', recipient, subject, message),

  redditReplyDM: (messageId: string, replyText: string): Promise<any> =>
    ipcRenderer.invoke('reddit:reply_dm', messageId, replyText),

  redditGetUnread: (): Promise<any> =>
    ipcRenderer.invoke('reddit:get_unread'),

  redditDisconnect: (): Promise<{ success: boolean }> =>
    ipcRenderer.invoke('reddit:disconnect'),

  redditGetStatus: (): Promise<any> =>
    ipcRenderer.invoke('reddit:get_status'),

  // Reddit Agent API
  redditAgentStart: (): Promise<{ success: boolean }> =>
    ipcRenderer.invoke('reddit-agent:start'),

  redditAgentStop: (): Promise<{ success: boolean }> =>
    ipcRenderer.invoke('reddit-agent:stop'),

  redditAgentGetConfig: (): Promise<any> =>
    ipcRenderer.invoke('reddit-agent:get_config'),

  redditAgentUpdateConfig: (config: any): Promise<{ success: boolean }> =>
    ipcRenderer.invoke('reddit-agent:update_config', config),

  redditAgentGetStats: (): Promise<any> =>
    ipcRenderer.invoke('reddit-agent:get_stats'),

  redditAgentSendManualReply: (recipient: string, subject: string, message: string): Promise<{ success: boolean }> =>
    ipcRenderer.invoke('reddit-agent:send_manual_reply', recipient, subject, message),

  redditAgentTestConnection: (): Promise<{ success: boolean }> =>
    ipcRenderer.invoke('reddit-agent:test_connection'),

  // Workflow Engine API
  workflowCreate: (workflowData: any): Promise<any> =>
    ipcRenderer.invoke('workflow:create', workflowData),

  workflowCreateFromTemplate: (templateName: string, variables: any): Promise<any> =>
    ipcRenderer.invoke('workflow:create-from-template', templateName, variables),

  workflowGetAll: (): Promise<any> =>
    ipcRenderer.invoke('workflow:get-all'),

  workflowGet: (id: string): Promise<any> =>
    ipcRenderer.invoke('workflow:get', id),

  workflowUpdate: (id: string, updates: any): Promise<any> =>
    ipcRenderer.invoke('workflow:update', id, updates),

  workflowDelete: (id: string): Promise<any> =>
    ipcRenderer.invoke('workflow:delete', id),

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

  workflowGetStats: (): Promise<any> =>
    ipcRenderer.invoke('workflow:get-stats'),

  workflowGetTemplates: (): Promise<any> =>
    ipcRenderer.invoke('workflow:get-templates'),

  workflowValidate: (workflowId: string, testInput: any): Promise<any> =>
    ipcRenderer.invoke('workflow:validate', workflowId, testInput),

  // Model Tuning API
  getAvailableModelsForTuning: (): Promise<string[]> => {
    rateLimit('get-available-models-for-tuning');
    return ipcRenderer.invoke('get-available-models-for-tuning');
  },
  getAllTuningDatasets: (): Promise<any[]> => {
    rateLimit('get-all-tuning-datasets');
    return ipcRenderer.invoke('get-all-tuning-datasets');
  },
  getTuningDataset: (id: string): Promise<any> => {
    rateLimit('get-tuning-dataset');
    const safeId = z.string().min(1).max(100).parse(id);
    return ipcRenderer.invoke('get-tuning-dataset', safeId);
  },
  createTuningDataset: (params: { name: string, description: string, examples?: any[] }): Promise<any> => {
    rateLimit('create-tuning-dataset');
    const safeName = z.string().min(1).max(200).parse(params.name);
    const safeDescription = z.string().max(1000).parse(params.description);
    return ipcRenderer.invoke('create-tuning-dataset', { 
      name: safeName, 
      description: safeDescription, 
      examples: params.examples || [] 
    });
  },
  updateTuningDataset: (params: { id: string, updates: any }): Promise<any> => {
    rateLimit('update-tuning-dataset');
    const safeId = z.string().min(1).max(100).parse(params.id);
    return ipcRenderer.invoke('update-tuning-dataset', { id: safeId, updates: params.updates });
  },
  deleteTuningDataset: (id: string): Promise<boolean> => {
    rateLimit('delete-tuning-dataset');
    const safeId = z.string().min(1).max(100).parse(id);
    return ipcRenderer.invoke('delete-tuning-dataset', safeId);
  },
  getAllTuningJobs: (): Promise<any[]> => {
    rateLimit('get-all-tuning-jobs');
    return ipcRenderer.invoke('get-all-tuning-jobs');
  },
  startTuningJob: (params: {
    baseModel: string,
    newModelName: string,
    datasetId: string,
    epochs: number,
    learningRate: number,
    batchSize: number
  }): Promise<any> => {
    rateLimit('start-tuning-job');
    const safeBaseModel = z.string().min(1).max(100).parse(params.baseModel);
    const safeNewModelName = z.string().min(1).max(100).parse(params.newModelName);
    const safeDatasetId = z.string().min(1).max(100).parse(params.datasetId);
    const safeEpochs = z.number().min(1).max(20).parse(params.epochs);
    const safeLearningRate = z.number().min(0.00001).max(1).parse(params.learningRate);
    const safeBatchSize = z.number().min(1).max(128).parse(params.batchSize);
    
    return ipcRenderer.invoke('start-tuning-job', {
      baseModel: safeBaseModel,
      newModelName: safeNewModelName,
      datasetId: safeDatasetId,
      epochs: safeEpochs,
      learningRate: safeLearningRate,
      batchSize: safeBatchSize
    });
  },
  cancelTuningJob: (id: string): Promise<boolean> => {
    rateLimit('cancel-tuning-job');
    const safeId = z.string().min(1).max(100).parse(id);
    return ipcRenderer.invoke('cancel-tuning-job', safeId);
  },
  deleteTuningJob: (id: string): Promise<boolean> => {
    rateLimit('delete-tuning-job');
    const safeId = z.string().min(1).max(100).parse(id);
    return ipcRenderer.invoke('delete-tuning-job', safeId);
  },
  exportTuningDataset: (id: string): Promise<string> => {
    rateLimit('export-tuning-dataset');
    const safeId = z.string().min(1).max(100).parse(id);
    return ipcRenderer.invoke('export-tuning-dataset', safeId);
  },
  importTuningDataset: (filePath: string): Promise<any> => {
    rateLimit('import-tuning-dataset');
    const safeFilePath = z.string().min(1).max(500).parse(filePath);
    return ipcRenderer.invoke('import-tuning-dataset', safeFilePath);
  },

  // File System API for Developer Mode
  fsReadFile: (filePath: string): Promise<{ success: boolean; content?: string; error?: string }> => {
    rateLimit('fs-read-file');
    const safeFilePath = z.string().min(1).max(500).parse(filePath);
    return ipcRenderer.invoke('fs-read-file', safeFilePath);
  },
  fsWriteFile: (filePath: string, content: string): Promise<{ success: boolean; error?: string }> => {
    rateLimit('fs-write-file');
    const safeFilePath = z.string().min(1).max(500).parse(filePath);
    const safeContent = z.string().max(1000000).parse(content); // 1MB limit
    return ipcRenderer.invoke('fs-write-file', safeFilePath, safeContent);
  },
  fsListDirectory: (dirPath: string): Promise<{ success: boolean; files?: any[]; error?: string }> => {
    rateLimit('fs-list-directory');
    const safeDirPath = z.string().min(1).max(500).parse(dirPath);
    return ipcRenderer.invoke('fs-list-directory', safeDirPath);
  },
  fsCreateFile: (filePath: string, content?: string): Promise<{ success: boolean; error?: string }> => {
    rateLimit('fs-create-file');
    const safeFilePath = z.string().min(1).max(500).parse(filePath);
    const safeContent = content ? z.string().max(1000000).parse(content) : '';
    return ipcRenderer.invoke('fs-create-file', safeFilePath, safeContent);
  },
  fsDeleteFile: (filePath: string): Promise<{ success: boolean; error?: string }> => {
    rateLimit('fs-delete-file');
    const safeFilePath = z.string().min(1).max(500).parse(filePath);
    return ipcRenderer.invoke('fs-delete-file', safeFilePath);
  },
  fsExecuteCommand: (command: string, cwd?: string): Promise<{ success: boolean; stdout?: string; stderr?: string; error?: string }> => {
    rateLimit('fs-execute-command');
    const safeCommand = z.string().min(1).max(1000).parse(command);
    const safeCwd = cwd ? z.string().max(500).parse(cwd) : undefined;
    return ipcRenderer.invoke('fs-execute-command', safeCommand, safeCwd);
  },
  fsOpenFileDialog: (): Promise<{ success: boolean; filePath?: string; error?: string }> => {
    rateLimit('fs-open-file-dialog');
    return ipcRenderer.invoke('fs-open-file-dialog');
  },
  fsSaveFileDialog: (defaultName?: string, content?: string): Promise<{ success: boolean; filePath?: string; error?: string }> => {
    rateLimit('fs-save-file-dialog');
    const safeDefaultName = defaultName ? z.string().max(255).parse(defaultName) : undefined;
    const safeContent = content ? z.string().max(1000000).parse(content) : undefined;
    return ipcRenderer.invoke('fs-save-file-dialog', safeDefaultName, safeContent);
  },
  fsGetFileInfo: (filePath: string): Promise<{ success: boolean; info?: any; error?: string }> => {
    rateLimit('fs-get-file-info');
    const safeFilePath = z.string().min(1).max(500).parse(filePath);
    return ipcRenderer.invoke('fs-get-file-info', safeFilePath);
  },

  // Avatar APIs
  getModelAvatar: (modelName: string): Promise<{modelName: string; avatarPath?: string; initials: string; uploadedAt?: Date}> => {
    rateLimit('get-model-avatar');
    const safeModelName = z.string().min(1).max(100).parse(modelName);
    return ipcRenderer.invoke('get-model-avatar', safeModelName);
  },
  uploadModelAvatar: (modelName: string, imageBuffer: Uint8Array, originalName: string): Promise<{success: boolean; avatarPath: string}> => {
    rateLimit('upload-model-avatar');
    const safeModelName = z.string().min(1).max(100).parse(modelName);
    const safeOriginalName = z.string().min(1).max(255).parse(originalName);
    return ipcRenderer.invoke('upload-model-avatar', safeModelName, imageBuffer, safeOriginalName);
  },
  removeModelAvatar: (modelName: string): Promise<{success: boolean}> => {
    rateLimit('remove-model-avatar');
    const safeModelName = z.string().min(1).max(100).parse(modelName);
    return ipcRenderer.invoke('remove-model-avatar', safeModelName);
  },
  getAllAvatars: (): Promise<{modelName: string; avatarPath?: string; initials: string; uploadedAt?: Date}[]> => {
    rateLimit('get-all-avatars');
    return ipcRenderer.invoke('get-all-avatars');
  }
} as const;

// ===============================
// 4. Secure Context Exposure (Strict)
// ===============================

if (process.contextIsolated) {
  try {
    // Use the standard contextBridge approach for exposing the API
    contextBridge.exposeInMainWorld('api', api);
  } catch (error) {
    ipcRenderer.send('crash:preload', { error: String(error) });
    document.body.innerHTML =
      '<div style="color:red;background:black;padding:16px;font-size:1.2em;">Fatal preload failure. App cannot continue. See logs.</div>';
    throw error;
  }
} else {
  document.body.innerHTML =
    '<div style="color:red;background:black;padding:16px;font-size:1.2em;">SECURITY ERROR: Context Isolation is DISABLED. Restart the app or reinstall.</div>';
  throw new Error('Context isolation disabled. App halted for security.');
}

// ===============================
// 5. Rate Limiting (future: optionally wrap IPC calls here)
// ===============================

// To enable rate limiting, wrap each IPC call in a tracker or proxy as shown previously.
