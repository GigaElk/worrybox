import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const worryPrompts = [
  { text: "I'm worried about...", sortOrder: 1 },
  { text: "I can't stop thinking about...", sortOrder: 2 },
  { text: "I'm afraid that...", sortOrder: 3 },
  { text: "What if...", sortOrder: 4 },
  { text: "I'm struggling with...", sortOrder: 5 },
  { text: "I am worried that...", sortOrder: 6 },
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