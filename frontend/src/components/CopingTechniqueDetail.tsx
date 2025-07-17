import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { guidedExerciseService, CopingTechnique } from '../services/guidedExerciseService'
import { useAuth } from '../contexts/AuthContext'
import { Star, BookOpen, Loader2, AlertCircle, ExternalLink, ArrowLeft, CheckCircle } from 'lucide-react'
import FeatureGate from './FeatureGate'

const CopingTechniqueDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [technique, setTechnique] = useState<CopingTechnique | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (user && id) {
      loadTechnique()
    }
  }, [user, id])

  const loadTechnique = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const techniqueData = await guidedExerciseService.getCopingTechniqueById(id!)
      setTechnique(techniqueData)
    } catch (error: any) {
      console.error('Failed to load coping technique:', error)
      if (error.response?.status === 403) {
        setError('upgrade_required')
      } else if (error.response?.status === 404) {
        setError('Coping technique not found')
      } else {
        setError(error.response?.data?.error?.message || 'Failed to load coping technique')
      }
    } finally {
      setIsLoading(false)
    }
  }

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }).map((_, index) => (
      <Star 
        key={index} 
        className={`w-5 h-5 ${index < rating ? 'text-yellow-500 fill-yellow-500' : 'text-gray-300'}`} 
      />
    ))
  }

  const getResourceIcon = (type: string) => {
    switch (type) {
      case 'video': return '🎥'
      case 'audio': return '🎧'
      case 'book': return '📚'
      case 'app': return '📱'
      case 'website': return '🌐'
      default: return '📄'
    }
  }

  if (error === 'upgrade_required') {
    return (
      <FeatureGate feature="guided_exercises">
        <div>This content is not accessible</div>
      </FeatureGate>
    )
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-center space-x-2 text-red-600 mb-2">
            <AlertCircle className="w-6 h-6" />
            <h3 className="text-lg font-medium">Error Loading Coping Technique</h3>
          </div>
          <p className="text-red-700 mb-4">{error}</p>
          <div className="flex space-x-4">
            <button
              onClick={loadTechnique}
              className="text-sm text-red-600 hover:text-red-800 underline"
            >
              Try Again
            </button>
            <button
              onClick={() => navigate('/wellness/techniques')}
              className="text-sm text-gray-600 hover:text-gray-800 underline"
            >
              Back to Techniques
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (!technique) {
    return (
      <div className="max-w-2xl mx-auto p-6 text-center">
        <p className="text-gray-600">Coping technique not found.</p>
        <button
          onClick={() => navigate('/wellness/techniques')}
          className="mt-4 text-green-600 hover:text-green-800 underline"
        >
          Back to Techniques
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center mb-6">
        <button
          onClick={() => navigate('/wellness/techniques')}
          className="flex items-center text-gray-600 hover:text-gray-800 mr-4"
        >
          <ArrowLeft className="w-5 h-5 mr-1" />
          Back
        </button>
        <h1 className="text-2xl font-bold text-gray-900">{technique.title}</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Technique Overview */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            {technique.imageUrl && (
              <div className="h-48 mb-6 overflow-hidden rounded-lg">
                <img 
                  src={technique.imageUrl} 
                  alt={technique.title} 
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            
            <div className="flex items-center space-x-4 mb-4">
              <span className="text-sm px-3 py-1 rounded-full bg-green-100 text-green-800">
                {technique.category}
              </span>
              <div className="flex items-center space-x-1">
                <span className="text-sm text-gray-600 mr-2">Effectiveness:</span>
                {renderStars(technique.effectiveness)}
              </div>
            </div>
            
            <p className="text-gray-700 mb-6">{technique.description}</p>
            
            <div className="flex flex-wrap gap-2">
              {technique.tags.map((tag, index) => (
                <span key={index} className="text-sm bg-gray-100 text-gray-600 px-3 py-1 rounded">
                  {tag}
                </span>
              ))}
            </div>
          </div>

          {/* Instructions */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center">
              <BookOpen className="w-5 h-5 mr-2 text-green-600" />
              How to Use This Technique
            </h2>
            <div className="prose max-w-none">
              <div className="text-gray-700 whitespace-pre-wrap">{technique.instructions}</div>
            </div>
          </div>

          {/* When to Use */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center">
              <CheckCircle className="w-5 h-5 mr-2 text-blue-600" />
              When to Use This Technique
            </h2>
            <ul className="space-y-2">
              {technique.whenToUse.map((situation, index) => (
                <li key={index} className="flex items-start">
                  <span className="text-blue-500 mr-2 mt-1">•</span>
                  <span className="text-gray-700">{situation}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Resources */}
          {technique.resources && technique.resources.length > 0 && (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center">
                <ExternalLink className="w-5 h-5 mr-2 text-purple-600" />
                Additional Resources
              </h2>
              <div className="space-y-4">
                {technique.resources.map((resource, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start space-x-3">
                      <span className="text-2xl">{getResourceIcon(resource.type)}</span>
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900 mb-1">{resource.title}</h3>
                        <p className="text-gray-600 text-sm mb-2">{resource.description}</p>
                        <div className="flex items-center space-x-2">
                          <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded">
                            {resource.type.charAt(0).toUpperCase() + resource.type.slice(1)}
                          </span>
                          <a
                            href={resource.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-blue-600 hover:text-blue-800 flex items-center"
                          >
                            <ExternalLink className="w-3 h-3 mr-1" />
                            Open
                          </a>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Stats */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold mb-4">Technique Details</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Effectiveness Rating
                </label>
                <div className="flex items-center space-x-2">
                  {renderStars(technique.effectiveness)}
                  <span className="text-sm text-gray-600">({technique.effectiveness}/5)</span>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Science-Based Rating
                </label>
                <div className="flex items-center space-x-2">
                  {renderStars(technique.scienceBasedRating)}
                  <span className="text-sm text-gray-600">({technique.scienceBasedRating}/5)</span>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category
                </label>
                <span className="text-sm px-2 py-1 bg-green-100 text-green-800 rounded">
                  {technique.category}
                </span>
              </div>
            </div>
          </div>

          {/* Tags */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold mb-4">Related Topics</h3>
            <div className="flex flex-wrap gap-2">
              {technique.tags.map((tag, index) => (
                <span key={index} className="text-sm bg-blue-100 text-blue-800 px-3 py-1 rounded-full">
                  {tag}
                </span>
              ))}
            </div>
          </div>

          {/* Action Button */}
          <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg border border-green-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Ready to Try?</h3>
            <p className="text-gray-600 text-sm mb-4">
              Take a moment to practice this technique when you're feeling overwhelmed.
            </p>
            <button
              onClick={() => navigate('/wellness/exercises')}
              className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              Explore Guided Exercises
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CopingTechniqueDetail