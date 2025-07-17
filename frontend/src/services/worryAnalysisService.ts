import api from './api'

export interface WorryAnalysisResult {
  category: string
  subcategory?: string
  sentimentScore: number // -1 to 1, where -1 is most negative
  keywords: string[]
  similarWorryCount: number
  confidence: number // 0-1, confidence in the analysis
}

export interface SimilarWorry {
  id: string
  shortContent: string
  category: string
  subcategory?: string
  similarity: number // 0-1 similarity score
  anonymousCount: number
}

export interface WorryCategory {
  category: string
  count: number
  percentage: number
}

export const worryAnalysisService = {
  // Analyze a worry post
  async analyzeWorry(postId: string): Promise<WorryAnalysisResult> {
    const response = await api.post(`/analysis/posts/${postId}/analyze`)
    return response.data.data
  },

  // Get analysis for a worry post
  async getWorryAnalysis(postId: string): Promise<WorryAnalysisResult | null> {
    try {
      const response = await api.get(`/analysis/posts/${postId}`)
      return response.data.data
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null
      }
      throw error
    }
  },

  // Find similar worries
  async findSimilarWorries(postId: string, limit = 5): Promise<SimilarWorry[]> {
    const response = await api.get(`/analysis/posts/${postId}/similar?limit=${limit}`)
    return response.data.data
  },

  // Get worry categories and statistics
  async getWorryCategories(): Promise<WorryCategory[]> {
    const response = await api.get('/analysis/categories')
    return response.data.data
  },

  // Update similar worry counts (admin function)
  async updateSimilarWorryCounts(): Promise<void> {
    await api.post('/analysis/update-counts')
  }
}