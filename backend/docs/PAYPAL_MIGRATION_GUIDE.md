# PayPal Migration Guide

## 🎯 Overview

This guide helps you migrate from LemonSqueezy to PayPal for subscription management in your Worrybox platform.

## ✅ What's Been Implemented

### 1. PayPal Service (`paypalService.ts`)

- **Subscription Creation**: Create PayPal subscriptions with approval URLs
- **Webhook Handling**: Process PayPal webhook events for subscription lifecycle
- **Feature Access Control**: Same feature gating as before
- **Trial Management**: 30-day trial support maintained

### 2. Updated Database Schema

- Added `paypalSubscriptionId` and `paypalPlanId` fields
- Kept LemonSqueezy fields for migration compatibility
- Ready for database push when dependencies are fixed

### 3. Updated API Endpoints

- `POST /api/subscriptions/checkout` - Now creates PayPal subscriptions
- `POST /api/subscriptions/cancel` - Cancel PayPal subscriptions
- `POST /api/subscriptions/webhook` - Handle PayPal webhooks
- All other endpoints remain the same

## 🔧 Setup Steps

### Step 1: PayPal Developer Account Setup

1. **Create PayPal Developer Account**:

   - Go to https://developer.paypal.com/
   - Sign in with your verified PayPal account
   - Create a new app in the dashboard

2. **Get API Credentials**:

   - Client ID and Client Secret from your app
   - Note: Use Sandbox for testing, Live for production

3. **Create Subscription Plans**:
   ```bash
   # You'll need to create these via PayPal API or dashboard
   # Supporter Plan: $5/month
   # Premium Plan: $12/month
   ```

### Step 2: Environment Configuration

Update your `.env` file:

```env
# PayPal Configuration
PAYPAL_CLIENT_ID=your-paypal-client-id-here
PAYPAL_CLIENT_SECRET=your-paypal-client-secret-here
PAYPAL_WEBHOOK_ID=your-paypal-webhook-id-here
PAYPAL_SUPPORTER_PLAN_ID=P-supporter-plan-id-from-paypal
PAYPAL_PREMIUM_PLAN_ID=P-premium-plan-id-from-paypal

# Set to production when ready
NODE_ENV=development  # Uses sandbox
# NODE_ENV=production  # Uses live PayPal
```

### Step 3: Database Migration

Once dependencies are fixed, run:

```bash
npx prisma db push
```

This adds the PayPal fields to your subscription table.

### Step 4: Webhook Setup

1. **Create Webhook in PayPal Dashboard**:

   - URL: `https://your-domain.com/api/subscriptions/webhook`
   - Events to subscribe to:
     - `BILLING.SUBSCRIPTION.CREATED`
     - `BILLING.SUBSCRIPTION.ACTIVATED`
     - `BILLING.SUBSCRIPTION.UPDATED`
     - `BILLING.SUBSCRIPTION.CANCELLED`
     - `BILLING.SUBSCRIPTION.SUSPENDED`
     - `BILLING.SUBSCRIPTION.PAYMENT.FAILED`
     - `BILLING.SUBSCRIPTION.EXPIRED`

2. **Get Webhook ID** from PayPal dashboard and add to `.env`

## 🔄 API Changes

### Frontend Integration Changes

#### Old LemonSqueezy Flow:

```javascript
// Create checkout
const response = await fetch("/api/subscriptions/checkout", {
  method: "POST",
  body: JSON.stringify({ variantId: "variant_123" }),
});
const { checkoutUrl } = await response.json();
window.location.href = checkoutUrl;
```

#### New PayPal Flow:

```javascript
// Create subscription
const response = await fetch("/api/subscriptions/checkout", {
  method: "POST",
  body: JSON.stringify({ planId: "P-plan-123" }),
});
const { approvalUrl, subscriptionId } = await response.json();
window.location.href = approvalUrl;
```

### Subscription Cancellation:

```javascript
// Cancel subscription
await fetch("/api/subscriptions/cancel", {
  method: "POST",
  body: JSON.stringify({ reason: "User requested" }),
});
```

## 🧪 Testing

### 1. Test Subscription Creation

```bash
curl -X POST http://localhost:5000/api/subscriptions/checkout \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"planId":"P-your-plan-id"}'
```

### 2. Test Webhook Processing

```bash
# PayPal will send webhooks to your endpoint
# Test with PayPal's webhook simulator in developer dashboard
```

### 3. Test Feature Access

```bash
curl http://localhost:5000/api/subscriptions/features/premium_analytics/access \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## 📊 Migration Strategy

### Phase 1: Parallel Operation (Recommended)

1. Keep both PayPal and LemonSqueezy services
2. New users use PayPal
3. Existing LemonSqueezy users continue until they cancel/renew

### Phase 2: Full Migration

1. Migrate existing subscribers (manual process)
2. Remove LemonSqueezy code
3. Update frontend to only use PayPal

## 🔍 Key Differences from LemonSqueezy

| Feature             | LemonSqueezy                  | PayPal                         |
| ------------------- | ----------------------------- | ------------------------------ |
| **Checkout**        | Hosted checkout page          | Approval URL redirect          |
| **Webhooks**        | Simple signature verification | Complex signature verification |
| **Customer Portal** | Built-in portal               | Custom implementation needed   |
| **Trial Handling**  | Built-in                      | Custom implementation          |
| **Plan Management** | API-based                     | Dashboard or API               |

## 🚨 Important Notes

1. **Webhook Security**: PayPal webhook verification is more complex than LemonSqueezy
2. **Customer Portal**: You'll need to build your own subscription management UI
3. **Testing**: Use PayPal Sandbox for all testing
4. **Compliance**: Ensure you handle subscription data according to PayPal's requirements

## 🎉 Benefits of PayPal

- ✅ **Easier KYC**: Much simpler verification process
- ✅ **Global Reach**: Accepted worldwide
- ✅ **User Trust**: High user confidence in PayPal
- ✅ **No Stripe Dependency**: Avoid Stripe's complex requirements
- ✅ **Direct Integration**: No third-party service fees

## 🔧 Next Steps

1. **Fix Dependencies**: Resolve the Prisma/Node modules issues
2. **Set up PayPal Plans**: Create your subscription plans in PayPal
3. **Configure Environment**: Add all PayPal credentials
4. **Test Integration**: Use sandbox for thorough testing
5. **Deploy**: Switch to production when ready

The PayPal integration is now ready to use once the environment is properly configured!
