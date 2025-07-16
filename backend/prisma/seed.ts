import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const worryPrompts = [
  { text: "What's weighing on your mind today?", sortOrder: 1 },
  { text: "What worry would you like to share?", sortOrder: 2 },
  { text: "What's been keeping you up at night?", sortOrder: 3 },
  { text: "What concern is on your heart?", sortOrder: 4 },
  { text: "What's making you feel anxious?", sortOrder: 5 },
  { text: "What situation is troubling you?", sortOrder: 6 },
  { text: "What fear would you like to express?", sortOrder: 7 },
  { text: "What's been bothering you lately?", sortOrder: 8 },
  { text: "What uncertainty are you facing?", sortOrder: 9 },
  { text: "What stress are you dealing with?", sortOrder: 10 },
  { text: "I'm worried about...", sortOrder: 11 },
  { text: "I can't stop thinking about...", sortOrder: 12 },
  { text: "I'm afraid that...", sortOrder: 13 },
  { text: "What if...", sortOrder: 14 },
  { text: "I'm struggling with...", sortOrder: 15 },
  { text: "I am worried that", sortOrder: 16 },
]

async function main() {
  console.log('🌱 Starting seed...')

  // Clear existing worry prompts
  await prisma.worryPrompt.deleteMany({})
  console.log('🧹 Cleared existing worry prompts')

  // Create worry prompts
  for (const prompt of worryPrompts) {
    await prisma.worryPrompt.create({
      data: prompt,
    })
  }
  console.log(`✅ Created ${worryPrompts.length} worry prompts`)

  console.log('🎉 Seed completed successfully!')
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })