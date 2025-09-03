import React, { useState, useRef, useCallback } from 'react'
import { profilePictureService, UploadProgress } from '../services/profilePictureService'
import { Camera, Upload, X, Loader2, AlertCircle, Check } from 'lucide-react'
import toast from 'react-hot-toast'

interface ProfilePictureUploadProps {
  currentAvatarUrl?: string | null
  onUploadSuccess?: (avatarUrl: string) => void
  onUploadError?: (error: string) => void
  className?: string
}

const ProfilePictureUpload: React.FC<ProfilePictureUploadProps> = ({
  currentAvatarUrl,
  onUploadSuccess,
  onUploadError,
  className = ''
}) => {
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const [validationError, setValidationError] = useState<string | null>(null)
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  const dropZoneRef = useRef<HTMLDivElement>(null)

  const handleFileValidation = useCallback((file: File): boolean => {
    const validation = profilePictureService.validateFile(file)
    if (!validation.isValid) {
      setValidationError(validation.error || 'Invalid file')
      onUploadError?.(validation.error || 'Invalid file')
      return false
    }
    setValidationError(null)
    return true
  }, [onUploadError])

  const handleFileSelect = useCallback((file: File) => {
    if (!handleFileValidation(file)) {
      return
    }

    setSelectedFile(file)
    
    // Create preview URL
    const reader = new FileReader()
    reader.onload = (e) => {
      setPreviewUrl(e.target?.result as string)
    }
    reader.readAsDataURL(file)
  }, [handleFileValidation])

  const handleFileInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      handleFileSelect(file)
    }
  }

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeave = (event: React.DragEvent) => {
    event.preventDefault()
    setIsDragOver(false)
  }

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault()
    setIsDragOver(false)
    
    const files = event.dataTransfer.files
    if (files.length > 0) {
      handleFileSelect(files[0])
    }
  }

  const handleUpload = async () => {
    if (!selectedFile) {
      return
    }

    setIsUploading(true)
    setUploadProgress({ loaded: 0, total: selectedFile.size, percentage: 0 })

    try {
      const result = await profilePictureService.uploadProfilePicture(
        selectedFile,
        (progress) => {
          setUploadProgress(progress)
        }
      )

      toast.success('Profile picture updated successfully!')
      onUploadSuccess?.(result.profilePictureUrl)
      
      // Clear the selected file and preview
      setSelectedFile(null)
      setPreviewUrl(null)
      
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to upload profile picture'
      toast.error(errorMessage)
      onUploadError?.(errorMessage)
    } finally {
      setIsUploading(false)
      setUploadProgress(null)
    }
  }

  const handleCancel = () => {
    setSelectedFile(null)
    setPreviewUrl(null)
    setValidationError(null)
    
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleDeleteCurrent = async () => {
    if (!currentAvatarUrl) {
      return
    }

    if (!window.confirm('Are you sure you want to remove your profile picture?')) {
      return
    }

    try {
      await profilePictureService.deleteProfilePicture()
      toast.success('Profile picture removed successfully!')
      onUploadSuccess?.(null)
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to remove profile picture'
      toast.error(errorMessage)
      onUploadError?.(errorMessage)
    }
  }

  const openFileDialog = () => {
    fileInputRef.current?.click()
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Current Avatar Display */}
      <div className="flex items-center space-x-4">
        <div className="relative">
          {currentAvatarUrl ? (
            <img
              src={currentAvatarUrl}
              alt="Current profile picture"
              className="w-20 h-20 rounded-full object-cover border-2 border-gray-200"
            />
          ) : (
            <div className="w-20 h-20 rounded-full bg-gray-200 flex items-center justify-center border-2 border-gray-200">
              <Camera className="w-8 h-8 text-gray-400" />
            </div>
          )}
        </div>
        
        <div className="flex-1">
          <h3 className="text-sm font-medium text-gray-900">Profile Picture</h3>
          <p className="text-sm text-gray-600">
            Upload a new picture or remove the current one
          </p>
        </div>

        {currentAvatarUrl && (
          <button
            onClick={handleDeleteCurrent}
            className="px-3 py-1 text-sm text-red-600 hover:text-red-700 border border-red-300 rounded-md hover:bg-red-50"
          >
            Remove
          </button>
        )}
      </div>

      {/* File Upload Area */}
      <div
        ref={dropZoneRef}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
          isDragOver
            ? 'border-primary-400 bg-primary-50'
            : 'border-gray-300 hover:border-gray-400'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileInputChange}
          className="hidden"
        />

        {previewUrl ? (
          <div className="space-y-4">
            {/* Preview */}
            <div className="flex justify-center">
              <img
                src={previewUrl}
                alt="Preview"
                className="w-32 h-32 rounded-full object-cover border-2 border-gray-200"
              />
            </div>
            
            {/* File Info */}
            <div className="text-sm text-gray-600">
              <p className="font-medium">{selectedFile?.name}</p>
              <p>{selectedFile ? Math.round(selectedFile.size / 1024) : 0} KB</p>
            </div>

            {/* Upload Progress */}
            {isUploading && uploadProgress && (
              <div className="space-y-2">
                <div className="flex items-center justify-center space-x-2">
                  <Loader2 className="w-4 h-4 animate-spin text-primary-600" />
                  <span className="text-sm text-gray-600">
                    Uploading... {uploadProgress.percentage}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress.percentage}%` }}
                  />
                </div>
              </div>
            )}

            {/* Action Buttons */}
            {!isUploading && (
              <div className="flex justify-center space-x-3">
                <button
                  onClick={handleCancel}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpload}
                  className="px-4 py-2 text-sm font-medium text-white bg-primary-600 border border-transparent rounded-md hover:bg-primary-700"
                >
                  Upload Picture
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <Upload className="w-12 h-12 text-gray-400 mx-auto" />
            <div>
              <p className="text-sm font-medium text-gray-900">
                Drop your image here, or{' '}
                <button
                  onClick={openFileDialog}
                  className="text-primary-600 hover:text-primary-700 underline"
                >
                  browse
                </button>
              </p>
              <p className="text-xs text-gray-600 mt-1">
                PNG, JPG, WebP up to 5MB
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Validation Error */}
      {validationError && (
        <div className="flex items-center space-x-2 text-sm text-red-600 bg-red-50 p-3 rounded-md">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{validationError}</span>
        </div>
      )}

      {/* Upload Success */}
      {!isUploading && !selectedFile && !validationError && (
        <div className="text-xs text-gray-500 text-center">
          <Check className="w-4 h-4 inline mr-1" />
          Ready to upload a new profile picture
        </div>
      )}
    </div>
  )
}

export default ProfilePictureUpload