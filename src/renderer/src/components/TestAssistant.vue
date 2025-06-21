<template>
  <div class="test-component">
    <h1>🕊️ PelicanOS AI Assistant</h1>
    <div class="status">
      <p>Ollama Status: {{ ollamaConnected ? '✅ Connected' : '❌ Disconnected' }}</p>
      <p>ChromaDB Status: {{ chromaConnected ? '✅ Connected' : '❌ Disconnected' }}</p>
    </div>
    
    <div v-if="!servicesReady" class="setup">
      <h2>Setting up services...</h2>
      <button @click="checkServices">Check Services</button>
    </div>
    
    <div v-else class="chat">
      <h2>Ready to Chat!</h2>
      <p>Available Models: {{ models.join(', ') }}</p>
      <div class="test-chat">
        <input v-model="testMessage" placeholder="Type a test message..." />
        <button @click="sendTest" :disabled="!testMessage">Send Test</button>
      </div>
      <div v-if="response" class="response">
        <strong>AI Response:</strong> {{ response }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

const ollamaConnected = ref(false)
const chromaConnected = ref(false)
const models = ref<string[]>([])
const testMessage = ref('')
const response = ref('')

const servicesReady = computed(() => ollamaConnected.value && chromaConnected.value)

async function checkServices() {
  try {
    // Check Ollama
    const ollamaResult = await window.api.checkOllamaStatus()
    ollamaConnected.value = ollamaResult.connected
    if (ollamaResult.models) {
      models.value = ollamaResult.models
    }
    
    // Check ChromaDB
    const chromaResult = await window.api.checkChromaStatus()
    chromaConnected.value = chromaResult.connected
    
    console.log('Service check results:', { ollamaResult, chromaResult })
  } catch (error) {
    console.error('Error checking services:', error)
  }
}

async function sendTest() {
  if (!testMessage.value) return
  
  try {
    const result = await window.api.chatWithAI({
      message: testMessage.value,
      model: models.value[0] || 'tinydolphin:latest',
      history: []
    })
    
    if (result.success) {
      response.value = result.message
    } else {
      response.value = 'Error: ' + result.message
    }
    
    testMessage.value = ''
  } catch (error) {
    response.value = 'Error: ' + error.message
    console.error('Chat error:', error)
  }
}

onMounted(() => {
  checkServices()
})
</script>

<style scoped>
.test-component {
  padding: 2rem;
  font-family: 'Segoe UI', sans-serif;
  max-width: 800px;
  margin: 0 auto;
}

.status p {
  margin: 0.5rem 0;
  font-size: 1.1rem;
}

.setup, .chat {
  margin-top: 2rem;
  padding: 1rem;
  border: 1px solid #ddd;
  border-radius: 8px;
}

.test-chat {
  display: flex;
  gap: 1rem;
  margin: 1rem 0;
}

.test-chat input {
  flex: 1;
  padding: 0.5rem;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.test-chat button {
  padding: 0.5rem 1rem;
  background: #007acc;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.test-chat button:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.response {
  margin-top: 1rem;
  padding: 1rem;
  background: #f5f5f5;
  border-radius: 4px;
}

button {
  padding: 0.5rem 1rem;
  background: #28a745;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

button:hover {
  background: #218838;
}
</style>
