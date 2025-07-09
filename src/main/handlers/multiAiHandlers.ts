/**
 * Multi-AI Orchestrator IPC Handlers
 *
 * This file manages IPC communication for the Multi-AI collaboration features.
 * It provides handlers for starting collaborations, streaming updates, and
 * managing multi-AI discussions.
 */

import { ipcMain } from 'electron'
import { MultiAiOrchestrator, getMultiAiOrchestrator } from '../services/MultiAiOrchestrator'
import { GeminiCliService, defaultGeminiCliConfig } from '../services/GeminiCliService'
import { ClaudeDcService, defaultClaudeDcConfig } from '../services/ClaudeDcService'
import { withErrorBoundary } from '../core/errorHandler'
import { logger } from '../utils/logger'

// Initialize services and orchestrator
const geminiService = new GeminiCliService(defaultGeminiCliConfig)
const claudeService = new ClaudeDcService(defaultClaudeDcConfig)
const multiAiOrchestrator = getMultiAiOrchestrator(geminiService, claudeService)

// Initialize services
Promise.all([
  geminiService.initialize(),
  claudeService.initialize()
]).then(([geminiReady, claudeReady]) => {
  logger.info('Multi-AI services initialization', { geminiReady, claudeReady }, 'multi-ai-handlers')
}).catch(error => {
  logger.error('Failed to initialize Multi-AI services', error, 'multi-ai-handlers')
})

/**
 * Registers all IPC handlers for the Multi-AI orchestrator.
 * This function is called from the main process entry point.
 *
 * @param ipcMain The Electron ipcMain module.
 */
export function registerMultiAiHandlers(ipcMain: Electron.IpcMain): void {
  // Start a multi-AI collaboration
  ipcMain.handle(
    'multi-ai-start-collaboration',
    withErrorBoundary(
      async (
        _,
        {
          prompt,
          providers,
          options
        }: {
          prompt: string
          providers: Array<'claude' | 'gemini' | 'ollama'>
          options?: {
            enableDiscussion?: boolean
            discussionRounds?: number
            streamingEnabled?: boolean
            timeout?: number
          }
        }
      ) => {
        logger.info(
          'Received multi-ai-start-collaboration request',
          { prompt: prompt.substring(0, 100), providers, options },
          'multi-ai-handlers'
        )

        const requestId = `collab-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        
        const request = {
          id: requestId,
          prompt,
          providers,
          options: {
            enableDiscussion: options?.enableDiscussion ?? false,
            discussionRounds: options?.discussionRounds ?? 1,
            streamingEnabled: options?.streamingEnabled ?? true,
            timeout: options?.timeout ?? 60000
          }
        }

        return await multiAiOrchestrator.startCollaboration(request)
      },
      'multi-ai-handlers',
      'start-collaboration'
    )
  )

  // Stop an active collaboration
  ipcMain.handle(
    'multi-ai-stop-collaboration',
    withErrorBoundary(
      async (_, { requestId }: { requestId: string }) => {
        logger.info(
          'Received multi-ai-stop-collaboration request',
          { requestId },
          'multi-ai-handlers'
        )
        
        await multiAiOrchestrator.stopCollaboration(requestId)
        return { success: true, requestId }
      },
      'multi-ai-handlers',
      'stop-collaboration'
    )
  )

  // Get active collaborations
  ipcMain.handle(
    'multi-ai-get-active',
    withErrorBoundary(
      async () => {
        logger.info('Received multi-ai-get-active request', {}, 'multi-ai-handlers')
        return multiAiOrchestrator.getActiveCollaborations()
      },
      'multi-ai-handlers',
      'get-active'
    )
  )

  // Get collaboration statistics
  ipcMain.handle(
    'multi-ai-get-stats',
    withErrorBoundary(
      async () => {
        logger.info('Received multi-ai-get-stats request', {}, 'multi-ai-handlers')
        return multiAiOrchestrator.getCollaborationStats()
      },
      'multi-ai-handlers',
      'get-stats'
    )
  )

  // Check provider availability
  ipcMain.handle(
    'multi-ai-check-providers',
    withErrorBoundary(
      async (_, { providers }: { providers: Array<'claude' | 'gemini' | 'ollama'> }) => {
        logger.info(
          'Received multi-ai-check-providers request',
          { providers },
          'multi-ai-handlers'
        )

        const results = await Promise.all(
          providers.map(async provider => ({
            provider,
            available: await multiAiOrchestrator.checkProviderAvailability(provider)
          }))
        )

        return results.reduce((acc, { provider, available }) => {
          acc[provider] = available
          return acc
        }, {} as Record<string, boolean>)
      },
      'multi-ai-handlers',
      'check-providers'
    )
  )

  // Simple collaborative chat (quick mode)
  ipcMain.handle(
    'multi-ai-quick-chat',
    withErrorBoundary(
      async (
        _,
        {
          message,
          providers
        }: {
          message: string
          providers: Array<'claude' | 'gemini' | 'ollama'>
        }
      ) => {
        logger.info(
          'Received multi-ai-quick-chat request',
          { message: message.substring(0, 100), providers },
          'multi-ai-handlers'
        )

        const requestId = `quick-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        
        const request = {
          id: requestId,
          prompt: message,
          providers,
          options: {
            enableDiscussion: false,
            discussionRounds: 0,
            streamingEnabled: false,
            timeout: 30000
          }
        }

        const result = await multiAiOrchestrator.startCollaboration(request)
        
        // Return simplified response for quick chat
        return {
          success: result.success,
          responses: result.responses.map(r => ({
            provider: r.provider,
            content: r.content,
            success: r.success,
            error: r.error,
            responseTime: r.responseTime
          })),
          totalTime: result.totalTime
        }
      },
      'multi-ai-handlers',
      'quick-chat'
    )
  )

  // Test individual provider
  ipcMain.handle(
    'multi-ai-test-provider',
    withErrorBoundary(
      async (
        _,
        {
          provider,
          testMessage
        }: {
          provider: 'claude' | 'gemini' | 'ollama'
          testMessage?: string
        }
      ) => {
        logger.info(
          'Received multi-ai-test-provider request',
          { provider, testMessage },
          'multi-ai-handlers'
        )

        const message = testMessage || 'Hello, this is a test message. Please respond briefly.'
        const requestId = `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        
        const request = {
          id: requestId,
          prompt: message,
          providers: [provider],
          options: {
            enableDiscussion: false,
            discussionRounds: 0,
            streamingEnabled: false,
            timeout: 15000
          }
        }

        try {
          const result = await multiAiOrchestrator.startCollaboration(request)
          const response = result.responses[0]
          
          return {
            provider,
            available: response.success,
            responseTime: response.responseTime,
            testResponse: response.success ? response.content.substring(0, 200) : null,
            error: response.error
          }
        } catch (error) {
          return {
            provider,
            available: false,
            responseTime: 0,
            testResponse: null,
            error: error instanceof Error ? error.message : 'Unknown error'
          }
        }
      },
      'multi-ai-handlers',
      'test-provider'
    )
  )

  logger.success('Multi-AI Orchestrator IPC handlers registered successfully', {}, 'multi-ai-handlers')
}

// Setup streaming event forwarding
multiAiOrchestrator.on('streaming-update', (update) => {
  // Forward streaming updates to all renderer processes
  const allWindows = require('electron').BrowserWindow.getAllWindows()
  allWindows.forEach(window => {
    window.webContents.send('multi-ai-streaming-update', update)
  })
})

multiAiOrchestrator.on('collaboration-stopped', (data) => {
  // Forward collaboration stop events to all renderer processes
  const allWindows = require('electron').BrowserWindow.getAllWindows()
  allWindows.forEach(window => {
    window.webContents.send('multi-ai-collaboration-stopped', data)
  })
})