/**
 * Utility script to resend verification emails to unverified users
 * Usage: node scripts/resendVerificationEmails.js
 */

const { PrismaClient } = require('@prisma/client');
const { generateEmailVerificationToken } = require('../src/utils/jwt');
const { sendVerificationEmail } = require('../src/utils/email');

const prisma = new PrismaClient();

async function resendVerificationEmails() {
  try {
    console.log('🔍 Looking for unverified users...');
    
    const unverifiedUsers = await prisma.user.findMany({
      where: { emailVerified: false },
      select: {
        id: true,
        email: true,
        createdAt: true,
        welcomeEmailSentAt: true,
      }
    });

    if (unverifiedUsers.length === 0) {
      console.log('✅ No unverified users found!');
      return;
    }

    console.log(`📧 Found ${unverifiedUsers.length} unverified users. Resending verification emails...`);

    for (const user of unverifiedUsers) {
      try {
        console.log(`📤 Sending verification email to ${user.email}...`);
        
        // Generate new verification token (24h expiry)
        const verificationToken = generateEmailVerificationToken(user.id);
        
        // Send verification email
        await sendVerificationEmail(user.email, verificationToken);
        
        // Update the welcomeEmailSentAt timestamp
        await prisma.user.update({
          where: { id: user.id },
          data: { 
            welcomeEmailSentAt: new Date(),
            welcomeEmailSent: true 
          }
        });

        console.log(`✅ Verification email sent to ${user.email}`);
        
        // Add delay to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 2000));
        
      } catch (error) {
        console.error(`❌ Failed to send email to ${user.email}:`, error.message);
      }
    }

    console.log('🎉 Finished resending verification emails!');
    console.log('📝 Note: New tokens are valid for 24 hours instead of 1 hour.');

  } catch (error) {
    console.error('❌ Failed to resend verification emails:', error);
  } finally {
    await prisma.$disconnect();
  }
}

resendVerificationEmails();