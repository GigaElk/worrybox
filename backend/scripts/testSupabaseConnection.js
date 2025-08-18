/**
 * Test Supabase PostgreSQL connection
 * Usage: node scripts/testSupabaseConnection.js
 */

const { PrismaClient } = require('@prisma/client');

async function testConnection() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔍 Testing Supabase connection...');
    console.log('Database URL:', process.env.DATABASE_URL?.replace(/:[^:@]*@/, ':***@'));
    
    // Test basic connection
    await prisma.$connect();
    console.log('✅ Connected to Supabase successfully!');
    
    // Test a simple query
    const result = await prisma.$queryRaw`SELECT version()`;
    console.log('✅ Database query successful!');
    console.log('PostgreSQL version:', result[0].version);
    
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    
    if (error.message.includes("Can't reach database server")) {
      console.log('\n🔧 Troubleshooting tips:');
      console.log('1. Check your internet connection');
      console.log('2. Verify the Supabase connection string is correct');
      console.log('3. Make sure your Supabase project is fully provisioned');
      console.log('4. Try disabling Windows Firewall/antivirus temporarily');
      console.log('5. Check if your network blocks port 5432');
    }
    
    if (error.message.includes("password authentication failed")) {
      console.log('\n🔧 Password issue:');
      console.log('1. Double-check your database password in Supabase settings');
      console.log('2. Make sure there are no special characters causing issues');
      console.log('3. Try resetting the database password in Supabase');
    }
    
  } finally {
    await prisma.$disconnect();
  }
}

testConnection();