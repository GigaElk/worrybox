/**
 * Utility script to set a user's role to LIFETIME_PREMIUM
 * Usage: node scripts/setLifetimePremium.js <email>
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function setLifetimePremium(email) {
  try {
    console.log(`🔍 Looking for user with email: ${email}`);
    
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        username: true,
        displayName: true,
        role: true,
      }
    });

    if (!user) {
      console.error(`❌ User with email ${email} not found`);
      process.exit(1);
    }

    console.log(`👤 Found user:`, user);

    if (user.role === 'LIFETIME_PREMIUM') {
      console.log(`✅ User ${email} already has lifetime premium`);
      process.exit(0);
    }

    console.log(`🔄 Updating user role to LIFETIME_PREMIUM...`);

    const updatedUser = await prisma.user.update({
      where: { email },
      data: { role: 'LIFETIME_PREMIUM' },
      select: {
        id: true,
        email: true,
        username: true,
        displayName: true,
        role: true,
      }
    });

    console.log(`✅ Successfully updated user role:`, updatedUser);
    console.log(`🎉 ${email} now has lifetime premium access! Perfect for contest winners! 🏆`);

  } catch (error) {
    console.error('❌ Failed to set lifetime premium role:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Get email from command line arguments
const email = process.argv[2];

if (!email) {
  console.error('❌ Please provide an email address');
  console.log('Usage: node scripts/setLifetimePremium.js <email>');
  console.log('Example: node scripts/setLifetimePremium.js winner@example.com');
  process.exit(1);
}

setLifetimePremium(email);