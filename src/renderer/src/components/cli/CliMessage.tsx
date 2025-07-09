import React from 'react'
import { Terminal, User, Robot, Brain, Lightning } from 'phosphor-react'
import { cn } from '@/lib/utils'

type AIProvider = 'ollama' | 'claude' | 'gemini'

interface CliMessageProps {
  type: 'user' | 'ai'
  content: string
  provider?: AIProvider
  timestamp?: Date
  isStreaming?: boolean
  className?: string
}

const CliMessage: React.FC<CliMessageProps> = ({
  type,
  content,
  provider = 'ollama',
  timestamp,
  isStreaming = false,
  className
}) => {
  const getProviderIcon = () => {
    switch (provider) {
      case 'claude':
        return Brain
      case 'gemini':
        return Lightning
      case 'ollama':
      default:
        return Robot
    }
  }

  const getProviderColor = () => {
    switch (provider) {
      case 'claude':
        return 'text-orange-500'
      case 'gemini':
        return 'text-purple-500'
      case 'ollama':
      default:
        return 'text-blue-500'
    }
  }

  const getProviderPrefix = () => {
    switch (provider) {
      case 'claude':
        return 'claude@desktop'
      case 'gemini':
        return 'gemini@cli'
      case 'ollama':
      default:
        return 'ollama@local'
    }
  }

  const Icon = type === 'user' ? User : getProviderIcon()
  const iconColor = type === 'user' ? 'text-green-500' : getProviderColor()
  const prefix = type === 'user' ? 'user@pelican' : getProviderPrefix()

  return (
    <div className={cn(
      "font-mono text-sm leading-relaxed",
      className
    )}>
      {/* Terminal Prompt Line */}
      <div className="flex items-center gap-2 mb-1">
        <Icon size={14} className={iconColor} />
        <span className={cn("font-medium", iconColor)}>
          {prefix}
        </span>
        <span className="text-gray-500">
          {type === 'user' ? '$ ' : '> '}
        </span>
        {timestamp && (
          <span className="text-xs text-gray-400 ml-auto">
            {timestamp instanceof Date && !isNaN(timestamp.getTime()) 
              ? timestamp.toLocaleTimeString() 
              : 'Invalid time'}
          </span>
        )}
      </div>

      {/* Message Content */}
      <div className={cn(
        "pl-6 whitespace-pre-wrap break-words",
        type === 'user' 
          ? "text-green-600 bg-green-50 border-l-2 border-green-200 pl-4 py-2 rounded-r" 
          : "text-gray-800 bg-gray-50 border-l-2 border-gray-200 pl-4 py-2 rounded-r",
        isStreaming && "animate-pulse"
      )}>
        {content || (isStreaming ? '...' : '')}
        
        {/* Streaming Cursor */}
        {isStreaming && (
          <span className="inline-block w-2 h-4 bg-current ml-1 animate-blink" />
        )}
      </div>

      {/* Command Separator */}
      <div className="mt-2 mb-4 border-b border-gray-100" />
    </div>
  )
}

export default CliMessage

// Add the blink animation to global CSS if not already present
const blinkKeyframes = `
@keyframes blink {
  0%, 50% { opacity: 1; }
  51%, 100% { opacity: 0; }
}
`

// Inject styles if not already present
if (typeof document !== 'undefined' && !document.querySelector('#cli-blink-styles')) {
  const style = document.createElement('style')
  style.id = 'cli-blink-styles'
  style.textContent = blinkKeyframes + '.animate-blink { animation: blink 1s infinite; }'
  document.head.appendChild(style)
}