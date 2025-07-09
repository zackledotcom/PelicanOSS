import { ipcMain } from 'electron'
import { mcpService, MCPThinkingRequest } from '../services/mcp/mcpService'
import { safeLog, safeError } from '../utils/safeLogger'
import { withRateLimit } from '../middleware/rateLimiter'

/**
 * Register all MCP-related IPC handlers
 * Following PelicanOS architecture: secure, modular, and efficient
 */
export function registerMCPHandlers(): void {
  safeLog('🔧 Registering MCP IPC handlers...')

  // Start MCP server
  ipcMain.handle('mcp-start-server', withRateLimit('mcp-start-server', 
    async (event, serverName: string) => {
      try {
        safeLog(`🚀 Starting MCP server: ${serverName}`)
        return await mcpService.startServer(serverName)
      } catch (error) {
        safeError('❌ Failed to start MCP server:', error)
        return { success: false, error: String(error) }
      }
    }
  ))

  // Stop MCP server
  ipcMain.handle('mcp-stop-server', withRateLimit('mcp-stop-server',
    async (event, serverName: string) => {
      try {
        safeLog(`🛑 Stopping MCP server: ${serverName}`)
        return await mcpService.stopServer(serverName)
      } catch (error) {
        safeError('❌ Failed to stop MCP server:', error)
        return { success: false, error: String(error) }
      }
    }
  ))

  // Get server status
  ipcMain.handle('mcp-get-server-status', async (event, serverName: string) => {
    try {
      return mcpService.getServerStatus(serverName)
    } catch (error) {
      safeError('❌ Failed to get MCP server status:', error)
      return { exists: false, isRunning: false }
    }
  })

  // Get all servers status
  ipcMain.handle('mcp-get-all-servers-status', async () => {
    try {
      return mcpService.getAllServersStatus()
    } catch (error) {
      safeError('❌ Failed to get all MCP servers status:', error)
      return {}
    }
  })

  // Sequential thinking request
  ipcMain.handle('mcp-thinking-request', withRateLimit('mcp-thinking-request',
    async (event, request: MCPThinkingRequest) => {
      try {
        safeLog('🧠 Processing thinking request...')
        
        // Validate request
        if (!request.prompt || typeof request.prompt !== 'string') {
          return {
            success: false,
            error: 'Invalid prompt: must be a non-empty string'
          }
        }

        if (request.prompt.length > 5000) {
          return {
            success: false,
            error: 'Prompt too long: maximum 5000 characters'
          }
        }

        return await mcpService.sendThinkingRequest(request)
      } catch (error) {
        safeError('❌ MCP thinking request failed:', error)
        return {
          success: false,
          error: String(error)
        }
      }
    }
  ))

  // Stop all servers (for cleanup)
  ipcMain.handle('mcp-stop-all-servers', async () => {
    try {
      await mcpService.stopAllServers()
      return { success: true }
    } catch (error) {
      safeError('❌ Failed to stop all MCP servers:', error)
      return { success: false, error: String(error) }
    }
  })

  safeLog('✅ MCP IPC handlers registered successfully')
}

/**
 * Cleanup function to stop all MCP servers on app exit
 */
export async function cleanupMCP(): Promise<void> {
  try {
    safeLog('🧹 Cleaning up MCP services...')
    await mcpService.stopAllServers()
    safeLog('✅ MCP cleanup completed')
  } catch (error) {
    safeError('❌ MCP cleanup failed:', error)
  }
}
