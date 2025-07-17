import React, { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { postService } from '../services/postService'
import { ArrowLeft, Loader2 } from 'lucide-react'
import WorryAnalysis from '../components/WorryAnalysis'
import SimilarWorries from '../components/SimilarWorries'

const WorryAnalysisPage: React.FC = () => {
  const { postId } = useParams<{ postId: string }>()
  const [post, setPost] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (postId) {
      loadPost(postId)
    }
  }, [postId])

  const loadPost = async (id: string) => {
    try {
      setIsLoading(true)
      setError(null)
      const postData = await postService.getPost(id)
      setPost(postData)
    } catch (error: any) {
      console.error('Failed to load post:', error)
      setError(error.response?.data?.error?.message || 'Failed to load post')
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    )
  }

  if (error || !post) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <h2 className="text-xl font-bold text-red-800 mb-2">Error</h2>
          <p className="text-red-700 mb-4">{error || 'Post not found'}</p>
          <Link to="/" className="text-blue-600 hover:text-blue-800 underline">
            Return to Home
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-6">
          <Link to={`/posts/${postId}`} className="flex items-center text-blue-600 hover:text-blue-800">
            <ArrowLeft className="w-4 h-4 mr-1" />
            <span>Back to Post</span>
          </Link>
        </div>

        {/* Post Summary */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <div className="mb-4">
            <p className="text-sm text-gray-600 italic mb-2">"{post.worryPrompt}"</p>
            <h1 className="text-xl font-bold text-gray-900">{post.shortContent}</h1>
          </div>
          <div className="text-gray-600">
            <p>Posted by {post.user.displayName || post.user.username}</p>
            <p className="text-sm">{new Date(post.createdAt).toLocaleDateString()}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Analysis */}
          <div className="lg:col-span-2">
            <WorryAnalysis postId={postId || ''} />
          </div>

          {/* Similar Worries Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <SimilarWorries postId={postId || ''} limit={10} />
            </div>
          </div>
        </div>
      </div>
  )
}

export default WorryAnalysisPage