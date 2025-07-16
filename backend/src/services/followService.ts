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
  }

  async unfollowUser(followerId: string, followingId: string): Promise<void> {
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
  }

  async getFollowers(userId: string, limit = 20, offset = 0): Promise<{ followers: FollowResponse[], total: number, hasMore: boolean }> {
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
      }),
      prisma.follow.count({
        where: {
          followingId: userId
        }
      })
    ]);

    return {
      followers: followers.map(follow => ({
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
      total,
      hasMore: offset + followers.length < total
    };
  }

  async getFollowing(userId: string, limit = 20, offset = 0): Promise<{ following: FollowResponse[], total: number, hasMore: boolean }> {
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
      }),
      prisma.follow.count({
        where: {
          followerId: userId
        }
      })
    ]);

    return {
      following: following.map(follow => ({
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
      total,
      hasMore: offset + following.length < total
    };
  }

  async isFollowing(followerId: string, followingId: string): Promise<boolean> {
    const follow = await prisma.follow.findFirst({
      where: {
        followerId,
        followingId
      }
    });

    return !!follow;
  }

  async getFollowStats(userId: string): Promise<{ followersCount: number, followingCount: number }> {
    const [followersCount, followingCount] = await Promise.all([
      prisma.follow.count({
        where: {
          followingId: userId
        }
      }),
      prisma.follow.count({
        where: {
          followerId: userId
        }
      })
    ]);

    return {
      followersCount,
      followingCount
    };
  }
}