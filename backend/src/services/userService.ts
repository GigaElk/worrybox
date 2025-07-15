import { PrismaClient } from '@prisma/client';
import { UpdateProfileRequest, UserProfile, UserSearchQuery, UserSearchResponse } from '../types/user';

const prisma = new PrismaClient();

export class UserService {
  async updateProfile(userId: string, data: UpdateProfileRequest): Promise<UserProfile> {
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        displayName: data.displayName,
        bio: data.bio,
        avatarUrl: data.avatarUrl,
      },
    });

    return {
      id: updatedUser.id,
      email: updatedUser.email,
      username: updatedUser.username,
      displayName: updatedUser.displayName || undefined,
      bio: updatedUser.bio || undefined,
      avatarUrl: updatedUser.avatarUrl || undefined,
      emailVerified: updatedUser.emailVerified,
      createdAt: updatedUser.createdAt,
      updatedAt: updatedUser.updatedAt,
    };
  }

  async getUserProfile(userId: string): Promise<UserProfile | null> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return null;
    }

    return {
      id: user.id,
      email: user.email,
      username: user.username,
      displayName: user.displayName || undefined,
      bio: user.bio || undefined,
      avatarUrl: user.avatarUrl || undefined,
      emailVerified: user.emailVerified,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  async getUserProfileByUsername(username: string): Promise<UserProfile | null> {
    const user = await prisma.user.findUnique({
      where: { username: username.toLowerCase() },
    });

    if (!user) {
      return null;
    }

    return {
      id: user.id,
      email: user.email,
      username: user.username,
      displayName: user.displayName || undefined,
      bio: user.bio || undefined,
      avatarUrl: user.avatarUrl || undefined,
      emailVerified: user.emailVerified,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  async searchUsers(query: UserSearchQuery): Promise<UserSearchResponse> {
    const limit = Math.min(query.limit || 20, 50); // Max 50 results
    const offset = query.offset || 0;

    const whereClause = query.query
      ? {
          OR: [
            {
              username: {
                contains: query.query.toLowerCase(),
                mode: 'insensitive' as const,
              },
            },
            {
              displayName: {
                contains: query.query,
                mode: 'insensitive' as const,
              },
            },
          ],
        }
      : {};

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where: whereClause,
        select: {
          id: true,
          username: true,
          displayName: true,
          avatarUrl: true,
          bio: true,
        },
        orderBy: [
          { username: 'asc' },
        ],
        take: limit,
        skip: offset,
      }),
      prisma.user.count({
        where: whereClause,
      }),
    ]);

    return {
      users: users.map(user => ({
        ...user,
        displayName: user.displayName || undefined,
        avatarUrl: user.avatarUrl || undefined,
        bio: user.bio || undefined,
      })),
      total,
      hasMore: offset + users.length < total,
    };
  }

  async checkUsernameAvailability(username: string, excludeUserId?: string): Promise<boolean> {
    const existingUser = await prisma.user.findUnique({
      where: { username: username.toLowerCase() },
    });

    if (!existingUser) {
      return true;
    }

    // If we're checking for a specific user (during profile update), 
    // allow their current username
    return excludeUserId ? existingUser.id === excludeUserId : false;
  }
}