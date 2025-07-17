import React, { useState } from 'react'
import { X, CheckCircle, Star, Loader2 } from 'lucide-react'
import { worryResolutionService, CreateResolutionData } from '../services/worryResolutionService'

interface ResolutionModalProps {
  isOpen: boolean
  onClose: () => void
  postId: string
  postContent: string
  onResolutionCreated: () => void
}

const ResolutionModal: React.FC<ResolutionModalProps> = ({
  isOpen,
  onClose,
  postId,
  postContent,
  onResolutionCreated
}) => {
  const [resolutionStory, setResolutionStory] = useState('')
  const [copingMethods, setCopingMethods] = useState<string[]>([''])
  const [helpfulnessRating, setHelpfulnessRating] = useState<number | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleAddCopingMethod = () => {
    setCopingMethods([...copingMethods, ''])
  }

  const handleRemoveCopingMethod = (index: number) => {
    if (copingMethods.length > 1) {
      setCopingMethods(copingMethods.filter((_, i) => i !== index))
    }
  }

  const handleCopingMethodChange = (index: number, value: string) => {
    const newMethods = [...copingMethods]
    newMethods[index] = value
    setCopingMethods(newMethods)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Validate form
    const validCopingMethods = copingMethods.filter(method => method.trim() !== '')
    if (validCopingMethods.length === 0) {
      setError('Please add at least one coping method')
      return
    }

    try {
      setIsSubmitting(true)
      
      const resolutionData: CreateResolutionData = {
        copingMethods: validCopingMethods,
        resolutionStory: resolutionStory.trim() || undefined,
        helpfulnessRating: helpfulnessRating || undefined
      }

      await worryResolutionService.resolveWorry(postId, resolutionData)
      onResolutionCreated()
      onClose()
      
      // Reset form
      setResolutionStory('')
      setCopingMethods([''])
      setHelpfulnessRating(null)
    } catch (error: any) {
      console.error('Failed to resolve worry:', error)
      setError(error.response?.data?.error?.message || 'Failed to mark worry as resolved')
    } finally {
      setIsSubmitting(false)
    }
  }

  const renderStars = () => {
    return Array.from({ length: 5 }).map((_, index) => (
      <Star
        key={index}
        className={`w-6 h-6 cursor-pointer transition-colors ${
          index < (helpfulnessRating || 0) 
            ? 'text-yellow-500 fill-yellow-500' 
            : 'text-gray-300 hover:text-yellow-400'
        }`}
        onClick={() => setHelpfulnessRating(index + 1)}
      />
    ))
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-2">
            <CheckCircle className="w-6 h-6 text-green-600" />
            <h2 className="text-xl font-semibold text-gray-900">Mark Worry as Resolved</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Original Worry */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Original Worry
            </label>
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <p className="text-gray-800">{postContent}</p>
            </div>
          </div>

          {/* Coping Methods */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              How did you overcome this worry? <span className="text-red-500">*</span>
            </label>
            <p className="text-sm text-gray-600 mb-3">
              Share the methods or strategies that helped you resolve this concern.
            </p>
            {copingMethods.map((method, index) => (
              <div key={index} className="flex items-center space-x-2 mb-2">
                <input
                  type="text"
                  value={method}
                  onChange={(e) => handleCopingMethodChange(index, e.target.value)}
                  placeholder={`Coping method ${index + 1}`}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
                {copingMethods.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveCopingMethod(index)}
                    className="text-red-500 hover:text-red-700 p-1"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={handleAddCopingMethod}
              className="text-green-600 hover:text-green-800 text-sm font-medium"
            >
              + Add another method
            </button>
          </div>

          {/* Resolution Story */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Resolution Story (Optional)
            </label>
            <p className="text-sm text-gray-600 mb-3">
              Share your journey and what you learned. This can help others facing similar worries.
            </p>
            <textarea
              value={resolutionStory}
              onChange={(e) => setResolutionStory(e.target.value)}
              placeholder="Tell your story of how you overcame this worry..."
              rows={4}
              maxLength={2000}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
            <div className="text-right text-sm text-gray-500 mt-1">
              {resolutionStory.length}/2000 characters
            </div>
          </div>

          {/* Helpfulness Rating */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              How helpful was resolving this worry? (Optional)
            </label>
            <div className="flex items-center space-x-1">
              {renderStars()}
              {helpfulnessRating && (
                <span className="ml-2 text-sm text-gray-600">
                  {helpfulnessRating}/5
                </span>
              )}
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end space-x-4 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Mark as Resolved
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default ResolutionModal