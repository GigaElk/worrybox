/**
 * Test DNS resolution for Supabase
 * Usage: node scripts/testDNS.js
 */

const dns = require('dns');

function testDNS() {
  const hostname = 'db.zvexosuhztmepumnbuyv.supabase.co';
  
  console.log(`🔍 Testing DNS resolution for: ${hostname}`);
  console.log(`⏰ Time: ${new Date().toLocaleString()}`);
  
  dns.lookup(hostname, (err, address, family) => {
    if (err) {
      console.error('❌ DNS resolution failed:', err.message);
      console.log('💡 This is likely a DNS propagation issue.');
      console.log('🕐 Try again in 10-15 minutes.');
    } else {
      console.log('✅ DNS resolution successful!');
      console.log(`📍 IP Address: ${address}`);
      console.log(`🌐 IP Family: IPv${family}`);
      console.log('🎉 You can now try connecting to Supabase!');
    }
  });
}

testDNS();