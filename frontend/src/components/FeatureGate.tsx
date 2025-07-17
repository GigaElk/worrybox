import React, { useState, useEffect } from 'react'
import { useSubscription } from '../contexts/SubscriptionContext'
import { useAuth } from '../contexts/AuthContext'
import { Lock, Crown, ArrowRight } from 'lucide-react'

interface FeatureGateProps {
  feature: string
  children: React.ReactNode
  fallback?: React.ReactNode
  showUpgradePrompt?: boolean
  className?: string
}

const FeatureGate: React.FC<FeatureGateProps> = ({
  feature,
  children,
  fallback,
  showUpgradePrompt = true,
  className = ''
}) => {
  const { user } = useAuth()
  const { hasFeatureAccess, tiers } = useSubscription()
  const [hasAccess, setHasAccess] = useState<boolean | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    checkAccess()
  }, [user, feature])

  const checkAccess = async () => {
    if (!user) {
      setHasAccess(false)
      setIsLoading(false)
      return
    }

    try {
      const access = await hasFeatureAccess(feature)
      setHasAccess(access)
    } catch (error) {
      console.error(`Failed to check access for feature ${feature}:`, error)
      setHasAccess(false)
    } finally {
      setIsLoading(false)
    }
  }

  const getRequiredTier = () => {
    const featureMap: Record<string, string> = {
      'personal_analytics': 'supporter',
      'advanced_privacy': 'supporter',
      'data_export': 'supporter',
      'demographic_analytics': 'premium',
      'guided_exercises': 'premium',
      'mental_health_resources': 'premium',
      'smart_notifications': 'premium',
      'early_access': 'premium',
    }

    const requiredTierId = featureMap[feature]
    return tiers.find(t => t.id === requiredTierId)
  }

  const getFeatureName = () => {
    const featureNames: Record<string, string> = {
      'personal_analytics': 'Personal Analytics',
      'advanced_privacy': 'Advanced Privacy Controls',
      'data_export': 'Data Export',
      'demographic_analytics': 'Demographic Analytics',
      'guided_exercises': 'Guided Exercises',
      'mental_health_resources': 'Mental Health Resources',
      'smart_notifications': 'Smart Notifications',
      'early_access': 'Early Access Features',
    }

    return featureNames[feature] || feature
  }

  if (isLoading) {
    return (
      <div className={`animate-pulse bg-gray-100 rounded-lg p-4 ${className}`}>
        <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
      </div>
    )
  }

  if (hasAccess) {
    return <>{children}</>
  }

  // If custom fallback is provided, use it
  if (fallback) {
    return <>{fallback}</>
  }

  // Default upgrade prompt
  if (!showUpgradePrompt) {
    return null
  }

  const requiredTier = getRequiredTier()

  return (
    <div className={`bg-gradient-to-br from-blue-50 to-purple-50 border-2 border-dashed border-blue-200 rounded-lg p-6 text-center ${className}`}>
      <div className="flex justify-center mb-4">
        <div className="relative">
          <Lock className="w-8 h-8 text-blue-600" />
          <Crown className="w-4 h-4 text-yellow-500 absolute -top-1 -right-1" />
        </div>
      </div>
      
      <h3 className="text-lg font-semibold text-gray-900 mb-2">
        {getFeatureName()} - Premium Feature
      </h3>
      
      <p className="text-gray-600 mb-4">
        {!user 
          ? 'Sign in and upgrade to access this feature'
          : `Upgrade to ${requiredTier?.name || 'Premium'} to unlock this feature`
        }
      </p>

      {requiredTier && (
        <div className="bg-white rounded-lg p-4 mb-4 border border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-gray-900">{requiredTier.name}</h4>
              <p className="text-sm text-gray-600">{requiredTier.description}</p>
            </div>
            <div className="text-right">
              <div className="text-lg font-semibold text-blue-600">
                ${requiredTier.price}/{requiredTier.interval}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        {!user ? (
          <>
            <a
              href="/login"
              className="inline-flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Sign In
            </a>
            <a
              href="/pricing"
              className="inline-flex items-center justify-center px-4 py-2 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
            >
              View Plans
              <ArrowRight className="w-4 h-4 ml-1" />
            </a>
          </>
        ) : (
          <a
            href="/pricing"
            className="inline-flex items-center justify-center px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Upgrade Now
            <ArrowRight className="w-4 h-4 ml-1" />
          </a>
        )}
      </div>
    </div>
  )
}

export default FeatureGate