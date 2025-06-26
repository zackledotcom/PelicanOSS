import React from 'react'
import ReactMarkdown from 'react-markdown'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { cn } from '@/lib/utils'

interface MessageComponentProps {
  message: {
    id: string
    type: 'user' | 'ai'
    content: string
    timestamp: Date
    isStreaming?: boolean
  }
}

const MessageComponent: React.FC<MessageComponentProps> = ({ message }) => {
  const isUser = message.type === 'user'

  // Custom components for ReactMarkdown
  const components = {
    code: ({ node, inline, className, children, ...props }: any) => {
      const match = /language-(\w+)/.exec(className || '')
      const language = match ? match[1] : ''
      
      if (!inline && language) {
        return (
          <div className="my-4 rounded-lg overflow-hidden bg-gray-900 border border-gray-700">
            <div className="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700">
              <span className="text-sm text-gray-300 font-medium">{language}</span>
              <button
                onClick={() => navigator.clipboard.writeText(String(children))}
                className="text-xs text-gray-400 hover:text-gray-200 transition-colors"
              >
                Copy
              </button>
            </div>
            <SyntaxHighlighter
              style={oneDark}
              language={language}
              PreTag="div"
              className="!m-0 !bg-transparent"
              {...props}
            >
              {String(children).replace(/\n$/, '')}
            </SyntaxHighlighter>
          </div>
        )
      }
      
      // Inline code
      return (
        <code
          className="bg-gray-100 dark:bg-gray-800 text-red-600 dark:text-red-400 px-1.5 py-0.5 rounded text-sm font-mono"
          {...props}
        >
          {children}
        </code>
      )
    },
    pre: ({ children }: any) => {
      return <>{children}</>
    },
    p: ({ children }: any) => {
      return <p className="mb-3 last:mb-0 leading-relaxed">{children}</p>
    },
    h1: ({ children }: any) => {
      return <h1 className="text-2xl font-bold mb-3 text-gray-900 dark:text-gray-100">{children}</h1>
    },
    h2: ({ children }: any) => {
      return <h2 className="text-xl font-bold mb-2 text-gray-900 dark:text-gray-100">{children}</h2>
    },
    h3: ({ children }: any) => {
      return <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-gray-100">{children}</h3>
    },
    ul: ({ children }: any) => {
      return <ul className="list-disc list-inside mb-3 space-y-1">{children}</ul>
    },
    ol: ({ children }: any) => {
      return <ol className="list-decimal list-inside mb-3 space-y-1">{children}</ol>
    },
    li: ({ children }: any) => {
      return <li className="text-gray-700 dark:text-gray-300">{children}</li>
    },
    blockquote: ({ children }: any) => {
      return (
        <blockquote className="border-l-4 border-blue-500 pl-4 py-2 my-3 bg-blue-50 dark:bg-blue-900/20 rounded-r">
          {children}
        </blockquote>
      )
    },
    table: ({ children }: any) => {
      return (
        <div className="overflow-x-auto my-4">
          <table className="min-w-full border border-gray-300 dark:border-gray-600 rounded-lg">
            {children}
          </table>
        </div>
      )
    },
    th: ({ children }: any) => {
      return (
        <th className="border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-800 px-4 py-2 text-left font-semibold">
          {children}
        </th>
      )
    },
    td: ({ children }: any) => {
      return (
        <td className="border border-gray-300 dark:border-gray-600 px-4 py-2">
          {children}
        </td>
      )
    }
  }

  return (
    <div
      className={cn(
        "flex gap-4 max-w-4xl",
        isUser ? "ml-auto flex-row-reverse" : ""
      )}
    >
      {/* Avatar */}
      <div className={cn(
        "w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 border-0",
        isUser 
          ? "bg-accent-gradient text-primary-foreground" 
          : "glass-accent text-accent-blue-hover"
      )}>
        {isUser ? (
          <div className="w-8 h-8 bg-white/10 rounded-xl flex items-center justify-center">
            <span className="text-xs font-bold">You</span>
          </div>
        ) : (
          <span className="text-lg">🦉</span>
        )}
      </div>

      {/* Message Content - No bubble styling */}
      <div className={cn(
        "flex-1 space-y-2",
        isUser ? "text-right" : ""
      )}>
        <div className={cn(
          "max-w-none",
          isUser 
            ? "text-primary-foreground rounded-none p-0 inline-block border-0" 
            : "text-foreground rounded-none p-0 border-0"
        )}>
          {isUser ? (
            // User messages - simple text, no bubbles
            <p className="m-0 whitespace-pre-wrap leading-relaxed text-gray-800">{message.content}</p>
          ) : (
            // AI messages - formatted with markdown and syntax highlighting, no bubbles
            <div className="prose prose-sm max-w-none dark:prose-invert">
              <ReactMarkdown components={components}>
                {message.content}
              </ReactMarkdown>
            </div>
          )}
        </div>
        <div className="text-xs text-grey-dark">
          {message.timestamp.toLocaleTimeString()}
        </div>
      </div>
    </div>
  )
}

export default MessageComponent