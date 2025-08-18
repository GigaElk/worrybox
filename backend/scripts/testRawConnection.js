/**
 * Test raw PostgreSQL connection without Prisma
 * Usage: node scripts/testRawConnection.js
 */

require('dotenv').config({ path: '.env.local' });
const { Client } = require('pg');

async function testRawConnection() {
  // Parse the DATABASE_URL
  const dbUrl = process.env.DATABASE_URL;
  console.log('🔍 Testing raw PostgreSQL connection...');
  console.log('Database URL:', dbUrl?.replace(/:[^:@]*@/, ':***@'));
  
  const client = new Client({
    connectionString: dbUrl,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    console.log('🔌 Attempting to connect...');
    await client.connect();
    console.log('✅ Raw connection successful!');
    
    const result = await client.query('SELECT version()');
    console.log('✅ Query successful!');
    console.log('PostgreSQL version:', result.rows[0].version);
    
  } catch (error) {
    console.error('❌ Raw connection failed:', error.message);
    console.error('Error code:', error.code);
    
    if (error.code === 'ENOTFOUND') {
      console.log('\n🌐 DNS Resolution Issue:');
      console.log('- Try using a different DNS (8.8.8.8, 1.1.1.1)');
      console.log('- Check if your ISP blocks certain domains');
    }
    
    if (error.code === 'ETIMEDOUT' || error.code === 'ECONNREFUSED') {
      console.log('\n🔥 Firewall/Network Issue:');
      console.log('- Windows Firewall might be blocking port 5432');
      console.log('- Corporate network might block PostgreSQL connections');
      console.log('- Try using a VPN or mobile hotspot');
    }
    
  } finally {
    await client.end();
  }
}

testRawConnection();