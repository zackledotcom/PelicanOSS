/**
 * Claude Desktop Commander IPC Handlers
 *
 * This file manages IPC communication between the renderer process and the
 * ClaudeDcService in the main process. It follows the existing patterns
 * in the PelicanOS project for creating secure and robust handlers.
 */

import { ipcMain } from 'electron'
import { ClaudeDcService, defaultClaudeDcConfig } from '../services/ClaudeDcService'
import { withErrorBoundary } from '../core/errorHandler'
import { logger } from '../utils/logger'

// Initialize the Claude DC service as a singleton
const claudeDcService = new ClaudeDcService(defaultClaudeDcConfig)
claudeDcService.initialize().catch((error) => {
  logger.error('Failed to initialize ClaudeDcService on startup', error, 'claude-dc-handlers')
})

/**
 * Registers all IPC handlers for the Claude Desktop Commander service.
 * This function is called from the main process entry point.
 *
 * @param ipcMain The Electron ipcMain module.
 */
export function registerClaudeDcHandlers(ipcMain: Electron.IpcMain): void {
  // Read file contents
  ipcMain.handle(
    'claude-dc-read-file',
    withErrorBoundary(
      async (
        _,
        { filePath, options }: { filePath: string; options?: { offset?: number; length?: number } }
      ) => {
        logger.info(
          'Received claude-dc-read-file request',
          { filePath, options },
          'claude-dc-handlers'
        )
        return await claudeDcService.readFile(filePath, options)
      },
      'claude-dc-handlers',
      'read-file'
    )
  )

  // Write file contents
  ipcMain.handle(
    'claude-dc-write-file',
    withErrorBoundary(
      async (
        _,
        {
          filePath,
          content,
          mode
        }: { filePath: string; content: string; mode?: 'rewrite' | 'append' }
      ) => {
        logger.info(
          'Received claude-dc-write-file request',
          { filePath, mode },
          'claude-dc-handlers'
        )
        return await claudeDcService.writeFile(filePath, content, mode)
      },
      'claude-dc-handlers',
      'write-file'
    )
  )

  // List directory contents
  ipcMain.handle(
    'claude-dc-list-directory',
    withErrorBoundary(
      async (_, { dirPath }: { dirPath: string }) => {
        logger.info(
          'Received claude-dc-list-directory request',
          { dirPath },
          'claude-dc-handlers'
        )
        return await claudeDcService.listDirectory(dirPath)
      },
      'claude-dc-handlers',
      'list-directory'
    )
  )

  // Execute terminal command
  ipcMain.handle(
    'claude-dc-execute-command',
    withErrorBoundary(
      async (
        _,
        {
          command,
          workingDir,
          timeout
        }: { command: string; workingDir?: string; timeout?: number }
      ) => {
        logger.info(
          'Received claude-dc-execute-command request',
          { command, workingDir },
          'claude-dc-handlers'
        )
        return await claudeDcService.executeCommand(command, workingDir, timeout)
      },
      'claude-dc-handlers',
      'execute-command'
    )
  )

  // Search for files
  ipcMain.handle(
    'claude-dc-search-files',
    withErrorBoundary(
      async (
        _,
        {
          searchPath,
          pattern,
          timeout
        }: { searchPath: string; pattern: string; timeout?: number }
      ) => {
        logger.info(
          'Received claude-dc-search-files request',
          { searchPath, pattern },
          'claude-dc-handlers'
        )
        return await claudeDcService.searchFiles(searchPath, pattern, timeout)
      },
      'claude-dc-handlers',
      'search-files'
    )
  )

  // Search for code patterns
  ipcMain.handle(
    'claude-dc-search-code',
    withErrorBoundary(
      async (
        _,
        {
          searchPath,
          pattern,
          options
        }: {
          searchPath: string
          pattern: string
          options?: {
            filePattern?: string
            contextLines?: number
            ignoreCase?: boolean
            maxResults?: number
          }
        }
      ) => {
        logger.info(
          'Received claude-dc-search-code request',
          { searchPath, pattern, options },
          'claude-dc-handlers'
        )
        return await claudeDcService.searchCode(searchPath, pattern, options)
      },
      'claude-dc-handlers',
      'search-code'
    )
  )

  logger.success('Claude Desktop Commander IPC handlers registered successfully', {}, 'claude-dc-handlers')
}