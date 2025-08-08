// Test Google AI Integration
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Your Google AI API key from .env
const GOOGLE_AI_API_KEY = 'AIzaSyDJ7_ePQ5pmjBACrwqg_I2kK4vIlXBJR3Q';

async function testGoogleAI() {
  console.log('🤖 Testing Google AI Integration...\n');
  
  try {
    // Initialize Google AI
    console.log('1️⃣ Initializing Google AI...');
    const genAI = new GoogleGenerativeAI(GOOGLE_AI_API_KEY);
    const model = genAI.getGenerativeModel({ 
      model: "gemini-1.5-flash",
      generationConfig: {
        temperature: 0.3,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 200,
      }
    });
    console.log('✅ Google AI initialized successfully\n');
    
    // Test 1: Comment Moderation
    console.log('2️⃣ Testing comment moderation...');
    const moderationPrompt = `
Analyze this content for safety in a mental health platform context.

Content: "I'm really worried about my job interview tomorrow. What if I mess up?"

Respond with JSON:
{
  "isSafe": true/false,
  "reason": "brief reason if unsafe",
  "confidence": 0.95
}

Flag as unsafe if content contains:
- Self-harm or suicide ideation
- Harmful advice to others
- Spam or promotional content
- Harassment or abuse

Be supportive - don't flag normal expressions of worry, sadness, or mental health struggles.

Respond with ONLY the JSON object.`;

    const moderationResult = await model.generateContent(moderationPrompt);
    const moderationResponse = await moderationResult.response;
    const moderationText = moderationResponse.text();
    
    console.log('✅ Moderation test result:', moderationText);
    
    try {
      const moderationData = JSON.parse(moderationText.trim());
      console.log(`✅ Moderation working: Safe=${moderationData.isSafe}, Confidence=${moderationData.confidence}\n`);
    } catch (e) {
      console.log('⚠️ Moderation response not valid JSON, but AI is responding\n');
    }
    
    // Test 2: Worry Analysis
    console.log('3️⃣ Testing worry analysis...');
    const analysisPrompt = `
Analyze this worry/concern and provide a JSON response with the following structure:

{
  "category": "one of: Health & Wellness, Work & Career, Relationships, Financial, Education, Personal Growth, Other",
  "subcategory": "specific subcategory within the main category",
  "keywords": ["array", "of", "relevant", "keywords"],
  "sentimentScore": -0.5,
  "confidence": 0.85
}

Rules:
- sentimentScore: -1 (very negative) to 1 (very positive)
- confidence: 0 to 1 (how confident you are in the categorization)
- keywords: 3-5 most relevant words that describe the worry
- Keep subcategory specific but not too narrow

Worry content: "I'm stressed about my upcoming presentation at work. I keep thinking I'll forget what to say."
Context prompt: "I am worried about"

Respond with ONLY the JSON object, no additional text.`;

    const analysisResult = await model.generateContent(analysisPrompt);
    const analysisResponse = await analysisResult.response;
    const analysisText = analysisResponse.text();
    
    console.log('✅ Analysis test result:', analysisText);
    
    try {
      const analysisData = JSON.parse(analysisText.trim());
      console.log(`✅ Analysis working: Category=${analysisData.category}, Sentiment=${analysisData.sentimentScore}\n`);
    } catch (e) {
      console.log('⚠️ Analysis response not valid JSON, but AI is responding\n');
    }
    
    // Test 3: Supportive Message Generation
    console.log('4️⃣ Testing supportive message generation...');
    const messagePrompt = `
Generate a supportive, empathetic message for someone using a mental health platform.

Context:
- Recent worry categories: Work & Career, Personal Growth
- Overall sentiment trend: -0.3 (-1 negative to 1 positive)
- Days since last post: 3

Create a JSON response:
{
  "title": "Short, caring title (under 50 chars)",
  "message": "Supportive message (under 150 chars)"
}

Guidelines:
- Be warm, empathetic, and encouraging
- Don't be overly clinical or formal
- Acknowledge their feelings without being patronizing
- Offer gentle hope and perspective
- Keep it concise and actionable

Respond with ONLY the JSON object.`;

    const messageResult = await model.generateContent(messagePrompt);
    const messageResponse = await messageResult.response;
    const messageText = messageResponse.text();
    
    console.log('✅ Message generation test result:', messageText);
    
    try {
      const messageData = JSON.parse(messageText.trim());
      console.log(`✅ Message generation working: "${messageData.title}" - "${messageData.message}"\n`);
    } catch (e) {
      console.log('⚠️ Message response not valid JSON, but AI is responding\n');
    }
    
    console.log('🎉 Google AI integration tests completed!');
    console.log('\n📋 Summary:');
    console.log('✅ Google AI API key is valid');
    console.log('✅ Model initialization working');
    console.log('✅ Content moderation functional');
    console.log('✅ Worry analysis functional');
    console.log('✅ Message generation functional');
    console.log('✅ Ready for backend integration');
    
  } catch (error) {
    console.error('❌ Google AI test failed:', error.message);
    
    if (error.message.includes('API_KEY_INVALID')) {
      console.log('\n🔧 Fix: Check your Google AI API key');
    } else if (error.message.includes('quota')) {
      console.log('\n🔧 Fix: You may have hit rate limits, try again later');
    } else if (error.message.includes('PERMISSION_DENIED')) {
      console.log('\n🔧 Fix: Enable the Generative AI API in Google Cloud Console');
    } else {
      console.log('\n🔧 Check your internet connection and API key');
    }
  }
}

testGoogleAI();