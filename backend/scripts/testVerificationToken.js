/**
 * Test script to verify the new email verification tokens work correctly
 */

const { generateEmailVerificationToken, verifyEmailVerificationToken } = require('../src/utils/jwt');

function testVerificationTokens() {
  try {
    console.log('🧪 Testing email verification tokens...');
    
    const testUserId = 'test-user-123';
    
    // Generate token
    console.log('📝 Generating verification token...');
    const token = generateEmailVerificationToken(testUserId);
    console.log('✅ Token generated:', token.substring(0, 20) + '...');
    
    // Verify token
    console.log('🔍 Verifying token...');
    const { userId } = verifyEmailVerificationToken(token);
    console.log('✅ Token verified! User ID:', userId);
    
    if (userId === testUserId) {
      console.log('🎉 Email verification system is working correctly!');
      console.log('📅 Tokens are valid for 24 hours');
    } else {
      console.error('❌ Token verification failed - user ID mismatch');
    }
    
  } catch (error) {
    console.error('❌ Token test failed:', error.message);
  }
}

testVerificationTokens();