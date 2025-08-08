import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function seedSupportedLanguages() {
  console.log('Seeding supported languages...');

  const languages = [
    { code: 'en', name: 'English', nativeName: 'English' },
    { code: 'es', name: 'Spanish', nativeName: 'Español' },
    { code: 'fr', name: 'French', nativeName: 'Français' },
    { code: 'de', name: 'German', nativeName: 'Deutsch' },
    { code: 'it', name: 'Italian', nativeName: 'Italiano' },
    { code: 'pt', name: 'Portuguese', nativeName: 'Português' },
    { code: 'ja', name: 'Japanese', nativeName: '日本語' },
    { code: 'ko', name: 'Korean', nativeName: '한국어' }
    // Removed: zh, ru, ar, hi - no translation files available yet
  ];

  // First, deactivate unsupported languages
  const unsupportedLanguages = ['zh', 'ru', 'ar', 'hi'];
  for (const code of unsupportedLanguages) {
    await prisma.supportedLanguage.updateMany({
      where: { code },
      data: { isActive: false }
    });
  }

  // Then upsert the supported languages
  for (const lang of languages) {
    await prisma.supportedLanguage.upsert({
      where: { code: lang.code },
      update: { 
        name: lang.name, 
        nativeName: lang.nativeName,
        isActive: true 
      },
      create: {
        code: lang.code,
        name: lang.name,
        nativeName: lang.nativeName,
        isActive: true
      }
    });
  }

  console.log('✅ Supported languages seeded successfully');
}