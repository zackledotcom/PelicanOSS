/**
 * Enterprise Chat Handlers - Unified Chat Processing Pipeline
 * 
 * Handles all chat-related IPC operations with validation, error recovery,
 * and performance monitoring. Foundation for Phase 2 streaming implementation.
 * 
 * @author PelicanOS Engineering Team  
 * @version 2.0.0 - Modular Architecture
 */

import { ipcMain, IpcMainInvokeEvent } from 'electron'
import { logger } from '../utils/logger'
import { withErrorBoundary } from '../core/errorHandler'
import { validateChatMessage } from '../validation/schemas'
// import { ollamaService } from '../services/ollama'
// import { streamingService, ChatStream } from '../streaming/streamingService'

export interface ChatRequest {
  message: string
  model: string
  history?: Array<{ role: string; content: string }>
  memoryOptions?: {
    enabled?: boolean
    searchLimit?: number
    threshold?: number
  }
  streaming?: boolean
  options?: {
    temperature?: number
    max_tokens?: number
  }
}

export interface ChatResponse {
  success: boolean
  message?: string
  modelUsed: string
  responseTime?: number
  tokenCount?: number
  memoryUsed?: boolean
  error?: string
}

/**
 * Unified Chat Processing Pipeline
 * Handles both traditional and streaming chat requests
 */
export class ChatProcessor {
  private static instance: ChatProcessor

  static getInstance(): ChatProcessor {
    if (!ChatProcessor.instance) {
      ChatProcessor.instance = new ChatProcessor()
    }
    return ChatProcessor.instance
  }

  /**
   * Process traditional chat request (Phase 1)
   */
  async processChat(request: ChatRequest): Promise<ChatResponse> {
    const startTime = Date.now()
    
    logger.info('Processing chat request', {
      model: request.model,
      messageLength: request.message.length,
      historyLength: request.history?.length || 0,
      memoryEnabled: request.memoryOptions?.enabled || false
    }, 'chat-processor')

    try {
      // Build context from history
      let context = ''
      if (request.history && request.history.length > 0) {
        context = request.history
          .slice(-5) // Last 5 messages for context
          .map(msg => `${msg.role}: ${msg.content}`)
          .join('\n')
      }

      // Enhance with memory if enabled
      let enhancedPrompt = request.message
      let memoryUsed = false

      if (request.memoryOptions?.enabled) {
        const contextResults = await chromaService.searchContext(
          request.message,
          request.memoryOptions.searchLimit || 3
        )

        if (contextResults.length > 0) {
          const relevantContext = contextResults
            .filter(result => result.similarity >= (request.memoryOptions?.threshold || 0.7))
            .map(result => result.content)
            .join('\n\n')

          if (relevantContext) {
            enhancedPrompt = `Context from previous conversations:
${relevantContext}

Current conversation:
${context}

User: ${request.message}`
            memoryUsed = true
          }
        }
      } else if (context) {
        enhancedPrompt = `${context}\nUser: ${request.message}`
      }

      // Generate response using Ollama
      const ollamaResponse = await ollamaService.chat({
        model: request.model,
        prompt: enhancedPrompt,
        stream: false,
        options: request.options
      })

      // Store conversation in memory for future context
      if (ollamaResponse.response) {
        await chromaService.storeChatMessage(
          request.message,
          ollamaResponse.response,
          {
            model: request.model,
            timestamp: new Date().toISOString(),
            responseTime: Date.now() - startTime
          }
        )
      }

      const responseTime = Date.now() - startTime

      logger.performance('Chat request completed', responseTime, {
        model: request.model,
        promptTokens: ollamaResponse.prompt_eval_count,
        completionTokens: ollamaResponse.eval_count,
        memoryUsed
      }, 'chat-processor')

      return {
        success: true,
        message: ollamaResponse.response,
        modelUsed: request.model,
        responseTime,
        tokenCount: (ollamaResponse.prompt_eval_count || 0) + (ollamaResponse.eval_count || 0),
        memoryUsed
      }

    } catch (error: any) {
      const responseTime = Date.now() - startTime
      
      logger.error('Chat processing failed', error, 'chat-processor')

      return {
        success: false,
        modelUsed: request.model,
        responseTime,
        error: this.getErrorMessage(error, request.model)
      }
    }
  }

  /**
   * Process streaming chat request (Phase 2 foundation)
   */
  async processStreamingChat(
    request: ChatRequest,
    onToken: (token: { content: string; done: boolean }) => void
  ): Promise<ChatResponse> {
    // This is the foundation for Phase 2 streaming implementation
    logger.info('Streaming chat requested - Phase 2 implementation', {
      model: request.model
    }, 'chat-processor')

    // For now, fall back to regular chat
    // Phase 2 will implement true streaming here
    return await this.processChat({ ...request, streaming: false })
  }

  /**
   * Generate appropriate error message
   */
  private getErrorMessage(error: any, model: string): string {
    if (error.code === 'ECONNABORTED') {
      return 'Request timed out. The model might be too large or busy.'
    }
    if (error.response?.status === 404) {
      return `Model "${model}" was not found. Please check if it's installed.`
    }
    if (error.code === 'ECONNREFUSED') {
      return 'Cannot connect to the AI service. Please check if Ollama is running.'
    }
    return `An error occurred while processing your request: ${error.message}`
  }
}

/**
 * Register all chat-related IPC handlers
 */
export function registerChatHandlers(): void {
  const chatProcessor = ChatProcessor.getInstance()

  // Main chat handler with enterprise validation and error handling
  ipcMain.handle('chat-with-ai', withErrorBoundary(
    async (event: IpcMainInvokeEvent, data: ChatRequest): Promise<ChatResponse> => {
      // Validate input data
      const validation = await validateChatMessage(data)
      if (!validation.success) {
        logger.warn('Chat validation failed', validation.error, 'chat-handlers')
        return {
          success: false,
          modelUsed: data.model || 'unknown',
          error: validation.error?.message || 'Invalid request data'
        }
      }

      return await chatProcessor.processChat(data)
    },
    'chat-handlers',
    'chat-with-ai'
  ))

  // Stream chat handler - PRODUCTION IMPLEMENTATION
  ipcMain.handle('chat-stream-start', withErrorBoundary(
    async (event: IpcMainInvokeEvent, data: ChatRequest): Promise<{ streamId: string }> => {
      // Validate streaming request
      const validation = await validateChatMessage(data)
      if (!validation.success) {
        throw new Error(validation.error?.message || 'Invalid streaming request')
      }

      // Create new stream
      const stream = await streamingService.createChatStream({
        message: data.message,
        model: data.model,
        options: data.options
      })

      // Set up real-time event forwarding to renderer
      stream.on('token', (token) => {
        event.sender.send('chat-stream-token', {
          streamId: stream.id,
          token
        })
      })

      stream.on('complete', (result) => {
        event.sender.send('chat-stream-complete', {
          streamId: stream.id,
          result
        })
      })

      stream.on('error', (result) => {
        event.sender.send('chat-stream-error', {
          streamId: stream.id,
          error: {
            message: result.error || 'Stream failed',
            recoverable: true
          }
        })
      })

      stream.on('cancelled', (result) => {
        event.sender.send('chat-stream-cancelled', {
          streamId: stream.id,
          result
        })
      })

      // Start the stream
      await stream.start()

      logger.success(`Started streaming chat ${stream.id}`, {
        model: data.model
      }, 'chat-handlers')

      return { streamId: stream.id }
    },
    'chat-handlers',
    'chat-stream-start'
  ))

  // Cancel stream handler - PRODUCTION IMPLEMENTATION
  ipcMain.handle('chat-stream-cancel', withErrorBoundary(
    async (event: IpcMainInvokeEvent, data: { streamId: string }): Promise<{ success: boolean }> => {
      const success = await streamingService.cancelStream(data.streamId)
      
      logger.info(`Stream cancellation ${success ? 'successful' : 'failed'}`, {
        streamId: data.streamId
      }, 'chat-handlers')
      
      return { success }
    },
    'chat-handlers',
    'chat-stream-cancel'
  ))

  // Get chat metrics handler
  ipcMain.handle('chat-get-metrics', withErrorBoundary(
    async (event: IpcMainInvokeEvent): Promise<any> => {
      return {
        ollamaMetrics: ollamaService.getServiceMetrics(),
        chromaMetrics: chromaService.getServiceMetrics(),
        streamingMetrics: streamingService.getServiceMetrics(),
        processorStats: {
          totalRequests: 0, // Will be tracked in future iterations
          averageResponseTime: 0,
          errorRate: 0
        }
      }
    },
    'chat-handlers',
    'chat-get-metrics'
  ))

  logger.success('Chat handlers registered successfully', {
    handlers: ['chat-with-ai', 'chat-stream-start', 'chat-stream-cancel', 'chat-get-metrics']
  }, 'chat-handlers')
}
