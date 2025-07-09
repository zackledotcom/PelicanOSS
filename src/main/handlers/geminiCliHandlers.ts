/**
 * Gemini CLI IPC Handlers
 *
 * This file manages IPC communication between the renderer process and the
 * GeminiCliService in the main process. It follows the existing patterns
 * in the PelicanOS project for creating secure and robust handlers.
 */

import { ipcMain } from 'electron'
import { GeminiCliService, defaultGeminiCliConfig } from '../services/GeminiCliService'
import { withErrorBoundary } from '../core/errorHandler'
import { logger } from '../utils/logger'

// Initialize the Gemini CLI service as a singleton
const geminiCliService = new GeminiCliService(defaultGeminiCliConfig)
geminiCliService.initialize().catch((error) => {
  logger.error('Failed to initialize GeminiCliService on startup', error, 'gemini-cli-handlers')
})

/**
 * Registers all IPC handlers for the Gemini CLI service.
 * This function is called from the main process entry point.
 *
 * @param ipcMain The Electron ipcMain module.
 */
export function registerGeminiCliHandlers(ipcMain: Electron.IpcMain): void {
  // Analyze a project directory
  ipcMain.handle(
    'gemini-cli-analyze-project',
    withErrorBoundary(
      async (
        _,
        { projectPath, analysisType }: { projectPath: string; analysisType: string }
      ) => {
        logger.info(
          'Received gemini-cli-analyze-project request',
          { projectPath, analysisType },
          'gemini-cli-handlers'
        )
        return await geminiCliService.analyzeProject(projectPath, analysisType)
      },
      'gemini-cli-handlers',
      'analyze-project'
    )
  )

  // Generate a code modification diff
  ipcMain.handle(
    'gemini-cli-generate-modification',
    withErrorBoundary(
      async (
        _,
        {
          projectPath,
          instruction,
          targetFiles
        }: { projectPath: string; instruction: string; targetFiles?: string[] }
      ) => {
        logger.info(
          'Received gemini-cli-generate-modification request',
          { projectPath, instruction, targetFiles },
          'gemini-cli-handlers'
        )
        return await geminiCliService.generateCodeModification(
          projectPath,
          instruction,
          targetFiles
        )
      },
      'gemini-cli-handlers',
      'generate-modification'
    )
  )

  // Chat with context from a project
  ipcMain.handle(
    'gemini-cli-chat-with-context',
    withErrorBoundary(
      async (_, { message, projectPath }: { message: string; projectPath?: string }) => {
        logger.info(
          'Received gemini-cli-chat-with-context request',
          { projectPath },
          'gemini-cli-handlers'
        )
        return await geminiCliService.chatWithContext(message, projectPath)
      },
      'gemini-cli-handlers',
      'chat-with-context'
    )
  )

  // Apply a previously generated diff
  ipcMain.handle(
    'gemini-cli-apply-diff',
    withErrorBoundary(
      async (_, { diff, projectPath }: { diff: string; projectPath: string }) => {
        logger.info(
          'Received gemini-cli-apply-diff request',
          { projectPath },
          'gemini-cli-handlers'
        )
        return await geminiCliService.applyDiff(diff, projectPath)
      },
      'gemini-cli-handlers',
      'apply-diff'
    )
  )

  logger.success('Gemini CLI IPC handlers registered successfully', {}, 'gemini-cli-handlers')
}
