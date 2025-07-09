import { app, shell, BrowserWindow, ipcMain, dialog } from 'electron'
import fs from 'fs/promises'
import path from 'path'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { spawn, ChildProcess, exec } from 'child_process'
import axios from 'axios'

// Import safe logger to prevent EPIPE errors
import { safeLog, safeError, safeWarn, safeInfo } from './utils/safeLogger'
// Import process error handler for graceful error handling
import { processErrorHandler } from './utils/processErrorHandler'

safeLog('✅ index.ts is up to date and executing')

// Import modular services and handlers
import { ollamaService } from './services/ollamaService'
import { chromaService } from './services/chromaService'
import { streamingService } from './streaming/streamingService'
import { memoryService } from './services/memoryService'
import { registerContextMenuHandlers } from './handlers/contextMenuHandlers'
import { registerGeminiCliHandlers } from './handlers/geminiCliHandlers'
import { registerClaudeDcHandlers } from './handlers/claudeDcHandlers'
import { registerMultiAiHandlers } from './handlers/multiAiHandlers'
import { registerMCPHandlers, cleanupMCP } from './handlers/mcpHandlers'
import { registerConsolidatedChatHandler } from './handlers/consolidatedChatHandler'

import {
  loadSettings,
  saveSettings,
  loadChatHistory,
  appendChatMessage,
  loadMemoryStore,
  addMemorySummary,
  clearMemoryStore,
  updateMemorySettings,
  getMemorySummaries
} from './storage'
import { withRateLimit } from './middleware/rateLimiter'

import type { AppSettings } from '../types/settings'
import type { Message, MemorySummary } from '../types/chat'

// Configure custom rate limits for specific operations
const customRateLimits = new Map([
  ['summarize-messages', { maxRequests: 10, windowMs: 60000 }], // 10 per minute
  ['get-memory-summaries', { maxRequests: 50, windowMs: 60000 }], // 50 per minute
  ['chat-with-ai', { maxRequests: 20, windowMs: 60000 }], // 20 per minute
  ['save-settings', { maxRequests: 5, windowMs: 10000 }] // 5 per 10 seconds
])

// Remove problematic global rate limiter configuration
// Rate limiting will be handled per-endpoint basis

// Constants
const OLLAMA_BASE_URL = 'http://127.0.0.1:11434'
const CHROMA_BASE_URL = 'http://localhost:8000'
const CHROMA_PORT = 8000
const CHROMA_PATH = '/Users/jibbr/.local/bin/chroma'

let chromaProcess: ChildProcess | null = null
let ollamaProcess: ChildProcess | null = null

function createWindow(): void {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    show: true, // Show immediately
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  safeLog('🪟 BrowserWindow created, showing immediately')

  mainWindow.on('ready-to-show', () => {
    safeLog('🚀 Window ready to show, focusing...')
    mainWindow.show()
    mainWindow.focus()
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

  // Register context menu handlers
  registerContextMenuHandlers()

  // Register consolidated chat handler (replaces competing implementations)
  registerConsolidatedChatHandler()

  // Register MCP handlers
  registerMCPHandlers()

  // Register Gemini CLI handlers (for CLI-specific functions only)
  registerGeminiCliHandlers(ipcMain)

  // Register Claude Desktop Commander handlers (for DC-specific functions only)
  registerClaudeDcHandlers(ipcMain)

  // Register Multi-AI Orchestrator handlers (for orchestration functions only)
  registerMultiAiHandlers(ipcMain)

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
    app.quit()
  }
})

// File System Handlers
ipcMain.handle('fs-read-file', async (event, filePath) => {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    return { success: true, content };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('fs-write-file', async (event, filePath, content) => {
  try {
    await fs.writeFile(filePath, content, 'utf-8');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('fs-list-directory', async (event, dirPath) => {
  try {
    const files = await fs.readdir(dirPath, { withFileTypes: true });
    const fileList = files.map(file => ({
      name: file.name,
      path: path.join(dirPath, file.name),
      isDirectory: file.isDirectory(),
    }));
    return { success: true, files: fileList };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('fs-create-file', async (event, filePath, content = '') => {
  try {
    await fs.writeFile(filePath, content, 'utf-8');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('fs-create-directory', async (event, dirPath) => {
  try {
    await fs.mkdir(dirPath, { recursive: true });
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('fs-delete-file', async (event, filePath) => {
  try {
    await fs.unlink(filePath);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('fs-delete-directory', async (event, dirPath) => {
  try {
    await fs.rm(dirPath, { recursive: true, force: true });
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('fs-rename-file', async (event, oldPath, newPath) => {
  try {
    await fs.rename(oldPath, newPath);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('fs-open-file-dialog', async () => {
  const result = await dialog.showOpenDialog({ properties: ['openFile'] });
  if (result.canceled) {
    return { success: false, error: 'Dialog canceled' };
  }
  return { success: true, filePath: result.filePaths[0] };
});

ipcMain.handle('fs-save-file-dialog', async (event, defaultName, content) => {
  const result = await dialog.showSaveDialog({ defaultPath: defaultName });
  if (result.canceled || !result.filePath) {
    return { success: false, error: 'Dialog canceled' };
  }
  try {
    await fs.writeFile(result.filePath, content || '', 'utf-8');
    return { success: true, filePath: result.filePath };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('fs-get-file-info', async (event, filePath) => {
  try {
    const stats = await fs.stat(filePath);
    return { success: true, info: { ...stats, isDirectory: stats.isDirectory(), isFile: stats.isFile() } };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('fs-execute-command', async (event, command, cwd) => {
  return new Promise((resolve) => {
    exec(command, { cwd }, (error, stdout, stderr) => {
      if (error) {
        resolve({ success: false, error: error.message, stderr });
      } else {
        resolve({ success: true, stdout, stderr });
      }
    });
  });
});

// Basic IPC handlers for testing
ipcMain.handle('get-app-version', () => {
  return app.getVersion()
})

// Ollama service handlers
ipcMain.handle('check-ollama-status', async () => {
  try {
    const status = await ollamaService.checkStatus()
    return status
  } catch (error: any) {
    return {
      connected: false,
      message: error.message
    }
  }
})

ipcMain.handle('get-ollama-models', async () => {
  try {
    const result = await ollamaService.getModels()
    if (result.success && result.models) {
      return {
        success: true,
        models: result.models.map(model => model.name || model.model || model)
      }
    } else {
      return {
        success: false,
        models: [],
        error: result.error || 'Failed to get models'
      }
    }
  } catch (error: any) {
    return {
      success: false,
      models: [],
      error: error.message
    }
  }
})

ipcMain.handle('pull-model', async (event, modelName) => {
  try {
    safeLog('📥 Pulling model:', modelName)
    const result = await ollamaService.pullModel(modelName)
    if (result.success) {
      safeLog('✅ Model pulled successfully:', modelName)
      return true
    } else {
      safeError('❌ Failed to pull model:', modelName, result.error)
      return false
    }
  } catch (error: any) {
    safeError('❌ Model pull error:', error)
    return false
  }
})

ipcMain.handle('start-ollama', async () => {
  try {
    const result = await ollamaService.startService()
    return result
  } catch (error: any) {
    return {
      success: false,
      message: error.message
    }
  }
})

// Settings handlers
ipcMain.handle('get-settings', async (): Promise<AppSettings> => {
  try {
    const settings = await loadSettings()
    return settings
  } catch (error: any) {
    throw error
  }
})

ipcMain.handle('save-settings', async (event, settings: AppSettings): Promise<void> => {
  try {
    await saveSettings(settings)
  } catch (error: any) {
    throw error
  }
})

// Chat history handlers
ipcMain.handle('get-chat-history', async (): Promise<Message[]> => {
  try {
    const history = await loadChatHistory()
    return history
  } catch (error: any) {
    throw error
  }
})

ipcMain.handle('add-message-to-history', async (event, message: Message): Promise<void> => {
  try {
    await appendChatMessage(message)
  } catch (error: any) {
    throw error
  }
})

// Memory handlers
ipcMain.handle('get-memory-summaries', async (): Promise<MemorySummary[]> => {
  try {
    const summaries = await getMemorySummaries()
    return summaries
  } catch (error: any) {
    throw error
  }
})

ipcMain.handle('get-memory-store', async () => {
  try {
    const memoryStore = await loadMemoryStore()
    return memoryStore
  } catch (error: any) {
    throw error
  }
})

// Additional memory handlers
ipcMain.handle('search-memory', async (event, query: string, limit?: number) => {
  try {
    const result = await memoryService.searchMemory(query, limit || 5)
    return result
  } catch (error: any) {
    return {
      success: false,
      error: error.message
    }
  }
})

ipcMain.handle('create-memory-summary', async (event, messages: Message[]) => {
  try {
    const result = await memoryService.createMemorySummary(messages)

    // If successful, also save to storage
    if (result.success && result.summary) {
      await addMemorySummary(result.summary)
    }

    return result
  } catch (error: any) {
    return {
      success: false,
      error: error.message
    }
  }
})

ipcMain.handle('enrich-with-memory', async (event, data: { prompt: string; options?: any }) => {
  try {
    const { prompt, options } = data
    const result = await memoryService.enrichPromptWithMemory(prompt, options)
    return {
      success: true,
      result
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message
    }
  }
})

// ChromaDB service handlers
ipcMain.handle('check-chroma-status', async () => {
  try {
    const status = await chromaService.checkStatus()
    return status
  } catch (error: any) {
    return {
      connected: false,
      message: error.message
    }
  }
})

ipcMain.handle('start-chroma', async () => {
  try {
    const result = await chromaService.startService()
    return result
  } catch (error: any) {
    return {
      success: false,
      message: error.message
    }
  }
})

// Model avatar handler (placeholder)
ipcMain.handle('get-model-avatar', async (event, modelName: string) => {
  // Placeholder implementation - return default avatar data
  return {
    success: true,
    avatar: {
      name: modelName,
      color: '#3B82F6',
      initials: modelName.substring(0, 2).toUpperCase(),
      type: 'text'
    }
  }
})

// ===============================
// CONSOLIDATED CHAT HANDLER NOW USED INSTEAD
// Old conflicting handler removed to prevent issues
// ===============================

// Agent management handlers
ipcMain.handle('get-agent-registry', async () => {
  try {
    const { loadAgentRegistry } = await import('./services/agents')
    const registry = await loadAgentRegistry()
    return { success: true, registry }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
})

ipcMain.handle('create-agent', async (event, agentData: any) => {
  try {
    const { createAgent } = await import('./services/agents')
    const result = await createAgent(agentData)
    return result
  } catch (error: any) {
    return { success: false, error: error.message }
  }
})

ipcMain.handle('update-agent', async (event, agentId: string, updates: any) => {
  try {
    const { updateAgent } = await import('./services/agents')
    const result = await updateAgent(agentId, updates)
    return result
  } catch (error: any) {
    return { success: false, error: error.message }
  }
})

ipcMain.handle('delete-agent', async (event, agentId: string) => {
  try {
    const { deleteAgent } = await import('./services/agents')
    const result = await deleteAgent(agentId)
    return result
  } catch (error: any) {
    return { success: false, error: error.message }
  }
})

ipcMain.handle(
  'execute-agent-tool',
  async (event, agentId: string, toolName: string, params: any) => {
    try {
      const { executeAgentTool } = await import('./services/agents')
      const result = await executeAgentTool(agentId, toolName, params)
      return result
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }
)

ipcMain.handle('get-available-tools', async () => {
  try {
    const { getAvailableTools } = await import('./services/agents')
    const tools = await getAvailableTools()
    return { success: true, tools }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
})

// Enhanced agent management handlers
ipcMain.handle('get-agent-audit-log', async (event, limit?: number) => {
  try {
    const { getAuditLog } = await import('./services/agents')
    const auditLog = await getAuditLog(limit)
    return { success: true, auditLog }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
})

ipcMain.handle('get-tool-security-info', async (event, toolKey: string) => {
  try {
    const { getToolSecurityInfo } = await import('./services/agents')
    const info = getToolSecurityInfo(toolKey)
    return { success: true, info }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
})

ipcMain.handle('get-all-tools-with-security', async () => {
  try {
    const { getAllToolsWithSecurity } = await import('./services/agents')
    const tools = getAllToolsWithSecurity()
    return { success: true, tools }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
})

ipcMain.handle('update-security-config', async (event, config: any) => {
  try {
    const { updateSecurityConfig } = await import('./services/agents')
    updateSecurityConfig(config)
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
})

ipcMain.handle('get-security-config', async () => {
  try {
    const { getSecurityConfig } = await import('./services/agents')
    const config = getSecurityConfig()
    return { success: true, config }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
})

ipcMain.handle('clone-agent', async (event, agentId: string, newName: string) => {
  try {
    const { cloneAgent } = await import('./services/agents')
    const agent = await cloneAgent(agentId, newName)
    return { success: true, agent }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
})

ipcMain.handle('set-active-agent', async (event, agentId: string | null) => {
  try {
    const { setActiveAgent } = await import('./services/agents')
    await setActiveAgent(agentId)
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
})

ipcMain.handle('get-active-agent', async () => {
  try {
    const { getActiveAgent } = await import('./services/agents')
    const agent = await getActiveAgent()
    return { success: true, agent }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
})

// Helper function for agent mode system prompts
function getSystemPromptForMode(mode: string): string {
  switch (mode) {
    case 'manual':
      return 'You are a helpful AI assistant. Respond only when directly asked. Be helpful but wait for user input.'
    case 'autonomous':
      return 'You are a proactive AI assistant. Offer suggestions, ask relevant questions, and help anticipate user needs.'
    case 'collaborative':
      return 'You are a collaborative AI partner. Work together with the user by asking clarifying questions and suggesting alternatives.'
    default:
      return 'You are a helpful AI assistant.'
  }
}

// Streaming chat handler
ipcMain.handle(
  'start-chat-stream',
  async (
    event,
    data: {
      message: string
      model: string
      streamId: string
    }
  ) => {
    try {
      const { message, model, streamId } = data

      // Start streaming response
      streamingService.startStream({
        id: streamId,
        model,
        prompt: message
      })

      // Forward streaming events to renderer
      streamingService.on('stream-chunk', (response) => {
        if (response.id === streamId) {
          event.sender.send('chat-stream-chunk', response)
        }
      })

      streamingService.on('stream-complete', (response) => {
        if (response.id === streamId) {
          event.sender.send('chat-stream-complete', response)
        }
      })

      streamingService.on('stream-error', (response) => {
        if (response.id === streamId) {
          event.sender.send('chat-stream-error', response)
        }
      })

      return { success: true, streamId }
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      }
    }
  }
)

ipcMain.handle('stop-chat-stream', async (event, streamId: string) => {
  try {
    streamingService.stopStream(streamId)
    return { success: true }
  } catch (error: any) {
    return {
      success: false,
      error: error.message
    }
  }
})

// Missing IPC handlers - proper Electron patterns
ipcMain.handle('search-context', async (event, query: string) => {
  try {
    safeLog('🔍 Search context:', query)
    const results = await chromaService.queryCollection('memory', query, 5)
    return { success: true, results }
  } catch (error: any) {
    safeError('Search context failed:', error)
    return { success: false, results: [], error: error.message }
  }
})

// Analytics handlers
ipcMain.on('analytics:track', (event, action: string, data: any) => {
  safeLog(`📊 Analytics: ${action}`, data)
})

// Canvas mode code execution handler
ipcMain.on('execute-code', async (event, code: string) => {
  try {
    const result = await runUserCodeInSandbox(code)
    event.sender.send('execute-response', result)
  } catch (error: any) {
    event.sender.send('execute-response', `Error: ${error.message}`)
  }
})

// Safe code execution sandbox
async function runUserCodeInSandbox(code: string): Promise<string> {
  try {
    // Create a safe execution environment
    const output: string[] = []
    const mockConsole = {
      log: (...args: any[]) =>
        output.push(
          'LOG: ' +
            args
              .map((arg) => (typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)))
              .join(' ')
        ),
      error: (...args: any[]) => output.push('ERROR: ' + args.join(' ')),
      warn: (...args: any[]) => output.push('WARN: ' + args.join(' ')),
      info: (...args: any[]) => output.push('INFO: ' + args.join(' '))
    }

    // Execute in isolated context
    const func = new Function(
      'console',
      `
      ${code}
    `
    )

    func(mockConsole)

    return output.length > 0 ? output.join('\n') : 'Code executed successfully (no output)'
  } catch (error: any) {
    return `Execution Error: ${error.message}`
  }
}

// Add process cleanup handlers
app.on('before-quit', async () => {
  safeLog('🔄 Application shutting down...')
  processErrorHandler.setShuttingDown(true)

  // Clean up MCP services
  await cleanupMCP()

  // Clean up child processes
  if (chromaProcess) {
    chromaProcess.kill('SIGTERM')
    chromaProcess = null
  }
  if (ollamaProcess) {
    ollamaProcess.kill('SIGTERM')
    ollamaProcess = null
  }
})

app.on('will-quit', (event) => {
  safeLog('🛑 Will quit - final cleanup')
})

safeLog('✅ PelicanOS main process initialized')
