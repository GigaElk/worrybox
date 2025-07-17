import api from './api'

export interface CommentResponse {
  id: string
  content: string
  userId: string
  postId: string
  parentCommentId?: string
  moderationStatus: string
  moderationScore?: number
  createdAt: string
  updatedAt: string
  user: {
    id: string
    username: string
    displayName?: string
    avatarUrl?: string
  }
  replies?: CommentResponse[]
  replyCount?: number
}

export interface CommentsResponse {
  comments: CommentResponse[]
  total: number
  hasMore: boolean
}

export interface CreateCommentRequest {
  content: string
  parentCommentId?: string // For nested replies
}

export interface UpdateCommentRequest {
  content: string
}

export interface ReportCommentRequest {
  reason: 'spam' | 'harassment' | 'inappropriate' | 'misinformation' | 'other'
  details?: string
}

export const commentService = {
  // Create a comment on a post
  async createComment(postId: string, data: CreateCommentRequest): Promise<CommentResponse> {
    const response = await api.post(`/comments/post/${postId}`, data)
    return response.data.data
  },

  // Update a comment
  async updateComment(commentId: string, data: UpdateCommentRequest): Promise<CommentResponse> {
    const response = await api.put(`/comments/${commentId}`, data)
    return response.data.data
  },

  // Delete a comment
  async deleteComment(commentId: string): Promise<void> {
    await api.delete(`/comments/${commentId}`)
  },

  // Get a specific comment
  async getComment(commentId: string): Promise<CommentResponse> {
    const response = await api.get(`/comments/${commentId}`)
    return response.data.data
  },

  // Get comments for a post (flat list)
  async getCommentsByPost(postId: string, limit = 20, offset = 0): Promise<CommentsResponse> {
    const params = new URLSearchParams()
    if (limit) params.append('limit', limit.toString())
    if (offset) params.append('offset', offset.toString())

    const response = await api.get(`/comments/post/${postId}?${params.toString()}`)
    return response.data.data
  },

  // Get comments with nested threading
  async getCommentsWithReplies(postId: string, limit = 20, offset = 0, includeModerated = false): Promise<CommentsResponse> {
    const params = new URLSearchParams()
    if (limit) params.append('limit', limit.toString())
    if (offset) params.append('offset', offset.toString())
    if (includeModerated) params.append('includeModerated', 'true')

    const response = await api.get(`/comments/post/${postId}/threaded?${params.toString()}`)
    return response.data.data
  },

  // Get comment count for a post
  async getCommentCount(postId: string): Promise<number> {
    const response = await api.get(`/comments/post/${postId}/count`)
    return response.data.data.count
  },

  // Report a comment
  async reportComment(commentId: string, data: ReportCommentRequest): Promise<void> {
    await api.post(`/comments/${commentId}/report`, data)
  },

  // Get reports for a comment (admin only)
  async getCommentReports(commentId: string): Promise<any[]> {
    const response = await api.get(`/comments/${commentId}/reports`)
    return response.data.data
  },

  // Get reply count for a comment
  async getReplyCount(commentId: string): Promise<number> {
    const response = await api.get(`/comments/${commentId}/replies/count`)
    return response.data.data.count
  }
}