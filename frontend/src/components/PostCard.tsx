import React, { useState, useEffect } from 'react'
import { PostResponse } from '../services/postService'
import { User, Globe, Users, Lock, MoreHorizontal, Edit, Trash2, Calendar, FileText, Plus, Brain, CheckCircle } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { useAuth } from '../contexts/AuthContext'
import LikeButton from './LikeButton'
import CommentSection from './CommentSection'
import SimilarWorries from './SimilarWorries'
import ResolutionModal from './ResolutionModal'
import ResolutionDisplay from './ResolutionDisplay'
import { worryResolutionService, WorryResolution } from '../services/worryResolutionService'

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

  const isOwner = currentUser?.id === post.userId
  const hasLongContent = post.longContent && post.longContent.length > 0

  // Load resolution data when component mounts
  useEffect(() => {
    loadResolution()
  }, [post.id])

  const loadResolution = async () => {
    try {
      setIsLoadingResolution(true)
      const resolutionData = await worryResolutionService.getResolution(post.id)
      setResolution(resolutionData)
    } catch (error) {
      console.error('Failed to load resolution:', error)
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
        await worryResolutionService.unresolveWorry(post.id)
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
          <div className="flex-shrink-0">
            {post.user.avatarUrl ? (
              <img
                src={post.user.avatarUrl}
                alt={post.user.displayName || post.user.username}
                className="w-10 h-10 rounded-full object-cover"
                onError={(e) => {
                  const target = e.target as HTMLImageElement
                  target.style.display = 'none'
                  target.nextElementSibling?.classList.remove('hidden')
                }}
              />
            ) : null}
            <div
              className={`w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center ${
                post.user.avatarUrl ? 'hidden' : ''
              }`}
            >
              <User className="w-5 h-5 text-gray-400" />
            </div>
          </div>

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

      {/* Similar Worries */}
      {post.privacyLevel === 'public' && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <SimilarWorries postId={post.id} limit={3} />
        </div>
      )}

      {/* Social Actions */}
      <div className="mt-4 pt-4 border-t border-gray-100">
        <div className="flex items-center justify-between">
          <LikeButton postId={post.id} />
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
      <CommentSection postId={post.id} />

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