import api from './api'

export interface SupportedLanguage {
  id: string
  code: string
  name: string
  nativeName: string
  isActive: boolean
  createdAt: string
}

export interface UserLanguagePreference {
  id: string
  userId: string
  languageCode: string
  createdAt: string
  updatedAt: string
}

export const languageService = {
  // Get all supported languages
  async getSupportedLanguages(): Promise<SupportedLanguage[]> {
    const response = await api.get('/languages/supported')
    return response.data.data
  },

  // Get user's language preference
  async getUserLanguagePreference(): Promise<UserLanguagePreference | null> {
    const response = await api.get('/languages/preference')
    return response.data.data
  },

  // Set user's language preference
  async setUserLanguagePreference(languageCode: string): Promise<UserLanguagePreference> {
    const response = await api.put('/languages/preference', { languageCode })
    return response.data.data
  },

  // Detect language from browser
  async detectLanguage(): Promise<{ detectedLanguage: string; acceptLanguageHeader: string }> {
    const response = await api.get('/languages/detect')
    return response.data.data
  },

  // Detect language from text content
  async detectContentLanguage(text: string): Promise<{ detectedLanguage: string; text: string }> {
    const response = await api.post('/languages/detect-content', { text })
    return response.data.data
  }
}