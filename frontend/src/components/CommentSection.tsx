import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { commentService, CommentResponse } from '../services/commentService'
import { MessageCircle, Send, Edit2, Trash2, Loader2, Reply, Flag, AlertTriangle } from 'lucide-react'
import UserAvatar from './UserAvatar'
import toast from 'react-hot-toast'

interface CommentSectionProps {
  postId: string
  className?: string
  commentsEnabled?: boolean
}

const CommentSection: React.FC<CommentSectionProps> = ({ postId, className = '', commentsEnabled = true }) => {
  const { user, isAuthenticated } = useAuth()
  const [comments, setComments] = useState<CommentResponse[]>([])
  const [commentCount, setCommentCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [newComment, setNewComment] = useState('')
  const [editingComment, setEditingComment] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')
  const [showComments, setShowComments] = useState(false)
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [replyContent, setReplyContent] = useState('')
  const [reportingComment, setReportingComment] = useState<string | null>(null)
  const [reportReason, setReportReason] = useState<'spam' | 'harassment' | 'inappropriate' | 'misinformation' | 'other'>('spam')
  const [reportDetails, setReportDetails] = useState('')

  useEffect(() => {
    loadComments()
  }, [postId])

  const loadComments = async () => {
    try {
      setIsLoading(true)
      const [commentsData, count] = await Promise.all([
        commentService.getCommentsWithReplies(postId, 10, 0), // Use threaded comments
        commentService.getCommentCount(postId)
      ])
      setComments(commentsData.comments)
      setCommentCount(count)
    } catch (error) {
      console.error('Failed to load comments:', error)
      toast.error('Failed to load comments')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isAuthenticated) {
      toast.error('Please log in to comment')
      return
    }
    if (!commentsEnabled) {
      toast.error('Comments are disabled for this post')
      return
    }
    if (!newComment.trim()) return

    setIsSubmitting(true)
    try {
      const comment = await commentService.createComment(postId, {
        content: newComment.trim()
      })
      setComments(prev => [comment, ...prev])
      setCommentCount(prev => prev + 1)
      setNewComment('')
      toast.success('Comment added successfully')
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Failed to add comment')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEditComment = async (commentId: string) => {
    if (!editContent.trim()) return

    try {
      const updatedComment = await commentService.updateComment(commentId, {
        content: editContent.trim()
      })
      setComments(prev => prev.map(c => c.id === commentId ? updatedComment : c))
      setEditingComment(null)
      setEditContent('')
      toast.success('Comment updated successfully')
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Failed to update comment')
    }
  }

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm('Are you sure you want to delete this comment?')) return

    try {
      await commentService.deleteComment(commentId)
      setComments(prev => prev.filter(c => c.id !== commentId))
      setCommentCount(prev => prev - 1)
      toast.success('Comment deleted successfully')
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Failed to delete comment')
    }
  }

  const handleSubmitReply = async (parentCommentId: string) => {
    if (!isAuthenticated) {
      toast.error('Please log in to reply')
      return
    }
    if (!replyContent.trim()) return

    try {
      const reply = await commentService.createComment(postId, {
        content: replyContent.trim(),
        parentCommentId
      })
      
      // Add reply to the parent comment's replies array
      setComments(prev => prev.map(comment => {
        if (comment.id === parentCommentId) {
          return {
            ...comment,
            replies: [...(comment.replies || []), reply],
            replyCount: (comment.replyCount || 0) + 1
          }
        }
        return comment
      }))
      
      setReplyingTo(null)
      setReplyContent('')
      toast.success('Reply added successfully')
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Failed to add reply')
    }
  }

  const handleReportComment = async (commentId: string) => {
    if (!isAuthenticated) {
      toast.error('Please log in to report comments')
      return
    }

    try {
      await commentService.reportComment(commentId, {
        reason: reportReason,
        details: reportDetails || undefined
      })
      
      setReportingComment(null)
      setReportReason('spam')
      setReportDetails('')
      toast.success('Comment reported successfully. Thank you for helping keep our community safe.')
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Failed to report comment')
    }
  }

  const startEdit = (comment: CommentResponse) => {
    setEditingComment(comment.id)
    setEditContent(comment.content)
  }

  const cancelEdit = () => {
    setEditingComment(null)
    setEditContent('')
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString() + ' at ' + date.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    })
  }

  return (
    <div className={`border-t border-gray-200 pt-4 ${className}`}>
      {/* Comment count and toggle */}
      <button
        onClick={() => setShowComments(!showComments)}
        className="flex items-center space-x-2 text-gray-600 hover:text-gray-800 mb-4"
      >
        <MessageCircle className="w-5 h-5" />
        <span className="text-sm font-medium">
          {commentCount} {commentCount === 1 ? 'comment' : 'comments'}
        </span>
      </button>

      {showComments && (
        <div className="space-y-4">
          {/* New comment form */}
          {isAuthenticated && (
            <form onSubmit={handleSubmitComment} className="space-y-3">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Write a comment..."
                className="w-full p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={3}
                maxLength={1000}
              />
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">
                  {newComment.length}/1000 characters
                </span>
                <button
                  type="submit"
                  disabled={isSubmitting || !newComment.trim()}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  <span>Comment</span>
                </button>
              </div>
            </form>
          )}

          {/* Comments list */}
          {isLoading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
          ) : comments.length === 0 ? (
            <p className="text-gray-500 text-center py-4">
              No comments yet. Be the first to comment!
            </p>
          ) : (
            <div className="space-y-4">
              {comments.map((comment) => (
                <div key={comment.id} className="bg-gray-50 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center space-x-2">
                      <UserAvatar 
                        user={{
                          id: comment.userId,
                          username: comment.user.username,
                          displayName: comment.user.displayName,
                          avatarUrl: comment.user.avatarUrl
                        }}
                        size="sm"
                      />
                      <div>
                        <div className="flex items-center space-x-2">
                          <p className="font-medium text-sm">
                            {comment.user.displayName || comment.user.username}
                          </p>
                          {comment.moderationStatus && comment.moderationStatus !== 'approved' && (
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              comment.moderationStatus === 'pending' 
                                ? 'bg-yellow-100 text-yellow-800'
                                : comment.moderationStatus === 'flagged'
                                ? 'bg-orange-100 text-orange-800'
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {comment.moderationStatus}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500">
                          {formatDate(comment.createdAt)}
                          {comment.updatedAt !== comment.createdAt && ' (edited)'}
                        </p>
                      </div>
                    </div>
                    
                    {user?.id === comment.userId && (
                      <div className="flex space-x-1">
                        <button
                          onClick={() => startEdit(comment)}
                          className="p-1 text-gray-400 hover:text-blue-600"
                          title="Edit comment"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteComment(comment.id)}
                          className="p-1 text-gray-400 hover:text-red-600"
                          title="Delete comment"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                  
                  {editingComment === comment.id ? (
                    <div className="space-y-2">
                      <textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        rows={3}
                        maxLength={1000}
                      />
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={cancelEdit}
                          className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleEditComment(comment.id)}
                          disabled={!editContent.trim()}
                          className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                        >
                          Save
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <p className="text-gray-700 whitespace-pre-wrap">
                        {comment.content}
                      </p>
                      
                      {/* Comment Actions */}
                      <div className="flex items-center space-x-4 text-sm">
                        {isAuthenticated && (
                          <button
                            onClick={() => setReplyingTo(comment.id)}
                            className="flex items-center space-x-1 text-gray-500 hover:text-blue-600"
                          >
                            <Reply className="w-4 h-4" />
                            <span>Reply</span>
                          </button>
                        )}
                        
                        {isAuthenticated && user?.id !== comment.userId && (
                          <button
                            onClick={() => setReportingComment(comment.id)}
                            className="flex items-center space-x-1 text-gray-500 hover:text-red-600"
                          >
                            <Flag className="w-4 h-4" />
                            <span>Report</span>
                          </button>
                        )}
                        
                        {comment.replyCount && comment.replyCount > 0 && (
                          <span className="text-gray-500">
                            {comment.replyCount} {comment.replyCount === 1 ? 'reply' : 'replies'}
                          </span>
                        )}
                      </div>

                      {/* Reply Form */}
                      {replyingTo === comment.id && (
                        <div className="ml-6 space-y-2">
                          <textarea
                            value={replyContent}
                            onChange={(e) => setReplyContent(e.target.value)}
                            placeholder="Write a reply..."
                            className="w-full p-2 border border-gray-300 rounded resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            rows={2}
                            maxLength={1000}
                          />
                          <div className="flex justify-end space-x-2">
                            <button
                              onClick={() => setReplyingTo(null)}
                              className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => handleSubmitReply(comment.id)}
                              disabled={!replyContent.trim()}
                              className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                            >
                              Reply
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Nested Replies */}
                      {comment.replies && comment.replies.length > 0 && (
                        <div className="ml-6 space-y-3 border-l-2 border-gray-200 pl-4">
                          {comment.replies.map((reply) => (
                            <div key={reply.id} className="bg-white rounded-lg p-3 border border-gray-100">
                              <div className="flex justify-between items-start mb-2">
                                <div className="flex items-center space-x-2">
                                  <UserAvatar 
                                    user={{
                                      id: reply.userId,
                                      username: reply.user.username,
                                      displayName: reply.user.displayName,
                                      avatarUrl: reply.user.avatarUrl
                                    }}
                                    size="xs"
                                  />
                                  <div>
                                    <div className="flex items-center space-x-2">
                                      <p className="font-medium text-sm">
                                        {reply.user.displayName || reply.user.username}
                                      </p>
                                      {reply.moderationStatus && reply.moderationStatus !== 'approved' && (
                                        <span className={`px-1 py-0.5 text-xs rounded ${
                                          reply.moderationStatus === 'pending' 
                                            ? 'bg-yellow-100 text-yellow-800'
                                            : reply.moderationStatus === 'flagged'
                                            ? 'bg-orange-100 text-orange-800'
                                            : 'bg-red-100 text-red-800'
                                        }`}>
                                          {reply.moderationStatus}
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-xs text-gray-500">
                                      {formatDate(reply.createdAt)}
                                    </p>
                                  </div>
                                </div>
                                
                                {user?.id === reply.userId && (
                                  <div className="flex space-x-1">
                                    <button
                                      onClick={() => handleDeleteComment(reply.id)}
                                      className="p-1 text-gray-400 hover:text-red-600"
                                      title="Delete reply"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  </div>
                                )}
                              </div>
                              
                              <p className="text-gray-700 text-sm whitespace-pre-wrap">
                                {reply.content}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Report Comment Modal */}
      {reportingComment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center space-x-2 mb-4">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              <h3 className="text-lg font-medium text-gray-900">Report Comment</h3>
            </div>
            
            <p className="text-sm text-gray-600 mb-4">
              Help us keep the community safe by reporting inappropriate content.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reason for reporting
                </label>
                <select
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value as any)}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="spam">Spam</option>
                  <option value="harassment">Harassment or bullying</option>
                  <option value="inappropriate">Inappropriate content</option>
                  <option value="misinformation">Misinformation</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Additional details (optional)
                </label>
                <textarea
                  value={reportDetails}
                  onChange={(e) => setReportDetails(e.target.value)}
                  placeholder="Provide more context about why you're reporting this comment..."
                  className="w-full p-2 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                  maxLength={500}
                />
                <div className="text-right text-xs text-gray-500 mt-1">
                  {reportDetails.length}/500 characters
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setReportingComment(null)
                  setReportReason('spam')
                  setReportDetails('')
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={() => handleReportComment(reportingComment)}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700"
              >
                Submit Report
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default CommentSection