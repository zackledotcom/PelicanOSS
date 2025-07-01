import React, { useState } from 'react'
import { 
  Copy,
  Check,
  Code,
  Pencil,
  Trash,
  User,
  Robot,
  WarningCircle
} from 'phosphor-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { Message } from '../../../../../types/chat'
import { useToast } from '@/components/ui/toast'

interface MessageComponentProps {
  message: Message
  onOpenCanvas?: (content: string, language: string, title: string) => void
  onEditMessage?: (id: string, content: string) => void
  onDeleteMessage?: (id: string) => void
  className?: string
}

const MessageComponent: React.FC<MessageComponentProps> = ({
  message,
  onOpenCanvas,
  onEditMessage,
  onDeleteMessage,
  className
}) => {
  const [copied, setCopied] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editContent, setEditContent] = useState(message.content)
  const { addToast } = useToast()

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
      addToast({
        type: 'success',
        title: 'Copied',
        description: 'Message copied to clipboard',
        duration: 2000
      })
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Copy Failed',
        description: 'Could not copy message',
        duration: 3000
      })
    }
  }

  const handleEdit = () => {
    if (isEditing) {
      onEditMessage?.(message.id, editContent)
      setIsEditing(false)
    } else {
      setIsEditing(true)
    }
  }

  const handleCancelEdit = () => {
    setEditContent(message.content)
    setIsEditing(false)
  }

  const extractCodeBlocks = (content: string) => {
    const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g
    const blocks = []
    let match

    while ((match = codeBlockRegex.exec(content)) !== null) {
      blocks.push({
        language: match[1] || 'text',
        code: match[2].trim(),
        fullMatch: match[0]
      })
    }

    return blocks
  }

  const formatContent = (content: string) => {
    const codeBlocks = extractCodeBlocks(content)
    
    if (codeBlocks.length === 0) {
      return <div className="whitespace-pre-wrap break-words">{content}</div>
    }

    // Split content and render with code block components
    let lastIndex = 0
    const elements = []

    codeBlocks.forEach((block, index) => {
      const blockIndex = content.indexOf(block.fullMatch, lastIndex)
      
      // Add text before code block
      if (blockIndex > lastIndex) {
        const textBefore = content.slice(lastIndex, blockIndex)
        if (textBefore.trim()) {
          elements.push(
            <div key={`text-${index}`} className="whitespace-pre-wrap break-words mb-4">
              {textBefore}
            </div>
          )
        }
      }

      // Add code block
      elements.push(
        <div key={`code-${index}`} className="my-4 bg-gray-50 border border-gray-200 rounded-lg overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2 bg-gray-100 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <Code size={14} />
              <span className="text-sm font-medium text-gray-700">
                {block.language}
              </span>
            </div>
            <div className="flex gap-1">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onOpenCanvas?.(block.code, block.language, `${block.language} Code`)}
                className="h-6 px-2 text-xs"
              >
                Open in Canvas
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => navigator.clipboard.writeText(block.code)}
                className="h-6 w-6 p-0"
              >
                <Copy size={12} />
              </Button>
            </div>
          </div>
          <pre className="p-3 text-sm font-mono overflow-x-auto">
            <code>{block.code}</code>
          </pre>
        </div>
      )

      lastIndex = blockIndex + block.fullMatch.length
    })

    // Add remaining text
    if (lastIndex < content.length) {
      const remainingText = content.slice(lastIndex)
      if (remainingText.trim()) {
        elements.push(
          <div key="text-final" className="whitespace-pre-wrap break-words">
            {remainingText}
          </div>
        )
      }
    }

    return <div>{elements}</div>
  }

  const getMessageIcon = () => {
    switch (message.type) {
      case 'user':
        return <User size={16} className="text-blue-600" />
      case 'assistant':
        return <Robot size={16} className="text-green-600" />
      case 'system':
        return <WarningCircle size={16} className="text-red-600" />
      default:
        return <User size={16} className="text-gray-600" />
    }
  }

  const getMessageBgColor = () => {
    switch (message.type) {
      case 'user':
        return 'bg-blue-50 border-blue-200'
      case 'assistant':
        return 'bg-white border-gray-200'
      case 'system':
        return 'bg-red-50 border-red-200'
      default:
        return 'bg-gray-50 border-gray-200'
    }
  }

  const getMessageAlignment = () => {
    return message.type === 'user' ? 'flex-row-reverse' : 'flex-row'
  }

  return (
    <div className={cn(
      "flex gap-3 group",
      getMessageAlignment(),
      className
    )}>
      {/* Avatar */}
      <div className="flex-shrink-0">
        <div className={cn(
          "w-8 h-8 rounded-full flex items-center justify-center",
          message.type === 'user' ? 'bg-blue-100' :
          message.type === 'assistant' ? 'bg-green-100' : 'bg-red-100'
        )}>
          {getMessageIcon()}
        </div>
      </div>

      {/* Message Content */}
      <div className={cn(
        "flex-1 max-w-3xl",
        message.type === 'user' ? 'text-right' : 'text-left'
      )}>
        {/* Message Header */}
        <div className={cn(
          "flex items-center gap-2 mb-1",
          message.type === 'user' ? 'justify-end' : 'justify-start'
        )}>
          <span className="text-sm font-medium text-gray-900">
            {message.type === 'user' ? 'You' : 
             message.type === 'assistant' ? (message.model?.replace(':latest', '') || 'Assistant') : 'System'}
          </span>
          <span className="text-xs text-gray-500">
            {message.timestamp.toLocaleTimeString()}
          </span>
          {message.responseTime && (
            <Badge variant="secondary" className="text-xs">
              {message.responseTime}ms
            </Badge>
          )}
        </div>

        {/* Message Body */}
        <div className={cn(
          "border rounded-lg p-3 shadow-sm",
          getMessageBgColor()
        )}>
          {isEditing ? (
            <div className="space-y-2">
              <Textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="min-h-20 resize-none"
                autoFocus
              />
              <div className="flex gap-2 justify-end">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleCancelEdit}
                  className="h-6 px-2 text-xs"
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleEdit}
                  className="h-6 px-2 text-xs"
                >
                  Save
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-sm text-gray-900">
              {formatContent(message.content)}
            </div>
          )}
        </div>

        {/* Message Actions */}
        {!isEditing && (
          <div className={cn(
            "flex items-center gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity",
            message.type === 'user' ? 'justify-end' : 'justify-start'
          )}>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleCopy}
              className="h-6 w-6 p-0"
              title="Copy message"
            >
              {copied ? <Check size={12} className="text-green-600" /> : <Copy size={12} />}
            </Button>
            
            {onEditMessage && message.type === 'user' && (
              <Button
                size="sm"
                variant="ghost"
                onClick={handleEdit}
                className="h-6 w-6 p-0"
                title="Edit message"
              >
                <Pencil size={12} />
              </Button>
            )}
            
            {onDeleteMessage && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onDeleteMessage(message.id)}
                className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                title="Delete message"
              >
                <Trash size={12} />
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default MessageComponent