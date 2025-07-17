import React, { useState, useEffect } from 'react'
import { guidedExerciseService, CopingTechnique } from '../services/guidedExerciseService'
import { useAuth } from '../contexts/AuthContext'
import { Star, BookOpen, Loader2, AlertCircle, ExternalLink } from 'lucide-react'
import { Link } from 'react-router-dom'
import FeatureGate from './FeatureGate'

interface CopingTechniqueListProps {
  className?: string
  category?: string
  limit?: number
  showViewAll?: boolean
}

const CopingTechniqueList: React.FC<CopingTechniqueListProps> = ({ 
  className = '', 
  category,
  limit,
  showViewAll = true
}) => {
  const { user } = useAuth()
  const [techniques, setTechniques] = useState<CopingTechnique[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (user) {
      loadTechniques()
    }
  }, [user, category])

  const loadTechniques = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const data = await guidedExerciseService.getAllCopingTechniques(category)
      setTechniques(limit ? data.slice(0, limit) : data)
    } catch (error: any) {
      console.error('Failed to load coping techniques:', error)
      if (error.response?.status === 403) {
        setError('upgrade_required')
      } else {
        setError(error.response?.data?.error?.message || 'Failed to load coping techniques')
      }
    } finally {
      setIsLoading(false)
    }
  }

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }).map((_, index) => (
      <Star 
        key={index} 
        className={`w-4 h-4 ${index < rating ? 'text-yellow-500 fill-yellow-500' : 'text-gray-300'}`} 
      />
    ))
  }

  if (error === 'upgrade_required') {
    return (
      <FeatureGate 
        feature="guided_exercises"
        className={className}
      >
        <div>This content is not accessible</div>
      </FeatureGate>
    )
  }

  if (isLoading) {
    return (
      <div className={`flex justify-center items-center py-8 ${className}`}>
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    )
  }

  if (error) {
    return (
      <div className={`bg-red-50 border border-red-200 rounded-lg p-4 ${className}`}>
        <div className="flex items-center space-x-2 text-red-600 mb-2">
          <AlertCircle className="w-5 h-5" />
          <h3 className="font-medium">Error Loading Coping Techniques</h3>
        </div>
        <p className="text-red-700 mb-4">{error}</p>
        <button
          onClick={loadTechniques}
          className="text-sm text-red-600 hover:text-red-800 underline"
        >
          Try Again
        </button>
      </div>
    )
  }

  if (techniques.length === 0) {
    return (
      <div className={`text-center py-8 ${className}`}>
        <p className="text-gray-600">No coping techniques found.</p>
      </div>
    )
  }

  return (
    <div className={className}>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {techniques.map((technique) => (
          <div key={technique.id} className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
            {technique.imageUrl ? (
              <div className="h-40 overflow-hidden">
                <img 
                  src={technique.imageUrl} 
                  alt={technique.title} 
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div className="h-40 bg-green-50 flex items-center justify-center">
                <BookOpen className="w-12 h-12 text-green-300" />
              </div>
            )}
            
            <div className="p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-800">
                  {technique.category}
                </span>
                <div className="flex items-center">
                  {renderStars(technique.effectiveness)}
                </div>
              </div>
              
              <h3 className="text-lg font-semibold text-gray-900 mb-2">{technique.title}</h3>
              <p className="text-gray-600 text-sm mb-4 line-clamp-2">{technique.description}</p>
              
              <div className="flex items-center justify-between">
                <div className="flex flex-wrap gap-2">
                  {technique.tags.slice(0, 2).map((tag, index) => (
                    <span key={index} className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                      {tag}
                    </span>
                  ))}
                  {technique.tags.length > 2 && (
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                      +{technique.tags.length - 2}
                    </span>
                  )}
                </div>
                
                <Link 
                  to={`/wellness/techniques/${technique.id}`}
                  className="flex items-center text-green-600 hover:text-green-800 text-sm font-medium"
                >
                  <ExternalLink className="w-4 h-4 mr-1" />
                  Learn
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {showViewAll && techniques.length >= (limit || 0) && (
        <div className="mt-8 text-center">
          <Link 
            to="/wellness/techniques"
            className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            View All Techniques
          </Link>
        </div>
      )}
    </div>
  )
}

export default CopingTechniqueList