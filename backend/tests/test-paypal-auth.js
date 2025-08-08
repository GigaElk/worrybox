// PayPal Authentication Test
// Run this with: node test-paypal-auth.js

const https = require('https');

// Your credentials
const CLIENT_ID = 'Acmwy40QNx8qOBDSsKbrF-D-TbBWDvU4t7c6uuPDUV003yHmNs_MI5NiFbHeT01ZqmqLq9Ana0mxLxcL';
const CLIENT_SECRET = 'ENZehSDSPXXinf5lOSvr3wd2pZ-pTsU023JR2TlK1Y-Z7HfRjjjEu3RMDfzwvoGi58biaHkNl2juiqcT';

// Test both environments
const environments = [
  { name: 'Sandbox', url: 'https://api-m.sandbox.paypal.com' },
  { name: 'Live', url: 'https://api-m.paypal.com' }
];

function testAuth(baseUrl, envName) {
  return new Promise((resolve) => {
    console.log(`🧪 Testing ${envName} environment...`);
    
    const auth = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64');
    
    const options = {
      hostname: baseUrl.replace('https://', ''),
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
            console.log(`✅ ${envName}: Authentication successful!`);
            console.log(`   Token type: ${parsed.token_type}`);
            console.log(`   Expires in: ${parsed.expires_in} seconds`);
            resolve({ success: true, env: envName, url: baseUrl });
          } else {
            console.log(`❌ ${envName}: Authentication failed`);
            console.log(`   Status: ${res.statusCode}`);
            console.log(`   Error: ${parsed.error}`);
            console.log(`   Description: ${parsed.error_description}`);
            resolve({ success: false, env: envName, error: parsed });
          }
        } catch (e) {
          console.log(`❌ ${envName}: Invalid response`);
          console.log(`   Status: ${res.statusCode}`);
          console.log(`   Body: ${body}`);
          resolve({ success: false, env: envName, error: body });
        }
      });
    });

    req.on('error', (error) => {
      console.log(`❌ ${envName}: Network error - ${error.message}`);
      resolve({ success: false, env: envName, error: error.message });
    });
    
    req.write('grant_type=client_credentials');
    req.end();
  });
}

async function testAllEnvironments() {
  console.log('🔍 Testing PayPal credentials in both environments...\n');
  
  const results = [];
  
  for (const env of environments) {
    const result = await testAuth(env.url, env.name);
    results.push(result);
    console.log(''); // Empty line for readability
  }
  
  // Summary
  console.log('📊 Summary:');
  console.log('='.repeat(50));
  
  const successful = results.filter(r => r.success);
  
  if (successful.length === 0) {
    console.log('❌ No environments worked. Possible issues:');
    console.log('   1. Client ID or Secret is incorrect');
    console.log('   2. Credentials are for a different app');
    console.log('   3. App permissions are not set correctly');
    console.log('\n🔧 Next steps:');
    console.log('   1. Double-check your credentials in PayPal Developer Dashboard');
    console.log('   2. Make sure your app has "Subscriptions" feature enabled');
    console.log('   3. Verify you\'re using the right Client ID/Secret pair');
  } else {
    console.log(`✅ Working environments: ${successful.map(s => s.env).join(', ')}`);
    console.log('\n🎯 Use this environment for creating plans:');
    successful.forEach(s => {
      console.log(`   ${s.env}: ${s.url}`);
    });
  }
}

testAllEnvironments();