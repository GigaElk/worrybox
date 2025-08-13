/**
 * Utility script to set a user's role to ADMIN
 * Usage: node scripts/setAdminRole.js <email>
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function setAdminRole(email) {
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

    if (user.role === 'ADMIN') {
      console.log(`✅ User ${email} is already an admin`);
      process.exit(0);
    }

    console.log(`🔄 Updating user role to ADMIN...`);

    const updatedUser = await prisma.user.update({
      where: { email },
      data: { role: 'ADMIN' },
      select: {
        id: true,
        email: true,
        username: true,
        displayName: true,
        role: true,
      }
    });

    console.log(`✅ Successfully updated user role:`, updatedUser);
    console.log(`🎉 ${email} is now an admin with full access to all features!`);

  } catch (error) {
    console.error('❌ Failed to set admin role:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Get email from command line arguments
const email = process.argv[2];

if (!email) {
  console.error('❌ Please provide an email address');
  console.log('Usage: node scripts/setAdminRole.js <email>');
  process.exit(1);
}

setAdminRole(email);