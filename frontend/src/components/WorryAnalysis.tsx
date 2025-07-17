import React, { useState, useEffect } from 'react'
import { worryAnalysisService, WorryAnalysisResult } from '../services/worryAnalysisService'
import { Loader2, BarChart2, AlertTriangle, TrendingUp, Brain, Hash } from 'lucide-react'

interface WorryAnalysisProps {
  postId: string
  className?: string
  showAnalyzeButton?: boolean
}

const WorryAnalysis: React.FC<WorryAnalysisProps> = ({ 
  postId, 
  className = '', 
  showAnalyzeButton = true 
}) => {
  const [analysis, setAnalysis] = useState<WorryAnalysisResult | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadAnalysis()
  }, [postId])

  const loadAnalysis = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const result = await worryAnalysisService.getWorryAnalysis(postId)
      setAnalysis(result)
    } catch (error) {
      console.error('Failed to load worry analysis:', error)
      setError('Failed to load analysis')
    } finally {
      setIsLoading(false)
    }
  }

  const handleAnalyze = async () => {
    try {
      setIsAnalyzing(true)
      setError(null)
      const result = await worryAnalysisService.analyzeWorry(postId)
      setAnalysis(result)
    } catch (error: any) {
      console.error('Failed to analyze worry:', error)
      setError(error.response?.data?.error?.message || 'Failed to analyze worry')
    } finally {
      setIsAnalyzing(false)
    }
  }

  const getSentimentColor = (score: number) => {
    if (score <= -0.5) return 'text-red-600'
    if (score < 0) return 'text-orange-600'
    if (score === 0) return 'text-gray-600'
    if (score <= 0.5) return 'text-blue-600'
    return 'text-green-600'
  }

  const getSentimentLabel = (score: number) => {
    if (score <= -0.7) return 'Very Negative'
    if (score <= -0.3) return 'Negative'
    if (score < 0.3) return 'Neutral'
    if (score < 0.7) return 'Positive'
    return 'Very Positive'
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600'
    if (confidence >= 0.6) return 'text-blue-600'
    if (confidence >= 0.4) return 'text-yellow-600'
    return 'text-red-600'
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
          <AlertTriangle className="w-5 h-5" />
          <h3 className="font-medium">Analysis Error</h3>
        </div>
        <p className="text-red-700">{error}</p>
        <button
          onClick={loadAnalysis}
          className="mt-3 text-sm text-red-600 hover:text-red-800 underline"
        >
          Try Again
        </button>
      </div>
    )
  }

  if (!analysis) {
    if (!showAnalyzeButton) return null
    
    return (
      <div className={`bg-white border border-gray-200 rounded-lg p-6 ${className}`}>
        <div className="text-center">
          <Brain className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Analysis Available</h3>
          <p className="text-gray-600 mb-4">This worry hasn't been analyzed yet.</p>
          <button
            onClick={handleAnalyze}
            disabled={isAnalyzing}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 mx-auto"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Analyzing...</span>
              </>
            ) : (
              <>
                <Brain className="w-4 h-4" />
                <span>Analyze This Worry</span>
              </>
            )}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={`bg-white border border-gray-200 rounded-lg p-6 ${className}`}>
      <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
        <BarChart2 className="w-5 h-5 mr-2 text-blue-600" />
        Worry Analysis
      </h3>

      <div className="space-y-6">
        {/* Category */}
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">Category</h4>
          <div className="flex items-center space-x-2">
            <span className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full">
              {analysis.category}
            </span>
            {analysis.subcategory && (
              <span className="px-3 py-1 bg-blue-50 text-blue-700 text-sm rounded-full">
                {analysis.subcategory}
              </span>
            )}
          </div>
        </div>

        {/* Sentiment Score */}
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">Sentiment</h4>
          <div className="flex items-center">
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div 
                className="h-2.5 rounded-full bg-blue-600" 
                style={{ 
                  width: `${((analysis.sentimentScore + 1) / 2) * 100}%`,
                  backgroundColor: analysis.sentimentScore < 0 ? '#f87171' : '#60a5fa'
                }}
              ></div>
            </div>
            <span className={`ml-3 font-medium ${getSentimentColor(analysis.sentimentScore)}`}>
              {getSentimentLabel(analysis.sentimentScore)}
            </span>
          </div>
          <div className="text-xs text-gray-500 mt-1">
            Score: {analysis.sentimentScore.toFixed(2)}
          </div>
        </div>

        {/* Keywords */}
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">Keywords</h4>
          <div className="flex flex-wrap gap-2">
            {analysis.keywords.map((keyword) => (
              <span 
                key={keyword}
                className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded flex items-center"
              >
                <Hash className="w-3 h-3 mr-1" />
                {keyword}
              </span>
            ))}
          </div>
        </div>

        {/* Similar Worry Count */}
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">Similar Worries</h4>
          <div className="flex items-center space-x-2">
            <TrendingUp className="w-4 h-4 text-green-600" />
            <span className="text-lg font-semibold text-green-600">
              {analysis.similarWorryCount}
            </span>
            <span className="text-sm text-gray-600">
              others have similar concerns
            </span>
          </div>
        </div>

        {/* Confidence */}
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">Analysis Confidence</h4>
          <div className="flex items-center">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="h-2 rounded-full bg-green-600" 
                style={{ width: `${analysis.confidence * 100}%` }}
              ></div>
            </div>
            <span className={`ml-3 text-sm font-medium ${getConfidenceColor(analysis.confidence)}`}>
              {Math.round(analysis.confidence * 100)}%
            </span>
          </div>
        </div>

        {/* Re-analyze button */}
        {showAnalyzeButton && (
          <div className="pt-4 border-t border-gray-100">
            <button
              onClick={handleAnalyze}
              disabled={isAnalyzing}
              className="text-sm text-blue-600 hover:text-blue-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Re-analyzing...</span>
                </>
              ) : (
                <>
                  <Brain className="w-4 h-4" />
                  <span>Re-analyze</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default WorryAnalysis