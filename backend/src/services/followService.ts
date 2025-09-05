import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class FollowService {
  async toggleFollow(followerId: string, followingId: string): Promise<{ isFollowing: boolean }> {
    if (followerId === followingId) {
      throw new Error('Users cannot follow themselves.');
    }

    const existingFollow = await prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId,
          followingId,
        },
      },
    });

    if (existingFollow) {
      // Unfollow
      await prisma.follow.delete({
        where: {
          followerId_followingId: {
            followerId,
            followingId,
          },
        },
      });
      return { isFollowing: false };
    } else {
      // Follow
      await prisma.follow.create({
        data: {
          followerId,
          followingId,
        },
      });
      return { isFollowing: true };
    }
  }

  // Note: The other methods (followUser, unfollowUser, etc.) would also be in this class.
  // I am only creating the toggle method as requested for now.
}
