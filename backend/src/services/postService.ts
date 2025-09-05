import { PrismaClient } from '@prisma/client';
import { CreatePostRequest, UpdatePostRequest, PostResponse, PostsQuery, PostsResponse, WorryPromptResponse } from '../types/post';

const prisma = new PrismaClient();

export class PostService {
  async createPost(userId: string, data: CreatePostRequest): Promise<PostResponse> {
    const postData = {
      userId,
      shortContent: data.shortContent,
      longContent: data.longContent || null,
      worryPrompt: data.worryPrompt,
      privacyLevel: data.privacyLevel,
      commentsEnabled: data.commentsEnabled !== undefined ? data.commentsEnabled : true,
      isScheduled: data.isScheduled || false,
      scheduledFor: data.scheduledFor ? new Date(data.scheduledFor) : null,
      publishedAt: (!data.isScheduled || !data.scheduledFor) ? new Date() : null,
    };

    const post = await prisma.post.create({
      data: postData,
      include: {
        user: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
          },
        },
      },
    });

    return await this.formatPostResponse(post, userId);
  }

  async updatePost(postId: string, userId: string, data: UpdatePostRequest): Promise<PostResponse> {
    // First check if the post exists and belongs to the user
    const existingPost = await prisma.post.findFirst({
      where: {
        id: postId,
        userId: userId,
      },
    });

    if (!existingPost) {
      throw new Error('Post not found or you do not have permission to edit it');
    }

    const updatedPost = await prisma.post.update({
      where: { id: postId },
      data: {
        shortContent: data.shortContent,
        longContent: data.longContent,
        privacyLevel: data.privacyLevel,
        worryPrompt: data.worryPrompt,
        commentsEnabled: data.commentsEnabled,
        updatedAt: new Date(),
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
          },
        },
      },
    });

    return await this.formatPostResponse(updatedPost, userId);
  }

  async addBlogContent(postId: string, userId: string, longContent: string): Promise<PostResponse> {
    // First check if the post exists and belongs to the user
    const existingPost = await prisma.post.findFirst({
      where: {
        id: postId,
        userId: userId,
      },
    });

    if (!existingPost) {
      throw new Error('Post not found or you do not have permission to edit it');
    }

    const updatedPost = await prisma.post.update({
      where: { id: postId },
      data: {
        longContent: longContent,
        updatedAt: new Date(),
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
          },
        },
      },
    });

    return await this.formatPostResponse(updatedPost, userId);
  }

  async removeBlogContent(postId: string, userId: string): Promise<PostResponse> {
    // First check if the post exists and belongs to the user
    const existingPost = await prisma.post.findFirst({
      where: {
        id: postId,
        userId: userId,
      },
    });

    if (!existingPost) {
      throw new Error('Post not found or you do not have permission to edit it');
    }

    const updatedPost = await prisma.post.update({
      where: { id: postId },
      data: {
        longContent: null,
        updatedAt: new Date(),
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
          },
        },
      },
    });

    return await this.formatPostResponse(updatedPost, userId);
  }

  async deletePost(postId: string, userId: string): Promise<void> {
    // First check if the post exists and belongs to the user
    const existingPost = await prisma.post.findFirst({
      where: {
        id: postId,
        userId: userId,
      },
    });

    if (!existingPost) {
      throw new Error('Post not found or you do not have permission to delete it');
    }

    await prisma.post.delete({
      where: { id: postId },
    });
  }

  async getPost(postId: string, requestingUserId?: string): Promise<PostResponse | null> {
    const post = await prisma.post.findUnique({
      where: { id: postId },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
          },
        },
      },
    });

    if (!post) {
      return null;
    }

    // Check privacy permissions
    if (!(await this.canViewPost(post, requestingUserId))) {
      return null;
    }

    return await this.formatPostResponse(post, requestingUserId);
  }

  async getPosts(query: PostsQuery, requestingUserId?: string): Promise<PostsResponse> {
    const limit = Math.min(query.limit || 20, 50); // Max 50 posts
    const offset = query.offset || 0;

    const whereClause: any = {
      // Only show published posts unless specifically including scheduled
      ...(query.includeScheduled ? {} : { publishedAt: { not: null } }),
    };

    // Filter by user if specified
    if (query.userId) {
      whereClause.userId = query.userId;
    }

    // Filter by privacy level if specified
    if (query.privacyLevel) {
      whereClause.privacyLevel = query.privacyLevel;
    } else {
      // Default to public posts only unless requesting user's own posts
      if (!query.userId || query.userId !== requestingUserId) {
        whereClause.privacyLevel = 'public';
      }
    }

    const [posts, total] = await Promise.all([
      prisma.post.findMany({
        where: whereClause,
        include: {
          user: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatarUrl: true,
            },
          },
        },
        orderBy: [
          { publishedAt: 'desc' },
          { createdAt: 'desc' },
        ],
        take: limit,
        skip: offset,
      }),
      prisma.post.count({
        where: whereClause,
      }),
    ]);

    // Filter posts based on privacy permissions
    const visiblePosts = await Promise.all(
      posts.map(async (post) => {
        const canView = await this.canViewPost(post, requestingUserId);
        return canView ? post : null;
      })
    );
    const filteredPosts = visiblePosts.filter(post => post !== null);

    const formattedPosts = await this.formatMultiplePostResponses(filteredPosts, requestingUserId);

    return {
      posts: formattedPosts,
      total,
      hasMore: offset + posts.length < total,
    };
  }

  async getPersonalizedFeed(userId: string, query: Omit<PostsQuery, 'userId'> = {}): Promise<PostsResponse> {
    const limit = Math.min(query.limit || 20, 50);
    const offset = query.offset || 0;

    // Get users that the current user is following
    const following = await prisma.follow.findMany({
      where: { followerId: userId },
      select: { followingId: true }
    });

    const followingIds = following.map(f => f.followingId);
    
    // Include the user's own posts and posts from people they follow
    const userIds = [userId, ...followingIds];

    const whereClause: any = {
      publishedAt: { not: null },
      userId: { in: userIds },
      OR: [
        // User's own posts (all privacy levels)
        { userId: userId },
        // Public posts from followed users
        { userId: { in: followingIds }, privacyLevel: 'public' },
        // Friends posts from followed users (mutual follows)
        { userId: { in: followingIds }, privacyLevel: 'friends' }
      ]
    };

    const [posts, total] = await Promise.all([
      prisma.post.findMany({
        where: whereClause,
        include: {
          user: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatarUrl: true,
            },
          },
        },
        orderBy: [
          { publishedAt: 'desc' },
          { createdAt: 'desc' },
        ],
        take: limit,
        skip: offset,
      }),
      prisma.post.count({
        where: whereClause,
      }),
    ]);

    const formattedPosts = await this.formatMultiplePostResponses(posts, userId);

    return {
      posts: formattedPosts,
      total,
      hasMore: offset + posts.length < total,
    };
  }

  async getDiscoveryFeed(userId?: string, query: Omit<PostsQuery, 'userId'> = {}): Promise<PostsResponse> {
    const limit = Math.min(query.limit || 20, 50);
    const offset = query.offset || 0;

    let excludeUserIds: string[] = [];
    
    if (userId) {
      // Get users that the current user is already following to exclude from discovery
      const following = await prisma.follow.findMany({
        where: { followerId: userId },
        select: { followingId: true }
      });
      
      excludeUserIds = [userId, ...following.map(f => f.followingId)];
    }

    const whereClause: any = {
      publishedAt: { not: null },
      privacyLevel: 'public', // Only public posts for discovery
      ...(excludeUserIds.length > 0 && { userId: { notIn: excludeUserIds } })
    };

    const [posts, total] = await Promise.all([
      prisma.post.findMany({
        where: whereClause,
        include: {
          user: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatarUrl: true,
            },
          },
        },
        orderBy: [
          { publishedAt: 'desc' },
          { createdAt: 'desc' },
        ],
        take: limit,
        skip: offset,
      }),
      prisma.post.count({
        where: whereClause,
      }),
    ]);

    const formattedPosts = await this.formatMultiplePostResponses(posts, userId);

    return {
      posts: formattedPosts,
      total,
      hasMore: offset + posts.length < total,
    };
  }

  async getUserPosts(userId: string, requestingUserId?: string, query: Omit<PostsQuery, 'userId'> = {}): Promise<PostsResponse> {
    return this.getPosts({ ...query, userId }, requestingUserId);
  }

  private async canViewPost(post: any, requestingUserId?: string): Promise<boolean> {
    // User can always see their own posts
    if (requestingUserId && post.userId === requestingUserId) {
      return true;
    }

    // Public posts are visible to everyone
    if (post.privacyLevel === 'public') {
      return true;
    }

    // Private posts are only visible to the author
    if (post.privacyLevel === 'private') {
      return false;
    }

    // Friends posts - check if users are following each other (mutual follow = friends)
    if (post.privacyLevel === 'friends') {
      if (!requestingUserId) {
        return false;
      }

      // Check if requesting user follows the post author AND post author follows back
      const [userFollowsAuthor, authorFollowsUser] = await Promise.all([
        prisma.follow.findFirst({
          where: {
            followerId: requestingUserId,
            followingId: post.userId
          }
        }),
        prisma.follow.findFirst({
          where: {
            followerId: post.userId,
            followingId: requestingUserId
          }
        })
      ]);

      return !!(userFollowsAuthor && authorFollowsUser);
    }

    return false;
  }

  async getWorryPrompts(): Promise<WorryPromptResponse[]> {
    const prompts = await prisma.worryPrompt.findMany({
      where: {
        isActive: true,
      },
      orderBy: [
        { sortOrder: 'asc' },
        { createdAt: 'asc' },
      ],
    });

    return prompts.map(prompt => ({
      id: prompt.id,
      text: prompt.text,
      isActive: prompt.isActive,
      sortOrder: prompt.sortOrder,
      createdAt: prompt.createdAt.toISOString(),
      updatedAt: prompt.updatedAt.toISOString(),
    }));
  }

  async createWorryPrompt(text: string, sortOrder?: number): Promise<WorryPromptResponse> {
    const prompt = await prisma.worryPrompt.create({
      data: {
        text,
        sortOrder: sortOrder || 0,
      },
    });

    return {
      id: prompt.id,
      text: prompt.text,
      isActive: prompt.isActive,
      sortOrder: prompt.sortOrder,
      createdAt: prompt.createdAt.toISOString(),
      updatedAt: prompt.updatedAt.toISOString(),
    };
  }

  private async formatPostResponse(post: any, requestingUserId?: string): Promise<PostResponse> {
    // Get interaction counts and user status
    const interactionData = await this.getPostInteractionData(post.id, requestingUserId);

    return {
      id: post.id,
      userId: post.userId,
      shortContent: post.shortContent,
      longContent: post.longContent || undefined,
      worryPrompt: post.worryPrompt,
      privacyLevel: post.privacyLevel,
      commentsEnabled: post.commentsEnabled,
      isScheduled: post.isScheduled,
      scheduledFor: post.scheduledFor?.toISOString(),
      publishedAt: post.publishedAt?.toISOString(),
      detectedLanguage: post.detectedLanguage || undefined,
      createdAt: post.createdAt.toISOString(),
      updatedAt: post.updatedAt.toISOString(),
      user: {
        id: post.user.id,
        username: post.user.username,
        displayName: post.user.displayName || undefined,
        avatarUrl: post.user.avatarUrl || undefined,
      },
      ...interactionData,
    };
  }

  // Optimized method for formatting multiple posts with batch interaction data fetching
  private async formatMultiplePostResponses(posts: any[], requestingUserId?: string): Promise<PostResponse[]> {
    if (posts.length === 0) return [];

    // Extract all post IDs for batch processing
    const postIds = posts.map(post => post.id);

    // Batch fetch all interaction data to reduce database queries
    const batchInteractionData = await this.getBatchPostInteractionData(postIds, requestingUserId);

    // Format each post with its corresponding interaction data
    return posts.map(post => {
      const interactionData = batchInteractionData[post.id] || {
        supportCount: 0,
        meTooCount: 0,
        similarWorryCount: 0,
        userHasShownSupport: requestingUserId ? false : undefined,
        userHasMeToo: requestingUserId ? false : undefined,
      };

      return {
        id: post.id,
        userId: post.userId,
        shortContent: post.shortContent,
        longContent: post.longContent || undefined,
        worryPrompt: post.worryPrompt,
        privacyLevel: post.privacyLevel,
        commentsEnabled: post.commentsEnabled,
        isScheduled: post.isScheduled,
        scheduledFor: post.scheduledFor?.toISOString(),
        publishedAt: post.publishedAt?.toISOString(),
        detectedLanguage: post.detectedLanguage || undefined,
        createdAt: post.createdAt.toISOString(),
        updatedAt: post.updatedAt.toISOString(),
        user: {
          id: post.user.id,
          username: post.user.username,
          displayName: post.user.displayName || undefined,
          avatarUrl: post.user.avatarUrl || undefined,
        },
        ...interactionData,
      };
    });
  }

  // Batch method for fetching interaction data for multiple posts
  private async getBatchPostInteractionData(postIds: string[], requestingUserId?: string): Promise<{
    [postId: string]: {
      supportCount: number;
      meTooCount: number;
      similarWorryCount: number;
      userHasShownSupport?: boolean;
      userHasMeToo?: boolean;
    }
  }> {
    try {
      // Batch fetch all interaction data
      const [
        supportCounts,
        meTooCountsData,
        worryAnalyses,
        userSupports,
        userMeToos
      ] = await Promise.all([
        // Batch support counts
        prisma.like.groupBy({
          by: ['postId'],
          where: { postId: { in: postIds } },
          _count: { id: true }
        }).catch(() => []),
        
        // Batch MeToo counts
        prisma.meToo.groupBy({
          by: ['postId'],
          where: { postId: { in: postIds } },
          _count: { id: true }
        }).catch(() => []),
        
        // Batch worry analyses
        prisma.worryAnalysis.findMany({
          where: { postId: { in: postIds } },
          select: { postId: true, similarWorryCount: true }
        }).catch(() => []),
        
        // Batch user support status
        requestingUserId ? prisma.like.findMany({
          where: { postId: { in: postIds }, userId: requestingUserId },
          select: { postId: true }
        }).catch(() => []) : Promise.resolve([]),
        
        // Batch user MeToo status
        requestingUserId ? prisma.meToo.findMany({
          where: { postId: { in: postIds }, userId: requestingUserId },
          select: { postId: true }
        }).catch(() => []) : Promise.resolve([])
      ]);

      // Convert arrays to maps for efficient lookup
      const supportCountMap = new Map<string, number>(
        supportCounts.map(item => [item.postId, item._count.id] as [string, number])
      );
      const meTooCountMap = new Map<string, number>(
        meTooCountsData.map(item => [item.postId, item._count.id] as [string, number])
      );
      const worryAnalysisMap = new Map<string, number>(
        worryAnalyses.map(item => [item.postId, item.similarWorryCount || 0] as [string, number])
      );
      const userSupportMap = new Set<string>(userSupports.map(item => item.postId));
      const userMeTooMap = new Set<string>(userMeToos.map(item => item.postId));

      // Build result object
      const result: { [postId: string]: any } = {};
      
      for (const postId of postIds) {
        const supportCount: number = supportCountMap.get(postId) || 0;
        const meTooCount: number = meTooCountMap.get(postId) || 0;
        const aiSimilarCount: number = worryAnalysisMap.get(postId) || 0;
        const combinedSimilarWorryCount: number = aiSimilarCount + meTooCount;

        result[postId] = {
          supportCount,
          meTooCount,
          similarWorryCount: combinedSimilarWorryCount,
          userHasShownSupport: requestingUserId ? userSupportMap.has(postId) : undefined,
          userHasMeToo: requestingUserId ? userMeTooMap.has(postId) : undefined,
        };
      }

      return result;
    } catch (error) {
      console.error('Error fetching batch post interaction data:', error);
      
      // Return safe defaults for all posts
      const result: { [postId: string]: any } = {};
      for (const postId of postIds) {
        result[postId] = {
          supportCount: 0,
          meTooCount: 0,
          similarWorryCount: 0,
          userHasShownSupport: requestingUserId ? false : undefined,
          userHasMeToo: requestingUserId ? false : undefined,
        };
      }
      return result;
    }
  }

  private async getPostInteractionData(postId: string, requestingUserId?: string): Promise<{
    supportCount: number;
    meTooCount: number;
    similarWorryCount: number;
    userHasShownSupport?: boolean;
    userHasMeToo?: boolean;
  }> {
    try {
      // Isolate the AI analysis query to prevent it from crashing the entire data fetch
      let worryAnalysis: { similarWorryCount: number } | null = null;
      try {
        worryAnalysis = await prisma.worryAnalysis.findUnique({
          where: { postId },
          select: { similarWorryCount: true },
        });
      } catch (e) {
        console.error(`AI analysis query failed for post ${postId}. Returning post without it.`, e);
        // On failure, worryAnalysis remains null, which is handled below
      }

      // Get other interaction counts in parallel
      const [
        supportCount,
        meTooCount,
        userSupport,
        userMeToo
      ] = await Promise.all([
        prisma.like.count({ where: { postId } }).catch(() => 0),
        prisma.meToo.count({ where: { postId } }).catch(() => 0),
        requestingUserId ? prisma.like.findFirst({
          where: { postId, userId: requestingUserId }
        }).catch(() => null) : Promise.resolve(null),
        requestingUserId ? prisma.meToo.findFirst({
          where: { postId, userId: requestingUserId }
        }).catch(() => null) : Promise.resolve(null)
      ]);

      // Calculate combined similar worry count (AI + MeToo) with safe defaults
      const aiSimilarCount = worryAnalysis?.similarWorryCount || 0;
      const safeMeTooCount = meTooCount || 0;
      const combinedSimilarWorryCount = aiSimilarCount + safeMeTooCount;

      return {
        supportCount: supportCount || 0,
        meTooCount: safeMeTooCount,
        similarWorryCount: combinedSimilarWorryCount,
        userHasShownSupport: requestingUserId ? !!userSupport : undefined,
        userHasMeToo: requestingUserId ? !!userMeToo : undefined,
      };
    } catch (error) {
      // If there's a critical error in the main block, return safe defaults
      console.error('Critical error fetching post interaction data:', error);
      return {
        supportCount: 0,
        meTooCount: 0,
        similarWorryCount: 0,
        userHasShownSupport: requestingUserId ? false : undefined,
        userHasMeToo: requestingUserId ? false : undefined,
      };
    }
  }
}