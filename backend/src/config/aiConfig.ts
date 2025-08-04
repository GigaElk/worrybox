/**
 * AI Configuration - Handles missing API keys gracefully
 */

export const AI_CONFIG = {
  // Check if AI features are available
  isEnabled: !!process.env.OPENAI_API_KEY,
  
  // Fallback responses when AI is disabled
  fallbackResponses: {
    sentiment: 'neutral',
    category: 'general',
    similarityScore: 0.5,
    moderationResult: 'approved',
    exerciseRecommendation: 'Take a few deep breaths and focus on the present moment.',
  },
  
  // Mock AI responses for development/MVP
  mockMode: process.env.NODE_ENV === 'development' || !process.env.OPENAI_API_KEY,
};

// Mock AI service for when API key is not available
export class MockAIService {
  static async analyzeSentiment(text: string) {
    console.log('🤖 Mock AI: Analyzing sentiment (AI disabled)');
    return {
      sentiment: 'neutral',
      confidence: 0.7,
      categories: ['general'],
    };
  }

  static async moderateContent(text: string) {
    console.log('🤖 Mock AI: Moderating content (AI disabled)');
    // Simple keyword-based moderation as fallback
    const flaggedWords = ['spam', 'abuse', 'hate'];
    const isFlagged = flaggedWords.some(word => 
      text.toLowerCase().includes(word)
    );
    
    return {
      flagged: isFlagged,
      reason: isFlagged ? 'keyword_match' : null,
      confidence: 0.8,
    };
  }

  static async findSimilarWorries(text: string) {
    console.log('🤖 Mock AI: Finding similar worries (AI disabled)');
    // Simple text matching as fallback
    return {
      similarCount: Math.floor(Math.random() * 10) + 1,
      categories: ['general', 'personal'],
    };
  }

  static async recommendExercise(worryText: string) {
    console.log('🤖 Mock AI: Recommending exercise (AI disabled)');
    const exercises = [
      'Take 5 deep breaths, counting slowly',
      'Write down 3 things you\'re grateful for',
      'Go for a 10-minute walk',
      'Practice the 5-4-3-2-1 grounding technique',
      'Do some gentle stretching',
    ];
    
    return exercises[Math.floor(Math.random() * exercises.length)];
  }
}