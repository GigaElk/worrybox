import { useState, useEffect, useCallback, useRef, useImperativeHandle, forwardRef } from 'react'
import { postService, PostResponse, PostsQuery } from '../services/postService'
import PostCard from './PostCard'
import { Loader2, RefreshCw, Filter, Users, Compass, Globe } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '../contexts/AuthContext'
import { feedCache, FeedType, FeedFilter } from '../services/feedCache'

interface ComprehensiveFeedProps {
  onPostEdit?: (post: PostResponse) => void
  onPostDelete?: (postId: string) => void
  onBlogEdit?: (post: PostResponse) => void
  onNewPost?: (post: PostResponse) => void
}

export interface ComprehensiveFeedRef {
  addNewPost: (post: PostResponse) => void
  refresh: () => void
}

const ComprehensiveFeed = forwardRef<ComprehensiveFeedRef, ComprehensiveFeedProps>(({ 
  onPostEdit, 
  onPostDelete, 
  onBlogEdit,
  onNewPost
}, ref) => {
  const { isAuthenticated } = useAuth()
  const [posts, setPosts] = useState<PostResponse[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [feedType, setFeedType] = useState<FeedType>('all')
  const [feedFilter, setFeedFilter] = useState<FeedFilter>('all')
  const [showFilters, setShowFilters] = useState(false)
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null)
  
  const observerRef = useRef<IntersectionObserver | null>(null)
  const loadMoreRef = useRef<HTMLDivElement | null>(null)
  const offsetRef = useRef(0)

  const POSTS_PER_PAGE = 20
  const REFRESH_INTERVAL = 30000 // 30 seconds

  const fetchPosts = useCallback(async (reset = false) => {
    try {
      const currentOffset = reset ? 0 : offsetRef.current
      setError(null)
      
      if (reset) {
        setIsLoading(true)
        offsetRef.current = 0
      } else {
        setIsLoadingMore(true)
      }

      // Check cache first (but not on reset/refresh)
      const cachedData = feedCache.get(feedType, feedFilter, currentOffset, POSTS_PER_PAGE)
      if (cachedData && !reset) {
        setPosts(prev => [...prev, ...cachedData.posts])
        offsetRef.current += cachedData.posts.length
        setHasMore(cachedData.hasMore)
        setIsLoading(false)
        setIsLoadingMore(false)
        return
      }

      const query: Omit<PostsQuery, 'userId'> = {
        limit: POSTS_PER_PAGE,
        offset: currentOffset,
        ...(feedFilter !== 'all' && { privacyLevel: feedFilter as any })
      }

      let response
      switch (feedType) {
        case 'personalized':
          if (!isAuthenticated) {
            throw new Error('Authentication required for personalized feed')
          }
          response = await postService.getPersonalizedFeed(query)
          break
        case 'discovery':
          response = await postService.getDiscoveryFeed(query)
          break
        default:
          response = await postService.getPosts(query)
      }

      // Cache the response
      feedCache.set(feedType, feedFilter, currentOffset, POSTS_PER_PAGE, response)

      if (reset) {
        setPosts(response.posts)
        offsetRef.current = response.posts.length
      } else {
        setPosts(prev => [...prev, ...response.posts])
        offsetRef.current += response.posts.length
      }

      setHasMore(response.hasMore)
    } catch (err: any) {
      const message = err.response?.data?.error?.message || err.message || 'Failed to load posts'
      setError(message)
      if (!message.includes('Failed to load posts')) {
        toast.error(message)
      }
    } finally {
      setIsLoading(false)
      setIsLoadingMore(false)
    }
  }, [feedType, feedFilter, isAuthenticated])

  // Infinite scroll setup
  useEffect(() => {
    if (observerRef.current) {
      observerRef.current.disconnect()
    }

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoadingMore) {
          fetchPosts(false)
        }
      },
      { threshold: 0.1 }
    )

    if (loadMoreRef.current) {
      observerRef.current.observe(loadMoreRef.current)
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect()
      }
    }
  }, [hasMore, isLoadingMore, fetchPosts])

  // Initial load and feed type/filter changes
  useEffect(() => {
    fetchPosts(true)
  }, [fetchPosts])

  // Real-time updates
  useEffect(() => {
    if (refreshInterval) {
      clearInterval(refreshInterval)
    }

    const interval = setInterval(() => {
      // Only refresh if we're at the top of the feed
      if (offsetRef.current === 0 || posts.length <= POSTS_PER_PAGE) {
        fetchPosts(true)
      }
    }, REFRESH_INTERVAL)

    setRefreshInterval(interval)

    return () => {
      if (interval) {
        clearInterval(interval)
      }
    }
  }, [posts.length, fetchPosts])

  const handleRefresh = () => {
    fetchPosts(true)
  }

  const handleFeedTypeChange = (type: FeedType) => {
    if (type === 'personalized' && !isAuthenticated) {
      toast.error('Please log in to view your personalized feed')
      return
    }
    setFeedType(type)
  }

  const handleFilterChange = (filter: FeedFilter) => {
    setFeedFilter(filter)
  }

  const handlePostEdit = (post: PostResponse) => {
    onPostEdit?.(post)
  }

  const handleBlogEdit = (post: PostResponse) => {
    onBlogEdit?.(post)
  }

  const handlePostDelete = async (postId: string) => {
    try {
      await postService.deletePost(postId)
      setPosts(prev => prev.filter(post => post.id !== postId))
      // Update cache to remove the deleted post
      feedCache.removePost(postId)
      toast.success('Post deleted successfully')
      onPostDelete?.(postId)
    } catch (error: any) {
      const message = error.response?.data?.error?.message || 'Failed to delete post'
      toast.error(message)
    }
  }

  const addNewPost = useCallback((newPost: PostResponse) => {
    setPosts(prev => [newPost, ...prev])
    // Add to cache for relevant feed types
    feedCache.addPost(newPost, feedType)
    onNewPost?.(newPost)
  }, [feedType, onNewPost])

  // Expose methods through ref
  useImperativeHandle(ref, () => ({
    addNewPost,
    refresh: handleRefresh
  }), [addNewPost, handleRefresh])

  const getFeedTitle = () => {
    switch (feedType) {
      case 'personalized':
        return 'Your Feed'
      case 'discovery':
        return 'Discover'
      default:
        return 'All Posts'
    }
  }

  const getFeedDescription = () => {
    switch (feedType) {
      case 'personalized':
        return 'Posts from people you follow'
      case 'discovery':
        return 'Discover new voices and perspectives'
      default:
        return 'Recent posts from the community'
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary-600 mx-auto" />
          <p className="mt-2 text-sm text-gray-600">Loading your feed...</p>
        </div>
      </div>
    )
  }

  if (error && posts.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600 mb-4">{error}</p>
        <button
          onClick={handleRefresh}
          className="inline-flex items-center px-4 py-2 text-sm font-medium text-primary-600 bg-white border border-primary-600 rounded-md hover:bg-primary-50"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Try Again
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Feed Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{getFeedTitle()}</h1>
            <p className="text-gray-600 mt-1">{getFeedDescription()}</p>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleRefresh}
              disabled={isLoading}
              className="inline-flex items-center px-3 py-2 text-sm text-gray-600 hover:text-gray-900 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="inline-flex items-center px-3 py-2 text-sm text-gray-600 hover:text-gray-900"
            >
              <Filter className="w-4 h-4 mr-1" />
              Filters
            </button>
          </div>
        </div>

        {/* Feed Type Tabs */}
        <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => handleFeedTypeChange('all')}
            className={`flex-1 flex items-center justify-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
              feedType === 'all'
                ? 'bg-white text-primary-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Globe className="w-4 h-4 mr-2" />
            All Posts
          </button>
          {isAuthenticated && (
            <button
              onClick={() => handleFeedTypeChange('personalized')}
              className={`flex-1 flex items-center justify-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                feedType === 'personalized'
                  ? 'bg-white text-primary-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Users className="w-4 h-4 mr-2" />
              Following
            </button>
          )}
          <button
            onClick={() => handleFeedTypeChange('discovery')}
            className={`flex-1 flex items-center justify-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
              feedType === 'discovery'
                ? 'bg-white text-primary-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Compass className="w-4 h-4 mr-2" />
            Discover
          </button>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex items-center space-x-4">
              <span className="text-sm font-medium text-gray-700">Privacy Level:</span>
              <div className="flex space-x-2">
                {(['all', 'public', 'friends', 'private'] as FeedFilter[]).map((filter) => (
                  <button
                    key={filter}
                    onClick={() => handleFilterChange(filter)}
                    className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                      feedFilter === filter
                        ? 'bg-primary-100 text-primary-800'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {filter.charAt(0).toUpperCase() + filter.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Posts */}
      {posts.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-600 mb-4">
            {feedType === 'personalized' 
              ? 'No posts from people you follow yet. Try following some users or check out the discovery feed!'
              : feedType === 'discovery'
              ? 'No new posts to discover right now. Check back later!'
              : 'No posts to show yet. Be the first to share a worry!'
            }
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              onEdit={handlePostEdit}
              onDelete={handlePostDelete}
              onEditBlog={handleBlogEdit}
            />
          ))}
        </div>
      )}

      {/* Infinite Scroll Trigger */}
      {hasMore && (
        <div ref={loadMoreRef} className="text-center py-4">
          {isLoadingMore && (
            <div className="flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-primary-600" />
              <span className="ml-2 text-sm text-gray-600">Loading more posts...</span>
            </div>
          )}
        </div>
      )}

      {/* End of Feed */}
      {!hasMore && posts.length > 0 && (
        <div className="text-center py-8">
          <p className="text-sm text-gray-500">You've reached the end of your feed</p>
          <button
            onClick={handleRefresh}
            className="mt-2 text-sm text-primary-600 hover:text-primary-800"
          >
            Refresh to see new posts
          </button>
        </div>
      )}
    </div>
  )
})

export default ComprehensiveFeed