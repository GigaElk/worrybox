/**
 * Utility script to manually verify a user's email (emergency use)
 * Usage: node scripts/manuallyVerifyEmail.js <email>
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function manuallyVerifyEmail(email) {
  try {
    console.log(`🔍 Looking for user with email: ${email}`);
    
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        username: true,
        emailVerified: true,
      }
    });

    if (!user) {
      console.error(`❌ User with email ${email} not found`);
      process.exit(1);
    }

    console.log(`👤 Found user:`, user);

    if (user.emailVerified) {
      console.log(`✅ User ${email} is already verified`);
      process.exit(0);
    }

    console.log(`🔄 Manually verifying email for ${email}...`);

    const updatedUser = await prisma.user.update({
      where: { email },
      data: { emailVerified: true },
      select: {
        id: true,
        email: true,
        username: true,
        emailVerified: true,
      }
    });

    console.log(`✅ Successfully verified email:`, updatedUser);
    console.log(`🎉 ${email} can now access all features!`);

  } catch (error) {
    console.error('❌ Failed to verify email:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Get email from command line arguments
const email = process.argv[2];

if (!email) {
  console.error('❌ Please provide an email address');
  console.log('Usage: node scripts/manuallyVerifyEmail.js <email>');
  console.log('Example: node scripts/manuallyVerifyEmail.js user@example.com');
  process.exit(1);
}

manuallyVerifyEmail(email);