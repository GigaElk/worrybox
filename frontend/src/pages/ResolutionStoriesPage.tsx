import React, { useState, useEffect } from 'react'
import { worryResolutionService, WorryResolution } from '../services/worryResolutionService'
import { Heart, Loader2, AlertCircle, Filter, Search } from 'lucide-react'
import ResolutionDisplay from '../components/ResolutionDisplay'

const ResolutionStoriesPage: React.FC = () => {
  const [stories, setStories] = useState<WorryResolution[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [searchTerm, setSearchTerm] = useState<string>('')
  const [showFilters, setShowFilters] = useState(false)

  // Available categories (this could be fetched from an API)
  const categories = [
    'work', 'relationships', 'health', 'family', 'finances', 
    'education', 'future', 'social', 'personal', 'other'
  ]

  useEffect(() => {
    loadStories()
  }, [selectedCategory])

  const loadStories = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const data = await worryResolutionService.getPublicResolutionStories(
        20, 
        selectedCategory || undefined
      )
      setStories(data)
    } catch (error: any) {
      console.error('Failed to load resolution stories:', error)
      setError(error.response?.data?.error?.message || 'Failed to load resolution stories')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category === selectedCategory ? '' : category)
  }

  const clearFilters = () => {
    setSelectedCategory('')
    setSearchTerm('')
  }

  // Filter stories based on search term
  const filteredStories = stories.filter(story => {
    if (!searchTerm) return true
    const searchLower = searchTerm.toLowerCase()
    return (
      story.post.shortContent.toLowerCase().includes(searchLower) ||
      story.resolutionStory?.toLowerCase().includes(searchLower) ||
      story.copingMethods.some(method => method.toLowerCase().includes(searchLower))
    )
  })

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center space-x-3 mb-4">
          <Heart className="w-8 h-8 text-pink-600" />
          <h1 className="text-3xl font-bold text-gray-900">Resolution Stories</h1>
        </div>
        <p className="text-gray-600">
          Find inspiration from others who have overcome their worries. These stories show that challenges can be resolved and growth is possible.
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
              placeholder="Search stories..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
            />
          </div>

          {/* Filter Toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center px-4 py-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <Filter className="w-4 h-4 mr-2" />
            Categories
            {selectedCategory && (
              <span className="ml-2 px-2 py-1 bg-pink-100 text-pink-800 text-xs rounded-full">
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
                <div className="flex flex-wrap gap-2">
                  {categories.map((category) => (
                    <button
                      key={category}
                      onClick={() => handleCategoryChange(category)}
                      className={`px-3 py-2 text-sm rounded-lg border transition-colors ${
                        selectedCategory === category
                          ? 'bg-pink-100 border-pink-300 text-pink-800'
                          : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {category.charAt(0).toUpperCase() + category.slice(1)}
                    </button>
                  ))}
                </div>
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
              <span className="inline-flex items-center px-3 py-1 bg-pink-100 text-pink-800 text-sm rounded-full">
                Category: {selectedCategory}
                <button
                  onClick={() => setSelectedCategory('')}
                  className="ml-2 text-pink-600 hover:text-pink-800"
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

      {/* Loading State */}
      {isLoading && (
        <div className="flex justify-center items-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-center space-x-2 text-red-600 mb-2">
            <AlertCircle className="w-5 h-5" />
            <h3 className="font-medium">Error Loading Stories</h3>
          </div>
          <p className="text-red-700 mb-4">{error}</p>
          <button
            onClick={loadStories}
            className="text-sm text-red-600 hover:text-red-800 underline"
          >
            Try Again
          </button>
        </div>
      )}

      {/* Stories List */}
      {!isLoading && !error && (
        <>
          {filteredStories.length > 0 ? (
            <div className="space-y-6">
              {filteredStories.map((story) => (
                <ResolutionDisplay
                  key={story.id}
                  resolution={story}
                  showPost={true}
                  showAuthor={true}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Heart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Stories Found</h3>
              <p className="text-gray-600 mb-4">
                {searchTerm || selectedCategory
                  ? 'Try adjusting your search or filters to find more stories.'
                  : 'No resolution stories have been shared yet.'}
              </p>
              {(searchTerm || selectedCategory) && (
                <button
                  onClick={clearFilters}
                  className="text-pink-600 hover:text-pink-800 underline"
                >
                  Clear filters
                </button>
              )}
            </div>
          )}
        </>
      )}

      {/* Encouragement Section */}
      {!isLoading && !error && filteredStories.length > 0 && (
        <div className="mt-12 bg-gradient-to-r from-pink-50 to-purple-50 rounded-lg border border-pink-200 p-8 text-center">
          <Heart className="w-12 h-12 text-pink-600 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Share Your Story</h2>
          <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
            Have you overcome a worry? Your story could inspire and help others facing similar challenges. 
            When you mark a worry as resolved, you can choose to share your journey publicly.
          </p>
          <p className="text-pink-600 text-sm">
            Every resolution story is a beacon of hope for someone else.
          </p>
        </div>
      )}
    </div>
  )
}

export default ResolutionStoriesPage