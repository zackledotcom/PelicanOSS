import React, { useState, useEffect } from 'react'

// Core Chat Components
import ChatInterface from './components/chat/ChatInterface'
import LeftSidebar from './components/layout/LeftSidebar'

// Modals & Overlays
import SettingsModal from './components/modals/SettingsModal'
import DeveloperModal from './components/modals/DeveloperModal'
import SystemStatusOverlay from './components/overlays/SystemStatusOverlay'
import AgentManagerOverlay from './components/overlays/AgentManagerOverlay'
import AdvancedMemoryPanel from './components/AdvancedMemoryPanel'

// Global Systems
import { ToastProvider } from './components/ui/toast'

import './globals.css'

interface AppState {
  showLeftSidebar: boolean
  showSettings: boolean
  showDeveloper: boolean
  showSystemStatus: boolean
  showAgentManager: boolean
  showAdvancedMemory: boolean
  selectedModel: string
  theme: 'light' | 'dark' | 'system'
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
      return this.props.fallback || (
        <div className="p-4 bg-red-50 border border-red-200 rounded">
          <h3 className="text-red-800 font-semibold">Component Error</h3>
          <p className="text-red-600 text-sm mt-1">{this.state.error?.message}</p>
        </div>
      )
    }

    return <>{this.props.children}</>
  }
}

const App: React.FC = () => {
  const [state, setState] = useState<AppState>({
    showLeftSidebar: false,
    showSettings: false,
    showDeveloper: false,
    showSystemStatus: false,
    showAgentManager: false,
    showAdvancedMemory: false,
    selectedModel: 'tinydolphin:latest',
    theme: 'system'
  })

  const [hoverTimeout, setHoverTimeout] = useState<NodeJS.Timeout | null>(null)

  const updateState = (updates: Partial<AppState>) => {
    setState(prev => ({ ...prev, ...updates }))
  }

  const toggleSidebar = () => {
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

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (hoverTimeout) {
        clearTimeout(hoverTimeout)
      }
    }
  }, [hoverTimeout])

  // Keyboard support for sidebar
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && state.showLeftSidebar) {
        updateState({ showLeftSidebar: false })
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [state.showLeftSidebar])

  return (
    <ErrorBoundary>
      <ToastProvider>
        <div className="h-screen bg-background text-foreground overflow-hidden">
          {/* Left Edge Hover Trigger */}
          {!state.showLeftSidebar && (
            <>
              {/* Hover trigger area */}
              <div 
                className="fixed left-0 top-0 w-3 h-full z-40 cursor-pointer hover:bg-accent-blue/10 transition-colors duration-200"
                onMouseEnter={handleLeftEdgeHover}
                onMouseLeave={handleLeftEdgeLeave}
                title="Hover to open sidebar"
              />
              {/* Visual indicator */}
              <div className="fixed left-0 top-1/2 -translate-y-1/2 w-1 h-12 bg-gradient-to-b from-transparent via-accent-blue/30 to-transparent rounded-r-full z-30 pointer-events-none" />
            </>
          )}

          {/* Main Chat-Focused Layout */}
          <div className="flex h-full">
            {/* Sliding Left Sidebar */}
            {state.showLeftSidebar && (
              <div className="fixed inset-0 z-50 lg:relative lg:z-auto">
                {/* Mobile backdrop */}
                <div 
                  className="fixed inset-0 bg-black/50 lg:hidden"
                  onClick={() => updateState({ showLeftSidebar: false })}
                />
                
                {/* Sidebar */}
                <div className="fixed left-0 top-0 h-full w-80 bg-background border-r border-border transform transition-all duration-300 ease-out lg:relative lg:w-64 lg:shadow-none shadow-2xl animate-in slide-in-from-left">
                  <ErrorBoundary fallback={<div className="p-4 text-red-600">Sidebar Error</div>}>
                    <LeftSidebar 
                      onClose={() => updateState({ showLeftSidebar: false })}
                      onToggle={toggleSidebar}
                      isOpen={state.showLeftSidebar}
                      onOpenSettings={() => updateState({ showSettings: true })}
                      onOpenDeveloper={() => updateState({ showDeveloper: true })}
                      selectedModel={state.selectedModel}
                      onModelChange={(model) => updateState({ selectedModel: model })}
                      theme={state.theme}
                      onThemeChange={(theme) => updateState({ theme })}
                    />
                  </ErrorBoundary>
                </div>
              </div>
            )}

            {/* Main Chat Area - Full Width Focus */}
            <main className="flex-1 flex flex-col min-w-0">
              <ErrorBoundary fallback={<div className="flex-1 bg-red-50 flex items-center justify-center text-red-600">Content Error</div>}>
                <ChatInterface 
                  selectedModel={state.selectedModel}
                  onOpenSettings={() => updateState({ showSettings: true })}
                  onOpenDeveloper={() => updateState({ showDeveloper: true })}
                  onOpenSystemStatus={() => updateState({ showSystemStatus: true })}
                  onOpenAgentManager={() => updateState({ showAgentManager: true })}
                  onOpenAdvancedMemory={() => updateState({ showAdvancedMemory: true })}
                  onToggleSidebar={toggleSidebar}
                  sidebarOpen={state.showLeftSidebar}
                  onSetSidebarOpen={(open) => updateState({ showLeftSidebar: open })}
                />
              </ErrorBoundary>
            </main>
          </div>

          {/* Modals */}
          {state.showSettings && (
            <ErrorBoundary>
              <SettingsModal 
                isOpen={state.showSettings}
                onClose={() => updateState({ showSettings: false })}
                selectedModel={state.selectedModel}
                onModelChange={(model) => updateState({ selectedModel: model })}
                theme={state.theme}
                onThemeChange={(theme) => updateState({ theme })}
              />
            </ErrorBoundary>
          )}

          {state.showDeveloper && (
            <ErrorBoundary>
              <DeveloperModal 
                isOpen={state.showDeveloper}
                onClose={() => updateState({ showDeveloper: false })}
              />
            </ErrorBoundary>
          )}

          {/* Advanced Overlays */}
          {state.showSystemStatus && (
            <ErrorBoundary>
              <SystemStatusOverlay 
                onClose={() => updateState({ showSystemStatus: false })}
              />
            </ErrorBoundary>
          )}

          {state.showAgentManager && (
            <ErrorBoundary>
              <AgentManagerOverlay 
                isOpen={state.showAgentManager}
                onClose={() => updateState({ showAgentManager: false })}
              />
            </ErrorBoundary>
          )}

          {state.showAdvancedMemory && (
            <ErrorBoundary>
              <AdvancedMemoryPanel 
                isOpen={state.showAdvancedMemory}
                onClose={() => updateState({ showAdvancedMemory: false })}
              />
            </ErrorBoundary>
          )}
        </div>
      </ToastProvider>
    </ErrorBoundary>
  )
}

export default App