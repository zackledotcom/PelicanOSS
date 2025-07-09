import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Textarea } from '../ui/textarea'
import { Badge } from '../ui/badge'
import { Loader2, Brain, Lightbulb, CheckCircle, AlertCircle } from 'lucide-react'

interface MCPThoughtStep {
  step: number
  thought: string
  reasoning: string
}

interface MCPThinkingResponse {
  success: boolean
  thoughts?: MCPThoughtStep[]
  finalAnswer?: string
  error?: string
}

interface MCPServerStatus {
  isRunning: boolean
  exists: boolean
}

export function SystemicThinkingPanel() {
  const [prompt, setPrompt] = useState('')
  const [context, setContext] = useState('')
  const [maxSteps, setMaxSteps] = useState(5)
  const [isThinking, setIsThinking] = useState(false)
  const [response, setResponse] = useState<MCPThinkingResponse | null>(null)
  const [serverStatus, setServerStatus] = useState<MCPServerStatus>({ isRunning: false, exists: false })

  // Check server status on mount
  useEffect(() => {
    checkServerStatus()
  }, [])

  const checkServerStatus = async () => {
    try {
      const status = await window.api.mcpGetServerStatus('sequential-thinking')
      setServerStatus(status)
    } catch (error) {
      console.error('Failed to check MCP server status:', error)
    }
  }

  const startServer = async () => {
    try {
      const result = await window.api.mcpStartServer('sequential-thinking')
      if (result.success) {
        setServerStatus({ isRunning: true, exists: true })
      } else {
        console.error('Failed to start MCP server:', result.error)
      }
    } catch (error) {
      console.error('Error starting MCP server:', error)
    }
  }

  const handleSystemicThinking = async () => {
    if (!prompt.trim()) return

    if (!serverStatus.isRunning) {
      await startServer()
      // Wait a moment for server to start
      await new Promise(resolve => setTimeout(resolve, 2000))
    }

    setIsThinking(true)
    setResponse(null)

    try {
      const result = await window.api.mcpThinkingRequest({
        prompt: prompt.trim(),
        context: context.trim() || undefined,
        maxSteps
      })

      setResponse(result)
    } catch (error) {
      setResponse({
        success: false,
        error: String(error)
      })
    } finally {
      setIsThinking(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Systemic Thinking</h2>
          <p className="text-muted-foreground">
            Deep problem-solving through sequential reasoning
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge 
            variant={serverStatus.isRunning ? "default" : "secondary"}
            className="gap-1"
          >
            <div className={`w-2 h-2 rounded-full ${
              serverStatus.isRunning ? 'bg-green-500' : 'bg-gray-400'
            }`} />
            {serverStatus.isRunning ? 'Active' : 'Inactive'}
          </Badge>
          {!serverStatus.isRunning && (
            <Button size="sm" onClick={startServer}>
              Start MCP Server
            </Button>
          )}
        </div>
      </div>

      {/* Input Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="w-5 h-5" />
            Problem Input
          </CardTitle>
          <CardDescription>
            Describe the problem or question you want to think through systematically
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label htmlFor="prompt" className="text-sm font-medium mb-2 block">
              Problem Statement
            </label>
            <Textarea
              id="prompt"
              placeholder="What problem would you like to think through? Be as specific as possible..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={3}
              className="resize-none"
            />
          </div>

          <div>
            <label htmlFor="context" className="text-sm font-medium mb-2 block">
              Additional Context (Optional)
            </label>
            <Textarea
              id="context"
              placeholder="Any additional context, constraints, or background information..."
              value={context}
              onChange={(e) => setContext(e.target.value)}
              rows={2}
              className="resize-none"
            />
          </div>

          <div className="flex items-center gap-4">
            <div>
              <label htmlFor="maxSteps" className="text-sm font-medium mb-2 block">
                Max Thinking Steps
              </label>
              <select
                id="maxSteps"
                value={maxSteps}
                onChange={(e) => setMaxSteps(parseInt(e.target.value))}
                className="border rounded px-3 py-1"
              >
                <option value={3}>3 steps</option>
                <option value={5}>5 steps</option>
                <option value={7}>7 steps</option>
                <option value={10}>10 steps</option>
              </select>
            </div>

            <div className="flex-1 flex justify-end">
              <Button 
                onClick={handleSystemicThinking}
                disabled={!prompt.trim() || isThinking}
                className="gap-2"
              >
                {isThinking ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Thinking...
                  </>
                ) : (
                  <>
                    <Lightbulb className="w-4 h-4" />
                    Start Thinking
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {response && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {response.success ? (
                <CheckCircle className="w-5 h-5 text-green-500" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-500" />
              )}
              Thinking Results
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {response.success ? (
              <>
                {/* Thought Process */}
                {response.thoughts && response.thoughts.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="font-medium">Thought Process:</h4>
                    {response.thoughts.map((thought, index) => (
                      <div key={index} className="border-l-4 border-blue-200 pl-4 py-2">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className="text-xs">
                            Step {thought.step}
                          </Badge>
                        </div>
                        <p className="text-sm mb-2">{thought.thought}</p>
                        <p className="text-xs text-muted-foreground">
                          <strong>Reasoning:</strong> {thought.reasoning}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Final Answer */}
                {response.finalAnswer && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <h4 className="font-medium text-green-800 mb-2">Final Conclusion:</h4>
                    <p className="text-green-700">{response.finalAnswer}</p>
                  </div>
                )}
              </>
            ) : (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <h4 className="font-medium text-red-800 mb-2">Error:</h4>
                <p className="text-red-700">{response.error}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
