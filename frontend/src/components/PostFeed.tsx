import React, { useState, useEffect, useCallback } from 'react'
import { postService, PostResponse, PostsQuery } from '../services/postService'
import PostCard from './PostCard'
import { Loader2, RefreshCw, MessageSquare } from 'lucide-react'
import toast from 'react-hot-toast'
import { useApiCall } from '../hooks/useApiCall'
import { useSafeData, safeArray } from '../hooks/useSafeData'
import LoadingState from './LoadingState'
import EmptyState from './EmptyState'

interface PostFeedProps {
  userId?: string
  query?: Omit<PostsQuery, 'limit' | 'offset'>
  onPostEdit?: (post: PostResponse) => void
  onPostDelete?: (postId: string) => void
  onBlogEdit?: (post: PostResponse) => void
}

const PostFeed: React.FC<PostFeedProps> = ({ userId, query = {}, onPostEdit, onPostDelete, onBlogEdit }) => {
  const [posts, setPosts] = useState<PostResponse[]>([])
  const [hasMore, setHasMore] = useState(false)
  const [offset, setOffset] = useState(0)

  const POSTS_PER_PAGE = 20

  // Use the API call hook for better error handling and retry logic
  const {
    loading: isLoading,
    error,
    execute: executeApiCall,
    retry,
  } = useApiCall<{ posts: PostResponse[]; hasMore: boolean }>({
    showErrorToast: false, // We'll handle errors manually
    maxRetries: 2,
  })

  const [isLoadingMore, setIsLoadingMore] = useState(false)

  // Use safe data handling for posts array
  const { data: safePosts, isEmpty: postsEmpty } = useSafeData(posts, {
    fallback: [],
    logErrors: true,
  })

  const fetchPosts = useCallback(async (reset = false) => {
    const currentOffset = reset ? 0 : offset
    
    if (!reset) {
      setIsLoadingMore(true)
    }

    const fetchQuery: PostsQuery = {
      ...query,
      limit: POSTS_PER_PAGE,
      offset: currentOffset,
    }

    try {
      const apiCall = () => userId 
        ? postService.getUserPosts(userId, fetchQuery)
        : postService.getPosts(fetchQuery)

      const response = await executeApiCall(apiCall)
      
      if (response) {
        // Safely handle the response data
        const newPosts = safeArray(response.posts, [])
        
        if (reset) {
          setPosts(newPosts)
          setOffset(newPosts.length)
        } else {
          setPosts(prev => {
            const safePrev = safeArray(prev, [])
            return [...safePrev, ...newPosts]
          })
          setOffset(prev => prev + newPosts.length)
        }

        setHasMore(response.hasMore || false)
      }
    } catch (err: any) {
      // Error is already handled by useApiCall hook
      const message = err.response?.data?.error?.message || 'Failed to load posts'
      
      // Only show toast for unexpected errors, not empty states
      if (!message.toLowerCase().includes('not found') && !message.toLowerCase().includes('empty')) {
        toast.error(message)
      }
    } finally {
      setIsLoadingMore(false)
    }
  }, [userId, query, offset, executeApiCall])

  useEffect(() => {
    setOffset(0)
    fetchPosts(true)
  }, [userId, query])

  const handleRefresh = () => {
    setOffset(0)
    fetchPosts(true)
  }

  const handleRetry = () => {
    retry(() => {
      const fetchQuery: PostsQuery = {
        ...query,
        limit: POSTS_PER_PAGE,
        offset: 0,
      }
      return userId 
        ? postService.getUserPosts(userId, fetchQuery)
        : postService.getPosts(fetchQuery)
    })
  }

  const handleLoadMore = () => {
    if (!isLoadingMore && hasMore) {
      fetchPosts(false)
    }
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
      // Safely update posts array
      setPosts(prev => {
        const safePrev = safeArray(prev, [])
        return safePrev.filter(post => post.id !== postId)
      })
      toast.success('Post deleted successfully')
      onPostDelete?.(postId)
    } catch (error: any) {
      const message = error.response?.data?.error?.message || 'Failed to delete post'
      toast.error(message)
    }
  }

  // Function to update a post in the feed (can be used by parent components)
  // const handlePostUpdate = (updatedPost: PostResponse) => {
  //   setPosts(prev => prev.map(post => post.id === updatedPost.id ? updatedPost : post))
  // }

  // Function to add new post to the feed (can be used by parent components)
  // const addNewPost = (newPost: PostResponse) => {
  //   setPosts(prev => [newPost, ...prev])
  // }

  // Loading state
  if (isLoading && postsEmpty) {
    return <LoadingState text="Loading posts..." />
  }

  // Error state with retry option
  if (error && postsEmpty) {
    return (
      <EmptyState
        icon={MessageSquare}
        title="Unable to load posts"
        description={error.message || 'There was a problem loading the posts. Please try again.'}
        action={{
          label: 'Try Again',
          onClick: handleRetry,
        }}
      />
    )
  }

  // Empty state
  if (postsEmpty && !isLoading) {
    return (
      <EmptyState
        icon={MessageSquare}
        title={userId ? 'No posts yet' : 'No posts to show'}
        description={
          userId 
            ? 'This user hasn\'t shared any posts yet. Check back later!'
            : 'Be the first to share a worry and connect with the community.'
        }
      />
    )
  }

  return (
    <div className="space-y-6">
      {/* Refresh Button */}
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold text-gray-900">
          {userId ? 'Posts' : 'Recent Worries'}
        </h2>
        <button
          onClick={handleRefresh}
          disabled={isLoading}
          className="inline-flex items-center px-3 py-1 text-sm text-gray-600 hover:text-gray-900 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Posts */}
      <div className="space-y-4">
        {safePosts.map((post) => (
          <PostCard
            key={post.id}
            post={post}
            onEdit={handlePostEdit}
            onDelete={handlePostDelete}
            onEditBlog={handleBlogEdit}
          />
        ))}
      </div>

      {/* Load More */}
      {hasMore && (
        <div className="text-center py-4">
          <button
            onClick={handleLoadMore}
            disabled={isLoadingMore}
            className="inline-flex items-center px-6 py-2 text-sm font-medium text-primary-600 bg-white border border-primary-600 rounded-md hover:bg-primary-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoadingMore ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Loading...
              </>
            ) : (
              'Load More'
            )}
          </button>
        </div>
      )}

      {/* End of Posts */}
      {!hasMore && !postsEmpty && (
        <div className="text-center py-4">
          <p className="text-sm text-gray-500">You've reached the end</p>
        </div>
      )}
    </div>
  )
}

export default PostFeed