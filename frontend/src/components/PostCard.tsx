import React, { useState, useEffect } from 'react'
import { PostResponse } from '../services/postService'
import { User, Globe, Users, Lock, MoreHorizontal, Edit, Trash2, Calendar, FileText, Plus, Brain, CheckCircle } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { useAuth } from '../contexts/AuthContext'
import LikeButton from './LikeButton'
import MeTooButton from './MeTooButton'
import UserAvatar from './UserAvatar'
import CommentSection from './CommentSection'
import SimilarWorries from './SimilarWorries'
import ResolutionModal from './ResolutionModal'
import ResolutionDisplay from './ResolutionDisplay'
import { worryResolutionService, WorryResolution } from '../services/worryResolutionService'
import { useSafeData, safeString, safeNumber } from '../hooks/useSafeData'
import { apiRequest } from '../utils/requestQueue'

interface PostCardProps {
  post: PostResponse
  onEdit?: (post: PostResponse) => void
  onDelete?: (postId: string) => void
  onEditBlog?: (post: PostResponse) => void
  showExtended?: boolean
}

const PostCard: React.FC<PostCardProps> = ({ post, onEdit, onDelete, onEditBlog, showExtended = false }) => {
  const { user: currentUser } = useAuth()
  const [showMenu, setShowMenu] = useState(false)
  const [showFullContent, setShowFullContent] = useState(showExtended)
  const [resolution, setResolution] = useState<WorryResolution | null>(null)
  const [showResolutionModal, setShowResolutionModal] = useState(false)
  const [, setIsLoadingResolution] = useState(false)

  // Safe data handling for post properties
  const { data: safePost } = useSafeData(post, { logErrors: true })
  const safeShortContent = safeString(safePost?.shortContent, 'No content available')
  const safeLongContent = safeString(safePost?.longContent, '')
  const safeWorryPrompt = safeString(safePost?.worryPrompt, 'General worry')
  const safeUserDisplayName = safeString(safePost?.user?.displayName || safePost?.user?.username, 'Unknown User')

  const isOwner = currentUser?.id === safePost?.userId
  const hasLongContent = safeLongContent.length > 0

  // Handle potential null/undefined post gracefully
  if (!safePost) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <p className="text-gray-500 text-center">Post data unavailable</p>
      </div>
    )
  }

  // Load resolution data when component mounts
  useEffect(() => {
    loadResolution()
  }, [post.id])

  const loadResolution = async () => {
    try {
      setIsLoadingResolution(true)
      // Use low priority for resolution data as it's not immediately critical
      const resolutionData = await apiRequest.low(
        () => worryResolutionService.getResolution(post.id),
        `resolution-${post.id}`
      )
      setResolution(resolutionData)
    } catch (error: any) {
      // Only log unexpected errors (not 404s which are handled by the service)
      if (error.response?.status !== 404) {
        console.error('Failed to load resolution:', error)
      }
      // Set resolution to null for any error case
      setResolution(null)
    } finally {
      setIsLoadingResolution(false)
    }
  }

  const handleResolutionCreated = () => {
    loadResolution()
  }

  const handleMarkAsResolved = () => {
    setShowResolutionModal(true)
    setShowMenu(false)
  }

  const handleUnresolve = async () => {
    if (window.confirm('Are you sure you want to mark this worry as unresolved?')) {
      try {
        // Use high priority for user actions
        await apiRequest.high(() => worryResolutionService.unresolveWorry(post.id))
        setResolution(null)
      } catch (error) {
        console.error('Failed to unresolve worry:', error)
      }
    }
    setShowMenu(false)
  }



  const getPrivacyIcon = () => {
    switch (post.privacyLevel) {
      case 'public':
        return <Globe className="w-4 h-4 text-green-600" />
      case 'friends':
        return <Users className="w-4 h-4 text-blue-600" />
      case 'private':
        return <Lock className="w-4 h-4 text-gray-600" />
      default:
        return <Globe className="w-4 h-4 text-green-600" />
    }
  }

  const getPrivacyLabel = () => {
    switch (post.privacyLevel) {
      case 'public':
        return 'Public'
      case 'friends':
        return 'Friends'
      case 'private':
        return 'Private'
      default:
        return 'Public'
    }
  }

  const formatDate = (dateString: string) => {
    return formatDistanceToNow(new Date(dateString), { addSuffix: true })
  }

  const handleEdit = () => {
    onEdit?.(post)
    setShowMenu(false)
  }

  const handleDelete = () => {
    if (window.confirm('Are you sure you want to delete this post?')) {
      onDelete?.(post.id)
    }
    setShowMenu(false)
  }

  const handleEditBlog = () => {
    onEditBlog?.(post)
    setShowMenu(false)
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-start space-x-3">
          {/* Avatar */}
          <UserAvatar 
            user={{
              id: post.userId,
              username: post.user.username,
              displayName: post.user.displayName,
              avatarUrl: post.user.avatarUrl
            }}
            size="md"
          />

          {/* User Info */}
          <div className="flex-1">
            <div className="flex items-center space-x-2">
              <h3 className="text-sm font-medium text-gray-900">
                {post.user.displayName || post.user.username}
              </h3>
              {post.user.displayName && (
                <span className="text-sm text-gray-500">@{post.user.username}</span>
              )}
            </div>
            <div className="flex items-center space-x-2 mt-1">
              <div className="flex items-center space-x-1">
                {getPrivacyIcon()}
                <span className="text-xs text-gray-500">{getPrivacyLabel()}</span>
              </div>
              <span className="text-xs text-gray-500">•</span>
              <span className="text-xs text-gray-500">
                {post.publishedAt ? formatDate(post.publishedAt) : 'Draft'}
              </span>
              {post.isScheduled && !post.publishedAt && (
                <>
                  <span className="text-xs text-gray-500">•</span>
                  <div className="flex items-center space-x-1">
                    <Calendar className="w-3 h-3 text-blue-600" />
                    <span className="text-xs text-blue-600">Scheduled</span>
                  </div>
                </>
              )}
              {!post.commentsEnabled && (
                <>
                  <span className="text-xs text-gray-500">•</span>
                  <div className="flex items-center space-x-1">
                    <Lock className="w-3 h-3 text-gray-500" />
                    <span className="text-xs text-gray-500">Comments disabled</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Menu */}
        {isOwner && (
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
            >
              <MoreHorizontal className="w-5 h-5" />
            </button>

            {showMenu && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-md shadow-lg border border-gray-200 z-10">
                <div className="py-1">
                  <button
                    onClick={handleEdit}
                    className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Edit Post
                  </button>
                  <button
                    onClick={handleEditBlog}
                    className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    {hasLongContent ? (
                      <>
                        <FileText className="w-4 h-4 mr-2" />
                        Edit Blog Content
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4 mr-2" />
                        Add Blog Content
                      </>
                    )}
                  </button>
                  <div className="border-t border-gray-100 my-1"></div>
                  {resolution ? (
                    <button
                      onClick={handleUnresolve}
                      className="flex items-center w-full px-4 py-2 text-sm text-orange-600 hover:bg-gray-100"
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Mark as Unresolved
                    </button>
                  ) : (
                    <button
                      onClick={handleMarkAsResolved}
                      className="flex items-center w-full px-4 py-2 text-sm text-green-600 hover:bg-gray-100"
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Mark as Resolved
                    </button>
                  )}
                  <div className="border-t border-gray-100 my-1"></div>
                  <button
                    onClick={handleDelete}
                    className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete Post
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Worry Prompt */}
      <div className="mb-3">
        <p className="text-sm text-gray-600 italic">"{post.worryPrompt}"</p>
      </div>

      {/* Content */}
      <div className="space-y-3">
        {/* Short Content */}
        <div>
          <p className="text-gray-900 whitespace-pre-wrap">{post.shortContent}</p>
        </div>

        {/* Blog Content Indicator */}
        {hasLongContent && !showFullContent && (
          <div className="flex items-center space-x-2 py-2">
            <FileText className="w-4 h-4 text-primary-600" />
            <span className="text-sm text-gray-600">Extended blog content available</span>
            <button
              onClick={() => setShowFullContent(true)}
              className="text-sm text-primary-600 hover:text-primary-700 font-medium"
            >
              Read full post →
            </button>
          </div>
        )}

        {/* Extended Blog Content */}
        {hasLongContent && showFullContent && (
          <div className="space-y-3">
            <div className="border-t border-gray-200 pt-4">
              <div className="flex items-center space-x-2 mb-3">
                <FileText className="w-4 h-4 text-primary-600" />
                <span className="text-sm font-medium text-gray-700">Extended Thoughts</span>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-gray-800 whitespace-pre-wrap leading-relaxed">{post.longContent}</p>
              </div>
            </div>
            <button
              onClick={() => setShowFullContent(false)}
              className="text-sm text-primary-600 hover:text-primary-700 font-medium"
            >
              ← Show less
            </button>
          </div>
        )}
      </div>

      {/* Count Metrics - Only numbers, no content */}
      {post.privacyLevel === 'public' && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <div className="flex justify-start">
            {/* Similar Worries Count - AI + Me Too combined - moved to left */}
            <SimilarWorries postId={post.id} />
          </div>
        </div>
      )}

      {/* Social Actions */}
      <div className="mt-4 pt-4 border-t border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <LikeButton postId={post.id} />
            <MeTooButton postId={post.id} />
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => window.open(`/analysis/${post.id}`, '_blank')}
              className="flex items-center space-x-1 text-sm text-gray-500 hover:text-blue-600 transition-colors"
              title="View detailed analysis"
            >
              <Brain className="w-4 h-4" />
              <span>Analysis</span>
            </button>
          </div>
        </div>
      </div>

      {/* Resolution Display */}
      {resolution && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <ResolutionDisplay resolution={resolution} />
        </div>
      )}

      {/* Comments Section */}
      {post.commentsEnabled ? (
        <CommentSection postId={post.id} commentsEnabled={post.commentsEnabled} />
      ) : (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <div className="flex items-center justify-center py-3 text-gray-500">
            <Lock className="w-4 h-4 mr-2" />
            <span className="text-sm">Comments are disabled for this post</span>
          </div>
        </div>
      )}

      {/* Resolution Modal */}
      <ResolutionModal
        isOpen={showResolutionModal}
        onClose={() => setShowResolutionModal(false)}
        postId={post.id}
        postContent={`${post.worryPrompt} ${post.shortContent}`}
        onResolutionCreated={handleResolutionCreated}
      />

      {/* Click outside to close menu */}
      {showMenu && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => setShowMenu(false)}
        />
      )}
    </div>
  )
}

export default PostCard