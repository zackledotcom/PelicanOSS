// Enhanced Left Sidebar Integration for PelicanOS
// Replace the existing LeftSidebar.tsx with this enhanced version

import React, { useState, useEffect } from 'react'
import { useAllServices } from '@/hooks/useServices'
import { useToast } from '@/components/ui/toast'
import EnhancedLeftSidebar from './components/EnhancedLeftSidebar'
import ModelCard from './components/ModelCard'
import ProfileManager from './components/ProfileManager'

interface LeftSidebarProps {
  onClose: () => void
  onToggle: () => void
  isOpen: boolean
  onOpenSettings: () => void
  onOpenDeveloper: () => void
  selectedModel: string
  onModelChange: (model: string) => void
  theme: 'light' | 'dark' | 'system'
  onThemeChange: (theme: 'light' | 'dark' | 'system') => void
}

const LeftSidebar: React.FC<LeftSidebarProps> = (props) => {
  const services = useAllServices()
  const { addToast } = useToast()
  const [models, setModels] = useState([])

  // Load available models from Ollama
  useEffect(() => {
    const loadModels = async () => {
      try {
        const availableModels = services.ollama.models || []
        
        // Transform Ollama models into our Pokemon card format
        const transformedModels = availableModels.map((modelName: string) => ({
          name: modelName,
          displayName: modelName
            .replace(':latest', '')
            .replace('deepseek-coder', 'DeepSeek Coder')
            .replace('qwen2.5', 'Qwen 2.5') 
            .replace('phi3.5', 'Phi 3.5')
            .replace('tinyllama', 'TinyLlama')
            .replace('starcoder2', 'StarCoder 2'),
          size: getModelSize(modelName),
          type: getModelType(modelName),
          stats: getModelStats(modelName),
          status: 'available' as const,
          description: getModelDescription(modelName),
          lastUsed: getLastUsed(modelName)
        }))

        setModels(transformedModels)
      } catch (error) {
        console.error('Failed to load models:', error)
        addToast({
          type: 'error',
          title: 'Failed to Load Models',
          description: 'Could not fetch available AI models',
          duration: 3000
        })
      }
    }

    loadModels()
  }, [services.ollama.models])

  // Helper functions to determine model properties
  const getModelSize = (modelName: string) => {
    if (modelName.includes('1.3b') || modelName.includes('1.1b')) return '~1.3GB'
    if (modelName.includes('1.5b')) return '~1.5GB'
    if (modelName.includes('2b')) return '~2GB'
    if (modelName.includes('3b')) return '~3GB'
    if (modelName.includes('7b')) return '~4GB'
    return '~2GB'
  }

  const getModelType = (modelName: string): 'coding' | 'reasoning' | 'creative' | 'general' => {
    if (modelName.includes('coder') || modelName.includes('code')) return 'coding'
    if (modelName.includes('qwen') || modelName.includes('phi')) return 'reasoning'
    if (modelName.includes('creative') || modelName.includes('writer')) return 'creative'
    return 'general'
  }

  const getModelStats = (modelName: string) => {
    // Mock stats based on known model performance
    const statsMap: Record<string, any> = {
      'deepseek-coder': { performance: 76, speed: 95, accuracy: 88, conversations: 142 },
      'qwen2.5': { performance: 85, speed: 92, accuracy: 91, conversations: 89 },
      'phi3.5': { performance: 82, speed: 88, accuracy: 85, conversations: 67 },
      'tinyllama': { performance: 68, speed: 98, accuracy: 72, conversations: 234 },
      'starcoder2': { performance: 73, speed: 85, accuracy: 89, conversations: 0 }
    }

    for (const [key, stats] of Object.entries(statsMap)) {
      if (modelName.includes(key)) return stats
    }

    return { performance: 75, speed: 85, accuracy: 80, conversations: 0 }
  }

  const getModelDescription = (modelName: string) => {
    if (modelName.includes('deepseek-coder')) {
      return 'Elite coding assistant that beats GPT-3.5 on programming tasks'
    }
    if (modelName.includes('qwen')) {
      return 'Alibaba\'s reasoning powerhouse with exceptional logic capabilities'
    }
    if (modelName.includes('phi')) {
      return 'Microsoft\'s quality-focused model for creative and reasoning tasks'
    }
    if (modelName.includes('tinyllama')) {
      return 'Ultra-fast lightweight model for quick responses and simple tasks'
    }
    if (modelName.includes('starcoder')) {
      return 'Latest state-of-the-art code generation model from Hugging Face'
    }
    return 'Versatile AI model for general purpose tasks'
  }

  const getLastUsed = (modelName: string) => {
    // This would come from your analytics/usage tracking
    if (modelName === props.selectedModel) return '2 minutes ago'
    return Math.random() > 0.5 ? '1 hour ago' : '2 days ago'
  }

  // Handle model training
  const handleModelTrain = async (modelName: string) => {
    try {
      addToast({
        type: 'info',
        title: 'Training Started',
        description: `Training ${modelName} with your data`,
        duration: 3000
      })
      
      // This would integrate with your model tuning service
      // await window.api.invoke('start-model-training', { modelName })
      
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Training Failed',
        description: 'Could not start model training',
        duration: 3000
      })
    }
  }

  // Handle model download
  const handleModelDownload = async (modelName: string) => {
    try {
      addToast({
        type: 'info',
        title: 'Download Started', 
        description: `Downloading ${modelName}...`,
        duration: 3000
      })

      // This would call your Ollama service
      // await window.api.invoke('download-model', { modelName })
      
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Download Failed',
        description: 'Could not download model',
        duration: 3000
      })
    }
  }

  return (
    <EnhancedLeftSidebar
      {...props}
      models={models}
      onModelTrain={handleModelTrain}
      onModelDownload={handleModelDownload}
    />
  )
}

export default LeftSidebar
