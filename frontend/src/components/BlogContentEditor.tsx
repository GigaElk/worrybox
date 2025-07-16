import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { postService, PostResponse, AddBlogContentRequest } from '../services/postService'
import { FileText, Save, X, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'

const blogContentSchema = z.object({
  longContent: z.string().min(1, 'Blog content cannot be empty').max(10000, 'Blog content must be less than 10,000 characters'),
})

type BlogContentFormData = z.infer<typeof blogContentSchema>

interface BlogContentEditorProps {
  post: PostResponse
  onUpdate: (updatedPost: PostResponse) => void
  onCancel: () => void
}

const BlogContentEditor: React.FC<BlogContentEditorProps> = ({ post, onUpdate, onCancel }) => {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isRemoving, setIsRemoving] = useState(false)

  const hasExistingContent = post.longContent && post.longContent.length > 0

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    watch,
  } = useForm<BlogContentFormData>({
    resolver: zodResolver(blogContentSchema),
    defaultValues: {
      longContent: post.longContent || '',
    },
  })

  const longContent = watch('longContent')

  const onSubmit = async (data: BlogContentFormData) => {
    setIsSubmitting(true)
    try {
      const blogData: AddBlogContentRequest = {
        longContent: data.longContent,
      }

      const updatedPost = await postService.addBlogContent(post.id, blogData)
      onUpdate(updatedPost)
      toast.success(hasExistingContent ? 'Blog content updated!' : 'Blog content added!')
    } catch (error: any) {
      const message = error.response?.data?.error?.message || 'Failed to save blog content'
      toast.error(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleRemove = async () => {
    if (!window.confirm('Are you sure you want to remove the blog content? This action cannot be undone.')) {
      return
    }

    setIsRemoving(true)
    try {
      const updatedPost = await postService.removeBlogContent(post.id)
      onUpdate(updatedPost)
      toast.success('Blog content removed')
    } catch (error: any) {
      const message = error.response?.data?.error?.message || 'Failed to remove blog content'
      toast.error(message)
    } finally {
      setIsRemoving(false)
    }
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <FileText className="w-5 h-5 text-primary-600" />
          <h3 className="text-lg font-semibold text-gray-900">
            {hasExistingContent ? 'Edit Blog Content' : 'Add Blog Content'}
          </h3>
        </div>
        <button
          onClick={onCancel}
          className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Original Post Preview */}
        <div className="bg-gray-50 rounded-lg p-4 border-l-4 border-primary-500">
          <p className="text-sm text-gray-600 italic mb-2">"{post.worryPrompt}"</p>
          <p className="text-gray-900">{post.shortContent}</p>
        </div>

        {/* Blog Content Editor */}
        <div>
          <label htmlFor="longContent" className="block text-sm font-medium text-gray-700 mb-2">
            Extended thoughts and reflections
          </label>
          <textarea
            {...register('longContent')}
            id="longContent"
            rows={12}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
            placeholder="Share your deeper thoughts, experiences, or reflections about this worry. You can write about what led to this feeling, how it affects you, what you've tried, or anything else you'd like to express..."
          />
          <div className="mt-2 flex justify-between items-center">
            {errors.longContent && (
              <p className="text-sm text-red-600">{errors.longContent.message}</p>
            )}
            <span className={`text-sm ${longContent?.length > 9000 ? 'text-red-600' : 'text-gray-500'}`}>
              {longContent?.length || 0}/10,000 characters
            </span>
          </div>
        </div>

        {/* Writing Tips */}
        <div className="bg-blue-50 rounded-lg p-4">
          <h4 className="text-sm font-medium text-blue-900 mb-2">Writing Tips:</h4>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Share what's behind your worry - the story, context, or background</li>
            <li>• Describe how this worry affects your daily life or relationships</li>
            <li>• Mention any coping strategies you've tried or are considering</li>
            <li>• Express what kind of support or advice would be most helpful</li>
            <li>• Remember: this is a safe space to be vulnerable and authentic</li>
          </ul>
        </div>

        {/* Form Actions */}
        <div className="flex justify-between items-center pt-4 border-t border-gray-200">
          <div>
            {hasExistingContent && (
              <button
                type="button"
                onClick={handleRemove}
                disabled={isRemoving}
                className="inline-flex items-center px-3 py-2 text-sm font-medium text-red-600 bg-white border border-red-300 rounded-md shadow-sm hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isRemoving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600 mr-2"></div>
                    Removing...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4 mr-2" />
                    Remove Blog Content
                  </>
                )}
              </button>
            )}
          </div>

          <div className="flex space-x-3">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !isDirty || !!errors.longContent}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-primary-600 border border-transparent rounded-md shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  {hasExistingContent ? 'Update' : 'Add'} Blog Content
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}

export default BlogContentEditor