// Mock the entire Prisma module
const mockPrisma = {
  user: {
    findUnique: jest.fn(),
  },
  follow: {
    findFirst: jest.fn(),
    create: jest.fn(),
    delete: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
  },
}

jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => mockPrisma)
}))

import { FollowService } from '../services/followService'

describe('FollowService', () => {
  let followService: FollowService

  beforeEach(() => {
    followService = new FollowService()
    jest.clearAllMocks()
  })

  describe('followUser', () => {
    const mockFollower = {
      id: 'user1',
      username: 'follower',
      displayName: 'Follower User',
      avatarUrl: null,
    }

    const mockFollowing = {
      id: 'user2',
      username: 'following',
      displayName: 'Following User',
      avatarUrl: null,
    }

    const mockFollow = {
      id: 'follow1',
      followerId: 'user1',
      followingId: 'user2',
      createdAt: new Date(),
      follower: mockFollower,
      following: mockFollowing,
    }

    it('should successfully follow a user', async () => {
      mockPrisma.user.findUnique
        .mockResolvedValueOnce(mockFollower)
        .mockResolvedValueOnce(mockFollowing)
      mockPrisma.follow.findFirst.mockResolvedValue(null)
      mockPrisma.follow.create.mockResolvedValue(mockFollow)

      const result = await followService.followUser('user1', 'user2')

      expect(mockPrisma.user.findUnique).toHaveBeenCalledTimes(2)
      expect(mockPrisma.follow.findFirst).toHaveBeenCalledWith({
        where: { followerId: 'user1', followingId: 'user2' }
      })
      expect(mockPrisma.follow.create).toHaveBeenCalledWith({
        data: { followerId: 'user1', followingId: 'user2' },
        include: {
          follower: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
          following: { select: { id: true, username: true, displayName: true, avatarUrl: true } }
        }
      })
      expect(result.id).toBe('follow1')
      expect(result.followerId).toBe('user1')
      expect(result.followingId).toBe('user2')
    })

    it('should throw error if follower user not found', async () => {
      mockPrisma.user.findUnique
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(mockFollowing)

      await expect(followService.followUser('user1', 'user2'))
        .rejects.toThrow('Follower user not found')
    })

    it('should throw error if user to follow not found', async () => {
      mockPrisma.user.findUnique
        .mockResolvedValueOnce(mockFollower)
        .mockResolvedValueOnce(null)

      await expect(followService.followUser('user1', 'user2'))
        .rejects.toThrow('User to follow not found')
    })

    it('should throw error if already following', async () => {
      mockPrisma.user.findUnique
        .mockResolvedValueOnce(mockFollower)
        .mockResolvedValueOnce(mockFollowing)
      mockPrisma.follow.findFirst.mockResolvedValue(mockFollow)

      await expect(followService.followUser('user1', 'user2'))
        .rejects.toThrow('Already following this user')
    })
  })

  describe('unfollowUser', () => {
    const mockFollow = {
      id: 'follow1',
      followerId: 'user1',
      followingId: 'user2',
    }

    it('should successfully unfollow a user', async () => {
      mockPrisma.follow.findFirst.mockResolvedValue(mockFollow)
      mockPrisma.follow.delete.mockResolvedValue(mockFollow)

      await followService.unfollowUser('user1', 'user2')

      expect(mockPrisma.follow.findFirst).toHaveBeenCalledWith({
        where: { followerId: 'user1', followingId: 'user2' }
      })
      expect(mockPrisma.follow.delete).toHaveBeenCalledWith({
        where: { id: 'follow1' }
      })
    })

    it('should throw error if not following user', async () => {
      mockPrisma.follow.findFirst.mockResolvedValue(null)

      await expect(followService.unfollowUser('user1', 'user2'))
        .rejects.toThrow('Not following this user')
    })
  })

  describe('isFollowing', () => {
    it('should return true if following', async () => {
      mockPrisma.follow.findFirst.mockResolvedValue({ id: 'follow1' })

      const result = await followService.isFollowing('user1', 'user2')

      expect(result).toBe(true)
      expect(mockPrisma.follow.findFirst).toHaveBeenCalledWith({
        where: { followerId: 'user1', followingId: 'user2' }
      })
    })

    it('should return false if not following', async () => {
      mockPrisma.follow.findFirst.mockResolvedValue(null)

      const result = await followService.isFollowing('user1', 'user2')

      expect(result).toBe(false)
    })
  })

  describe('getFollowStats', () => {
    it('should return correct follow stats', async () => {
      mockPrisma.follow.count
        .mockResolvedValueOnce(10) // followers count
        .mockResolvedValueOnce(5)  // following count

      const result = await followService.getFollowStats('user1')

      expect(result).toEqual({
        followersCount: 10,
        followingCount: 5
      })
      expect(mockPrisma.follow.count).toHaveBeenCalledTimes(2)
    })
  })
})