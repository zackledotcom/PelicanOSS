import React, { useState, useRef, useEffect } from 'react'
import { 
  PaperPlaneTilt, 
  Paperclip, 
  Microphone, 
  Stop,
  CaretDown
} from 'phosphor-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

interface ChatInputProps {
  onSendMessage: (content: string) => void
  disabled?: boolean
  placeholder?: string
  className?: string
}

const ChatInput: React.FC<ChatInputProps> = ({ 
  onSendMessage, 
  disabled = false, 
  placeholder = "Type your message...",
  className 
}) => {
  const [message, setMessage] = useState('')
  const [isRecording, setIsRecording] = useState(false)
  const [showAttachments, setShowAttachments] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      const scrollHeight = textareaRef.current.scrollHeight
      textareaRef.current.style.height = Math.min(scrollHeight, 120) + 'px'
    }
  }, [message])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (message.trim() && !disabled) {
      onSendMessage(message.trim())
      setMessage('')
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (e.shiftKey) {
        // Allow new line with Shift+Enter
        return
      } else {
        e.preventDefault()
        handleSubmit(e)
      }
    }
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      // TODO: Handle file uploads
      console.log('Files selected:', Array.from(files).map(f => f.name))
    }
  }

  const toggleRecording = () => {
    if (isRecording) {
      // Stop recording
      setIsRecording(false)
      // TODO: Process recorded audio
    } else {
      // Start recording
      setIsRecording(true)
      // TODO: Start audio recording
    }
  }

  return (
    <div className={cn("p-4", className)}>
      <form onSubmit={handleSubmit} className="relative">
        <div className="flex items-end space-x-2">
          {/* Attachment Button */}
          <div className="relative">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowAttachments(!showAttachments)}
              className="mb-1"
            >
              <Paperclip size={18} />
            </Button>
            
            {/* Attachment Dropdown */}
            {showAttachments && (
              <div className="absolute bottom-full left-0 mb-2 bg-background border border-border rounded-lg shadow-lg p-2 min-w-[120px]">
                <label className="block p-2 hover:bg-muted rounded cursor-pointer text-sm">
                  📄 Files
                  <input
                    type="file"
                    multiple
                    onChange={handleFileUpload}
                    className="hidden"
                    accept=".txt,.pdf,.doc,.docx,.md"
                  />
                </label>
                <label className="block p-2 hover:bg-muted rounded cursor-pointer text-sm">
                  🖼️ Images
                  <input
                    type="file"
                    multiple
                    onChange={handleFileUpload}
                    className="hidden"
                    accept="image/*"
                  />
                </label>
                <label className="block p-2 hover:bg-muted rounded cursor-pointer text-sm">
                  💾 Data
                  <input
                    type="file"
                    multiple
                    onChange={handleFileUpload}
                    className="hidden"
                    accept=".json,.csv,.xlsx"
                  />
                </label>
              </div>
            )}
          </div>

          {/* Message Input */}
          <div className="flex-1 relative">
            <Textarea
              ref={textareaRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              disabled={disabled}
              className="min-h-[44px] max-h-[120px] resize-none pr-20"
              style={{ height: 'auto' }}
            />
            
            {/* Character count and shortcuts hint */}
            <div className="absolute bottom-1 right-1 text-xs text-muted-foreground">
              {message.length > 0 && (
                <span className="mr-2">{message.length}</span>
              )}
              <span>↵ Send • Shift+↵ New line</span>
            </div>
          </div>

          {/* Voice Recording Button */}
          <Button
            type="button"
            variant={isRecording ? "destructive" : "ghost"}
            size="sm"
            onClick={toggleRecording}
            className="mb-1"
          >
            {isRecording ? <Stop size={18} /> : <Microphone size={18} />}
          </Button>

          {/* Send Button */}
          <Button
            type="submit"
            disabled={!message.trim() || disabled}
            size="sm"
            className="mb-1"
          >
            <PaperPlaneTilt size={18} />
          </Button>
        </div>

        {/* Quick Actions Bar */}
        {message.length === 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setMessage("Help me with ")}
              className="text-xs"
            >
              Help me with...
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setMessage("Explain ")}
              className="text-xs"
            >
              Explain...
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setMessage("Write code for ")}
              className="text-xs"
            >
              Write code...
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setMessage("Summarize ")}
              className="text-xs"
            >
              Summarize...
            </Button>
          </div>
        )}

        {/* Recording Indicator */}
        {isRecording && (
          <div className="mt-2 flex items-center space-x-2 text-red-500">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            <span className="text-sm">Recording... Click to stop</span>
          </div>
        )}
      </form>
    </div>
  )
}

export default ChatInput
