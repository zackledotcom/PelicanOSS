import React, { useState, useRef } from 'react'
import { 
  PaperPlaneTilt, 
  Paperclip, 
  Terminal, 
  Globe, 
  Palette,
  GraduationCap,
  Plus,
  X,
  File,
  Image,
  Code,
  Smiley,
  Upload,
  Share,
  ChartBar,
  FileText,
  Upload as FileUpload,
  Columns,
  Stop,
  Play
} from 'phosphor-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Toggle } from '@/components/ui/toggle'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

interface InputBarProps {
  value: string
  onChange: (value: string) => void
  onSend: (message: string, attachments?: File[]) => void
  onFileUpload?: (files: File[]) => void
  onOpenCanvas?: () => void
  onOpenTerminal?: () => void
  onBrowseWeb?: (query: string) => void
  onExportChat?: (format: 'copy' | 'markdown' | 'file' | 'link') => void
  onOpenTraining?: () => void
  onAnalyzeCsv?: (file: File) => void
  isLoading?: boolean
  placeholder?: string
  devMode?: boolean
  onToggleDevMode?: () => void
  terminalOutput?: string[]
  className?: string
}

interface AttachedFile {
  file: File
  preview?: string
  type: 'image' | 'document' | 'code' | 'csv' | 'other'
  uploadProgress?: number
}

export default function InputBar({
  value,
  onChange,
  onSend,
  onFileUpload,
  onOpenCanvas,
  onOpenTerminal,
  onBrowseWeb,
  onExportChat,
  onOpenTraining,
  onAnalyzeCsv,
  isLoading = false,
  placeholder = "Type a message...",
  devMode = false,
  onToggleDevMode,
  terminalOutput = [],
  className
}: InputBarProps) {
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([])
  const [dragOver, setDragOver] = useState(false)
  const [showTools, setShowTools] = useState(false)
  const [browseQuery, setBrowseQuery] = useState('')
  const [showBrowseDialog, setShowBrowseDialog] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const csvInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleSend = () => {
    if (value.trim() || attachedFiles.length > 0) {
      onSend(value, attachedFiles.map(af => af.file))
      onChange('')
      setAttachedFiles([])
      setShowTools(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
    
    // Slash commands
    if (e.key === '/' && value === '') {
      e.preventDefault()
      setShowTools(true)
    }

    // Quick shortcuts
    if (e.ctrlKey || e.metaKey) {
      switch (e.key) {
        case 'u':
          e.preventDefault()
          fileInputRef.current?.click()
          break
        case 'b':
          e.preventDefault()
          setShowBrowseDialog(true)
          break
        case '`':
          e.preventDefault()
          onOpenTerminal?.()
          break
      }
    }
  }

  const handleFileSelect = (files: FileList | File[]) => {
    const fileArray = Array.from(files)
    
    fileArray.forEach(file => {
      const attached: AttachedFile = {
        file,
        type: getFileType(file),
        uploadProgress: 0
      }

      // Handle CSV files specially
      if (attached.type === 'csv' && onAnalyzeCsv) {
        onAnalyzeCsv(file)
        return
      }

      // Generate preview for images
      if (attached.type === 'image') {
        const reader = new FileReader()
        reader.onload = (e) => {
          attached.preview = e.target?.result as string
          setAttachedFiles(prev => [...prev, attached])
        }
        reader.readAsDataURL(file)
      } else {
        setAttachedFiles(prev => [...prev, attached])
      }
    })

    // Call upload handler
    if (onFileUpload) {
      onFileUpload(fileArray)
    }
  }

  const getFileType = (file: File): AttachedFile['type'] => {
    if (file.type.includes('csv') || file.name.endsWith('.csv')) return 'csv'
    if (file.type.startsWith('image/')) return 'image'
    if (file.type.includes('text/') || file.name.match(/\.(js|ts|py|html|css|json|md)$/)) return 'code'
    if (file.type.includes('document') || file.name.match(/\.(pdf|doc|docx|txt)$/)) return 'document'
    return 'other'
  }

  const removeFile = (index: number) => {
    setAttachedFiles(prev => prev.filter((_, i) => i !== index))
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    if (e.dataTransfer.files) {
      handleFileSelect(e.dataTransfer.files)
    }
  }

  const handleBrowseSubmit = () => {
    if (browseQuery.trim() && onBrowseWeb) {
      onBrowseWeb(browseQuery)
      setBrowseQuery('')
      setShowBrowseDialog(false)
    }
  }

  const getFileIcon = (type: AttachedFile['type']) => {
    switch (type) {
      case 'image': return <Image className="w-4 h-4" />
      case 'code': return <Code className="w-4 h-4" />
      case 'csv': return <FileCsv className="w-4 h-4" />
      case 'document': return <File className="w-4 h-4" />
      default: return <File className="w-4 h-4" />
    }
  }

  const getFileTypeColor = (type: AttachedFile['type']) => {
    switch (type) {
      case 'image': return 'bg-blue-500'
      case 'code': return 'bg-green-500'
      case 'csv': return 'bg-orange-500'
      case 'document': return 'bg-purple-500'
      default: return 'bg-gray-500'
    }
  }

  const formatFileSize = (bytes: number) => {
    const sizes = ['B', 'KB', 'MB', 'GB']
    if (bytes === 0) return '0 B'
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i]
  }

  const tools = [
    {
      icon: <Paperclip className="w-4 h-4" />,
      label: "Attach files",
      shortcut: "Ctrl+U",
      onClick: () => fileInputRef.current?.click(),
      color: "hover:bg-blue-500/10 hover:text-blue-600",
      description: "Upload documents, images, code files"
    },
    {
      icon: <FileCsv className="w-4 h-4" />,
      label: "Analyze CSV",
      shortcut: "/csv",
      onClick: () => csvInputRef.current?.click(),
      color: "hover:bg-orange-500/10 hover:text-orange-600",
      description: "Upload CSV for data analysis"
    },
    {
      icon: <PaintBrush className="w-4 h-4" />,
      label: "Canvas",
      shortcut: "/canvas",
      onClick: onOpenCanvas,
      color: "hover:bg-purple-500/10 hover:text-purple-600",
      disabled: !onOpenCanvas,
      description: "Open development canvas"
    },
    {
      icon: <Terminal className="w-4 h-4" />,
      label: "Terminal",
      shortcut: "Ctrl+`",
      onClick: onOpenTerminal,
      color: "hover:bg-green-500/10 hover:text-green-600",
      disabled: !onOpenTerminal,
      description: "Open terminal/shell"
    },
    {
      icon: <Globe className="w-4 h-4" />,
      label: "Browse Web",
      shortcut: "Ctrl+B",
      onClick: () => setShowBrowseDialog(true),
      color: "hover:bg-cyan-500/10 hover:text-cyan-600",
      disabled: !onBrowseWeb,
      description: "Search and browse the internet"
    },
    {
      icon: <GraduationCap className="w-4 h-4" />,
      label: "Train Model",
      shortcut: "/train",
      onClick: onOpenTraining,
      color: "hover:bg-pink-500/10 hover:text-pink-600",
      disabled: !onOpenTraining,
      description: "Train or tune AI model"
    }
  ]

  return (
    <div className={cn("relative space-y-3", className)}>
      {/* Development Mode Panel */}
      {devMode && (
        <Card className="border-dashed border-primary/50">
          <CardContent className="p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <SplitHorizontal className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium">Development Mode</span>
                <Badge variant="outline" className="text-xs">Active</Badge>
              </div>
              <div className="flex gap-1">
                <Button size="sm" variant="outline" onClick={onOpenCanvas} className="h-6 px-2">
                  <PaintBrush className="w-3 h-3 mr-1" />
                  Canvas
                </Button>
                <Button size="sm" variant="outline" onClick={onOpenTerminal} className="h-6 px-2">
                  <Terminal className="w-3 h-3 mr-1" />
                  Terminal
                </Button>
                {onToggleDevMode && (
                  <Button size="sm" variant="ghost" onClick={onToggleDevMode} className="h-6 w-6 p-0">
                    <X className="w-3 h-3" />
                  </Button>
                )}
              </div>
            </div>
            
            {/* Terminal Output Preview */}
            {terminalOutput.length > 0 && (
              <div className="bg-black/90 text-green-400 p-2 rounded font-mono text-xs max-h-20 overflow-auto">
                {terminalOutput.slice(-3).map((line, i) => (
                  <div key={i}>{line}</div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* File attachments preview */}
      {attachedFiles.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="text-xs font-medium text-muted-foreground">
              Attachments ({attachedFiles.length})
            </div>
            <Button 
              size="sm" 
              variant="ghost" 
              onClick={() => setAttachedFiles([])}
              className="h-5 px-2 text-xs"
            >
              Clear all
            </Button>
          </div>
          <ScrollArea className="max-h-32">
            <div className="space-y-2">
              {attachedFiles.map((attachment, index) => (
                <Card key={index} className="p-2">
                  <div className="flex items-center gap-3">
                    {attachment.preview ? (
                      <img 
                        src={attachment.preview} 
                        alt={attachment.file.name}
                        className="w-10 h-10 object-cover rounded border"
                      />
                    ) : (
                      <div className={cn(
                        "w-10 h-10 rounded border flex items-center justify-center text-white",
                        getFileTypeColor(attachment.type)
                      )}>
                        {getFileIcon(attachment.type)}
                      </div>
                    )}
                    
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{attachment.file.name}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{formatFileSize(attachment.file.size)}</span>
                        <Badge variant="outline" className="text-xs capitalize">
                          {attachment.type}
                        </Badge>
                      </div>
                      {attachment.uploadProgress !== undefined && attachment.uploadProgress < 100 && (
                        <Progress value={attachment.uploadProgress} className="h-1 mt-1" />
                      )}
                    </div>
                    
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => removeFile(index)}
                      className="h-6 w-6 p-0 hover:bg-destructive/10 hover:text-destructive"
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}

      {/* Main input area */}
      <Card className={cn(
        "transition-all duration-200",
        dragOver && "border-primary bg-primary/5",
        "focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2"
      )}>
        <CardContent 
          className="p-3"
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {/* Tools bar */}
          {showTools && (
            <div className="mb-3 pb-3 border-b">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {tools.map((tool, index) => (
                  <Button
                    key={index}
                    size="sm"
                    variant="ghost"
                    className={cn(
                      "justify-start gap-2 h-auto p-2",
                      tool.color,
                      tool.disabled && "opacity-50 cursor-not-allowed"
                    )}
                    onClick={tool.onClick}
                    disabled={tool.disabled}
                  >
                    <div className="flex items-center gap-2 flex-1">
                      {tool.icon}
                      <div className="text-left">
                        <div className="text-sm font-medium">{tool.label}</div>
                        <div className="text-xs text-muted-foreground">{tool.description}</div>
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground ml-auto">
                      {tool.shortcut}
                    </span>
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Input area */}
          <div className="flex gap-2 items-end">
            {/* Tools toggle */}
            <Toggle
              pressed={showTools}
              onPressedChange={setShowTools}
              size="sm"
              className="h-8 w-8 p-0"
              title="Toggle tools"
            >
              {showTools ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            </Toggle>

            {/* Text input */}
            <div className="flex-1 relative">
              <Textarea
                ref={textareaRef}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={dragOver ? "Drop files here..." : placeholder}
                className="min-h-[40px] max-h-[120px] resize-none border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
                disabled={isLoading}
              />
              
              {/* Typing indicators */}
              {value.length > 0 && (
                <div className="absolute bottom-1 right-1 text-xs text-muted-foreground">
                  {value.length}
                </div>
              )}
            </div>

            {/* Quick actions */}
            <div className="flex gap-1">
              {/* Dev mode toggle */}
              {onToggleDevMode && (
                <Toggle
                  pressed={devMode}
                  onPressedChange={onToggleDevMode}
                  size="sm"
                  className="h-8 w-8 p-0"
                  title="Toggle dev mode"
                >
                  <SplitHorizontal className="w-4 h-4" />
                </Toggle>
              )}

              {/* Export/Share menu */}
              {onExportChat && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0" title="Export/Share">
                      <ShareNetwork className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onExportChat('copy')}>
                      <Paperclip className="w-4 h-4 mr-2" />
                      Copy chat
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onExportChat('markdown')}>
                      <Code className="w-4 h-4 mr-2" />
                      Export markdown
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onExportChat('file')}>
                      <FileArrowUp className="w-4 h-4 mr-2" />
                      Save file
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => onExportChat('link')}>
                      <ShareNetwork className="w-4 h-4 mr-2" />
                      Share link
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}

              {/* Emoji picker */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button size="sm" variant="ghost" className="h-8 w-8 p-0" title="Add emoji">
                    <Smiley className="w-4 h-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-fit p-2">
                  <div className="grid grid-cols-8 gap-1">
                    {['😀', '😂', '😍', '🤔', '👍', '👎', '❤️', '🔥', '💯', '🎉', '😭', '😱', '🤯', '🙄', '😴', '🤖'].map((emoji) => (
                      <Button
                        key={emoji}
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 hover:bg-muted"
                        onClick={() => onChange(value + emoji)}
                      >
                        <span className="text-base">{emoji}</span>
                      </Button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>

              {/* Send button */}
              <Button
                size="sm"
                onClick={handleSend}
                disabled={isLoading || (!value.trim() && attachedFiles.length === 0)}
                className={cn(
                  "h-8 w-8 p-0 transition-all",
                  (value.trim() || attachedFiles.length > 0) 
                    ? "bg-primary hover:bg-primary/90" 
                    : "bg-muted text-muted-foreground"
                )}
                title="Send message (Enter)"
              >
                <PaperPlaneTilt weight="fill" className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Status bar */}
          <div className="flex items-center justify-between text-xs text-muted-foreground mt-2 pt-2 border-t">
            <div className="flex items-center gap-4">
              <span>Press / for tools</span>
              {attachedFiles.length > 0 && (
                <span>{attachedFiles.length} file{attachedFiles.length !== 1 ? 's' : ''}</span>
              )}
              {devMode && <Badge variant="outline" className="text-xs">Dev Mode</Badge>}
            </div>
            
            <div className="flex items-center gap-2">
              {isLoading && (
                <div className="flex items-center gap-1">
                  <div className="w-1 h-1 bg-current rounded-full animate-bounce"></div>
                  <div className="w-1 h-1 bg-current rounded-full animate-bounce [animation-delay:0.1s]"></div>
                  <div className="w-1 h-1 bg-current rounded-full animate-bounce [animation-delay:0.2s]"></div>
                  <span>Sending...</span>
                </div>
              )}
              <span>Shift+Enter for new line</span>
            </div>
          </div>

          {/* Drag overlay */}
          {dragOver && (
            <div className="absolute inset-0 bg-primary/10 border-2 border-dashed border-primary rounded-lg flex items-center justify-center">
              <div className="text-center">
                <Upload className="w-8 h-8 mx-auto mb-2 text-primary" />
                <p className="text-primary font-medium">Drop files to attach</p>
                <p className="text-xs text-muted-foreground">Images, documents, CSV, and code files supported</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Browse Web Dialog */}
      <Dialog open={showBrowseDialog} onOpenChange={setShowBrowseDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Globe className="w-5 h-5" />
              Browse the Web
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Input
                value={browseQuery}
                onChange={(e) => setBrowseQuery(e.target.value)}
                placeholder="Enter search query or URL..."
                onKeyDown={(e) => e.key === 'Enter' && handleBrowseSubmit()}
                autoFocus
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowBrowseDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleBrowseSubmit} disabled={!browseQuery.trim()}>
                <Globe className="w-4 h-4 mr-2" />
                Browse
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => e.target.files && handleFileSelect(e.target.files)}
        accept="*/*"
      />
      
      <input
        ref={csvInputRef}
        type="file"
        className="hidden"
        onChange={(e) => e.target.files && handleFileSelect(e.target.files)}
        accept=".csv,text/csv"
      />
    </div>
  )
}