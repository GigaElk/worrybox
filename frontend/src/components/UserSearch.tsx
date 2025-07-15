import React, { useState, useEffect, useCallback } from 'react'
import { Search, Loader2 } from 'lucide-react'
import { userService, UserSearchResult } from '../services/userService'
import UserCard from './UserCard'
import { useDebounce } from '../hooks/useDebounce'

interface UserSearchProps {
  onUserSelect?: (user: UserSearchResult) => void
  placeholder?: string
  showResults?: boolean
}

const UserSearch: React.FC<UserSearchProps> = ({
  onUserSelect,
  placeholder = 'Search users...',
  showResults = true,
}) => {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<UserSearchResult[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [total, setTotal] = useState(0)
  const [offset, setOffset] = useState(0)

  const debouncedQuery = useDebounce(query, 300)

  const searchUsers = useCallback(async (searchQuery: string, searchOffset = 0, append = false) => {
    if (!searchQuery.trim()) {
      setResults([])
      setHasMore(false)
      setTotal(0)
      return
    }

    setIsLoading(true)
    try {
      const response = await userService.searchUsers({
        query: searchQuery,
        limit: 20,
        offset: searchOffset,
      })

      if (append) {
        setResults(prev => [...prev, ...response.users])
      } else {
        setResults(response.users)
      }

      setHasMore(response.hasMore)
      setTotal(response.total)
      setOffset(searchOffset + response.users.length)
    } catch (error) {
      console.error('Failed to search users:', error)
      if (!append) {
        setResults([])
        setHasMore(false)
        setTotal(0)
      }
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    setOffset(0)
    searchUsers(debouncedQuery, 0, false)
  }, [debouncedQuery, searchUsers])

  const handleLoadMore = () => {
    if (!isLoading && hasMore) {
      searchUsers(debouncedQuery, offset, true)
    }
  }

  const handleUserSelect = (user: UserSearchResult) => {
    onUserSelect?.(user)
  }

  return (
    <div className="w-full">
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-gray-400" />
        </div>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
          placeholder={placeholder}
        />
      </div>

      {showResults && query && (
        <div className="mt-2">
          {isLoading && results.length === 0 ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
              <span className="ml-2 text-sm text-gray-500">Searching...</span>
            </div>
          ) : results.length > 0 ? (
            <div className="space-y-2">
              <div className="text-sm text-gray-500 mb-2">
                {total} user{total !== 1 ? 's' : ''} found
              </div>
              
              {results.map((user) => (
                <UserCard
                  key={user.id}
                  user={user}
                  onClick={onUserSelect ? handleUserSelect : undefined}
                />
              ))}

              {hasMore && (
                <button
                  onClick={handleLoadMore}
                  disabled={isLoading}
                  className="w-full py-2 px-4 text-sm text-primary-600 hover:text-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <div className="flex items-center justify-center">
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Loading...
                    </div>
                  ) : (
                    'Load more'
                  )}
                </button>
              )}
            </div>
          ) : query && !isLoading ? (
            <div className="text-center py-4 text-sm text-gray-500">
              No users found for "{query}"
            </div>
          ) : null}
        </div>
      )}
    </div>
  )
}

export default UserSearch