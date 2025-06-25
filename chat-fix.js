// Simplified chat handler - replace the complex one
ipcMain.handle('chat-with-ai', async (event, data: { message: string; model: string; history: any[] }) => {
  console.log('💬 Chat request:', { model: data.model, message: data.message.substring(0, 50) + '...' })

  const { message, model, history } = data

  try {
    // Build simple prompt with context
    let prompt = ''
    if (history && history.length > 0) {
      const context = history
        .slice(-3) // Last 3 messages
        .map(msg => `${msg.type === 'user' ? 'Human' : 'Assistant'}: ${msg.content}`)
        .join('\n')
      prompt = `${context}\nHuman: ${message}\nAssistant:`
    } else {
      prompt = `Human: ${message}\nAssistant:`
    }

    console.log('📝 Calling Ollama with model:', model)

    // Direct API call to Ollama
    const response = await axios.post(`${OLLAMA_BASE_URL}/api/generate`, {
      model: model,
      prompt: prompt,
      stream: false,
      options: {
        temperature: 0.7,
        top_p: 0.9,
        top_k: 40
      }
    }, {
      timeout: 60000,
      headers: { 'Content-Type': 'application/json' }
    })

    console.log('✅ Response received from:', model)

    if (response.data?.response) {
      return {
        success: true,
        message: response.data.response,
        modelUsed: model
      }
    } else {
      throw new Error('Empty response from model')
    }

  } catch (error) {
    console.error('❌ Chat failed:', error.message)
    return {
      success: false,
      message: `Error: ${error.message}`,
      modelUsed: model
    }
  }
})
