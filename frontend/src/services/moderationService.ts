import api from './api'

export interface ModerationQueueItem {
  id: string
  commentId: string
  content: string
  moderationStatus: string
  moderationScore?: number
  flaggedReasons?: string[]
  createdAt: string
  updatedAt: string
  comment: {
    id: string
    content: string
    postId: string
    userId: string
    user: {
      id: string
      username: string
      displayName?: string
    }
    post: {
      id: string
      shortContent: string
      user: {
        id: string
        username: string
        displayName?: string
      }
    }
  }
}

export interface ModerationQueueResponse {
  items: ModerationQueueItem[]
  total: number
  hasMore: boolean
}

export interface ModerationStats {
  totalComments: number
  pendingReview: number
  approvedComments: number
  flaggedComments: number
  rejectedComments: number
  averageModerationScore: number
}

export interface ReviewCommentRequest {
  decision: 'approve' | 'reject'
  notes?: string
}

export const moderationService = {
  // Get moderation queue items
  async getModerationQueue(
    limit = 20, 
    offset = 0, 
    status?: 'pending' | 'reviewed'
  ): Promise<ModerationQueueResponse> {
    const params = new URLSearchParams()
    if (limit) params.append('limit', limit.toString())
    if (offset) params.append('offset', offset.toString())
    if (status) params.append('status', status)

    const response = await api.get(`/moderation/queue?${params.toString()}`)
    return response.data.data
  },

  // Review a comment (approve or reject)
  async reviewComment(queueItemId: string, data: ReviewCommentRequest): Promise<void> {
    await api.post(`/moderation/review/${queueItemId}`, data)
  },

  // Get moderation statistics
  async getModerationStats(): Promise<ModerationStats> {
    const response = await api.get('/moderation/stats')
    return response.data.data
  },

  // Manually trigger moderation for a comment
  async moderateComment(commentId: string, content: string): Promise<{
    status: string
    score: number
    reasons?: string[]
    confidence: number
  }> {
    const response = await api.post(`/moderation/moderate/${commentId}`, { content })
    return response.data.data
  }
}