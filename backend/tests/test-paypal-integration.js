// Test PayPal Integration
const https = require('https');

// Your PayPal credentials from .env
const CLIENT_ID = 'Acmwy40QNx8qOBDSsKbrF-D-TbBWDvU4t7c6uuPDUV003yHmNs_MI5NiFbHeT01ZqmqLq9Ana0mxLxcL';
const CLIENT_SECRET = 'ENZehSDSPXXinf5lOSvr3wd2pZ-pTsU023JR2TlK1Y-Z7HfRjjjEu3RMDfzwvoGi58biaHkNl2juiqcT';
const SUPPORTER_PLAN_ID = 'P-6Y281445D6713154MNCKVD5Q';
const PREMIUM_PLAN_ID = 'P-8RX33060U1592533NNCKVD5Q';

async function testPayPalIntegration() {
  console.log('🧪 Testing PayPal Integration...\n');
  
  try {
    // Test 1: Get Access Token
    console.log('1️⃣ Testing authentication...');
    const accessToken = await getAccessToken();
    console.log('✅ Authentication successful\n');
    
    // Test 2: Get Plan Details
    console.log('2️⃣ Testing plan retrieval...');
    const supporterPlan = await getPlan(accessToken, SUPPORTER_PLAN_ID);
    const premiumPlan = await getPlan(accessToken, PREMIUM_PLAN_ID);
    
    console.log(`✅ Supporter Plan: ${supporterPlan.name} - $${supporterPlan.billing_cycles[0].pricing_scheme.fixed_price.value}/month`);
    console.log(`✅ Premium Plan: ${premiumPlan.name} - $${premiumPlan.billing_cycles[0].pricing_scheme.fixed_price.value}/month\n`);
    
    // Test 3: Create Test Subscription (won't complete without user approval)
    console.log('3️⃣ Testing subscription creation...');
    const subscription = await createTestSubscription(accessToken, SUPPORTER_PLAN_ID);
    console.log(`✅ Test subscription created: ${subscription.id}`);
    console.log(`✅ Approval URL: ${subscription.links.find(l => l.rel === 'approve').href}\n`);
    
    console.log('🎉 All PayPal integration tests passed!');
    console.log('\n📋 Summary:');
    console.log('✅ PayPal authentication working');
    console.log('✅ Subscription plans accessible');
    console.log('✅ Subscription creation working');
    console.log('✅ Ready for frontend integration');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

function getAccessToken() {
  return new Promise((resolve, reject) => {
    const auth = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64');
    const postData = 'grant_type=client_credentials';
    
    const options = {
      hostname: 'api-m.paypal.com',
      path: '/v1/oauth2/token',
      method: 'POST',
      headers: {
        'Accept': 'application/json',
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
          resolve(data.access_token);
        } else {
          reject(new Error(`Auth failed: ${body}`));
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

function getPlan(accessToken, planId) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api-m.paypal.com',
      path: `/v1/billing/plans/${planId}`,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          resolve(JSON.parse(body));
        } else {
          reject(new Error(`Get plan failed: ${body}`));
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

function createTestSubscription(accessToken, planId) {
  return new Promise((resolve, reject) => {
    const subscriptionData = {
      plan_id: planId,
      custom_id: 'test-user-123',
      subscriber: {
        name: {
          given_name: 'Test',
          surname: 'User'
        },
        email_address: 'test@example.com'
      },
      application_context: {
        brand_name: 'Worrybox',
        locale: 'en-US',
        shipping_preference: 'NO_SHIPPING',
        user_action: 'SUBSCRIBE_NOW',
        return_url: 'https://worrybox.com/success',
        cancel_url: 'https://worrybox.com/cancel'
      }
    };

    const postData = JSON.stringify(subscriptionData);
    
    const options = {
      hostname: 'api-m.paypal.com',
      path: '/v1/billing/subscriptions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json',
        'PayPal-Request-Id': `TEST-${Date.now()}`,
        'Content-Length': postData.length
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        if (res.statusCode === 201) {
          resolve(JSON.parse(body));
        } else {
          reject(new Error(`Create subscription failed: ${body}`));
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

testPayPalIntegration();