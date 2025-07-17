import React, { useState, useEffect } from 'react'
import { guidedExerciseService } from '../services/guidedExerciseService'
import { useAuth } from '../contexts/AuthContext'
import { Filter, Search, Loader2 } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import CopingTechniqueList from '../components/CopingTechniqueList'
import FeatureGate from '../components/FeatureGate'

const CopingTechniquesPage: React.FC = () => {
  const { user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const [categories, setCategories] = useState<string[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string>(searchParams.get('category') || '')
  const [searchTerm, setSearchTerm] = useState<string>('')
  const [isLoadingCategories, setIsLoadingCategories] = useState(true)
  const [showFilters, setShowFilters] = useState(false)

  useEffect(() => {
    if (user) {
      loadCategories()
    }
  }, [user])

  useEffect(() => {
    // Update URL when category changes
    if (selectedCategory) {
      setSearchParams({ category: selectedCategory })
    } else {
      setSearchParams({})
    }
  }, [selectedCategory, setSearchParams])

  const loadCategories = async () => {
    try {
      setIsLoadingCategories(true)
      const data = await guidedExerciseService.getCopingTechniqueCategories()
      setCategories(data)
    } catch (error: any) {
      console.error('Failed to load categories:', error)
    } finally {
      setIsLoadingCategories(false)
    }
  }

  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category === selectedCategory ? '' : category)
  }

  const clearFilters = () => {
    setSelectedCategory('')
    setSearchTerm('')
  }

  return (
    <FeatureGate feature="guided_exercises">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Coping Techniques</h1>
          <p className="text-gray-600">
            Learn evidence-based strategies and techniques to help you manage stress, anxiety, and difficult emotions.
          </p>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search techniques..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>

            {/* Filter Toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center px-4 py-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <Filter className="w-4 h-4 mr-2" />
              Filters
              {selectedCategory && (
                <span className="ml-2 px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                  1
                </span>
              )}
            </button>
          </div>

          {/* Filters Panel */}
          {showFilters && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="flex flex-col lg:flex-row gap-6">
                {/* Categories */}
                <div className="flex-1">
                  <h3 className="text-sm font-medium text-gray-700 mb-3">Categories</h3>
                  {isLoadingCategories ? (
                    <div className="flex items-center">
                      <Loader2 className="w-4 h-4 animate-spin text-gray-400 mr-2" />
                      <span className="text-sm text-gray-500">Loading categories...</span>
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {categories.map((category) => (
                        <button
                          key={category}
                          onClick={() => handleCategoryChange(category)}
                          className={`px-3 py-2 text-sm rounded-lg border transition-colors ${
                            selectedCategory === category
                              ? 'bg-green-100 border-green-300 text-green-800'
                              : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          {category.charAt(0).toUpperCase() + category.slice(1)}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Clear Filters */}
                {(selectedCategory || searchTerm) && (
                  <div className="flex items-end">
                    <button
                      onClick={clearFilters}
                      className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 underline"
                    >
                      Clear all filters
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Active Filters */}
        {(selectedCategory || searchTerm) && (
          <div className="mb-6">
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">Active filters:</span>
              {selectedCategory && (
                <span className="inline-flex items-center px-3 py-1 bg-green-100 text-green-800 text-sm rounded-full">
                  Category: {selectedCategory}
                  <button
                    onClick={() => setSelectedCategory('')}
                    className="ml-2 text-green-600 hover:text-green-800"
                  >
                    ×
                  </button>
                </span>
              )}
              {searchTerm && (
                <span className="inline-flex items-center px-3 py-1 bg-gray-100 text-gray-800 text-sm rounded-full">
                  Search: "{searchTerm}"
                  <button
                    onClick={() => setSearchTerm('')}
                    className="ml-2 text-gray-600 hover:text-gray-800"
                  >
                    ×
                  </button>
                </span>
              )}
            </div>
          </div>
        )}

        {/* Technique List */}
        <CopingTechniqueList 
          category={selectedCategory || undefined}
          showViewAll={false}
        />

        {/* Help Section */}
        <div className="mt-12 bg-green-50 rounded-lg border border-green-200 p-8 text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">How to Use Coping Techniques</h2>
          <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
            Coping techniques are tools you can use when you're feeling overwhelmed, anxious, or stressed. 
            The key is to practice them regularly so they become natural responses when you need them most.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            <div className="text-center">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-green-600 font-bold">1</span>
              </div>
              <h3 className="font-medium text-gray-900 mb-2">Learn</h3>
              <p className="text-sm text-gray-600">Read through the technique and understand how it works</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-green-600 font-bold">2</span>
              </div>
              <h3 className="font-medium text-gray-900 mb-2">Practice</h3>
              <p className="text-sm text-gray-600">Try the technique when you're calm to build familiarity</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-green-600 font-bold">3</span>
              </div>
              <h3 className="font-medium text-gray-900 mb-2">Apply</h3>
              <p className="text-sm text-gray-600">Use the technique when you're feeling stressed or anxious</p>
            </div>
          </div>
        </div>
      </div>
    </FeatureGate>
  )
}

export default CopingTechniquesPage