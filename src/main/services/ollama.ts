import axios from 'axios'
import type { Message, MemorySummary } from '../../types/chat'

const OLLAMA_BASE_URL = 'http://127.0.0.1:11434'
const SUMMARIZATION_MODEL = 'tinydolphin:latest' // Fast model for summarization

interface SummarizationResult {
  success: boolean
  summary?: MemorySummary
  error?: string
}

/**
 * Sanitize content to remove potential PII only - NO content filtering or modification
 */
function sanitizeContent(content: string): string {
  // ONLY remove PII patterns - preserve all other content exactly as is
  let sanitized = content
    // Remove email addresses
    .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '[EMAIL]')
    // Remove phone numbers
    .replace(/\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, '[PHONE]')
    // Remove SSN patterns
    .replace(/\b\d{3}-?\d{2}-?\d{4}\b/g, '[SSN]')
    // Remove credit card patterns
    .replace(/\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g, '[CARD]')
  
  // DO NOT modify any other content - preserve exact meaning and intent
  return sanitized
}

/**
 * Extract topics from message content
 */
function extractTopics(messages: Message[]): string[] {
  const content = messages.map(m => m.content).join(' ')
  const words = content.toLowerCase().split(/\W+/)
  const topicWords = words.filter(word => 
    word.length > 4 && 
    !['function', 'return', 'const', 'variable'].includes(word)
  )
  
  // Get most frequent words as topics
  const frequency = topicWords.reduce((acc, word) => {
    acc[word] = (acc[word] || 0) + 1
    return acc
  }, {} as Record<string, number>)
  
  return Object.entries(frequency)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5)
    .map(([word]) => word)
}

/**
 * Generate summarization prompt - NO alignment filters or content modification
 */
function createSummarizationPrompt(messages: Message[]): string {
  const sanitizedMessages = messages.map(msg => ({
    ...msg,
    content: sanitizeContent(msg.content) // Only PII removal, nothing else
  }))

  const conversationText = sanitizedMessages
    .map(msg => `${msg.role}: ${msg.content}`)
    .join('\n')

  return `You are a conversation summarizer. Create an accurate summary of this conversation preserving the exact meaning and intent.

INSTRUCTIONS:
- Summarize the conversation accurately without modification
- Preserve the original topics, viewpoints, and intent exactly as expressed
- Extract key facts and preferences as stated, without interpretation
- Keep summary under 200 words
- Identify main topics discussed
- Do not add commentary, moral judgments, or filters

Conversation:
${conversationText}

Respond with JSON in this exact format:
{
  "summary": "Accurate summary preserving original meaning and intent",
  "keyFacts": ["fact1", "fact2", "fact3"],
  "topics": ["topic1", "topic2", "topic3"]
}

JSON Response:`
}

/**
 * Summarize an array of messages using Ollama
 */
export async function summarizeMessages(
  messages: Message[], 
  model: string = SUMMARIZATION_MODEL
): Promise<SummarizationResult> {
  if (messages.length === 0) {
    return { success: false, error: 'No messages to summarize' }
  }

  // Filter out system and error messages for summarization
  const userAndAssistantMessages = messages.filter(msg => 
    msg.role === 'user' || msg.role === 'assistant'
  )

  if (userAndAssistantMessages.length < 2) {
    return { success: false, error: 'Insufficient conversation for summarization' }
  }

  try {
    console.log(`🧠 Summarizing ${userAndAssistantMessages.length} messages with ${model}...`)
    
    const prompt = createSummarizationPrompt(userAndAssistantMessages)
    
    const response = await axios.post(`${OLLAMA_BASE_URL}/api/generate`, {
      model: model,
      prompt: prompt,
      stream: false,
      options: {
        temperature: 0.3, // Lower temperature for more consistent summaries
        top_p: 0.8,
        top_k: 20,
        num_predict: 300 // Limit response length
      }
    }, {
      timeout: 30000
    })

    if (!response.data?.response) {
      return { success: false, error: 'No response from summarization model' }
    }

    // Parse JSON response
    let parsedResponse
    try {
      // Extract JSON from response (in case there's extra text)
      const jsonMatch = response.data.response.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        throw new Error('No JSON found in response')
      }
      parsedResponse = JSON.parse(jsonMatch[0])
    } catch (parseError) {
      console.error('Failed to parse summarization response:', response.data.response)
      return { success: false, error: 'Invalid JSON response from model' }
    }

    // Validate response structure
    if (!parsedResponse.summary || !Array.isArray(parsedResponse.keyFacts) || !Array.isArray(parsedResponse.topics)) {
      return { success: false, error: 'Invalid summary structure' }
    }

    // Create memory summary - store exactly as returned by model
    const memorySummary: MemorySummary = {
      id: `summary_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      summary: parsedResponse.summary, // Store exactly as returned - no modification
      topics: parsedResponse.topics, // Store exactly as returned - no modification  
      keyFacts: parsedResponse.keyFacts, // Store exactly as returned - no modification
      createdAt: new Date().toISOString(),
      messageCount: userAndAssistantMessages.length
    }

    console.log('✅ Successfully created memory summary')
    return { success: true, summary: memorySummary }
    
  } catch (error) {
    console.error('❌ Summarization failed:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown summarization error'
    }
  }
}

/**
 * Check if Ollama model supports summarization
 */
export async function validateSummarizationModel(model: string): Promise<boolean> {
  try {
    const response = await axios.get(`${OLLAMA_BASE_URL}/api/tags`)
    const availableModels = response.data.models?.map((m: any) => m.name) || []
    return availableModels.includes(model)
  } catch (error) {
    console.error('Failed to validate summarization model:', error)
    return false
  }
}

/**
 * Generate context-enriched prompt for chat - transparent injection with no modification
 */
export function enrichPromptWithMemory(
  userPrompt: string, 
  memorySummaries: MemorySummary[]
): string {
  if (memorySummaries.length === 0) {
    return userPrompt
  }

  // Use recent summaries for context - inject transparently without modification
  const contextSummaries = memorySummaries.slice(-3) // Last 3 summaries
  const keyFacts = memorySummaries.flatMap(summary => summary.keyFacts).slice(-10) // Last 10 key facts

  let enrichedPrompt = userPrompt

  // Transparently inject memory context at the beginning
  if (contextSummaries.length > 0) {
    const contextText = contextSummaries
      .map(summary => summary.summary)
      .join('\n')
    
    enrichedPrompt = `[Previous conversation context: ${contextText}]\n\n${userPrompt}`
  }

  if (keyFacts.length > 0) {
    enrichedPrompt = `[Key context from past conversations: ${keyFacts.join('; ')}]\n\n${enrichedPrompt}`
  }

  return enrichedPrompt
}
