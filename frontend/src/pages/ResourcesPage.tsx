import React, { useState, useEffect } from 'react'
// import { mentalHealthResourceService, MentalHealthResource, ResourceSearchParams } from '../services/mentalHealthResourceService'
import { Filter, Search, Loader2, AlertCircle, Tag, Globe, DollarSign, X } from 'lucide-react'
// import ResourceCard from '../components/ResourceCard'
// import CrisisResourceBanner from '../components/CrisisResourceBanner'

// Temporary types for compilation
interface MentalHealthResource {
  id: string
  title: string
  description: string
}

interface ResourceSearchParams {
  query?: string
  category?: string
  tags?: string[]
  country?: string
  cost?: string
  isCrisis?: boolean
}

const ResourcesPage: React.FC = () => {
  const [resources, setResources] = useState<MentalHealthResource[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [tags, setTags] = useState<string[]>([])
  const [countries, setCountries] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showFilters, setShowFilters] = useState(false)
  
  // Filter states
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [selectedCountry, setSelectedCountry] = useState('')
  const [selectedCost, setSelectedCost] = useState<string>('')
  const [showCrisisOnly, setShowCrisisOnly] = useState(false)

  useEffect(() => {
    loadResources()
    loadFilterOptions()
  }, [])

  useEffect(() => {
    applyFilters()
  }, [selectedCategory, selectedTags, selectedCountry, selectedCost, showCrisisOnly, searchQuery])

  const loadResources = async () => {
    try {
      setIsLoading(true)
      setError(null)
      // const data = await mentalHealthResourceService.getResources()
      // setResources(data)
      setResources([]) // Temporary empty array
    } catch (error: any) {
      console.error('Failed to load resources:', error)
      setError(error.response?.data?.error?.message || 'Failed to load resources')
    } finally {
      setIsLoading(false)
    }
  }

  const loadFilterOptions = async () => {
    try {
      // const [categoriesData, tagsData, countriesData] = await Promise.all([
      //   mentalHealthResourceService.getResourceCategories(),
      //   mentalHealthResourceService.getResourceTags(),
      //   mentalHealthResourceService.getAvailableCountries()
      // ])
      
      // setCategories(categoriesData)
      // setTags(tagsData)
      // setCountries(countriesData)
      
      // Temporary empty arrays
      setCategories([])
      setTags([])
      setCountries([])
    } catch (error) {
      console.error('Failed to load filter options:', error)
    }
  }

  const applyFilters = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const params: ResourceSearchParams = {}
      
      if (selectedCategory) params.category = selectedCategory
      if (selectedTags.length > 0) params.tags = selectedTags
      if (selectedCountry) params.country = selectedCountry
      if (selectedCost) params.cost = selectedCost as any
      if (showCrisisOnly) params.isCrisis = true
      if (searchQuery) params.query = searchQuery

      // const data = await mentalHealthResourceService.getResources(params)
      // setResources(data)
      setResources([]) // Temporary empty array
    } catch (error: any) {
      console.error('Failed to apply filters:', error)
      setError(error.response?.data?.error?.message || 'Failed to filter resources')
    } finally {
      setIsLoading(false)
    }
  }

  const clearFilters = () => {
    setSelectedCategory('')
    setSelectedTags([])
    setSelectedCountry('')
    setSelectedCost('')
    setShowCrisisOnly(false)
    setSearchQuery('')
  }

  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter(t => t !== tag))
    } else {
      setSelectedTags([...selectedTags, tag])
    }
  }

  const formatCategory = (category: string) => {
    return category.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ')
  }

  const hasActiveFilters = selectedCategory || selectedTags.length > 0 || selectedCountry || selectedCost || showCrisisOnly

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Crisis Resources Banner */}
      {/* <CrisisResourceBanner className="mb-8" /> */}

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Mental Health Resources</h1>
        <p className="text-gray-600">
          Find professional support, self-help tools, and community resources for mental health and wellbeing.
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
              placeholder="Search resources..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Filter Toggle */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center px-4 py-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <Filter className="w-4 h-4 mr-2" />
              Filters
              {hasActiveFilters && (
                <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                  {[selectedCategory, ...selectedTags, selectedCountry, selectedCost, showCrisisOnly ? 'Crisis' : ''].filter(Boolean).length}
                </span>
              )}
            </button>
            
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="flex items-center px-3 py-2 text-gray-500 hover:text-gray-700 text-sm"
              >
                <X className="w-4 h-4 mr-1" />
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Category Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">All Categories</option>
                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {formatCategory(category)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Country Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Globe className="w-4 h-4 inline mr-1" />
                  Country
                </label>
                <select
                  value={selectedCountry}
                  onChange={(e) => setSelectedCountry(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">All Countries</option>
                  {countries.map((country) => (
                    <option key={country} value={country}>
                      {country}
                    </option>
                  ))}
                </select>
              </div>

              {/* Cost Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <DollarSign className="w-4 h-4 inline mr-1" />
                  Cost
                </label>
                <select
                  value={selectedCost}
                  onChange={(e) => setSelectedCost(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">All Costs</option>
                  <option value="free">Free</option>
                  <option value="paid">Paid</option>
                  <option value="insurance">Insurance</option>
                  <option value="sliding_scale">Sliding Scale</option>
                </select>
              </div>

              {/* Crisis Only Toggle */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Options</label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={showCrisisOnly}
                    onChange={(e) => setShowCrisisOnly(e.target.checked)}
                    className="rounded border-gray-300 text-red-600 focus:ring-red-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Crisis resources only</span>
                </label>
              </div>
            </div>

            {/* Tags Filter */}
            <div className="mt-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Tag className="w-4 h-4 inline mr-1" />
                Tags
              </label>
              <div className="flex flex-wrap gap-2">
                {tags.slice(0, 20).map((tag) => (
                  <button
                    key={tag}
                    onClick={() => toggleTag(tag)}
                    className={`px-3 py-1 text-sm rounded-full border transition-colors ${
                      selectedTags.includes(tag)
                        ? 'bg-blue-100 text-blue-800 border-blue-300'
                        : 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200'
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Results */}
      <div>
        {/* Results Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">
            {isLoading ? 'Loading...' : `${resources.length} Resources Found`}
          </h2>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-6">
            <div className="flex items-center space-x-2 text-red-600 mb-2">
              <AlertCircle className="w-5 h-5" />
              <h3 className="font-medium">Error Loading Resources</h3>
            </div>
            <p className="text-red-700 mb-4">{error}</p>
            <button
              onClick={loadResources}
              className="text-sm text-red-600 hover:text-red-800 underline"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Resources Grid */}
        {!isLoading && !error && (
          <>
            {resources.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-600 mb-4">No resources found matching your criteria.</p>
                <button
                  onClick={clearFilters}
                  className="text-blue-600 hover:text-blue-800 underline"
                >
                  Clear filters to see all resources
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {resources.map((resource) => (
                  <div key={resource.id} className="bg-white p-6 rounded-lg border border-gray-200">
                    <h3 className="font-semibold text-gray-900">{resource.title}</h3>
                    <p className="text-gray-600 mt-2">{resource.description}</p>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default ResourcesPage