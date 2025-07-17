import React from 'react'
import { CheckCircle, Star, Calendar, User } from 'lucide-react'
import { WorryResolution } from '../services/worryResolutionService'

interface ResolutionDisplayProps {
  resolution: WorryResolution
  showPost?: boolean
  showAuthor?: boolean
  className?: string
}

const ResolutionDisplay: React.FC<ResolutionDisplayProps> = ({
  resolution,
  showPost = false,
  showAuthor = false,
  className = ''
}) => {
  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }).map((_, index) => (
      <Star
        key={index}
        className={`w-4 h-4 ${
          index < rating ? 'text-yellow-500 fill-yellow-500' : 'text-gray-300'
        }`}
      />
    ))
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  return (
    <div className={`bg-white rounded-lg border border-gray-200 p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center space-x-2 mb-4">
        <CheckCircle className="w-5 h-5 text-green-600" />
        <span className="text-green-700 font-medium">Worry Resolved</span>
        <div className="flex items-center text-gray-500 text-sm ml-auto">
          <Calendar className="w-4 h-4 mr-1" />
          <span>{formatDate(resolution.resolvedAt)}</span>
        </div>
      </div>

      {/* Original Post (if requested) */}
      {showPost && (
        <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <h4 className="font-medium text-gray-900 mb-2">Original Worry:</h4>
          <p className="text-gray-700 mb-2">
            <span className="text-gray-500 italic">{resolution.post.worryPrompt}</span>{' '}
            {resolution.post.shortContent}
          </p>
          {resolution.post.longContent && (
            <p className="text-gray-600 text-sm mt-2">{resolution.post.longContent}</p>
          )}
        </div>
      )}

      {/* Coping Methods */}
      <div className="mb-4">
        <h4 className="font-medium text-gray-900 mb-2">How it was resolved:</h4>
        <div className="space-y-2">
          {resolution.copingMethods.map((method, index) => (
            <div key={index} className="flex items-start space-x-2">
              <span className="text-green-500 mt-1">•</span>
              <span className="text-gray-700">{method}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Resolution Story */}
      {resolution.resolutionStory && (
        <div className="mb-4">
          <h4 className="font-medium text-gray-900 mb-2">Resolution Story:</h4>
          <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded-r-lg">
            <p className="text-gray-700 whitespace-pre-wrap">{resolution.resolutionStory}</p>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-200">
        {/* Helpfulness Rating */}
        {resolution.helpfulnessRating && (
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600">Helpfulness:</span>
            <div className="flex items-center space-x-1">
              {renderStars(resolution.helpfulnessRating)}
              <span className="text-sm text-gray-600 ml-1">
                ({resolution.helpfulnessRating}/5)
              </span>
            </div>
          </div>
        )}

        {/* Author (if requested) */}
        {showAuthor && (
          <div className="flex items-center space-x-1 text-sm text-gray-500">
            <User className="w-4 h-4" />
            <span>Shared anonymously</span>
          </div>
        )}

        {/* Privacy indicator */}
        {!showAuthor && (
          <div className="text-sm text-gray-500">
            {resolution.post.privacyLevel === 'public' && (
              <span className="text-green-600">✓ Public resolution story</span>
            )}
            {resolution.post.privacyLevel === 'friends' && (
              <span className="text-blue-600">👥 Shared with friends</span>
            )}
            {resolution.post.privacyLevel === 'private' && (
              <span className="text-gray-600">🔒 Private resolution</span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default ResolutionDisplay