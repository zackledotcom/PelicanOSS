import React, { useState, useEffect } from 'react'
import { 
  ChartBar, 
  Cpu, 
  Lightning, 
  Activity, 
  Warning,
  TrendUp,
  Clock
} from 'phosphor-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'

interface PerformancePanelProps {
  className?: string
}

/**
 * TODO: PerformancePanel - Scaffolded Component
 * 
 * This component is planned for Phase 2+ implementation.
 * Current state: UI shell with mock graphs and no live GPU integration
 * 
 * Planned Features:
 * - Real-time CPU/Memory/GPU usage graphs
 * - Performance history and trends
 * - GPU utilization and VRAM monitoring
 * - Model inference performance metrics
 * - Bottleneck detection and recommendations
 * - Performance optimization suggestions
 */
const PerformancePanel: React.FC<PerformancePanelProps> = ({ className }) => {
  const [mockMetrics, setMockMetrics] = useState({
    cpu: Array.from({ length: 20 }, () => Math.random() * 100),
    memory: Array.from({ length: 20 }, () => Math.random() * 80 + 20),
    gpu: Array.from({ length: 20 }, () => Math.random() * 60),
    inference: Array.from({ length: 10 }, () => Math.random() * 500 + 100)
  })

  // Simulate real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      setMockMetrics(prev => ({
        cpu: [...prev.cpu.slice(1), Math.random() * 100],
        memory: [...prev.memory.slice(1), Math.random() * 80 + 20],
        gpu: [...prev.gpu.slice(1), Math.random() * 60],
        inference: [...prev.inference.slice(1), Math.random() * 500 + 100]
      }))
    }, 2000)

    return () => clearInterval(interval)
  }, [])

  const MockChart: React.FC<{ 
    data: number[]
    color: string
    label: string
    unit: string
  }> = ({ data, color, label, unit }) => (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <span className="text-sm font-medium">{label}</span>
        <span className="text-xs text-muted-foreground">
          {data[data.length - 1]?.toFixed(1)} {unit}
        </span>
      </div>
      <div className="h-24 bg-muted/50 rounded-lg p-2 relative overflow-hidden">
        {/* Mock Chart Visualization */}
        <div className="flex items-end justify-between h-full">
          {data.slice(-10).map((value, index) => (
            <div
              key={index}
              className={`w-2 ${color} rounded-t transition-all duration-300`}
              style={{ height: `${(value / 100) * 100}%` }}
            />
          ))}
        </div>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xs text-muted-foreground bg-background/80 px-2 py-1 rounded">
            Mock Chart
          </span>
        </div>
      </div>
    </div>
  )

  return (
    <div className={className}>
      <div className="p-4 bg-muted/30 rounded-lg border border-border">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <ChartBar size={16} className="text-primary" />
            <span className="font-medium text-sm">Performance Panel</span>
          </div>
          
          <div className="flex items-center space-x-2">
            <Badge variant="outline" className="bg-purple-50 text-purple-700 text-xs">
              TODO: GPU Integration
            </Badge>
            <Badge variant="secondary" className="text-xs">Pending</Badge>
          </div>
        </div>

        {/* Warning Notice */}
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
          <div className="flex items-start space-x-2">
            <Warning size={16} className="text-yellow-600 mt-0.5" />
            <div>
              <p className="text-sm text-yellow-800">
                <strong>Mock Performance Data:</strong> This panel shows placeholder graphs. 
                Real GPU monitoring and performance analytics will be implemented in Phase 2+.
              </p>
            </div>
          </div>
        </div>

        <Tabs defaultValue="realtime" className="space-y-3">
          <TabsList className="grid w-full grid-cols-3 h-8">
            <TabsTrigger value="realtime" className="text-xs">Real-time</TabsTrigger>
            <TabsTrigger value="history" className="text-xs">History</TabsTrigger>
            <TabsTrigger value="inference" className="text-xs">Inference</TabsTrigger>
          </TabsList>

          {/* Real-time Metrics */}
          <TabsContent value="realtime" className="space-y-3">
            <div className="grid grid-cols-1 gap-3">
              <MockChart
                data={mockMetrics.cpu}
                color="bg-blue-500"
                label="CPU Usage"
                unit="%"
              />
              
              <MockChart
                data={mockMetrics.memory}
                color="bg-green-500"
                label="Memory Usage"
                unit="%"
              />
              
              <MockChart
                data={mockMetrics.gpu}
                color="bg-purple-500"
                label="GPU VRAM (Planned)"
                unit="%"
              />
            </div>

            {/* Current Stats */}
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="p-2 bg-background rounded text-center">
                <div className="flex items-center justify-center space-x-1">
                  <Cpu size={12} />
                  <span>CPU</span>
                </div>
                <div className="font-medium">
                  {mockMetrics.cpu[mockMetrics.cpu.length - 1]?.toFixed(0)}%
                </div>
              </div>
              
              <div className="p-2 bg-background rounded text-center">
                <div className="flex items-center justify-center space-x-1">
                  <Activity size={12} />
                  <span>RAM</span>
                </div>
                <div className="font-medium">
                  {mockMetrics.memory[mockMetrics.memory.length - 1]?.toFixed(0)}%
                </div>
              </div>
              
              <div className="p-2 bg-background rounded text-center">
                <div className="flex items-center justify-center space-x-1">
                  <Lightning size={12} />
                  <span>GPU</span>
                </div>
                <div className="font-medium">
                  {mockMetrics.gpu[mockMetrics.gpu.length - 1]?.toFixed(0)}%
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Performance History */}
          <TabsContent value="history" className="space-y-3">
            <div className="text-center py-6">
              <TrendUp size={32} className="mx-auto text-muted-foreground/50 mb-2" />
              <p className="text-sm text-muted-foreground">Performance History</p>
              <p className="text-xs text-muted-foreground mt-1">
                TODO: 24h/7d/30d performance trends
              </p>
            </div>
            
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2 bg-background rounded">
                <div className="text-muted-foreground">Avg CPU (24h)</div>
                <div className="font-medium">23.4%</div>
              </div>
              <div className="p-2 bg-background rounded">
                <div className="text-muted-foreground">Peak Memory</div>
                <div className="font-medium">78.2%</div>
              </div>
              <div className="p-2 bg-background rounded">
                <div className="text-muted-foreground">GPU Utilization</div>
                <div className="font-medium">--</div>
              </div>
              <div className="p-2 bg-background rounded">
                <div className="text-muted-foreground">Efficiency Score</div>
                <div className="font-medium">B+</div>
              </div>
            </div>
          </TabsContent>

          {/* Model Inference Performance */}
          <TabsContent value="inference" className="space-y-3">
            <div className="space-y-2">
              <div className="flex justify-between items-center text-sm">
                <span>Inference Speed</span>
                <span>{mockMetrics.inference[mockMetrics.inference.length - 1]?.toFixed(0)}ms</span>
              </div>
              
              <div className="h-16 bg-muted/50 rounded p-2 relative">
                <div className="flex items-end justify-between h-full">
                  {mockMetrics.inference.slice(-8).map((value, index) => (
                    <div
                      key={index}
                      className="w-2 bg-orange-500 rounded-t"
                      style={{ height: `${Math.min((value / 600) * 100, 100)}%` }}
                    />
                  ))}
                </div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xs text-muted-foreground bg-background/80 px-2 py-1 rounded">
                    Inference Latency
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2 bg-background rounded">
                <div className="text-muted-foreground">Tokens/sec</div>
                <div className="font-medium">24.3</div>
              </div>
              <div className="p-2 bg-background rounded">
                <div className="text-muted-foreground">Model Load</div>
                <div className="font-medium">636MB</div>
              </div>
            </div>

            <div className="p-2 bg-muted rounded text-xs">
              <p className="text-muted-foreground">
                💡 <strong>Planned:</strong> Real-time token generation metrics, 
                model efficiency scoring, and optimization recommendations.
              </p>
            </div>
          </TabsContent>
        </Tabs>

        {/* Quick Actions */}
        <div className="flex space-x-2 mt-3 pt-3 border-t border-border">
          <Button variant="outline" size="sm" className="flex-1 text-xs" disabled>
            <Clock size={12} className="mr-1" />
            Export Report
          </Button>
          <Button variant="outline" size="sm" className="flex-1 text-xs" disabled>
            <TrendUp size={12} className="mr-1" />
            Optimize
          </Button>
        </div>
      </div>
    </div>
  )
}

export default PerformancePanel
