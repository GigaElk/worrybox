import api from './api'

export interface ProfilePictureResponse {
  profilePictureUrl: string | null
  profilePictureCloudinaryId: string | null
  updatedAt: string | null
}

export interface ProfilePictureUploadResult {
  profilePictureUrl: string
  profilePictureCloudinaryId: string
  updatedAt: string
}

export interface UploadProgress {
  loaded: number
  total: number
  percentage: number
}

export interface FileValidationResult {
  isValid: boolean
  error?: string
}

export const profilePictureService = {
  // Upload profile picture
  async uploadProfilePicture(
    file: File,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<ProfilePictureUploadResult> {
    // Validate file before upload
    const validation = this.validateFile(file)
    if (!validation.isValid) {
      throw new Error(validation.error)
    }

    const formData = new FormData()
    formData.append('profilePicture', file)

    const response = await api.post('/profile-picture/me', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const progress: UploadProgress = {
            loaded: progressEvent.loaded,
            total: progressEvent.total,
            percentage: Math.round((progressEvent.loaded * 100) / progressEvent.total)
          }
          onProgress(progress)
        }
      }
    })

    return response.data.data
  },

  // Delete profile picture
  async deleteProfilePicture(): Promise<void> {
    await api.delete('/profile-picture/me')
  },

  // Get profile picture for a user
  async getProfilePicture(userId: string): Promise<ProfilePictureResponse> {
    const response = await api.get(`/profile-picture/${userId}`)
    return response.data.data
  },

  // Get current user's profile picture
  async getMyProfilePicture(): Promise<ProfilePictureResponse> {
    // This will use the authenticated user's ID on the backend
    const response = await api.get('/profile-picture/me')
    return response.data.data
  },

  // Validate file before upload
  validateFile(file: File): FileValidationResult {
    const maxSize = 5 * 1024 * 1024 // 5MB
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']

    // Check file size
    if (file.size > maxSize) {
      return {
        isValid: false,
        error: `File size (${Math.round(file.size / 1024 / 1024 * 100) / 100}MB) exceeds maximum allowed size of 5MB`
      }
    }

    // Check file type
    if (!allowedTypes.includes(file.type)) {
      return {
        isValid: false,
        error: `File type '${file.type}' is not allowed. Allowed types: JPEG, PNG, WebP`
      }
    }

    // Check if file is actually an image
    if (!file.type.startsWith('image/')) {
      return {
        isValid: false,
        error: 'Selected file is not an image'
      }
    }

    return { isValid: true }
  },

  // Generate optimized Cloudinary URL (if needed for frontend optimization)
  generateOptimizedUrl(
    cloudinaryUrl: string,
    options: {
      width?: number
      height?: number
      quality?: string
    } = {}
  ): string {
    if (!cloudinaryUrl || !cloudinaryUrl.includes('cloudinary.com')) {
      return cloudinaryUrl
    }

    const { width = 200, height = 200, quality = 'auto' } = options

    // Insert transformation parameters into Cloudinary URL
    // Example: https://res.cloudinary.com/cloud/image/upload/v123/path.jpg
    // Becomes: https://res.cloudinary.com/cloud/image/upload/w_200,h_200,c_fill,g_face,q_auto/v123/path.jpg
    
    const transformations = `w_${width},h_${height},c_fill,g_face,q_${quality}`
    
    if (cloudinaryUrl.includes('/upload/')) {
      return cloudinaryUrl.replace('/upload/', `/upload/${transformations}/`)
    }
    
    return cloudinaryUrl
  },

  // Get service status (for debugging)
  async getServiceStatus(): Promise<any> {
    const response = await api.get('/profile-picture/service/status')
    return response.data.data
  }
}