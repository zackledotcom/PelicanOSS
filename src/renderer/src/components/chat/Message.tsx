import React, { useState, useRef } from 'react'
import { 
  Copy, 
  Check, 
  ThumbsUp, 
  ThumbsDown, 
  PencilSimple, 
  DotsThreeVertical,
  Robot,
  User,
  Clock,
  Stop,
  TextT,
  Brain,
  ChartLine,
  Timer
} from 'phosphor-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { Separator } from '@/components/ui/separator'
import { Toggle } from '@/components/ui/toggle'
import { cn } from '@/lib/utils'

interface MessageProps {
  id: string
  type: 'user' | 'ai'
  content: string
  timestamp: Date
  isStreaming?: boolean
  model?: string
  tokenCount?: number
  responseTime?: number
  reactions?: Array<{ type: string; count: number; userReacted: boolean }>
  onEdit?: (id: string, newContent: string) => void
  onCorrect?: (id: string, correction: string) => void
  onReaction?: (id: string, reaction: string) => void
  onStop?: (id: string) => void
  onDelete?: (id: string) => void
  onHighlight?: (id: string, text: string) => void
  showAdvancedStats?: boolean
  className?: string
}

export default function Message({
  id,
  type,
  content,
  timestamp,
  isStreaming = false,
  model,
  tokenCount,
  responseTime,
  reactions = [],
  onEdit,
  onCorrect,
  onReaction,
  onStop,
  onDelete,
  onHighlight,
  showAdvancedStats = false,
  className
}: MessageProps) {
  const [copied, setCopied] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [isCorrecting, setIsCorrecting] = useState(false)
  const [editContent, setEditContent] = useState(content)
  const [correctionContent, setCorrectionContent] = useState('')
  const [selectedText, setSelectedText] = useState('')
  const [showTimestamp, setShowTimestamp] = useState(false)
  const contentRef = useRef<HTMLDivElement>(null)

  const handleCopy = async () => {
    try {
      const textToCopy = selectedText || content
      await navigator.clipboard.writeText(textToCopy)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy text:', err)
    }
  }

  const handleEdit = () => {
    if (isEditing && onEdit) {
      onEdit(id, editContent)
      setIsEditing(false)
    } else {
      setIsEditing(true)
    }
  }

  const handleCorrect = () => {
    if (isCorrecting && onCorrect) {
      onCorrect(id, correctionContent)
      setIsCorrecting(false)
      setCorrectionContent('')
    } else {
      setIsCorrecting(true)
    }
  }

  const handleTextSelection = () => {
    const selection = window.getSelection()
    if (selection && selection.toString().length > 0) {
      const selected = selection.toString()
      setSelectedText(selected)
      if (onHighlight) {
        onHighlight(id, selected)
      }
    } else {
      setSelectedText('')
    }
  }

  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).format(date)
  }

  const formatTokens = (count: number) => {
    if (count > 1000) return `${(count / 1000).toFixed(1)}k`
    return count.toString()
  }

  const isUser = type === 'user'

  const reactionEmojis = [
    { type: 'like', icon: <ThumbsUp weight="fill" />, emoji: '👍' },
    { type: 'dislike', icon: <ThumbsDown weight="fill" />, emoji: '👎' },
    { type: 'love', emoji: '❤️' },
    { type: 'laugh', emoji: '😄' },
    { type: 'wow', emoji: '😮' },
    { type: 'sad', emoji: '😢' }
  ]

  return (
    <div 
      className={cn(
        "group flex gap-3 transition-all duration-200 hover:bg-muted/30 p-3 rounded-lg relative",
        isUser ? 'justify-end' : 'justify-start',
        className
      )}
      onMouseEnter={() => setShowTimestamp(true)}
      onMouseLeave={() => setShowTimestamp(false)}
    >
      {/* Avatar - only for AI messages */}
      {!isUser && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
          <Bot weight="fill" className="w-4 h-4 text-white" />
        </div>
      )}

      <div className={cn(
        "flex flex-col max-w-[80%] min-w-[200px]",
        isUser ? 'items-end' : 'items-start'
      )}>
        {/* Message card */}
        <Card className={cn(
          "relative transition-all duration-200 hover:shadow-md",
          isUser 
            ? "bg-primary text-primary-foreground" 
            : "bg-card border"
        )}>
          <CardContent className="p-4">
            {/* Header with model info */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                {isUser ? (
                  <User weight="fill" className="w-3 h-3 opacity-70" />
                ) : (
                  <>
                    <Brain weight="fill" className="w-3 h-3 opacity-70" />
                    {model && (
                      <Badge variant="secondary" className="text-xs">
                        {model}
                      </Badge>
                    )}
                  </>
                )}
              </div>
              
              {/* Advanced stats overlay */}
              {showAdvancedStats && !isUser && (tokenCount || responseTime) && (
                <div className="flex items-center gap-2 text-xs opacity-60">
                  {tokenCount && (
                    <div className="flex items-center gap-1">
                      <Type className="w-3 h-3" />
                      <span>{formatTokens(tokenCount)}</span>
                    </div>
                  )}
                  {responseTime && (
                    <div className="flex items-center gap-1">
                      <Timer className="w-3 h-3" />
                      <span>{responseTime}ms</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Content */}
            {isEditing ? (
              <div className="space-y-2">
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="w-full bg-transparent border border-border rounded p-2 text-sm resize-none"
                  rows={3}
                  autoFocus
                />
                <div className="flex gap-2 justify-end">
                  <Button size="sm" variant="outline" onClick={() => setIsEditing(false)}>
                    Cancel
                  </Button>
                  <Button size="sm" onClick={handleEdit}>
                    <Check className="w-3 h-3 mr-1" />
                    Save
                  </Button>
                </div>
              </div>
            ) : isCorrecting ? (
              <div className="space-y-2">
                <div className="text-sm leading-relaxed whitespace-pre-wrap opacity-60">
                  {content}
                </div>
                <Separator className="my-2" />
                <textarea
                  value={correctionContent}
                  onChange={(e) => setCorrectionContent(e.target.value)}
                  placeholder="Provide correction or feedback..."
                  className="w-full bg-transparent border border-border rounded p-2 text-sm resize-none"
                  rows={2}
                  autoFocus
                />
                <div className="flex gap-2 justify-end">
                  <Button size="sm" variant="outline" onClick={() => setIsCorrecting(false)}>
                    Cancel
                  </Button>
                  <Button size="sm" onClick={handleCorrect}>
                    <Check className="w-3 h-3 mr-1" />
                    Submit Correction
                  </Button>
                </div>
              </div>
            ) : (
              <ScrollArea className="max-h-96">
                <div 
                  ref={contentRef}
                  className={cn(
                    "text-sm leading-relaxed whitespace-pre-wrap cursor-text",
                    selectedText && "selection:bg-yellow-200 selection:text-yellow-900"
                  )}
                  onMouseUp={handleTextSelection}
                  onTouchEnd={handleTextSelection}
                >
                  {content}
                </div>
              </ScrollArea>
            )}

            {/* Streaming indicator */}
            {isStreaming && (
              <div className="flex items-center justify-between mt-3 p-2 bg-muted/30 rounded">
                <div className="flex items-center gap-2 text-xs opacity-60">
                  <div className="flex space-x-1">
                    <div className="w-1 h-1 bg-current rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                    <div className="w-1 h-1 bg-current rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                    <div className="w-1 h-1 bg-current rounded-full animate-bounce"></div>
                  </div>
                  <span>AI is typing...</span>
                </div>
                
                {onStop && (
                  <Button size="sm" variant="destructive" onClick={() => onStop(id)} className="h-6 px-2">
                    <Stop weight="fill" className="w-3 h-3 mr-1" />
                    Stop
                  </Button>
                )}
              </div>
            )}
          </CardContent>

          {/* Timestamp - subtle, shows on hover */}
          {showTimestamp && (
            <div className={cn(
              "absolute -bottom-5 text-xs text-muted-foreground transition-opacity duration-200",
              isUser ? "right-2" : "left-2"
            )}>
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {formatTime(timestamp)}
              </div>
            </div>
          )}

          {/* Action buttons - slide in on hover */}
          <div className={cn(
            "absolute -top-2 flex gap-1 transition-all duration-200 bg-background border rounded-md p-1 shadow-sm",
            isUser ? "-left-2" : "-right-2",
            "opacity-0 group-hover:opacity-100 translate-y-1 group-hover:translate-y-0"
          )}>
            {/* Copy button */}
            <Button
              size="sm"
              variant="ghost"
              onClick={handleCopy}
              className="h-6 w-6 p-0"
              title={selectedText ? "Copy selected text" : "Copy message"}
            >
              {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
            </Button>

            {/* Quick reaction buttons */}
            {!isUser && onReaction && (
              <div className="flex">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onReaction(id, 'like')}
                  className="h-6 w-6 p-0"
                  title="Like"
                >
                  <ThumbsUp className="w-3 h-3" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onReaction(id, 'dislike')}
                  className="h-6 w-6 p-0"
                  title="Dislike"
                >
                  <ThumbsDown className="w-3 h-3" />
                </Button>
              </div>
            )}

            {/* More actions dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="ghost" className="h-6 w-6 p-0" title="More actions">
                  <MoreVertical className="w-3 h-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align={isUser ? "end" : "start"}>
                {isUser && onEdit && (
                  <DropdownMenuItem onClick={() => setIsEditing(true)}>
                    <Pencil className="w-4 h-4 mr-2" />
                    Edit message
                  </DropdownMenuItem>
                )}
                
                {!isUser && onCorrect && (
                  <DropdownMenuItem onClick={() => setIsCorrecting(true)}>
                    <TrendingUp className="w-4 h-4 mr-2" />
                    Correct/Feedback
                  </DropdownMenuItem>
                )}
                
                <DropdownMenuItem onClick={handleCopy}>
                  <Copy className="w-4 h-4 mr-2" />
                  {selectedText ? 'Copy selected' : 'Copy text'}
                </DropdownMenuItem>

                {!isUser && onReaction && (
                  <>
                    <DropdownMenuSeparator />
                    <Popover>
                      <PopoverTrigger asChild>
                        <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                          All reactions
                        </DropdownMenuItem>
                      </PopoverTrigger>
                      <PopoverContent className="w-fit p-2">
                        <div className="grid grid-cols-3 gap-1">
                          {reactionEmojis.map((reaction) => (
                            <Button
                              key={reaction.type}
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 hover:bg-muted"
                              onClick={() => onReaction(id, reaction.type)}
                              title={reaction.type}
                            >
                              <span className="text-base">{reaction.emoji}</span>
                            </Button>
                          ))}
                        </div>
                      </PopoverContent>
                    </Popover>
                  </>
                )}

                {onDelete && (
                  <>
                    <DropdownMenuSeparator />
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <DropdownMenuItem 
                          className="text-destructive focus:text-destructive"
                          onSelect={(e) => e.preventDefault()}
                        >
                          Delete message
                        </DropdownMenuItem>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Message</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete this message? This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => onDelete(id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </Card>

        {/* Reactions display */}
        {reactions.length > 0 && (
          <div className="flex gap-1 mt-2">
            {reactions.map((reaction) => {
              const reactionData = reactionEmojis.find(r => r.type === reaction.type)
              return (
                <Button
                  key={reaction.type}
                  size="sm"
                  variant={reaction.userReacted ? "default" : "secondary"}
                  className="h-6 px-2 text-xs"
                  onClick={() => onReaction?.(id, reaction.type)}
                >
                  <span className="mr-1">{reactionData?.emoji}</span>
                  {reaction.count}
                </Button>
              )
            })}
          </div>
        )}
      </div>

      {/* Avatar - only for user messages */}
      {isUser && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-green-500 to-blue-500 flex items-center justify-center">
          <User weight="fill" className="w-4 h-4 text-white" />
        </div>
      )}
    </div>
  )
}