import React, { useState } from 'react'

// Core Chat Components
import ChatInterface from './components/chat/ChatInterface'
import LeftSidebar from './components/layout/LeftSidebar'

// Modals & Overlays
import SettingsModal from './components/modals/SettingsModal'
import DeveloperModal from './components/modals/DeveloperModal'

// Global Systems
import { ToastProvider } from './components/ui/ToastSystem'

import './globals.css'

interface AppState {
  showLeftSidebar: boolean
  showSettings: boolean
  showDeveloper: boolean
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
    selectedModel: 'tinydolphin:latest',
    theme: 'system'
  })

  const updateState = (updates: Partial<AppState>) => {
    setState(prev => ({ ...prev, ...updates }))
  }

  const toggleSidebar = () => {
    updateState({ showLeftSidebar: !state.showLeftSidebar })
  }

  return (
    <ErrorBoundary>
      <ToastProvider>
        <div className="h-screen bg-background text-foreground overflow-hidden">
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
                <div className="fixed left-0 top-0 h-full w-80 bg-background border-r border-border transform transition-transform duration-300 ease-in-out lg:relative lg:w-64">
                  <ErrorBoundary fallback={<div className="p-4 text-red-600">Sidebar Error</div>}>
                    <LeftSidebar 
                      onClose={() => updateState({ showLeftSidebar: false })}
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
              <ErrorBoundary fallback={<div className="flex-1 bg-red-50 flex items-center justify-center text-red-600">Chat Error</div>}>
                <ChatInterface 
                  selectedModel={state.selectedModel}
                  onToggleSidebar={toggleSidebar}
                  showSidebar={state.showLeftSidebar}
                  onOpenSettings={() => updateState({ showSettings: true })}
                  onOpenDeveloper={() => updateState({ showDeveloper: true })}
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
        </div>
      </ToastProvider>
    </ErrorBoundary>
  )
}

export default App