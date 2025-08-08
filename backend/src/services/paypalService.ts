import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

export interface PayPalWebhookEvent {
  id: string;
  event_type: string;
  resource_type: string;
  summary: string;
  resource: {
    id: string;
    status: string;
    status_update_time: string;
    plan_id: string;
    start_time: string;
    quantity: string;
    shipping_amount: {
      currency_code: string;
      value: string;
    };
    subscriber: {
      email_address: string;
      payer_id: string;
      name: {
        given_name: string;
        surname: string;
      };
    };
    billing_info: {
      outstanding_balance: {
        currency_code: string;
        value: string;
      };
      cycle_executions: Array<{
        tenure_type: string;
        sequence: number;
        cycles_completed: number;
        cycles_remaining: number;
        current_pricing_scheme_version: number;
      }>;
      last_payment: {
        amount: {
          currency_code: string;
          value: string;
        };
        time: string;
      };
      next_billing_time: string;
      failed_payments_count: number;
    };
    create_time: string;
    update_time: string;
    custom_id?: string; // This will contain our user ID
  };
  links: Array<{
    href: string;
    rel: string;
    method: string;
  }>;
  event_version: string;
  create_time: string;
  resource_version: string;
}

export interface SubscriptionTier {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  interval: 'month' | 'year';
  features: string[];
  paypalPlanId: string;
  isPopular?: boolean;
}

export class PayPalService {
  private static instance: PayPalService;
  private clientId: string;
  private clientSecret: string;
  private webhookId: string;
  private baseUrl: string;
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;

  private constructor() {
    this.clientId = process.env.PAYPAL_CLIENT_ID || '';
    this.clientSecret = process.env.PAYPAL_CLIENT_SECRET || '';
    this.webhookId = process.env.PAYPAL_WEBHOOK_ID || '';
    this.baseUrl = process.env.NODE_ENV === 'production' 
      ? 'https://api-m.paypal.com' 
      : 'https://api-m.sandbox.paypal.com';

    if (!this.clientId || !this.clientSecret) {
      console.warn('⚠️ PayPal Client ID or Secret not configured');
    }
  }

  public static getInstance(): PayPalService {
    if (!PayPalService.instance) {
      PayPalService.instance = new PayPalService();
    }
    return PayPalService.instance;
  }

  /**
   * Get PayPal access token
   */
  private async getAccessToken(): Promise<string> {
    // Return cached token if still valid
    if (this.accessToken && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    try {
      const auth = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');
      
      const response = await fetch(`${this.baseUrl}/v1/oauth2/token`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: 'grant_type=client_credentials',
      });

      if (!response.ok) {
        throw new Error(`PayPal auth failed: ${response.statusText}`);
      }

      const data = await response.json() as any;
      this.accessToken = data.access_token;
      this.tokenExpiry = Date.now() + (data.expires_in * 1000) - 60000; // Refresh 1 minute early

      return this.accessToken!;
    } catch (error) {
      console.error('Failed to get PayPal access token:', error);
      throw error;
    }
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
        paypalPlanId: '', // No plan for free tier
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
        paypalPlanId: process.env.PAYPAL_SUPPORTER_PLAN_ID || '',
        isPopular: false,
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
        paypalPlanId: process.env.PAYPAL_PREMIUM_PLAN_ID || '',
        isPopular: true,
      }
    ];
  }

  /**
   * Create a subscription
   */
  async createSubscription(userId: string, planId: string): Promise<{ subscriptionId: string; approvalUrl: string }> {
    try {
      const accessToken = await this.getAccessToken();
      
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { email: true, displayName: true, username: true }
      });

      if (!user) {
        throw new Error('User not found');
      }

      const subscriptionData = {
        plan_id: planId,
        custom_id: userId, // Store user ID for webhook processing
        subscriber: {
          name: {
            given_name: user.displayName?.split(' ')[0] || user.username,
            surname: user.displayName?.split(' ').slice(1).join(' ') || '',
          },
          email_address: user.email,
        },
        application_context: {
          brand_name: 'Worrybox',
          locale: 'en-US',
          shipping_preference: 'NO_SHIPPING',
          user_action: 'SUBSCRIBE_NOW',
          payment_method: {
            payer_selected: 'PAYPAL',
            payee_preferred: 'IMMEDIATE_PAYMENT_REQUIRED',
          },
          return_url: `${process.env.FRONTEND_URL}/subscription/success`,
          cancel_url: `${process.env.FRONTEND_URL}/subscription/cancel`,
        },
      };

      const response = await fetch(`${this.baseUrl}/v1/billing/subscriptions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'PayPal-Request-Id': crypto.randomUUID(), // Idempotency key
        },
        body: JSON.stringify(subscriptionData),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`PayPal subscription creation failed: ${error}`);
      }

      const result = await response.json() as any;
      const approvalUrl = result.links.find((link: any) => link.rel === 'approve')?.href;

      if (!approvalUrl) {
        throw new Error('No approval URL returned from PayPal');
      }

      return {
        subscriptionId: result.id,
        approvalUrl,
      };
    } catch (error) {
      console.error('Failed to create PayPal subscription:', error);
      throw error;
    }
  }

  /**
   * Get subscription details
   */
  async getSubscription(subscriptionId: string): Promise<any> {
    try {
      const accessToken = await this.getAccessToken();

      const response = await fetch(`${this.baseUrl}/v1/billing/subscriptions/${subscriptionId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to get subscription: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to get PayPal subscription:', error);
      throw error;
    }
  }

  /**
   * Cancel a subscription
   */
  async cancelSubscription(subscriptionId: string, reason: string = 'User requested cancellation'): Promise<void> {
    try {
      const accessToken = await this.getAccessToken();

      const response = await fetch(`${this.baseUrl}/v1/billing/subscriptions/${subscriptionId}/cancel`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          reason,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to cancel subscription: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Failed to cancel PayPal subscription:', error);
      throw error;
    }
  }

  /**
   * Verify webhook signature
   */
  async verifyWebhookSignature(
    headers: Record<string, string>,
    body: string
  ): Promise<boolean> {
    try {
      const accessToken = await this.getAccessToken();

      const verificationData = {
        auth_algo: headers['paypal-auth-algo'],
        cert_id: headers['paypal-cert-id'],
        transmission_id: headers['paypal-transmission-id'],
        transmission_sig: headers['paypal-transmission-sig'],
        transmission_time: headers['paypal-transmission-time'],
        webhook_id: this.webhookId,
        webhook_event: JSON.parse(body),
      };

      const response = await fetch(`${this.baseUrl}/v1/notifications/verify-webhook-signature`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(verificationData),
      });

      if (!response.ok) {
        console.error('Webhook verification failed:', response.statusText);
        return false;
      }

      const result = await response.json() as any;
      return result.verification_status === 'SUCCESS';
    } catch (error) {
      console.error('Failed to verify webhook signature:', error);
      return false;
    }
  }

  /**
   * Handle webhook events
   */
  async handleWebhook(event: PayPalWebhookEvent): Promise<void> {
    console.log(`💰 Processing PayPal webhook: ${event.event_type}`);

    try {
      switch (event.event_type) {
        case 'BILLING.SUBSCRIPTION.CREATED':
          await this.handleSubscriptionCreated(event);
          break;
        case 'BILLING.SUBSCRIPTION.ACTIVATED':
          await this.handleSubscriptionActivated(event);
          break;
        case 'BILLING.SUBSCRIPTION.UPDATED':
          await this.handleSubscriptionUpdated(event);
          break;
        case 'BILLING.SUBSCRIPTION.CANCELLED':
          await this.handleSubscriptionCancelled(event);
          break;
        case 'BILLING.SUBSCRIPTION.SUSPENDED':
          await this.handleSubscriptionSuspended(event);
          break;
        case 'BILLING.SUBSCRIPTION.PAYMENT.FAILED':
          await this.handlePaymentFailed(event);
          break;
        case 'BILLING.SUBSCRIPTION.EXPIRED':
          await this.handleSubscriptionExpired(event);
          break;
        default:
          console.log(`Unhandled webhook event: ${event.event_type}`);
      }
    } catch (error) {
      console.error('Failed to handle webhook:', error);
      throw error;
    }
  }

  private async handleSubscriptionCreated(event: PayPalWebhookEvent): Promise<void> {
    const { resource } = event;
    const userId = resource.custom_id;

    if (!userId) {
      console.error('No user ID in webhook custom_id');
      return;
    }

    const tier = this.getTierFromPlanId(resource.plan_id);

    // Find existing subscription for this user
    const existingSubscription = await prisma.subscription.findFirst({
      where: { userId }
    });

    if (existingSubscription) {
      // Update existing subscription
      await prisma.subscription.update({
        where: { id: existingSubscription.id },
        data: {
          tier,
          status: 'active',
          paypalSubscriptionId: resource.id,
          paypalPlanId: resource.plan_id,
          currentPeriodStart: new Date(resource.start_time),
          currentPeriodEnd: new Date(resource.billing_info.next_billing_time),
          renewsAt: new Date(resource.billing_info.next_billing_time),
          updatedAt: new Date(),
        }
      });
    } else {
      // Create new subscription
      await prisma.subscription.create({
        data: {
          userId,
          tier,
          status: 'active',
          paypalSubscriptionId: resource.id,
          paypalPlanId: resource.plan_id,
          currentPeriodStart: new Date(resource.start_time),
          currentPeriodEnd: new Date(resource.billing_info.next_billing_time),
          renewsAt: new Date(resource.billing_info.next_billing_time),
        }
      });
    }

    console.log(`✅ Created/updated subscription for user ${userId} with tier ${tier}`);
  }

  private async handleSubscriptionActivated(event: PayPalWebhookEvent): Promise<void> {
    const { resource } = event;

    await prisma.subscription.update({
      where: { paypalSubscriptionId: resource.id },
      data: {
        status: 'active',
        currentPeriodStart: new Date(resource.start_time),
        currentPeriodEnd: new Date(resource.billing_info.next_billing_time),
        renewsAt: new Date(resource.billing_info.next_billing_time),
        updatedAt: new Date(),
      },
    });

    console.log(`✅ Activated subscription ${resource.id}`);
  }

  private async handleSubscriptionUpdated(event: PayPalWebhookEvent): Promise<void> {
    const { resource } = event;

    await prisma.subscription.update({
      where: { paypalSubscriptionId: resource.id },
      data: {
        status: this.mapPayPalStatus(resource.status),
        currentPeriodEnd: new Date(resource.billing_info.next_billing_time),
        renewsAt: new Date(resource.billing_info.next_billing_time),
        updatedAt: new Date(),
      },
    });

    console.log(`✅ Updated subscription ${resource.id}`);
  }

  private async handleSubscriptionCancelled(event: PayPalWebhookEvent): Promise<void> {
    const { resource } = event;

    await prisma.subscription.update({
      where: { paypalSubscriptionId: resource.id },
      data: {
        status: 'cancelled',
        endsAt: new Date(resource.billing_info.next_billing_time),
        updatedAt: new Date(),
      },
    });

    console.log(`✅ Cancelled subscription ${resource.id}`);
  }

  private async handleSubscriptionSuspended(event: PayPalWebhookEvent): Promise<void> {
    const { resource } = event;

    await prisma.subscription.update({
      where: { paypalSubscriptionId: resource.id },
      data: {
        status: 'past_due',
        updatedAt: new Date(),
      },
    });

    console.log(`✅ Suspended subscription ${resource.id}`);
  }

  private async handlePaymentFailed(event: PayPalWebhookEvent): Promise<void> {
    const { resource } = event;

    await prisma.subscription.update({
      where: { paypalSubscriptionId: resource.id },
      data: {
        status: 'past_due',
        updatedAt: new Date(),
      },
    });

    console.log(`✅ Payment failed for subscription ${resource.id}`);
  }

  private async handleSubscriptionExpired(event: PayPalWebhookEvent): Promise<void> {
    const { resource } = event;

    await prisma.subscription.update({
      where: { paypalSubscriptionId: resource.id },
      data: {
        status: 'expired',
        tier: 'free', // Downgrade to free tier
        endsAt: new Date(),
        updatedAt: new Date(),
      },
    });

    console.log(`✅ Expired subscription ${resource.id}, downgraded to free`);
  }

  private mapPayPalStatus(paypalStatus: string): string {
    const statusMap: Record<string, string> = {
      'APPROVAL_PENDING': 'active',
      'APPROVED': 'active',
      'ACTIVE': 'active',
      'SUSPENDED': 'past_due',
      'CANCELLED': 'cancelled',
      'EXPIRED': 'expired',
    };

    return statusMap[paypalStatus] || 'active';
  }

  private getTierFromPlanId(planId: string): string {
    const tiers = this.getSubscriptionTiers();
    const tier = tiers.find(t => t.paypalPlanId === planId);
    return tier?.id || 'free';
  }

  /**
   * Get user's current subscription
   */
  async getUserSubscription(userId: string) {
    return await prisma.subscription.findFirst({
      where: { 
        userId,
        status: { in: ['active', 'past_due'] }
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
}