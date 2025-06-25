import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Textarea } from '../ui/textarea'
import { Badge } from '../ui/badge'
import { ScrollArea } from '../ui/scroll-area'
import { 
  Workflow, 
  Lightning, 
  Plus, 
  Play, 
  Square, 
  ArrowsClockwise,
  Clock,
  CheckCircle,
  XCircle,
  Warning,
  Eye,
  Trash,
  Copy
} from 'phosphor-react'

export const WorkflowPanel: React.FC = () => {
  const [workflows, setWorkflows] = useState<any[]>([])
  const [executions, setExecutions] = useState<any[]>([])
  const [stats, setStats] = useState<any>(null)
  const [templates, setTemplates] = useState<any>({})
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [newWorkflow, setNewWorkflow] = useState({
    name: '',
    description: '',
    template: ''
  })

  const loadData = async () => {
    try {
      const [workflowsRes, statsRes, templatesRes, executionsRes] = await Promise.all([
        window.api.workflowGetAll(),
        window.api.workflowGetStats(),
        window.api.workflowGetTemplates(),
        window.api.workflowGetExecutions(undefined, 20)
      ])

      if (workflowsRes.success) setWorkflows(workflowsRes.workflows)
      if (statsRes.success) setStats(statsRes.stats)
      if (templatesRes.success) setTemplates(templatesRes.templates)
      if (executionsRes.success) setExecutions(executionsRes.executions)
    } catch (error) {
      console.error('Failed to load workflow data:', error)
    }
  }

  useEffect(() => {
    loadData()
    const interval = setInterval(loadData, 10000)
    return () => clearInterval(interval)
  }, [])

  const handleCreateWorkflow = async () => {
    if (!newWorkflow.name) return

    setLoading(true)
    try {
      let result
      if (newWorkflow.template) {
        result = await window.api.workflowCreateFromTemplate(newWorkflow.template, {
          name: newWorkflow.name,
          description: newWorkflow.description
        })
      } else {
        result = await window.api.workflowCreate({
          name: newWorkflow.name,
          description: newWorkflow.description,
          triggers: [],
          steps: []
        })
      }

      if (result.success) {
        setShowCreateForm(false)
        setNewWorkflow({ name: '', description: '', template: '' })
        await loadData()
      }
    } catch (error) {
      alert(`Failed to create workflow: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleTriggerWorkflow = async (workflowId: string) => {
    setLoading(true)
    try {
      const result = await window.api.workflowTrigger(workflowId, { 
        triggeredBy: 'manual',
        timestamp: new Date().toISOString()
      })
      
      if (result.success) {
        await loadData()
        alert(`Workflow triggered! Execution ID: ${result.executionId}`)
      }
    } catch (error) {
      alert(`Failed to trigger workflow: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running': return <ArrowsClockwise className="h-4 w-4 animate-spin text-blue-500" />
      case 'completed': return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'failed': return <XCircle className="h-4 w-4 text-red-500" />
      case 'cancelled': return <Warning className="h-4 w-4 text-yellow-500" />
      default: return <Clock className="h-4 w-4 text-gray-500" />
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Workflow className="h-5 w-5" />
              Workflow Engine
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setShowCreateForm(!showCreateForm)}
              >
                <Plus className="h-4 w-4 mr-1" />
                Create
              </Button>
              <Button variant="ghost" size="sm" onClick={loadData} disabled={loading}>
                <ArrowsClockwise className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {stats && (
            <div className="grid grid-cols-5 gap-4">
              <div className="text-center p-3 bg-blue-50 dark:bg-blue-950 rounded">
                <Workflow className="h-5 w-5 mx-auto mb-1 text-blue-600" />
                <div className="text-xs text-muted-foreground">Total</div>
                <div className="font-semibold">{stats.totalWorkflows}</div>
              </div>
              
              <div className="text-center p-3 bg-green-50 dark:bg-green-950 rounded">
                <Lightning className="h-5 w-5 mx-auto mb-1 text-green-600" />
                <div className="text-xs text-muted-foreground">Enabled</div>
                <div className="font-semibold">{stats.enabledWorkflows}</div>
              </div>
              
              <div className="text-center p-3 bg-orange-50 dark:bg-orange-950 rounded">
                <ArrowsClockwise className="h-5 w-5 mx-auto mb-1 text-orange-600" />
                <div className="text-xs text-muted-foreground">Running</div>
                <div className="font-semibold">{stats.runningExecutions}</div>
              </div>
              
              <div className="text-center p-3 bg-green-50 dark:bg-green-950 rounded">
                <CheckCircle className="h-5 w-5 mx-auto mb-1 text-green-600" />
                <div className="text-xs text-muted-foreground">Completed</div>
                <div className="font-semibold">{stats.completedExecutions}</div>
              </div>
              
              <div className="text-center p-3 bg-red-50 dark:bg-red-950 rounded">
                <XCircle className="h-5 w-5 mx-auto mb-1 text-red-600" />
                <div className="text-xs text-muted-foreground">Failed</div>
                <div className="font-semibold">{stats.failedExecutions}</div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {showCreateForm && (
        <Card>
          <CardHeader>
            <CardTitle>Create New Workflow</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <select 
              value={newWorkflow.template}
              onChange={(e) => setNewWorkflow({...newWorkflow, template: e.target.value})}
              className="w-full p-2 border rounded"
            >
              <option value="">Custom Workflow</option>
              {Object.entries(templates).map(([key, template]: [string, any]) => (
                <option key={key} value={key}>{template.name}</option>
              ))}
            </select>
            
            <Input
              value={newWorkflow.name}
              onChange={(e) => setNewWorkflow({...newWorkflow, name: e.target.value})}
              placeholder="Workflow name"
            />
            
            <Textarea
              value={newWorkflow.description}
              onChange={(e) => setNewWorkflow({...newWorkflow, description: e.target.value})}
              placeholder="Description"
              rows={2}
            />
            
            <div className="flex gap-2">
              <Button onClick={handleCreateWorkflow} disabled={loading || !newWorkflow.name}>
                Create
              </Button>
              <Button variant="outline" onClick={() => setShowCreateForm(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Workflows</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {workflows.map((workflow) => (
              <div key={workflow.id} className="flex items-center justify-between p-3 border rounded">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium">{workflow.name}</h4>
                    <Badge variant={workflow.enabled ? "default" : "secondary"}>
                      {workflow.enabled ? "Enabled" : "Disabled"}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {workflow.steps?.length || 0} steps
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{workflow.description}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleTriggerWorkflow(workflow.id)}
                    disabled={loading || !workflow.enabled}
                  >
                    <Play className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent Executions</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-48">
            <div className="space-y-2">
              {executions.map((execution) => {
                const workflow = workflows.find(w => w.id === execution.workflowId)
                
                return (
                  <div key={execution.id} className="flex items-center justify-between p-2 border rounded">
                    <div className="flex items-center gap-3">
                      {getStatusIcon(execution.status)}
                      <div>
                        <div className="font-medium text-sm">
                          {workflow?.name || execution.workflowId}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(execution.startTime).toLocaleString()}
                        </div>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {execution.status}
                    </Badge>
                  </div>
                )
              })}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  )
}
