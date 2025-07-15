import { Link } from 'react-router-dom'
import { Heart, Shield, Users, Zap } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

const HomePage = () => {
  const { isAuthenticated } = useAuth()

  if (isAuthenticated) {
    return (
      <div className="space-y-8">
        {/* Welcome Section */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Welcome back to your safe space
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Ready to share what's on your mind? Your worries are valid, and you're not alone.
          </p>
        </div>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-2 gap-6">
          <div className="card">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Share a Worry</h2>
            <p className="text-gray-600 mb-4">
              Get it out of your head and onto paper. Sometimes that's all it takes.
            </p>
            <Link to="/new" className="btn-primary">
              New Worry Post
            </Link>
          </div>
          
          <div className="card">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Community Feed</h2>
            <p className="text-gray-600 mb-4">
              See how others are coping and offer support to those who need it.
            </p>
            <Link to="/community" className="btn-outline">
              Browse Community
            </Link>
          </div>
        </div>

        {/* Recent Activity Placeholder */}
        <div className="card">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Recent Activity</h2>
          <div className="text-center py-8 text-gray-500">
            <p>No recent activity yet. Start by sharing your first worry!</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-16">
      {/* Hero Section */}
      <div className="text-center">
        <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
          A safe space for your <span className="text-primary-600">worries</span>
        </h1>
        <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
          Worrybox helps you externalize your concerns, connect with supportive community members, 
          and find peace of mind through shared understanding.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link to="/register" className="btn-primary text-lg px-8 py-3">
            Get Started Free
          </Link>
          <Link to="/login" className="btn-outline text-lg px-8 py-3">
            Sign In
          </Link>
        </div>
      </div>

      {/* Features */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
        <div className="text-center">
          <div className="bg-primary-100 rounded-full p-3 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
            <Heart className="h-8 w-8 text-primary-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Compassionate Community</h3>
          <p className="text-gray-600">
            Connect with others who understand. Share support, not judgment.
          </p>
        </div>

        <div className="text-center">
          <div className="bg-primary-100 rounded-full p-3 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
            <Shield className="h-8 w-8 text-primary-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">AI-Protected Space</h3>
          <p className="text-gray-600">
            Advanced AI moderation keeps conversations supportive and safe.
          </p>
        </div>

        <div className="text-center">
          <div className="bg-primary-100 rounded-full p-3 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
            <Users className="h-8 w-8 text-primary-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">You're Not Alone</h3>
          <p className="text-gray-600">
            See how many others share similar concerns. Find comfort in community.
          </p>
        </div>

        <div className="text-center">
          <div className="bg-primary-100 rounded-full p-3 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
            <Zap className="h-8 w-8 text-primary-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Guided Support</h3>
          <p className="text-gray-600">
            Access coping exercises and professional resources when you need them.
          </p>
        </div>
      </div>

      {/* How It Works */}
      <div className="bg-white rounded-2xl p-8 shadow-sm">
        <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
          How Worrybox Works
        </h2>
        <div className="grid md:grid-cols-3 gap-8">
          <div className="text-center">
            <div className="bg-primary-600 text-white rounded-full w-12 h-12 flex items-center justify-center text-xl font-bold mx-auto mb-4">
              1
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Share Your Worry</h3>
            <p className="text-gray-600">
              Write down what's bothering you. Choose from prompts like "I am worried about..." 
              or "I worry that..." to get started.
            </p>
          </div>
          
          <div className="text-center">
            <div className="bg-primary-600 text-white rounded-full w-12 h-12 flex items-center justify-center text-xl font-bold mx-auto mb-4">
              2
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Find Your Community</h3>
            <p className="text-gray-600">
              Discover others with similar concerns. See that you're not alone in your worries 
              and connect with supportive community members.
            </p>
          </div>
          
          <div className="text-center">
            <div className="bg-primary-600 text-white rounded-full w-12 h-12 flex items-center justify-center text-xl font-bold mx-auto mb-4">
              3
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Get Support</h3>
            <p className="text-gray-600">
              Receive encouragement from others, access guided coping exercises, 
              and track your progress as you work through your concerns.
            </p>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="text-center bg-primary-50 rounded-2xl p-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">
          Ready to lighten your mental load?
        </h2>
        <p className="text-lg text-gray-600 mb-6">
          Join thousands of people who have found peace of mind through Worrybox.
        </p>
        <Link to="/register" className="btn-primary text-lg px-8 py-3">
          Start Your Journey
        </Link>
      </div>
    </div>
  )
}

export default HomePage