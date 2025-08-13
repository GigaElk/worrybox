const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkUnverifiedUsers() {
  try {
    const users = await prisma.user.findMany({
      where: { emailVerified: false },
      select: {
        email: true,
        createdAt: true,
        welcomeEmailSentAt: true,
      }
    });

    console.log('📧 Unverified users:');
    users.forEach((user, index) => {
      console.log(`${index + 1}. ${user.email}`);
      console.log(`   Created: ${user.createdAt}`);
      console.log(`   Welcome email sent: ${user.welcomeEmailSentAt || 'Not sent'}`);
      
      if (user.welcomeEmailSentAt) {
        const hoursSinceEmail = (Date.now() - new Date(user.welcomeEmailSentAt).getTime()) / (1000 * 60 * 60);
        console.log(`   Hours since email: ${hoursSinceEmail.toFixed(1)}`);
        if (hoursSinceEmail > 1) {
          console.log(`   ⚠️  Token likely expired (sent ${hoursSinceEmail.toFixed(1)} hours ago)`);
        }
      }
      console.log('');
    });

    console.log(`Total unverified users: ${users.length}`);
  } catch (error) {
    console.error('❌ Failed to check unverified users:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkUnverifiedUsers();