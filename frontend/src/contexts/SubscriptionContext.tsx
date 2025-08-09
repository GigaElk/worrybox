import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { subscriptionService, UserSubscription, SubscriptionTier } from '../services/subscriptionService'
import { useAuth } from './AuthContext'

interface SubscriptionContextType {
  subscription: UserSubscription | null
  tiers: SubscriptionTier[]
  isLoading: boolean
  error: string | null
  refreshSubscription: () => Promise<void>
  hasFeatureAccess: (feature: string) => Promise<boolean>
  createCheckout: (variantId: string) => Promise<string>
  openCustomerPortal: () => Promise<void>
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined)

interface SubscriptionProviderProps {
  children: ReactNode
}

export const SubscriptionProvider: React.FC<SubscriptionProviderProps> = ({ children }) => {
  const { user } = useAuth()
  const [subscription, setSubscription] = useState<UserSubscription | null>(null)
  const [tiers, setTiers] = useState<SubscriptionTier[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadSubscriptionData()
  }, [user])

  const loadSubscriptionData = async () => {
    try {
      setIsLoading(true)
      setError(null)

      // Load subscription tiers (always available) - with retry logic
      try {
        const tiersData = await subscriptionService.getSubscriptionTiers()
        setTiers(tiersData)
      } catch (tiersError: any) {
        console.warn('Failed to load subscription tiers, using fallback:', tiersError)
        // Fallback tiers if API is unavailable
        setTiers([
          { id: 'free', name: 'Free', price: 0, features: ['Basic features'] },
          { id: 'supporter', name: 'Supporter', price: 4.99, features: ['All Free features', 'Premium support'] },
          { id: 'premium', name: 'Premium', price: 9.99, features: ['All Supporter features', 'Advanced analytics', 'Priority support'] }
        ])
      }

      // Load user subscription if authenticated
      if (user) {
        try {
          const subscriptionData = await subscriptionService.getCurrentSubscription()
          setSubscription(subscriptionData)
        } catch (subError: any) {
          console.warn('Failed to load user subscription:', subError)
          // Don't block login for subscription loading failures
          setSubscription(null)
        }
      } else {
        setSubscription(null)
      }
    } catch (error: any) {
      console.error('Failed to load subscription data:', error)
      setError(error.message || 'Failed to load subscription data')
    } finally {
      setIsLoading(false)
    }
  }

  const refreshSubscription = async () => {
    if (!user) return

    try {
      const subscriptionData = await subscriptionService.getCurrentSubscription()
      setSubscription(subscriptionData)
    } catch (error: any) {
      console.error('Failed to refresh subscription:', error)
      setError(error.message || 'Failed to refresh subscription')
    }
  }

  const hasFeatureAccess = async (feature: string): Promise<boolean> => {
    if (!user) return false
    
    try {
      return await subscriptionService.checkFeatureAccess(feature)
    } catch (error) {
      console.error(`Failed to check feature access for ${feature}:`, error)
      return false
    }
  }

  const createCheckout = async (variantId: string): Promise<string> => {
    if (!user) {
      throw new Error('Authentication required')
    }

    try {
      return await subscriptionService.createCheckout(variantId)
    } catch (error: any) {
      console.error('Failed to create checkout:', error)
      throw error
    }
  }

  const openCustomerPortal = async () => {
    if (!user || !subscription) {
      throw new Error('No active subscription found')
    }

    try {
      const portalUrl = await subscriptionService.getCustomerPortal()
      window.open(portalUrl, '_blank')
    } catch (error: any) {
      console.error('Failed to open customer portal:', error)
      throw error
    }
  }

  const value: SubscriptionContextType = {
    subscription,
    tiers,
    isLoading,
    error,
    refreshSubscription,
    hasFeatureAccess,
    createCheckout,
    openCustomerPortal,
  }

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  )
}

export const useSubscription = (): SubscriptionContextType => {
  const context = useContext(SubscriptionContext)
  if (context === undefined) {
    throw new Error('useSubscription must be used within a SubscriptionProvider')
  }
  return context
}