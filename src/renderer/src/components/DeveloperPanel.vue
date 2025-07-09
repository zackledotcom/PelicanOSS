<template>
  <div class="developer-panel">
    <!-- Header Bar -->
    <div class="panel-header">
      <div class="header-left">
        <div class="developer-badge">
          <span class="badge-icon">⚡</span>
          <span class="badge-text">Developer Mode</span>
        </div>
      </div>

      <div class="header-actions">
        <button @click="toggleTerminal" class="header-btn" :class="{ active: terminalVisible }">
          <span class="btn-icon">🖥️</span>
          <span class="btn-text">Terminal</span>
        </button>

        <button @click="shareProject" class="header-btn">
          <span class="btn-icon">📤</span>
          <span class="btn-text">Share</span>
        </button>

        <button @click="$emit('close')" class="header-btn close-btn">
          <span class="btn-icon">✕</span>
        </button>
      </div>
    </div>

    <!-- File Navigation -->
    <div class="file-nav">
      <div class="nav-tabs">
        <button
          v-for="file in openFiles"
          :key="file.id"
          @click="setActiveFile(file.id)"
          :class="['file-tab', { active: activeFileId === file.id }]"
        >
          <span class="file-icon">{{ getFileIcon(file.name) }}</span>
          <span class="file-name">{{ file.name }}</span>
          <button @click.stop="closeFile(file.id)" class="close-file">×</button>
        </button>

        <button @click="openNewFile" class="file-tab new-file">
          <span class="file-icon">+</span>
          <span class="file-name">New File</span>
        </button>
      </div>

      <div class="nav-actions">
        <button @click="saveCurrentFile" class="nav-btn" :disabled="!hasUnsavedChanges">
          <span class="btn-icon">💾</span>
        </button>
        <button @click="openFileDialog" class="nav-btn">
          <span class="btn-icon">📁</span>
        </button>
      </div>
    </div>

    <!-- Code Editor Area -->
    <div class="editor-container" :class="{ 'with-terminal': terminalVisible }">
      <div class="editor-wrapper">
        <div v-if="activeFile" class="code-editor">
          <div class="editor-header">
            <span class="file-path">{{ activeFile.path || activeFile.name }}</span>
            <span v-if="activeFile.modified" class="modified-indicator">●</span>
          </div>

          <textarea
            v-model="activeFile.content"
            @input="handleFileChange"
            class="code-textarea"
            :placeholder="getEditorPlaceholder()"
            spellcheck="false"
          ></textarea>
        </div>

        <div v-else class="editor-placeholder">
          <div class="placeholder-content">
            <div class="placeholder-icon">📝</div>
            <h3>No file selected</h3>
            <p>Open a file or create a new one to start coding</p>
            <button @click="openNewFile" class="create-file-btn">Create New File</button>
          </div>
        </div>
      </div>

      <!-- Terminal Drawer -->
      <div v-if="terminalVisible" class="terminal-drawer">
        <div class="terminal-header">
          <div class="terminal-title">
            <span class="terminal-icon">🖥️</span>
            <span>Terminal</span>
          </div>
          <div class="terminal-actions">
            <button @click="clearTerminal" class="terminal-btn">Clear</button>
            <button @click="toggleTerminal" class="terminal-btn">Hide</button>
          </div>
        </div>

        <div class="terminal-content" ref="terminalContent">
          <div
            v-for="(line, index) in terminalHistory"
            :key="index"
            class="terminal-line"
            :class="line.type"
          >
            <span v-if="line.type === 'command'" class="terminal-prompt">$</span>
            <span class="terminal-text">{{ line.text }}</span>
          </div>
        </div>

        <div class="terminal-input">
          <span class="terminal-prompt">$</span>
          <input
            v-model="currentCommand"
            @keydown="handleTerminalInput"
            class="command-input"
            placeholder="Type a command..."
            ref="terminalInput"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue'

// Props & Emits
const emit = defineEmits(['close'])

// Types
interface FileTab {
  id: string
  name: string
  content: string
  path?: string
  language?: string
  modified?: boolean
}

interface TerminalLine {
  type: 'command' | 'output' | 'error'
  text: string
  timestamp?: Date
}

// State
const openFiles = ref<FileTab[]>([])
const activeFileId = ref<string | null>(null)
const terminalVisible = ref(false)
const terminalHistory = ref<TerminalLine[]>([
  { type: 'output', text: 'PelicanOS Developer Terminal' },
  { type: 'output', text: 'Type "help" for available commands' }
])
const currentCommand = ref('')
const terminalContent = ref<HTMLElement>()
const terminalInput = ref<HTMLInputElement>()

// Computed
const activeFile = computed(() => {
  if (!activeFileId.value) return null
  return openFiles.value.find((f) => f.id === activeFileId.value) || null
})

const hasUnsavedChanges = computed(() => {
  return openFiles.value.some((f) => f.modified)
})

// Methods
const setActiveFile = (fileId: string) => {
  activeFileId.value = fileId
}

const closeFile = (fileId: string) => {
  const index = openFiles.value.findIndex((f) => f.id === fileId)
  if (index === -1) return

  // If closing active file, switch to another file
  if (fileId === activeFileId.value) {
    if (openFiles.value.length > 1) {
      const newIndex = index === 0 ? 1 : index - 1
      activeFileId.value = openFiles.value[newIndex].id
    } else {
      activeFileId.value = null
    }
  }

  openFiles.value.splice(index, 1)
}

const openNewFile = () => {
  const fileId = `file_${Date.now()}`
  const newFile: FileTab = {
    id: fileId,
    name: 'untitled.js',
    content: '',
    language: 'javascript',
    modified: false
  }

  openFiles.value.push(newFile)
  activeFileId.value = fileId
}

const openFileDialog = async () => {
  try {
    // Use Electron's dialog to open file
    const result = await window.api.openFileDialog()
    if (result.success && result.filePath) {
      const content = await window.api.readFile(result.filePath)
      const fileName = result.filePath.split('/').pop() || 'unknown'

      const fileId = `file_${Date.now()}`
      const newFile: FileTab = {
        id: fileId,
        name: fileName,
        content: content,
        path: result.filePath,
        language: getLanguageFromExtension(fileName),
        modified: false
      }

      openFiles.value.push(newFile)
      activeFileId.value = fileId
    }
  } catch (error) {
    console.error('Failed to open file:', error)
    addTerminalLine('error', `Failed to open file: ${error}`)
  }
}

const saveCurrentFile = async () => {
  if (!activeFile.value) return

  try {
    if (activeFile.value.path) {
      // Save existing file
      await window.api.writeFile(activeFile.value.path, activeFile.value.content)
      activeFile.value.modified = false
      addTerminalLine('output', `Saved: ${activeFile.value.name}`)
    } else {
      // Save as new file
      const result = await window.api.saveFileDialog(
        activeFile.value.name,
        activeFile.value.content
      )
      if (result.success && result.filePath) {
        activeFile.value.path = result.filePath
        activeFile.value.name = result.filePath.split('/').pop() || activeFile.value.name
        activeFile.value.modified = false
        addTerminalLine('output', `Saved: ${activeFile.value.name}`)
      }
    }
  } catch (error) {
    console.error('Failed to save file:', error)
    addTerminalLine('error', `Failed to save file: ${error}`)
  }
}

const handleFileChange = () => {
  if (activeFile.value) {
    activeFile.value.modified = true
  }
}

const getFileIcon = (fileName: string): string => {
  const ext = fileName.split('.').pop()?.toLowerCase()
  const icons: Record<string, string> = {
    js: '📄',
    ts: '📘',
    vue: '💚',
    html: '🌐',
    css: '🎨',
    json: '📋',
    md: '📝',
    py: '🐍',
    txt: '📄'
  }
  return icons[ext || ''] || '📄'
}

const getLanguageFromExtension = (fileName: string): string => {
  const ext = fileName.split('.').pop()?.toLowerCase()
  const languages: Record<string, string> = {
    js: 'javascript',
    ts: 'typescript',
    vue: 'vue',
    html: 'html',
    css: 'css',
    json: 'json',
    md: 'markdown',
    py: 'python'
  }
  return languages[ext || ''] || 'text'
}

const getEditorPlaceholder = (): string => {
  if (!activeFile.value) return ''

  const placeholders: Record<string, string> = {
    javascript: '// Start coding in JavaScript...',
    typescript: '// Start coding in TypeScript...',
    vue: '<template>\n  <!-- Your Vue component -->\n</template>',
    html: '<!DOCTYPE html>\n<html>\n  <!-- Your HTML content -->\n</html>',
    css: '/* Your CSS styles */',
    python: '# Start coding in Python...',
    json: '{\n  // Your JSON data\n}'
  }

  return placeholders[activeFile.value.language || ''] || '// Start coding...'
}

// Terminal Methods
const toggleTerminal = () => {
  terminalVisible.value = !terminalVisible.value
  if (terminalVisible.value) {
    nextTick(() => {
      terminalInput.value?.focus()
    })
  }
}

const clearTerminal = () => {
  terminalHistory.value = [
    { type: 'output', text: 'PelicanOS Developer Terminal' },
    { type: 'output', text: 'Type "help" for available commands' }
  ]
}

const addTerminalLine = (type: TerminalLine['type'], text: string) => {
  terminalHistory.value.push({ type, text, timestamp: new Date() })
  nextTick(() => {
    if (terminalContent.value) {
      terminalContent.value.scrollTop = terminalContent.value.scrollHeight
    }
  })
}

const handleTerminalInput = async (event: KeyboardEvent) => {
  if (event.key === 'Enter') {
    const command = currentCommand.value.trim()
    if (!command) return

    // Add command to history
    addTerminalLine('command', command)
    currentCommand.value = ''

    // Process command
    await executeCommand(command)
  }
}

const executeCommand = async (command: string) => {
  const [cmd, ...args] = command.split(' ')

  try {
    switch (cmd.toLowerCase()) {
      case 'help':
        addTerminalLine('output', 'Available commands:')
        addTerminalLine('output', '  help - Show this help')
        addTerminalLine('output', '  clear - Clear terminal')
        addTerminalLine('output', '  ls - List files')
        addTerminalLine('output', '  pwd - Print working directory')
        addTerminalLine('output', '  echo <text> - Echo text')
        break

      case 'clear':
        clearTerminal()
        break

      case 'ls':
        openFiles.value.forEach((file) => {
          addTerminalLine('output', `  ${file.name}${file.modified ? ' *' : ''}`)
        })
        break

      case 'pwd':
        addTerminalLine('output', '/developer/workspace')
        break

      case 'echo':
        addTerminalLine('output', args.join(' '))
        break

      default:
        // Try to execute as system command via IPC
        try {
          const result = await window.api.executeCommand(command)
          if (result.stdout) {
            addTerminalLine('output', result.stdout)
          }
          if (result.stderr) {
            addTerminalLine('error', result.stderr)
          }
        } catch (error) {
          addTerminalLine('error', `Command not found: ${cmd}`)
        }
        break
    }
  } catch (error) {
    addTerminalLine('error', `Error executing command: ${error}`)
  }
}

const shareProject = () => {
  // Implementation for sharing/exporting project
  addTerminalLine('output', 'Share functionality coming soon...')
}

// Lifecycle
onMounted(() => {
  // Create a default file to start with
  openNewFile()
})
</script>

<style scoped>
.developer-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);
  border-left: 1px solid rgba(255, 255, 255, 0.1);
  color: white;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
}

/* Header */
.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  background: rgba(0, 0, 0, 0.3);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
}

.developer-badge {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: rgba(34, 197, 94, 0.2);
  padding: 0.5rem 1rem;
  border-radius: 20px;
  border: 1px solid rgba(34, 197, 94, 0.3);
}

.badge-icon {
  font-size: 0.9rem;
}

.badge-text {
  font-size: 0.9rem;
  font-weight: 600;
}

.header-actions {
  display: flex;
  gap: 0.5rem;
}

.header-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: rgba(255, 255, 255, 0.1);
  border: none;
  border-radius: 8px;
  color: white;
  cursor: pointer;
  transition: all 0.3s;
  font-size: 0.9rem;
}

.header-btn:hover {
  background: rgba(255, 255, 255, 0.2);
  transform: translateY(-1px);
}

.header-btn.active {
  background: rgba(59, 130, 246, 0.3);
  border: 1px solid rgba(59, 130, 246, 0.5);
}

.close-btn {
  padding: 0.5rem;
}

.close-btn:hover {
  background: rgba(239, 68, 68, 0.3);
}

/* File Navigation */
.file-nav {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 1rem;
  background: rgba(0, 0, 0, 0.2);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  min-height: 3rem;
}

.nav-tabs {
  display: flex;
  gap: 0.25rem;
  flex: 1;
  overflow-x: auto;
}

.file-tab {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: rgba(255, 255, 255, 0.1);
  border: none;
  border-radius: 6px;
  color: white;
  cursor: pointer;
  transition: all 0.3s;
  white-space: nowrap;
  font-size: 0.85rem;
}

.file-tab:hover {
  background: rgba(255, 255, 255, 0.15);
}

.file-tab.active {
  background: rgba(59, 130, 246, 0.3);
  border: 1px solid rgba(59, 130, 246, 0.5);
}

.file-tab.new-file {
  background: rgba(34, 197, 94, 0.2);
  border: 1px solid rgba(34, 197, 94, 0.3);
}

.file-icon {
  font-size: 0.9rem;
}

.file-name {
  font-size: 0.85rem;
}

.close-file {
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.6);
  cursor: pointer;
  padding: 0;
  margin-left: 0.5rem;
  font-size: 1rem;
  line-height: 1;
}

.close-file:hover {
  color: white;
}

.nav-actions {
  display: flex;
  gap: 0.5rem;
}

.nav-btn {
  padding: 0.5rem;
  background: rgba(255, 255, 255, 0.1);
  border: none;
  border-radius: 6px;
  color: white;
  cursor: pointer;
  transition: all 0.3s;
}

.nav-btn:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.2);
}

.nav-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Editor Container */
.editor-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.editor-container.with-terminal {
  max-height: 60%;
}

.editor-wrapper {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

/* Code Editor */
.code-editor {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.editor-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1rem;
  background: rgba(0, 0, 0, 0.2);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.file-path {
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.8);
}

.modified-indicator {
  color: #fbbf24;
  font-size: 1.2rem;
  line-height: 1;
}

.code-textarea {
  flex: 1;
  padding: 1rem;
  background: rgba(0, 0, 0, 0.3);
  border: none;
  color: white;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 0.9rem;
  line-height: 1.5;
  resize: none;
  outline: none;
  white-space: pre;
  overflow-wrap: normal;
  overflow-x: auto;
}

.code-textarea::placeholder {
  color: rgba(255, 255, 255, 0.4);
}

/* Editor Placeholder */
.editor-placeholder {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.1);
}

.placeholder-content {
  text-align: center;
  color: rgba(255, 255, 255, 0.6);
}

.placeholder-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
}

.placeholder-content h3 {
  font-size: 1.2rem;
  margin-bottom: 0.5rem;
  color: white;
}

.placeholder-content p {
  margin-bottom: 1.5rem;
  font-size: 0.9rem;
}

.create-file-btn {
  padding: 0.75rem 1.5rem;
  background: rgba(59, 130, 246, 0.3);
  border: 1px solid rgba(59, 130, 246, 0.5);
  border-radius: 8px;
  color: white;
  cursor: pointer;
  transition: all 0.3s;
}

.create-file-btn:hover {
  background: rgba(59, 130, 246, 0.4);
  transform: translateY(-1px);
}

/* Terminal */
.terminal-drawer {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 200px;
  max-height: 40%;
  background: rgba(0, 0, 0, 0.4);
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.terminal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1rem;
  background: rgba(0, 0, 0, 0.3);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.terminal-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9rem;
  font-weight: 600;
}

.terminal-actions {
  display: flex;
  gap: 0.5rem;
}

.terminal-btn {
  padding: 0.25rem 0.75rem;
  background: rgba(255, 255, 255, 0.1);
  border: none;
  border-radius: 4px;
  color: white;
  cursor: pointer;
  transition: all 0.3s;
  font-size: 0.8rem;
}

.terminal-btn:hover {
  background: rgba(255, 255, 255, 0.2);
}

.terminal-content {
  flex: 1;
  padding: 1rem;
  overflow-y: auto;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 0.85rem;
  line-height: 1.4;
}

.terminal-line {
  display: flex;
  margin-bottom: 0.25rem;
}

.terminal-line.command {
  color: #22c55e;
}

.terminal-line.error {
  color: #ef4444;
}

.terminal-line.output {
  color: rgba(255, 255, 255, 0.9);
}

.terminal-prompt {
  color: #22c55e;
  margin-right: 0.5rem;
  font-weight: bold;
}

.terminal-input {
  display: flex;
  align-items: center;
  padding: 0.75rem 1rem;
  background: rgba(0, 0, 0, 0.2);
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.command-input {
  flex: 1;
  background: none;
  border: none;
  color: white;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 0.85rem;
  outline: none;
  margin-left: 0.5rem;
}

.command-input::placeholder {
  color: rgba(255, 255, 255, 0.4);
}

/* Scrollbars */
.nav-tabs::-webkit-scrollbar,
.terminal-content::-webkit-scrollbar {
  height: 4px;
  width: 4px;
}

.nav-tabs::-webkit-scrollbar-track,
.terminal-content::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.1);
}

.nav-tabs::-webkit-scrollbar-thumb,
.terminal-content::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.3);
  border-radius: 2px;
}

.nav-tabs::-webkit-scrollbar-thumb:hover,
.terminal-content::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.5);
}
</style>
