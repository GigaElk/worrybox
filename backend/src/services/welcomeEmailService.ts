import { PrismaClient } from '@prisma/client';
import { sendVerificationEmail } from '../utils/email';
import { generatePasswordResetToken } from '../utils/jwt';

const prisma = new PrismaClient();

export class WelcomeEmailService {
  /**
   * Send welcome emails to users who haven't received them yet
   */
  static async sendMissingWelcomeEmails(): Promise<void> {
    try {
      // Check if email is configured
      if (!process.env.EMAIL_HOST || !process.env.EMAIL_USER) {
        console.log('📧 Email not configured - skipping welcome email check');
        return;
      }

      // Find users who haven't received welcome emails
      const usersWithoutWelcomeEmail = await prisma.user.findMany({
        where: {
          welcomeEmailSent: false,
          emailVerified: false, // Only send to unverified users (they need the verification link)
        },
        select: {
          id: true,
          email: true,
          username: true,
          createdAt: true,
        },
      });

      if (usersWithoutWelcomeEmail.length === 0) {
        console.log('📧 All users have received welcome emails');
        return;
      }

      console.log(`📧 Found ${usersWithoutWelcomeEmail.length} users without welcome emails`);

      // Send welcome emails
      for (const user of usersWithoutWelcomeEmail) {
        try {
          const verificationToken = generatePasswordResetToken(user.id);
          await sendVerificationEmail(user.email, verificationToken);

          // Mark as sent
          await prisma.user.update({
            where: { id: user.id },
            data: {
              welcomeEmailSent: true,
              welcomeEmailSentAt: new Date(),
            },
          });

          console.log(`📧 Welcome email sent to ${user.email} (${user.username})`);
          
          // Add small delay to avoid overwhelming email service
          await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error) {
          console.error(`❌ Failed to send welcome email to ${user.email}:`, error);
        }
      }

      console.log(`✅ Welcome email batch complete - sent to ${usersWithoutWelcomeEmail.length} users`);
    } catch (error) {
      console.error('❌ Welcome email service error:', error);
    }
  }

  /**
   * Get statistics about welcome email sending
   */
  static async getWelcomeEmailStats(): Promise<{
    totalUsers: number;
    emailsSent: number;
    emailsPending: number;
  }> {
    const [totalUsers, emailsSent] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({
        where: { welcomeEmailSent: true },
      }),
    ]);

    return {
      totalUsers,
      emailsSent,
      emailsPending: totalUsers - emailsSent,
    };
  }
}