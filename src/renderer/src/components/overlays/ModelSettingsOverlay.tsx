import React, { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Slider } from '../ui/slider'
import { Switch } from '../ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Badge } from '../ui/badge'
import { Separator } from '../ui/separator'
import {
  Gear,
  Cpu,
  Lightning,
  Brain,
  Thermometer,
  Clock,
  Download,
  Trash,
  Warning
} from 'phosphor-react'
import { useOllamaService } from '../../hooks/useServices'

interface ModelSettingsOverlayProps {
  isOpen: boolean
  onClose: () => void
  selectedModel: string
  onModelChange: (model: string) => void
}

interface ModelParameters {
  temperature: number
  topP: number
  topK: number
  repeatPenalty: number
  seed: number
  numPredict: number
  contextLength: number
  systemPrompt: string
  streaming: boolean
  keepAlive: string
}

const ModelSettingsOverlay: React.FC<ModelSettingsOverlayProps> = ({
  isOpen,
  onClose,
  selectedModel,
  onModelChange
}) => {
  const { models, getModels, pullModel } = useOllamaService()
  const [parameters, setParameters] = useState<ModelParameters>({
    temperature: 0.7,
    topP: 0.9,
    topK: 40,
    repeatPenalty: 1.1,
    seed: -1,
    numPredict: 100,
    contextLength: 2048,
    systemPrompt: '',
    streaming: true,
    keepAlive: '5m'
  })
  const [newModelName, setNewModelName] = useState('')
  const [downloading, setDownloading] = useState<string | null>(null)

  const updateParameter = (key: keyof ModelParameters, value: any) => {
    setParameters((prev) => ({ ...prev, [key]: value }))
  }

  const handlePullModel = async () => {
    if (!newModelName.trim()) return

    setDownloading(newModelName)
    try {
      await pullModel(newModelName)
      setNewModelName('')
      await getModels()
    } catch (error) {
      console.error('Failed to pull model:', error)
    } finally {
      setDownloading(null)
    }
  }

  const resetToDefaults = () => {
    setParameters({
      temperature: 0.7,
      topP: 0.9,
      topK: 40,
      repeatPenalty: 1.1,
      seed: -1,
      numPredict: 100,
      contextLength: 2048,
      systemPrompt: '',
      streaming: true,
      keepAlive: '5m'
    })
  }

  const getModelInfo = (modelName: string) => {
    // Mock model info - in real implementation, get from Ollama API
    const info = {
      size: '4.1GB',
      family: 'Llama',
      format: 'gguf',
      parameters: '7B',
      quantization: 'Q4_0'
    }
    return info
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-white/95 backdrop-blur-lg border border-white/20">
        <DialogHeader className="bg-gradient-to-r from-blue-50 to-purple-50 -m-6 p-6 mb-6 rounded-t-lg border-b border-white/20">
          <DialogTitle className="flex items-center gap-3 text-2xl">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl text-white">
              <Gear size={24} />
            </div>
            Advanced Model Settings
          </DialogTitle>
          <DialogDescription className="text-gray-600">
            Configure model parameters, manage downloads, and customize AI behavior
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="parameters" className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-white/60 backdrop-blur-sm">
            <TabsTrigger
              value="parameters"
              className="data-[state=active]:bg-blue-500 data-[state=active]:text-white"
            >
              Parameters
            </TabsTrigger>
            <TabsTrigger
              value="models"
              className="data-[state=active]:bg-blue-500 data-[state=active]:text-white"
            >
              Model Manager
            </TabsTrigger>
            <TabsTrigger
              value="advanced"
              className="data-[state=active]:bg-blue-500 data-[state=active]:text-white"
            >
              Advanced
            </TabsTrigger>
          </TabsList>

          {/* Parameters Tab */}
          <TabsContent value="parameters" className="space-y-6">
            <Card className="bg-white/60 backdrop-blur-sm border-white/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Thermometer size={20} className="text-orange-500" />
                  Generation Parameters
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Temperature */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Temperature</Label>
                    <Badge variant="outline">{parameters.temperature}</Badge>
                  </div>
                  <Slider
                    value={[parameters.temperature]}
                    onValueChange={([value]) => updateParameter('temperature', value)}
                    max={2}
                    min={0}
                    step={0.1}
                    className="w-full"
                  />
                  <p className="text-xs text-gray-500">
                    Controls randomness. Lower = more focused, Higher = more creative
                  </p>
                </div>

                <Separator className="bg-white/30" />

                {/* Top P */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Top P (Nucleus Sampling)</Label>
                    <Badge variant="outline">{parameters.topP}</Badge>
                  </div>
                  <Slider
                    value={[parameters.topP]}
                    onValueChange={([value]) => updateParameter('topP', value)}
                    max={1}
                    min={0}
                    step={0.1}
                    className="w-full"
                  />
                  <p className="text-xs text-gray-500">
                    Cumulative probability cutoff for token selection
                  </p>
                </div>

                <Separator className="bg-white/30" />

                {/* Top K */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Top K</Label>
                    <Badge variant="outline">{parameters.topK}</Badge>
                  </div>
                  <Slider
                    value={[parameters.topK]}
                    onValueChange={([value]) => updateParameter('topK', value)}
                    max={100}
                    min={1}
                    step={1}
                    className="w-full"
                  />
                  <p className="text-xs text-gray-500">
                    Limits selection to top K most likely tokens
                  </p>
                </div>

                <Separator className="bg-white/30" />

                {/* Context Length */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Context Length</Label>
                    <Badge variant="outline">{parameters.contextLength}</Badge>
                  </div>
                  <Select
                    value={parameters.contextLength.toString()}
                    onValueChange={(value) => updateParameter('contextLength', parseInt(value))}
                  >
                    <SelectTrigger className="bg-white/60">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="512">512 tokens</SelectItem>
                      <SelectItem value="1024">1024 tokens</SelectItem>
                      <SelectItem value="2048">2048 tokens</SelectItem>
                      <SelectItem value="4096">4096 tokens</SelectItem>
                      <SelectItem value="8192">8192 tokens (requires large model)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* System Prompt */}
            <Card className="bg-white/60 backdrop-blur-sm border-white/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain size={20} className="text-purple-500" />
                  System Prompt
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Custom System Instructions</Label>
                  <textarea
                    value={parameters.systemPrompt}
                    onChange={(e) => updateParameter('systemPrompt', e.target.value)}
                    className="w-full h-32 p-3 bg-white/60 border border-white/20 rounded-lg resize-none"
                    placeholder="Enter custom system instructions for the AI..."
                  />
                  <p className="text-xs text-gray-500">
                    Define the AI's role, personality, and behavior guidelines
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <Button onClick={resetToDefaults} variant="outline" className="bg-white/60">
                Reset to Defaults
              </Button>
              <Button className="bg-blue-600 hover:bg-blue-700 flex-1">Apply Settings</Button>
            </div>
          </TabsContent>

          {/* Models Tab */}
          <TabsContent value="models" className="space-y-6">
            {/* Current Model */}
            <Card className="bg-white/60 backdrop-blur-sm border-white/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Cpu size={20} className="text-blue-500" />
                  Current Model: {selectedModel}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  {Object.entries(getModelInfo(selectedModel)).map(([key, value]) => (
                    <div key={key} className="text-center">
                      <div className="text-lg font-semibold text-gray-700">{value}</div>
                      <div className="text-xs text-gray-500 capitalize">{key}</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Available Models */}
            <Card className="bg-white/60 backdrop-blur-sm border-white/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lightning size={20} className="text-yellow-500" />
                  Available Models
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3">
                  {models.map((model) => (
                    <div
                      key={model}
                      className={`flex items-center justify-between p-3 rounded-lg border transition-all ${
                        model === selectedModel
                          ? 'bg-blue-50 border-blue-200'
                          : 'bg-white/40 border-white/20 hover:bg-white/60'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-3 h-3 rounded-full ${model === selectedModel ? 'bg-blue-500' : 'bg-gray-300'}`}
                        />
                        <span className="font-medium">{model}</span>
                        {model === selectedModel && (
                          <Badge variant="default" className="bg-blue-500">
                            Active
                          </Badge>
                        )}
                      </div>
                      <div className="flex gap-2">
                        {model !== selectedModel && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onModelChange(model)}
                            className="bg-white/60"
                          >
                            Switch
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          className="bg-white/60 text-red-600 hover:text-red-700"
                        >
                          <Trash size={14} />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Download New Model */}
            <Card className="bg-white/60 backdrop-blur-sm border-white/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Download size={20} className="text-green-500" />
                  Download New Model
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-3">
                  <Input
                    value={newModelName}
                    onChange={(e) => setNewModelName(e.target.value)}
                    placeholder="Enter model name (e.g., llama2, codellama, mistral)"
                    className="bg-white/60"
                  />
                  <Button
                    onClick={handlePullModel}
                    disabled={!newModelName.trim() || downloading !== null}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {downloading === newModelName ? (
                      <>
                        <Clock size={16} className="animate-spin mr-2" />
                        Downloading...
                      </>
                    ) : (
                      <>
                        <Download size={16} className="mr-2" />
                        Pull Model
                      </>
                    )}
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {['llama2', 'codellama', 'mistral'].map((model) => (
                    <Button
                      key={model}
                      variant="outline"
                      size="sm"
                      onClick={() => setNewModelName(model)}
                      className="bg-white/40 hover:bg-white/60"
                    >
                      {model}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Advanced Tab */}
          <TabsContent value="advanced" className="space-y-6">
            <Card className="bg-white/60 backdrop-blur-sm border-white/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Warning size={20} className="text-orange-500" />
                  Advanced Configuration
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm font-medium">Streaming Responses</Label>
                    <p className="text-xs text-gray-500">Show tokens as they're generated</p>
                  </div>
                  <Switch
                    checked={parameters.streaming}
                    onCheckedChange={(checked) => updateParameter('streaming', checked)}
                  />
                </div>

                <Separator className="bg-white/30" />

                <div className="space-y-2">
                  <Label className="text-sm font-medium">Keep Alive Duration</Label>
                  <Select
                    value={parameters.keepAlive}
                    onValueChange={(value) => updateParameter('keepAlive', value)}
                  >
                    <SelectTrigger className="bg-white/60">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1m">1 minute</SelectItem>
                      <SelectItem value="5m">5 minutes</SelectItem>
                      <SelectItem value="10m">10 minutes</SelectItem>
                      <SelectItem value="30m">30 minutes</SelectItem>
                      <SelectItem value="-1">Always loaded</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-500">
                    How long to keep the model loaded in memory
                  </p>
                </div>

                <Separator className="bg-white/30" />

                <div className="space-y-2">
                  <Label className="text-sm font-medium">Random Seed</Label>
                  <Input
                    type="number"
                    value={parameters.seed}
                    onChange={(e) => updateParameter('seed', parseInt(e.target.value) || -1)}
                    className="bg-white/60"
                    placeholder="-1 (random)"
                  />
                  <p className="text-xs text-gray-500">
                    Set to -1 for random, or use specific number for reproducible results
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}

export default ModelSettingsOverlay
