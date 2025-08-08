// PayPal Plan Creation Script
// Run this with: node create-paypal-plans.js

const https = require('https');

// Replace these with your actual credentials
const CLIENT_ID = 'Acmwy40QNx8qOBDSsKbrF-D-TbBWDvU4t7c6uuPDUV003yHmNs_MI5NiFbHeT01ZqmqLq9Ana0mxLxcL';
const CLIENT_SECRET = 'ENZehSDSPXXinf5lOSvr3wd2pZ-pTsU023JR2TlK1Y-Z7HfRjjjEu3RMDfzwvoGi58biaHkNl2juiqcT';

// Use sandbox for testing, change to api-m.paypal.com for production
const BASE_URL = 'https://api-m.paypal.com'; // Changed to LIVE for your credentials

// Function to make HTTP requests
function makeRequest(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on('error', reject);
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

// Step 1: Get Access Token
async function getAccessToken() {
  console.log('🔑 Getting PayPal access token...');
  
  const auth = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64');
  
  const options = {
    hostname: BASE_URL.replace('https://', ''),
    path: '/v1/oauth2/token',
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Accept-Language': 'en_US',
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    }
  };

  const req = https.request(options, (res) => {
    let body = '';
    res.on('data', (chunk) => body += chunk);
    res.on('end', () => {
      try {
        const parsed = JSON.parse(body);
        if (res.statusCode === 200) {
          console.log('✅ Access token obtained');
          resolve(parsed.access_token);
        } else {
          console.error('❌ Failed to get access token:', parsed);
          reject(new Error('Authentication failed'));
        }
      } catch (e) {
        console.error('❌ Invalid response:', body);
        reject(new Error('Invalid response'));
      }
    });
  });

  req.on('error', reject);
  req.write('grant_type=client_credentials');
  req.end();
  
  return new Promise((resolve, reject) => {
    // Promise is handled in the request above
  });
  
  if (response.status === 200) {
    console.log('✅ Access token obtained');
    return response.data.access_token;
  } else {
    console.error('❌ Failed to get access token:', response.data);
    throw new Error('Authentication failed');
  }
}

// Step 2: Create Product (required before creating plans)
async function createProduct(accessToken, productData) {
  console.log(`📦 Creating product: ${productData.name}...`);
  
  const options = {
    hostname: BASE_URL.replace('https://', ''),
    path: '/v1/catalogs/products',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
      'Accept': 'application/json',
      'PayPal-Request-Id': `PRODUCT-${Date.now()}`
    }
  };

  const response = await makeRequest(options, productData);
  
  if (response.status === 201) {
    console.log(`✅ Product created: ${response.data.id}`);
    return response.data.id;
  } else {
    console.error('❌ Failed to create product:', response.data);
    throw new Error('Product creation failed');
  }
}

// Step 3: Create Subscription Plan
async function createPlan(accessToken, planData) {
  console.log(`📋 Creating plan: ${planData.name}...`);
  
  const options = {
    hostname: BASE_URL.replace('https://', ''),
    path: '/v1/billing/plans',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
      'Accept': 'application/json',
      'PayPal-Request-Id': `PLAN-${Date.now()}`
    }
  };

  const response = await makeRequest(options, planData);
  
  if (response.status === 201) {
    console.log(`✅ Plan created: ${response.data.id}`);
    return response.data.id;
  } else {
    console.error('❌ Failed to create plan:', response.data);
    throw new Error('Plan creation failed');
  }
}

// Main function
async function createWorryboxPlans() {
  try {
    console.log('🚀 Creating Worrybox PayPal subscription plans...\n');
    
    // Get access token
    const accessToken = await getAccessToken();
    
    // Create products first
    const supporterProduct = {
      name: 'Worrybox Supporter',
      description: 'Enhanced features and personal analytics for Worrybox users',
      type: 'SERVICE',
      category: 'SOFTWARE'
    };
    
    const premiumProduct = {
      name: 'Worrybox Premium',
      description: 'Full access to all Worrybox features and insights',
      type: 'SERVICE',
      category: 'SOFTWARE'
    };
    
    const supporterProductId = await createProduct(accessToken, supporterProduct);
    const premiumProductId = await createProduct(accessToken, premiumProduct);
    
    // Create Supporter Plan ($5/month)
    const supporterPlan = {
      product_id: supporterProductId,
      name: 'Worrybox Supporter',
      description: 'Enhanced features and personal analytics',
      status: 'ACTIVE',
      billing_cycles: [
        {
          frequency: {
            interval_unit: 'MONTH',
            interval_count: 1
          },
          tenure_type: 'REGULAR',
          sequence: 1,
          total_cycles: 0,
          pricing_scheme: {
            fixed_price: {
              value: '5.00',
              currency_code: 'USD'
            }
          }
        }
      ],
      payment_preferences: {
        auto_bill_outstanding: true,
        setup_fee: {
          value: '0.00',
          currency_code: 'USD'
        },
        setup_fee_failure_action: 'CONTINUE',
        payment_failure_threshold: 3
      },
      taxes: {
        percentage: '0.00',
        inclusive: false
      }
    };
    
    // Create Premium Plan ($12/month)
    const premiumPlan = {
      product_id: premiumProductId,
      name: 'Worrybox Premium',
      description: 'Full access to all features and insights',
      status: 'ACTIVE',
      billing_cycles: [
        {
          frequency: {
            interval_unit: 'MONTH',
            interval_count: 1
          },
          tenure_type: 'REGULAR',
          sequence: 1,
          total_cycles: 0,
          pricing_scheme: {
            fixed_price: {
              value: '12.00',
              currency_code: 'USD'
            }
          }
        }
      ],
      payment_preferences: {
        auto_bill_outstanding: true,
        setup_fee: {
          value: '0.00',
          currency_code: 'USD'
        },
        setup_fee_failure_action: 'CONTINUE',
        payment_failure_threshold: 3
      },
      taxes: {
        percentage: '0.00',
        inclusive: false
      }
    };
    
    // Create the plans
    const supporterPlanId = await createPlan(accessToken, supporterPlan);
    const premiumPlanId = await createPlan(accessToken, premiumPlan);
    
    // Display results
    console.log('\n🎉 SUCCESS! Your PayPal plans have been created!\n');
    console.log('Add these to your .env file:');
    console.log('=====================================');
    console.log(`PAYPAL_SUPPORTER_PLAN_ID=${supporterPlanId}`);
    console.log(`PAYPAL_PREMIUM_PLAN_ID=${premiumPlanId}`);
    console.log('=====================================\n');
    
    console.log('📋 Plan Summary:');
    console.log(`• Supporter Plan: $5/month - ${supporterPlanId}`);
    console.log(`• Premium Plan: $12/month - ${premiumPlanId}`);
    
  } catch (error) {
    console.error('❌ Error creating plans:', error.message);
    process.exit(1);
  }
}

// Check if credentials are set
if (CLIENT_ID === 'YOUR_CLIENT_ID_HERE' || CLIENT_SECRET === 'YOUR_CLIENT_SECRET_HERE') {
  console.error('❌ Please update CLIENT_ID and CLIENT_SECRET in this script first!');
  console.log('\n📝 Steps:');
  console.log('1. Open create-paypal-plans.js');
  console.log('2. Replace YOUR_CLIENT_ID_HERE with your actual Client ID');
  console.log('3. Replace YOUR_CLIENT_SECRET_HERE with your actual Client Secret');
  console.log('4. Run: node create-paypal-plans.js');
  process.exit(1);
}

// Run the script
createWorryboxPlans();