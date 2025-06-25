// WORKING CHAT HANDLER - Replace lines 464-600
ipcMain.handle('chat-with-ai', async (event, data: { message: string; model: string; history: any[]; memoryOptions?: any }) => {
  console.log('💬 Chat request received:', { model: data.model, message: data.message.substring(0, 50) + '...' })

  const { message, model, history } = data

  try {
    // Build prompt with conversation history
    let prompt = ''
    if (history && history.length > 0) {
      const context = history
        .slice(-3) // Last 3 messages for context
        .map(msg => `${msg.type === 'user' ? 'Human' : 'Assistant'}: ${msg.content}`)
        .join('\n')
      prompt = `${context}\nHuman: ${message}\nAssistant:`
    } else {
      prompt = `Human: ${message}\nAssistant:`
    }

    console.log('📝 Sending to Ollama model:', model)
    console.log('📄 Prompt preview:', prompt.substring(0, 100) + '...')

    // Direct API call to Ollama - no complex routing
    const response = await axios.post(`${OLLAMA_BASE_URL}/api/generate`, {
      model: model,
      prompt: prompt,
      stream: false,
      options: {
        temperature: 0.7,
        top_p: 0.9,
        top_k: 40,
        num_predict: 512
      }
    }, {
      timeout: 120000, // 2 minutes for model generation
      headers: {
        'Content-Type': 'application/json'
      }
    })

    console.log('✅ Response received from Ollama')
    console.log('📄 Response preview:', response.data.response?.substring(0, 100) + '...')

    if (response.data && response.data.response) {
      return {
        success: true,
        message: response.data.response.trim(),
        modelUsed: model
      }
    } else {
      console.error('❌ No response data from Ollama')
      return {
        success: false,
        message: 'Sorry, I received an empty response from the AI model.',
        modelUsed: model
      }
    }

  } catch (error) {
    console.error('❌ Chat error:', error.message)
    console.error('🔧 Error details:', {
      code: error.code,
      response: error.response?.status,
      url: error.config?.url
    })
    
    let errorMessage = 'Sorry, I encountered an error.'
    if (error.code === 'ECONNABORTED') {
      errorMessage = 'Sorry, the request timed out. The model might be too large or busy.'
    } else if (error.response?.status === 404) {
      errorMessage = `Sorry, the model "${model}" was not found. Please try a different model.`
    } else if (error.code === 'ECONNREFUSED') {
      errorMessage = 'Sorry, I cannot connect to the Ollama service.'
    }
    
    return {
      success: false,
      message: errorMessage,
      modelUsed: model,
      error: error.message
    }
  }
})
