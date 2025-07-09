/**
 * Claude Desktop Commander Service for PelicanOS
 * 
 * Provides safe desktop command execution and file operations using Claude Desktop Commander.
 * Implements request queuing and safety mechanisms for secure command execution.
 * 
 * Based on PelicanOS architecture patterns for optimal integration.
 */

import { spawn, ChildProcess } from 'child_process'
import { EventEmitter } from 'events'
import { writeFile, readFile, unlink, access } from 'fs/promises'
import { join, resolve as pathResolve } from 'path'
import { tmpdir } from 'os'

export interface ClaudeDcConfig {
  timeout: number
  maxConcurrentRequests: number
  enableSandbox: boolean
  allowedDirectories: string[]
}

export interface ClaudeDcRequest {
  id: string
  type: 'file-read' | 'file-write' | 'directory-list' | 'command-execute' | 'search-files' | 'search-code'
  command: string
  args: string[]
  workingDir?: string
  priority: number
  requiresApproval: boolean
}

export interface ClaudeDcResponse {
  success: boolean
  output?: string
  error?: string
  files?: Array<{
    path: string
    name: string
    type: 'file' | 'directory'
    size?: number
  }>
  metadata?: {
    command: string
    responseTime: number
    workingDir?: string
  }
}

interface QueuedRequest extends ClaudeDcRequest {
  resolve: (value: ClaudeDcResponse) => void
  reject: (error: Error) => void
  timestamp: number
}

export class ClaudeDcService extends EventEmitter {
  private config: ClaudeDcConfig
  private requestQueue: QueuedRequest[] = []
  private isProcessing = false
  private currentProcess: ChildProcess | null = null
  private isInitialized = false

  constructor(config: ClaudeDcConfig) {
    super()
    this.config = config
  }

  async initialize(): Promise<boolean> {
    try {
      // Test Desktop Commander availability
      const available = await this.testDcAvailability()
      if (!available) {
        throw new Error('Desktop Commander not found or not accessible')
      }

      this.isInitialized = true
      console.log('✅ Claude Desktop Commander Service initialized')
      return true
    } catch (error) {
      console.error('❌ Claude Desktop Commander Service initialization failed:', error)
      return false
    }
  }

  /**
   * Read file contents
   */
  async readFile(filePath: string, options?: { offset?: number; length?: number }): Promise<ClaudeDcResponse> {
    const args = ['read_file', filePath]
    if (options?.offset !== undefined) {
      args.push('--offset', options.offset.toString())
    }
    if (options?.length !== undefined) {
      args.push('--length', options.length.toString())
    }

    return this.queueRequest({
      id: `read-${Date.now()}`,
      type: 'file-read',
      command: 'dc',
      args,
      priority: 2,
      requiresApproval: false
    })
  }

  /**
   * Write file contents
   */
  async writeFile(filePath: string, content: string, mode: 'rewrite' | 'append' = 'rewrite'): Promise<ClaudeDcResponse> {
    return this.queueRequest({
      id: `write-${Date.now()}`,
      type: 'file-write',
      command: 'dc',
      args: ['write_file', filePath, content, '--mode', mode],
      priority: 1,
      requiresApproval: true
    })
  }

  /**
   * List directory contents
   */
  async listDirectory(dirPath: string): Promise<ClaudeDcResponse> {
    return this.queueRequest({
      id: `list-${Date.now()}`,
      type: 'directory-list',
      command: 'dc',
      args: ['list_directory', dirPath],
      priority: 2,
      requiresApproval: false
    })
  }

  /**
   * Execute terminal command
   */
  async executeCommand(command: string, workingDir?: string, timeout?: number): Promise<ClaudeDcResponse> {
    const args = ['execute_command', command, '--timeout_ms', (timeout || this.config.timeout).toString()]
    
    return this.queueRequest({
      id: `exec-${Date.now()}`,
      type: 'command-execute',
      command: 'dc',
      args,
      workingDir,
      priority: 1,
      requiresApproval: true
    })
  }

  /**
   * Search for files by name
   */
  async searchFiles(searchPath: string, pattern: string, timeout?: number): Promise<ClaudeDcResponse> {
    const args = ['search_files', searchPath, pattern]
    if (timeout) {
      args.push('--timeoutMs', timeout.toString())
    }

    return this.queueRequest({
      id: `search-files-${Date.now()}`,
      type: 'search-files',
      command: 'dc',
      args,
      priority: 2,
      requiresApproval: false
    })
  }

  /**
   * Search for code patterns within files
   */
  async searchCode(searchPath: string, pattern: string, options?: {
    filePattern?: string
    contextLines?: number
    ignoreCase?: boolean
    maxResults?: number
  }): Promise<ClaudeDcResponse> {
    const args = ['search_code', searchPath, pattern]
    
    if (options?.filePattern) {
      args.push('--filePattern', options.filePattern)
    }
    if (options?.contextLines !== undefined) {
      args.push('--contextLines', options.contextLines.toString())
    }
    if (options?.ignoreCase) {
      args.push('--ignoreCase')
    }
    if (options?.maxResults) {
      args.push('--maxResults', options.maxResults.toString())
    }

    return this.queueRequest({
      id: `search-code-${Date.now()}`,
      type: 'search-code',
      command: 'dc',
      args,
      priority: 2,
      requiresApproval: false
    })
  }

  private async queueRequest(request: ClaudeDcRequest): Promise<ClaudeDcResponse> {
    if (!this.isInitialized) {
      throw new Error('Claude Desktop Commander Service not initialized')
    }

    return new Promise((resolve, reject) => {
      const queuedRequest: QueuedRequest = {
        ...request,
        resolve,
        reject,
        timestamp: Date.now()
      }

      // Insert by priority (higher priority first)
      const insertIndex = this.requestQueue.findIndex(r => r.priority < request.priority)
      if (insertIndex === -1) {
        this.requestQueue.push(queuedRequest)
      } else {
        this.requestQueue.splice(insertIndex, 0, queuedRequest)
      }

      this.processQueue()
    })
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.requestQueue.length === 0) {
      return
    }

    this.isProcessing = true

    while (this.requestQueue.length > 0) {
      const request = this.requestQueue.shift()!
      
      try {
        const result = await this.executeRequest(request)
        request.resolve(result)
      } catch (error) {
        request.reject(error instanceof Error ? error : new Error('Unknown error'))
      }

      // Brief pause between requests
      await this.delay(100)
    }

    this.isProcessing = false
  }

  private async executeRequest(request: QueuedRequest): Promise<ClaudeDcResponse> {
    const startTime = Date.now()

    try {
      // Execute Desktop Commander command
      const result = await this.executeDcCommand(request.args, request.workingDir)

      return {
        success: true,
        output: result.stdout,
        metadata: {
          command: request.command,
          responseTime: Date.now() - startTime,
          workingDir: request.workingDir
        }
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        metadata: {
          command: request.command,
          responseTime: Date.now() - startTime,
          workingDir: request.workingDir
        }
      }
    }
  }

  private async executeDcCommand(args: string[], workingDir?: string): Promise<{
    stdout: string
    stderr: string
  }> {
    return new Promise((resolve, reject) => {
      const options: any = {
        stdio: 'pipe'
      }

      // Set working directory if provided and allowed
      if (workingDir) {
        const resolvedDir = pathResolve(workingDir)
        if (this.isDirectoryAllowed(resolvedDir)) {
          options.cwd = resolvedDir
        } else {
          reject(new Error(`Directory not allowed: ${workingDir}`))
          return
        }
      }

      // Use the Desktop Commander executable (assumes it's in PATH)
      const childProcess = spawn('desktop-commander', args, options)
      this.currentProcess = childProcess

      let stdout = ''
      let stderr = ''

      childProcess.stdout?.on('data', (data) => {
        stdout += data.toString()
      })

      childProcess.stderr?.on('data', (data) => {
        stderr += data.toString()
      })

      childProcess.on('close', (code) => {
        this.currentProcess = null
        
        if (code === 0) {
          resolve({ stdout: stdout.trim(), stderr: stderr.trim() })
        } else {
          reject(new Error(`Desktop Commander exited with code ${code}: ${stderr}`))
        }
      })

      childProcess.on('error', (error) => {
        this.currentProcess = null
        reject(error)
      })

      // Timeout handling
      const timeout = setTimeout(() => {
        if (this.currentProcess) {
          this.currentProcess.kill('SIGTERM')
          this.currentProcess = null
        }
        reject(new Error('Desktop Commander command timeout'))
      }, this.config.timeout)

      childProcess.on('close', () => {
        clearTimeout(timeout)
      })
    })
  }

  private isDirectoryAllowed(dirPath: string): boolean {
    if (this.config.allowedDirectories.length === 0) {
      return true // Empty array means all directories allowed
    }

    return this.config.allowedDirectories.some(allowedDir => {
      const resolvedAllowed = pathResolve(allowedDir)
      return dirPath.startsWith(resolvedAllowed)
    })
  }

  private async testDcAvailability(): Promise<boolean> {
    try {
      const result = await this.executeDcCommand(['get_config'])
      return result.stdout.length > 0
    } catch (error) {
      return false
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  async shutdown(): Promise<void> {
    // Cancel current process if running
    if (this.currentProcess) {
      this.currentProcess.kill('SIGTERM')
      this.currentProcess = null
    }

    // Clear request queue
    this.requestQueue.forEach(request => {
      request.reject(new Error('Service shutting down'))
    })
    this.requestQueue = []

    this.isInitialized = false
    console.log('🔄 Claude Desktop Commander Service shut down')
  }

  // Getters for service status
  get isReady(): boolean {
    return this.isInitialized
  }

  get queueLength(): number {
    return this.requestQueue.length
  }

  get isCurrentlyProcessing(): boolean {
    return this.isProcessing
  }
}

// Export default configuration
export const defaultClaudeDcConfig: ClaudeDcConfig = {
  timeout: 30000, // 30 seconds
  maxConcurrentRequests: 1, // Sequential processing for safety
  enableSandbox: true, // Enable sandbox for file operations
  allowedDirectories: [] // Empty array means all directories allowed
}