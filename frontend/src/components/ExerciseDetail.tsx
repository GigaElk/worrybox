import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { guidedExerciseService, Exercise, ExerciseProgress } from '../services/guidedExerciseService'
import { useAuth } from '../contexts/AuthContext'
import { Clock, BarChart, Loader2, AlertCircle, Play, Pause, SkipForward, CheckCircle, Star, ArrowLeft } from 'lucide-react'
import FeatureGate from './FeatureGate'

const ExerciseDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [exercise, setExercise] = useState<Exercise | null>(null)
  const [progress, setProgress] = useState<ExerciseProgress | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isStarting, setIsStarting] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)
  const [notes, setNotes] = useState('')
  const [rating, setRating] = useState<number | null>(null)
  const [effectiveness, setEffectiveness] = useState<number | null>(null)

  useEffect(() => {
    if (user && id) {
      loadExercise()
    }
  }, [user, id])

  const loadExercise = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const exerciseData = await guidedExerciseService.getExerciseById(id!)
      setExercise(exerciseData)
    } catch (error: any) {
      console.error('Failed to load exercise:', error)
      if (error.response?.status === 403) {
        setError('upgrade_required')
      } else if (error.response?.status === 404) {
        setError('Exercise not found')
      } else {
        setError(error.response?.data?.error?.message || 'Failed to load exercise')
      }
    } finally {
      setIsLoading(false)
    }
  }

  const startExercise = async () => {
    try {
      setIsStarting(true)
      const progressData = await guidedExerciseService.startExercise(id!)
      setProgress(progressData)
      setCurrentStep(progressData.currentStep)
      if (progressData.notes) setNotes(progressData.notes)
      if (progressData.rating) setRating(progressData.rating)
      if (progressData.effectiveness) setEffectiveness(progressData.effectiveness)
    } catch (error: any) {
      console.error('Failed to start exercise:', error)
      setError(error.response?.data?.error?.message || 'Failed to start exercise')
    } finally {
      setIsStarting(false)
    }
  }

  const updateProgress = async (updates: Partial<ExerciseProgress>) => {
    if (!progress) return

    try {
      setIsUpdating(true)
      const updatedProgress = await guidedExerciseService.updateExerciseProgress(
        progress.id,
        updates
      )
      setProgress(updatedProgress)
      if (updates.currentStep !== undefined) setCurrentStep(updates.currentStep)
    } catch (error: any) {
      console.error('Failed to update progress:', error)
      setError(error.response?.data?.error?.message || 'Failed to update progress')
    } finally {
      setIsUpdating(false)
    }
  }

  const nextStep = () => {
    if (!exercise || !progress) return
    const newStep = Math.min(currentStep + 1, exercise.steps.length - 1)
    updateProgress({ currentStep: newStep })
  }

  const previousStep = () => {
    if (!progress) return
    const newStep = Math.max(currentStep - 1, 0)
    updateProgress({ currentStep: newStep })
  }

  const completeExercise = async () => {
    if (!progress) return
    
    await updateProgress({ 
      completed: true,
      notes,
      rating,
      effectiveness
    })
  }

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'bg-green-100 text-green-800'
      case 'intermediate': return 'bg-blue-100 text-blue-800'
      case 'advanced': return 'bg-purple-100 text-purple-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const renderStars = (rating: number | null, onRate?: (rating: number) => void) => {
    return Array.from({ length: 5 }).map((_, index) => (
      <Star 
        key={index} 
        className={`w-5 h-5 cursor-pointer transition-colors ${
          index < (rating || 0) ? 'text-yellow-500 fill-yellow-500' : 'text-gray-300 hover:text-yellow-400'
        }`}
        onClick={() => onRate && onRate(index + 1)}
      />
    ))
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
            <h3 className="text-lg font-medium">Error Loading Exercise</h3>
          </div>
          <p className="text-red-700 mb-4">{error}</p>
          <div className="flex space-x-4">
            <button
              onClick={loadExercise}
              className="text-sm text-red-600 hover:text-red-800 underline"
            >
              Try Again
            </button>
            <button
              onClick={() => navigate('/wellness/exercises')}
              className="text-sm text-gray-600 hover:text-gray-800 underline"
            >
              Back to Exercises
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (!exercise) {
    return (
      <div className="max-w-2xl mx-auto p-6 text-center">
        <p className="text-gray-600">Exercise not found.</p>
        <button
          onClick={() => navigate('/wellness/exercises')}
          className="mt-4 text-blue-600 hover:text-blue-800 underline"
        >
          Back to Exercises
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center mb-6">
        <button
          onClick={() => navigate('/wellness/exercises')}
          className="flex items-center text-gray-600 hover:text-gray-800 mr-4"
        >
          <ArrowLeft className="w-5 h-5 mr-1" />
          Back
        </button>
        <h1 className="text-2xl font-bold text-gray-900">{exercise.title}</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2">
          {/* Exercise Info */}
          <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
            {exercise.imageUrl && (
              <div className="h-48 mb-4 overflow-hidden rounded-lg">
                <img 
                  src={exercise.imageUrl} 
                  alt={exercise.title} 
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            
            <div className="flex items-center space-x-4 mb-4">
              <span className={`text-sm px-3 py-1 rounded-full ${getDifficultyColor(exercise.difficulty)}`}>
                {exercise.difficulty.charAt(0).toUpperCase() + exercise.difficulty.slice(1)}
              </span>
              <div className="flex items-center text-gray-600">
                <Clock className="w-4 h-4 mr-1" />
                <span>{exercise.duration} minutes</span>
              </div>
              <div className="flex items-center text-gray-600">
                <BarChart className="w-4 h-4 mr-1" />
                <span>{exercise.steps.length} steps</span>
              </div>
            </div>
            
            <p className="text-gray-700 mb-4">{exercise.description}</p>
            
            <div className="flex flex-wrap gap-2">
              {exercise.tags.map((tag, index) => (
                <span key={index} className="text-sm bg-gray-100 text-gray-600 px-3 py-1 rounded">
                  {tag}
                </span>
              ))}
            </div>
          </div>

          {/* Exercise Steps */}
          {progress ? (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold">Exercise Progress</h2>
                <div className="text-sm text-gray-600">
                  Step {currentStep + 1} of {exercise.steps.length}
                </div>
              </div>
              
              {/* Progress Bar */}
              <div className="w-full bg-gray-200 rounded-full h-2 mb-6">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${((currentStep + 1) / exercise.steps.length) * 100}%` }}
                />
              </div>
              
              {/* Current Step */}
              {exercise.steps[currentStep] && (
                <div className="mb-6">
                  <h3 className="text-lg font-medium mb-3">{exercise.steps[currentStep].title}</h3>
                  <div className="prose max-w-none">
                    <p className="text-gray-700 whitespace-pre-wrap">{exercise.steps[currentStep].content}</p>
                  </div>
                  {exercise.steps[currentStep].imageUrl && (
                    <div className="mt-4">
                      <img 
                        src={exercise.steps[currentStep].imageUrl} 
                        alt={exercise.steps[currentStep].title}
                        className="max-w-full h-auto rounded-lg"
                      />
                    </div>
                  )}
                </div>
              )}
              
              {/* Navigation */}
              <div className="flex items-center justify-between">
                <button
                  onClick={previousStep}
                  disabled={currentStep === 0 || isUpdating}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                
                <div className="flex space-x-3">
                  {currentStep < exercise.steps.length - 1 ? (
                    <button
                      onClick={nextStep}
                      disabled={isUpdating}
                      className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    >
                      <SkipForward className="w-4 h-4 mr-1" />
                      Next Step
                    </button>
                  ) : (
                    <button
                      onClick={completeExercise}
                      disabled={isUpdating || progress.completed}
                      className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                    >
                      <CheckCircle className="w-4 h-4 mr-1" />
                      {progress.completed ? 'Completed' : 'Complete Exercise'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-xl font-semibold mb-4">Ready to Start?</h2>
              <p className="text-gray-600 mb-6">
                This exercise will guide you through {exercise.steps.length} steps to help you manage your worries effectively.
              </p>
              <button
                onClick={startExercise}
                disabled={isStarting}
                className="flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {isStarting ? (
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                ) : (
                  <Play className="w-5 h-5 mr-2" />
                )}
                {isStarting ? 'Starting...' : 'Start Exercise'}
              </button>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Exercise Steps Overview */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold mb-4">Exercise Steps</h3>
            <div className="space-y-3">
              {exercise.steps.map((step, index) => (
                <div 
                  key={step.id} 
                  className={`flex items-center space-x-3 p-2 rounded ${
                    progress && index === currentStep ? 'bg-blue-50 border border-blue-200' : ''
                  }`}
                >
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                    progress && index < currentStep ? 'bg-green-500 text-white' :
                    progress && index === currentStep ? 'bg-blue-500 text-white' :
                    'bg-gray-200 text-gray-600'
                  }`}>
                    {progress && index < currentStep ? '✓' : index + 1}
                  </div>
                  <span className={`text-sm ${
                    progress && index === currentStep ? 'font-medium text-blue-900' : 'text-gray-700'
                  }`}>
                    {step.title}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Feedback Form (if exercise is completed) */}
          {progress?.completed && (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold mb-4">How was this exercise?</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Overall Rating
                  </label>
                  <div className="flex items-center space-x-1">
                    {renderStars(rating, setRating)}
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    How effective was this exercise?
                  </label>
                  <div className="flex items-center space-x-1">
                    {renderStars(effectiveness, setEffectiveness)}
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notes (optional)
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={3}
                    placeholder="How did this exercise help you?"
                  />
                </div>
                
                <button
                  onClick={() => updateProgress({ notes, rating, effectiveness })}
                  disabled={isUpdating}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {isUpdating ? 'Saving...' : 'Save Feedback'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default ExerciseDetail