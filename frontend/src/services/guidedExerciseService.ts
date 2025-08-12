import api from './api'

export interface Exercise {
  id: string
  title: string
  description: string
  category: string
  duration: number // in minutes
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  steps: ExerciseStep[]
  tags: string[]
  imageUrl?: string
  videoUrl?: string
  audioUrl?: string
  createdAt: string
  updatedAt: string
}

export interface ExerciseStep {
  id: string
  order: number
  title: string
  content: string
  duration?: number // in seconds
  imageUrl?: string
}

export interface CopingTechnique {
  id: string
  title: string
  description: string
  category: string
  instructions: string
  whenToUse: string[]
  effectiveness: number // 1-5 scale
  scienceBasedRating: number // 1-5 scale
  tags: string[]
  imageUrl?: string
  resources?: Resource[]
  createdAt: string
  updatedAt: string
}

export interface Resource {
  title: string
  description: string
  url: string
  type: 'article' | 'video' | 'audio' | 'book' | 'app' | 'website'
}

export interface ExerciseProgress {
  id: string
  userId: string
  exerciseId: string
  completed: boolean
  currentStep: number
  startedAt: string
  completedAt?: string
  notes?: string
  rating?: number // 1-5 scale
  effectiveness?: number // 1-5 scale
  exercise: Exercise
}

export interface ExerciseRecommendation {
  exercise: Exercise
  relevanceScore: number // 0-1 scale
  reason: string
}

export const guidedExerciseService = {
  // Get all available exercises
  async getAllExercises(category?: string): Promise<Exercise[]> {
    const url = category ? `/wellness/exercises/popular?category=${encodeURIComponent(category)}` : '/wellness/exercises/popular'
    const response = await api.get(url)
    return response.data.data
  },

  // Get a specific exercise by ID
  async getExerciseById(id: string): Promise<Exercise> {
    const response = await api.get(`/wellness/exercises/${id}`)
    return response.data.data
  },

  // Get all available coping techniques
  async getAllCopingTechniques(category?: string): Promise<CopingTechnique[]> {
    const url = category ? `/wellness/techniques?category=${encodeURIComponent(category)}` : '/wellness/techniques'
    const response = await api.get(url)
    return response.data.data
  },

  // Get a specific coping technique by ID
  async getCopingTechniqueById(id: string): Promise<CopingTechnique> {
    const response = await api.get(`/wellness/techniques/${id}`)
    return response.data.data
  },

  // Get exercise categories
  async getExerciseCategories(): Promise<string[]> {
    const response = await api.get('/wellness/exercises/categories')
    return response.data.data
  },

  // Get coping technique categories
  async getCopingTechniqueCategories(): Promise<string[]> {
    const response = await api.get('/wellness/techniques/categories')
    return response.data.data
  },

  // Start an exercise for a user
  async startExercise(exerciseId: string): Promise<ExerciseProgress> {
    const response = await api.post(`/wellness/exercises/${exerciseId}/start`)
    return response.data.data
  },

  // Update exercise progress
  async updateExerciseProgress(
    progressId: string,
    data: {
      currentStep?: number
      completed?: boolean
      notes?: string
      rating?: number
      effectiveness?: number
    }
  ): Promise<ExerciseProgress> {
    const response = await api.put(`/wellness/progress/${progressId}`, data)
    return response.data.data
  },

  // Get user's exercise progress history
  async getUserExerciseHistory(): Promise<ExerciseProgress[]> {
    const response = await api.get('/wellness/history')
    return response.data.data
  },

  // Get personalized exercise recommendations
  async getRecommendedExercises(limit: number = 3): Promise<ExerciseRecommendation[]> {
    const response = await api.get(`/wellness/recommendations?limit=${limit}`)
    return response.data.data
  }
}