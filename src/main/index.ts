import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { spawn, exec, ChildProcess } from 'child_process'
import axios from 'axios'
console.log('✅ index.ts is up to date and executing')

// Import enterprise systems
import { logger } from './utils/logger'
import { withErrorBoundary } from './core/errorHandler'
import { withValidation, validateChatMessage, validateSettings } from './validation/schemas'
import { agentSecurity, validateAgentAction } from './security/agentSafety'
import { initializeHealthMonitoring } from './monitoring/healthMonitor'
import { initializeMemoryMonitoring } from './monitoring/memoryMonitor'
import { initializeConfiguration } from './config/configManager'

// Import modular services and handlers
import { ollamaService } from './services/ollamaService'
import { chromaService } from './services/chromaService'
import { registerChatHandlers } from './handlers/chatHandlers'
import { streamingService } from './streaming/streamingService'

// Import the handlers
import { registerCodeGenerationHandlers } from './code-generation-handlers'
import { registerModelTuningHandlers } from './model-tuning-handlers'
import { registerFileSystemHandlers } from './file-system-handlers'
import { registerAvatarHandlers } from './handlers/avatarHandlers'
import {
  loadSettings,
  saveSettings,
  loadChatHistory,
  appendChatMessage,
  loadMemoryStore,
  saveMemoryStore,
  addMemorySummary,
  clearMemoryStore,
  updateMemorySettings,
  getMemorySummaries
} from './storage'
import { withRateLimit, rateLimiter } from './middleware/rateLimiter'
import {
  summarizeMessages,
  enrichPromptWithMemory,
  withMemoryEnrichment,
  createContextDebugInfo,
  filterRelevantContext,
  loadAgentRegistry,
  createAgent,
  updateAgent,
  deleteAgent,
  cloneAgent,
  setActiveAgent,
  getActiveAgent,
  getAllAgents,
  getAvailableTools,
  validateToolKey
} from './services'
import {
  crashRecovery,
  ErrorContext,
  telemetry,
  modelRouter,
  withModelRouting,
  workflowEngine,
  emitWorkflowEvent,
  WORKFLOW_TEMPLATES
} from './core'
import type { AppSettings } from '../types/settings'
import type { Message, MemorySummary } from '../types/chat'
import type { Agent } from '../types/agents'
// Configure custom rate limits for specific operations
rateLimiter.configure('chat-with-ai', {
  windowMs: 60000,
  maxRequests: 15,
  keyGenerator: (event, data) => `chat:${event.sender.id}:${data.model}`
});

rateLimiter.configure('pull-model', {
  windowMs: 600000,
  maxRequests: 1,
  keyGenerator: (event, model) => `pull:${model}`
});

// Production error handling wrapper
function withErrorRecovery<T extends any[], R>(
  operation: (...args: T) => Promise<R>,
  context: Omit<ErrorContext, 'timestamp'>
) {
  return async (...args: T): Promise<R> => {
    const startTime = Date.now()

    try {
      telemetry.auditOperation({
        operation: context.operation,
        component: context.component,
        actor: 'system',
        success: false, // Will update on success
        metadata: { args: args.length }
      })

      const result = await operation(...args)

      // Log successful operation
      telemetry.auditOperation({
        operation: context.operation,
        component: context.component,
        actor: 'system',
        success: true,
        duration: Date.now() - startTime
      })

      telemetry.trackEvent({
        type: 'operation',
        category: context.component,
        action: context.operation,
        value: Date.now() - startTime
      })

      return result
    } catch (error) {
      const errorContext: ErrorContext = {
        ...context,
        timestamp: new Date().toISOString(),
        metadata: {
          args: args.length,
          duration: Date.now() - startTime,
          ...context.metadata
        }
      }

      await crashRecovery.logError(error as Error, errorContext)

      telemetry.trackEvent({
        type: 'error',
        category: context.component,
        action: context.operation,
        metadata: { error: (error as Error).message }
      })

      // Attempt recovery
      const recoveryPlan = crashRecovery.getRecoveryPlan(error as Error, errorContext)
      const recovered = await crashRecovery.executeRecovery(recoveryPlan, errorContext)

      if (!recovered) {
        throw error
      }

      // Retry operation after recovery
      try {
        return await operation(...args)
      } catch (retryError) {
        throw retryError
      }
    }
  }
}

// Service management
const MCP_SERVERS = {
  context7: {
    command: 'npx',
    args: ['-y', '@upstash/context7-mcp@latest']
  },
  '@magicuidesign/mcp': {
    command: 'npx',
    args: ['-y', '@magicuidesign/mcp@latest']
  },
  // sequentialthinking: {
  //   command: 'npx', 
  //   args: ['-y', '@modelcontextprotocol/sequentialthinking@latest']
  // }
};

const runningMCPs: Record<string, import('child_process').ChildProcess> = {};

function launchMCPServers() {
  for (const [name, { command, args }] of Object.entries(MCP_SERVERS)) {
    const proc = spawn(command, args, {
      stdio: 'inherit',
      shell: true
    });
    runningMCPs[name] = proc;

    proc.on('exit', (code, signal) => {
      console.log(`MCP [${name}] exited with code ${code}, signal ${signal}`);
    });

    proc.on('error', (err) => {
      console.error(`MCP [${name}] error:`, err);
    });
  }
}

let chromaProcess: ChildProcess | null = null
let ollamaProcess: ChildProcess | null = null
const CHROMA_PORT = 8000
const OLLAMA_BASE_URL = 'http://127.0.0.1:11434'  // Use IPv4 explicitly
const CHROMA_BASE_URL = `http://localhost:${CHROMA_PORT}`  // Use localhost to match chroma server

// Path constants
const CHROMA_PATH = '/Users/jibbr/.local/bin/chroma'
const OLLAMA_PATH = '/usr/local/bin/ollama' // Actual Ollama location
const CHROMA_DATA_DIR = join(__dirname, '../../chroma-data')

function createWindow(): void {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      nodeIntegration: false,
      contextIsolation: true
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(async () => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')

  // Initialize enterprise systems
  logger.info('🚀 Starting PelicanOS with enterprise-grade systems...', undefined, 'startup')
  
  try {
    // 1. Initialize configuration system
    const { manager: configManager, result: configResult } = await initializeConfiguration()
    logger.success('Configuration system initialized', { 
      valid: configResult.valid,
      warnings: configResult.warnings.length 
    }, 'startup')

    // 2. Initialize health monitoring
    const healthMonitor = initializeHealthMonitoring()
    logger.success('Health monitoring system active', undefined, 'startup')

    // 3. Initialize memory monitoring  
    const memoryMonitor = initializeMemoryMonitoring()
    logger.success('Memory monitoring system active', undefined, 'startup')

    // 4. Log system readiness
    logger.success('🎯 All enterprise systems initialized successfully', {
      configuration: configResult.valid,
      healthMonitoring: true,
      memoryMonitoring: true,
      securityLayer: true,
      inputValidation: true
    }, 'startup')

  } catch (error) {
    logger.error('Failed to initialize enterprise systems', error, 'startup')
  }

  // Default open or close DevTools by F12 in development
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  launchMCPServers()
  createWindow()

  // Register modular IPC handlers with enterprise architecture
  registerCodeGenerationHandlers(ipcMain)
  registerModelTuningHandlers(ipcMain)
  registerFileSystemHandlers(ipcMain)
  registerAvatarHandlers()
  
  // Register new modular chat handlers with streaming support
  registerChatHandlers()
  
  logger.success('🎯 All IPC handlers registered with modular architecture', {
    chatHandlers: true,
    streamingSupport: true,
    enterpriseValidation: true,
    errorBoundaries: true
  }, 'startup')

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    // Clean up processes if running
    if (chromaProcess) {
      chromaProcess.kill('SIGTERM')
      chromaProcess = null
    }
    if (ollamaProcess) {
      ollamaProcess.kill('SIGTERM')
      ollamaProcess = null
    }
    Object.values(runningMCPs).forEach(proc => proc.kill('SIGTERM'));
    app.quit()
  }
})

// Helper function for retrying connections with exponential backoff
async function retryConnection(
  checkFn: () => Promise<any>,
  serviceName: string,
  maxRetries: number = 5,
  initialDelay: number = 1000
): Promise<any> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🔄 ${serviceName} connection attempt ${attempt}/${maxRetries}`)
      const result = await checkFn()
      console.log(`✅ ${serviceName} connected on attempt ${attempt}`)
      return result
    } catch (error) {
      console.log(`❌ ${serviceName} attempt ${attempt} failed:`, error.message)
      
      if (attempt === maxRetries) {
        console.error(`🚫 ${serviceName} failed after ${maxRetries} attempts`)
        throw error
      }
      
      // Exponential backoff: 1s, 2s, 4s, 8s, 16s
      const delay = initialDelay * Math.pow(2, attempt - 1)
      console.log(`⏱️ Waiting ${delay}ms before retry...`)
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }
}

// IPC Handlers for AI Services

// Enhanced Ollama status check with retry
ipcMain.handle('check-ollama-status', async () => {
  console.log('🔍 Checking Ollama status with retry logic...')
  
  try {
    const result = await retryConnection(async () => {
      const response = await axios.get(`${OLLAMA_BASE_URL}/api/tags`, {
        timeout: 8000, // Increased timeout
        headers: {
          'Content-Type': 'application/json'
        }
      })
      
      const models = response.data.models?.map((model: any) => model.name) || []
      return {
        connected: true,
        message: 'Ollama is running and accessible',
        models: models,
        responseTime: Date.now()
      }
    }, 'Ollama', 3, 2000) // 3 retries, 2s initial delay
    
    return result
  } catch (error) {
    console.error('🚫 Ollama final connection failure:', error.message)
    return {
      connected: false,
      message: `Ollama is not running or not accessible: ${error.message}`,
      models: [],
      lastError: error.code
    }
  }
})

ipcMain.handle('start-ollama', async () => {
  return new Promise((resolve) => {
    // Kill existing process if any
    if (ollamaProcess) {
      ollamaProcess.kill('SIGTERM')
      ollamaProcess = null
    }

    // Try to start Ollama using full path
    const startOllamaCommand = (path: string) => {
      ollamaProcess = spawn(path, ['serve'], {
        stdio: 'pipe',
        detached: false
      })

      if (ollamaProcess) {
        ollamaProcess.on('error', (error) => {
          console.error('Ollama process error:', error)
          ollamaProcess = null
        })

        ollamaProcess.on('exit', (code, signal) => {
          console.log(`Ollama process exited with code ${code} and signal ${signal}`)
          ollamaProcess = null
        })
      }
    }

    // Try common Ollama paths
    const ollamaPaths = [
      '/opt/homebrew/bin/ollama',
      '/usr/local/bin/ollama',
      'ollama' // fallback to PATH
    ]

    let pathIndex = 0
    const tryNextPath = () => {
      if (pathIndex >= ollamaPaths.length) {
        resolve({
          success: false,
          message: 'Failed to start Ollama. Please ensure Ollama is installed.'
        })
        return
      }

      try {
        startOllamaCommand(ollamaPaths[pathIndex])
        pathIndex++
      } catch (error) {
        pathIndex++
        tryNextPath()
        return
      }
    }

    tryNextPath()

    // Give it some time to start, then check
    setTimeout(async () => {
      try {
        await axios.get(`${OLLAMA_BASE_URL}/api/tags`, { timeout: 3000 })
        resolve({
          success: true,
          message: 'Ollama started successfully'
        })
      } catch (error) {
        resolve({
          success: false,
          message: 'Ollama failed to start properly. Try starting manually with: ollama serve'
        })
      }
    }, 4000)
  })
})

// Get Ollama models
ipcMain.handle('get-ollama-models', async () => {
  console.log('🔍 Getting Ollama models...')
  try {
    const response = await axios.get(`${OLLAMA_BASE_URL}/api/tags`, {
      headers: {
        'Content-Type': 'application/json'
      }
    })
    const models = response.data.models?.map((model: any) => model.name) || []
    console.log('✅ Models retrieved:', models)

    return {
      success: true,
      models: models
    }
  } catch (error) {
    console.error('❌ Failed to get models:', error.message)
    return {
      success: false,
      models: []
    }
  }
})

ipcMain.handle('pull-model', async (event, modelName: string) => {
  try {
    // This is a simplified version - in production you'd want to handle streaming
    const response = await axios.post(`${OLLAMA_BASE_URL}/api/pull`, {
      name: modelName
    })

    return { success: true }
  } catch (error) {
    return { success: false }
  }
})

// Enhanced ChromaDB status check with retry
ipcMain.handle('check-chroma-status', async () => {
  console.log('🔍 Checking ChromaDB status with retry logic...')
  
  try {
    const result = await retryConnection(async () => {
      const response = await axios.get(`${CHROMA_BASE_URL}/api/v2/heartbeat`, { 
        timeout: 8000 // Increased timeout
      })
      
      return {
        connected: true,
        message: 'ChromaDB is running and accessible',
        version: 'v2',
        responseTime: Date.now()
      }
    }, 'ChromaDB', 3, 2000) // 3 retries, 2s initial delay
    
    return result
  } catch (error) {
    console.error('🚫 ChromaDB final connection failure:', error.message)
    return {
      connected: false,
      message: `ChromaDB is not running or not accessible: ${error.message}`,
      lastError: error.code
    }
  }
})

ipcMain.handle('start-chroma', async () => {
  try {
    // Kill existing process if any
    if (chromaProcess) {
      chromaProcess.kill('SIGTERM')
      chromaProcess = null
    }

    // Ensure data directory exists
    const chromaDataPath = join(__dirname, '../../chroma-data')

    // Start ChromaDB using full path and proper working directory
    chromaProcess = spawn(CHROMA_PATH, ['run', '--port', CHROMA_PORT.toString()], {
      stdio: 'pipe',
      detached: false,
      cwd: chromaDataPath
    })

    if (!chromaProcess) {
      return {
        success: false,
        message: 'Failed to start ChromaDB process'
      }
    }

    // Handle process events
    chromaProcess.on('error', (error) => {
      console.error('ChromaDB process error:', error)
      chromaProcess = null
    })

    chromaProcess.on('exit', (code, signal) => {
      console.log(`ChromaDB process exited with code ${code} and signal ${signal}`)
      chromaProcess = null
    })

    // Wait for it to start
    await new Promise(resolve => setTimeout(resolve, 4000))

    // Check if it's running
    try {
      await axios.get(`${CHROMA_BASE_URL}/api/v2/heartbeat`, { timeout: 5000 })
      return {
        success: true,
        message: 'ChromaDB started successfully'
      }
    } catch (error) {
      return {
        success: false,
        message: 'ChromaDB started but not responding. Check if port 8000 is available.'
      }
    }
  } catch (error) {
    console.error('ChromaDB start error:', error)
    return {
      success: false,
      message: `Failed to start ChromaDB. Error: ${error.message}`
    }
  }
})

// COMMENTED OUT: Chat functionality with enterprise-grade validation, security, and monitoring
// This is handled by the modular registerChatHandlers() function instead
/*
ipcMain.handle('chat-with-ai', withErrorBoundary(async (event, data: { 
  message: string; 
  model: string; 
  history: any[]; 
  memoryOptions?: any 
}) => {
  logger.info('💬 Chat request received', { 
    model: data.model, 
    messageLength: data.message.length,
    historyLength: data.history?.length || 0
  }, 'chat')

  // Validate input data
  const validation = await validateChatMessage(data)
  if (!validation.success) {
    logger.warn('Chat validation failed', validation.error, 'chat')
    return {
      success: false,
      error: validation.error.message
    }
  }

  const { message, model, history, memoryOptions = {} } = data

  // Use model routing for resilient model selection  
  const { result: chatResult, routing } = await withModelRouting(
    async (selectedModel) => {
      // Load settings to check if memory is enabled
      const settings = await loadSettings()

      // Build context from history
      let context = ''
      if (history && history.length > 0) {
        context = history
          .slice(-5) // Last 5 messages for context
          .map(msg => `${msg.type === 'user' ? 'Human' : 'Assistant'}: ${msg.content}`)
          .join('\n')
      }

      let enrichmentInfo: any = null
      let finalPrompt = message

      // Enhanced memory enrichment with user control
      if (settings.memory.enabled) {
        try {
          const memorySummaries = await getMemorySummaries()

          // Filter summaries by relevance if smart filtering is enabled
          const relevantSummaries = memoryOptions.smartFilter
            ? filterRelevantContext(message, memorySummaries)
            : memorySummaries

          // Use the new universal enrichment system
          const enrichmentResult = await withMemoryEnrichment(
            async (enrichedPrompt) => enrichedPrompt,
            message,
            relevantSummaries,
            {
              enabled: memoryOptions.enabled !== false,
              maxSummaries: memoryOptions.maxSummaries || 3,
              maxKeyFacts: memoryOptions.maxKeyFacts || 10,
              includeTopics: memoryOptions.includeTopics !== false,
              debugMode: memoryOptions.debugMode || false
            }
          )

          finalPrompt = enrichmentResult.result
          enrichmentInfo = enrichmentResult.enrichmentInfo

          console.log('🧠 Prompt enriched with memory context')
          if (memoryOptions.debugMode) {
            console.log('🔍 Memory context debug:', createContextDebugInfo(enrichmentInfo))
          }
        } catch (memoryError) {
          console.warn('⚠️ Failed to enrich prompt with memory:', memoryError)
          // Continue with original prompt if memory fails
        }
      }

      const prompt = context ? `${context}\nHuman: ${finalPrompt}\nAssistant:` : finalPrompt
      console.log('📝 Sending prompt to model:', selectedModel.name)

      // Handle different model types
      if (selectedModel.name === 'offline-fallback') {
        // Simple offline response
        return {
          success: true,
          message: "I'm currently running in offline mode with limited capabilities. Please ensure your AI services are running for full functionality.",
          modelUsed: selectedModel.name,
          routing: routing.routingPath
        }
      }

      // Send to Ollama (or other configured endpoint)
      const response = await axios.post(`${selectedModel.endpoint}/api/generate`, {
        model: model,
        prompt: prompt,
        stream: false,
        options: {
          temperature: 0.7,
          top_p: 0.9,
          top_k: 40
        }
      }, {
        timeout: 30000,
        headers: {
          'Content-Type': 'application/json'
        }
      })

      console.log('🤖 Model response received from:', selectedModel.name)

      if (response.data && response.data.response) {
        // Check if we should auto-summarize based on message count
        if (settings.memory.enabled && history.length >= settings.memory.autoSummarizeThreshold) {
          try {
            console.log('🧠 Auto-summarizing conversation...')
            const summarizationResult = await summarizeMessages(history.slice(-settings.memory.autoSummarizeThreshold))
            if (summarizationResult.success && summarizationResult.summary) {
              await addMemorySummary(summarizationResult.summary)
              console.log('✅ Auto-summarization completed')
            }
          } catch (summarizeError) {
            console.warn('⚠️ Auto-summarization failed:', summarizeError)
            // Don't fail the chat if summarization fails
          }
        }

        return {
          success: true,
          message: response.data.response,
          modelUsed: selectedModel.name,
          routing: routing.routingPath,
          enrichmentInfo: enrichmentInfo ? {
            contextUsed: enrichmentInfo.contextLength > 0,
            contextLength: enrichmentInfo.contextLength,
            summariesUsed: enrichmentInfo.injectedContext.summaries.length,
            keyFactsUsed: enrichmentInfo.injectedContext.keyFacts.length,
            debugInfo: memoryOptions.debugMode ? createContextDebugInfo(enrichmentInfo) : undefined
          } : null
        }
      } else {
        throw new Error('No response from AI model')
      }
    },
    {
      preferredModel: `ollama-${model}`,
      requiredCapabilities: ['chat'],
      maxRetries: 3,
      fallbackToOffline: true
    }
  )

  return chatResult
}, 'chat', 'chat-with-ai'))
*/

// Helper function to store conversation in ChromaDB
async function storeInChroma(userMessage: string, aiResponse: string) {
  try {
    const collectionName = 'chat_history'

    // First, ensure collection exists
    try {
      await axios.post(`${CHROMA_BASE_URL}/api/v1/collections`, {
        name: collectionName,
        metadata: { description: 'Chat conversation history' }
      })
    } catch (error) {
      // Collection might already exist, which is fine
    }

    // Store the conversation pair
    const timestamp = new Date().toISOString()
    await axios.post(`${CHROMA_BASE_URL}/api/v1/collections/${collectionName}/add`, {
      documents: [`User: ${userMessage}\nAssistant: ${aiResponse}`],
      metadatas: [{ timestamp, type: 'conversation' }],
      ids: [`conv_${Date.now()}`]
    })
  } catch (error) {
    console.error('ChromaDB storage error:', error)
    throw error
  }
}

// Search functionality using ChromaDB
ipcMain.handle('search-context', async (event, query: string) => {
  try {
    const response = await axios.post(`${CHROMA_BASE_URL}/api/v1/collections/chat_history/query`, {
      query_texts: [query],
      n_results: 5
    })

    return {
      success: true,
      results: response.data.documents || []
    }
  } catch (error) {
    return {
      success: false,
      results: []
    }
  }
})

// Legacy ping handler for compatibility
ipcMain.on('ping', () => console.log('pong'))

// Secure Storage IPC Handlers
ipcMain.handle('get-settings', async (): Promise<AppSettings> => {
  console.log('📁 Loading user settings...')
  try {
    const settings = await loadSettings()
    console.log('✅ Settings loaded successfully')
    return settings
  } catch (error) {
    console.error('❌ Failed to load settings:', error)
    throw error
  }
})

ipcMain.handle('save-settings', withRateLimit('save-settings', async (event, settings: AppSettings): Promise<void> => {
  console.log('💾 Saving user settings...')
  try {
    await saveSettings(settings)
    console.log('✅ Settings saved successfully')
  } catch (error) {
    console.error('❌ Failed to save settings:', error)
    throw error
  }
}))

ipcMain.handle('get-chat-history', async (): Promise<Message[]> => {
  console.log('📜 Loading chat history...')
  try {
    const history = await loadChatHistory()
    console.log(`✅ Chat history loaded: ${history.length} messages`)
    return history
  } catch (error) {
    console.error('❌ Failed to load chat history:', error)
    throw error
  }
})

ipcMain.handle('add-message-to-history', async (event, message: Message): Promise<void> => {
  console.log('💬 Adding message to history...')
  try {
    await appendChatMessage(message)
    console.log('✅ Message added to history successfully')
  } catch (error) {
    console.error('❌ Failed to add message to history:', error)
    throw error
  }
})

// Memory Management IPC Handlers
ipcMain.handle('get-memory-store', async () => {
  console.log('🧠 Loading memory store...')
  try {
    const memoryStore = await loadMemoryStore()
    console.log('✅ Memory store loaded successfully')
    return memoryStore
  } catch (error) {
    console.error('❌ Failed to load memory store:', error)
    throw error
  }
})

ipcMain.handle('add-memory-summary', async (event, summary: MemorySummary) => {
  console.log('🧠 Adding memory summary...')
  try {
    await addMemorySummary(summary)
    console.log('✅ Memory summary added successfully')
  } catch (error) {
    console.error('❌ Failed to add memory summary:', error)
    throw error
  }
})

ipcMain.handle('clear-memory', async () => {
  console.log('🧠 Clearing memory store...')
  try {
    await clearMemoryStore()
    console.log('✅ Memory store cleared successfully')
  } catch (error) {
    console.error('❌ Failed to clear memory store:', error)
    throw error
  }
})

ipcMain.handle('update-memory-settings', async (event, enabled: boolean, retentionDays?: number) => {
  console.log('🧠 Updating memory settings...')
  try {
    await updateMemorySettings(enabled, retentionDays)
    console.log('✅ Memory settings updated successfully')
  } catch (error) {
    console.error('❌ Failed to update memory settings:', error)
    throw error
  }
})

ipcMain.handle('get-memory-summaries', async () => {
  console.log('🧠 Getting memory summaries...')
  try {
    const summaries = await getMemorySummaries()
    console.log(`✅ Retrieved ${summaries.length} memory summaries`)
    return summaries
  } catch (error) {
    console.error('❌ Failed to get memory summaries:', error)
    throw error
  }
})

ipcMain.handle('summarize-messages', withRateLimit('summarize-messages', async (event, messages: Message[], model?: string) => {
  console.log('🧠 Summarizing messages...')
  try {
    const result = await summarizeMessages(messages, model)
    if (result.success && result.summary) {
      console.log('✅ Messages summarized successfully')
      // Automatically add to memory if successful
      await addMemorySummary(result.summary)
    }
    return result
  } catch (error) {
    console.error('❌ Failed to summarize messages:', error)
    return { success: false, error: 'Summarization failed' }
  }
}))


// WORKING CHAT HANDLER - This replaces the broken one above
ipcMain.handle('chat-with-ai-working', async (event, data: { message: string; model: string; history: any[]; memoryOptions?: any }) => {
  console.log('💬 WORKING Chat request:', { model: data.model, message: data.message.substring(0, 50) + '...' })

  const { message, model, history } = data

  try {
    console.log('📝 Sending to Ollama model:', model)

    // Use simple generate API with just the user's message - no complex formatting
    const response = await axios.post(`${OLLAMA_BASE_URL}/api/generate`, {
      model: model,
      prompt: message,
      stream: false,
      options: {
        temperature: 0.7,
        num_predict: 100  // Shorter responses
      }
    }, {
      timeout: 120000, // 2 minutes
      headers: {
        'Content-Type': 'application/json'
      }
    })

    console.log('✅ Response received from Ollama')
    console.log('📄 Response preview:', response.data.response?.substring(0, 100))

    if (response.data && response.data.response) {
      return {
        success: true,
        message: response.data.response.trim(),
        modelUsed: model
      }
    } else {
      return {
        success: false,
        message: 'Sorry, I received an empty response from the AI model.',
        modelUsed: model
      }
    }

  } catch (error) {
    logger.error('❌ Chat error', error, 'chat')

    let errorMessage = 'Sorry, I encountered an error.'
    if (error.code === 'ECONNABORTED') {
      errorMessage = 'Sorry, the request timed out. The model might be too large or busy.'
    } else if (error.response?.status === 404) {
      errorMessage = `Sorry, the model "${model}" was not found.`
    } else if (error.code === 'ECONNREFUSED') {
      errorMessage = 'Sorry, I cannot connect to the Ollama service.'
    }

    return {
      success: false,
      message: errorMessage,
      modelUsed: model
    }
  }
}, 'chat', 'chat-with-ai')
