import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface FollowResponse {
  id: string;
  followerId: string;
  followingId: string;
  createdAt: string;
  follower: {
    id: string;
    username: string;
    displayName?: string;
    avatarUrl?: string;
  };
  following: {
    id: string;
    username: string;
    displayName?: string;
    avatarUrl?: string;
  };
}

export class FollowService {
  async followUser(followerId: string, followingId: string): Promise<FollowResponse> {
    // Validate input parameters
    if (!followerId || !followingId) {
      throw new Error('Follower ID and Following ID are required');
    }

    // Prevent self-following
    if (followerId === followingId) {
      throw new Error('Cannot follow yourself');
    }

    try {
      // Check if users exist
      const [follower, following] = await Promise.all([
        prisma.user.findUnique({ where: { id: followerId } }),
        prisma.user.findUnique({ where: { id: followingId } })
      ]);

      if (!follower) {
        throw new Error('Follower user not found');
      }

      if (!following) {
        throw new Error('User to follow not found');
      }

      // Check if already following
      const existingFollow = await prisma.follow.findFirst({
        where: {
          followerId,
          followingId
        }
      });

      if (existingFollow) {
        throw new Error('Already following this user');
      }

      // Create follow relationship
      const follow = await prisma.follow.create({
        data: {
          followerId,
          followingId
        },
        include: {
          follower: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatarUrl: true
            }
          },
          following: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatarUrl: true
            }
          }
        }
      });

      return {
        id: follow.id,
        followerId: follow.followerId,
        followingId: follow.followingId,
        createdAt: follow.createdAt.toISOString(),
        follower: {
          id: follow.follower.id,
          username: follow.follower.username,
          displayName: follow.follower.displayName || undefined,
          avatarUrl: follow.follower.avatarUrl || undefined
        },
        following: {
          id: follow.following.id,
          username: follow.following.username,
          displayName: follow.following.displayName || undefined,
          avatarUrl: follow.following.avatarUrl || undefined
        }
      };
    } catch (error: any) {
      // Re-throw known errors, wrap unknown errors
      if (error.message === 'Follower user not found' || 
          error.message === 'User to follow not found' || 
          error.message === 'Already following this user') {
        throw error;
      }
      
      console.error('Error creating follow relationship:', { followerId, followingId }, error);
      throw new Error('Failed to follow user');
    }
  }

  async unfollowUser(followerId: string, followingId: string): Promise<void> {
    // Validate input parameters
    if (!followerId || !followingId) {
      throw new Error('Follower ID and Following ID are required');
    }

    try {
      const follow = await prisma.follow.findFirst({
        where: {
          followerId,
          followingId
        }
      });

      if (!follow) {
        throw new Error('Not following this user');
      }

      await prisma.follow.delete({
        where: {
          id: follow.id
        }
      });
    } catch (error: any) {
      // Re-throw known errors, wrap unknown errors
      if (error.message === 'Not following this user') {
        throw error;
      }
      
      console.error('Error removing follow relationship:', { followerId, followingId }, error);
      throw new Error('Failed to unfollow user');
    }
  }

  async getFollowers(userId: string, limit = 20, offset = 0): Promise<{ followers: FollowResponse[], total: number, hasMore: boolean }> {
    try {
      // Handle null/undefined userId
      if (!userId) {
        return {
          followers: [],
          total: 0,
          hasMore: false
        };
      }

      const [followers, total] = await Promise.all([
        prisma.follow.findMany({
          where: {
            followingId: userId
          },
          include: {
            follower: {
              select: {
                id: true,
                username: true,
                displayName: true,
                avatarUrl: true
              }
            },
            following: {
              select: {
                id: true,
                username: true,
                displayName: true,
                avatarUrl: true
              }
            }
          },
          orderBy: {
            createdAt: 'desc'
          },
          take: limit,
          skip: offset
        }).catch(() => []), // Handle database errors gracefully
        prisma.follow.count({
          where: {
            followingId: userId
          }
        }).catch(() => 0) // Handle database errors gracefully
      ]);

      // Safely handle null/undefined followers array
      const safeFollowers = followers || [];
      const safeTotal = total || 0;

      return {
        followers: safeFollowers.map(follow => ({
          id: follow.id,
          followerId: follow.followerId,
          followingId: follow.followingId,
          createdAt: follow.createdAt.toISOString(),
          follower: {
            id: follow.follower.id,
            username: follow.follower.username,
            displayName: follow.follower.displayName || undefined,
            avatarUrl: follow.follower.avatarUrl || undefined
          },
          following: {
            id: follow.following.id,
            username: follow.following.username,
            displayName: follow.following.displayName || undefined,
            avatarUrl: follow.following.avatarUrl || undefined
          }
        })),
        total: safeTotal,
        hasMore: offset + safeFollowers.length < safeTotal
      };
    } catch (error) {
      // Log error but return empty results instead of throwing
      console.error('Error fetching followers for user:', userId, error);
      return {
        followers: [],
        total: 0,
        hasMore: false
      };
    }
  }

  async getFollowing(userId: string, limit = 20, offset = 0): Promise<{ following: FollowResponse[], total: number, hasMore: boolean }> {
    try {
      // Handle null/undefined userId
      if (!userId) {
        return {
          following: [],
          total: 0,
          hasMore: false
        };
      }

      const [following, total] = await Promise.all([
        prisma.follow.findMany({
          where: {
            followerId: userId
          },
          include: {
            follower: {
              select: {
                id: true,
                username: true,
                displayName: true,
                avatarUrl: true
              }
            },
            following: {
              select: {
                id: true,
                username: true,
                displayName: true,
                avatarUrl: true
              }
            }
          },
          orderBy: {
            createdAt: 'desc'
          },
          take: limit,
          skip: offset
        }).catch(() => []), // Handle database errors gracefully
        prisma.follow.count({
          where: {
            followerId: userId
          }
        }).catch(() => 0) // Handle database errors gracefully
      ]);

      // Safely handle null/undefined following array
      const safeFollowing = following || [];
      const safeTotal = total || 0;

      return {
        following: safeFollowing.map(follow => ({
          id: follow.id,
          followerId: follow.followerId,
          followingId: follow.followingId,
          createdAt: follow.createdAt.toISOString(),
          follower: {
            id: follow.follower.id,
            username: follow.follower.username,
            displayName: follow.follower.displayName || undefined,
            avatarUrl: follow.follower.avatarUrl || undefined
          },
          following: {
            id: follow.following.id,
            username: follow.following.username,
            displayName: follow.following.displayName || undefined,
            avatarUrl: follow.following.avatarUrl || undefined
          }
        })),
        total: safeTotal,
        hasMore: offset + safeFollowing.length < safeTotal
      };
    } catch (error) {
      // Log error but return empty results instead of throwing
      console.error('Error fetching following for user:', userId, error);
      return {
        following: [],
        total: 0,
        hasMore: false
      };
    }
  }

  async isFollowing(followerId: string, followingId: string): Promise<boolean> {
    try {
      // Handle null/undefined parameters
      if (!followerId || !followingId) {
        return false;
      }

      const follow = await prisma.follow.findFirst({
        where: {
          followerId,
          followingId
        }
      });

      return !!follow;
    } catch (error) {
      // Log error but return false instead of throwing
      console.error('Error checking follow status:', { followerId, followingId }, error);
      return false;
    }
  }

  async getFollowStats(userId: string): Promise<{ followersCount: number, followingCount: number }> {
    try {
      // Handle null/undefined userId
      if (!userId) {
        return {
          followersCount: 0,
          followingCount: 0
        };
      }

      const [followersCount, followingCount] = await Promise.all([
        prisma.follow.count({
          where: {
            followingId: userId
          }
        }).catch(() => 0), // Handle database errors gracefully
        prisma.follow.count({
          where: {
            followerId: userId
          }
        }).catch(() => 0) // Handle database errors gracefully
      ]);

      return {
        followersCount: followersCount || 0,
        followingCount: followingCount || 0
      };
    } catch (error) {
      // Log error but return safe defaults instead of throwing
      console.error('Error getting follow stats for user:', userId, error);
      return {
        followersCount: 0,
        followingCount: 0
      };
    }
  }
}