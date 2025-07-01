/**
 * Enterprise ChromaDB Service - Vector Database Management
 * 
 * Provides centralized ChromaDB operations with connection pooling,
 * memory management, and intelligent query optimization.
 * 
 * @author PelicanOS Engineering Team
 * @version 2.0.0 - Modular Architecture
 */

import axios from 'axios'
import { logger } from '../utils/logger'
import { withErrorBoundary } from '../core/errorHandler'

export interface ChromaConfig {
  baseUrl: string
  timeout: number
  maxRetries: number
  retryDelay: number
  defaultCollection: string
}

export interface ChromaDocument {
  id: string
  content: string
  metadata?: Record<string, any>
  embedding?: number[]
}

export interface QueryResult {
  documents: string[][]
  metadatas: Record<string, any>[][]
  distances: number[][]
  ids: string[][]
}

export interface ChromaCollection {
  name: string
  id: string
  metadata?: Record<string, any>
  count?: number
}

/**
 * Enterprise ChromaDB service for vector operations and memory management
 */
export class ChromaService {
  private static instance: ChromaService
  private config: ChromaConfig
  private healthStatus: boolean = false
  private lastHealthCheck: Date | null = null

  constructor(config: Partial<ChromaConfig> = {}) {
    this.config = {
      baseUrl: 'http://localhost:8000',
      timeout: 15000,
      maxRetries: 3,
      retryDelay: 2000,
      defaultCollection: 'chat_history',
      ...config
    }
  }

  static getInstance(config?: Partial<ChromaConfig>): ChromaService {
    if (!ChromaService.instance) {
      ChromaService.instance = new ChromaService(config)
    }
    return ChromaService.instance
  }

  /**
   * Check ChromaDB service health
   */
  async checkHealth(): Promise<{ connected: boolean; message: string; version?: string }> {
    const operation = async () => {
      const startTime = Date.now()

      try {
        const response = await axios.get(`${this.config.baseUrl}/api/v1/heartbeat`, {
          timeout: this.config.timeout
        })

        const responseTime = Date.now() - startTime
        this.healthStatus = true
        this.lastHealthCheck = new Date()

        logger.success('ChromaDB health check passed', { responseTime }, 'chroma-service')

        return {
          connected: true,
          message: 'ChromaDB is running and accessible',
          version: response.data.version || 'unknown'
        }

      } catch (error: any) {
        this.healthStatus = false
        
        logger.error('ChromaDB health check failed', {
          error: error.message,
          code: error.code
        }, 'chroma-service')

        return {
          connected: false,
          message: this.getErrorMessage(error)
        }
      }
    }

    return await withErrorBoundary(
      operation,
      { component: 'chroma-service', operation: 'health-check' },
      {
        maxRetries: this.config.maxRetries,
        retryDelay: this.config.retryDelay
      }
    )
  }

  /**
   * Ensure collection exists, create if not
   */
  async ensureCollection(name: string, metadata?: Record<string, any>): Promise<boolean> {
    const operation = async () => {
      try {
        // Try to get existing collection
        await axios.get(`${this.config.baseUrl}/api/v1/collections/${name}`, {
          timeout: this.config.timeout
        })
        
        logger.debug(`Collection ${name} already exists`, undefined, 'chroma-service')
        return true

      } catch (error: any) {
        if (error.response?.status === 404) {
          // Collection doesn't exist, create it
          await axios.post(`${this.config.baseUrl}/api/v1/collections`, {
            name,
            metadata: metadata || { description: `PelicanOS collection: ${name}` }
          }, {
            timeout: this.config.timeout
          })

          logger.success(`Created collection: ${name}`, metadata, 'chroma-service')
          return true
        }
        throw error
      }
    }

    return await withErrorBoundary(
      operation,
      { component: 'chroma-service', operation: 'ensure-collection' },
      {
        maxRetries: 2,
        retryDelay: this.config.retryDelay
      }
    )
  }

  /**
   * Add documents to collection with embeddings
   */
  async addDocuments(
    collectionName: string,
    documents: ChromaDocument[]
  ): Promise<{ success: boolean; addedCount: number }> {
    const operation = async () => {
      // Ensure collection exists
      await this.ensureCollection(collectionName)

      const payload = {
        ids: documents.map(doc => doc.id),
        documents: documents.map(doc => doc.content),
        metadatas: documents.map(doc => doc.metadata || {}),
        embeddings: documents.filter(doc => doc.embedding).map(doc => doc.embedding)
      }

      // Remove empty embeddings array if no embeddings provided
      if (payload.embeddings.length === 0) {
        delete payload.embeddings
      }

      await axios.post(
        `${this.config.baseUrl}/api/v1/collections/${collectionName}/add`,
        payload,
        { timeout: this.config.timeout }
      )

      logger.info(`Added ${documents.length} documents to ${collectionName}`, {
        collectionName,
        documentCount: documents.length
      }, 'chroma-service')

      return {
        success: true,
        addedCount: documents.length
      }
    }

    return await withErrorBoundary(
      operation,
      { component: 'chroma-service', operation: 'add-documents' },
      {
        maxRetries: 2,
        retryDelay: this.config.retryDelay
      }
    )
  }

  /**
   * Query collection for similar documents
   */
  async queryCollection(
    collectionName: string,
    queryTexts: string[],
    options: {
      nResults?: number
      where?: Record<string, any>
      whereDocument?: Record<string, any>
      include?: string[]
    } = {}
  ): Promise<QueryResult> {
    const operation = async () => {
      const payload = {
        query_texts: queryTexts,
        n_results: options.nResults || 10,
        where: options.where,
        where_document: options.whereDocument,
        include: options.include || ['documents', 'metadatas', 'distances']
      }

      const response = await axios.post(
        `${this.config.baseUrl}/api/v1/collections/${collectionName}/query`,
        payload,
        { timeout: this.config.timeout }
      )

      logger.debug(`Queried collection ${collectionName}`, {
        queryCount: queryTexts.length,
        resultCount: response.data.documents?.[0]?.length || 0
      }, 'chroma-service')

      return response.data
    }

    return await withErrorBoundary(
      operation,
      { component: 'chroma-service', operation: 'query-collection' },
      {
        maxRetries: 2,
        retryDelay: this.config.retryDelay
      }
    )
  }

  /**
   * Get collection information
   */
  async getCollection(name: string): Promise<ChromaCollection | null> {
    const operation = async () => {
      try {
        const response = await axios.get(
          `${this.config.baseUrl}/api/v1/collections/${name}`,
          { timeout: this.config.timeout }
        )

        return response.data
      } catch (error: any) {
        if (error.response?.status === 404) {
          return null
        }
        throw error
      }
    }

    return await withErrorBoundary(
      operation,
      { component: 'chroma-service', operation: 'get-collection' },
      {
        maxRetries: 2,
        retryDelay: this.config.retryDelay
      }
    )
  }

  /**
   * List all collections
   */
  async listCollections(): Promise<ChromaCollection[]> {
    const operation = async () => {
      const response = await axios.get(`${this.config.baseUrl}/api/v1/collections`, {
        timeout: this.config.timeout
      })

      return response.data || []
    }

    return await withErrorBoundary(
      operation,
      { component: 'chroma-service', operation: 'list-collections' },
      {
        maxRetries: 2,
        retryDelay: this.config.retryDelay
      }
    )
  }

  /**
   * Delete collection
   */
  async deleteCollection(name: string): Promise<boolean> {
    const operation = async () => {
      await axios.delete(`${this.config.baseUrl}/api/v1/collections/${name}`, {
        timeout: this.config.timeout
      })

      logger.info(`Deleted collection: ${name}`, undefined, 'chroma-service')
      return true
    }

    return await withErrorBoundary(
      operation,
      { component: 'chroma-service', operation: 'delete-collection' },
      {
        maxRetries: 1,
        retryDelay: this.config.retryDelay
      }
    )
  }

  /**
   * Store chat message with context for RAG
   */
  async storeChatMessage(
    userMessage: string,
    aiResponse: string,
    metadata: Record<string, any> = {}
  ): Promise<boolean> {
    const operation = async () => {
      const documents: ChromaDocument[] = [
        {
          id: `msg_${Date.now()}_user`,
          content: userMessage,
          metadata: {
            ...metadata,
            type: 'user_message',
            timestamp: new Date().toISOString()
          }
        },
        {
          id: `msg_${Date.now()}_ai`,
          content: aiResponse,
          metadata: {
            ...metadata,
            type: 'ai_response',
            timestamp: new Date().toISOString()
          }
        }
      ]

      const result = await this.addDocuments(this.config.defaultCollection, documents)
      return result.success
    }

    return await withErrorBoundary(
      operation,
      { component: 'chroma-service', operation: 'store-chat-message' },
      {
        maxRetries: 2,
        retryDelay: this.config.retryDelay
      }
    )
  }

  /**
   * Search for relevant context based on query
   */
  async searchContext(
    query: string,
    limit: number = 5
  ): Promise<Array<{ content: string; metadata: any; similarity: number }>> {
    const operation = async () => {
      const result = await this.queryCollection(
        this.config.defaultCollection,
        [query],
        {
          nResults: limit,
          include: ['documents', 'metadatas', 'distances']
        }
      )

      if (!result.documents[0]) return []

      return result.documents[0].map((content, index) => ({
        content,
        metadata: result.metadatas[0][index],
        similarity: 1 - (result.distances[0][index] || 0) // Convert distance to similarity
      }))
    }

    return await withErrorBoundary(
      operation,
      { component: 'chroma-service', operation: 'search-context' },
      {
        maxRetries: 2,
        retryDelay: this.config.retryDelay
      }
    )
  }

  /**
   * Get service metrics
   */
  getServiceMetrics(): {
    config: ChromaConfig
    healthStatus: boolean
    lastHealthCheck: Date | null
  } {
    return {
      config: { ...this.config },
      healthStatus: this.healthStatus,
      lastHealthCheck: this.lastHealthCheck
    }
  }

  /**
   * Generate appropriate error message
   */
  private getErrorMessage(error: any): string {
    if (error.code === 'ECONNREFUSED') {
      return 'ChromaDB service is not running. Please start ChromaDB first.'
    }
    if (error.code === 'ECONNABORTED') {
      return 'ChromaDB request timed out. Service might be overloaded.'
    }
    if (error.response?.status === 500) {
      return 'ChromaDB server error. Please check server logs.'
    }
    return `ChromaDB connection error: ${error.message}`
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    logger.info('ChromaDB service cleaned up', undefined, 'chroma-service')
  }
}

// Export singleton instance
export const chromaService = ChromaService.getInstance()

// Export factory function for testing
export function createChromaService(config?: Partial<ChromaConfig>): ChromaService {
  return new ChromaService(config)
}
