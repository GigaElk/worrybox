import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface WorryResolution {
  id: string;
  postId: string;
  userId: string;
  resolutionStory?: string;
  copingMethods: string[];
  helpfulnessRating?: number; // 1-5
  resolvedAt: string;
  createdAt: string;
  post: {
    id: string;
    shortContent: string;
    longContent?: string;
    worryPrompt: string;
    privacyLevel: string;
    publishedAt?: string;
    createdAt: string;
  };
}

export interface ResolutionStats {
  totalResolved: number;
  totalWorries: number;
  resolutionRate: number;
  averageHelpfulnessRating?: number;
  mostCommonCopingMethods: Array<{
    method: string;
    count: number;
  }>;
  recentResolutions: WorryResolution[];
}

export interface CreateResolutionData {
  resolutionStory?: string;
  copingMethods: string[];
  helpfulnessRating?: number;
}

export class WorryResolutionService {
  private static instance: WorryResolutionService;

  private constructor() {}

  public static getInstance(): WorryResolutionService {
    if (!WorryResolutionService.instance) {
      WorryResolutionService.instance = new WorryResolutionService();
    }
    return WorryResolutionService.instance;
  }

  /**
   * Mark a worry post as resolved
   */
  async resolveWorry(
    userId: string,
    postId: string,
    resolutionData: CreateResolutionData
  ): Promise<WorryResolution> {
    // First, verify that the user owns the post
    const post = await prisma.post.findFirst({
      where: {
        id: postId,
        userId: userId
      }
    });

    if (!post) {
      throw new Error('Post not found or not owned by user');
    }

    // Check if the worry is already resolved
    const existingResolution = await prisma.worryResolution.findUnique({
      where: { postId }
    });

    if (existingResolution) {
      throw new Error('This worry has already been resolved');
    }

    // Create the resolution
    const resolution = await prisma.worryResolution.create({
      data: {
        postId,
        userId,
        resolutionStory: resolutionData.resolutionStory,
        copingMethods: resolutionData.copingMethods,
        helpfulnessRating: resolutionData.helpfulnessRating,
        resolvedAt: new Date()
      },
      include: {
        post: {
          select: {
            id: true,
            shortContent: true,
            longContent: true,
            worryPrompt: true,
            privacyLevel: true,
            publishedAt: true,
            createdAt: true
          }
        }
      }
    });

    return this.formatResolution(resolution);
  }

  /**
   * Update an existing resolution
   */
  async updateResolution(
    userId: string,
    postId: string,
    updateData: Partial<CreateResolutionData>
  ): Promise<WorryResolution> {
    // Verify ownership
    const existingResolution = await prisma.worryResolution.findFirst({
      where: {
        postId,
        userId
      }
    });

    if (!existingResolution) {
      throw new Error('Resolution not found or not owned by user');
    }

    // Update the resolution
    const updatedResolution = await prisma.worryResolution.update({
      where: { id: existingResolution.id },
      data: {
        resolutionStory: updateData.resolutionStory !== undefined ? updateData.resolutionStory : existingResolution.resolutionStory,
        copingMethods: updateData.copingMethods || existingResolution.copingMethods,
        helpfulnessRating: updateData.helpfulnessRating !== undefined ? updateData.helpfulnessRating : existingResolution.helpfulnessRating
      },
      include: {
        post: {
          select: {
            id: true,
            shortContent: true,
            longContent: true,
            worryPrompt: true,
            privacyLevel: true,
            publishedAt: true,
            createdAt: true
          }
        }
      }
    });

    return this.formatResolution(updatedResolution);
  }

  /**
   * Remove resolution (mark worry as unresolved again)
   */
  async unresolveWorry(userId: string, postId: string): Promise<void> {
    // Verify ownership
    const existingResolution = await prisma.worryResolution.findFirst({
      where: {
        postId,
        userId
      }
    });

    if (!existingResolution) {
      throw new Error('Resolution not found or not owned by user');
    }

    // Delete the resolution
    await prisma.worryResolution.delete({
      where: { id: existingResolution.id }
    });
  }

  /**
   * Get a specific resolution by post ID
   */
  async getResolutionByPostId(postId: string, requestingUserId?: string): Promise<WorryResolution | null> {
    const resolution = await prisma.worryResolution.findUnique({
      where: { postId },
      include: {
        post: {
          select: {
            id: true,
            shortContent: true,
            longContent: true,
            worryPrompt: true,
            privacyLevel: true,
            publishedAt: true,
            createdAt: true,
            userId: true
          }
        }
      }
    });

    if (!resolution) {
      return null;
    }

    // Check privacy permissions
    if (!this.canViewResolution(resolution.post, requestingUserId)) {
      return null;
    }

    return this.formatResolution(resolution);
  }

  /**
   * Get all resolved worries for a user
   */
  async getUserResolvedWorries(userId: string, requestingUserId?: string): Promise<WorryResolution[]> {
    // Check if requesting user can view this user's resolutions
    const canViewPrivate = userId === requestingUserId;

    const resolutions = await prisma.worryResolution.findMany({
      where: {
        userId,
        post: canViewPrivate ? undefined : {
          privacyLevel: {
            in: ['public', 'friends'] // TODO: Add friend relationship check for 'friends'
          }
        }
      },
      include: {
        post: {
          select: {
            id: true,
            shortContent: true,
            longContent: true,
            worryPrompt: true,
            privacyLevel: true,
            publishedAt: true,
            createdAt: true
          }
        }
      },
      orderBy: {
        resolvedAt: 'desc'
      }
    });

    return resolutions.map(resolution => this.formatResolution(resolution));
  }

  /**
   * Get resolution statistics for a user
   */
  async getUserResolutionStats(userId: string): Promise<ResolutionStats> {
    // Get total worries count
    const totalWorries = await prisma.post.count({
      where: {
        userId,
        publishedAt: { not: null }
      }
    });

    // Get resolved worries
    const resolvedWorries = await prisma.worryResolution.findMany({
      where: { userId },
      include: {
        post: {
          select: {
            id: true,
            shortContent: true,
            longContent: true,
            worryPrompt: true,
            privacyLevel: true,
            publishedAt: true,
            createdAt: true
          }
        }
      },
      orderBy: {
        resolvedAt: 'desc'
      }
    });

    const totalResolved = resolvedWorries.length;
    const resolutionRate = totalWorries > 0 ? (totalResolved / totalWorries) * 100 : 0;

    // Calculate average helpfulness rating
    const ratingsWithValues = resolvedWorries.filter(r => r.helpfulnessRating !== null);
    const averageHelpfulnessRating = ratingsWithValues.length > 0
      ? ratingsWithValues.reduce((sum, r) => sum + (r.helpfulnessRating || 0), 0) / ratingsWithValues.length
      : undefined;

    // Calculate most common coping methods
    const copingMethodCounts = new Map<string, number>();
    resolvedWorries.forEach(resolution => {
      resolution.copingMethods.forEach(method => {
        copingMethodCounts.set(method, (copingMethodCounts.get(method) || 0) + 1);
      });
    });

    const mostCommonCopingMethods = Array.from(copingMethodCounts.entries())
      .map(([method, count]) => ({ method, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Get recent resolutions (last 5)
    const recentResolutions = resolvedWorries
      .slice(0, 5)
      .map(resolution => this.formatResolution(resolution));

    return {
      totalResolved,
      totalWorries,
      resolutionRate: Math.round(resolutionRate * 100) / 100,
      averageHelpfulnessRating: averageHelpfulnessRating ? Math.round(averageHelpfulnessRating * 100) / 100 : undefined,
      mostCommonCopingMethods,
      recentResolutions
    };
  }

  /**
   * Get public resolution stories for inspiration
   */
  async getPublicResolutionStories(limit: number = 10, category?: string): Promise<WorryResolution[]> {
    const whereClause: any = {
      post: {
        privacyLevel: 'public'
      },
      resolutionStory: {
        not: null
      }
    };

    // Add category filter if provided
    if (category) {
      whereClause.post.worryAnalysis = {
        category: category
      };
    }

    const resolutions = await prisma.worryResolution.findMany({
      where: whereClause,
      include: {
        post: {
          select: {
            id: true,
            shortContent: true,
            longContent: true,
            worryPrompt: true,
            privacyLevel: true,
            publishedAt: true,
            createdAt: true,
            worryAnalysis: {
              select: {
                category: true,
                subcategory: true
              }
            }
          }
        }
      },
      orderBy: {
        resolvedAt: 'desc'
      },
      take: limit
    });

    return resolutions.map(resolution => this.formatResolution(resolution));
  }

  /**
   * Get resolution suggestions based on similar worries
   */
  async getResolutionSuggestions(postId: string, limit: number = 5): Promise<WorryResolution[]> {
    // First, get the worry analysis for the current post
    const currentPost = await prisma.post.findUnique({
      where: { id: postId },
      include: {
        worryAnalysis: true
      }
    });

    if (!currentPost || !currentPost.worryAnalysis) {
      return [];
    }

    // Find similar resolved worries
    const similarResolutions = await prisma.worryResolution.findMany({
      where: {
        post: {
          privacyLevel: 'public',
          worryAnalysis: {
            category: currentPost.worryAnalysis.category
          }
        },
        resolutionStory: {
          not: null
        }
      },
      include: {
        post: {
          select: {
            id: true,
            shortContent: true,
            longContent: true,
            worryPrompt: true,
            privacyLevel: true,
            publishedAt: true,
            createdAt: true,
            worryAnalysis: {
              select: {
                category: true,
                subcategory: true
              }
            }
          }
        }
      },
      orderBy: {
        helpfulnessRating: 'desc'
      },
      take: limit
    });

    return similarResolutions.map(resolution => this.formatResolution(resolution));
  }

  /**
   * Check if a user can view a resolution based on privacy settings
   */
  private canViewResolution(post: any, requestingUserId?: string): boolean {
    if (post.privacyLevel === 'public') {
      return true;
    }

    if (post.privacyLevel === 'private') {
      return post.userId === requestingUserId;
    }

    if (post.privacyLevel === 'friends') {
      // TODO: Implement friend relationship check
      // For now, only allow the owner to view
      return post.userId === requestingUserId;
    }

    return false;
  }

  /**
   * Format resolution data for API response
   */
  private formatResolution(resolution: any): WorryResolution {
    return {
      id: resolution.id,
      postId: resolution.postId,
      userId: resolution.userId,
      resolutionStory: resolution.resolutionStory,
      copingMethods: resolution.copingMethods,
      helpfulnessRating: resolution.helpfulnessRating,
      resolvedAt: resolution.resolvedAt.toISOString(),
      createdAt: resolution.createdAt.toISOString(),
      post: {
        id: resolution.post.id,
        shortContent: resolution.post.shortContent,
        longContent: resolution.post.longContent,
        worryPrompt: resolution.post.worryPrompt,
        privacyLevel: resolution.post.privacyLevel,
        publishedAt: resolution.post.publishedAt?.toISOString(),
        createdAt: resolution.post.createdAt.toISOString()
      }
    };
  }
}