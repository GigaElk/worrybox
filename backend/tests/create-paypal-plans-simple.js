// Simple PayPal Plan Creation Script
const https = require('https');

const CLIENT_ID = 'Acmwy40QNx8qOBDSsKbrF-D-TbBWDvU4t7c6uuPDUV003yHmNs_MI5NiFbHeT01ZqmqLq9Ana0mxLxcL';
const CLIENT_SECRET = 'ENZehSDSPXXinf5lOSvr3wd2pZ-pTsU023JR2TlK1Y-Z7HfRjjjEu3RMDfzwvoGi58biaHkNl2juiqcT';
const BASE_URL = 'api-m.paypal.com';

// Get Access Token
function getAccessToken() {
  return new Promise((resolve, reject) => {
    const auth = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64');
    
    const postData = 'grant_type=client_credentials';
    
    const options = {
      hostname: BASE_URL,
      path: '/v1/oauth2/token',
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Accept-Language': 'en_US',
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': postData.length
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          const data = JSON.parse(body);
          console.log('✅ Got access token');
          resolve(data.access_token);
        } else {
          console.error('❌ Auth failed:', body);
          reject(new Error(body));
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

// Create Product
function createProduct(accessToken, productData) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(productData);
    
    const options = {
      hostname: BASE_URL,
      path: '/v1/catalogs/products',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json',
        'PayPal-Request-Id': `PRODUCT-${Date.now()}`,
        'Content-Length': postData.length
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        if (res.statusCode === 201) {
          const data = JSON.parse(body);
          console.log(`✅ Created product: ${data.name}`);
          resolve(data.id);
        } else {
          console.error('❌ Product creation failed:', body);
          reject(new Error(body));
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

// Create Plan
function createPlan(accessToken, planData) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(planData);
    
    const options = {
      hostname: BASE_URL,
      path: '/v1/billing/plans',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json',
        'PayPal-Request-Id': `PLAN-${Date.now()}`,
        'Content-Length': postData.length
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        if (res.statusCode === 201) {
          const data = JSON.parse(body);
          console.log(`✅ Created plan: ${data.name}`);
          resolve(data.id);
        } else {
          console.error('❌ Plan creation failed:', body);
          reject(new Error(body));
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

// Main function
async function main() {
  try {
    console.log('🚀 Creating Worrybox PayPal plans...\n');
    
    // Get access token
    const accessToken = await getAccessToken();
    
    // Create products
    const supporterProduct = {
      name: 'Worrybox Supporter',
      description: 'Enhanced features and personal analytics',
      type: 'SERVICE',
      category: 'SOFTWARE'
    };
    
    const premiumProduct = {
      name: 'Worrybox Premium', 
      description: 'Full access to all features and insights',
      type: 'SERVICE',
      category: 'SOFTWARE'
    };
    
    console.log('📦 Creating products...');
    const supporterProductId = await createProduct(accessToken, supporterProduct);
    const premiumProductId = await createProduct(accessToken, premiumProduct);
    
    // Create plans
    console.log('\n📋 Creating subscription plans...');
    
    const supporterPlan = {
      product_id: supporterProductId,
      name: 'Worrybox Supporter',
      description: 'Enhanced features and personal analytics - $5/month',
      status: 'ACTIVE',
      billing_cycles: [{
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
      }],
      payment_preferences: {
        auto_bill_outstanding: true,
        setup_fee: {
          value: '0.00',
          currency_code: 'USD'
        },
        setup_fee_failure_action: 'CONTINUE',
        payment_failure_threshold: 3
      }
    };
    
    const premiumPlan = {
      product_id: premiumProductId,
      name: 'Worrybox Premium',
      description: 'Full access to all features and insights - $12/month',
      status: 'ACTIVE',
      billing_cycles: [{
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
      }],
      payment_preferences: {
        auto_bill_outstanding: true,
        setup_fee: {
          value: '0.00',
          currency_code: 'USD'
        },
        setup_fee_failure_action: 'CONTINUE',
        payment_failure_threshold: 3
      }
    };
    
    const supporterPlanId = await createPlan(accessToken, supporterPlan);
    const premiumPlanId = await createPlan(accessToken, premiumPlan);
    
    // Success!
    console.log('\n🎉 SUCCESS! Your plans are ready!\n');
    console.log('Add these to your .env file:');
    console.log('=' .repeat(60));
    console.log(`PAYPAL_SUPPORTER_PLAN_ID=${supporterPlanId}`);
    console.log(`PAYPAL_PREMIUM_PLAN_ID=${premiumPlanId}`);
    console.log('=' .repeat(60));
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
  }
}

main();