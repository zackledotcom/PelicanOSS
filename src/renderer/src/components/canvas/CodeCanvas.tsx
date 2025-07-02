import React, { useState, useRef, useEffect } from 'react'
import { 
  Code,
  Play,
  Copy,
  Download,
  Pencil,
  Check,
  X,
  ArrowsOut,
  ArrowsIn,
  Bug,
  Sparkle,
  FileText,
  Folder,
  Eye,
  EyeSlash,
  Export,
  Share
} from 'phosphor-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import { useToast } from '@/components/ui/toast'

interface CodeCanvasProps {
  content: string
  language: string
  title?: string
  fileName?: string
  onContentChange?: (content: string) => void
  onClose?: () => void
  onSuggestImprovements?: (content: string) => void
  onExecute?: (content: string, language: string) => void
  className?: string
  isFullscreen?: boolean
  onToggleFullscreen?: () => void
}

const CodeCanvas: React.FC<CodeCanvasProps> = ({
  content,
  language,
  title = 'Code Canvas',
  fileName,
  onContentChange,
  onClose,
  onSuggestImprovements,
  onExecute,
  className = '',
  isFullscreen = false,
  onToggleFullscreen
}) => {
  const [editMode, setEditMode] = useState(false)
  const [localContent, setLocalContent] = useState(content)
  const [showLineNumbers, setShowLineNumbers] = useState(true)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const { addToast } = useToast()

  useEffect(() => {
    setLocalContent(content)
  }, [content])

  const handleSave = () => {
    onContentChange?.(localContent)
    setEditMode(false)
    addToast({
      type: 'success',
      title: 'Changes Saved',
      description: 'Your code has been updated',
      duration: 2000
    })
  }

  const handleCancel = () => {
    setLocalContent(content)
    setEditMode(false)
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(localContent)
      addToast({
        type: 'success',
        title: 'Copied to Clipboard',
        description: 'Code copied successfully',
        duration: 2000
      })
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Copy Failed',
        description: 'Could not copy to clipboard',
        duration: 3000
      })
    }
  }

  const handleDownload = () => {
    const blob = new Blob([localContent], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = fileName || `code.${language}`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    
    addToast({
      type: 'success',
      title: 'Download Started',
      description: `Downloading ${fileName || `code.${language}`}`,
      duration: 2000
    })
  }

  const handleExport = () => {
    // Create a dropdown-like behavior by showing toast with options
    addToast({
      type: 'info',
      title: 'Export Options',
      description: 'Choose format: .tsx, .txt, or .zip',
      duration: 5000
    })

    // For now, we'll implement the basic export functionality
    // This could be expanded to show a proper dropdown in the future
    const fileExtension = language === 'typescript' || language === 'tsx' ? 'tsx' : 
                         language === 'javascript' || language === 'jsx' ? 'jsx' :
                         language === 'python' ? 'py' :
                         language === 'html' ? 'html' :
                         language === 'css' ? 'css' : 'txt'
    
    const blob = new Blob([localContent], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${fileName?.split('.')[0] || 'code'}.${fileExtension}`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const handleShare = async () => {
    if (navigator.share) {
      try {
        // Create a file to share
        const file = new File([localContent], fileName || `code.${language}`, {
          type: 'text/plain'
        })
        
        await navigator.share({
          title: title || 'Code from PelicanOS',
          text: `Check out this ${language} code:`,
          files: [file]
        })
        
        addToast({
          type: 'success',
          title: 'Shared Successfully',
          description: 'Code shared via system dialog',
          duration: 2000
        })
      } catch (error) {
        if (error instanceof Error && error.name !== 'AbortError') {
          // Fallback to clipboard if sharing fails
          await handleCopy()
          addToast({
            type: 'info',
            title: 'Share Not Available',
            description: 'Code copied to clipboard instead',
            duration: 3000
          })
        }
      }
    } else {
      // Fallback for browsers that don't support Web Share API
      await handleCopy()
      addToast({
        type: 'info',
        title: 'Share Not Available',
        description: 'Code copied to clipboard',
        duration: 3000
      })
    }
  }

  const handleExecute = () => {
    onExecute?.(localContent, language)
    addToast({
      type: 'info',
      title: 'Executing Code',
      description: 'Running your code...',
      duration: 2000
    })
  }

  const handleSuggestImprovements = () => {
    onSuggestImprovements?.(localContent)
    addToast({
      type: 'info',
      title: 'Analyzing Code',
      description: 'Getting improvement suggestions...',
      duration: 2000
    })
  }

  const getLanguageIcon = (lang: string) => {
    switch (lang.toLowerCase()) {
      case 'javascript':
      case 'js':
        return '🟨'
      case 'typescript':
      case 'ts':
        return '🔷'
      case 'python':
      case 'py':
        return '🐍'
      case 'react':
      case 'jsx':
      case 'tsx':
        return '⚛️'
      case 'html':
        return '🌐'
      case 'css':
        return '🎨'
      case 'json':
        return '📄'
      default:
        return '📝'
    }
  }

  const lines = localContent.split('\n')
  const maxLineNumber = lines.length
  const lineNumberWidth = maxLineNumber.toString().length

  return (
    <div className={cn(
      "flex flex-col bg-white border border-gray-200 rounded-lg shadow-lg",
      isFullscreen ? "fixed inset-0 z-50 rounded-none" : "h-full",
      className
    )}>
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center gap-3">
          <span className="text-lg">{getLanguageIcon(language)}</span>
          <div>
            <h3 className="font-semibold text-gray-900 text-sm">{title}</h3>
            {fileName && (
              <p className="text-xs text-gray-500">{fileName}</p>
            )}
          </div>
          <Badge variant="secondary" className="text-xs">
            {language}
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          {/* View Options */}
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setShowLineNumbers(!showLineNumbers)}
            className="h-7 w-7 p-0"
          >
            {showLineNumbers ? <Eye size={14} /> : <EyeSlash size={14} />}
          </Button>

          {/* Edit Mode Toggle */}
          {!editMode ? (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setEditMode(true)}
              className="h-7 w-7 p-0"
            >
              <Pencil size={14} />
            </Button>
          ) : (
            <div className="flex gap-1">
              <Button
                size="sm"
                variant="ghost"
                onClick={handleSave}
                className="h-7 w-7 p-0 text-green-600 hover:text-green-700"
              >
                <Check size={14} />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleCancel}
                className="h-7 w-7 p-0 text-red-600 hover:text-red-700"
              >
                <X size={14} />
              </Button>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-1 border-l pl-2 ml-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={handleCopy}
              className="h-7 w-7 p-0"
            >
              <Copy size={14} />
            </Button>
            
            <Button
              size="sm"
              variant="ghost"
              onClick={handleDownload}
              className="h-7 w-7 p-0"
            >
              <Download size={14} />
            </Button>

            {/* Export and Share Controls */}
            <Button
              size="sm"
              variant="ghost"
              onClick={handleExport}
              className="h-7 w-7 p-0 text-blue-600 hover:text-blue-700"
              title="Export as .tsx, .txt, or zip file"
            >
              <Export size={14} />
            </Button>

            <Button
              size="sm"
              variant="ghost"
              onClick={handleShare}
              className="h-7 w-7 p-0 text-green-600 hover:text-green-700"
              title="Share via system dialog"
            >
              <Share size={14} />
            </Button>

            {onExecute && (
              <Button
                size="sm"
                variant="ghost"
                onClick={handleExecute}
                className="h-7 w-7 p-0 text-green-600 hover:text-green-700"
              >
                <Play size={14} />
              </Button>
            )}

            {onSuggestImprovements && (
              <Button
                size="sm"
                variant="ghost"
                onClick={handleSuggestImprovements}
                className="h-7 w-7 p-0 text-purple-600 hover:text-purple-700"
              >
                <Sparkle size={14} />
              </Button>
            )}

            {onToggleFullscreen && (
              <Button
                size="sm"
                variant="ghost"
                onClick={onToggleFullscreen}
                className="h-7 w-7 p-0"
              >
                {isFullscreen ? <ArrowsIn size={14} /> : <ArrowsOut size={14} />}
              </Button>
            )}

            {onClose && (
              <Button
                size="sm"
                variant="ghost"
                onClick={onClose}
                className="h-7 w-7 p-0 text-gray-400 hover:text-gray-600"
              >
                <X size={14} />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Code Content */}
      <div className="flex-1 relative">
        {editMode ? (
          <div className="h-full flex">
            {showLineNumbers && (
              <div className="bg-gray-50 border-r border-gray-200 p-2 select-none">
                <div className="font-mono text-xs text-gray-400 leading-6">
                  {lines.map((_, index) => (
                    <div key={index} className="text-right" style={{ width: `${lineNumberWidth}ch` }}>
                      {index + 1}
                    </div>
                  ))}
                </div>
              </div>
            )}
            <Textarea
              ref={textareaRef}
              value={localContent}
              onChange={(e) => setLocalContent(e.target.value)}
              className="flex-1 font-mono text-sm border-0 rounded-none resize-none focus:ring-0 leading-6"
              style={{ minHeight: '100%' }}
              placeholder="Start coding..."
              autoFocus
            />
          </div>
        ) : (
          <ScrollArea className="h-full">
            <div className="flex">
              {showLineNumbers && (
                <div className="bg-gray-50 border-r border-gray-200 p-2 select-none sticky left-0">
                  <div className="font-mono text-xs text-gray-400 leading-6">
                    {lines.map((_, index) => (
                      <div key={index} className="text-right" style={{ width: `${lineNumberWidth}ch` }}>
                        {index + 1}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex-1 p-4">
                <pre className="font-mono text-sm leading-6 whitespace-pre-wrap break-all">
                  <code>{localContent}</code>
                </pre>
              </div>
            </div>
          </ScrollArea>
        )}
      </div>

      {/* Footer Status */}
      <div className="flex items-center justify-between p-2 border-t border-gray-200 bg-gray-50 text-xs text-gray-500">
        <div className="flex items-center gap-4">
          <span>{lines.length} lines</span>
          <span>{localContent.length} characters</span>
          <span>Language: {language}</span>
        </div>
        {editMode && (
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              Editing
            </Badge>
          </div>
        )}
      </div>
    </div>
  )
}

export default CodeCanvas