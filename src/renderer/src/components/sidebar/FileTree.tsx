import React, { useState } from 'react'
import { 
  Folder, 
  File, 
  CaretRight, 
  CaretDown, 
  Upload, 
  Plus,
  MagnifyingGlass,
  DotsThree
} from 'phosphor-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'

interface FileNode {
  id: string
  name: string
  type: 'file' | 'directory'
  size?: number
  modified?: Date
  children?: FileNode[]
  expanded?: boolean
}

interface FileTreeProps {
  files: FileNode[]
  onFileSelect: (file: FileNode) => void
  onFileUpload?: (files: FileList) => void
  onCreateFile?: (path: string, name: string) => void
  selectedFile?: string
  className?: string
}

export default function FileTree({
  files,
  onFileSelect,
  onFileUpload,
  onCreateFile,
  selectedFile,
  className
}: FileTreeProps) {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set())
  const [searchTerm, setSearchTerm] = useState('')
  const [dragOver, setDragOver] = useState(false)

  const toggleExpanded = (nodeId: string) => {
    const newExpanded = new Set(expandedNodes)
    if (newExpanded.has(nodeId)) {
      newExpanded.delete(nodeId)
    } else {
      newExpanded.add(nodeId)
    }
    setExpandedNodes(newExpanded)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    if (e.dataTransfer.files && onFileUpload) {
      onFileUpload(e.dataTransfer.files)
    }
  }

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return ''
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i]
  }

  const FileTreeNode = ({ node, depth = 0 }: { node: FileNode; depth?: number }) => {
    const isExpanded = expandedNodes.has(node.id)
    const isSelected = selectedFile === node.id
    const hasChildren = node.children && node.children.length > 0

    const filteredChildren = node.children?.filter(child =>
      child.name.toLowerCase().includes(searchTerm.toLowerCase())
    )

    return (
      <div>
        <div
          className={cn(
            "flex items-center gap-1 px-2 py-1 rounded-md cursor-pointer transition-colors",
            "hover:bg-muted/50",
            isSelected && "bg-muted",
            depth > 0 && "ml-4"
          )}
          onClick={() => {
            if (node.type === 'directory') {
              toggleExpanded(node.id)
            }
            onFileSelect(node)
          }}
        >
          {/* Expand/collapse icon */}
          {node.type === 'directory' ? (
            <div className="w-4 h-4 flex items-center justify-center">
              {hasChildren && (
                isExpanded ? (
                  <CaretDown className="w-3 h-3" />
                ) : (
                  <CaretRight className="w-3 h-3" />
                )
              )}
            </div>
          ) : (
            <div className="w-4" />
          )}

          {/* File/folder icon */}
          <div className="w-4 h-4 flex items-center justify-center">
            {node.type === 'directory' ? (
              <Folder className="w-4 h-4 text-blue-500" />
            ) : (
              <File className="w-4 h-4 text-muted-foreground" />
            )}
          </div>

          {/* Name and details */}
          <div className="flex-1 min-w-0">
            <span className="text-sm truncate block">{node.name}</span>
            {node.type === 'file' && (
              <div className="text-xs text-muted-foreground">
                {formatFileSize(node.size)}
                {node.modified && (
                  <span className="ml-2">
                    {node.modified.toLocaleDateString()}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Actions */}
          <Button
            size="sm"
            variant="ghost"
            className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
            onClick={(e) => {
              e.stopPropagation()
              // Handle file actions
            }}
          >
            <DotsThree className="w-3 h-3" />
          </Button>
        </div>

        {/* Children */}
        {node.type === 'directory' && isExpanded && filteredChildren && (
          <div className="ml-2">
            {filteredChildren.map((child) => (
              <FileTreeNode key={child.id} node={child} depth={depth + 1} />
            ))}
          </div>
        )}
      </div>
    )
  }

  const filteredFiles = files.filter(file =>
    file.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <Card 
      className={cn("w-80 h-96", className)}
      onDragOver={(e) => {
        e.preventDefault()
        setDragOver(true)
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Folder className="w-4 h-4" />
            File Explorer
          </CardTitle>
          <div className="flex gap-1">
            {onCreateFile && (
              <Button
                size="sm"
                variant="ghost"
                className="h-6 w-6 p-0"
                title="New file"
              >
                <Plus className="w-3 h-3" />
              </Button>
            )}
            {onFileUpload && (
              <Button
                size="sm"
                variant="ghost"
                className="h-6 w-6 p-0"
                title="Upload files"
              >
                <Upload className="w-3 h-3" />
              </Button>
            )}
          </div>
        </div>
        
        {/* Search */}
        <div className="relative">
          <MagnifyingGlass className="absolute left-2 top-1/2 transform -translate-y-1/2 w-3 h-3 text-muted-foreground" />
          <Input
            placeholder="Search files..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-7 h-7 text-xs"
          />
        </div>
      </CardHeader>
      
      <CardContent className="p-0">
        <ScrollArea className="h-80 px-3">
          <div className="space-y-1">
            {filteredFiles.map((file) => (
              <FileTreeNode key={file.id} node={file} />
            ))}
          </div>
        </ScrollArea>

        {/* Drop zone overlay */}
        {dragOver && (
          <div className="absolute inset-0 bg-blue-500/20 border-2 border-dashed border-blue-400 rounded-lg flex items-center justify-center">
            <div className="text-center">
              <Upload className="w-8 h-8 mx-auto mb-2 text-blue-400" />
              <p className="text-blue-400 font-medium">Drop files here</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}