import React, { useState } from 'react'
import { useSubscription } from '../contexts/SubscriptionContext'
import { useAuth } from '../contexts/AuthContext'
import { CreditCard, Calendar, AlertCircle, ExternalLink, RefreshCw, Crown } from 'lucide-react'

interface SubscriptionManagementProps {
  className?: string
}

const SubscriptionManagement: React.FC<SubscriptionManagementProps> = ({ className = '' }) => {
  const { user } = useAuth()
  const { subscription, tiers, refreshSubscription, openCustomerPortal } = useSubscription()
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isOpeningPortal, setIsOpeningPortal] = useState(false)

  const handleRefresh = async () => {
    try {
      setIsRefreshing(true)
      await refreshSubscription()
    } catch (error) {
      console.error('Failed to refresh subscription:', error)
    } finally {
      setIsRefreshing(false)
    }
  }

  const handleOpenPortal = async () => {
    try {
      setIsOpeningPortal(true)
      await openCustomerPortal()
    } catch (error: any) {
      console.error('Failed to open customer portal:', error)
      alert('Failed to open customer portal. Please try again.')
    } finally {
      setIsOpeningPortal(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'text-green-600 bg-green-100'
      case 'cancelled':
        return 'text-yellow-600 bg-yellow-100'
      case 'expired':
        return 'text-red-600 bg-red-100'
      case 'past_due':
        return 'text-orange-600 bg-orange-100'
      case 'paused':
        return 'text-blue-600 bg-blue-100'
      default:
        return 'text-gray-600 bg-gray-100'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active':
        return 'Active'
      case 'cancelled':
        return 'Cancelled'
      case 'expired':
        return 'Expired'
      case 'past_due':
        return 'Past Due'
      case 'paused':
        return 'Paused'
      default:
        return status
    }
  }

  const getCurrentTierInfo = () => {
    const tierName = subscription?.tier || 'free'
    return tiers.find(t => t.id === tierName) || tiers.find(t => t.id === 'free')
  }

  if (!user) {
    return (
      <div className={`bg-white rounded-lg border border-gray-200 p-6 ${className}`}>
        <div className="text-center">
          <CreditCard className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Sign In Required</h3>
          <p className="text-gray-600 mb-4">Please sign in to manage your subscription.</p>
          <a
            href="/login"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Sign In
          </a>
        </div>
      </div>
    )
  }

  const currentTier = getCurrentTierInfo()

  return (
    <div className={`bg-white rounded-lg border border-gray-200 p-6 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-medium text-gray-900 flex items-center">
          <Crown className="w-5 h-5 mr-2 text-blue-600" />
          Subscription Management
        </h3>
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="flex items-center space-x-1 text-sm text-gray-500 hover:text-gray-700 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Current Plan */}
      <div className="mb-6">
        <h4 className="text-sm font-medium text-gray-700 mb-3">Current Plan</h4>
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h5 className="font-medium text-gray-900">{currentTier?.name || 'Free'}</h5>
              <p className="text-sm text-gray-600">{currentTier?.description}</p>
            </div>
            {currentTier && currentTier.price > 0 && (
              <div className="text-right">
                <div className="text-lg font-semibold text-gray-900">
                  ${currentTier.price}/{currentTier.interval}
                </div>
              </div>
            )}
          </div>

          {subscription && subscription.tier !== 'free' && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
              <div className="flex items-center space-x-2">
                <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(subscription.status)}`}>
                  {getStatusLabel(subscription.status)}
                </span>
                {subscription.status === 'cancelled' && subscription.endsAt && (
                  <span className="text-sm text-gray-500">
                    Ends {new Date(subscription.endsAt).toLocaleDateString()}
                  </span>
                )}
              </div>
              {subscription.renewsAt && subscription.status === 'active' && (
                <div className="flex items-center text-sm text-gray-500">
                  <Calendar className="w-4 h-4 mr-1" />
                  Renews {new Date(subscription.renewsAt).toLocaleDateString()}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Subscription Actions */}
      {subscription && subscription.tier !== 'free' && (
        <div className="mb-6">
          <h4 className="text-sm font-medium text-gray-700 mb-3">Manage Subscription</h4>
          <div className="space-y-3">
            <button
              onClick={handleOpenPortal}
              disabled={isOpeningPortal}
              className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isOpeningPortal ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Opening...</span>
                </>
              ) : (
                <>
                  <ExternalLink className="w-4 h-4" />
                  <span>Manage Billing & Payment</span>
                </>
              )}
            </button>
            <p className="text-xs text-gray-500 text-center">
              Update payment method, view invoices, and cancel subscription
            </p>
          </div>
        </div>
      )}

      {/* Upgrade Options */}
      {(!subscription || subscription.tier === 'free') && (
        <div className="mb-6">
          <h4 className="text-sm font-medium text-gray-700 mb-3">Upgrade Your Plan</h4>
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
              <div>
                <h5 className="font-medium text-blue-900 mb-1">Unlock Premium Features</h5>
                <p className="text-sm text-blue-700 mb-3">
                  Get personal analytics, advanced privacy controls, and more with a paid plan.
                </p>
                <a
                  href="/pricing"
                  className="inline-flex items-center px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                >
                  View Plans
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Features List */}
      {currentTier && (
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-3">Your Plan Includes</h4>
          <ul className="space-y-2">
            {currentTier.features.map((feature, index) => (
              <li key={index} className="flex items-start text-sm">
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                <span className="text-gray-700">{feature}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

export default SubscriptionManagement