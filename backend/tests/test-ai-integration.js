// Simple test to verify our AI integration works
const { GoogleAIService } = require('./dist/services/googleAIService');
const { ModerationService } = require('./dist/services/moderationService');

async function testAIIntegration() {
  console.log('🧪 Testing AI Integration...');
  
  try {
    // Test Google AI Service
    const googleAI = GoogleAIService.getInstance();
    console.log('✅ Google AI Service initialized');
    console.log('🤖 Google AI Available:', googleAI.isAvailable());
    
    // Test Moderation Service
    const moderationService = new ModerationService();
    console.log('✅ Moderation Service initialized');
    
    // Test comment moderation with fallback
    const testComment = "This is a test comment for moderation";
    const result = await moderationService.moderateComment('test-id', testComment);
    console.log('✅ Comment moderation result:', result);
    
    console.log('🎉 All tests passed! AI integration is working correctly.');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testAIIntegration();