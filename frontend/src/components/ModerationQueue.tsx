import React, { useState, useEffect } from 'react'
import { moderationService, ModerationQueueItem } from '../services/moderationService'
import { AlertTriangle, CheckCircle, XCircle, MessageSquare, User, Clock, Loader2 } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import toast from 'react-hot-toast'

const ModerationQueue: React.FC = () => {
  const [queueItems, setQueueItems] = useState<ModerationQueueItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filter, setFilter] = useState<'pending' | 'reviewed' | 'all'>('pending')
  const [reviewingItem, setReviewingItem] = useState<string | null>(null)
  const [reviewNotes, setReviewNotes] = useState('')

  useEffect(() => {
    loadQueue()
  }, [filter])

  const loadQueue = async () => {
    try {
      setIsLoading(true)
      const status = filter === 'all' ? undefined : filter
      const response = await moderationService.getModerationQueue(50, 0, status)
      setQueueItems(response.items)
    } catch (error) {
      console.error('Failed to load moderation queue:', error)
      toast.error('Failed to load moderation queue')
    } finally {
      setIsLoading(false)
    }
  }

  const handleReview = async (queueItemId: string, decision: 'approve' | 'reject') => {
    try {
      setReviewingItem(queueItemId)
      await moderationService.reviewComment(queueItemId, {
        decision,
        notes: reviewNotes || undefined
      })
      
      toast.success(`Comment ${decision}d successfully`)
      setReviewNotes('')
      loadQueue() // Reload the queue
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || `Failed to ${decision} comment`)
    } finally {
      setReviewingItem(null)
    }
  }

  const getModerationStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'text-green-600 bg-green-100'
      case 'flagged':
        return 'text-yellow-600 bg-yellow-100'
      case 'rejected':
        return 'text-red-600 bg-red-100'
      default:
        return 'text-gray-600 bg-gray-100'
    }
  }

  const getModerationIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="w-4 h-4" />
      case 'flagged':
        return <AlertTriangle className="w-4 h-4" />
      case 'rejected':
        return <XCircle className="w-4 h-4" />
      default:
        return <Clock className="w-4 h-4" />
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Moderation Queue</h2>
        
        <div className="flex space-x-2">
          <button
            onClick={() => setFilter('pending')}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              filter === 'pending'
                ? 'bg-yellow-100 text-yellow-800'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Pending
          </button>
          <button
            onClick={() => setFilter('reviewed')}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              filter === 'reviewed'
                ? 'bg-green-100 text-green-800'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Reviewed
          </button>
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              filter === 'all'
                ? 'bg-blue-100 text-blue-800'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            All
          </button>
        </div>
      </div>

      {queueItems.length === 0 ? (
        <div className="text-center py-12">
          <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Items in Queue</h3>
          <p className="text-gray-600">
            {filter === 'pending' 
              ? 'No comments are currently pending review.'
              : filter === 'reviewed'
              ? 'No comments have been reviewed yet.'
              : 'The moderation queue is empty.'
            }
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {queueItems.map((item) => (
            <div key={item.id} className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${getModerationStatusColor(item.moderationStatus)}`}>
                    {getModerationIcon(item.moderationStatus)}
                    <span className="capitalize">{item.moderationStatus}</span>
                  </div>
                  
                  {item.moderationScore && (
                    <div className="text-sm text-gray-600">
                      Risk Score: {Math.round(item.moderationScore * 100)}%
                    </div>
                  )}
                </div>
                
                <div className="text-sm text-gray-500">
                  {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
                </div>
              </div>

              {/* Comment Content */}
              <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <User className="w-4 h-4 text-gray-400" />
                  <span className="text-sm font-medium text-gray-700">
                    {item.comment.user.displayName || item.comment.user.username}
                  </span>
                  <span className="text-sm text-gray-500">commented on</span>
                  <span className="text-sm text-gray-700">
                    "{item.comment.post.shortContent.substring(0, 50)}..."
                  </span>
                </div>
                <p className="text-gray-900 whitespace-pre-wrap">{item.content}</p>
              </div>

              {/* Flagged Reasons */}
              {item.flaggedReasons && item.flaggedReasons.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Flagged for:</h4>
                  <div className="flex flex-wrap gap-2">
                    {item.flaggedReasons.map((reason, index) => (
                      <span
                        key={index}
                        className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full"
                      >
                        {reason}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Review Actions (only for pending items) */}
              {item.moderationStatus === 'flagged' && filter === 'pending' && (
                <div className="border-t border-gray-200 pt-4">
                  <div className="mb-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Review Notes (Optional)
                    </label>
                    <textarea
                      value={reviewNotes}
                      onChange={(e) => setReviewNotes(e.target.value)}
                      placeholder="Add notes about your decision..."
                      className="w-full p-2 border border-gray-300 rounded-lg text-sm resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      rows={2}
                    />
                  </div>
                  
                  <div className="flex space-x-3">
                    <button
                      onClick={() => handleReview(item.id, 'approve')}
                      disabled={reviewingItem === item.id}
                      className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {reviewingItem === item.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <CheckCircle className="w-4 h-4" />
                      )}
                      <span>Approve</span>
                    </button>
                    
                    <button
                      onClick={() => handleReview(item.id, 'reject')}
                      disabled={reviewingItem === item.id}
                      className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {reviewingItem === item.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <XCircle className="w-4 h-4" />
                      )}
                      <span>Reject</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default ModerationQueue