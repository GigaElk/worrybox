import { PrismaClient } from '@prisma/client';
import { stringToArray } from '../utils/arrayHelpers';

const prisma = new PrismaClient();

export interface WorryAnalysisResult {
  category: string;
  subcategory?: string;
  sentimentScore: number; // -1 to 1, where -1 is most negative
  keywords: string[];
  similarWorryCount: number;
  confidence: number; // 0-1, confidence in the analysis
}

export interface SimilarWorry {
  id: string;
  shortContent: string;
  category: string;
  subcategory?: string;
  similarity: number; // 0-1 similarity score
  anonymousCount: number;
}

export interface WorryCategory {
  name: string;
  description: string;
  subcategories: string[];
  keywords: string[];
}

export class WorryAnalysisService {
  private static instance: WorryAnalysisService;
  
  // Predefined worry categories for fallback analysis
  private readonly worryCategories: WorryCategory[] = [
    {
      name: 'Health & Wellness',
      description: 'Physical and mental health concerns',
      subcategories: ['Physical Health', 'Mental Health', 'Medical Procedures', 'Fitness'],
      keywords: ['health', 'sick', 'pain', 'doctor', 'hospital', 'medicine', 'anxiety', 'depression', 'stress', 'therapy']
    },
    {
      name: 'Relationships',
      description: 'Family, friends, romantic relationships',
      subcategories: ['Family', 'Friends', 'Romantic', 'Social'],
      keywords: ['family', 'friend', 'relationship', 'love', 'partner', 'marriage', 'divorce', 'breakup', 'social', 'lonely']
    },
    {
      name: 'Work & Career',
      description: 'Job, career, professional concerns',
      subcategories: ['Job Security', 'Career Growth', 'Workplace Issues', 'Performance'],
      keywords: ['work', 'job', 'career', 'boss', 'colleague', 'promotion', 'salary', 'interview', 'unemployment', 'office']
    },
    {
      name: 'Financial',
      description: 'Money, debt, financial security',
      subcategories: ['Debt', 'Savings', 'Income', 'Expenses'],
      keywords: ['money', 'debt', 'loan', 'mortgage', 'rent', 'bills', 'budget', 'savings', 'financial', 'broke']
    },
    {
      name: 'Education',
      description: 'School, studies, academic performance',
      subcategories: ['Exams', 'Grades', 'School Life', 'Future Plans'],
      keywords: ['school', 'exam', 'test', 'grade', 'study', 'college', 'university', 'homework', 'teacher', 'student']
    },
    {
      name: 'Future & Life Changes',
      description: 'Uncertainty about the future, major life changes',
      subcategories: ['Life Transitions', 'Decision Making', 'Uncertainty', 'Goals'],
      keywords: ['future', 'change', 'decision', 'choice', 'uncertain', 'scared', 'unknown', 'plan', 'goal', 'direction']
    },
    {
      name: 'Personal Growth',
      description: 'Self-improvement, identity, personal development',
      subcategories: ['Self-Esteem', 'Identity', 'Habits', 'Skills'],
      keywords: ['confidence', 'self', 'identity', 'improve', 'habit', 'skill', 'growth', 'change', 'better', 'personal']
    },
    {
      name: 'Other',
      description: 'General concerns not fitting other categories',
      subcategories: ['General', 'Miscellaneous'],
      keywords: []
    }
  ];

  private constructor() {}

  public static getInstance(): WorryAnalysisService {
    if (!WorryAnalysisService.instance) {
      WorryAnalysisService.instance = new WorryAnalysisService();
    }
    return WorryAnalysisService.instance;
  }

  /**
   * Analyze a worry post using AI or fallback to rule-based analysis
   */
  async analyzeWorry(postId: string, content: string, prompt: string): Promise<WorryAnalysisResult> {
    try {
      // Try AI analysis first
      const aiResult = await this.performAIAnalysis(content, prompt);
      if (aiResult) {
        // Save analysis to database
        await this.saveAnalysis(postId, aiResult);
        return aiResult;
      }
    } catch (error) {
      console.warn('AI worry analysis failed, falling back to rule-based:', error);
    }

    // Fallback to rule-based analysis
    const fallbackResult = await this.performRuleBasedAnalysis(content, prompt);
    await this.saveAnalysis(postId, fallbackResult);
    return fallbackResult;
  }

  /**
   * AI-powered worry analysis (gracefully handles missing OpenAI)
   */
  private async performAIAnalysis(content: string, prompt: string): Promise<WorryAnalysisResult | null> {
    // Check if AI is available
    if (!process.env.OPENAI_API_KEY) {
      console.log('🤖 AI analysis disabled - using fallback analysis');
      return this.getFallbackAnalysis(content);
    }

    try {
      // TODO: Integrate with OpenAI API for advanced analysis when available
      console.log('🤖 AI worry analysis would analyze:', content.substring(0, 50) + '...');
      
      // Placeholder for actual OpenAI integration
      // This would use GPT to categorize worries, extract keywords, and analyze sentiment
      const mockAIResult: WorryAnalysisResult = {
        category: 'Health & Wellness',
        subcategory: 'Mental Health',
        sentimentScore: -0.3,
        keywords: ['anxiety', 'stress', 'worried'],
        similarWorryCount: await this.calculateSimilarWorryCount('Health & Wellness', ['anxiety', 'stress']),
        confidence: 0.95
      };
      
      return mockAIResult;
    } catch (error) {
      console.error('AI analysis failed, using fallback:', error);
      return this.getFallbackAnalysis(content);
    }
  }

  /**
   * Fallback analysis when AI is not available
   */
  private async getFallbackAnalysis(content: string): Promise<WorryAnalysisResult> {
    // Simple keyword-based categorization
    const categories = {
      'Health & Wellness': ['health', 'sick', 'pain', 'tired', 'anxiety', 'stress', 'worried', 'depression'],
      'Work & Career': ['work', 'job', 'career', 'boss', 'interview', 'promotion', 'salary', 'unemployed'],
      'Relationships': ['relationship', 'family', 'friend', 'partner', 'love', 'breakup', 'marriage', 'dating'],
      'Financial': ['money', 'debt', 'bills', 'budget', 'expensive', 'poor', 'rich', 'savings'],
      'Education': ['school', 'study', 'exam', 'grade', 'college', 'university', 'homework', 'test'],
      'Personal Growth': ['future', 'goals', 'dreams', 'change', 'improve', 'better', 'growth', 'development']
    };

    const lowerContent = content.toLowerCase();
    let bestCategory = 'General';
    let matchCount = 0;

    // Find best matching category
    for (const [category, keywords] of Object.entries(categories)) {
      const matches = keywords.filter(keyword => lowerContent.includes(keyword)).length;
      if (matches > matchCount) {
        matchCount = matches;
        bestCategory = category;
      }
    }

    // Extract simple keywords (words longer than 3 characters)
    const words = content.toLowerCase().match(/\b\w{4,}\b/g) || [];
    const keywords = [...new Set(words)].slice(0, 5); // Top 5 unique keywords

    // Simple sentiment based on negative/positive words
    const negativeWords = ['worried', 'anxious', 'scared', 'sad', 'angry', 'frustrated', 'stressed'];
    const positiveWords = ['happy', 'excited', 'grateful', 'hopeful', 'confident', 'proud'];
    
    const negativeCount = negativeWords.filter(word => lowerContent.includes(word)).length;
    const positiveCount = positiveWords.filter(word => lowerContent.includes(word)).length;
    const sentimentScore = (positiveCount - negativeCount) / Math.max(1, positiveCount + negativeCount);

    return {
      category: bestCategory,
      subcategory: 'General',
      sentimentScore: sentimentScore,
      keywords: keywords,
      similarWorryCount: await this.calculateSimilarWorryCount(bestCategory, keywords),
      confidence: 0.6 // Lower confidence for fallback analysis
    };
  }

  /**
   * Rule-based worry analysis fallback
   */
  private async performRuleBasedAnalysis(content: string, prompt: string): Promise<WorryAnalysisResult> {
    const lowerContent = (content + ' ' + prompt).toLowerCase();
    let bestMatch = this.worryCategories[this.worryCategories.length - 1]; // Default to "Other"
    let bestScore = 0;
    let matchedKeywords: string[] = [];

    // Find best matching category based on keywords
    for (const category of this.worryCategories) {
      if (category.keywords.length === 0) continue; // Skip "Other" category in matching

      const matches = category.keywords.filter(keyword => 
        lowerContent.includes(keyword.toLowerCase())
      );

      const score = matches.length / category.keywords.length;
      if (score > bestScore) {
        bestScore = score;
        bestMatch = category;
        matchedKeywords = matches;
      }
    }

    // Determine subcategory based on specific keywords
    let subcategory: string | undefined;
    if (bestMatch.subcategories.length > 0) {
      // Simple heuristic to pick subcategory
      subcategory = bestMatch.subcategories[0]; // Default to first subcategory
      
      // More specific subcategory matching could be added here
      if (bestMatch.name === 'Health & Wellness') {
        if (lowerContent.includes('anxiety') || lowerContent.includes('depression') || lowerContent.includes('stress')) {
          subcategory = 'Mental Health';
        } else if (lowerContent.includes('doctor') || lowerContent.includes('hospital') || lowerContent.includes('sick')) {
          subcategory = 'Physical Health';
        }
      }
    }

    // Calculate sentiment score based on negative/positive words
    const sentimentScore = this.calculateSentimentScore(lowerContent);

    // Extract relevant keywords from content
    const extractedKeywords = this.extractKeywords(lowerContent, matchedKeywords);

    // Calculate similar worry count
    const similarWorryCount = await this.calculateSimilarWorryCount(bestMatch.name, extractedKeywords);

    return {
      category: bestMatch.name,
      subcategory,
      sentimentScore,
      keywords: extractedKeywords,
      similarWorryCount,
      confidence: bestScore > 0 ? 0.7 : 0.3 // Lower confidence for rule-based
    };
  }

  /**
   * Calculate sentiment score using simple word-based analysis
   */
  private calculateSentimentScore(content: string): number {
    const negativeWords = [
      'worried', 'anxious', 'scared', 'afraid', 'terrified', 'panic', 'stress', 'overwhelmed',
      'depressed', 'sad', 'hopeless', 'desperate', 'terrible', 'awful', 'horrible', 'bad',
      'hate', 'angry', 'frustrated', 'upset', 'disappointed', 'hurt', 'pain', 'suffering'
    ];

    const positiveWords = [
      'hope', 'optimistic', 'confident', 'happy', 'grateful', 'thankful', 'blessed', 'good',
      'great', 'wonderful', 'amazing', 'excited', 'proud', 'accomplished', 'successful', 'love'
    ];

    let negativeCount = 0;
    let positiveCount = 0;

    negativeWords.forEach(word => {
      if (content.includes(word)) negativeCount++;
    });

    positiveWords.forEach(word => {
      if (content.includes(word)) positiveCount++;
    });

    // Calculate score between -1 and 1
    const totalWords = negativeCount + positiveCount;
    if (totalWords === 0) return 0; // Neutral

    return (positiveCount - negativeCount) / totalWords;
  }

  /**
   * Extract relevant keywords from content
   */
  private extractKeywords(content: string, matchedKeywords: string[]): string[] {
    const words = content.split(/\s+/).filter(word => word.length > 3);
    const commonWords = ['that', 'this', 'with', 'have', 'will', 'been', 'from', 'they', 'know', 'want', 'been', 'good', 'much', 'some', 'time', 'very', 'when', 'come', 'here', 'just', 'like', 'long', 'make', 'many', 'over', 'such', 'take', 'than', 'them', 'well', 'were'];
    
    const relevantWords = words
      .filter(word => !commonWords.includes(word.toLowerCase()))
      .filter(word => word.length > 4)
      .slice(0, 5); // Limit to 5 keywords

    return [...new Set([...matchedKeywords, ...relevantWords])].slice(0, 8);
  }

  /**
   * Calculate how many similar worries exist
   */
  private async calculateSimilarWorryCount(category: string, keywords: string[]): Promise<number> {
    if (keywords.length === 0) return 0;

    try {
      // Count posts in the same category
      const categoryCount = await prisma.worryAnalysis.count({
        where: { category }
      });

      // Count posts with similar keywords (SQL Server string-based approach)
      const keywordMatches = await prisma.worryAnalysis.count({
        where: {
          OR: keywords.map(keyword => ({
            keywords: {
              contains: keyword
            }
          }))
        }
      });

      return Math.max(categoryCount, keywordMatches);
    } catch (error) {
      console.error('Failed to calculate similar worry count:', error);
      return 0;
    }
  }

  /**
   * Save analysis results to database
   */
  private async saveAnalysis(postId: string, analysis: WorryAnalysisResult): Promise<void> {
    try {
      await prisma.worryAnalysis.upsert({
        where: { postId },
        update: {
          category: analysis.category,
          subcategory: analysis.subcategory,
          sentimentScore: analysis.sentimentScore,
          keywords: analysis.keywords,
          similarWorryCount: analysis.similarWorryCount,
          analysisVersion: '1.0',
          updatedAt: new Date()
        },
        create: {
          postId,
          category: analysis.category,
          subcategory: analysis.subcategory,
          sentimentScore: analysis.sentimentScore,
          keywords: analysis.keywords,
          similarWorryCount: analysis.similarWorryCount,
          analysisVersion: '1.0'
        }
      });
    } catch (error) {
      console.error('Failed to save worry analysis:', error);
    }
  }

  /**
   * Find similar worries based on content analysis
   */
  async findSimilarWorries(postId: string, limit = 5): Promise<SimilarWorry[]> {
    try {
      const currentAnalysis = await prisma.worryAnalysis.findUnique({
        where: { postId }
      });

      if (!currentAnalysis) {
        return [];
      }

      // Find posts with similar categories and keywords
      const similarPosts = await prisma.worryAnalysis.findMany({
        where: {
          AND: [
            { postId: { not: postId } }, // Exclude current post
            {
              OR: [
                { category: currentAnalysis.category },
                ...stringToArray(currentAnalysis.keywords).map(keyword => ({
                  keywords: {
                    contains: keyword
                  }
                }))
              ]
            }
          ]
        },
        include: {
          post: {
            select: {
              id: true,
              shortContent: true
            }
          }
        },
        take: limit * 2 // Get more to filter and rank
      });

      // Calculate similarity scores and rank
      const rankedSimilar = similarPosts
        .map(analysis => {
          let similarity = 0;

          // Category match bonus
          if (analysis.category === currentAnalysis.category) {
            similarity += 0.5;
          }

          // Subcategory match bonus
          if (analysis.subcategory && analysis.subcategory === currentAnalysis.subcategory) {
            similarity += 0.3;
          }

          // Keyword overlap
          const keywordOverlap = analysis.keywords.filter(keyword => 
            currentAnalysis.keywords.includes(keyword)
          ).length;
          similarity += (keywordOverlap / Math.max(analysis.keywords.length, currentAnalysis.keywords.length)) * 0.4;

          return {
            id: analysis.post.id,
            shortContent: analysis.post.shortContent,
            category: analysis.category,
            subcategory: analysis.subcategory || undefined,
            similarity,
            anonymousCount: analysis.similarWorryCount
          };
        })
        .filter(item => item.similarity > 0.2) // Minimum similarity threshold
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, limit);

      return rankedSimilar;
    } catch (error) {
      console.error('Failed to find similar worries:', error);
      return [];
    }
  }

  /**
   * Get worry analysis for a post
   */
  async getWorryAnalysis(postId: string): Promise<WorryAnalysisResult | null> {
    try {
      const analysis = await prisma.worryAnalysis.findUnique({
        where: { postId }
      });

      if (!analysis) return null;

      return {
        category: analysis.category,
        subcategory: analysis.subcategory || undefined,
        sentimentScore: analysis.sentimentScore?.toNumber() || 0,
        keywords: analysis.keywords,
        similarWorryCount: analysis.similarWorryCount,
        confidence: 0.8 // Stored analyses have good confidence
      };
    } catch (error) {
      console.error('Failed to get worry analysis:', error);
      return null;
    }
  }

  /**
   * Get worry categories and statistics
   */
  async getWorryCategories(): Promise<{ category: string; count: number; percentage: number }[]> {
    try {
      const categoryStats = await prisma.worryAnalysis.groupBy({
        by: ['category'],
        _count: {
          category: true
        },
        orderBy: {
          _count: {
            category: 'desc'
          }
        }
      });

      const total = categoryStats.reduce((sum, stat) => sum + stat._count.category, 0);

      return categoryStats.map(stat => ({
        category: stat.category,
        count: stat._count.category,
        percentage: total > 0 ? Math.round((stat._count.category / total) * 100) : 0
      }));
    } catch (error) {
      console.error('Failed to get worry categories:', error);
      return [];
    }
  }

  /**
   * Update similar worry counts for all posts (background task)
   */
  async updateSimilarWorryCounts(): Promise<void> {
    try {
      console.log('🔄 Updating similar worry counts...');
      
      const analyses = await prisma.worryAnalysis.findMany({
        select: {
          postId: true,
          category: true,
          keywords: true
        }
      });

      for (const analysis of analyses) {
        const similarCount = await this.calculateSimilarWorryCount(
          analysis.category,
          analysis.keywords
        );

        await prisma.worryAnalysis.update({
          where: { postId: analysis.postId },
          data: { similarWorryCount: similarCount }
        });
      }

      console.log(`✅ Updated similar worry counts for ${analyses.length} posts`);
    } catch (error) {
      console.error('Failed to update similar worry counts:', error);
    }
  }
}