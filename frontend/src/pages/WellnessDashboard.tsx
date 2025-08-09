import React, { useState, useEffect } from 'react'
import { guidedExerciseService, ExerciseRecommendation } from '../services/guidedExerciseService'
import { useAuth } from '../contexts/AuthContext'
import { Heart, Brain, Loader2, AlertCircle, TrendingUp, Calendar, Star } from 'lucide-react'
import { Link } from 'react-router-dom'
import ExerciseList from '../components/ExerciseList'
import CopingTechniqueList from '../components/CopingTechniqueList'
// import RecommendedResources from '../components/RecommendedResources'
import FeatureGate from '../components/FeatureGate'

const WellnessDashboard: React.FC = () => {
  const { user } = useAuth()
  const [recommendations, setRecommendations] = useState<ExerciseRecommendation[]>([])
  const [isLoadingRecommendations, setIsLoadingRecommendations] = useState(true)
  const [recommendationError, setRecommendationError] = useState<string | null>(null)

  useEffect(() => {
    if (user) {
      loadRecommendations()
    }
  }, [user])

  const loadRecommendations = async () => {
    try {
      setIsLoadingRecommendations(true)
      setRecommendationError(null)
      const data = await guidedExerciseService.getRecommendedExercises(3)
      setRecommendations(data)
    } catch (error: any) {
      console.error('Failed to load recommendations:', error)
      if (error.response?.status !== 403) {
        setRecommendationError(error.response?.data?.error?.message || 'Failed to load recommendations')
      }
    } finally {
      setIsLoadingRecommendations(false)
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

  return (
    <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Wellness Center</h1>
          <p className="text-gray-600">
            Discover guided exercises and coping techniques to help manage your worries and improve your mental wellbeing.
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200 p-6">
            <div className="flex items-center">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Brain className="w-6 h-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-semibold text-gray-900">Guided Exercises</h3>
                <p className="text-gray-600 text-sm">Step-by-step wellness activities</p>
              </div>
            </div>
          </div>
          
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200 p-6">
            <div className="flex items-center">
              <div className="p-3 bg-green-100 rounded-lg">
                <Heart className="w-6 h-6 text-green-600" />
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-semibold text-gray-900">Coping Techniques</h3>
                <p className="text-gray-600 text-sm">Evidence-based strategies</p>
              </div>
            </div>
          </div>
          
          <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border border-purple-200 p-6">
            <div className="flex items-center">
              <div className="p-3 bg-purple-100 rounded-lg">
                <TrendingUp className="w-6 h-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-semibold text-gray-900">Progress Tracking</h3>
                <p className="text-gray-600 text-sm">Monitor your wellness journey</p>
              </div>
            </div>
          </div>
        </div>

        {/* Personalized Recommendations - Premium Feature */}
        <FeatureGate feature="guided_exercises">
          <div className="mb-8">
            <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-semibold text-gray-900">Recommended for You</h2>
            <Link 
              to="/wellness/exercises" 
              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              View All Exercises
            </Link>
          </div>
          
          {isLoadingRecommendations ? (
            <div className="flex justify-center items-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
          ) : recommendationError ? (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-center space-x-2 text-yellow-600 mb-2">
                <AlertCircle className="w-5 h-5" />
                <h3 className="font-medium">Unable to Load Recommendations</h3>
              </div>
              <p className="text-yellow-700 text-sm">
                We'll show you general exercises instead. {recommendationError}
              </p>
            </div>
          ) : recommendations.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {recommendations.map((recommendation) => (
                <div key={recommendation.exercise.id} className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
                  <div className="h-40 bg-blue-50 flex items-center justify-center">
                    <Brain className="w-12 h-12 text-blue-300" />
                  </div>
                  
                  <div className="p-5">
                    <div className="flex items-center justify-between mb-2">
                      <span className={`text-xs px-2 py-1 rounded-full ${getDifficultyColor(recommendation.exercise.difficulty)}`}>
                        {recommendation.exercise.difficulty.charAt(0).toUpperCase() + recommendation.exercise.difficulty.slice(1)}
                      </span>
                      <div className="flex items-center text-yellow-500">
                        <Star className="w-4 h-4 fill-current" />
                        <span className="text-xs ml-1 text-gray-600">Recommended</span>
                      </div>
                    </div>
                    
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">{recommendation.exercise.title}</h3>
                    <p className="text-gray-600 text-sm mb-3 line-clamp-2">{recommendation.exercise.description}</p>
                    <p className="text-blue-600 text-xs mb-4 italic">{recommendation.reason}</p>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center text-gray-500 text-sm">
                        <Calendar className="w-4 h-4 mr-1" />
                        <span>{recommendation.exercise.duration} min</span>
                      </div>
                      
                      <Link 
                        to={`/wellness/exercises/${recommendation.exercise.id}`}
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                      >
                        Start →
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-600 mb-4">
                Complete a few worry posts to get personalized exercise recommendations!
              </p>
              <Link 
                to="/feed" 
                className="text-blue-600 hover:text-blue-800 underline"
              >
                Share your first worry
              </Link>
            </div>
          )}
            </div>
          </div>
        </FeatureGate>

        {/* Recent Exercises */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-semibold text-gray-900">Popular Exercises</h2>
            <Link 
              to="/wellness/exercises" 
              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              View All
            </Link>
          </div>
          <ExerciseList limit={6} showViewAll={false} />
        </div>

        {/* Coping Techniques */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-semibold text-gray-900">Coping Techniques</h2>
            <Link 
              to="/wellness/techniques" 
              className="text-green-600 hover:text-green-800 text-sm font-medium"
            >
              View All
            </Link>
          </div>
          <CopingTechniqueList limit={6} showViewAll={false} />
        </div>

        {/* Recommended Mental Health Resources */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-semibold text-gray-900">Mental Health Resources</h2>
            <Link 
              to="/resources" 
              className="text-pink-600 hover:text-pink-800 text-sm font-medium"
            >
              View All Resources
            </Link>
          </div>
          {/* <RecommendedResources limit={3} /> */}
          <div className="text-center py-8 text-gray-500">
            <p>Mental health resources will be available soon.</p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-gradient-to-r from-blue-50 to-green-50 rounded-lg border border-blue-200 p-8 text-center">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">Need Help Right Now?</h2>
          <p className="text-gray-600 mb-6">
            If you're feeling overwhelmed, try one of these quick techniques to help you feel better.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/wellness/exercises?category=breathing"
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Breathing Exercises
            </Link>
            <Link
              to="/wellness/techniques?category=grounding"
              className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              Grounding Techniques
            </Link>
            <Link
              to="/wellness/techniques?category=mindfulness"
              className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              Mindfulness
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default WellnessDashboard