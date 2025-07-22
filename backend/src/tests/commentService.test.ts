// Mock the entire Prisma module
const mockPrisma = {
  post: {
    findUnique: jest.fn(),
  },
  comment: {
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
  },
}

jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => mockPrisma)
}))

import { CommentService } from '../services/commentService'

describe('CommentService', () => {
  let commentService: CommentService

  beforeEach(() => {
    commentService = new CommentService()
    jest.clearAllMocks()
  })

  describe('createComment', () => {
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

    const mockComment = {
      id: 'comment1',
      content: 'Test comment',
      userId: 'user1',
      postId: 'post1',
      createdAt: new Date(),
      updatedAt: new Date(),
      user: mockUser,
    }

    it('should successfully create a comment', async () => {
      mockPrisma.post.findUnique.mockResolvedValue(mockPost)
      mockPrisma.comment.create.mockResolvedValue(mockComment)

      const result = await commentService.createComment('user1', 'post1', {
        content: 'Test comment'
      })

      expect(mockPrisma.post.findUnique).toHaveBeenCalledWith({
        where: { id: 'post1' }
      })
      expect(mockPrisma.comment.create).toHaveBeenCalledWith({
        data: {
          content: 'Test comment',
          userId: 'user1',
          postId: 'post1'
        },
        include: {
          user: { select: { id: true, username: true, displayName: true, avatarUrl: true } }
        }
      })
      expect(result.id).toBe('comment1')
      expect(result.content).toBe('Test comment')
      expect(result.userId).toBe('user1')
      expect(result.postId).toBe('post1')
    })

    it('should throw error if post not found', async () => {
      mockPrisma.post.findUnique.mockResolvedValue(null)

      await expect(commentService.createComment('user1', 'post1', {
        content: 'Test comment'
      })).rejects.toThrow('Post not found')
    })

    it('should throw error if comments are disabled', async () => {
      const postWithCommentsDisabled = {
        id: 'post1',
        commentsEnabled: false
      }
      mockPrisma.post.findUnique.mockResolvedValue(postWithCommentsDisabled)

      await expect(commentService.createComment('user1', 'post1', {
        content: 'Test comment'
      })).rejects.toThrow('Comments are disabled for this post')
      
      expect(mockPrisma.post.findUnique).toHaveBeenCalledWith({
        where: { id: 'post1' },
        select: { id: true, commentsEnabled: true }
      })
    })
  })

  describe('updateComment', () => {
    const mockUser = {
      id: 'user1',
      username: 'testuser',
      displayName: 'Test User',
      avatarUrl: null,
    }

    const mockExistingComment = {
      id: 'comment1',
      content: 'Original comment',
      userId: 'user1',
      postId: 'post1',
    }

    const mockUpdatedComment = {
      id: 'comment1',
      content: 'Updated comment',
      userId: 'user1',
      postId: 'post1',
      createdAt: new Date(),
      updatedAt: new Date(),
      user: mockUser,
    }

    it('should successfully update a comment', async () => {
      mockPrisma.comment.findFirst.mockResolvedValue(mockExistingComment)
      mockPrisma.comment.update.mockResolvedValue(mockUpdatedComment)

      const result = await commentService.updateComment('comment1', 'user1', {
        content: 'Updated comment'
      })

      expect(mockPrisma.comment.findFirst).toHaveBeenCalledWith({
        where: { id: 'comment1', userId: 'user1' }
      })
      expect(mockPrisma.comment.update).toHaveBeenCalledWith({
        where: { id: 'comment1' },
        data: {
          content: 'Updated comment',
          updatedAt: expect.any(Date)
        },
        include: {
          user: { select: { id: true, username: true, displayName: true, avatarUrl: true } }
        }
      })
      expect(result.content).toBe('Updated comment')
    })

    it('should throw error if comment not found or no permission', async () => {
      mockPrisma.comment.findFirst.mockResolvedValue(null)

      await expect(commentService.updateComment('comment1', 'user1', {
        content: 'Updated comment'
      })).rejects.toThrow('Comment not found or you do not have permission to edit it')
    })
  })

  describe('deleteComment', () => {
    const mockComment = {
      id: 'comment1',
      userId: 'user1',
      postId: 'post1',
    }

    it('should successfully delete a comment', async () => {
      mockPrisma.comment.findFirst.mockResolvedValue(mockComment)
      mockPrisma.comment.delete.mockResolvedValue(mockComment)

      await commentService.deleteComment('comment1', 'user1')

      expect(mockPrisma.comment.findFirst).toHaveBeenCalledWith({
        where: { id: 'comment1', userId: 'user1' }
      })
      expect(mockPrisma.comment.delete).toHaveBeenCalledWith({
        where: { id: 'comment1' }
      })
    })

    it('should throw error if comment not found or no permission', async () => {
      mockPrisma.comment.findFirst.mockResolvedValue(null)

      await expect(commentService.deleteComment('comment1', 'user1'))
        .rejects.toThrow('Comment not found or you do not have permission to delete it')
    })
  })

  describe('getCommentCount', () => {
    it('should return correct comment count', async () => {
      mockPrisma.comment.count.mockResolvedValue(3)

      const result = await commentService.getCommentCount('post1')

      expect(result).toBe(3)
      expect(mockPrisma.comment.count).toHaveBeenCalledWith({
        where: { postId: 'post1' }
      })
    })
  })
})