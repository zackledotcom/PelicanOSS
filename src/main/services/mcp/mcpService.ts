import { spawn, ChildProcess } from 'child_process'
import path from 'path'
import { safeLog, safeError, safeWarn } from '../../utils/safeLogger'

export interface MCPServer {
  name: string
  command: string
  args: string[]
  process?: ChildProcess
  isRunning: boolean
}

export interface MCPThinkingRequest {
  prompt: string
  context?: string
  maxSteps?: number
}

export interface MCPThinkingResponse {
  success: boolean
  thoughts?: Array<{
    step: number
    thought: string
    reasoning: string
  }>
  finalAnswer?: string
  error?: string
}

export class MCPService {
  private servers: Map<string, MCPServer> = new Map()

  constructor() {
    this.initializeDefaultServers()
  }

  private initializeDefaultServers(): void {
    // Sequential Thinking MCP Server
    this.servers.set('sequential-thinking', {
      name: 'sequential-thinking',
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-sequential-thinking'],
      isRunning: false
    })

    safeLog('🧠 MCP Service initialized with default servers')
  }

  async startServer(serverName: string): Promise<{ success: boolean; error?: string }> {
    try {
      const server = this.servers.get(serverName)
      if (!server) {
        return { success: false, error: `Server '${serverName}' not found` }
      }

      if (server.isRunning && server.process) {
        return { success: true }
      }

      safeLog(`🚀 Starting MCP server: ${serverName}`)

      const mcpProcess = spawn(server.command, server.args, {
        stdio: ['pipe', 'pipe', 'pipe'],
        shell: true,
        env: {
          ...process.env,
          DISABLE_THOUGHT_LOGGING: 'false' // Enable thought logging for debugging
        }
      })

      server.process = mcpProcess
      server.isRunning = true

      mcpProcess.on('error', (error) => {
        safeError(`❌ MCP server ${serverName} error:`, error)
        server.isRunning = false
        server.process = undefined
      })

      mcpProcess.on('exit', (code) => {
        safeLog(`🔄 MCP server ${serverName} exited with code: ${code}`)
        server.isRunning = false
        server.process = undefined
      })

      // Give the process a moment to start
      await new Promise(resolve => setTimeout(resolve, 1000))

      if (server.isRunning) {
        safeLog(`✅ MCP server ${serverName} started successfully`)
        return { success: true }
      } else {
        return { success: false, error: 'Server failed to start' }
      }

    } catch (error) {
      safeError(`❌ Failed to start MCP server ${serverName}:`, error)
      return { success: false, error: String(error) }
    }
  }

  async stopServer(serverName: string): Promise<{ success: boolean; error?: string }> {
    try {
      const server = this.servers.get(serverName)
      if (!server || !server.process) {
        return { success: true }
      }

      safeLog(`🛑 Stopping MCP server: ${serverName}`)

      server.process.kill('SIGTERM')
      server.isRunning = false
      server.process = undefined

      safeLog(`✅ MCP server ${serverName} stopped`)
      return { success: true }

    } catch (error) {
      safeError(`❌ Failed to stop MCP server ${serverName}:`, error)
      return { success: false, error: String(error) }
    }
  }

  async stopAllServers(): Promise<void> {
    const stopPromises = Array.from(this.servers.keys()).map(name => this.stopServer(name))
    await Promise.all(stopPromises)
    safeLog('🛑 All MCP servers stopped')
  }

  getServerStatus(serverName: string): { isRunning: boolean; exists: boolean } {
    const server = this.servers.get(serverName)
    return {
      exists: !!server,
      isRunning: server?.isRunning || false
    }
  }

  getAllServersStatus(): Record<string, { isRunning: boolean }> {
    const status: Record<string, { isRunning: boolean }> = {}
    this.servers.forEach((server, name) => {
      status[name] = { isRunning: server.isRunning }
    })
    return status
  }

  async sendThinkingRequest(request: MCPThinkingRequest): Promise<MCPThinkingResponse> {
    try {
      const server = this.servers.get('sequential-thinking')
      if (!server || !server.isRunning || !server.process) {
        // Auto-start server if not running
        const startResult = await this.startServer('sequential-thinking')
        if (!startResult.success) {
          return {
            success: false,
            error: 'Sequential thinking server is not available'
          }
        }
      }

      // Create MCP request message for sequential thinking
      const mcpRequest = {
        jsonrpc: '2.0',
        id: Date.now(),
        method: 'tools/call',
        params: {
          name: 'think',
          arguments: {
            prompt: request.prompt,
            context: request.context || '',
            max_steps: request.maxSteps || 5
          }
        }
      }

      return new Promise((resolve) => {
        let responseData = ''
        const timeout = setTimeout(() => {
          resolve({
            success: false,
            error: 'Request timeout'
          })
        }, 30000) // 30 second timeout

        if (server.process?.stdout) {
          server.process.stdout.on('data', (data) => {
            responseData += data.toString()
            
            // Try to parse complete JSON responses
            try {
              const lines = responseData.split('\n')
              for (const line of lines) {
                if (line.trim()) {
                  const response = JSON.parse(line.trim())
                  if (response.id === mcpRequest.id) {
                    clearTimeout(timeout)
                    
                    if (response.error) {
                      resolve({
                        success: false,
                        error: response.error.message || 'MCP server error'
                      })
                    } else {
                      // Parse the thinking response
                      const result = response.result
                      resolve({
                        success: true,
                        thoughts: result.thoughts || [],
                        finalAnswer: result.final_answer || result.answer,
                      })
                    }
                    return
                  }
                }
              }
            } catch (parseError) {
              // Continue collecting data
            }
          })
        }

        // Send the request
        if (server.process?.stdin) {
          server.process.stdin.write(JSON.stringify(mcpRequest) + '\n')
        } else {
          clearTimeout(timeout)
          resolve({
            success: false,
            error: 'Cannot communicate with MCP server'
          })
        }
      })

    } catch (error) {
      safeError('❌ MCP thinking request failed:', error)
      return {
        success: false,
        error: String(error)
      }
    }
  }
}

// Singleton instance
export const mcpService = new MCPService()
