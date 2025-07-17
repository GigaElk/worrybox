export interface ModerationResult {
  status: 'approved' | 'flagged' | 'rejected' | 'pending';
  score: number; // 0-1, where 1 is most toxic
  reasons?: string[];
  confidence: number; // 0-1, confidence in the result
}

export interface ModerationConfig {
  enabled: boolean;
  toxicityThreshold: number; // 0-1, above this is flagged
  rejectThreshold: number; // 0-1, above this is rejected
  autoApproveThreshold: number; // 0-1, below this is auto-approved
  fallbackToRules: boolean; // Use rule-based filtering if AI fails
}

export class AIModerationService {
  private config: ModerationConfig;

  constructor(config?: Partial<ModerationConfig>) {
    this.config = {
      enabled: process.env.AI_MODERATION_ENABLED === 'true',
      toxicityThreshold: parseFloat(process.env.AI_TOXICITY_THRESHOLD || '0.7'),
      rejectThreshold: parseFloat(process.env.AI_REJECT_THRESHOLD || '0.9'),
      autoApproveThreshold: parseFloat(process.env.AI_AUTO_APPROVE_THRESHOLD || '0.3'),
      fallbackToRules: true,
      ...config
    };
  }

  /**
   * Moderate a comment using AI sentiment analysis
   * Currently returns placeholder results - will be replaced with actual AI integration
   */
  async moderateComment(content: string, context?: {
    userId?: string;
    postId?: string;
    parentCommentId?: string;
  }): Promise<ModerationResult> {
    try {
      // If AI moderation is disabled, use rule-based fallback
      if (!this.config.enabled) {
        return this.fallbackModeration(content);
      }

      // TODO: Replace with actual OpenAI API call
      const aiResult = await this.callAIModerationAPI(content, context);
      
      // If AI call fails, use fallback
      if (!aiResult) {
        console.warn('AI moderation failed, using fallback rules');
        return this.fallbackModeration(content);
      }

      return aiResult;
    } catch (error) {
      console.error('AI moderation error:', error);
      
      // Always fallback to rule-based moderation on error
      if (this.config.fallbackToRules) {
        return this.fallbackModeration(content);
      }
      
      // If no fallback, default to pending for manual review
      return {
        status: 'pending',
        score: 0.5,
        confidence: 0,
        reasons: ['AI moderation unavailable']
      };
    }
  }

  /**
   * Placeholder for actual AI API call
   * TODO: Implement OpenAI moderation API integration
   */
  private async callAIModerationAPI(content: string, context?: any): Promise<ModerationResult | null> {
    // Simulate AI processing delay
    await new Promise(resolve => setTimeout(resolve, 100));

    // TODO: Replace with actual OpenAI API call
    // Example implementation:
    /*
    const response = await openai.moderations.create({
      input: content,
    });
    
    const result = response.results[0];
    const score = Math.max(...Object.values(result.category_scores));
    
    return {
      status: this.determineStatus(score),
      score,
      confidence: 0.9,
      reasons: this.extractReasons(result.categories)
    };
    */

    // For now, return null to trigger fallback
    return null;
  }

  /**
   * Rule-based moderation fallback
   * Simple keyword and pattern matching
   */
  private fallbackModeration(content: string): ModerationResult {
    const lowerContent = content.toLowerCase();
    
    // Define harmful patterns and keywords
    const severePatterns = [
      /\b(kill\s+yourself|kys)\b/i,
      /\b(suicide|self\s*harm)\b/i,
      /\b(die|death)\s+(threat|wish)/i,
    ];

    const moderatePatterns = [
      /\b(stupid|idiot|moron|dumb)\b/i,
      /\b(hate|despise)\s+you\b/i,
      /\b(shut\s+up|stfu)\b/i,
    ];

    const spamPatterns = [
      /(.)\1{10,}/, // Repeated characters
      /https?:\/\/[^\s]+/gi, // Multiple URLs
    ];

    // Check for severe violations
    for (const pattern of severePatterns) {
      if (pattern.test(content)) {
        return {
          status: 'rejected',
          score: 0.95,
          confidence: 0.8,
          reasons: ['Severe harmful content detected']
        };
      }
    }

    // Check for moderate violations
    let flagCount = 0;
    const reasons: string[] = [];

    for (const pattern of moderatePatterns) {
      if (pattern.test(content)) {
        flagCount++;
        reasons.push('Potentially harmful language');
      }
    }

    for (const pattern of spamPatterns) {
      if (pattern.test(content)) {
        flagCount++;
        reasons.push('Spam-like content');
      }
    }

    // Determine status based on flag count
    if (flagCount >= 2) {
      return {
        status: 'flagged',
        score: 0.75,
        confidence: 0.6,
        reasons
      };
    } else if (flagCount === 1) {
      return {
        status: 'flagged',
        score: 0.6,
        confidence: 0.5,
        reasons
      };
    }

    // Check for supportive language (auto-approve)
    const supportivePatterns = [
      /\b(support|help|care|love|hope)\b/i,
      /\b(you('re|\s+are)\s+(strong|brave|amazing))\b/i,
      /\b(here\s+for\s+you|thinking\s+of\s+you)\b/i,
    ];

    for (const pattern of supportivePatterns) {
      if (pattern.test(content)) {
        return {
          status: 'approved',
          score: 0.1,
          confidence: 0.7,
          reasons: ['Supportive content detected']
        };
      }
    }

    // Default to approved for neutral content
    return {
      status: 'approved',
      score: 0.2,
      confidence: 0.5,
      reasons: ['No harmful content detected']
    };
  }

  /**
   * Batch moderate multiple comments
   */
  async moderateComments(comments: Array<{
    id: string;
    content: string;
    context?: any;
  }>): Promise<Array<{
    id: string;
    result: ModerationResult;
  }>> {
    const results = await Promise.all(
      comments.map(async (comment) => ({
        id: comment.id,
        result: await this.moderateComment(comment.content, comment.context)
      }))
    );

    return results;
  }

  /**
   * Get moderation statistics
   */
  async getModerationStats(timeframe: 'day' | 'week' | 'month' = 'day'): Promise<{
    total: number;
    approved: number;
    flagged: number;
    rejected: number;
    pending: number;
    averageScore: number;
  }> {
    // TODO: Implement actual database queries for stats
    // This is a placeholder implementation
    return {
      total: 0,
      approved: 0,
      flagged: 0,
      rejected: 0,
      pending: 0,
      averageScore: 0
    };
  }

  /**
   * Update moderation configuration
   */
  updateConfig(newConfig: Partial<ModerationConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Get current configuration
   */
  getConfig(): ModerationConfig {
    return { ...this.config };
  }
}