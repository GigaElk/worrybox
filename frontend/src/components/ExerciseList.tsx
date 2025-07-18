import React, { useState, useEffect } from 'react'
import { guidedExerciseService, Exercise } from '../services/guidedExerciseService'
import { useAuth } from '../contexts/AuthContext'
import { Clock, BarChart, Loader2, AlertCircle, Play } from 'lucide-react'
import { Link } from 'react-router-dom'

interface ExerciseListProps {
  className?: string
  category?: string
  limit?: number
  showViewAll?: boolean
}

const ExerciseList: React.FC<ExerciseListProps> = ({ 
  className = '', 
  category,
  limit,
  showViewAll = true
}) => {
  const { user } = useAuth()
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (user) {
      loadExercises()
    }
  }, [user, category])

  const loadExercises = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const data = await guidedExerciseService.getAllExercises(category)
      setExercises(limit ? data.slice(0, limit) : data)
    } catch (error: any) {
      console.error('Failed to load exercises:', error)
      if (error.response?.status === 403) {
        setError('upgrade_required')
      } else {
        setError(error.response?.data?.error?.message || 'Failed to load exercises')
      }
    } finally {
      setIsLoading(false)
    }
  }

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'bg-green-100 text-green-800'
      case 'intermediate': return 'bg-blue-100 text-blue-800'
      case 'advanced': return 'bg-purple-100 text-purple-800'
      default: return 'bg-gray-100 text-gray-800'
    }
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
          <h3 className="font-medium">Error Loading Exercises</h3>
        </div>
        <p className="text-red-700 mb-4">{error}</p>
        <button
          onClick={loadExercises}
          className="text-sm text-red-600 hover:text-red-800 underline"
        >
          Try Again
        </button>
      </div>
    )
  }

  if (exercises.length === 0) {
    return (
      <div className={`text-center py-8 ${className}`}>
        <p className="text-gray-600">No exercises found.</p>
      </div>
    )
  }

  return (
    <div className={className}>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {exercises.map((exercise) => (
          <div key={exercise.id} className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
            {exercise.imageUrl ? (
              <div className="h-40 overflow-hidden">
                <img 
                  src={exercise.imageUrl} 
                  alt={exercise.title} 
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div className="h-40 bg-blue-50 flex items-center justify-center">
                <BarChart className="w-12 h-12 text-blue-300" />
              </div>
            )}
            
            <div className="p-5">
              <div className="flex items-center justify-between mb-2">
                <span className={`text-xs px-2 py-1 rounded-full ${getDifficultyColor(exercise.difficulty)}`}>
                  {exercise.difficulty.charAt(0).toUpperCase() + exercise.difficulty.slice(1)}
                </span>
                <div className="flex items-center text-gray-500 text-sm">
                  <Clock className="w-4 h-4 mr-1" />
                  <span>{exercise.duration} min</span>
                </div>
              </div>
              
              <h3 className="text-lg font-semibold text-gray-900 mb-2">{exercise.title}</h3>
              <p className="text-gray-600 text-sm mb-4 line-clamp-2">{exercise.description}</p>
              
              <div className="flex items-center justify-between">
                <div className="flex flex-wrap gap-2">
                  {exercise.tags.slice(0, 2).map((tag: string, index: number) => (
                    <span key={index} className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                      {tag}
                    </span>
                  ))}
                  {exercise.tags.length > 2 && (
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                      +{exercise.tags.length - 2}
                    </span>
                  )}
                </div>
                
                <Link 
                  to={`/wellness/exercises/${exercise.id}`}
                  className="flex items-center text-blue-600 hover:text-blue-800 text-sm font-medium"
                >
                  <Play className="w-4 h-4 mr-1" />
                  Start
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {showViewAll && exercises.length >= (limit || 0) && (
        <div className="mt-8 text-center">
          <Link 
            to="/wellness/exercises"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            View All Exercises
          </Link>
        </div>
      )}
    </div>
  )
}

export default ExerciseList