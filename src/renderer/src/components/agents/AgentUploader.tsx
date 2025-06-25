import React, { useState, useRef } from 'react'
import { 
  Upload, 
  FileText, 
  CheckCircle, 
  Warning, 
  X,
  Robot,
  Wrench,
  Code,
  Plus,
  Download
} from 'phosphor-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'

interface AgentFile {
  id: string
  name: string
  file: File
  status: 'pending' | 'processing' | 'success' | 'error'
  progress: number
  error?: string
  metadata?: {
    type: 'json' | 'yaml' | 'py' | 'js'
    size: number
    skills?: string[]
    model?: string
  }
}

interface AgentUploaderProps {
  className?: string
  onAgentUploaded?: (agent: any) => void
}

const AgentUploader: React.FC<AgentUploaderProps> = ({ className, onAgentUploaded }) => {
  const [dragActive, setDragActive] = useState(false)
  const [uploadedFiles, setUploadedFiles] = useState<AgentFile[]>([])
  const [createMode, setCreateMode] = useState<'upload' | 'manual'>('upload')
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Manual agent creation state
  const [manualAgent, setManualAgent] = useState({
    name: '',
    description: '',
    model: 'tinydolphin:latest',
    systemPrompt: '',
    tools: [] as string[],
    temperature: 0.7
  })

  const supportedTypes = ['.json', '.yaml', '.yml', '.py', '.js', '.ts']

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    const files = Array.from(e.dataTransfer.files)
    handleFiles(files)
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files)
      handleFiles(files)
    }
  }

  const handleFiles = (files: File[]) => {
    const validFiles = files.filter(file => {
      const extension = '.' + file.name.split('.').pop()?.toLowerCase()
      return supportedTypes.includes(extension)
    })

    const newAgentFiles: AgentFile[] = validFiles.map(file => ({
      id: `agent-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: file.name,
      file,
      status: 'pending',
      progress: 0,
      metadata: {
        type: getFileType(file.name),
        size: file.size
      }
    }))

    setUploadedFiles(prev => [...prev, ...newAgentFiles])
    
    // Process each file
    newAgentFiles.forEach(processAgentFile)
  }

  const getFileType = (filename: string): 'json' | 'yaml' | 'py' | 'js' => {
    const ext = filename.split('.').pop()?.toLowerCase()
    switch (ext) {
      case 'json': return 'json'
      case 'yaml':
      case 'yml': return 'yaml'
      case 'py': return 'py'
      case 'js':
      case 'ts': return 'js'
      default: return 'json'
    }
  }

  const processAgentFile = async (agentFile: AgentFile) => {
    updateFileStatus(agentFile.id, 'processing', 25)

    try {
      const content = await readFileContent(agentFile.file)
      updateFileStatus(agentFile.id, 'processing', 50)

      const parsedAgent = await parseAgentContent(content, agentFile.metadata?.type || 'json')
      updateFileStatus(agentFile.id, 'processing', 75)

      // Validate agent structure
      const validation = validateAgent(parsedAgent)
      if (!validation.valid) {
        throw new Error(validation.errors.join(', '))
      }

      // Simulate API call to create agent
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      updateFileStatus(agentFile.id, 'success', 100)
      
      // Extract metadata
      setUploadedFiles(prev => prev.map(f => 
        f.id === agentFile.id 
          ? {
              ...f,
              metadata: {
                ...f.metadata!,
                skills: parsedAgent.tools || [],
                model: parsedAgent.model
              }
            }
          : f
      ))

      onAgentUploaded?.(parsedAgent)

    } catch (error) {
      updateFileStatus(agentFile.id, 'error', 0, error instanceof Error ? error.message : 'Unknown error')
    }
  }

  const readFileContent = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = () => reject(new Error('Failed to read file'))
      reader.readAsText(file)
    })
  }

  const parseAgentContent = async (content: string, type: string) => {
    switch (type) {
      case 'json':
        return JSON.parse(content)
      case 'yaml':
        // TODO: Add YAML parser
        throw new Error('YAML parsing not yet implemented')
      case 'py':
      case 'js':
        // TODO: Extract agent config from code files
        throw new Error('Code file parsing not yet implemented')
      default:
        throw new Error('Unsupported file type')
    }
  }

  const validateAgent = (agent: any) => {
    const errors: string[] = []
    
    if (!agent.name || typeof agent.name !== 'string') {
      errors.push('Agent name is required')
    }
    
    if (!agent.model || typeof agent.model !== 'string') {
      errors.push('Agent model is required')
    }
    
    if (!agent.system_prompt || typeof agent.system_prompt !== 'string') {
      errors.push('System prompt is required')
    }

    return {
      valid: errors.length === 0,
      errors
    }
  }

  const updateFileStatus = (id: string, status: AgentFile['status'], progress: number, error?: string) => {
    setUploadedFiles(prev => prev.map(file =>
      file.id === id
        ? { ...file, status, progress, error }
        : file
    ))
  }

  const removeFile = (id: string) => {
    setUploadedFiles(prev => prev.filter(file => file.id !== id))
  }

  const handleManualCreate = async () => {
    try {
      const agent = {
        id: `agent-${Date.now()}`,
        name: manualAgent.name,
        description: manualAgent.description,
        model: manualAgent.model,
        system_prompt: manualAgent.systemPrompt,
        tools: manualAgent.tools,
        settings: {
          temperature: manualAgent.temperature
        },
        created_at: new Date().toISOString()
      }

      // TODO: Call actual API
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      onAgentUploaded?.(agent)
      
      // Reset form
      setManualAgent({
        name: '',
        description: '',
        model: 'tinydolphin:latest',
        systemPrompt: '',
        tools: [],
        temperature: 0.7
      })

    } catch (error) {
      console.error('Failed to create agent:', error)
    }
  }

  const getStatusIcon = (status: AgentFile['status']) => {
    switch (status) {
      case 'success': return <CheckCircle size={16} className="text-green-500" />
      case 'error': return <Warning size={16} className="text-red-500" />
      case 'processing': return <Upload size={16} className="text-blue-500 animate-pulse" />
      default: return <FileText size={16} className="text-gray-500" />
    }
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Agent Uploader</h2>
          <p className="text-sm text-muted-foreground">
            Upload agent configurations or create new agents manually
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            variant={createMode === 'upload' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setCreateMode('upload')}
          >
            <Upload size={16} className="mr-1" />
            Upload
          </Button>
          <Button
            variant={createMode === 'manual' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setCreateMode('manual')}
          >
            <Plus size={16} className="mr-1" />
            Create
          </Button>
        </div>
      </div>

      <Tabs value={createMode} onValueChange={(value) => setCreateMode(value as 'upload' | 'manual')}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="upload">Upload Files</TabsTrigger>
          <TabsTrigger value="manual">Create Manually</TabsTrigger>
        </TabsList>

        {/* Upload Tab */}
        <TabsContent value="upload" className="space-y-4">
          {/* Drop Zone */}
          <div
            className={cn(
              "border-2 border-dashed rounded-lg p-8 text-center transition-colors",
              dragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25",
              "hover:border-primary/50 hover:bg-muted/50"
            )}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <div className="space-y-4">
              <div className="mx-auto w-12 h-12 bg-muted rounded-lg flex items-center justify-center">
                <Upload size={24} className="text-muted-foreground" />
              </div>
              
              <div>
                <h3 className="font-medium">Drag & drop agent files here</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Supports: {supportedTypes.join(', ')}
                </p>
              </div>
              
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
              >
                <FileText size={16} className="mr-2" />
                Choose Files
              </Button>
              
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept={supportedTypes.join(',')}
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>
          </div>

          {/* File List */}
          {uploadedFiles.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-medium">Uploaded Files</h3>
              {uploadedFiles.map((file) => (
                <div
                  key={file.id}
                  className="flex items-center space-x-3 p-3 bg-muted/30 rounded-lg"
                >
                  {getStatusIcon(file.status)}
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-medium truncate">{file.name}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFile(file.id)}
                      >
                        <X size={14} />
                      </Button>
                    </div>
                    
                    {file.status === 'processing' && (
                      <Progress value={file.progress} className="mt-2 h-2" />
                    )}
                    
                    {file.error && (
                      <p className="text-sm text-red-600 mt-1">{file.error}</p>
                    )}
                    
                    {file.metadata?.skills && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {file.metadata.skills.map((skill) => (
                          <Badge key={skill} variant="outline" className="text-xs">
                            {skill}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Templates */}
          <div className="border border-border rounded-lg p-4">
            <h3 className="font-medium mb-3">Agent Templates</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="p-3 bg-muted/30 rounded border cursor-pointer hover:bg-muted/50 transition-colors">
                <div className="flex items-center space-x-2 mb-2">
                  <Code size={16} className="text-blue-500" />
                  <span className="font-medium text-sm">Code Assistant</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Specialized for code review and development
                </p>
                <Button size="sm" variant="outline" className="w-full mt-2" disabled>
                  <Download size={12} className="mr-1" />
                  Download
                </Button>
              </div>
              
              <div className="p-3 bg-muted/30 rounded border cursor-pointer hover:bg-muted/50 transition-colors">
                <div className="flex items-center space-x-2 mb-2">
                  <Robot size={16} className="text-green-500" />
                  <span className="font-medium text-sm">Research Helper</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Optimized for data analysis and research
                </p>
                <Button size="sm" variant="outline" className="w-full mt-2" disabled>
                  <Download size={12} className="mr-1" />
                  Download
                </Button>
              </div>
              
              <div className="p-3 bg-muted/30 rounded border cursor-pointer hover:bg-muted/50 transition-colors">
                <div className="flex items-center space-x-2 mb-2">
                  <Wrench size={16} className="text-orange-500" />
                  <span className="font-medium text-sm">System Admin</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Tools for system management and automation
                </p>
                <Button size="sm" variant="outline" className="w-full mt-2" disabled>
                  <Download size={12} className="mr-1" />
                  Download
                </Button>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Manual Creation Tab */}
        <TabsContent value="manual" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="agent-name">Agent Name</Label>
              <Input
                id="agent-name"
                value={manualAgent.name}
                onChange={(e) => setManualAgent(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Code Helper"
                className="mt-1"
              />
            </div>
            
            <div>
              <Label htmlFor="agent-model">Model</Label>
              <Select 
                value={manualAgent.model} 
                onValueChange={(value) => setManualAgent(prev => ({ ...prev, model: value }))}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tinydolphin:latest">TinyDolphin (1B)</SelectItem>
                  <SelectItem value="openchat:latest">OpenChat (7B)</SelectItem>
                  <SelectItem value="phi4-mini-reasoning:latest">Phi4 Mini (3.8B)</SelectItem>
                  <SelectItem value="deepseek-coder:1.3b">DeepSeek Coder (1B)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div>
            <Label htmlFor="agent-description">Description</Label>
            <Input
              id="agent-description"
              value={manualAgent.description}
              onChange={(e) => setManualAgent(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Brief description of the agent's purpose"
              className="mt-1"
            />
          </div>
          
          <div>
            <Label htmlFor="system-prompt">System Prompt</Label>
            <Textarea
              id="system-prompt"
              value={manualAgent.systemPrompt}
              onChange={(e) => setManualAgent(prev => ({ ...prev, systemPrompt: e.target.value }))}
              placeholder="You are a helpful assistant specialized in..."
              className="mt-1 min-h-[100px]"
            />
          </div>
          
          <div className="flex space-x-4">
            <Button 
              onClick={handleManualCreate}
              disabled={!manualAgent.name || !manualAgent.systemPrompt}
            >
              <Plus size={16} className="mr-2" />
              Create Agent
            </Button>
            <Button variant="outline" onClick={() => {
              setManualAgent({
                name: '',
                description: '',
                model: 'tinydolphin:latest',
                systemPrompt: '',
                tools: [],
                temperature: 0.7
              })
            }}>
              Reset Form
            </Button>
          </div>
        </TabsContent>
      </Tabs>

      {/* Help */}
      <Alert>
        <FileText size={16} />
        <AlertDescription>
          <strong>Supported formats:</strong> JSON agent configs, YAML definitions, Python/JS agent scripts.
          All agents are validated before import and stored locally.
        </AlertDescription>
      </Alert>
    </div>
  )
}

export default AgentUploader
