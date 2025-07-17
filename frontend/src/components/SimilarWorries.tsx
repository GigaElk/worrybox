import React, { useState, useEffect } from 'react'
import { worryAnalysisService, SimilarWorry } from '../services/worryAnalysisService'
import { Link } from 'react-router-dom'
import { Loader2, Link as LinkIcon, AlertTriangle, Users, TrendingUp } from 'lucide-react'

interface SimilarWorriesProps {
  postId: string
  className?: string
  limit?: number
}

const SimilarWorries: React.FC<SimilarWorriesProps> = ({ 
  postId, 
  className = '', 
  limit = 5 
}) => {
  const [similarWorries, setSimilarWorries] = useState<SimilarWorry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadSimilarWorries()
  }, [postId, limit])

  const loadSimilarWorries = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const worries = await worryAnalysisService.findSimilarWorries(postId, limit)
      setSimilarWorries(worries)
    } catch (error) {
      console.error('Failed to load similar worries:', error)
      setError('Failed to load similar worries')
    } finally {
      setIsLoading(false)
    }
  }

  const getSimilarityColor = (similarity: number) => {
    if (similarity >= 0.8) return 'text-green-600'
    if (similarity >= 0.6) return 'text-blue-600'
    if (similarity >= 0.4) return 'text-yellow-600'
    return 'text-gray-600'
  }

  if (isLoading) {
    return (
      <div className={`flex justify-center items-center py-4 ${className}`}>
        <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
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
      </div>
    )
  }

  if (similarWorries.length === 0) {
    return (
      <div className={`text-sm text-gray-500 ${className}`}>
        <div className="flex items-center space-x-1">
          <Users className="w-4 h-4" />
          <span>No similar worries found</span>
        </div>
      </div>
    )
  }

  return (
    <div className={`${className}`}>
      <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
        <TrendingUp className="w-4 h-4 mr-1" />
        Similar Worries ({similarWorries.length})
      </h3>
      <div className="space-y-3">
        {similarWorries.map((worry) => (
          <div key={worry.id} className="border-l-2 border-gray-200 pl-3 hover:border-blue-300 transition-colors">
            <Link 
              to={`/posts/${worry.id}`}
              className="text-sm text-blue-600 hover:text-blue-800 hover:underline flex items-start space-x-1"
            >
              <LinkIcon className="w-3 h-3 mt-0.5 flex-shrink-0" />
              <span className="line-clamp-2">{worry.shortContent}</span>
            </Link>
            <div className="flex items-center justify-between mt-1">
              <div className="flex items-center space-x-2 text-xs text-gray-500">
                <span className="px-2 py-0.5 bg-gray-100 rounded">
                  {worry.category}
                </span>
                {worry.subcategory && (
                  <span className="px-2 py-0.5 bg-gray-50 rounded">
                    {worry.subcategory}
                  </span>
                )}
              </div>
              <div className="flex items-center space-x-2 text-xs">
                <span className={`font-medium ${getSimilarityColor(worry.similarity)}`}>
                  {Math.round(worry.similarity * 100)}% similar
                </span>
                <span className="text-gray-500">
                  {worry.anonymousCount} similar
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default SimilarWorries