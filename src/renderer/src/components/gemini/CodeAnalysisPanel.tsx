import React, { useState } from 'react'
import {
  Folder,
  MagnifyingGlass,
  Lightning,
  Check,
  X,
  FileText,
  Bug,
  ShieldCheck,
  Gauge
} from 'phosphor-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useToast } from '@/components/ui/toast'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'

interface AnalysisResult {
  summary: string
  diff?: string
  affectedFiles?: string[]
}

interface CodeAnalysisPanelProps {
  onClose: () => void;
}

const CodeAnalysisPanel: React.FC<CodeAnalysisPanelProps> = ({ onClose }) => {
  const [projectPath, setProjectPath] = useState<string>('')
  const [analysisType, setAnalysisType] = useState<string>('bugs')
  const [isLoading, setIsLoading] = useState(false)
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const { addToast } = useToast()

  const handleSelectProject = async () => {
    // This would typically call an IPC handler to open a dialog
    // For now, we'll mock a path
    const mockPath = '/Users/jibbr/Desktop/Wonder/PelicanOS'
    setProjectPath(mockPath)
    addToast({
      type: 'info',
      title: 'Project Selected',
      description: `Selected: ${mockPath}`
    })
  }

  const handleRunAnalysis = async () => {
    if (!projectPath) {
      addToast({
        type: 'error',
        title: 'Error',
        description: 'Please select a project directory first.'
      })
      return
    }

    setIsLoading(true)
    setError(null)
    setAnalysisResult(null)

    try {
      const result = await window.api.geminiCliAnalyzeProject({ projectPath, analysisType })
      if (result.success) {
        // Assuming the response is a string that needs parsing
        // In a real scenario, the response might be structured JSON
        const responseText = result.response || ''
        const diffMatch = responseText.match(/```diff\n([\s\S]*?)```/)
        const summary = diffMatch ? responseText.replace(diffMatch[0], '') : responseText

        setAnalysisResult({
          summary: summary.trim(),
          diff: diffMatch ? diffMatch[1] : undefined
        })

        addToast({
          type: 'success',
          title: 'Analysis Complete',
          description: `Found potential improvements for ${analysisType}.`
        })
      } else {
        throw new Error(result.error || 'Unknown error occurred')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred'
      setError(errorMessage)
      addToast({
        type: 'error',
        title: 'Analysis Failed',
        description: errorMessage
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleApplyDiff = async () => {
    if (!analysisResult?.diff || !projectPath) return

    try {
      const result = await window.api.geminiCliApplyDiff({
        diff: analysisResult.diff,
        projectPath
      })
      if (result.success) {
        addToast({
          type: 'success',
          title: 'Changes Applied',
          description: 'The suggested modifications have been saved.'
        })
        setAnalysisResult((prev) => (prev ? { ...prev, diff: undefined } : null))
      } else {
        throw new Error(result.error || 'Failed to apply changes')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred'
      setError(errorMessage)
      addToast({
        type: 'error',
        title: 'Apply Failed',
        description: errorMessage
      })
    }
  }

  return (
    <Card className="w-full h-full flex flex-col">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <MagnifyingGlass size={20} />
            Gemini Code Analysis
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X size={16} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col gap-4 overflow-hidden">
        {/* Controls */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <Label>Project Directory</Label>
            <div className="flex gap-2 mt-1">
              <Input value={projectPath} readOnly placeholder="Select a project..." />
              <Button variant="outline" onClick={handleSelectProject}>
                <Folder size={16} className="mr-2" />
                Browse
              </Button>
            </div>
          </div>
          <div className="w-full sm:w-48">
            <Label>Analysis Type</Label>
            <Select value={analysisType} onValueChange={setAnalysisType}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bugs">
                  <div className="flex items-center gap-2">
                    <Bug size={16} /> Find Bugs
                  </div>
                </SelectItem>
                <SelectItem value="performance">
                  <Gauge size={16} /> Performance
                </SelectItem>
                <SelectItem value="security">
                  <ShieldCheck size={16} /> Security Scan
                </SelectItem>
                <SelectItem value="refactor">
                  <Lightning size={16} /> Refactor
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <Button onClick={handleRunAnalysis} disabled={isLoading || !projectPath}>
          {isLoading ? (
            <>
              <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2" />
              Analyzing...
            </>
          ) : (
            <>
              <Lightning size={16} className="mr-2" />
              Run Analysis
            </>
          )}
        </Button>

        {/* Results */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {error && (
            <div className="p-4 bg-red-50 text-red-700 rounded-md text-sm">{error}</div>
          )}
          {analysisResult && (
            <div className="flex-1 flex flex-col lg:flex-row gap-4 overflow-hidden">
              {/* Summary */}
              <Card className="flex-1 flex flex-col">
                <CardHeader>
                  <CardTitle className="text-base">Analysis Summary</CardTitle>
                </CardHeader>
                <CardContent className="flex-1 overflow-hidden">
                  <ScrollArea className="h-full">
                    <div className="prose prose-sm max-w-none">
                      <p>{analysisResult.summary}</p>
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>

              {/* Diff View */}
              {analysisResult.diff && (
                <Card className="flex-1 flex flex-col">
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <FileText size={18} />
                      Suggested Changes
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex-1 flex flex-col overflow-hidden">
                    <ScrollArea className="flex-1 bg-gray-900 text-white font-mono text-xs p-4 rounded-md">
                      <pre>
                        {analysisResult.diff.split('\n').map((line, i) => (
                          <div
                            key={i}
                            className={
                              line.startsWith('+')
                                ? 'bg-green-500/20 text-green-300'
                                : line.startsWith('-')
                                  ? 'bg-red-500/20 text-red-300'
                                  : ''
                            }
                          >
                            {line}
                          </div>
                        ))}
                      </pre>
                    </ScrollArea>
                    <div className="flex gap-2 mt-4">
                      <Button size="sm" onClick={handleApplyDiff}>
                        <Check size={16} className="mr-2" />
                        Apply Changes
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          setAnalysisResult((prev) =>
                            prev ? { ...prev, diff: undefined } : null
                          )
                        }
                      >
                        <X size={16} className="mr-2" />
                        Discard
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export default CodeAnalysisPanel
