import React, { useState } from 'react'
import { useSubscription } from '../contexts/SubscriptionContext'
import { useAuth } from '../contexts/AuthContext'
import { Check, Star, Loader2, CreditCard } from 'lucide-react'

interface SubscriptionPricingProps {
  className?: string
  showCurrentPlan?: boolean
}

const SubscriptionPricing: React.FC<SubscriptionPricingProps> = ({ 
  className = '', 
  showCurrentPlan = true 
}) => {
  const { user } = useAuth()
  const { subscription, tiers, createCheckout } = useSubscription()
  const [loadingTier, setLoadingTier] = useState<string | null>(null)

  const handleUpgrade = async (variantId: string, tierId: string) => {
    if (!user) {
      // Redirect to login
      window.location.href = '/login'
      return
    }

    try {
      setLoadingTier(tierId)
      const checkoutUrl = await createCheckout(variantId)
      window.location.href = checkoutUrl
    } catch (error: any) {
      console.error('Failed to create checkout:', error)
      alert('Failed to start checkout process. Please try again.')
    } finally {
      setLoadingTier(null)
    }
  }

  const getCurrentTier = () => {
    return subscription?.tier || 'free'
  }

  const isCurrentTier = (tierId: string) => {
    return getCurrentTier() === tierId
  }

  const canUpgrade = (tierId: string) => {
    const currentTier = getCurrentTier()
    const tierOrder = ['free', 'supporter', 'premium']
    const currentIndex = tierOrder.indexOf(currentTier)
    const targetIndex = tierOrder.indexOf(tierId)
    return targetIndex > currentIndex
  }

  return (
    <div className={`${className}`}>
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">Choose Your Plan</h2>
        <p className="text-lg text-gray-600">
          Get the support and features you need to manage your worries effectively
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
        {tiers.map((tier) => (
          <div
            key={tier.id}
            className={`relative rounded-2xl border-2 p-8 ${
              tier.isPopular
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 bg-white'
            } ${isCurrentTier(tier.id) ? 'ring-2 ring-green-500' : ''}`}
          >
            {tier.isPopular && (
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                <div className="flex items-center space-x-1 bg-blue-500 text-white px-4 py-1 rounded-full text-sm font-medium">
                  <Star className="w-4 h-4" />
                  <span>Most Popular</span>
                </div>
              </div>
            )}

            {isCurrentTier(tier.id) && (
              <div className="absolute -top-4 right-4">
                <div className="bg-green-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                  Current Plan
                </div>
              </div>
            )}

            <div className="text-center mb-6">
              <h3 className="text-2xl font-bold text-gray-900 mb-2">{tier.name}</h3>
              <p className="text-gray-600 mb-4">{tier.description}</p>
              <div className="mb-4">
                {tier.price === 0 ? (
                  <span className="text-4xl font-bold text-gray-900">Free</span>
                ) : (
                  <div>
                    <span className="text-4xl font-bold text-gray-900">${tier.price}</span>
                    <span className="text-gray-600">/{tier.interval}</span>
                  </div>
                )}
              </div>
            </div>

            <ul className="space-y-3 mb-8">
              {tier.features.map((feature, index) => (
                <li key={index} className="flex items-start">
                  <Check className="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700">{feature}</span>
                </li>
              ))}
            </ul>

            <div className="mt-auto">
              {isCurrentTier(tier.id) ? (
                <button
                  disabled
                  className="w-full py-3 px-4 bg-green-100 text-green-800 rounded-lg font-medium cursor-not-allowed"
                >
                  Current Plan
                </button>
              ) : tier.id === 'free' ? (
                <button
                  disabled
                  className="w-full py-3 px-4 bg-gray-100 text-gray-500 rounded-lg font-medium cursor-not-allowed"
                >
                  Always Free
                </button>
              ) : canUpgrade(tier.id) ? (
                <button
                  onClick={() => handleUpgrade(tier.lemonSqueezyVariantId, tier.id)}
                  disabled={loadingTier === tier.id}
                  className={`w-full py-3 px-4 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2 ${
                    tier.isPopular
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'bg-gray-900 text-white hover:bg-gray-800'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {loadingTier === tier.id ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Loading...</span>
                    </>
                  ) : (
                    <>
                      <CreditCard className="w-4 h-4" />
                      <span>Upgrade to {tier.name}</span>
                    </>
                  )}
                </button>
              ) : (
                <button
                  disabled
                  className="w-full py-3 px-4 bg-gray-100 text-gray-500 rounded-lg font-medium cursor-not-allowed"
                >
                  Downgrade Not Available
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {showCurrentPlan && subscription && (
        <div className="mt-8 text-center">
          <p className="text-gray-600">
            Current plan: <span className="font-semibold">{subscription.tier}</span>
            {subscription.status === 'active' && subscription.renewsAt && (
              <span className="text-sm text-gray-500 ml-2">
                (renews {new Date(subscription.renewsAt).toLocaleDateString()})
              </span>
            )}
          </p>
        </div>
      )}
    </div>
  )
}

export default SubscriptionPricing