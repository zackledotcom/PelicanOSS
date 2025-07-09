import React, { useState, useRef, useEffect } from 'react'

// Core Chat Components
import PremiumChatInterface from './components/chat/PremiumChatInterface'
import LeftSidebar from './components/layout/EfficientSidebar'
import CollaborationCanvas from './components/canvas/CollaborationCanvas'

// Modals & Overlays
import SettingsModal from './components/modals/SettingsModal'
import DeveloperModal from './components/modals/DeveloperModal'
import SystemStatusOverlay from './components/overlays/SystemStatusOverlay'
import AgentManagerOverlay from './components/overlays/AgentManagerOverlay'
import AdvancedMemoryPanel from './components/AdvancedMemoryPanel'
import CodeAnalysisPanel from './components/gemini/CodeAnalysisPanel'

// Global Systems
import { ToastProvider } from './components/ui/toast'

import './globals.css'

type AIProvider = 'ollama' | 'claude' | 'gemini'

interface AppState {
  showLeftSidebar: boolean
  showSettings: boolean
  showDeveloper: boolean
  showSystemStatus: boolean
  showAgentManager: boolean
  showAdvancedMemory: boolean
  showCodeAnalysis: boolean
  showCollaborationCanvas: boolean
  selectedModel: string
  theme: 'light' | 'dark' | 'system'
  activeAI: AIProvider
  activeThread?: string
}

// Simple error boundary
class ErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: any) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Component Error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="p-4 bg-red-50 border border-red-200 rounded">
            <h3 className="text-red-800 font-semibold">Component Error</h3>
            <p className="text-red-600 text-sm mt-1">{this.state.error?.message || 'An unknown error occurred'}</p>
          </div>
        )
      )
    }

    return <>{this.props.children}</>
  }
}

const App: React.FC = () => {
  const [state, setState] = useState<AppState>({
    showLeftSidebar: true, // Start with sidebar open
    showSettings: false,
    showDeveloper: false,
    showSystemStatus: false,
    showAgentManager: false,
    showAdvancedMemory: false,
    showCodeAnalysis: false,
    showCollaborationCanvas: false,
    selectedModel: 'tinydolphin:latest',
    theme: 'system',
    activeAI: 'ollama', // Default to Ollama
    activeThread: undefined
  })

  const [hoverTimeout, setHoverTimeout] = useState<NodeJS.Timeout | null>(null)

  const updateState = (updates: Partial<AppState>) => {
    setState((prev) => ({ ...prev, ...updates }))
  }

  const toggleSidebar = () => {
    console.log('Toggling sidebar from:', state.showLeftSidebar, 'to:', !state.showLeftSidebar)
    updateState({ showLeftSidebar: !state.showLeftSidebar })
  }

  const handleLeftEdgeHover = () => {
    if (!state.showLeftSidebar) {
      const timeout = setTimeout(() => {
        updateState({ showLeftSidebar: true })
      }, 300) // 300ms delay before showing
      setHoverTimeout(timeout)
    }
  }

  const handleLeftEdgeLeave = () => {
    if (hoverTimeout) {
      clearTimeout(hoverTimeout)
      setHoverTimeout(null)
    }
  }

  // Handle new chat action
  const handleNewChat = () => {
    console.log(`🆕 New ${state.activeAI} chat initiated`)
    // Reset messages in the chat interface
  }

  // Handle AI provider change
  const handleAIChange = (provider: AIProvider) => {
    console.log(`🤖 Switching to ${provider}`)
    
    // Set appropriate default models for each provider
    let defaultModel = state.selectedModel
    if (provider === 'claude') {
      defaultModel = 'claude-3-sonnet'
    } else if (provider === 'gemini') {
      defaultModel = 'gemini-pro'
    } else if (provider === 'ollama') {
      defaultModel = 'tinydolphin:latest'
    }
    
    updateState({ 
      activeAI: provider, 
      activeThread: undefined,
      selectedModel: defaultModel
    })
  }

  // Handle thread change
  const handleThreadChange = (threadId: string) => {
    console.log(`💬 Switching to thread ${threadId}`)
    updateState({ activeThread: threadId })
  }

  // Handle model change
  const handleModelChange = (model: string) => {
    console.log(`🔧 Changing model to ${model}`)
    updateState({ selectedModel: model })
  }

  // Handle theme change
  const handleThemeChange = (theme: 'light' | 'dark' | 'system') => {
    console.log(`🎨 Changing theme to ${theme}`)
    updateState({ theme })
  }

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (hoverTimeout) {
        clearTimeout(hoverTimeout)
      }
    }
  }, [hoverTimeout])

  return (
    <ToastProvider>
      <div className="flex h-screen bg-white overflow-hidden">
        {/* Left Edge Hover Trigger */}
        <div
          className={`absolute left-0 top-0 w-1 h-full z-50 ${!state.showLeftSidebar ? 'cursor-pointer' : ''}`}
          onMouseEnter={handleLeftEdgeHover}
          onMouseLeave={handleLeftEdgeLeave}
        />

        {/* Enhanced Sidebar */}
        <div
          className={`
          transition-all duration-300 ease-out 
          ${state.showLeftSidebar ? 'w-80' : 'w-0'} 
          bg-gray-50 border-r border-gray-200 overflow-hidden
        `}
        >
          {state.showLeftSidebar && (
            <ErrorBoundary fallback={<div className="p-4 text-red-600">Sidebar Error</div>}>
              <LeftSidebar
                onClose={() => updateState({ showLeftSidebar: false })}
                onToggle={toggleSidebar}
                isOpen={state.showLeftSidebar}
                onOpenSettings={() => updateState({ showSettings: true })}
                onOpenDeveloper={() => updateState({ showDeveloper: true })}
                selectedModel={state.selectedModel}
                onModelChange={handleModelChange}
                theme={state.theme}
                onThemeChange={handleThemeChange}
                activeAI={state.activeAI}
                onAIChange={handleAIChange}
                activeThread={state.activeThread}
                onThreadChange={handleThreadChange}
                onOpenCollaborationCanvas={() => updateState({ showCollaborationCanvas: true })}
              />
            </ErrorBoundary>
          )}
        </div>

        {/* Main Chat Area - Enhanced */}
        <main className="flex-1 flex flex-col min-w-0">
          <ErrorBoundary
            fallback={
              <div className="flex-1 bg-red-50 flex items-center justify-center text-red-600">
                Chat Interface Error
              </div>
            }
          >
            <PremiumChatInterface
              selectedModel={state.selectedModel}
              onModelChange={handleModelChange}
              onOpenSettings={() => updateState({ showSettings: true })}
              onOpenDeveloper={() => updateState({ showDeveloper: true })}
              onOpenSystemStatus={() => updateState({ showSystemStatus: true })}
              onOpenAgentManager={() => updateState({ showAgentManager: true })}
              onOpenAdvancedMemory={() => updateState({ showAdvancedMemory: true })}
              onOpenCodeAnalysis={() => updateState({ showCodeAnalysis: true })}
              onOpenCollaborationCanvas={() => updateState({ showCollaborationCanvas: true })}
              onToggleSidebar={toggleSidebar}
              sidebarOpen={state.showLeftSidebar}
              onNewChat={handleNewChat}
              activeAI={state.activeAI}
              activeThread={state.activeThread}
            />
          </ErrorBoundary>
        </main>

        {/* Modals - Working */}
        {state.showSettings && (
          <ErrorBoundary fallback={<div>Settings Error</div>}>
            <SettingsModal onClose={() => updateState({ showSettings: false })} />
          </ErrorBoundary>
        )}

        {state.showDeveloper && (
          <ErrorBoundary fallback={<div>Developer Error</div>}>
            <DeveloperModal onClose={() => updateState({ showDeveloper: false })} />
          </ErrorBoundary>
        )}

        {state.showSystemStatus && (
          <ErrorBoundary fallback={<div>System Status Error</div>}>
            <SystemStatusOverlay onClose={() => updateState({ showSystemStatus: false })} />
          </ErrorBoundary>
        )}

        {state.showAgentManager && (
          <ErrorBoundary fallback={<div>Agent Manager Error</div>}>
            <AgentManagerOverlay onClose={() => updateState({ showAgentManager: false })} />
          </ErrorBoundary>
        )}

        {state.showAdvancedMemory && (
          <ErrorBoundary fallback={<div>Memory Panel Error</div>}>
            <AdvancedMemoryPanel onClose={() => updateState({ showAdvancedMemory: false })} />
          </ErrorBoundary>
        )}

        {state.showCodeAnalysis && (
          <div className="absolute inset-0 bg-black/30 z-40 flex items-center justify-center">
            <CodeAnalysisPanel onClose={() => updateState({ showCodeAnalysis: false })} />
          </div>
        )}

        {state.showCollaborationCanvas && (
          <CollaborationCanvas
            isOpen={state.showCollaborationCanvas}
            onClose={() => updateState({ showCollaborationCanvas: false })}
          />
        )}
      </div>
    </ToastProvider>
  )
}

export default App
