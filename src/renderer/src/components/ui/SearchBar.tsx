import React, { useState, useRef, useEffect } from 'react'
import { 
  MagnifyingGlass, 
  Funnel, 
  Clock, 
  File, 
  Robot, 
  ChatCircle,
  X,
  ArrowRight
} from 'phosphor-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface SearchBarProps {
  className?: string
  placeholder?: string
  onSearch?: (query: string, filters: SearchFilters) => void
}

interface SearchFilters {
  type: 'all' | 'chat' | 'agents' | 'files' | 'memory'
  timeRange: 'all' | 'today' | 'week' | 'month'
}

interface SearchResult {
  id: string
  type: 'chat' | 'agent' | 'file' | 'memory'
  title: string
  content: string
  timestamp: Date
  relevance: number
}

/**
 * TODO: SearchBar - Scaffolded Component
 * 
 * This component is planned for Phase 2+ implementation.
 * Current state: UI only with no backend fuzzy search
 * 
 * Planned Features:
 * - Fuzzy search across all local content
 * - Real-time search suggestions
 * - Advanced filtering by type/date/relevance
 * - Search history and saved searches
 * - Vector similarity search integration
 * - Full-text indexing of conversations and files
 */
const SearchBar: React.FC<SearchBarProps> = ({ 
  className, 
  placeholder = "Search conversations, agents, files...",
  onSearch 
}) => {
  const [query, setQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [filters, setFilters] = useState<SearchFilters>({
    type: 'all',
    timeRange: 'all'
  })
  const [mockResults, setMockResults] = useState<SearchResult[]>([])
  const searchRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Mock search results
  const generateMockResults = (searchQuery: string) => {
    if (!searchQuery.trim()) return []
    
    return [
      {
        id: '1',
        type: 'chat' as const,
        title: 'Conversation about React components',
        content: `Discussion about building ${searchQuery} components with TypeScript...`,
        timestamp: new Date(Date.now() - 1000 * 60 * 30),
        relevance: 0.9
      },
      {
        id: '2',
        type: 'agent' as const,
        title: 'Code Helper Agent',
        content: `Agent specialized in ${searchQuery} development and debugging...`,
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2),
        relevance: 0.8
      },
      {
        id: '3',
        type: 'file' as const,
        title: 'documentation.md',
        content: `Documentation containing ${searchQuery} examples and best practices...`,
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24),
        relevance: 0.7
      },
      {
        id: '4',
        type: 'memory' as const,
        title: 'Memory Summary',
        content: `Conversation summary mentioning ${searchQuery} patterns...`,
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 48),
        relevance: 0.6
      }
    ]
  }

  useEffect(() => {
    if (query.length >= 2) {
      setMockResults(generateMockResults(query))
      setIsOpen(true)
    } else {
      setMockResults([])
      setIsOpen(false)
    }
  }, [query])

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (query.trim()) {
      onSearch?.(query, filters)
      setIsOpen(false)
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'chat': return <ChatCircle size={14} className="text-blue-500" />
      case 'agent': return <Robot size={14} className="text-green-500" />
      case 'file': return <File size={14} className="text-purple-500" />
      case 'memory': return <Clock size={14} className="text-orange-500" />
      default: return <MagnifyingGlass size={14} />
    }
  }

  const formatTimestamp = (date: Date) => {
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / (1000 * 60))
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))

    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    return `${days}d ago`
  }

  return (
    <div className={cn("relative", className)} ref={searchRef}>
      {/* Search Input */}
      <form onSubmit={handleSearch} className="relative">
        <div className="relative">
          <MagnifyingGlass 
            size={16} 
            className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" 
          />
          <Input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={placeholder}
            className="pl-10 pr-10"
            onFocus={() => {
              if (query.length >= 2) setIsOpen(true)
            }}
          />
          {query && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
              onClick={() => {
                setQuery('')
                setIsOpen(false)
                inputRef.current?.focus()
              }}
            >
              <X size={12} />
            </Button>
          )}
        </div>

        {/* Search Filters */}
        <div className="flex items-center space-x-2 mt-2">
          <div className="flex items-center space-x-1">
            <Funnel size={14} className="text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Filters:</span>
          </div>
          
          <div className="flex space-x-1">
            {(['all', 'chat', 'agents', 'files', 'memory'] as const).map((type) => (
              <Button
                key={type}
                type="button"
                variant={filters.type === type ? "default" : "outline"}
                size="sm"
                className="text-xs h-6"
                onClick={() => setFilters(prev => ({ ...prev, type }))}
                disabled
              >
                {type}
              </Button>
            ))}
          </div>
        </div>
      </form>

      {/* Search Results Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-background border border-border rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
          {/* Header */}
          <div className="p-3 border-b border-border bg-muted/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <MagnifyingGlass size={14} className="text-muted-foreground" />
                <span className="text-sm font-medium">Search Results</span>
                {mockResults.length > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    {mockResults.length} found
                  </Badge>
                )}
              </div>
              
              <Badge variant="outline" className="bg-yellow-50 text-yellow-700 text-xs">
                TODO: Fuzzy Search
              </Badge>
            </div>
          </div>

          {/* Results */}
          {mockResults.length > 0 ? (
            <div className="p-2">
              {mockResults.map((result) => (
                <button
                  key={result.id}
                  className="w-full p-3 text-left hover:bg-muted/50 rounded transition-colors"
                  onClick={() => {
                    // TODO: Navigate to result
                    setIsOpen(false)
                  }}
                >
                  <div className="flex items-start space-x-3">
                    {getTypeIcon(result.type)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-medium truncate">
                          {result.title}
                        </h4>
                        <span className="text-xs text-muted-foreground ml-2">
                          {formatTimestamp(result.timestamp)}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {result.content}
                      </p>
                      <div className="flex items-center justify-between mt-2">
                        <Badge variant="outline" className="text-xs">
                          {result.type}
                        </Badge>
                        <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                          <span>{(result.relevance * 100).toFixed(0)}% match</span>
                          <ArrowRight size={12} />
                        </div>
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ) : query.length >= 2 ? (
            <div className="p-6 text-center text-muted-foreground">
              <MagnifyingGlass size={32} className="mx-auto mb-2 opacity-50" />
              <p className="text-sm">No results found for "{query}"</p>
              <p className="text-xs mt-1">Try different keywords or check your filters</p>
            </div>
          ) : (
            <div className="p-6 text-center text-muted-foreground">
              <p className="text-sm">Start typing to search...</p>
              <div className="mt-3 space-y-1 text-xs">
                <p>💡 <strong>Planned Features:</strong></p>
                <p>• Fuzzy search across all content</p>
                <p>• Vector similarity matching</p>
                <p>• Advanced filtering and sorting</p>
                <p>• Search history and suggestions</p>
              </div>
            </div>
          )}

          {/* Footer */}
          {query.length >= 2 && (
            <div className="p-2 border-t border-border bg-muted/20">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Press Enter to search all content</span>
                <span>ESC to close</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default SearchBar
