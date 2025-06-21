<template>
  <div class="ai-assistant">
    <!-- Header -->
    <div class="header">
      <div class="title">
        <h1>🕊️ PelicanOS AI Assistant</h1>
        <div class="status-indicators">
          <div class="status-item" :class="{ active: ollamaStatus.connected }">
            <div class="status-dot"></div>
            <span>Ollama {{ ollamaStatus.connected ? 'Connected' : 'Disconnected' }}</span>
          </div>
          <div class="status-item" :class="{ active: chromaStatus.connected }">
            <div class="status-dot"></div>
            <span>Chroma {{ chromaStatus.connected ? 'Connected' : 'Disconnected' }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Service Management Panel -->
    <div class="service-panel" v-if="!allServicesConnected">
      <div class="service-controls">
        <h3>Service Management</h3>
        
        <div class="service-group">
          <div class="service-header">
            <h4>🦙 Ollama Service</h4>
            <button @click="checkOllamaStatus" class="btn-check">Check Status</button>
          </div>
          <div class="service-info">
            <p>Status: {{ ollamaStatus.message }}</p>
            <div v-if="!ollamaStatus.connected" class="service-actions">
              <button @click="startOllama" class="btn-start" :disabled="ollamaStatus.starting">
                {{ ollamaStatus.starting ? 'Starting...' : 'Start Ollama' }}
              </button>
              <p class="service-hint">Make sure Ollama is installed and available in PATH</p>
            </div>
            <div v-if="ollamaStatus.connected && availableModels.length === 0" class="model-actions">
              <button @click="pullDefaultModel" class="btn-pull" :disabled="pullingModel">
                {{ pullingModel ? 'Pulling Model...' : 'Pull Default Model (llama2)' }}
              </button>
            </div>
          </div>
        </div>

        <div class="service-group">
          <div class="service-header">
            <h4>🧬 ChromaDB Service</h4>
            <button @click="checkChromaStatus" class="btn-check">Check Status</button>
          </div>
          <div class="service-info">
            <p>Status: {{ chromaStatus.message }}</p>
            <div v-if="!chromaStatus.connected" class="service-actions">
              <button @click="startChroma" class="btn-start" :disabled="chromaStatus.starting">
                {{ chromaStatus.starting ? 'Starting...' : 'Start ChromaDB' }}
              </button>
              <p class="service-hint">ChromaDB will start on port 8000</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Main Chat Interface -->
    <div class="chat-container" v-if="allServicesConnected">
      <div class="model-selector">
        <label>AI Model:</label>
        <select v-model="selectedModel" @change="switchModel">
          <option v-for="model in availableModels" :key="model" :value="model">
            {{ model }}
          </option>
        </select>
        <button @click="refreshModels" class="btn-refresh">Refresh</button>
      </div>

      <div class="chat-messages" ref="messagesContainer">
        <div
          v-for="(message, index) in messages"
          :key="index"
          :class="['message', message.type]"
        >
          <div class="message-content">
            <div class="message-header">
              <span class="sender">{{ message.type === 'user' ? 'You' : 'AI' }}</span>
              <span class="timestamp">{{ formatTime(message.timestamp) }}</span>
            </div>
            <div class="message-text" v-html="formatMessage(message.content)"></div>
          </div>
        </div>
        
        <div v-if="isThinking" class="message ai thinking">
          <div class="message-content">
            <div class="message-header">
              <span class="sender">AI</span>
            </div>
            <div class="thinking-indicator">
              <span class="thinking-dots">Thinking</span>
            </div>
          </div>
        </div>
      </div>

      <div class="chat-input">
        <div class="input-container">
          <textarea
            v-model="currentMessage"
            @keydown="handleKeyDown"
            placeholder="Ask me anything..."
            class="message-input"
            rows="1"
            ref="messageInput"
          ></textarea>
          <button
            @click="sendMessage"
            :disabled="!currentMessage.trim() || isThinking"
            class="send-button"
          >
            <span v-if="!isThinking">Send</span>
            <span v-else>...</span>
          </button>
        </div>
        
        <div class="input-actions">
          <button @click="clearChat" class="btn-clear">Clear Chat</button>
          <button @click="exportChat" class="btn-export">Export</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed, nextTick } from 'vue'

// State management
const messages = ref<Array<{
  type: 'user' | 'ai'
  content: string
  timestamp: Date
}>>([])

const currentMessage = ref('')
const isThinking = ref(false)
const selectedModel = ref('llama2')
const availableModels = ref<string[]>([])
const pullingModel = ref(false)

const ollamaStatus = reactive({
  connected: false,
  message: 'Checking connection...',
  starting: false
})

const chromaStatus = reactive({
  connected: false,
  message: 'Checking connection...',
  starting: false
})

const messagesContainer = ref<HTMLElement>()
const messageInput = ref<HTMLTextAreaElement>()

// Computed properties
const allServicesConnected = computed(() => 
  ollamaStatus.connected && chromaStatus.connected
)

// Service management functions
async function checkOllamaStatus() {
  try {
    const response = await window.api.checkOllamaStatus()
    ollamaStatus.connected = response.connected
    ollamaStatus.message = response.message
    
    if (response.connected && response.models) {
      availableModels.value = response.models
    }
  } catch (error) {
    ollamaStatus.connected = false
    ollamaStatus.message = 'Failed to connect to Ollama'
  }
}

async function startOllama() {
  ollamaStatus.starting = true
  try {
    const response = await window.api.startOllama()
    ollamaStatus.connected = response.success
    ollamaStatus.message = response.message
    
    if (response.success) {
      await checkOllamaStatus()
    }
  } catch (error) {
    ollamaStatus.message = 'Failed to start Ollama'
  }
  ollamaStatus.starting = false
}

async function checkChromaStatus() {
  try {
    const response = await window.api.checkChromaStatus()
    chromaStatus.connected = response.connected
    chromaStatus.message = response.message
  } catch (error) {
    chromaStatus.connected = false
    chromaStatus.message = 'Failed to connect to ChromaDB'
  }
}

async function startChroma() {
  chromaStatus.starting = true
  try {
    const response = await window.api.startChroma()
    chromaStatus.connected = response.success
    chromaStatus.message = response.message
  } catch (error) {
    chromaStatus.message = 'Failed to start ChromaDB'
  }
  chromaStatus.starting = false
}
async function pullDefaultModel() {
  pullingModel.value = true
  try {
    const response = await window.api.pullModel('llama2')
    if (response.success) {
      await refreshModels()
    }
  } catch (error) {
    console.error('Failed to pull model:', error)
  }
  pullingModel.value = false
}

async function refreshModels() {
  try {
    const response = await window.api.getOllamaModels()
    if (response.success) {
      availableModels.value = response.models
    }
  } catch (error) {
    console.error('Failed to refresh models:', error)
  }
}

// Chat functions
async function sendMessage() {
  if (!currentMessage.value.trim() || isThinking.value) return
  
  const userMessage = currentMessage.value.trim()
  
  // Add user message
  messages.value.push({
    type: 'user',
    content: userMessage,
    timestamp: new Date()
  })
  
  currentMessage.value = ''
  isThinking.value = true
  
  // Auto-resize textarea
  nextTick(() => {
    if (messageInput.value) {
      messageInput.value.style.height = 'auto'
    }
  })
  
  try {
    // Send to AI
    const response = await window.api.chatWithAI({
      message: userMessage,
      model: selectedModel.value,
      history: messages.value.slice(-10) // Send last 10 messages for context
    })
    
    if (response.success) {
      messages.value.push({
        type: 'ai',
        content: response.message,
        timestamp: new Date()
      })
    } else {
      messages.value.push({
        type: 'ai',
        content: 'Sorry, I encountered an error processing your request.',
        timestamp: new Date()
      })
    }
  } catch (error) {
    messages.value.push({
      type: 'ai',
      content: 'Sorry, I encountered an error processing your request.',
      timestamp: new Date()
    })
  }
  
  isThinking.value = false
  scrollToBottom()
}

function handleKeyDown(event: KeyboardEvent) {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault()
    sendMessage()
  }
}

function switchModel() {
  // Model switching logic if needed
  console.log('Switched to model:', selectedModel.value)
}

function clearChat() {
  messages.value = []
}

function exportChat() {
  const chatData = {
    timestamp: new Date().toISOString(),
    messages: messages.value
  }
  
  const dataStr = JSON.stringify(chatData, null, 2)
  const dataBlob = new Blob([dataStr], { type: 'application/json' })
  const url = URL.createObjectURL(dataBlob)
  
  const link = document.createElement('a')
  link.href = url
  link.download = `chat-export-${new Date().toISOString().split('T')[0]}.json`
  link.click()
  
  URL.revokeObjectURL(url)
}

// Utility functions
function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function formatMessage(content: string): string {
  // Basic markdown-like formatting
  return content
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`(.*?)`/g, '<code>$1</code>')
    .replace(/\n/g, '<br>')
}

function scrollToBottom() {
  nextTick(() => {
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
    }
  })
}

// Lifecycle
onMounted(async () => {
  await checkOllamaStatus()
  await checkChromaStatus()
  
  // Add welcome message
  messages.value.push({
    type: 'ai',
    content: 'Hello! I\'m your PelicanOS AI Assistant. I\'m powered by Ollama and ChromaDB for local AI processing. How can I help you today?',
    timestamp: new Date()
  })
  
  scrollToBottom()
})
</script>

<style scoped>
.ai-assistant {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
}

.header {
  padding: 1rem 2rem;
  background: rgba(0, 0, 0, 0.2);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.title h1 {
  margin: 0;
  font-size: 1.8rem;
  font-weight: 600;
}

.status-indicators {
  display: flex;
  gap: 1rem;
  margin-top: 0.5rem;
}

.status-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9rem;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #ff6b6b;
  transition: background-color 0.3s;
}

.status-item.active .status-dot {
  background: #51cf66;
}

.service-panel {
  flex: 1;
  padding: 2rem;
  overflow-y: auto;
}

.service-controls {
  max-width: 800px;
  margin: 0 auto;
}

.service-controls h3 {
  margin-bottom: 2rem;
  text-align: center;
  font-size: 1.5rem;
}

.service-group {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
  backdrop-filter: blur(10px);
}

.service-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.service-header h4 {
  margin: 0;
  font-size: 1.2rem;
}

.service-info p {
  margin: 0.5rem 0;
  opacity: 0.9;
}

.service-actions, .model-actions {
  margin-top: 1rem;
}

.service-hint {
  font-size: 0.8rem;
  opacity: 0.7;
  margin-top: 0.5rem;
}

.chat-container {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
}

.model-selector {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem 2rem;
  background: rgba(0, 0, 0, 0.1);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.model-selector select {
  padding: 0.5rem;
  border-radius: 6px;
  border: none;
  background: rgba(255, 255, 255, 0.9);
  color: #333;
}

.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 1rem 2rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.message {
  display: flex;
  max-width: 80%;
}

.message.user {
  align-self: flex-end;
}

.message.ai {
  align-self: flex-start;
}

.message-content {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 1rem;
  backdrop-filter: blur(10px);
}

.message.user .message-content {
  background: rgba(255, 255, 255, 0.2);
}

.message-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
  font-size: 0.8rem;
  opacity: 0.8;
}

.message-text {
  line-height: 1.5;
}

.thinking-indicator {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.thinking-dots::after {
  content: '...';
  animation: thinking 1.5s infinite;
}

@keyframes thinking {
  0%, 20% { content: '.'; }
  40% { content: '..'; }
  60%, 100% { content: '...'; }
}

.chat-input {
  padding: 1rem 2rem;
  background: rgba(0, 0, 0, 0.2);
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.input-container {
  display: flex;
  gap: 1rem;
  margin-bottom: 1rem;
}

.message-input {
  flex: 1;
  padding: 1rem;
  border-radius: 12px;
  border: none;
  background: rgba(255, 255, 255, 0.9);
  color: #333;
  resize: none;
  min-height: 50px;
  max-height: 150px;
}

.send-button {
  padding: 1rem 2rem;
  border-radius: 12px;
  border: none;
  background: #51cf66;
  color: white;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.3s;
}

.send-button:hover:not(:disabled) {
  background: #40c057;
  transform: translateY(-2px);
}

.send-button:disabled {
  background: #868e96;
  cursor: not-allowed;
}

.input-actions {
  display: flex;
  gap: 1rem;
  justify-content: center;
}

/* Button styles */
.btn-check, .btn-start, .btn-pull, .btn-refresh, .btn-clear, .btn-export {
  padding: 0.5rem 1rem;
  border-radius: 8px;
  border: none;
  background: rgba(255, 255, 255, 0.2);
  color: white;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.3s;
}

.btn-check:hover, .btn-refresh:hover, .btn-clear:hover, .btn-export:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: translateY(-1px);
}

.btn-start, .btn-pull {
  background: #51cf66;
}

.btn-start:hover:not(:disabled), .btn-pull:hover:not(:disabled) {
  background: #40c057;
  transform: translateY(-1px);
}

.btn-start:disabled, .btn-pull:disabled {
  background: #868e96;
  cursor: not-allowed;
}

/* Scrollbar styling */
.chat-messages::-webkit-scrollbar {
  width: 8px;
}

.chat-messages::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 4px;
}

.chat-messages::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.3);
  border-radius: 4px;
}

.chat-messages::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.5);
}
</style>
