import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

export interface LemonSqueezyWebhookEvent {
  meta: {
    event_name: string;
    custom_data?: Record<string, any>;
  };
  data: {
    id: string;
    type: string;
    attributes: {
      store_id: number;
      customer_id: number;
      order_id: number;
      order_item_id: number;
      product_id: number;
      variant_id: number;
      product_name: string;
      variant_name: string;
      user_name: string;
      user_email: string;
      status: string;
      status_formatted: string;
      card_brand: string;
      card_last_four: string;
      pause: any;
      cancelled: boolean;
      trial_ends_at: string | null;
      billing_anchor: number;
      urls: {
        update_payment_method: string;
        customer_portal: string;
      };
      renews_at: string;
      ends_at: string | null;
      created_at: string;
      updated_at: string;
      test_mode: boolean;
    };
  };
}

export interface SubscriptionTier {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  interval: 'month' | 'year';
  features: string[];
  lemonSqueezyVariantId: string;
  isPopular?: boolean;
}

export class LemonSqueezyService {
  private static instance: LemonSqueezyService;
  private apiKey: string;
  private storeId: string;
  private webhookSecret: string;

  private constructor() {
    this.apiKey = process.env.LEMONSQUEEZY_API_KEY || '';
    this.storeId = process.env.LEMONSQUEEZY_STORE_ID || '';
    this.webhookSecret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET || '';

    if (!this.apiKey || !this.storeId) {
      console.warn('⚠️ LemonSqueezy API key or Store ID not configured');
    }
  }

  public static getInstance(): LemonSqueezyService {
    if (!LemonSqueezyService.instance) {
      LemonSqueezyService.instance = new LemonSqueezyService();
    }
    return LemonSqueezyService.instance;
  }

  /**
   * Get available subscription tiers
   */
  getSubscriptionTiers(): SubscriptionTier[] {
    return [
      {
        id: 'free',
        name: 'Free',
        description: 'Basic worry sharing and community support (after 30-day trial)',
        price: 0,
        currency: 'USD',
        interval: 'month',
        features: [
          'Share unlimited worries',
          'Basic privacy controls',
          'Community support',
          'Basic worry analysis'
        ],
        lemonSqueezyVariantId: '', // No variant for free tier
      },
      {
        id: 'supporter',
        name: 'Supporter',
        description: 'Enhanced features and personal analytics',
        price: 5,
        currency: 'USD',
        interval: 'month',
        features: [
          'Everything in Free',
          'Personal worry analytics',
          'Advanced privacy controls',
          'Priority support',
          'Export your data'
        ],
        lemonSqueezyVariantId: process.env.LEMONSQUEEZY_SUPPORTER_VARIANT_ID || '',
        isPopular: false, // Premium is now more popular due to trial
      },
      {
        id: 'premium',
        name: 'Premium',
        description: 'Full access to all features and insights (30-day free trial for new users!)',
        price: 12,
        currency: 'USD',
        interval: 'month',
        features: [
          'Everything in Supporter',
          'Advanced demographic analytics',
          'Guided exercises and coping techniques',
          'Mental health resource integration',
          'Smart notifications',
          'Early access to new features',
          '🎉 30-day free trial for new users'
        ],
        lemonSqueezyVariantId: process.env.LEMONSQUEEZY_PREMIUM_VARIANT_ID || '',
        isPopular: true, // Now most popular due to free trial
      }
    ];
  }

  /**
   * Create a checkout URL for a subscription
   */
  async createCheckoutUrl(userId: string, variantId: string, customData?: Record<string, any>): Promise<string> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { email: true, displayName: true, username: true }
      });

      if (!user) {
        throw new Error('User not found');
      }

      const checkoutData = {
        data: {
          type: 'checkouts',
          attributes: {
            product_options: {
              enabled_variants: [variantId]
            },
            checkout_options: {
              embed: false,
              media: false,
              logo: true
            },
            checkout_data: {
              email: user.email,
              name: user.displayName || user.username,
              custom: {
                user_id: userId,
                ...customData
              }
            },
            expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
          },
          relationships: {
            store: {
              data: {
                type: 'stores',
                id: this.storeId
              }
            },
            variant: {
              data: {
                type: 'variants',
                id: variantId
              }
            }
          }
        }
      };

      const response = await fetch('https://api.lemonsqueezy.com/v1/checkouts', {
        method: 'POST',
        headers: {
          'Accept': 'application/vnd.api+json',
          'Content-Type': 'application/vnd.api+json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify(checkoutData)
      });

      if (!(response as any).ok) {
        const error = await (response as any).text();
        throw new Error(`LemonSqueezy API error: ${error}`);
      }

      const result = await (response as any).json() as any;
      return result.data.attributes.url;
    } catch (error) {
      console.error('Failed to create checkout URL:', error);
      throw error;
    }
  }

  /**
   * Get customer portal URL for subscription management
   */
  async getCustomerPortalUrl(subscriptionId: string): Promise<string> {
    try {
      const subscription = await prisma.subscription.findUnique({
        where: { lemonSqueezyId: subscriptionId }
      });

      if (!subscription) {
        throw new Error('Subscription not found');
      }

      // LemonSqueezy provides customer portal URLs in webhook data
      // For now, we'll construct it based on their pattern
      return `https://app.lemonsqueezy.com/my-orders/${subscriptionId}`;
    } catch (error) {
      console.error('Failed to get customer portal URL:', error);
      throw error;
    }
  }

  /**
   * Verify webhook signature
   */
  verifyWebhookSignature(payload: string, signature: string): boolean {
    if (!this.webhookSecret) {
      console.warn('⚠️ LemonSqueezy webhook secret not configured');
      return false;
    }

    const hmac = crypto.createHmac('sha256', this.webhookSecret);
    hmac.update(payload, 'utf8');
    const digest = hmac.digest('hex');

    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(digest, 'hex')
    );
  }

  /**
   * Handle webhook events
   */
  async handleWebhook(event: LemonSqueezyWebhookEvent): Promise<void> {
    console.log(`🍋 Processing LemonSqueezy webhook: ${event.meta.event_name}`);

    try {
      switch (event.meta.event_name) {
        case 'subscription_created':
          await this.handleSubscriptionCreated(event);
          break;
        case 'subscription_updated':
          await this.handleSubscriptionUpdated(event);
          break;
        case 'subscription_cancelled':
          await this.handleSubscriptionCancelled(event);
          break;
        case 'subscription_resumed':
          await this.handleSubscriptionResumed(event);
          break;
        case 'subscription_expired':
          await this.handleSubscriptionExpired(event);
          break;
        case 'subscription_paused':
          await this.handleSubscriptionPaused(event);
          break;
        case 'subscription_unpaused':
          await this.handleSubscriptionUnpaused(event);
          break;
        default:
          console.log(`Unhandled webhook event: ${event.meta.event_name}`);
      }
    } catch (error) {
      console.error('Failed to handle webhook:', error);
      throw error;
    }
  }

  private async handleSubscriptionCreated(event: LemonSqueezyWebhookEvent): Promise<void> {
    const { data } = event;
    const userId = event.meta.custom_data?.user_id;

    if (!userId) {
      console.error('No user_id in webhook custom_data');
      return;
    }

    const tier = this.getTierFromVariantId(data.attributes.variant_id.toString());

    await prisma.subscription.create({
      data: {
        userId,
        tier,
        status: this.mapLemonSqueezyStatus(data.attributes.status),
        lemonSqueezyId: data.id,
        lemonSqueezyCustomerId: data.attributes.customer_id.toString(),
        lemonSqueezyProductId: data.attributes.product_id.toString(),
        lemonSqueezyVariantId: data.attributes.variant_id.toString(),
        currentPeriodStart: new Date(data.attributes.created_at),
        currentPeriodEnd: new Date(data.attributes.renews_at),
        trialEndsAt: data.attributes.trial_ends_at ? new Date(data.attributes.trial_ends_at) : null,
        renewsAt: new Date(data.attributes.renews_at),
        endsAt: data.attributes.ends_at ? new Date(data.attributes.ends_at) : null,
      }
    });

    console.log(`✅ Created subscription for user ${userId} with tier ${tier}`);
  }

  private async handleSubscriptionUpdated(event: LemonSqueezyWebhookEvent): Promise<void> {
    const { data } = event;

    await prisma.subscription.update({
      where: { lemonSqueezyId: data.id },
      data: {
        status: this.mapLemonSqueezyStatus(data.attributes.status),
        currentPeriodStart: new Date(data.attributes.created_at),
        currentPeriodEnd: new Date(data.attributes.renews_at),
        renewsAt: new Date(data.attributes.renews_at),
        endsAt: data.attributes.ends_at ? new Date(data.attributes.ends_at) : null,
        updatedAt: new Date(),
      }
    });

    console.log(`✅ Updated subscription ${data.id}`);
  }

  private async handleSubscriptionCancelled(event: LemonSqueezyWebhookEvent): Promise<void> {
    const { data } = event;

    await prisma.subscription.update({
      where: { lemonSqueezyId: data.id },
      data: {
        status: 'cancelled',
        endsAt: data.attributes.ends_at ? new Date(data.attributes.ends_at) : new Date(),
        updatedAt: new Date(),
      }
    });

    console.log(`✅ Cancelled subscription ${data.id}`);
  }

  private async handleSubscriptionResumed(event: LemonSqueezyWebhookEvent): Promise<void> {
    const { data } = event;

    await prisma.subscription.update({
      where: { lemonSqueezyId: data.id },
      data: {
        status: 'active',
        endsAt: null,
        renewsAt: new Date(data.attributes.renews_at),
        updatedAt: new Date(),
      }
    });

    console.log(`✅ Resumed subscription ${data.id}`);
  }

  private async handleSubscriptionExpired(event: LemonSqueezyWebhookEvent): Promise<void> {
    const { data } = event;

    await prisma.subscription.update({
      where: { lemonSqueezyId: data.id },
      data: {
        status: 'expired',
        tier: 'free', // Downgrade to free tier
        updatedAt: new Date(),
      }
    });

    console.log(`✅ Expired subscription ${data.id}, downgraded to free`);
  }

  private async handleSubscriptionPaused(event: LemonSqueezyWebhookEvent): Promise<void> {
    const { data } = event;

    await prisma.subscription.update({
      where: { lemonSqueezyId: data.id },
      data: {
        status: 'paused',
        updatedAt: new Date(),
      }
    });

    console.log(`✅ Paused subscription ${data.id}`);
  }

  private async handleSubscriptionUnpaused(event: LemonSqueezyWebhookEvent): Promise<void> {
    const { data } = event;

    await prisma.subscription.update({
      where: { lemonSqueezyId: data.id },
      data: {
        status: 'active',
        renewsAt: new Date(data.attributes.renews_at),
        updatedAt: new Date(),
      }
    });

    console.log(`✅ Unpaused subscription ${data.id}`);
  }

  private mapLemonSqueezyStatus(lemonSqueezyStatus: string): string {
    const statusMap: Record<string, string> = {
      'active': 'active',
      'cancelled': 'cancelled',
      'expired': 'expired',
      'past_due': 'past_due',
      'unpaid': 'unpaid',
      'paused': 'paused',
      'on_trial': 'active', // Treat trial as active
    };

    return statusMap[lemonSqueezyStatus] || 'active';
  }

  private getTierFromVariantId(variantId: string): string {
    const tiers = this.getSubscriptionTiers();
    const tier = tiers.find(t => t.lemonSqueezyVariantId === variantId);
    return tier?.id || 'free';
  }

  /**
   * Get user's current subscription
   */
  async getUserSubscription(userId: string) {
    return await prisma.subscription.findFirst({
      where: { 
        userId,
        status: { in: ['active', 'past_due', 'paused'] }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  /**
   * Check if user has access to a feature based on their subscription
   */
  async hasFeatureAccess(userId: string, feature: string): Promise<boolean> {
    // MVP: Temporarily give everyone premium access while payment processing is disabled
    if (process.env.DISABLE_PAYMENTS === 'true') {
      return true;
    }

    const subscription = await this.getUserSubscription(userId);
    let tier = subscription?.tier || 'free';

    // Check if user is in trial period
    if (subscription?.trialEndsAt && new Date() < subscription.trialEndsAt) {
      // During trial, user has premium access regardless of their tier
      tier = 'premium';
    }

    const featureAccess: Record<string, string[]> = {
      'personal_analytics': ['supporter', 'premium'],
      'advanced_privacy': ['supporter', 'premium'],
      'data_export': ['supporter', 'premium'],
      'demographic_analytics': ['premium'],
      'guided_exercises': ['premium'],
      'mental_health_resources': ['premium'],
      'smart_notifications': ['premium'],
      'early_access': ['premium'],
    };

    return featureAccess[feature]?.includes(tier) || false;
  }

  /**
   * Get user's trial status
   */
  async getTrialStatus(userId: string): Promise<{
    isInTrial: boolean;
    trialEndsAt: Date | null;
    daysRemaining: number;
  }> {
    const subscription = await this.getUserSubscription(userId);
    
    if (!subscription?.trialEndsAt) {
      return {
        isInTrial: false,
        trialEndsAt: null,
        daysRemaining: 0,
      };
    }

    const now = new Date();
    const trialEnd = subscription.trialEndsAt;
    const isInTrial = now < trialEnd;
    const daysRemaining = isInTrial 
      ? Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      : 0;

    return {
      isInTrial,
      trialEndsAt: trialEnd,
      daysRemaining,
    };
  }

  /**
   * Handle trial expiration - downgrade user to free tier
   */
  async handleTrialExpiration(userId: string): Promise<void> {
    const subscription = await this.getUserSubscription(userId);
    
    if (!subscription) return;

    // Check if trial has expired and user doesn't have a paid subscription
    if (subscription.trialEndsAt && 
        new Date() >= subscription.trialEndsAt && 
        !subscription.lemonSqueezyId) {
      
      await prisma.subscription.update({
        where: { id: subscription.id },
        data: {
          tier: 'free',
          trialEndsAt: null, // Clear trial end date
        },
      });

      console.log(`✅ Trial expired for user ${userId}, downgraded to free tier`);
    }
  }
}