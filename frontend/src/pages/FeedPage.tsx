import React, { useState, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'
import PostForm from '../components/PostForm'
import PostEditForm from '../components/PostEditForm'
import ComprehensiveFeed, { ComprehensiveFeedRef } from '../components/ComprehensiveFeed'
import BlogContentEditor from '../components/BlogContentEditor'
import { PostResponse } from '../services/postService'
import { Plus, X } from 'lucide-react'

const FeedPage: React.FC = () => {
  const { isAuthenticated } = useAuth()
  const [showPostForm, setShowPostForm] = useState(false)
  const [editingPost, setEditingPost] = useState<PostResponse | null>(null)
  const [editingBlogPost, setEditingBlogPost] = useState<PostResponse | null>(null)
  const feedRef = useRef<ComprehensiveFeedRef>(null)

  const handlePostCreated = (post: PostResponse) => {
    setShowPostForm(false)
    // Add the new post to the feed directly
    feedRef.current?.addNewPost(post)
  }

  const handlePostEdit = (post: PostResponse) => {
    setEditingPost(post)
  }

  const handlePostUpdate = (updatedPost: PostResponse) => {
    setEditingPost(null)
    // Refresh the feed to show updated content
    feedRef.current?.refresh()
  }

  const handlePostEditCancel = () => {
    setEditingPost(null)
  }

  const handleBlogEdit = (post: PostResponse) => {
    setEditingBlogPost(post)
  }

  const handleBlogUpdate = (_updatedPost: PostResponse) => {
    setEditingBlogPost(null)
    // Refresh the feed to show updated content
    feedRef.current?.refresh()
  }

  const handleBlogCancel = () => {
    setEditingBlogPost(null)
  }

  const handlePostDelete = (postId: string) => {
    // The PostFeed component handles the deletion
    console.log('Post deleted:', postId)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Worrybox</h1>
          <p className="text-gray-600">
            A safe space to share your worries and find support from others
          </p>
        </div>

        {/* Post Creation */}
        {isAuthenticated && (
          <div className="mb-8">
            {showPostForm ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-900">Share Your Worry</h2>
                  <button
                    onClick={() => setShowPostForm(false)}
                    className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <PostForm
                  onPostCreated={handlePostCreated}
                  onCancel={() => setShowPostForm(false)}
                />
              </div>
            ) : (
              <button
                onClick={() => setShowPostForm(true)}
                className="w-full flex items-center justify-center px-4 py-3 text-sm font-medium text-primary-600 bg-white border-2 border-dashed border-primary-300 rounded-lg hover:border-primary-400 hover:bg-primary-50 transition-colors"
              >
                <Plus className="w-5 h-5 mr-2" />
                Share a worry
              </button>
            )}
          </div>
        )}

        {/* Authentication Prompt */}
        {!isAuthenticated && (
          <div className="mb-8 bg-white rounded-lg border border-gray-200 p-6 text-center">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Join the Community</h2>
            <p className="text-gray-600 mb-4">
              Sign up or log in to share your worries and connect with others
            </p>
            <div className="space-x-3">
              <a
                href="/register"
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-primary-600 border border-transparent rounded-md shadow-sm hover:bg-primary-700"
              >
                Sign Up
              </a>
              <a
                href="/login"
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-primary-600 bg-white border border-primary-600 rounded-md shadow-sm hover:bg-primary-50"
              >
                Log In
              </a>
            </div>
          </div>
        )}

        {/* Post Edit Form */}
        {editingPost && (
          <div className="mb-8">
            <PostEditForm
              post={editingPost}
              onPostUpdated={handlePostUpdate}
              onCancel={handlePostEditCancel}
            />
          </div>
        )}

        {/* Blog Content Editor */}
        {editingBlogPost && (
          <div className="mb-8">
            <BlogContentEditor
              post={editingBlogPost}
              onUpdate={handleBlogUpdate}
              onCancel={handleBlogCancel}
            />
          </div>
        )}

        {/* Comprehensive Feed */}
        <ComprehensiveFeed
          ref={feedRef}
          onPostEdit={handlePostEdit}
          onPostDelete={handlePostDelete}
          onBlogEdit={handleBlogEdit}
        />
      </div>
    </div>
  )
}

export default FeedPage