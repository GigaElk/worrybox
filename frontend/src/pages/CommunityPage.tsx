import React, { useState, useEffect } from 'react'
import { Users, TrendingUp, Heart, MessageCircle, Calendar, UserPlus } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import PostCard from '../components/PostCard'
import UserCard from '../components/UserCard'
import { postService } from '../services/postService'
import { userService } from '../services/userService'

interface CommunityStats {
  totalUsers: number
  postsToday: number
  supportGiven: number
  activeNow: number
}

interface RecentPost {
  id: string
  userId: string
  user: {
    id: string
    username: string
    displayName?: string
    avatarUrl?: string
  }
  shortContent: string
  longContent?: string
  worryPrompt: string
  privacyLevel: string
  createdAt: string
  likesCount: number
  commentsCount: number
  isLiked: boolean
}

interface ActiveUser {
  id: string
  username: string
  displayName?: string
  avatarUrl?: string
  postsCount: number
  followersCount: number
  isFollowing: boolean
}

const CommunityPage: React.FC = () => {
  const { isAuthenticated } = useAuth()
  const [stats, setStats] = useState<CommunityStats>({
    totalUsers: 0,
    postsToday: 0,
    supportGiven: 0,
    activeNow: 0
  })
  const [recentPosts, setRecentPosts] = useState<RecentPost[]>([])
  const [activeUsers, setActiveUsers] = useState<ActiveUser[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'posts' | 'users'>('posts')

  useEffect(() => {
    loadCommunityData()
  }, [])

  const loadCommunityData = async () => {
    setIsLoading(true)
    try {
      // For now, we'll use mock data since the community endpoints don't exist yet
      // TODO: Replace with actual API calls when backend endpoints are implemented
      
      // Mock community stats
      setStats({
        totalUsers: 1247,
        postsToday: 23,
        supportGiven: 156,
        activeNow: 12
      })

      // Try to load recent public posts
      try {
        const postsResponse = await postService.getFeed(1, 10)
        const publicPosts = postsResponse.posts.filter(post => post.privacyLevel === 'public')
        setRecentPosts(publicPosts.slice(0, 5))
      } catch (error) {
        console.log('Could not load community posts, using empty state')
        setRecentPosts([])
      }

      // Mock active users (in real implementation, this would come from an API)
      setActiveUsers([
        {
          id: '1',
          username: 'supportive_friend',
          displayName: 'Sarah M.',
          postsCount: 15,
          followersCount: 23,
          isFollowing: false
        },
        {
          id: '2',
          username: 'mindful_listener',
          displayName: 'Alex K.',
          postsCount: 8,
          followersCount: 17,
          isFollowing: false
        },
        {
          id: '3',
          username: 'caring_soul',
          displayName: 'Jamie L.',
          postsCount: 22,
          followersCount: 31,
          isFollowing: true
        }
      ])

    } catch (error) {
      console.error('Failed to load community data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  if (!isAuthenticated) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="text-center py-12">
          <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Join Our Community</h2>
          <p className="text-gray-600 mb-6">
            Connect with others who understand. Share support, not judgment.
          </p>
          <div className="space-x-4">
            <a
              href="/register"
              className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700"
            >
              Sign Up
            </a>
            <a
              href="/login"
              className="inline-flex items-center px-6 py-3 border border-gray-300 text-base font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              Log In
            </a>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Community</h1>
        <p className="text-gray-600">
          Connect with others who understand. Share support, find comfort in community.
        </p>
      </div>

      {/* Community Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <Users className="h-8 w-8 text-primary-600" />
            <div className="ml-4">
              <p className="text-2xl font-bold text-gray-900">{stats.totalUsers.toLocaleString()}</p>
              <p className="text-sm text-gray-600">Community Members</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <Calendar className="h-8 w-8 text-green-600" />
            <div className="ml-4">
              <p className="text-2xl font-bold text-gray-900">{stats.postsToday}</p>
              <p className="text-sm text-gray-600">Posts Today</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <Heart className="h-8 w-8 text-red-600" />
            <div className="ml-4">
              <p className="text-2xl font-bold text-gray-900">{stats.supportGiven}</p>
              <p className="text-sm text-gray-600">Support Given</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <TrendingUp className="h-8 w-8 text-blue-600" />
            <div className="ml-4">
              <p className="text-2xl font-bold text-gray-900">{stats.activeNow}</p>
              <p className="text-sm text-gray-600">Active Now</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="mb-6">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab('posts')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'posts'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Recent Posts
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'users'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Active Members
          </button>
        </nav>
      </div>

      {/* Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          {activeTab === 'posts' && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-900">Recent Community Posts</h2>
              
              {isLoading ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 animate-pulse">
                      <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                      <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                    </div>
                  ))}
                </div>
              ) : recentPosts.length > 0 ? (
                <div className="space-y-4">
                  {recentPosts.map((post) => (
                    <PostCard key={post.id} post={post} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 bg-white rounded-lg shadow-sm border border-gray-200">
                  <MessageCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Recent Posts</h3>
                  <p className="text-gray-600 mb-4">
                    Be the first to share something with the community!
                  </p>
                  <a
                    href="/dashboard"
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700"
                  >
                    Share Your First Post
                  </a>
                </div>
              )}
            </div>
          )}

          {activeTab === 'users' && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-900">Active Community Members</h2>
              
              {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 animate-pulse">
                      <div className="flex items-center space-x-3">
                        <div className="h-10 w-10 bg-gray-200 rounded-full"></div>
                        <div className="flex-1">
                          <div className="h-4 bg-gray-200 rounded w-3/4 mb-1"></div>
                          <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {activeUsers.map((user) => (
                    <UserCard key={user.id} user={user} />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Community Guidelines */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Community Guidelines</h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-start">
                <span className="text-primary-600 mr-2">•</span>
                Be kind and supportive to others
              </li>
              <li className="flex items-start">
                <span className="text-primary-600 mr-2">•</span>
                Respect privacy and boundaries
              </li>
              <li className="flex items-start">
                <span className="text-primary-600 mr-2">•</span>
                Share experiences, not advice
              </li>
              <li className="flex items-start">
                <span className="text-primary-600 mr-2">•</span>
                Report inappropriate content
              </li>
            </ul>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
            <div className="space-y-3">
              <a
                href="/dashboard"
                className="block w-full text-center px-4 py-2 border border-primary-600 text-primary-600 rounded-md hover:bg-primary-50 text-sm font-medium"
              >
                Share a Worry
              </a>
              <a
                href="/feed"
                className="block w-full text-center px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 text-sm font-medium"
              >
                Browse Feed
              </a>
            </div>
          </div>

          {/* Support Resources */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Need Support?</h3>
            <p className="text-sm text-gray-600 mb-4">
              If you're in crisis or need immediate help, please reach out to professional resources.
            </p>
            <a
              href="/resources"
              className="block w-full text-center px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 text-sm font-medium"
            >
              View Resources
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CommunityPage