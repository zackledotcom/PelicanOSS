  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: inputValue.trim(),
      timestamp: new Date(),
      model: selectedModel
    }

    setMessages(prev => [...prev, userMessage])
    const messageToSend = inputValue.trim()
    setInputValue('')
    setIsLoading(true)

    try {
      let response: any

      // Route to different AI providers based on activeAI
      switch (activeAI) {
        case 'claude':
          const claudeResult = await window.api.claudeDcExecuteCommand({
            command: `echo "Claude analyzing: ${messageToSend}"`,
            timeout: 30000
          })
          response = {
            response: claudeResult.success 
              ? (claudeResult.output || 'Claude processed your request')
              : `Claude Error: ${claudeResult.error}`,
            success: claudeResult.success
          }
          break

        case 'gemini':
          const geminiResult = await window.api.geminiCliChatWithContext({
            message: messageToSend
          })
          response = {
            response: geminiResult.success 
              ? (geminiResult.response || 'Gemini analysis completed')
              : `Gemini Error: ${geminiResult.error}`,
            success: geminiResult.success
          }
          break

        case 'ollama':
        default:
          response = await window.api.chatWithAI({
            message: messageToSend,
            model: selectedModel,
            history: messages.slice(-10)
          })
          break
      }

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: response.response || response.message || 'No response received',
        timestamp: new Date(),
        model: selectedModel
      }

      setMessages(prev => [...prev, aiMessage])

      addToast({
        type: 'success',
        title: `${activeAI.charAt(0).toUpperCase() + activeAI.slice(1)} Response`,
        description: 'Message sent successfully',
        duration: 2000
      })

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: `I apologize, but I encountered an error: ${errorMessage}`,
        timestamp: new Date(),
        model: selectedModel
      }

      setMessages(prev => [...prev, aiMessage])

      addToast({
        type: 'error',
        title: 'Message Failed',
        description: errorMessage,
        duration: 3000
      })
    } finally {
      setIsLoading(false)
    }
  }