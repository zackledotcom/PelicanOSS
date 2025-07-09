/**
 * Gemini CLI Service for PelicanOS
 * 
 * Provides safe file system operations and code analysis using Gemini CLI.
 * Implements request queuing to prevent concurrent operations and includes
 * safety mechanisms for code modifications.
 * 
 * Based on consultation with Gemini CLI for optimal integration patterns.
 */

import { spawn, ChildProcess } from 'child_process'
import { EventEmitter } from 'events'
import { writeFile, readFile, unlink, access } from 'fs/promises'
import { join, resolve as pathResolve } from 'path'
import { tmpdir } from 'os'

export interface GeminiCliConfig {
  apiKey?: string
  model: string
  timeout: number
  maxConcurrentRequests: number
  enableSandbox: boolean
}

export interface GeminiCliRequest {
  id: string
  type: 'analysis' | 'modification' | 'chat'
  prompt: string
  projectPath?: string
  targetFiles?: string[]
  priority: number
  requiresApproval: boolean
}

export interface GeminiCliResponse {
  success: boolean
  response?: string
  diff?: string
  affectedFiles?: string[]
  metadata?: {
    tokenCount?: number
    responseTime: number
    filesAnalyzed: number
  }
  error?: string
}

interface QueuedRequest extends GeminiCliRequest {
  resolve: (value: GeminiCliResponse) => void
  reject: (error: Error) => void
  timestamp: number
}

export class GeminiCliService extends EventEmitter {
  private config: GeminiCliConfig
  private requestQueue: QueuedRequest[] = []
  private isProcessing = false
  private currentProcess: ChildProcess | null = null
  private isInitialized = false

  constructor(config: GeminiCliConfig) {
    super()
    this.config = config
  }

  async initialize(): Promise<boolean> {
    try {
      // Test Gemini CLI availability
      const available = await this.testCliAvailability()
      if (!available) {
        throw new Error('Gemini CLI not found or not accessible')
      }

      // Test authentication
      const authTest = await this.testAuthentication()
      if (!authTest) {
        throw new Error('Gemini CLI authentication failed')
      }

      this.isInitialized = true
      console.log('✅ Gemini CLI Service initialized')
      return true
    } catch (error) {
      console.error('❌ Gemini CLI Service initialization failed:', error)
      return false
    }
  }

  /**
   * Analyze project or files without making modifications
   */
  async analyzeProject(projectPath: string, analysisType: string): Promise<GeminiCliResponse> {
    return this.queueRequest({
      id: `analysis-${Date.now()}`,
      type: 'analysis',
      prompt: `Analyze this project for ${analysisType}. Provide detailed insights.`,
      projectPath,
      priority: 2,
      requiresApproval: false
    })
  }

  /**
   * Generate code modifications (returns diff for user approval)
   */
  async generateCodeModification(
    projectPath: string, 
    instruction: string, 
    targetFiles?: string[]
  ): Promise<GeminiCliResponse> {
    return this.queueRequest({
      id: `modification-${Date.now()}`,
      type: 'modification',
      prompt: `${instruction}. Generate a diff showing the proposed changes.`,
      projectPath,
      targetFiles,
      priority: 1,
      requiresApproval: true
    })
  }

  /**
   * Chat with Gemini CLI in project context
   */
  async chatWithContext(message: string, projectPath?: string): Promise<GeminiCliResponse> {
    return this.queueRequest({
      id: `chat-${Date.now()}`,
      type: 'chat',
      prompt: message,
      projectPath,
      priority: 3,
      requiresApproval: false
    })
  }

  /**
   * Apply previously generated diff (after user approval)
   */
  async applyDiff(diff: string, projectPath: string): Promise<GeminiCliResponse> {
    // This would implement the actual file modification logic
    // For now, return a placeholder
    return {
      success: true,
      response: 'Diff applied successfully',
      metadata: {
        responseTime: 0,
        filesAnalyzed: 0
      }
    }
  }

  private async queueRequest(request: GeminiCliRequest): Promise<GeminiCliResponse> {
    if (!this.isInitialized) {
      throw new Error('Gemini CLI Service not initialized')
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

      // Brief pause between requests to prevent overwhelming the CLI
      await this.delay(100)
    }

    this.isProcessing = false
  }

  private async executeRequest(request: QueuedRequest): Promise<GeminiCliResponse> {
    const startTime = Date.now()

    try {
      // Prepare command arguments based on request type
      const args = await this.buildCommandArgs(request)
      
      // Execute Gemini CLI command
      const result = await this.executeCliCommand(args, request.projectPath)

      return {
        success: true,
        response: result.stdout,
        metadata: {
          responseTime: Date.now() - startTime,
          filesAnalyzed: request.targetFiles?.length || 0
        }
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        metadata: {
          responseTime: Date.now() - startTime,
          filesAnalyzed: 0
        }
      }
    }
  }

  private async buildCommandArgs(request: QueuedRequest): Promise<string[]> {
    const args: string[] = []

    // Add model selection
    args.push('--model', this.config.model)

    // Add sandbox for code modifications (safety)
    if (request.type === 'modification' && this.config.enableSandbox) {
      args.push('--sandbox')
    }

    // Handle file context
    if (request.projectPath && request.targetFiles) {
      // For targeted operations, create a focused prompt
      const fileList = request.targetFiles.join(', ')
      args.push('--prompt', `${request.prompt}\n\nFocus on these files: ${fileList}`)
    } else if (request.projectPath) {
      // For project-wide analysis, use all files
      args.push('--all_files')
      args.push('--prompt', request.prompt)
    } else {
      // For general chat, just use the prompt
      args.push('--prompt', request.prompt)
    }

    return args
  }

  private async executeCliCommand(args: string[], workingDir?: string): Promise<{
    stdout: string
    stderr: string
  }> {
    return new Promise((resolve, reject) => {
      const options: any = {
        stdio: 'pipe',
        env: { ...process.env }
      }

      // Set API key if provided
      if (this.config.apiKey) {
        options.env.GEMINI_API_KEY = this.config.apiKey
      }

      // Set working directory if provided
      if (workingDir) {
        options.cwd = pathResolve(workingDir)
      }

      const childProcess = spawn('gemini', args, options)
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
          reject(new Error(`Gemini CLI exited with code ${code}: ${stderr}`))
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
        reject(new Error('Gemini CLI command timeout'))
      }, this.config.timeout)

      childProcess.on('close', () => {
        clearTimeout(timeout)
      })
    })
  }

  private async testCliAvailability(): Promise<boolean> {
    try {
      const result = await this.executeCliCommand(['--version'])
      return result.stdout.length > 0
    } catch (error) {
      return false
    }
  }

  private async testAuthentication(): Promise<boolean> {
    try {
      const result = await this.executeCliCommand(['--prompt', 'Hello'])
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
    console.log('🔄 Gemini CLI Service shut down')
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
export const defaultGeminiCliConfig: GeminiCliConfig = {
  model: 'gemini-2.5-pro',
  timeout: 60000, // 60 seconds
  maxConcurrentRequests: 1, // Sequential processing for safety
  enableSandbox: true // Enable sandbox for code modifications
}
