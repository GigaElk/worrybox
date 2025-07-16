// Mock the entire Prisma module
const mockPrisma = {
  post: {
    findUnique: jest.fn(),
  },
  like: {
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

import { LikeService } from '../services/likeService'

describe('LikeService', () => {
  let likeService: LikeService

  beforeEach(() => {
    likeService = new LikeService()
    jest.clearAllMocks()
  })

  describe('likePost', () => {
    const mockPost = {
      id: 'post1',
      shortContent: 'Test post',
    }

    const mockUser = {
      id: 'user1',
      username: 'testuser',
      displayName: 'Test User',
      avatarUrl: null,
    }

    const mockLike = {
      id: 'like1',
      userId: 'user1',
      postId: 'post1',
      createdAt: new Date(),
      user: mockUser,
    }

    it('should successfully like a post', async () => {
      mockPrisma.post.findUnique.mockResolvedValue(mockPost)
      mockPrisma.like.findFirst.mockResolvedValue(null)
      mockPrisma.like.create.mockResolvedValue(mockLike)

      const result = await likeService.likePost('user1', 'post1')

      expect(mockPrisma.post.findUnique).toHaveBeenCalledWith({
        where: { id: 'post1' }
      })
      expect(mockPrisma.like.findFirst).toHaveBeenCalledWith({
        where: { userId: 'user1', postId: 'post1' }
      })
      expect(mockPrisma.like.create).toHaveBeenCalledWith({
        data: { userId: 'user1', postId: 'post1' },
        include: {
          user: { select: { id: true, username: true, displayName: true, avatarUrl: true } }
        }
      })
      expect(result.id).toBe('like1')
      expect(result.userId).toBe('user1')
      expect(result.postId).toBe('post1')
    })

    it('should throw error if post not found', async () => {
      mockPrisma.post.findUnique.mockResolvedValue(null)

      await expect(likeService.likePost('user1', 'post1'))
        .rejects.toThrow('Post not found')
    })

    it('should throw error if already liked', async () => {
      mockPrisma.post.findUnique.mockResolvedValue(mockPost)
      mockPrisma.like.findFirst.mockResolvedValue(mockLike)

      await expect(likeService.likePost('user1', 'post1'))
        .rejects.toThrow('Already liked this post')
    })
  })

  describe('unlikePost', () => {
    const mockLike = {
      id: 'like1',
      userId: 'user1',
      postId: 'post1',
    }

    it('should successfully unlike a post', async () => {
      mockPrisma.like.findFirst.mockResolvedValue(mockLike)
      mockPrisma.like.delete.mockResolvedValue(mockLike)

      await likeService.unlikePost('user1', 'post1')

      expect(mockPrisma.like.findFirst).toHaveBeenCalledWith({
        where: { userId: 'user1', postId: 'post1' }
      })
      expect(mockPrisma.like.delete).toHaveBeenCalledWith({
        where: { id: 'like1' }
      })
    })

    it('should throw error if not liked', async () => {
      mockPrisma.like.findFirst.mockResolvedValue(null)

      await expect(likeService.unlikePost('user1', 'post1'))
        .rejects.toThrow('Not liked this post')
    })
  })

  describe('isLiked', () => {
    it('should return true if liked', async () => {
      mockPrisma.like.findFirst.mockResolvedValue({ id: 'like1' })

      const result = await likeService.isLiked('user1', 'post1')

      expect(result).toBe(true)
      expect(mockPrisma.like.findFirst).toHaveBeenCalledWith({
        where: { userId: 'user1', postId: 'post1' }
      })
    })

    it('should return false if not liked', async () => {
      mockPrisma.like.findFirst.mockResolvedValue(null)

      const result = await likeService.isLiked('user1', 'post1')

      expect(result).toBe(false)
    })
  })

  describe('getLikeCount', () => {
    it('should return correct like count', async () => {
      mockPrisma.like.count.mockResolvedValue(5)

      const result = await likeService.getLikeCount('post1')

      expect(result).toBe(5)
      expect(mockPrisma.like.count).toHaveBeenCalledWith({
        where: { postId: 'post1' }
      })
    })
  })
})