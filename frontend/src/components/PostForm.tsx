import React, { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { postService, CreatePostRequest, PostResponse } from '../services/postService'
import { Globe, Users, Lock, Calendar } from 'lucide-react'
import toast from 'react-hot-toast'

const postSchema = z.object({
  shortContent: z.string().min(1, 'Please share your worry').max(280, 'Worry must be less than 280 characters'),
  worryPrompt: z.string().min(1, 'Please select a prompt'),
  privacyLevel: z.enum(['public', 'friends', 'private']),
  longContent: z.string().max(10000, 'Extended content must be less than 10,000 characters').optional().or(z.literal('')),
  isScheduled: z.boolean().optional(),
  scheduledFor: z.string().optional(),
})

type PostFormData = z.infer<typeof postSchema>

interface PostFormProps {
  onPostCreated: (post: PostResponse) => void
  onCancel?: () => void
}

const PostForm: React.FC<PostFormProps> = ({ onPostCreated, onCancel }) => {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [worryPrompts, setWorryPrompts] = useState<string[]>([])
  const [showExtended, setShowExtended] = useState(false)
  const [showScheduling, setShowScheduling] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    watch,
    reset,
    setValue,
  } = useForm<PostFormData>({
    resolver: zodResolver(postSchema),
    defaultValues: {
      privacyLevel: 'public',
      isScheduled: false,
    },
    mode: 'onChange',
  })

  const shortContent = watch('shortContent')
  const isScheduled = watch('isScheduled')

  useEffect(() => {
    const fetchPrompts = async () => {
      try {
        const prompts = await postService.getWorryPrompts()
        setWorryPrompts(prompts)
        if (prompts.length > 0) {
          setValue('worryPrompt', prompts[0])
        }
      } catch (error) {
        console.error('Failed to fetch worry prompts:', error)
        toast.error('Failed to load worry prompts')
      }
    }

    fetchPrompts()
  }, [setValue])

  const onSubmit = async (data: PostFormData) => {
    setIsSubmitting(true)
    try {
      const postData: CreatePostRequest = {
        shortContent: data.shortContent,
        worryPrompt: data.worryPrompt,
        privacyLevel: data.privacyLevel,
        longContent: data.longContent || undefined,
        isScheduled: data.isScheduled,
        scheduledFor: data.scheduledFor || undefined,
      }

      const post = await postService.createPost(postData)
      onPostCreated(post)
      reset()
      setShowExtended(false)
      setShowScheduling(false)
      toast.success('Your worry has been shared!')
    } catch (error: any) {
      const message = error.response?.data?.error?.message || 'Failed to create post'
      toast.error(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancel = () => {
    reset()
    setShowExtended(false)
    setShowScheduling(false)
    onCancel?.()
  }

  const privacyOptions = [
    { value: 'public', label: 'Public', icon: Globe, description: 'Anyone can see this' },
    { value: 'friends', label: 'Friends', icon: Users, description: 'Only people you follow' },
    { value: 'private', label: 'Private', icon: Lock, description: 'Only you can see this' },
  ] as const

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
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
            {showExtended ? 'Hide' : 'Add'} extended thoughts
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

        {/* Scheduling Toggle */}
        <div>
          <button
            type="button"
            onClick={() => setShowScheduling(!showScheduling)}
            className="flex items-center text-sm text-primary-600 hover:text-primary-700"
          >
            <Calendar className="w-4 h-4 mr-1" />
            {showScheduling ? 'Cancel scheduling' : 'Schedule for later'}
          </button>
        </div>

        {/* Scheduling Options */}
        {showScheduling && (
          <div className="space-y-3">
            <div className="flex items-center">
              <input
                {...register('isScheduled')}
                type="checkbox"
                id="isScheduled"
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
              />
              <label htmlFor="isScheduled" className="ml-2 block text-sm text-gray-900">
                Schedule this post
              </label>
            </div>

            {isScheduled && (
              <div>
                <label htmlFor="scheduledFor" className="block text-sm font-medium text-gray-700 mb-1">
                  Schedule for
                </label>
                <input
                  {...register('scheduledFor')}
                  type="datetime-local"
                  id="scheduledFor"
                  min={new Date().toISOString().slice(0, 16)}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                />
                {errors.scheduledFor && (
                  <p className="mt-1 text-sm text-red-600">{errors.scheduledFor.message}</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Form Actions */}
        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
          {onCancel && (
            <button
              type="button"
              onClick={handleCancel}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={isSubmitting || !isValid}
            className="px-4 py-2 text-sm font-medium text-white bg-primary-600 border border-transparent rounded-md shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Sharing...' : isScheduled ? 'Schedule Post' : 'Share Worry'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default PostForm