// Main layout component that brings everything together
import React, { useState } from 'react'
import { 
  ChatCircle, 
  Gear, 
  Code, 
  Sidebar,
  X
} from 'phosphor-react'
import { Button } from '@/components/ui/button'
import { ChatContainer } from './chat'
import { 
  MemoryManager, 
  ThemeToggle, 
  AgentModeSelector,
  ModelSelector,
  OllamaStatus,
  NetworkStatus,
  ResourceMonitor,
  FileTree,
  WorkerManager
} from './sidebar'
import { SettingsModal, LogsViewer, PluginUploader } from './modals'
import { FileCanvas, TraceExplorer } from './dev'
import { cn } from '@/lib/utils'

interface AppLayoutProps {
  children?: React.ReactNode
  className?: string
}

export default function AppLayout({ children, className }: AppLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [devMode, setDevMode] = useState(false)
  const [theme, setTheme] = useState<'light' | 'dark' | 'ice'>('dark')

  // Mock data - replace with real data
  const mockData = {
    messages: [],
    memoryStores: [],
    models: [],
    workers: [],
    files: [],
    logs: [],
    plugins: [],
    metrics: {
      cpu: { usage: 45, cores: 8 },
      memory: { used: 8000000000, total: 16000000000, available: 8000000000 },
      disk: { used: 500000000000, total: 1000000000000 }
    }
  }

  return (
    <div className={cn("flex h-screen bg-gradient-to-br from-white via-mint-50 to-grey-50", className)}>
      {/* Sidebar - Enhanced Glass */}
      {sidebarOpen && (
        <div className="w-80 glass-panel border-0 overflow-auto">
          <div className="p-4 space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-black">Control Panel</h2>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setSidebarOpen(false)}
                className="glass-button h-6 w-6 p-0 border-0"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Theme & Mode */}
            <div className="flex gap-2">
              <ThemeToggle
                currentTheme={theme}
                onThemeChange={setTheme}
              />
              <Button
                size="sm"
                variant={devMode ? "default" : "outline"}
                onClick={() => setDevMode(!devMode)}
                className="glass-button gap-1 border-0"
              >
                <Code className="w-3 h-3" />
                Dev
              </Button>
            </div>

            {/* Status indicators */}
            <div className="space-y-2">
              <OllamaStatus
                status="connected"
                version="0.1.26"
                modelsLoaded={3}
                totalModels={5}
              />
              <NetworkStatus
                isOnline={true}
                isCloudMode={false}
                onToggleMode={() => {}}
                pingLatency={45}
              />
            </div>

            {/* Core panels */}
            <MemoryManager
              memoryStores={mockData.memoryStores}
              totalMemoryUsed={1000000}
              maxMemory={8000000}
              onClearMemory={() => {}}
              onRefreshMemory={() => {}}
            />

            <AgentModeSelector
              currentMode="manual"
              onModeChange={() => {}}
              isActive={false}
              onToggleActive={() => {}}
            />

            <ModelSelector
              currentModel="llama2"
              models={mockData.models}
              onModelChange={() => {}}
              onRefresh={() => {}}
            />

            <ResourceMonitor
              metrics={mockData.metrics}
              showLiveChart={true}
            />

            {/* Dev panels */}
            {devMode && (
              <>
                <FileTree
                  files={mockData.files}
                  onFileSelect={() => {}}
                />
                
                <WorkerManager
                  workers={mockData.workers}
                  onStartWorker={() => {}}
                  onStopWorker={() => {}}
                  onViewLogs={() => {}}
                />
              </>
            )}
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col">
        {/* Top bar - Enhanced Glass */}
        <div className="glass-panel border-0 p-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {!sidebarOpen && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setSidebarOpen(true)}
                className="glass-button gap-1 border-0"
              >
                <Sidebar className="w-4 h-4" />
              </Button>
            )}
            <h1 className="font-semibold text-black">PelicanOS</h1>
          </div>

          <div className="flex gap-2">
            <SettingsModal
              modelConfig={{
                temperature: 0.7,
                maxTokens: 2048,
                topP: 0.9,
                systemPrompt: "",
                streaming: true
              }}
              agentPermissions={{
                fileSystem: false,
                network: false,
                systemCommands: false,
                memoryAccess: true
              }}
              onModelConfigChange={() => {}}
              onPermissionsChange={() => {}}
            />

            <LogsViewer
              logs={mockData.logs}
              onExport={() => {}}
            />

            {devMode && (
              <PluginUploader
                plugins={mockData.plugins}
                onUploadPlugin={() => {}}
                onTogglePlugin={() => {}}
                onDeletePlugin={() => {}}
                onTestPlugin={() => {}}
              />
            )}
          </div>
        </div>

        {/* Content area */}
        <div className="flex-1 flex">
          {/* Chat */}
          <div className="flex-1">
            <ChatContainer
              messages={mockData.messages}
              currentMessage=""
              onMessageChange={() => {}}
              onSendMessage={() => {}}
              onEditMessage={() => {}}
              onReaction={() => {}}
              onStopStreaming={() => {}}
              onTerminal={() => {}}
              onBrowse={() => {}}
              onCanvas={() => {}}
              onTrain={() => {}}
            />
          </div>

          {/* Dev tools - Enhanced Glass */}
          {devMode && (
            <div className="w-96 glass-panel border-0 p-4 space-y-4">
              <FileCanvas
                files={[]}
                onOpenFile={() => {}}
                onSaveFile={() => {}}
                onCloseFile={() => {}}
                onRunFile={() => {}}
              />
              
              <TraceExplorer
                traces={[]}
                onExport={() => {}}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}