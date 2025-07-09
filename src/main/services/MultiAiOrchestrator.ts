/**
 * Multi-AI Orchestrator Service for PelicanOS
 * 
 * Coordinates multiple AI providers (Claude DC, Gemini CLI, Ollama) for
 * collaborative responses, streaming coordination, and AI-to-AI discussions.
 * 
 * Implements safe coordination patterns and response streaming.
 */

import { EventEmitter } from 'events'
import { GeminiCliService } from './GeminiCliService'
import { ClaudeDcService } from './ClaudeDcService'
import { ollamaService } from './ollamaService'

export interface MultiAiRequest {
  id: string
  prompt: string
  providers: Array<'claude' | 'gemini' | 'ollama'>
  options: {
    enableDiscussion: boolean
    discussionRounds: number
    streamingEnabled: boolean
    timeout: number
  }
}

export interface ProviderResponse {
  provider: 'claude' | 'gemini' | 'ollama'
  content: string
  timestamp: Date
  responseTime: number
  success: boolean
  error?: string
  metadata?: any
}

export interface MultiAiResponse {
  requestId: string
  responses: ProviderResponse[]
  discussion?: ProviderResponse[]
  startTime: Date
  endTime: Date
  totalTime: number
  success: boolean
}

export interface StreamingUpdate {
  requestId: string
  provider: 'claude' | 'gemini' | 'ollama'
  content: string
  isComplete: boolean
  error?: string
}

export class MultiAiOrchestrator extends EventEmitter {
  private geminiService: GeminiCliService
  private claudeService: ClaudeDcService
  private activeRequests = new Map<string, MultiAiRequest>()
  private streamingCache = new Map<string, Map<string, string>>()

  constructor(
    geminiService: GeminiCliService,
    claudeService: ClaudeDcService
  ) {
    super()
    this.geminiService = geminiService
    this.claudeService = claudeService
  }

  /**
   * Start a multi-AI collaboration session
   */
  async startCollaboration(request: MultiAiRequest): Promise<MultiAiResponse> {
    const startTime = new Date()
    this.activeRequests.set(request.id, request)
    this.streamingCache.set(request.id, new Map())

    try {
      console.log(`🤖 Starting multi-AI collaboration: ${request.id}`)

      // Phase 1: Get initial responses from all providers
      const initialResponses = await this.getInitialResponses(request)

      // Phase 2: Conduct AI-to-AI discussion if enabled
      let discussionResponses: ProviderResponse[] = []
      if (request.options.enableDiscussion && initialResponses.length > 1) {
        discussionResponses = await this.conductDiscussion(request, initialResponses)
      }

      const endTime = new Date()
      const response: MultiAiResponse = {
        requestId: request.id,
        responses: initialResponses,
        discussion: discussionResponses.length > 0 ? discussionResponses : undefined,
        startTime,
        endTime,
        totalTime: endTime.getTime() - startTime.getTime(),
        success: initialResponses.every(r => r.success)
      }

      this.activeRequests.delete(request.id)
      this.streamingCache.delete(request.id)

      return response
    } catch (error) {
      console.error(`❌ Multi-AI collaboration failed: ${request.id}`, error)
      
      this.activeRequests.delete(request.id)
      this.streamingCache.delete(request.id)

      throw error
    }
  }

  /**
   * Get initial responses from all specified providers
   */
  private async getInitialResponses(request: MultiAiRequest): Promise<ProviderResponse[]> {
    const promises = request.providers.map(provider => 
      this.getProviderResponse(provider, request.prompt, request.id)
    )

    const results = await Promise.allSettled(promises)
    
    return results.map((result, index) => {
      const provider = request.providers[index]
      
      if (result.status === 'fulfilled') {
        return result.value
      } else {
        return {
          provider,
          content: '',
          timestamp: new Date(),
          responseTime: 0,
          success: false,
          error: result.reason instanceof Error ? result.reason.message : 'Unknown error'
        }
      }
    })
  }

  /**
   * Get response from a specific AI provider
   */
  private async getProviderResponse(
    provider: 'claude' | 'gemini' | 'ollama',
    prompt: string,
    requestId: string
  ): Promise<ProviderResponse> {
    const startTime = Date.now()

    try {
      let content = ''
      let metadata = {}

      switch (provider) {
        case 'claude':
          const claudeResult = await this.claudeService.executeCommand(
            `echo "Claude analyzing: ${prompt}"`,
            undefined,
            30000
          )
          content = claudeResult.success ? claudeResult.output || '' : claudeResult.error || ''
          metadata = claudeResult.metadata || {}
          break

        case 'gemini':
          const geminiResult = await this.geminiService.chatWithContext(prompt)
          content = geminiResult.success ? geminiResult.response || '' : geminiResult.error || ''
          metadata = geminiResult.metadata || {}
          break

        case 'ollama':
          try {
            const ollamaResult = await ollamaService.chat({
              message: prompt,
              model: 'tinydolphin:latest',
              history: []
            })
            content = ollamaResult.response || ''
          } catch (error) {
            content = `Ollama error: ${error instanceof Error ? error.message : 'Unknown error'}`
          }
          break

        default:
          throw new Error(`Unsupported provider: ${provider}`)
      }

      // Emit streaming updates if enabled
      if (this.activeRequests.get(requestId)?.options.streamingEnabled) {
        this.emit('streaming-update', {
          requestId,
          provider,
          content,
          isComplete: true
        } as StreamingUpdate)
      }

      return {
        provider,
        content,
        timestamp: new Date(),
        responseTime: Date.now() - startTime,
        success: true,
        metadata
      }
    } catch (error) {
      return {
        provider,
        content: '',
        timestamp: new Date(),
        responseTime: Date.now() - startTime,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Conduct AI-to-AI discussion based on initial responses
   */
  private async conductDiscussion(
    request: MultiAiRequest,
    initialResponses: ProviderResponse[]
  ): Promise<ProviderResponse[]> {
    const discussionResponses: ProviderResponse[] = []
    const successfulResponses = initialResponses.filter(r => r.success)

    if (successfulResponses.length < 2) {
      console.log('⚠️ Not enough successful responses for discussion')
      return discussionResponses
    }

    console.log(`💬 Starting AI discussion with ${request.options.discussionRounds} rounds`)

    for (let round = 1; round <= request.options.discussionRounds; round++) {
      console.log(`🔄 Discussion round ${round}`)

      // For each round, have each AI respond to the others' previous responses
      for (const response of successfulResponses) {
        const otherResponses = successfulResponses.filter(r => r.provider !== response.provider)
        
        if (otherResponses.length === 0) continue

        const discussionPrompt = this.createDiscussionPrompt(
          request.prompt,
          otherResponses,
          round
        )

        const discussionResponse = await this.getProviderResponse(
          response.provider,
          discussionPrompt,
          request.id
        )

        if (discussionResponse.success) {
          discussionResponses.push({
            ...discussionResponse,
            metadata: {
              ...discussionResponse.metadata,
              discussionRound: round,
              respondingTo: otherResponses.map(r => r.provider)
            }
          })
        }
      }

      // Brief pause between rounds
      await new Promise(resolve => setTimeout(resolve, 1000))
    }

    return discussionResponses
  }

  /**
   * Create a discussion prompt for AI-to-AI interaction
   */
  private createDiscussionPrompt(
    originalPrompt: string,
    otherResponses: ProviderResponse[],
    round: number
  ): string {
    const responsesSummary = otherResponses
      .map(r => `${r.provider.toUpperCase()}: ${r.content.substring(0, 500)}...`)
      .join('\n\n')

    return `Original prompt: "${originalPrompt}"

Other AI responses:
${responsesSummary}

Round ${round}: Please provide your thoughts on the above responses and add any additional insights or different perspectives. Keep your response concise and focused.`
  }

  /**
   * Stop an active collaboration session
   */
  async stopCollaboration(requestId: string): Promise<void> {
    if (this.activeRequests.has(requestId)) {
      console.log(`🛑 Stopping collaboration: ${requestId}`)
      this.activeRequests.delete(requestId)
      this.streamingCache.delete(requestId)
      
      this.emit('collaboration-stopped', { requestId })
    }
  }

  /**
   * Get status of active collaborations
   */
  getActiveCollaborations(): Array<{ id: string; providers: string[]; startTime: Date }> {
    return Array.from(this.activeRequests.entries()).map(([id, request]) => ({
      id,
      providers: request.providers,
      startTime: new Date() // Would track actual start time in real implementation
    }))
  }

  /**
   * Get collaboration statistics
   */
  getCollaborationStats(): {
    totalSessions: number
    activeRequests: number
    averageResponseTime: number
  } {
    return {
      totalSessions: 0, // Would track in persistent storage
      activeRequests: this.activeRequests.size,
      averageResponseTime: 0 // Would calculate from historical data
    }
  }

  /**
   * Check if a provider is available
   */
  async checkProviderAvailability(provider: 'claude' | 'gemini' | 'ollama'): Promise<boolean> {
    try {
      switch (provider) {
        case 'claude':
          return this.claudeService.isReady
        case 'gemini':
          return this.geminiService.isReady
        case 'ollama':
          return ollamaService.isConnected()
        default:
          return false
      }
    } catch (error) {
      return false
    }
  }

  /**
   * Cleanup resources
   */
  async shutdown(): Promise<void> {
    console.log('🔄 Shutting down Multi-AI Orchestrator')
    
    // Stop all active collaborations
    for (const requestId of this.activeRequests.keys()) {
      await this.stopCollaboration(requestId)
    }

    this.removeAllListeners()
  }
}

// Export a singleton instance
let orchestratorInstance: MultiAiOrchestrator | null = null

export function getMultiAiOrchestrator(
  geminiService: GeminiCliService,
  claudeService: ClaudeDcService
): MultiAiOrchestrator {
  if (!orchestratorInstance) {
    orchestratorInstance = new MultiAiOrchestrator(geminiService, claudeService)
  }
  return orchestratorInstance
}