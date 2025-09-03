import React, { useState, useEffect } from 'react'
import { SimilarWorryCountResponse } from '../services/worryAnalysisService'
import { privacyFilteringService } from '../services/privacyFilteringService'
import { Loader2, AlertTriangle, Users, TrendingUp, BarChart3 } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

interface SimilarWorriesProps {
  postId: string
  showBreakdown?: boolean
  className?: string
  onCountChange?: (count: number) => void
}

const SimilarWorries: React.FC<SimilarWorriesProps> = ({ 
  postId, 
  showBreakdown = false,
  className = '',
  onCountChange
}) => {
  const { user } = useAuth()
  const [countData, setCountData] = useState<SimilarWorryCountResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadSimilarWorryCount()
  }, [postId, showBreakdown, user])

  // Handle authentication changes
  useEffect(() => {
    privacyFilteringService.onAuthenticationChange(user?.id)
  }, [user?.id])

  // Listen for external count updates (e.g., from MeTooButton)
  useEffect(() => {
    const handleMeTooUpdate = (event: CustomEvent) => {
      if (event.detail.postId === postId && countData) {
        const newCountData = {
          ...countData,
          count: event.detail.similarWorryCount,
          breakdown: countData.breakdown ? {
            ...countData.breakdown,
            meTooResponses: event.detail.meTooCount
          } : undefined
        }
        setCountData(newCountData)
        onCountChange?.(newCountData.count)
      }
    }

    window.addEventListener('meTooUpdated', handleMeTooUpdate as EventListener)
    return () => {
      window.removeEventListener('meTooUpdated', handleMeTooUpdate as EventListener)
    }
  }, [postId, countData, onCountChange])

  const loadSimilarWorryCount = async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      // Use the privacy filtering service with user context
      const response = await privacyFilteringService.getSimilarWorryCount(
        postId,
        user?.id,
        showBreakdown
      )
      
      setCountData(response)
      onCountChange?.(response.count)
    } catch (error: any) {
      console.error('Failed to load similar worry count:', error)
      
      // Handle privacy-specific errors
      if (error.code === 'AUTHENTICATION_REQUIRED') {
        setError('Please log in to view detailed metrics')
      } else if (error.code === 'INSUFFICIENT_PERMISSIONS') {
        setError('You do not have permission to view this content')
      } else if (error.code === 'PRIVACY_VIOLATION') {
        setError('Privacy settings prevent viewing this content')
      } else {
        setError('Failed to load similar worry count')
      }
      setError('Failed to load similar worry count')
    } finally {
      setIsLoading(false)
    }
  }

  const getSimilarWorryText = () => {
    if (!countData || countData.count === 0) return 'No similar worries found'
    if (countData.count === 1) return '1 person has similar worries'
    return `${countData.count} people have similar worries`
  }

  if (isLoading) {
    return (
      <div className={`flex justify-center items-center py-2 ${className}`}>
        <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
        <span className="ml-2 text-sm text-gray-500">Loading...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`text-sm text-red-600 ${className}`}>
        <div className="flex items-center space-x-1">
          <AlertTriangle className="w-4 h-4" />
          <span>{error}</span>
        </div>
        <button 
          onClick={loadSimilarWorryCount}
          className="mt-1 text-xs text-blue-600 hover:text-blue-800 underline"
        >
          Try again
        </button>
      </div>
    )
  }

  if (!countData || countData.count === 0) {
    return (
      <div className={`text-sm text-gray-500 ${className}`}>
        <div className="flex items-center space-x-1">
          <TrendingUp className="w-4 h-4" />
          <span>No similar worries found</span>
        </div>
      </div>
    )
  }

  return (
    <div className={`${className}`}>
      <div className="flex items-center justify-center p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-100">
        <div className="text-center w-full">
          <div className="flex items-center justify-center space-x-2 mb-1">
            <TrendingUp className="w-4 h-4 text-blue-600" />
            <span className="text-xl font-bold text-blue-600">
              {countData.count}
            </span>
          </div>
          <p className="text-xs text-gray-600 mb-2">
            {getSimilarWorryText()}
          </p>
          
          {/* Optional breakdown display */}
          {showBreakdown && countData.breakdown && (
            <div className="mt-2 pt-2 border-t border-blue-200">
              <div className="flex items-center justify-center space-x-1 mb-1">
                <BarChart3 className="w-3 h-3 text-blue-500" />
                <span className="text-xs font-medium text-blue-700">Breakdown</span>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-600">AI Detected:</span>
                  <span className="font-medium text-blue-600">
                    {countData.breakdown.aiDetectedSimilar}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-600">Me Too:</span>
                  <span className="font-medium text-pink-600">
                    {countData.breakdown.meTooResponses}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default SimilarWorries