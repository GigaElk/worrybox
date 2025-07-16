import React, { useState, useEffect, useCallback } from 'react'
import { postService, PostResponse, PostsQuery } from '../services/postService'
import PostCard from './PostCard'
import { Loader2, RefreshCw } from 'lucide-react'
import toast from 'react-hot-toast'

interface PostFeedProps {
  userId?: string
  query?: Omit<PostsQuery, 'limit' | 'offset'>
  onPostEdit?: (post: PostResponse) => void
  onPostDelete?: (postId: string) => void
  onBlogEdit?: (post: PostResponse) => void
}

const PostFeed: React.FC<PostFeedProps> = ({ userId, query = {}, onPostEdit, onPostDelete, onBlogEdit }) => {
  const [posts, setPosts] = useState<PostResponse[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [offset, setOffset] = useState(0)

  const POSTS_PER_PAGE = 20

  const fetchPosts = useCallback(async (reset = false) => {
    try {
      const currentOffset = reset ? 0 : offset
      setError(null)
      
      if (reset) {
        setIsLoading(true)
      } else {
        setIsLoadingMore(true)
      }

      const fetchQuery: PostsQuery = {
        ...query,
        limit: POSTS_PER_PAGE,
        offset: currentOffset,
      }

      const response = userId 
        ? await postService.getUserPosts(userId, fetchQuery)
        : await postService.getPosts(fetchQuery)

      if (reset) {
        setPosts(response.posts)
        setOffset(response.posts.length)
      } else {
        setPosts(prev => [...prev, ...response.posts])
        setOffset(prev => prev + response.posts.length)
      }

      setHasMore(response.hasMore)
    } catch (err: any) {
      const message = err.response?.data?.error?.message || 'Failed to load posts'
      setError(message)
      // Only show toast error for real errors, not empty feeds
      if (!message.includes('Failed to load posts') && !message.includes('Failed to fetch posts')) {
        toast.error(message)
      }
    } finally {
      setIsLoading(false)
      setIsLoadingMore(false)
    }
  }, [userId, query, offset])

  useEffect(() => {
    setOffset(0)
    fetchPosts(true)
  }, [userId, query])

  const handleRefresh = () => {
    setOffset(0)
    fetchPosts(true)
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
      setPosts(prev => prev.filter(post => post.id !== postId))
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary-600 mx-auto" />
          <p className="mt-2 text-sm text-gray-600">Loading posts...</p>
        </div>
      </div>
    )
  }

  if (error && posts.length === 0) {
    // Don't show error for empty feed, just show empty state
    if (error.includes('Failed to load posts') || error.includes('Failed to fetch posts')) {
      // This is likely just an empty feed, not a real error
    } else {
      return (
        <div className="text-center py-8">
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
  }

  if (posts.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600 mb-4">
          {userId ? 'No posts found for this user.' : 'No posts to show yet.'}
        </p>
        <p className="text-sm text-gray-500">
          {userId ? 'Check back later for new posts.' : 'Be the first to share a worry!'}
        </p>
      </div>
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
      {!hasMore && posts.length > 0 && (
        <div className="text-center py-4">
          <p className="text-sm text-gray-500">You've reached the end</p>
        </div>
      )}
    </div>
  )
}

export default PostFeed