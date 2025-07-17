import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function seedGuidedExercises() {
  console.log('Seeding guided exercises...')

  // Create breathing exercises
  const breathingExercise = await prisma.exercise.create({
    data: {
      title: '4-7-8 Breathing Technique',
      description: 'A simple yet powerful breathing exercise that helps reduce anxiety and promote relaxation. This technique involves inhaling for 4 counts, holding for 7 counts, and exhaling for 8 counts.',
      category: 'breathing',
      duration: 5,
      difficulty: 'beginner',
      tags: ['anxiety', 'relaxation', 'stress', 'sleep'],
      steps: {
        create: [
          {
            order: 1,
            title: 'Find a Comfortable Position',
            content: 'Sit or lie down in a comfortable position. Place one hand on your chest and the other on your belly. Close your eyes or soften your gaze.',
            duration: 30
          },
          {
            order: 2,
            title: 'Exhale Completely',
            content: 'Start by exhaling completely through your mouth, making a whoosh sound. This empties your lungs and prepares you for the breathing pattern.',
            duration: 15
          },
          {
            order: 3,
            title: 'Inhale for 4 Counts',
            content: 'Close your mouth and inhale quietly through your nose for 4 counts. Feel your belly rise as you breathe in deeply.',
            duration: 60
          },
          {
            order: 4,
            title: 'Hold for 7 Counts',
            content: 'Hold your breath for 7 counts. Try to stay relaxed during this time. If 7 counts feels too long, start with what feels comfortable.',
            duration: 60
          },
          {
            order: 5,
            title: 'Exhale for 8 Counts',
            content: 'Exhale completely through your mouth for 8 counts, making a whoosh sound. This is the most important part of the pattern.',
            duration: 60
          },
          {
            order: 6,
            title: 'Repeat the Cycle',
            content: 'Repeat this cycle 3-4 times. With practice, you can increase the number of cycles. Notice how your body feels more relaxed with each breath.',
            duration: 180
          }
        ]
      }
    }
  })

  const mindfulnessExercise = await prisma.exercise.create({
    data: {
      title: 'Body Scan Meditation',
      description: 'A mindfulness exercise that helps you connect with your body and release tension. This practice involves systematically focusing on different parts of your body.',
      category: 'mindfulness',
      duration: 15,
      difficulty: 'beginner',
      tags: ['mindfulness', 'relaxation', 'body awareness', 'tension relief'],
      steps: {
        create: [
          {
            order: 1,
            title: 'Get Comfortable',
            content: 'Lie down on your back or sit in a comfortable chair. Close your eyes and take a few deep breaths to settle in.',
            duration: 60
          },
          {
            order: 2,
            title: 'Start with Your Toes',
            content: 'Focus your attention on your toes. Notice any sensations - warmth, coolness, tingling, or tension. Don\'t try to change anything, just observe.',
            duration: 120
          },
          {
            order: 3,
            title: 'Move Up Your Legs',
            content: 'Slowly move your attention up through your feet, ankles, calves, and thighs. Spend time with each area, noticing what you feel.',
            duration: 180
          },
          {
            order: 4,
            title: 'Scan Your Torso',
            content: 'Focus on your hips, lower back, belly, chest, and upper back. Notice areas of tension and breathe into them gently.',
            duration: 180
          },
          {
            order: 5,
            title: 'Check Your Arms and Hands',
            content: 'Move your attention to your shoulders, arms, hands, and fingers. Notice any sensations without judgment.',
            duration: 120
          },
          {
            order: 6,
            title: 'Finish with Your Head',
            content: 'Focus on your neck, face, and head. Notice your jaw, eyes, and forehead. Allow any tension to soften.',
            duration: 120
          },
          {
            order: 7,
            title: 'Whole Body Awareness',
            content: 'Take a moment to feel your whole body as one connected unit. Notice the overall sense of relaxation and peace.',
            duration: 120
          }
        ]
      }
    }
  })

  const cognitiveExercise = await prisma.exercise.create({
    data: {
      title: 'Worry Time Technique',
      description: 'A cognitive behavioral technique that helps you manage worrying thoughts by scheduling specific time for them, reducing their impact on your daily life.',
      category: 'cognitive',
      duration: 10,
      difficulty: 'intermediate',
      tags: ['worry', 'anxiety', 'cognitive', 'time management'],
      steps: {
        create: [
          {
            order: 1,
            title: 'Schedule Your Worry Time',
            content: 'Choose a specific 15-20 minute time slot each day for worrying. This should be the same time daily, but not close to bedtime.',
            duration: 60
          },
          {
            order: 2,
            title: 'Write Down Your Worries',
            content: 'Throughout the day, when worries arise, write them down on a piece of paper or in a worry journal. Tell yourself you\'ll deal with them during worry time.',
            duration: 120
          },
          {
            order: 3,
            title: 'Postpone the Worry',
            content: 'When a worry comes up outside of worry time, acknowledge it and say "I\'ll think about this during my worry time." Then redirect your attention to the present moment.',
            duration: 60
          },
          {
            order: 4,
            title: 'Review Your Worries',
            content: 'During your scheduled worry time, review your list. You may find that some worries no longer seem important or have resolved themselves.',
            duration: 180
          },
          {
            order: 5,
            title: 'Problem-Solve or Accept',
            content: 'For each remaining worry, ask: "Can I do something about this?" If yes, make an action plan. If no, practice accepting uncertainty.',
            duration: 240
          },
          {
            order: 6,
            title: 'End Worry Time',
            content: 'When your worry time is over, stop thinking about worries. Engage in a pleasant activity to transition your mind to something positive.',
            duration: 60
          }
        ]
      }
    }
  })

  console.log('Created exercises:', {
    breathing: breathingExercise.id,
    mindfulness: mindfulnessExercise.id,
    cognitive: cognitiveExercise.id
  })
}

export async function seedCopingTechniques() {
  console.log('Seeding coping techniques...')

  const groundingTechnique = await prisma.copingTechnique.create({
    data: {
      title: '5-4-3-2-1 Grounding Technique',
      description: 'A sensory-based grounding technique that helps bring you back to the present moment when feeling overwhelmed or anxious.',
      category: 'grounding',
      instructions: `This technique uses your five senses to ground you in the present moment:

**5 things you can SEE**: Look around and name 5 things you can see. Really focus on them - their colors, shapes, textures.

**4 things you can TOUCH**: Notice 4 things you can feel - your clothes, the temperature, the texture of an object nearby.

**3 things you can HEAR**: Listen carefully and identify 3 sounds around you - maybe traffic, birds, or the hum of electronics.

**2 things you can SMELL**: Take a moment to notice 2 scents in your environment.

**1 thing you can TASTE**: Focus on 1 taste in your mouth, or take a sip of water and really taste it.

Take your time with each step. This technique helps interrupt anxious thoughts and brings your attention to the present moment.`,
      whenToUse: [
        'When feeling overwhelmed or panicked',
        'During anxiety attacks',
        'When your mind is racing with worries',
        'Before important events or meetings',
        'When feeling disconnected or dissociated'
      ],
      effectiveness: 4,
      scienceBasedRating: 5,
      tags: ['grounding', 'anxiety', 'panic', 'mindfulness', 'present moment'],
      resources: {
        create: [
          {
            title: 'Grounding Techniques for Anxiety',
            description: 'Comprehensive guide to various grounding techniques',
            url: 'https://www.healthline.com/health/grounding-techniques',
            type: 'article'
          }
        ]
      }
    }
  })

  const thoughtChallengingTechnique = await prisma.copingTechnique.create({
    data: {
      title: 'Thought Challenging',
      description: 'A cognitive technique that helps you examine and challenge negative or unhelpful thoughts, replacing them with more balanced perspectives.',
      category: 'cognitive',
      instructions: `When you notice a negative or worrying thought, follow these steps:

**1. Identify the thought**: Write down exactly what you're thinking. Be specific.

**2. Examine the evidence**: Ask yourself:
   - What evidence supports this thought?
   - What evidence contradicts it?
   - Am I making assumptions?

**3. Consider alternatives**: Think of other ways to view the situation:
   - What would I tell a friend in this situation?
   - What's the most realistic outcome?
   - What's the best possible outcome?

**4. Check for thinking traps**: Look for patterns like:
   - All-or-nothing thinking
   - Catastrophizing
   - Mind reading
   - Fortune telling

**5. Create a balanced thought**: Develop a more realistic, balanced perspective that considers all the evidence.

**6. Notice the difference**: Pay attention to how the balanced thought makes you feel compared to the original negative thought.`,
      whenToUse: [
        'When stuck in negative thinking patterns',
        'During periods of high worry or anxiety',
        'When facing challenging situations',
        'Before making important decisions',
        'When feeling overwhelmed by catastrophic thoughts'
      ],
      effectiveness: 5,
      scienceBasedRating: 5,
      tags: ['cognitive', 'thoughts', 'CBT', 'negative thinking', 'reframing'],
      resources: {
        create: [
          {
            title: 'Cognitive Behavioral Therapy Techniques',
            description: 'Evidence-based CBT techniques for managing thoughts',
            url: 'https://www.apa.org/ptsd-guideline/patients-and-families/cognitive-behavioral',
            type: 'article'
          },
          {
            title: 'Thought Record Worksheet',
            description: 'Printable worksheet for practicing thought challenging',
            url: 'https://www.psychologytools.com/resource/thought-record/',
            type: 'website'
          }
        ]
      }
    }
  })

  const progressiveRelaxationTechnique = await prisma.copingTechnique.create({
    data: {
      title: 'Progressive Muscle Relaxation',
      description: 'A relaxation technique that involves systematically tensing and then relaxing different muscle groups to reduce physical tension and stress.',
      category: 'relaxation',
      instructions: `Progressive Muscle Relaxation helps you learn to recognize and release physical tension:

**Preparation**: Find a quiet, comfortable place to sit or lie down. Close your eyes and take a few deep breaths.

**The Process**: For each muscle group, follow this pattern:
1. Tense the muscles for 5-7 seconds
2. Release the tension suddenly
3. Relax for 15-20 seconds, noticing the difference
4. Move to the next muscle group

**Muscle Groups (in order)**:
1. **Feet**: Curl your toes and tense your feet
2. **Calves**: Point your toes toward your shins
3. **Thighs**: Tighten your thigh muscles
4. **Glutes**: Squeeze your buttocks
5. **Abdomen**: Tighten your stomach muscles
6. **Hands**: Make fists and squeeze
7. **Arms**: Tense your biceps and forearms
8. **Shoulders**: Raise your shoulders to your ears
9. **Face**: Scrunch your facial muscles
10. **Whole body**: Tense everything for 5 seconds, then release

**Finish**: Take several deep breaths and enjoy the feeling of relaxation throughout your body.`,
      whenToUse: [
        'When feeling physically tense or stressed',
        'Before bedtime to improve sleep',
        'During breaks at work',
        'When experiencing muscle tension from anxiety',
        'As a regular relaxation practice'
      ],
      effectiveness: 4,
      scienceBasedRating: 5,
      tags: ['relaxation', 'muscle tension', 'stress', 'sleep', 'physical'],
      resources: {
        create: [
          {
            title: 'Progressive Muscle Relaxation Audio Guide',
            description: 'Guided audio for progressive muscle relaxation',
            url: 'https://www.anxietycanada.com/sites/default/files/MuscleRelaxation.mp3',
            type: 'audio'
          }
        ]
      }
    }
  })

  console.log('Created coping techniques:', {
    grounding: groundingTechnique.id,
    thoughtChallenging: thoughtChallengingTechnique.id,
    progressiveRelaxation: progressiveRelaxationTechnique.id
  })
}

export async function seedGuidedExercisesAndTechniques() {
  try {
    await seedGuidedExercises()
    await seedCopingTechniques()
    console.log('✅ Guided exercises and coping techniques seeded successfully')
  } catch (error) {
    console.error('❌ Error seeding guided exercises and coping techniques:', error)
    throw error
  }
}