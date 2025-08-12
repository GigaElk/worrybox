import React from 'react'
import { useAuth } from '../contexts/AuthContext'
import { Heart, Brain, TrendingUp } from 'lucide-react'
import { Link } from 'react-router-dom'
import FeatureGate from '../components/FeatureGate'
import ExerciseList from '../components/ExerciseList'
import CopingTechniqueList from '../components/CopingTechniqueList'

const WellnessDashboard: React.FC = () => {
  const { user } = useAuth()

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
          
          <div className="bg-green-50 p-4 rounded-lg">
            <p>Premium recommendations would appear here</p>
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

      {/* Coping Techniques - Temporarily disabled for debugging */}
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
        <div className="bg-yellow-50 p-4 rounded-lg">
          <p>Coping techniques loading...</p>
        </div>
      </div>

      {/* Debug Info */}
      <div className="bg-blue-50 p-4 rounded-lg">
        <p>User: {user ? user.username : 'Not logged in'}</p>
        <p>Wellness Dashboard is working!</p>
      </div>
    </div>
  )
}

export default WellnessDashboard