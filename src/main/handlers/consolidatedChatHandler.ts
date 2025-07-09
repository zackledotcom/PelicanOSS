/**
 * CONSOLIDATED CHAT HANDLER - Single Source of Truth
 * Replacing all competing implementations with one working solution
 * Following Electron IPC best practices from systemic analysis
 */

import { ipcMain } from 'electron'
import axios from 'axios'
import { safeLog, safeError } from '../utils/safeLogger'

// Service URLs
const OLLAMA_BASE_URL = 'http://localhost:11434'
const GEMINI_BASE_URL = 'http://localhost:8080' // Assuming Gemini CLI runs on 8080
const CLAUDE_DC_BASE_URL = 'http://localhost:9090' // Assuming Claude DC runs on 9090

interface ChatRequest {
  message: string
  model: string
  history?: any[]
  provider?: 'ollama' | 'gemini' | 'claude'
  memoryOptions?: any
}

interface ChatResponse {
  success: boolean
  response: string // Changed from 'message' to 'response'
  model?: string   // Changed from 'modelUsed' to 'model'
  provider?: string
  error?: string
  timestamp?: string
}

/**
 * SINGLE CONSOLIDATED CHAT HANDLER
 * Replaces all competing implementations
 */
export function registerConsolidatedChatHandler(): void {
  safeLog('🔧 Registering consolidated chat handler...')

  // Remove any existing chat handlers to prevent conflicts
  try {
    ipcMain.removeAllListeners('chat-with-ai')
    ipcMain.removeAllListeners('enhanced-chat')
    ipcMain.removeAllListeners('multi-ai-chat')
    safeLog('✅ Removed conflicting chat handlers')
  } catch (error) {
    safeLog('⚠️ No existing handlers to remove')
  }

  // Single handler for all chat requests
  ipcMain.handle('chat-with-ai', async (event, data: ChatRequest): Promise<ChatResponse> => {
    const startTime = Date.now()
    safeLog(`💬 Chat request: ${data.provider || 'auto'} | ${data.model} | "${data.message.substring(0, 50)}..."`)

    try {
      // Auto-detect provider if not specified
      const provider = data.provider || detectProvider(data.model)
      
      let response: ChatResponse

      switch (provider) {
        case 'ollama':
          response = await handleOllamaChat(data)
          break
        case 'gemini':
          response = await handleGeminiChat(data)
          break
        case 'claude':
          response = await handleClaudeChat(data)
          break
        default:
          // Fallback to Ollama as default
          response = await handleOllamaChat(data)
      }

      const duration = Date.now() - startTime
      safeLog(`✅ Chat completed in ${duration}ms`)
      
      return {
        ...response,
        timestamp: new Date().toISOString()
      }

    } catch (error) {
      safeError('❌ Chat handler error:', error)
      return {
        success: false,
        response: 'Sorry, I encountered an error processing your request.', // Changed from 'message' to 'response'
        model: '',
        timestamp: new Date().toISOString(),
        error: String(error)
      }
    }
  })

  safeLog('✅ Consolidated chat handler registered')
}

/**
 * OLLAMA CHAT HANDLER
 */
async function handleOllamaChat(data: ChatRequest): Promise<ChatResponse> {
  try {
    // Check Ollama connection first
    const healthCheck = await axios.get(`${OLLAMA_BASE_URL}/api/version`, { timeout: 5000 })
    if (!healthCheck.data) {
      throw new Error('Ollama service not responding')
    }

    // Build prompt with history
    let prompt = data.message
    if (data.history && data.history.length > 0) {
      const context = data.history
        .slice(-3) // Last 3 messages for context
        .map(msg => `${msg.type === 'user' ? 'Human' : 'Assistant'}: ${msg.content}`)
        .join('\n')
      prompt = `${context}\nHuman: ${data.message}\nAssistant:`
    }

    safeLog(`📝 Ollama request: ${data.model}`)

    const response = await axios.post(`${OLLAMA_BASE_URL}/api/generate`, {
      model: data.model,
      prompt: prompt,
      stream: false,
      options: {
        temperature: 0.7,
        top_p: 0.9,
        top_k: 40,
        num_predict: 512
      }
    }, {
      timeout: 120000,
      headers: { 'Content-Type': 'application/json' }
    })

    if (response.data?.response) {
      return {
        success: true,
        response: response.data.response.trim(), // Changed from 'message' to 'response'
        model: data.model, // Changed from 'modelUsed' to 'model'
        timestamp: new Date().toISOString(),
        provider: 'ollama'
      }
    } else {
      throw new Error('Empty response from Ollama')
    }

  } catch (error) {
    safeError('❌ Ollama chat error:', error)
    
    let errorMessage = 'Ollama service error'
    if (error.code === 'ECONNREFUSED') {
      errorMessage = 'Cannot connect to Ollama. Please ensure Ollama is running.'
    } else if (error.response?.status === 404) {
      errorMessage = `Model "${data.model}" not found. Please check if the model is installed.`
    } else if (error.code === 'ECONNABORTED') {
      errorMessage = 'Request timed out. The model might be too large or busy.'
    }

    return {
      success: false,
      response: errorMessage, // Changed from 'message' to 'response'
      model: data.model,
      timestamp: new Date().toISOString(),
      provider: 'ollama',
      error: String(error)
    }
  }
}

/**
 * GEMINI CLI CHAT HANDLER
 */
async function handleGeminiChat(data: ChatRequest): Promise<ChatResponse> {
  try {
    // Check Gemini CLI connection
    const healthCheck = await axios.get(`${GEMINI_BASE_URL}/health`, { timeout: 5000 })
    
    safeLog(`📝 Gemini CLI request: ${data.model}`)

    const response = await axios.post(`${GEMINI_BASE_URL}/chat`, {
      message: data.message,
      model: data.model,
      history: data.history || []
    }, {
      timeout: 60000,
      headers: { 'Content-Type': 'application/json' }
    })

    if (response.data?.response) {
      return {
        success: true,
        response: response.data.response, // Changed from 'message' to 'response'
        model: data.model, // Changed from 'modelUsed' to 'model'
        timestamp: new Date().toISOString(),
        provider: 'gemini'
      }
    } else {
      throw new Error('Empty response from Gemini CLI')
    }

  } catch (error) {
    safeError('❌ Gemini CLI chat error:', error)
    
    let errorMessage = 'Gemini CLI service error'
    if (error.code === 'ECONNREFUSED') {
      errorMessage = 'Cannot connect to Gemini CLI. Please ensure the service is running.'
    }

    return {
      success: false,
      response: errorMessage, // Changed from 'message' to 'response'
      model: data.model,
      timestamp: new Date().toISOString(),
      provider: 'gemini',
      error: String(error)
    }
  }
}

/**
 * CLAUDE DC CHAT HANDLER
 */
async function handleClaudeChat(data: ChatRequest): Promise<ChatResponse> {
  try {
    // Check Claude DC connection
    const healthCheck = await axios.get(`${CLAUDE_DC_BASE_URL}/health`, { timeout: 5000 })
    
    safeLog(`📝 Claude DC request: ${data.model}`)

    const response = await axios.post(`${CLAUDE_DC_BASE_URL}/chat`, {
      message: data.message,
      model: data.model,
      history: data.history || []
    }, {
      timeout: 60000,
      headers: { 'Content-Type': 'application/json' }
    })

    if (response.data?.response) {
      return {
        success: true,
        response: response.data.response, // Changed from 'message' to 'response'
        model: data.model, // Changed from 'modelUsed' to 'model'
        timestamp: new Date().toISOString(),
        provider: 'claude'
      }
    } else {
      throw new Error('Empty response from Claude DC')
    }

  } catch (error) {
    safeError('❌ Claude DC chat error:', error)
    
    let errorMessage = 'Claude DC service error'
    if (error.code === 'ECONNREFUSED') {
      errorMessage = 'Cannot connect to Claude DC. Please ensure the service is running.'
    }

    return {
      success: false,
      response: errorMessage, // Changed from 'message' to 'response'
      model: data.model,
      timestamp: new Date().toISOString(),
      provider: 'claude',
      error: String(error)
    }
  }
}

/**
 * AUTO-DETECT PROVIDER FROM MODEL NAME
 */
function detectProvider(model: string): 'ollama' | 'gemini' | 'claude' {
  const modelLower = model.toLowerCase()
  
  if (modelLower.includes('gemini') || modelLower.includes('palm')) {
    return 'gemini'
  } else if (modelLower.includes('claude')) {
    return 'claude'
  } else {
    // Default to Ollama for local models
    return 'ollama'
  }
}
