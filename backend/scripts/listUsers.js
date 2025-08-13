const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function listUsers() {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        username: true,
        displayName: true,
        role: true,
        createdAt: true,
      }
    });

    console.log('📋 Current users:');
    users.forEach((user, index) => {
      console.log(`${index + 1}. ${user.email} (${user.username}) - Role: ${user.role || 'USER'}`);
      console.log(`   Display Name: ${user.displayName || 'Not set'}`);
      console.log(`   Created: ${user.createdAt}`);
      console.log('');
    });

    console.log(`Total users: ${users.length}`);
  } catch (error) {
    console.error('❌ Failed to list users:', error);
  } finally {
    await prisma.$disconnect();
  }
}

listUsers();