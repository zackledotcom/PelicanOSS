export interface AppSettings {
  /** Schema version for migration handling */
  version: string
  
  /** UI theme preference */
  theme: 'light' | 'dark'
  
  /** Selected AI model name */
  modelName: string
  
  /** ChromaDB endpoint URL */
  chromaEndpoint: string
  
  /** Ollama prompt preset configuration */
  ollamaPromptPreset: string
  
  /** Memory system preferences */
  memory: {
    /** Whether memory system is enabled */
    enabled: boolean
    
    /** Memory retention period in days */
    retentionDays: number
    
    /** Auto-summarize threshold (number of messages) */
    autoSummarizeThreshold: number
    
    /** Show memory in advanced panel */
    showInAdvancedPanel: boolean
  }
}

export type Theme = AppSettings['theme']
