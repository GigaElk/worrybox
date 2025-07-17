// Mock the entire Prisma module
const mockPrisma = {
  user: {
    findUnique: jest.fn(),
  },
  subscription: {
    create: jest.fn(),
    update: jest.fn(),
    findFirst: jest.fn(),
    findUnique: jest.fn(),
  },
}

jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => mockPrisma)
}))

// Mock fetch
global.fetch = jest.fn()

import { LemonSqueezyService } from '../services/lemonSqueezyService'

describe('LemonSqueezyService', () => {
  let lemonSqueezyService: LemonSqueezyService

  beforeEach(() => {
    lemonSqueezyService = LemonSqueezyService.getInstance()
    jest.clearAllMocks()
  })

  describe('getSubscriptionTiers', () => {
    it('should return subscription tiers', () => {
      const tiers = lemonSqueezyService.getSubscriptionTiers()
      
      expect(tiers).toHaveLength(3)
      expect(tiers[0].id).toBe('free')
      expect(tiers[1].id).toBe('supporter')
      expect(tiers[2].id).toBe('premium')
      
      expect(tiers[1].isPopular).toBe(true)
    })

    it('should have correct pricing structure', () => {
      const tiers = lemonSqueezyService.getSubscriptionTiers()
      
      expect(tiers[0].price).toBe(0)
      expect(tiers[1].price).toBe(5)
      expect(tiers[2].price).toBe(12)
      
      tiers.forEach(tier => {
        expect(tier.currency).toBe('USD')
        expect(tier.interval).toBe('month')
        expect(tier.features).toBeInstanceOf(Array)
        expect(tier.features.length).toBeGreaterThan(0)
      })
    })
  })

  describe('createCheckoutUrl', () => {
    const mockUser = {
      email: 'test@example.com',
      displayName: 'Test User',
      username: 'testuser'
    }

    const mockCheckoutResponse = {
      data: {
        attributes: {
          url: 'https://checkout.lemonsqueezy.com/test-checkout-url'
        }
      }
    }

    beforeEach(() => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser)
      ;(fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockCheckoutResponse)
      })
    })

    it('should create checkout URL successfully', async () => {
      const checkoutUrl = await lemonSqueezyService.createCheckoutUrl('user1', 'variant123')
      
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user1' },
        select: { email: true, displayName: true, username: true }
      })
      
      expect(fetch).toHaveBeenCalledWith(
        'https://api.lemonsqueezy.com/v1/checkouts',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Accept': 'application/vnd.api+json',
            'Content-Type': 'application/vnd.api+json',
            'Authorization': expect.stringContaining('Bearer')
          })
        })
      )
      
      expect(checkoutUrl).toBe('https://checkout.lemonsqueezy.com/test-checkout-url')
    })

    it('should throw error if user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null)
      
      await expect(
        lemonSqueezyService.createCheckoutUrl('nonexistent', 'variant123')
      ).rejects.toThrow('User not found')
    })

    it('should handle API errors', async () => {
      ;(fetch as jest.Mock).mockResolvedValue({
        ok: false,
        text: jest.fn().mockResolvedValue('API Error')
      })
      
      await expect(
        lemonSqueezyService.createCheckoutUrl('user1', 'variant123')
      ).rejects.toThrow('LemonSqueezy API error: API Error')
    })
  })

  describe('getUserSubscription', () => {
    const mockSubscription = {
      id: 'sub1',
      userId: 'user1',
      tier: 'supporter',
      status: 'active',
      createdAt: new Date()
    }

    it('should get user subscription', async () => {
      mockPrisma.subscription.findFirst.mockResolvedValue(mockSubscription)
      
      const subscription = await lemonSqueezyService.getUserSubscription('user1')
      
      expect(mockPrisma.subscription.findFirst).toHaveBeenCalledWith({
        where: { 
          userId: 'user1',
          status: { in: ['active', 'past_due', 'paused'] }
        },
        orderBy: { createdAt: 'desc' }
      })
      
      expect(subscription).toEqual(mockSubscription)
    })

    it('should return null if no subscription found', async () => {
      mockPrisma.subscription.findFirst.mockResolvedValue(null)
      
      const subscription = await lemonSqueezyService.getUserSubscription('user1')
      
      expect(subscription).toBeNull()
    })
  })

  describe('hasFeatureAccess', () => {
    it('should grant access for supporter features with supporter subscription', async () => {
      mockPrisma.subscription.findFirst.mockResolvedValue({
        tier: 'supporter',
        status: 'active'
      })
      
      const hasAccess = await lemonSqueezyService.hasFeatureAccess('user1', 'personal_analytics')
      
      expect(hasAccess).toBe(true)
    })

    it('should deny access for premium features with supporter subscription', async () => {
      mockPrisma.subscription.findFirst.mockResolvedValue({
        tier: 'supporter',
        status: 'active'
      })
      
      const hasAccess = await lemonSqueezyService.hasFeatureAccess('user1', 'demographic_analytics')
      
      expect(hasAccess).toBe(false)
    })

    it('should deny access for premium features with free subscription', async () => {
      mockPrisma.subscription.findFirst.mockResolvedValue(null)
      
      const hasAccess = await lemonSqueezyService.hasFeatureAccess('user1', 'personal_analytics')
      
      expect(hasAccess).toBe(false)
    })

    it('should grant access for premium features with premium subscription', async () => {
      mockPrisma.subscription.findFirst.mockResolvedValue({
        tier: 'premium',
        status: 'active'
      })
      
      const hasAccess = await lemonSqueezyService.hasFeatureAccess('user1', 'demographic_analytics')
      
      expect(hasAccess).toBe(true)
    })
  })

  describe('webhook handling', () => {
    const mockWebhookEvent = {
      meta: {
        event_name: 'subscription_created',
        custom_data: { user_id: 'user1' }
      },
      data: {
        id: 'sub_123',
        type: 'subscriptions',
        attributes: {
          store_id: 1,
          customer_id: 123,
          order_id: 456,
          order_item_id: 789,
          product_id: 101,
          variant_id: 202,
          product_name: 'Supporter Plan',
          variant_name: 'Monthly',
          user_name: 'Test User',
          user_email: 'test@example.com',
          status: 'active',
          status_formatted: 'Active',
          card_brand: 'visa',
          card_last_four: '4242',
          pause: null,
          cancelled: false,
          trial_ends_at: null,
          billing_anchor: 1,
          urls: {
            update_payment_method: 'https://example.com/update',
            customer_portal: 'https://example.com/portal'
          },
          renews_at: '2024-02-01T00:00:00Z',
          ends_at: null,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
          test_mode: true
        }
      }
    }

    it('should handle subscription_created webhook', async () => {
      mockPrisma.subscription.create.mockResolvedValue({})
      
      await lemonSqueezyService.handleWebhook(mockWebhookEvent)
      
      expect(mockPrisma.subscription.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user1',
          tier: 'free', // Default mapping since variant not in env
          status: 'active',
          lemonSqueezyId: 'sub_123'
        })
      })
    })

    it('should handle subscription_cancelled webhook', async () => {
      const cancelledEvent = {
        ...mockWebhookEvent,
        meta: { ...mockWebhookEvent.meta, event_name: 'subscription_cancelled' }
      }
      
      mockPrisma.subscription.update.mockResolvedValue({})
      
      await lemonSqueezyService.handleWebhook(cancelledEvent)
      
      expect(mockPrisma.subscription.update).toHaveBeenCalledWith({
        where: { lemonSqueezyId: 'sub_123' },
        data: expect.objectContaining({
          status: 'cancelled'
        })
      })
    })
  })
})