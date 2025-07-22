import React, { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { postService, UpdatePostRequest, PostResponse } from '../services/postService'
import { Globe, Users, Lock } from 'lucide-react'
import toast from 'react-hot-toast'

const updatePostSchema = z.object({
  shortContent: z.string().min(1, 'Please share your worry').max(280, 'Worry must be less than 280 characters'),
  worryPrompt: z.string().min(1, 'Please select a prompt'),
  privacyLevel: z.enum(['public', 'friends', 'private']),
  commentsEnabled: z.boolean(),
  longContent: z.string().max(10000, 'Extended content must be less than 10,000 characters').optional().or(z.literal('')),
})

type PostEditFormData = z.infer<typeof updatePostSchema>

interface PostEditFormProps {
  post: PostResponse
  onPostUpdated: (post: PostResponse) => void
  onCancel: () => void
}

const PostEditForm: React.FC<PostEditFormProps> = ({ post, onPostUpdated, onCancel }) => {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [worryPrompts, setWorryPrompts] = useState<string[]>([])
  const [showExtended, setShowExtended] = useState(!!post.longContent)

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    watch,
  } = useForm<PostEditFormData>({
    resolver: zodResolver(updatePostSchema),
    defaultValues: {
      shortContent: post.shortContent,
      worryPrompt: post.worryPrompt,
      privacyLevel: post.privacyLevel as 'public' | 'friends' | 'private',
      commentsEnabled: post.commentsEnabled,
      longContent: post.longContent || '',
    },
    mode: 'onChange',
  })

  const shortContent = watch('shortContent')

  useEffect(() => {
    const fetchPrompts = async () => {
      try {
        const prompts = await postService.getWorryPrompts()
        setWorryPrompts(prompts)
      } catch (error) {
        console.error('Failed to fetch worry prompts:', error)
        toast.error('Failed to load worry prompts')
      }
    }

    fetchPrompts()
  }, [])

  const onSubmit = async (data: PostEditFormData) => {
    setIsSubmitting(true)
    try {
      const updateData: UpdatePostRequest = {
        shortContent: data.shortContent,
        worryPrompt: data.worryPrompt,
        privacyLevel: data.privacyLevel,
        commentsEnabled: data.commentsEnabled,
        longContent: data.longContent || undefined,
      }

      const updatedPost = await postService.updatePost(post.id, updateData)
      onPostUpdated(updatedPost)
      toast.success('Your post has been updated!')
    } catch (error: any) {
      const message = error.response?.data?.error?.message || 'Failed to update post'
      toast.error(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const privacyOptions = [
    { value: 'public', label: 'Public', icon: Globe, description: 'Anyone can see this' },
    { value: 'friends', label: 'Friends', icon: Users, description: 'Only people you follow' },
    { value: 'private', label: 'Private', icon: Lock, description: 'Only you can see this' },
  ] as const

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Edit Post</h3>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Worry Prompt Selection */}
        <div>
          <label htmlFor="worryPrompt" className="block text-sm font-medium text-gray-700 mb-2">
            Choose a prompt that resonates with you
          </label>
          <select
            {...register('worryPrompt')}
            id="worryPrompt"
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
          >
            {worryPrompts.map((prompt) => (
              <option key={prompt} value={prompt}>
                {prompt}
              </option>
            ))}
          </select>
          {errors.worryPrompt && (
            <p className="mt-1 text-sm text-red-600">{errors.worryPrompt.message}</p>
          )}
        </div>

        {/* Short Content */}
        <div>
          <label htmlFor="shortContent" className="block text-sm font-medium text-gray-700 mb-2">
            Share your worry
          </label>
          <textarea
            {...register('shortContent')}
            id="shortContent"
            rows={3}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
            placeholder="What's on your mind?"
          />
          <div className="mt-1 flex justify-between items-center">
            {errors.shortContent && (
              <p className="text-sm text-red-600">{errors.shortContent.message}</p>
            )}
            <span className={`text-sm ${shortContent?.length > 250 ? 'text-red-600' : 'text-gray-500'}`}>
              {shortContent?.length || 0}/280
            </span>
          </div>
        </div>

        {/* Extended Content Toggle */}
        <div>
          <button
            type="button"
            onClick={() => setShowExtended(!showExtended)}
            className="text-sm text-primary-600 hover:text-primary-700"
          >
            {showExtended ? 'Hide' : 'Show'} extended thoughts
          </button>
        </div>

        {/* Extended Content */}
        {showExtended && (
          <div>
            <label htmlFor="longContent" className="block text-sm font-medium text-gray-700 mb-2">
              Extended thoughts (optional)
            </label>
            <textarea
              {...register('longContent')}
              id="longContent"
              rows={6}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
              placeholder="Share more details about your worry if you'd like..."
            />
            {errors.longContent && (
              <p className="mt-1 text-sm text-red-600">{errors.longContent.message}</p>
            )}
          </div>
        )}

        {/* Privacy Level */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Who can see this?
          </label>
          <div className="grid grid-cols-3 gap-3">
            {privacyOptions.map((option) => {
              const Icon = option.icon
              return (
                <label key={option.value} className="relative">
                  <input
                    {...register('privacyLevel')}
                    type="radio"
                    value={option.value}
                    className="sr-only peer"
                  />
                  <div className="flex flex-col items-center p-3 border border-gray-300 rounded-lg cursor-pointer peer-checked:border-primary-500 peer-checked:bg-primary-50 hover:bg-gray-50">
                    <Icon className="w-5 h-5 text-gray-600 peer-checked:text-primary-600" />
                    <span className="mt-1 text-sm font-medium text-gray-900">{option.label}</span>
                    <span className="text-xs text-gray-500 text-center">{option.description}</span>
                  </div>
                </label>
              )
            })}
          </div>
          {errors.privacyLevel && (
            <p className="mt-1 text-sm text-red-600">{errors.privacyLevel.message}</p>
          )}
        </div>

        {/* Comment Control */}
        <div>
          <div className="flex items-center">
            <input
              {...register('commentsEnabled')}
              type="checkbox"
              id="commentsEnabled"
              className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
            />
            <label htmlFor="commentsEnabled" className="ml-2 block text-sm text-gray-900">
              Allow others to comment on this post
            </label>
          </div>
          <p className="mt-1 text-xs text-gray-500">
            When disabled, others won't be able to reply to your worry
          </p>
        </div>

        {/* Form Actions */}
        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting || !isValid}
            className="px-4 py-2 text-sm font-medium text-white bg-primary-600 border border-transparent rounded-md shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Updating...' : 'Update Post'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default PostEditForm