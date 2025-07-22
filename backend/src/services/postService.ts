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

    return this.formatPostResponse(post);
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

    return this.formatPostResponse(updatedPost);
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

    return this.formatPostResponse(updatedPost);
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

    return this.formatPostResponse(updatedPost);
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

    return this.formatPostResponse(post);
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

    return {
      posts: filteredPosts.map(post => this.formatPostResponse(post)),
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

    return {
      posts: posts.map(post => this.formatPostResponse(post)),
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

    return {
      posts: posts.map(post => this.formatPostResponse(post)),
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

  private formatPostResponse(post: any): PostResponse {
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
    };
  }
}