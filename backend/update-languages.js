// Simple script to update supported languages in production
// Run with: node update-languages.js

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function updateLanguages() {
  console.log('🔄 Updating supported languages...');

  try {
    // Deactivate unsupported languages
    const unsupportedLanguages = ['zh', 'ru', 'ar', 'hi'];
    
    for (const code of unsupportedLanguages) {
      const result = await prisma.supportedLanguage.updateMany({
        where: { code },
        data: { isActive: false }
      });
      console.log(`❌ Deactivated ${code}: ${result.count} records updated`);
    }

    // Ensure supported languages are active
    const supportedLanguages = ['en', 'es', 'fr', 'de', 'it', 'pt', 'ja', 'ko'];
    
    for (const code of supportedLanguages) {
      const result = await prisma.supportedLanguage.updateMany({
        where: { code },
        data: { isActive: true }
      });
      console.log(`✅ Activated ${code}: ${result.count} records updated`);
    }

    // Show final status
    const activeLanguages = await prisma.supportedLanguage.findMany({
      where: { isActive: true },
      select: { code: true, name: true }
    });

    console.log('\n🌍 Active languages:');
    activeLanguages.forEach(lang => {
      console.log(`  - ${lang.code}: ${lang.name}`);
    });

    console.log('\n✅ Language update completed successfully!');
  } catch (error) {
    console.error('❌ Error updating languages:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

updateLanguages();