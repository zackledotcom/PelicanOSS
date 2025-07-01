        })
      })

      if (!response.ok) {
        throw new Error(`Ollama streaming failed: ${response.status}`)
      }

      if (!response.body) {
        throw new Error('No response body for streaming')
      }

      return response.body
    }

    return await withErrorBoundary(
      operation,
      { component: 'ollama-service', operation: 'streaming-chat' },
      {
        maxRetries: 1,
        retryDelay: this.config.retryDelay
      }
    )
  }

  /**
   * Get list of available models
   */
  async getModels(): Promise<OllamaModel[]> {
    const operation = async (): Promise<OllamaModel[]> => {
      const response = await axios.get(`${this.config.baseUrl}/api/tags`, {
        timeout: this.config.timeout
      })

      return response.data.models || []
    }

    return await withErrorBoundary(
      operation,
      { component: 'ollama-service', operation: 'get-models' },
      {
        maxRetries: 2,
        retryDelay: this.config.retryDelay
      }
    )
  }

  /**
   * Pull a new model
   */
  async pullModel(modelName: string): Promise<{ success: boolean; message: string }> {
    const operation = async () => {
      logger.info(`Pulling model: ${modelName}`, undefined, 'ollama-service')

      const response = await axios.post(
        `${this.config.baseUrl}/api/pull`,
        { name: modelName },
        { timeout: 300000 } // 5 minutes for model download
      )

      return {
        success: true,
        message: `Model ${modelName} pulled successfully`
      }
    }

    try {
      return await operation()
    } catch (error: any) {
      logger.error(`Failed to pull model ${modelName}`, error, 'ollama-service')
      return {
        success: false,
        message: `Failed to pull model: ${error.message}`
      }
    }
  }

  /**
   * Get service metrics and status
   */
  getServiceMetrics(): {
    config: OllamaConfig
    healthStatus: boolean
    lastHealthCheck: Date | null
    connectionPoolSize: number
    uptime: number
  } {
    return {
      config: { ...this.config },
      healthStatus: this.healthStatus,
      lastHealthCheck: this.lastHealthCheck,
      connectionPoolSize: this.connectionPool.size,
      uptime: this.lastHealthCheck ? Date.now() - this.lastHealthCheck.getTime() : 0
    }
  }

  /**
   * Update service configuration
   */
  updateConfig(newConfig: Partial<OllamaConfig>): void {
    this.config = { ...this.config, ...newConfig }
    logger.info('Ollama service configuration updated', newConfig, 'ollama-service')
  }

  /**
   * Generate appropriate error message from axios error
   */
  private getErrorMessage(error: any): string {
    if (error.code === 'ECONNREFUSED') {
      return 'Ollama service is not running. Please start Ollama first.'
    }
    if (error.code === 'ECONNABORTED') {
      return 'Request timed out. The model might be too large or busy.'
    }
    if (error.response?.status === 404) {
      return 'Model not found. Please check if the model is installed.'
    }
    if (error.response?.status === 500) {
      return 'Ollama server error. Please check server logs.'
    }
    return `Connection error: ${error.message}`
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    this.connectionPool.clear()
    logger.info('Ollama service cleaned up', undefined, 'ollama-service')
  }
}

// Export singleton instance for global use
export const ollamaService = OllamaService.getInstance()

// Export factory function for testing with custom config
export function createOllamaService(config?: Partial<OllamaConfig>): OllamaService {
  return new OllamaService(config)
}
