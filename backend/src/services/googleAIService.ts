import { GoogleGenerativeAI } from '@google/generative-ai';
import logger from './logger';

export class GoogleAIService {
  private static instance: GoogleAIService;
  private genAI: GoogleGenerativeAI | null = null;
  private model: any = null;

  private constructor() {
    this.initializeAI();
  }

  public static getInstance(): GoogleAIService {
    if (!GoogleAIService.instance) {
      GoogleAIService.instance = new GoogleAIService();
    }
    return GoogleAIService.instance;
  }

  private initializeAI(): void {
    const apiKey = process.env.GOOGLE_AI_API_KEY;
    
    if (!apiKey) {
      logger.warn('🤖 Google AI API key not found - AI features will use fallback');
      return;
    }

    try {
      this.genAI = new GoogleGenerativeAI(apiKey);
      this.model = this.genAI.getGenerativeModel({ 
        model: "gemini-1.5-flash",
        generationConfig: {
          temperature: 0.3, // Lower temperature for more consistent categorization
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 200, // Keep responses concise
        }
      });
      
      logger.info('✅ Google AI (Gemini) initialized successfully');
    } catch (error) {
      logger.error('❌ Failed to initialize Google AI:', error);
      this.genAI = null;
      this.model = null;
    }
  }

  /**
   * Check if Google AI is available
   */
  public isAvailable(): boolean {
    return this.model !== null;
  }

  /**
   * Analyze worry content and return categorization
   */
  public async analyzeWorryContent(content: string, prompt: string): Promise<{
    category: string;
    subcategory?: string;
    keywords: string[];
    sentimentScore: number;
    confidence: number;
  } | null> {
    if (!this.isAvailable()) {
      logger.warn('🤖 Google AI not available, using fallback analysis');
      return null;
    }

    try {
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

Worry content: "${content}"
Context prompt: "${prompt}"

Respond with ONLY the JSON object, no additional text.`;

      const result = await this.model.generateContent(analysisPrompt);
      const response = await result.response;
      const text = response.text();

      // Parse the JSON response
      const analysis = JSON.parse(text.trim());

      // Validate the response structure
      if (!analysis.category || !Array.isArray(analysis.keywords)) {
        throw new Error('Invalid response structure from Google AI');
      }

      logger.info('✅ Google AI worry analysis completed', {
        category: analysis.category,
        keywordCount: analysis.keywords.length,
        confidence: analysis.confidence
      });

      return analysis;

    } catch (error) {
      logger.error('❌ Google AI analysis failed:', error);
      return null;
    }
  }

  /**
   * Generate supportive message for notifications
   */
  public async generateSupportiveMessage(context: {
    recentCategories: string[];
    sentimentTrend: number;
    daysSinceLastPost: number;
  }): Promise<{ title: string; message: string } | null> {
    if (!this.isAvailable()) {
      return null;
    }

    try {
      const messagePrompt = `
Generate a supportive, empathetic message for someone using a mental health platform.

Context:
- Recent worry categories: ${context.recentCategories.join(', ')}
- Overall sentiment trend: ${context.sentimentTrend} (-1 negative to 1 positive)
- Days since last post: ${context.daysSinceLastPost}

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

      const result = await this.model.generateContent(messagePrompt);
      const response = await result.response;
      const text = response.text();

      const message = JSON.parse(text.trim());

      if (!message.title || !message.message) {
        throw new Error('Invalid message structure from Google AI');
      }

      return message;

    } catch (error) {
      logger.error('❌ Google AI message generation failed:', error);
      return null;
    }
  }

  /**
   * Moderate content for safety
   */
  public async moderateContent(content: string): Promise<{
    isSafe: boolean;
    reason?: string;
    confidence: number;
  } | null> {
    if (!this.isAvailable()) {
      return null;
    }

    try {
      const moderationPrompt = `
Analyze this content for safety in a mental health platform context.

Content: "${content}"

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

      const result = await this.model.generateContent(moderationPrompt);
      const response = await result.response;
      const text = response.text();

      const moderation = JSON.parse(text.trim());

      return {
        isSafe: moderation.isSafe,
        reason: moderation.reason,
        confidence: moderation.confidence || 0.8
      };

    } catch (error) {
      logger.error('❌ Google AI moderation failed:', error);
      return null;
    }
  }
}