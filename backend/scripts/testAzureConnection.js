/**
 * Test Azure SQL Server connection and check data
 * Usage: node scripts/testAzureConnection.js
 */

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

async function testAzureConnection() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔍 Testing Azure SQL connection...');
    console.log('Database URL:', process.env.DATABASE_URL?.replace(/password=[^;]*/i, 'password=***'));
    
    // Test basic connection
    await prisma.$connect();
    console.log('✅ Connected to Azure SQL successfully!');
    
    // Test user count
    const userCount = await prisma.user.count();
    console.log(`👥 Users in database: ${userCount}`);
    
    if (userCount > 0) {
      // Show first few users
      const users = await prisma.user.findMany({
        take: 5,
        select: {
          email: true,
          username: true,
          createdAt: true
        }
      });
      
      console.log('📋 Sample users:');
      users.forEach(user => {
        console.log(`  - ${user.email} (${user.username})`);
      });
    }
    
    // Test post count
    const postCount = await prisma.post.count();
    console.log(`📝 Posts in database: ${postCount}`);
    
    // Test other tables
    const commentCount = await prisma.comment.count();
    console.log(`💬 Comments in database: ${commentCount}`);
    
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    
    if (error.message.includes('timeout')) {
      console.log('⏰ This might be the Azure SQL access limit issue you mentioned!');
    }
    
  } finally {
    await prisma.$disconnect();
  }
}

testAzureConnection();