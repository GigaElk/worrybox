import api from './api'

export interface SubscriptionTier {
  id: string
  name: string
  description: string
  price: number
  currency: string
  interval: 'month' | 'year'
  features: string[]
  lemonSqueezyVariantId: string
  isPopular?: boolean
}

export interface UserSubscription {
  id: string
  userId: string
  tier: string
  status: string
  lemonSqueezyId?: string
  currentPeriodStart?: string
  currentPeriodEnd?: string
  trialEndsAt?: string
  renewsAt?: string
  endsAt?: string
  createdAt: string
  updatedAt: string
}

export interface FeatureAccess {
  feature: string
  hasAccess: boolean
}

export const subscriptionService = {
  // Get available subscription tiers
  async getSubscriptionTiers(): Promise<SubscriptionTier[]> {
    const response = await api.get('/subscriptions/tiers')
    return response.data.data
  },

  // Get current user's subscription
  async getCurrentSubscription(): Promise<UserSubscription | null> {
    try {
      const response = await api.get('/subscriptions/current')
      return response.data.data
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null
      }
      throw error
    }
  },

  // Create checkout URL for subscription upgrade
  async createCheckout(variantId: string, customData?: Record<string, any>): Promise<string> {
    const response = await api.post('/subscriptions/checkout', {
      variantId,
      customData
    })
    return response.data.data.checkoutUrl
  },

  // Get customer portal URL for subscription management
  async getCustomerPortal(): Promise<string> {
    const response = await api.get('/subscriptions/portal')
    return response.data.data.portalUrl
  },

  // Check if user has access to a specific feature
  async checkFeatureAccess(feature: string): Promise<boolean> {
    try {
      const response = await api.get(`/subscriptions/features/${feature}/access`)
      return response.data.data.hasAccess
    } catch (error) {
      console.error(`Failed to check access for feature ${feature}:`, error)
      return false
    }
  },

  // Helper function to check multiple features at once
  async checkMultipleFeatures(features: string[]): Promise<Record<string, boolean>> {
    const results: Record<string, boolean> = {}
    
    await Promise.all(
      features.map(async (feature) => {
        results[feature] = await this.checkFeatureAccess(feature)
      })
    )
    
    return results
  }
}