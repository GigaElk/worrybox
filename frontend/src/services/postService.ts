import api from './api'

export interface CreatePostRequest {
  shortContent: string
  worryPrompt: string
  privacyLevel: 'public' | 'friends' | 'private'
  longContent?: string
  isScheduled?: boolean
  scheduledFor?: string
}

export interface UpdatePostRequest {
  shortContent?: string
  longContent?: string
  privacyLevel?: 'public' | 'friends' | 'private'
  worryPrompt?: string
}

export interface AddBlogContentRequest {
  longContent: string
}

export interface PostResponse {
  id: string
  userId: string
  shortContent: string
  longContent?: string
  worryPrompt: string
  privacyLevel: string
  isScheduled: boolean
  scheduledFor?: string
  publishedAt?: string
  detectedLanguage?: string
  createdAt: string
  updatedAt: string
  user: {
    id: string
    username: string
    displayName?: string
    avatarUrl?: string
  }
}

export interface PostsQuery {
  limit?: number
  offset?: number
  userId?: string
  privacyLevel?: 'public' | 'friends' | 'private'
  includeScheduled?: boolean
}

export interface PostsResponse {
  posts: PostResponse[]
  total: number
  hasMore: boolean
}

export const postService = {
  // Create a new post
  async createPost(data: CreatePostRequest): Promise<PostResponse> {
    const response = await api.post('/posts', data)
    return response.data.data
  },

  // Update an existing post
  async updatePost(postId: string, data: UpdatePostRequest): Promise<PostResponse> {
    const response = await api.put(`/posts/${postId}`, data)
    return response.data.data
  },

  // Delete a post
  async deletePost(postId: string): Promise<void> {
    await api.delete(`/posts/${postId}`)
  },

  // Get a specific post
  async getPost(postId: string): Promise<PostResponse> {
    const response = await api.get(`/posts/${postId}`)
    return response.data.data
  },

  // Get posts with optional filtering
  async getPosts(query: PostsQuery = {}): Promise<PostsResponse> {
    const params = new URLSearchParams()
    if (query.limit) params.append('limit', query.limit.toString())
    if (query.offset) params.append('offset', query.offset.toString())
    if (query.privacyLevel) params.append('privacyLevel', query.privacyLevel)
    if (query.includeScheduled) params.append('includeScheduled', 'true')

    const response = await api.get(`/posts?${params.toString()}`)
    return response.data.data
  },

  // Get posts by a specific user
  async getUserPosts(userId: string, query: Omit<PostsQuery, 'userId'> = {}): Promise<PostsResponse> {
    const params = new URLSearchParams()
    if (query.limit) params.append('limit', query.limit.toString())
    if (query.offset) params.append('offset', query.offset.toString())
    if (query.privacyLevel) params.append('privacyLevel', query.privacyLevel)
    if (query.includeScheduled) params.append('includeScheduled', 'true')

    const response = await api.get(`/posts/user/${userId}?${params.toString()}`)
    return response.data.data
  },

  // Add blog content to an existing post
  async addBlogContent(postId: string, data: AddBlogContentRequest): Promise<PostResponse> {
    const response = await api.post(`/posts/${postId}/blog`, data)
    return response.data.data
  },

  // Remove blog content from a post
  async removeBlogContent(postId: string): Promise<PostResponse> {
    const response = await api.delete(`/posts/${postId}/blog`)
    return response.data.data
  },

  // Get available worry prompts
  async getWorryPrompts(): Promise<string[]> {
    const response = await api.get('/posts/prompts')
    return response.data.data.prompts
  },
}