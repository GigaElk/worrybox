import React, { useState, useEffect } from 'react'
import { worryAnalysisService, WorryCategory } from '../services/worryAnalysisService'
import { Loader2, BarChart3, AlertTriangle } from 'lucide-react'

interface WorryCategoriesProps {
  className?: string
}

const WorryCategories: React.FC<WorryCategoriesProps> = ({ className = '' }) => {
  const [categories, setCategories] = useState<WorryCategory[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadCategories()
  }, [])

  const loadCategories = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const categoryData = await worryAnalysisService.getWorryCategories()
      setCategories(categoryData)
    } catch (error) {
      console.error('Failed to load worry categories:', error)
      setError('Failed to load categories')
    } finally {
      setIsLoading(false)
    }
  }

  const getCategoryColor = (index: number) => {
    const colors = [
      'bg-blue-500',
      'bg-green-500',
      'bg-yellow-500',
      'bg-red-500',
      'bg-purple-500',
      'bg-pink-500',
      'bg-indigo-500',
      'bg-gray-500'
    ]
    return colors[index % colors.length]
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
        <div className="flex items-center space-x-2 text-red-600">
          <AlertTriangle className="w-5 h-5" />
          <span>{error}</span>
        </div>
      </div>
    )
  }

  if (categories.length === 0) {
    return (
      <div className={`text-center py-8 text-gray-500 ${className}`}>
        <BarChart3 className="w-12 h-12 mx-auto mb-2 text-gray-400" />
        <p>No worry data available yet</p>
      </div>
    )
  }

  const totalWorries = categories.reduce((sum, cat) => sum + cat.count, 0)

  return (
    <div className={`bg-white border border-gray-200 rounded-lg p-6 ${className}`}>
      <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
        <BarChart3 className="w-5 h-5 mr-2 text-blue-600" />
        Worry Categories
      </h3>

      <div className="space-y-4">
        <div className="text-sm text-gray-600 mb-4">
          Total analyzed worries: <span className="font-semibold">{totalWorries}</span>
        </div>

        {categories.map((category, index) => (
          <div key={category.category} className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">
                {category.category}
              </span>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">
                  {category.count}
                </span>
                <span className="text-sm font-medium text-gray-900">
                  {category.percentage}%
                </span>
              </div>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className={`h-2 rounded-full ${getCategoryColor(index)}`}
                style={{ width: `${category.percentage}%` }}
              ></div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 pt-4 border-t border-gray-100">
        <button
          onClick={loadCategories}
          className="text-sm text-blue-600 hover:text-blue-800 underline"
        >
          Refresh Data
        </button>
      </div>
    </div>
  )
}

export default WorryCategories