import React, { useState, useEffect } from 'react'
import { schedulingService, ScheduledPost, UpdateScheduledPostRequest } from '../services/schedulingService'
import { Calendar, Clock, Edit2, Trash2, Globe, Users, Lock, Loader2 } from 'lucide-react'
import { formatDistanceToNow, format } from 'date-fns'
import toast from 'react-hot-toast'

const ScheduledPostsManager: React.FC = () => {
  const [scheduledPosts, setScheduledPosts] = useState<ScheduledPost[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [editingPost, setEditingPost] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<UpdateScheduledPostRequest>({})

  useEffect(() => {
    loadScheduledPosts()
  }, [])

  const loadScheduledPosts = async () => {
    try {
      setIsLoading(true)
      const response = await schedulingService.getScheduledPosts()
      setScheduledPosts(response.posts)
    } catch (error) {
      console.error('Failed to load scheduled posts:', error)
      toast.error('Failed to load scheduled posts')
    } finally {
      setIsLoading(false)
    }
  }

  const handleEdit = (post: ScheduledPost) => {
    setEditingPost(post.id)
    setEditForm({
      shortContent: post.shortContent,
      longContent: post.longContent || '',
      worryPrompt: post.worryPrompt,
      privacyLevel: post.privacyLevel as 'public' | 'friends' | 'private',
      scheduledFor: post.scheduledFor ? new Date(post.scheduledFor).toISOString().slice(0, 16) : ''
    })
  }

  const handleSaveEdit = async (postId: string) => {
    try {
      const updateData = { ...editForm }
      if (updateData.scheduledFor) {
        updateData.scheduledFor = new Date(updateData.scheduledFor).toISOString()
      }

      await schedulingService.updateScheduledPost(postId, updateData)
      toast.success('Scheduled post updated successfully')
      setEditingPost(null)
      loadScheduledPosts()
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Failed to update scheduled post')
    }
  }

  const handleCancelEdit = () => {
    setEditingPost(null)
    setEditForm({})
  }

  const handleCancel = async (postId: string, shortContent: string) => {
    if (!confirm(`Are you sure you want to cancel this scheduled post: "${shortContent.substring(0, 50)}..."?`)) {
      return
    }

    try {
      await schedulingService.cancelScheduledPost(postId)
      toast.success('Scheduled post cancelled')
      loadScheduledPosts()
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Failed to cancel scheduled post')
    }
  }

  const getPrivacyIcon = (privacyLevel: string) => {
    switch (privacyLevel) {
      case 'public':
        return <Globe className="w-4 h-4 text-green-600" />
      case 'friends':
        return <Users className="w-4 h-4 text-blue-600" />
      case 'private':
        return <Lock className="w-4 h-4 text-gray-600" />
      default:
        return <Globe className="w-4 h-4 text-green-600" />
    }
  }

  const formatScheduledTime = (scheduledFor: string) => {
    const date = new Date(scheduledFor)
    const now = new Date()
    
    if (date < now) {
      return `Overdue by ${formatDistanceToNow(date)}`
    }
    
    return `In ${formatDistanceToNow(date)} (${format(date, 'MMM d, yyyy h:mm a')})`
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    )
  }

  if (scheduledPosts.length === 0) {
    return (
      <div className="text-center py-12">
        <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Scheduled Posts</h3>
        <p className="text-gray-600">You don't have any posts scheduled for the future.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Scheduled Posts</h2>
        <div className="text-sm text-gray-600">
          {scheduledPosts.length} post{scheduledPosts.length !== 1 ? 's' : ''} scheduled
        </div>
      </div>

      <div className="space-y-4">
        {scheduledPosts.map((post) => (
          <div key={post.id} className="bg-white rounded-lg border border-gray-200 p-6">
            {editingPost === post.id ? (
              // Edit Form
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Worry Content
                  </label>
                  <textarea
                    value={editForm.shortContent || ''}
                    onChange={(e) => setEditForm({ ...editForm, shortContent: e.target.value })}
                    className="w-full p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={3}
                    maxLength={280}
                  />
                  <div className="text-right text-sm text-gray-500 mt-1">
                    {(editForm.shortContent || '').length}/280
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Extended Content (Optional)
                  </label>
                  <textarea
                    value={editForm.longContent || ''}
                    onChange={(e) => setEditForm({ ...editForm, longContent: e.target.value })}
                    className="w-full p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={4}
                    maxLength={10000}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Privacy Level
                    </label>
                    <select
                      value={editForm.privacyLevel || 'public'}
                      onChange={(e) => setEditForm({ ...editForm, privacyLevel: e.target.value as any })}
                      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="public">Public</option>
                      <option value="friends">Friends</option>
                      <option value="private">Private</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Scheduled For
                    </label>
                    <input
                      type="datetime-local"
                      value={editForm.scheduledFor || ''}
                      onChange={(e) => setEditForm({ ...editForm, scheduledFor: e.target.value })}
                      min={new Date().toISOString().slice(0, 16)}
                      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div className="flex justify-end space-x-3">
                  <button
                    onClick={handleCancelEdit}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleSaveEdit(post.id)}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            ) : (
              // Display Mode
              <div>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center space-x-2">
                      {getPrivacyIcon(post.privacyLevel)}
                      <span className="text-sm text-gray-600 capitalize">{post.privacyLevel}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleEdit(post)}
                      className="p-2 text-gray-400 hover:text-blue-600 rounded-full hover:bg-blue-50"
                      title="Edit scheduled post"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleCancel(post.id, post.shortContent)}
                      className="p-2 text-gray-400 hover:text-red-600 rounded-full hover:bg-red-50"
                      title="Cancel scheduled post"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="mb-3">
                  <p className="text-sm text-gray-600 italic">"{post.worryPrompt}"</p>
                </div>

                <div className="mb-4">
                  <p className="text-gray-900 whitespace-pre-wrap">{post.shortContent}</p>
                  {post.longContent && (
                    <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                      <p className="text-gray-800 text-sm whitespace-pre-wrap">{post.longContent}</p>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-1 text-blue-600">
                      <Clock className="w-4 h-4" />
                      <span>{post.scheduledFor ? formatScheduledTime(post.scheduledFor) : 'No schedule'}</span>
                    </div>
                  </div>
                  
                  <div className="text-gray-500">
                    Created {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

export default ScheduledPostsManager