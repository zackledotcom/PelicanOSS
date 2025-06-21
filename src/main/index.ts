import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { spawn, exec, ChildProcess } from 'child_process'
import axios from 'axios'
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
import { summarizeMessages, enrichPromptWithMemory } from './services/ollama'
import { 
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
} from './services/agents'
import type { AppSettings } from '../types/settings'
import type { Message, MemorySummary } from '../types/chat'
import type { Agent } from '../types/agents'

// Service management
let chromaProcess: ChildProcess | null = null
let ollamaProcess: ChildProcess | null = null
const CHROMA_PORT = 8000
const OLLAMA_BASE_URL = 'http://127.0.0.1:11434'  // Use IPv4 explicitly
const CHROMA_BASE_URL = `http://127.0.0.1:${CHROMA_PORT}`  // Use IPv4 explicitly

// Path constants
const CHROMA_PATH = '/Users/jibbr/.local/bin/chroma'
const OLLAMA_PATH = '/opt/homebrew/bin/ollama' // Common Homebrew location
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
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  createWindow()

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
    app.quit()
  }
})

// IPC Handlers for AI Services

// Ollama Service Management
ipcMain.handle('check-ollama-status', async () => {
  console.log('🔍 Checking Ollama status...')
  try {
    const response = await axios.get(`${OLLAMA_BASE_URL}/api/tags`, { 
      timeout: 5000,
      headers: {
        'Content-Type': 'application/json'
      }
    })
    console.log('✅ Ollama connected successfully')
    const models = response.data.models?.map((model: any) => model.name) || []
    console.log('📋 Available models:', models)
    
    return {
      connected: true,
      message: 'Ollama is running and accessible',
      models: models
    }
  } catch (error) {
    console.error('❌ Ollama connection failed:', error.message)
    return {
      connected: false,
      message: 'Ollama is not running or not accessible. Please start Ollama service.'
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

// ChromaDB Service Management
ipcMain.handle('check-chroma-status', async () => {
  try {
    const response = await axios.get(`${CHROMA_BASE_URL}/api/v2/heartbeat`, { timeout: 5000 })
    
    return {
      connected: true,
      message: 'ChromaDB is running and accessible'
    }
  } catch (error) {
    return {
      connected: false,
      message: 'ChromaDB is not running. Will attempt to start it.'
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

// Chat functionality
ipcMain.handle('chat-with-ai', async (event, data: { message: string; model: string; history: any[] }) => {
  console.log('💬 Chat request received:', { model: data.model, message: data.message.substring(0, 50) + '...' })
  try {
    const { message, model, history } = data
    
    // Load settings to check if memory is enabled
    const settings = await loadSettings()
    let enrichedPrompt = message
    
    // Enrich prompt with memory if enabled
    if (settings.memory.enabled) {
      try {
        const memorySummaries = await getMemorySummaries()
        enrichedPrompt = enrichPromptWithMemory(message, memorySummaries)
        console.log('🧠 Prompt enriched with memory context')
      } catch (memoryError) {
        console.warn('⚠️ Failed to enrich prompt with memory:', memoryError)
        // Continue with original prompt if memory fails
      }
    }
    
    // Build context from history
    let context = ''
    if (history && history.length > 0) {
      context = history
        .slice(-5) // Last 5 messages for context
        .map(msg => `${msg.type === 'user' ? 'Human' : 'Assistant'}: ${msg.content}`)
        .join('\n')
    }
    
    const prompt = context ? `${context}\nHuman: ${enrichedPrompt}\nAssistant:` : enrichedPrompt
    console.log('📝 Sending prompt to Ollama...')
    
    // Send to Ollama
    const response = await axios.post(`${OLLAMA_BASE_URL}/api/generate`, {
      model: model,
      prompt: prompt,
      stream: false,
      options: {
        temperature: 0.7,
        top_p: 0.9,
        top_k: 40
      }
    }, {
      timeout: 30000, // 30 second timeout
      headers: {
        'Content-Type': 'application/json'
      }
    })
    
    console.log('🤖 Ollama response received')
    
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
        message: response.data.response
      }
    } else {
      console.error('❌ No response from AI model')
      return {
        success: false,
        message: 'No response from AI model'
      }
    }
  } catch (error) {
    console.error('❌ Chat error:', error.message)
    return {
      success: false,
      message: 'Failed to communicate with AI model: ' + error.message
    }
  }
})

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

ipcMain.handle('save-settings', async (event, settings: AppSettings): Promise<void> => {
  console.log('💾 Saving user settings...')
  try {
    await saveSettings(settings)
    console.log('✅ Settings saved successfully')
  } catch (error) {
    console.error('❌ Failed to save settings:', error)
    throw error
  }
})

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

// Legacy ping handler for compatibility
ipcMain.on('ping', () => console.log('pong'))

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

ipcMain.handle('summarize-messages', async (event, messages: Message[], model?: string) => {
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
})

// Agent Management IPC Handlers
ipcMain.handle('agent-registry-load', async () => {
  console.log('📋 Loading agent registry...')
  try {
    const registry = await loadAgentRegistry()
    console.log('✅ Agent registry loaded successfully')
    return registry
  } catch (error) {
    console.error('❌ Failed to load agent registry:', error)
    throw error
  }
})

ipcMain.handle('agent-create', async (event, agentData: Omit<Agent, 'id' | 'created_at' | 'updated_at' | 'metadata'>) => {
  console.log('🤖 Creating new agent:', agentData.name)
  try {
    const agent = await createAgent(agentData)
    console.log('✅ Agent created successfully')
    return agent
  } catch (error) {
    console.error('❌ Failed to create agent:', error)
    throw error
  }
})

ipcMain.handle('agent-update', async (event, id: string, updates: Partial<Agent>) => {
  console.log('📝 Updating agent:', id)
  try {
    const agent = await updateAgent(id, updates)
    console.log('✅ Agent updated successfully')
    return agent
  } catch (error) {
    console.error('❌ Failed to update agent:', error)
    throw error
  }
})

ipcMain.handle('agent-delete', async (event, id: string) => {
  console.log('🗑️ Deleting agent:', id)
  try {
    await deleteAgent(id)
    console.log('✅ Agent deleted successfully')
  } catch (error) {
    console.error('❌ Failed to delete agent:', error)
    throw error
  }
})

ipcMain.handle('agent-clone', async (event, id: string, newName: string) => {
  console.log('📋 Cloning agent:', id, 'as', newName)
  try {
    const agent = await cloneAgent(id, newName)
    console.log('✅ Agent cloned successfully')
    return agent
  } catch (error) {
    console.error('❌ Failed to clone agent:', error)
    throw error
  }
})

ipcMain.handle('agent-set-active', async (event, id: string | null) => {
  console.log('🎯 Setting active agent:', id)
  try {
    await setActiveAgent(id)
    console.log('✅ Active agent set successfully')
  } catch (error) {
    console.error('❌ Failed to set active agent:', error)
    throw error
  }
})

ipcMain.handle('agent-get-active', async () => {
  console.log('🔍 Getting active agent...')
  try {
    const agent = await getActiveAgent()
    console.log('✅ Active agent retrieved')
    return agent
  } catch (error) {
    console.error('❌ Failed to get active agent:', error)
    throw error
  }
})

ipcMain.handle('agent-get-all', async () => {
  console.log('📋 Getting all agents...')
  try {
    const agents = await getAllAgents()
    console.log(`✅ Retrieved ${agents.length} agents`)
    return agents
  } catch (error) {
    console.error('❌ Failed to get agents:', error)
    throw error
  }
})

ipcMain.handle('agent-get-available-tools', async () => {
  console.log('🔧 Getting available tools...')
  try {
    const tools = getAvailableTools()
    console.log('✅ Available tools retrieved')
    return tools
  } catch (error) {
    console.error('❌ Failed to get available tools:', error)
    throw error
  }
})

ipcMain.handle('agent-validate-tool', async (event, toolKey: string) => {
  console.log('🔍 Validating tool:', toolKey)
  try {
    const isValid = validateToolKey(toolKey)
    console.log(`✅ Tool validation result: ${isValid}`)
    return isValid
  } catch (error) {
    console.error('❌ Failed to validate tool:', error)
    return false
  }
})
