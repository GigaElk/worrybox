/**
 * Populate database with static data (worry prompts, languages, etc.)
 * Usage: node scripts/populateStaticData.js
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function populateStaticData() {
  try {
    console.log('🌱 Populating database with static data...');

    // Worry Prompts
    console.log('📝 Adding worry prompts...');
    const worryPrompts = [
      { text: "What's been weighing on your mind lately?", sortOrder: 1 },
      { text: "What worry kept you up last night?", sortOrder: 2 },
      { text: "What's making you feel anxious today?", sortOrder: 3 },
      { text: "What's been bothering you this week?", sortOrder: 4 },
      { text: "What fear has been holding you back?", sortOrder: 5 },
      { text: "What situation is causing you stress?", sortOrder: 6 },
      { text: "What's been on your mind that you can't shake?", sortOrder: 7 },
      { text: "What concern has been growing lately?", sortOrder: 8 },
      { text: "What's making you feel overwhelmed?", sortOrder: 9 },
      { text: "What worry would you like to share today?", sortOrder: 10 }
    ];

    for (const prompt of worryPrompts) {
      await prisma.worryPrompt.upsert({
        where: { text: prompt.text },
        update: {},
        create: prompt
      });
    }
    console.log(`✅ Added ${worryPrompts.length} worry prompts`);

    // Supported Languages
    console.log('🌍 Adding supported languages...');
    const languages = [
      { code: 'en', name: 'English', nativeName: 'English' },
      { code: 'es', name: 'Spanish', nativeName: 'Español' },
      { code: 'fr', name: 'French', nativeName: 'Français' },
      { code: 'de', name: 'German', nativeName: 'Deutsch' },
      { code: 'it', name: 'Italian', nativeName: 'Italiano' },
      { code: 'pt', name: 'Portuguese', nativeName: 'Português' },
      { code: 'ja', name: 'Japanese', nativeName: '日本語' },
      { code: 'ko', name: 'Korean', nativeName: '한국어' },
      { code: 'zh', name: 'Chinese', nativeName: '中文' },
      { code: 'ar', name: 'Arabic', nativeName: 'العربية' }
    ];

    for (const lang of languages) {
      await prisma.supportedLanguage.upsert({
        where: { code: lang.code },
        update: {},
        create: lang
      });
    }
    console.log(`✅ Added ${languages.length} supported languages`);

    // Mental Health Resources
    console.log('🏥 Adding mental health resources...');
    const resources = [
      {
        name: 'National Suicide Prevention Lifeline',
        type: 'crisis_hotline',
        description: '24/7 crisis support for people in suicidal crisis or emotional distress',
        phoneNumber: '988',
        countryCode: 'US',
        isCrisisResource: true
      },
      {
        name: 'Crisis Text Line',
        type: 'crisis_hotline', 
        description: 'Free, 24/7 crisis support via text message',
        phoneNumber: 'Text HOME to 741741',
        countryCode: 'US',
        isCrisisResource: true
      },
      {
        name: 'Samaritans',
        type: 'crisis_hotline',
        description: '24/7 emotional support for people experiencing distress or despair',
        phoneNumber: '116 123',
        websiteUrl: 'https://www.samaritans.org/',
        countryCode: 'GB',
        isCrisisResource: true
      },
      {
        name: 'BetterHelp',
        type: 'online_resource',
        description: 'Online counseling and therapy services',
        websiteUrl: 'https://www.betterhelp.com/',
        isCrisisResource: false
      },
      {
        name: 'Headspace',
        type: 'online_resource',
        description: 'Meditation and mindfulness app',
        websiteUrl: 'https://www.headspace.com/',
        isCrisisResource: false
      }
    ];

    for (const resource of resources) {
      // Check if resource already exists
      const existing = await prisma.mentalHealthResource.findFirst({
        where: { name: resource.name }
      });
      
      if (!existing) {
        await prisma.mentalHealthResource.create({
          data: resource
        });
      }
    }
    console.log(`✅ Added ${resources.length} mental health resources`);

    // Sample Guided Exercises
    console.log('🧘 Adding guided exercises...');
    const exercises = [
      {
        title: '5-4-3-2-1 Grounding Technique',
        description: 'A simple grounding exercise to help with anxiety and panic',
        category: 'anxiety',
        instructions: 'Name 5 things you can see, 4 things you can touch, 3 things you can hear, 2 things you can smell, and 1 thing you can taste.',
        durationMinutes: 5,
        difficultyLevel: 'beginner'
      },
      {
        title: 'Deep Breathing Exercise',
        description: 'Calm your mind and body with focused breathing',
        category: 'stress',
        instructions: 'Breathe in slowly for 4 counts, hold for 4 counts, then breathe out for 6 counts. Repeat 10 times.',
        durationMinutes: 10,
        difficultyLevel: 'beginner'
      },
      {
        title: 'Progressive Muscle Relaxation',
        description: 'Release physical tension throughout your body',
        category: 'stress',
        instructions: 'Starting with your toes, tense each muscle group for 5 seconds, then relax. Work your way up to your head.',
        durationMinutes: 20,
        difficultyLevel: 'intermediate'
      }
    ];

    for (const exercise of exercises) {
      // Check if exercise already exists
      const existing = await prisma.guidedExercise.findFirst({
        where: { title: exercise.title }
      });
      
      if (!existing) {
        await prisma.guidedExercise.create({
          data: exercise
        });
      }
    }
    console.log(`✅ Added ${exercises.length} guided exercises`);

    console.log('🎉 Static data population completed!');

  } catch (error) {
    console.error('❌ Failed to populate static data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

populateStaticData();