# PayPal Setup Guide - Step by Step

## 🎯 Getting Your PayPal Credentials

Since you have an approved business account, here's exactly where to find each credential:

## 1. 🔑 Client ID & Client Secret

### Step 1: Access PayPal Developer Dashboard
1. Go to **https://developer.paypal.com/**
2. Click **"Log in to Dashboard"** (top right)
3. Sign in with your business PayPal account

### Step 2: Create or Access Your App
1. Once logged in, you'll see **"My Apps & Credentials"**
2. If you don't have an app yet:
   - Click **"Create App"**
   - App Name: `Worrybox Subscriptions`
   - Choose your business account as the merchant
   - Select **"Merchant"** as the app type
   - Check **"Subscriptions"** in features
3. If you already have an app, click on it

### Step 3: Get Your Credentials
- **PAYPAL_CLIENT_ID**: This is shown as **"Client ID"** (starts with `A...`)
- **PAYPAL_CLIENT_SECRET**: Click **"Show"** next to **"Secret"** (starts with `E...`)

**Important**: 
- Use **Sandbox** credentials for testing
- Use **Live** credentials for production

## 2. 📋 Creating Subscription Plans

### Step 1: Create Plans via API or Dashboard

#### Option A: Via PayPal Dashboard (Easier)
1. In your PayPal business account, go to **Products & Services**
2. Click **"Subscriptions"**
3. Click **"Create Plan"**

#### Option B: Via API (Recommended for integration)
Use this curl command (replace with your sandbox credentials first):

```bash
# Get access token first
curl -v -X POST https://api-m.sandbox.paypal.com/v1/oauth2/token \
  -H "Accept: application/json" \
  -H "Accept-Language: en_US" \
  -u "YOUR_CLIENT_ID:YOUR_CLIENT_SECRET" \
  -d "grant_type=client_credentials"

# Create Supporter Plan ($5/month)
curl -v -X POST https://api-m.sandbox.paypal.com/v1/billing/plans \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "PayPal-Request-Id: PLAN-SUPPORTER-$(date +%s)" \
  -d '{
    "product_id": "PROD-WORRYBOX-SUPPORTER",
    "name": "Worrybox Supporter",
    "description": "Enhanced features and personal analytics",
    "status": "ACTIVE",
    "billing_cycles": [
      {
        "frequency": {
          "interval_unit": "MONTH",
          "interval_count": 1
        },
        "tenure_type": "REGULAR",
        "sequence": 1,
        "total_cycles": 0,
        "pricing_scheme": {
          "fixed_price": {
            "value": "5.00",
            "currency_code": "USD"
          }
        }
      }
    ],
    "payment_preferences": {
      "auto_bill_outstanding": true,
      "setup_fee": {
        "value": "0.00",
        "currency_code": "USD"
      },
      "setup_fee_failure_action": "CONTINUE",
      "payment_failure_threshold": 3
    },
    "taxes": {
      "percentage": "0.00",
      "inclusive": false
    }
  }'

# Create Premium Plan ($12/month)
curl -v -X POST https://api-m.sandbox.paypal.com/v1/billing/plans \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "PayPal-Request-Id: PLAN-PREMIUM-$(date +%s)" \
  -d '{
    "product_id": "PROD-WORRYBOX-PREMIUM",
    "name": "Worrybox Premium",
    "description": "Full access to all features and insights",
    "status": "ACTIVE",
    "billing_cycles": [
      {
        "frequency": {
          "interval_unit": "MONTH",
          "interval_count": 1
        },
        "tenure_type": "REGULAR",
        "sequence": 1,
        "total_cycles": 0,
        "pricing_scheme": {
          "fixed_price": {
            "value": "12.00",
            "currency_code": "USD"
          }
        }
      }
    ],
    "payment_preferences": {
      "auto_bill_outstanding": true,
      "setup_fee": {
        "value": "0.00",
        "currency_code": "USD"
      },
      "setup_fee_failure_action": "CONTINUE",
      "payment_failure_threshold": 3
    },
    "taxes": {
      "percentage": "0.00",
      "inclusive": false
    }
  }'
```

### Step 2: Get Plan IDs
After creating plans, you'll get responses with:
- **PAYPAL_SUPPORTER_PLAN_ID**: `P-xxxxxxxxxxxxxxxxx` (from supporter plan response)
- **PAYPAL_PREMIUM_PLAN_ID**: `P-xxxxxxxxxxxxxxxxx` (from premium plan response)

## 3. 🔗 Setting Up Webhooks

### Step 1: Create Webhook Endpoint
1. In PayPal Developer Dashboard
2. Go to your app
3. Click **"Add Webhook"**
4. **Webhook URL**: `https://your-domain.com/api/subscriptions/webhook`
   - For testing: `https://your-ngrok-url.ngrok.io/api/subscriptions/webhook`
   - For production: `https://worrybox.com/api/subscriptions/webhook`

### Step 2: Select Events
Check these events:
- ✅ `BILLING.SUBSCRIPTION.CREATED`
- ✅ `BILLING.SUBSCRIPTION.ACTIVATED`
- ✅ `BILLING.SUBSCRIPTION.UPDATED`
- ✅ `BILLING.SUBSCRIPTION.CANCELLED`
- ✅ `BILLING.SUBSCRIPTION.SUSPENDED`
- ✅ `BILLING.SUBSCRIPTION.PAYMENT.FAILED`
- ✅ `BILLING.SUBSCRIPTION.EXPIRED`

### Step 3: Get Webhook ID
- **PAYPAL_WEBHOOK_ID**: After creating the webhook, you'll see the Webhook ID (starts with `WH-...`)

## 4. 🧪 Testing Setup

### For Development/Testing:
```env
# Sandbox credentials (for testing)
PAYPAL_CLIENT_ID=AeA1QIZXiflr-9JgOEgYIH_WQmH4EWjNI7_5iKOiGHU8M8I7_Pt_6IFW8iHb9dEn8kTzKz7tkrrlSSb7
PAYPAL_CLIENT_SECRET=EGnHDxD_qRPOmeAjz1L6sFNRPD0Vs21ecNMQB1CZDINkBaYxvE5hTM6xkXEKBbPp-ZMuAoHS4RCOcKJ
PAYPAL_WEBHOOK_ID=WH-2WR32451HC0233532-67976317FL4543714
PAYPAL_SUPPORTER_PLAN_ID=P-5ML4271244454362WXNWU5NQ
PAYPAL_PREMIUM_PLAN_ID=P-94458432VR012762TXNWU5NQ
NODE_ENV=development
```

### For Production:
```env
# Live credentials (for production)
PAYPAL_CLIENT_ID=your-live-client-id
PAYPAL_CLIENT_SECRET=your-live-client-secret
PAYPAL_WEBHOOK_ID=your-live-webhook-id
PAYPAL_SUPPORTER_PLAN_ID=your-live-supporter-plan-id
PAYPAL_PREMIUM_PLAN_ID=your-live-premium-plan-id
NODE_ENV=production
```

## 5. 🔍 Quick Verification

### Test Your Credentials:
```bash
# Test getting access token
curl -v -X POST https://api-m.sandbox.paypal.com/v1/oauth2/token \
  -H "Accept: application/json" \
  -H "Accept-Language: en_US" \
  -u "YOUR_CLIENT_ID:YOUR_CLIENT_SECRET" \
  -d "grant_type=client_credentials"
```

If this returns an access token, your credentials are working!

## 6. 📱 Easy Setup Tool

I can also create a simple Node.js script to help you set up the plans automatically. Would you like me to create that?

## 🚨 Important Notes

1. **Sandbox vs Live**: 
   - Always test with Sandbox first
   - Switch to Live when ready for production

2. **Webhook URL**: 
   - Must be HTTPS in production
   - Use ngrok for local testing

3. **Plan IDs**: 
   - Different between Sandbox and Live
   - You'll need to create plans in both environments

4. **Security**: 
   - Never commit real credentials to git
   - Use environment variables

## 🎯 Next Steps

1. **Get your Client ID & Secret** from developer.paypal.com
2. **Create your subscription plans** (I can help with the API calls)
3. **Set up webhooks** pointing to your server
4. **Test with sandbox credentials** first
5. **Switch to live credentials** when ready

Let me know when you have your Client ID and Secret, and I can help you create the subscription plans!