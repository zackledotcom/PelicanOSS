# PelicanOS Multi-AI Integration - Gemini CLI Consultation

## Project Context
PelicanOS is a privacy-first AI desktop application built with:
- **Framework**: Electron + React + TypeScript
- **Current AI**: Ollama (local LLM inference)
- **Database**: ChromaDB (vector storage for RAG)
- **Architecture**: Secure IPC, sandboxed renderer, modular services

## Integration Goal
Integrate both Claude Desktop Commander and Gemini CLI alongside Ollama to create a multi-AI collaboration platform where users can:
1. Switch between AI providers (Ollama/Claude/Gemini)
2. Enable AI-to-AI collaboration on complex tasks
3. Maintain privacy-first principles with explicit consent for external AIs

## Current Architecture
```
User → React UI → Electron IPC → Ollama API → ChromaDB
```

## Target Architecture
```
User → React UI → AI Router → {
                                Ollama (Local)
                                Claude Desktop Commander (External)
                                Gemini CLI (External)
                                Multi-AI Collaboration Engine
                              } → Unified Response
```

## Proposed Gemini CLI Service Implementation
```typescript
export class GeminiCliService extends EventEmitter {
  private config: GeminiCliConfig
  private isInitialized = false

  async initialize(): Promise<boolean> {
    // Check if Gemini CLI is available
    const geminiAvailable = await this.checkGeminiCli()
    if (!geminiAvailable) {
      throw new Error('Gemini CLI not found')
    }

    // Set up environment
    if (this.config.apiKey) {
      process.env.GEMINI_API_KEY = this.config.apiKey
    }

    // Test authentication
    const authTest = await this.testAuthentication()
    if (!authTest) {
      throw new Error('Gemini CLI authentication failed')
    }

    this.isInitialized = true
    return true
  }

  async chat(message: string, context?: string): Promise<GeminiResponse> {
    const prompt = context ? `${context}\n\nUser: ${message}` : message
    const tempFile = join(tmpdir(), `gemini-prompt-${Date.now()}.txt`)
    await writeFile(tempFile, prompt)

    const response = await this.executeGeminiCommand([
      '--model', this.config.model,
      '--multiline',
      tempFile
    ])

    return {
      success: true,
      response: response.stdout,
      metadata: {
        provider: 'gemini-cli',
        model: this.config.model,
        responseTime: Date.now() - startTime
      }
    }
  }
}
```

## Key Technical Questions

### 1. Installation & Detection
- Is `gemini --version` the best health check command?
- Are there edge cases where detection might fail?
- Should we check for specific version requirements?

### 2. Authentication & API Keys
- How to handle different auth scenarios (personal account vs API key)?
- Best way to check current authentication status?
- How to detect if user is already authenticated?
- Command to check usage limits/quota remaining?

### 3. Model Selection & Capabilities
- Command to list available models for current user?
- How do model capabilities differ (context window, speed, cost)?
- Does CLI automatically fall back to gemini-2.5-flash on connection issues?
- Model-specific limitations to communicate to users?

### 4. Input/Output Handling
- Best approach for complex prompts (temporary files vs stdin)?
- How to handle special characters, code blocks, markdown?
- Can we get token count information from CLI output?
- Way to get response metadata (timing, tokens used)?

### 5. Web Search Integration
- How to trigger search explicitly vs @search in prompts?
- How to detect when search was used in response?
- Rate limits on search functionality?
- Can we get search results separately from AI response?

### 6. Error Handling & Rate Limits
- Error codes/messages that indicate rate limiting?
- How to handle network connectivity issues?
- Format of error messages from CLI?
- Specific exit codes to watch for?
- How to handle quota exhaustion gracefully?

### 7. Multi-AI Collaboration
Proposed scenario:
1. User: "Help me optimize this Python script"
2. Claude DC: Analyzes code, suggests optimizations
3. Gemini CLI: Searches for latest performance best practices
4. Both AIs: Provide complementary perspectives
5. System: Synthesizes unified response

Questions:
- How much conversation context should we pass?
- Optimal way to structure multi-AI prompts?
- Should we mention collaboration with other AIs?
- How to handle conflicting advice between AIs?

### 8. Context Management
- Actual context window size in practice?
- Prefer full message history or summarized context?
- How to handle context overflow scenarios?
- Prioritize recent vs relevant messages?

### 9. Performance Optimization
- Typical response time range to expect?
- Ways to speed up subsequent requests (caching, sessions)?
- Should we implement request queuing for concurrent requests?
- Warm-up techniques to reduce initial latency?

### 10. Advanced Features
- Which features provide most value in desktop AI app?
- How complex is MCP server integration?
- Can we leverage development tool integrations?
- How to handle multimodal inputs (images, files)?

## Security & Privacy Considerations
PelicanOS is privacy-first and needs to:
- Warn users before sending data to external services
- Allow users to mark conversations as "local only"
- Provide clear data handling transparency
- Audit all external AI interactions

## Implementation Timeline
- Week 1: Service layer and basic routing
- Week 2: UI integration and single-AI switching  
- Week 3: Collaboration features and AI-to-AI interaction
- Week 4: Security, polish, and testing

## Request for Gemini CLI
Please provide technical guidance on:
1. Best practices for the proposed implementation
2. Answers to the technical questions above
3. Recommendations for optimal user experience
4. Any gotchas or edge cases to watch for
5. Suggestions for testing and development workflow
6. Ideas for impressive "wow factor" features to prioritize

The goal is to create the best possible multi-AI desktop experience that showcases the unique strengths of each AI system while maintaining user trust and privacy.
