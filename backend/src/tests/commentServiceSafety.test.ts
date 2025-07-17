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
  commentReport: {
    findFirst: jest.fn(),
    create: jest.fn(),
    count: jest.fn(),
    findMany: jest.fn(),
  },
}

jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => mockPrisma)
}))

// Mock moderation service
const mockModerationService = {
  moderateComment: jest.fn(),
  updateCommentModerationStatus: jest.fn(),
}

jest.mock('../services/moderationService', () => ({
  ModerationService: jest.fn().mockImplementation(() => mockModerationService)
}))

import { CommentService } from '../services/commentService'

describe('CommentService Safety Features', () => {
  let commentService: CommentService

  beforeEach(() => {
    commentService = new CommentService()
    jest.clearAllMocks()
  })

  describe('Nested Comments', () => {
    const mockPost = {
      id: 'post1',
      shortContent: 'Test post',
    }

    const mockParentComment = {
      id: 'parent1',
      postId: 'post1',
      content: 'Parent comment',
    }

    const mockUser = {
      id: 'user1',
      username: 'testuser',
      displayName: 'Test User',
      avatarUrl: null,
    }

    it('should create nested reply comment', async () => {
      mockPrisma.post.findUnique.mockResolvedValue(mockPost)
      mockPrisma.comment.findUnique.mockResolvedValue(mockParentComment)
      
      const mockReply = {
        id: 'reply1',
        content: 'Reply comment',
        userId: 'user1',
        postId: 'post1',
        parentCommentId: 'parent1',
        moderationStatus: 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
        user: mockUser,
      }

      mockPrisma.comment.create.mockResolvedValue(mockReply)
      mockModerationService.moderateComment.mockResolvedValue({
        status: 'approved',
        score: 0.1,
        reasons: [],
        confidence: 0.9
      })

      const result = await commentService.createComment('user1', 'post1', {
        content: 'Reply comment',
        parentCommentId: 'parent1'
      })

      expect(mockPrisma.comment.findUnique).toHaveBeenCalledWith({
        where: { id: 'parent1' }
      })
      expect(mockPrisma.comment.create).toHaveBeenCalledWith({
        data: {
          content: 'Reply comment',
          userId: 'user1',
          postId: 'post1',
          parentCommentId: 'parent1',
          moderationStatus: 'pending'
        },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatarUrl: true
            }
          }
        }
      })
      expect(result.parentCommentId).toBe('parent1')
    })

    it('should reject reply if parent comment not found', async () => {
      mockPrisma.post.findUnique.mockResolvedValue(mockPost)
      mockPrisma.comment.findUnique.mockResolvedValue(null)

      await expect(commentService.createComment('user1', 'post1', {
        content: 'Reply comment',
        parentCommentId: 'nonexistent'
      })).rejects.toThrow('Parent comment not found')
    })

    it('should reject reply if parent comment belongs to different post', async () => {
      mockPrisma.post.findUnique.mockResolvedValue(mockPost)
      mockPrisma.comment.findUnique.mockResolvedValue({
        ...mockParentComment,
        postId: 'different-post'
      })

      await expect(commentService.createComment('user1', 'post1', {
        content: 'Reply comment',
        parentCommentId: 'parent1'
      })).rejects.toThrow('Parent comment does not belong to this post')
    })
  })

  describe('Threaded Comments', () => {
    it('should get comments with nested replies', async () => {
      const mockPost = { id: 'post1' }
      const mockTopLevelComments = [
        {
          id: 'comment1',
          content: 'Top level comment',
          userId: 'user1',
          postId: 'post1',
          parentCommentId: null,
          moderationStatus: 'approved',
          createdAt: new Date(),
          updatedAt: new Date(),
          user: { id: 'user1', username: 'user1', displayName: null, avatarUrl: null },
          replies: [
            {
              id: 'reply1',
              content: 'Reply to comment',
              userId: 'user2',
              postId: 'post1',
              parentCommentId: 'comment1',
              moderationStatus: 'approved',
              createdAt: new Date(),
              updatedAt: new Date(),
              user: { id: 'user2', username: 'user2', displayName: null, avatarUrl: null }
            }
          ]
        }
      ]

      mockPrisma.post.findUnique.mockResolvedValue(mockPost)
      mockPrisma.comment.findMany.mockResolvedValue(mockTopLevelComments)
      mockPrisma.comment.count.mockResolvedValue(1)

      const result = await commentService.getCommentsWithReplies('post1', 20, 0)

      expect(result.comments).toHaveLength(1)
      expect(result.comments[0].replies).toHaveLength(1)
      expect(result.comments[0].replyCount).toBe(1)
      expect(mockPrisma.comment.findMany).toHaveBeenCalledWith({
        where: {
          postId: 'post1',
          parentCommentId: null,
          moderationStatus: 'approved'
        },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatarUrl: true
            }
          },
          replies: {
            where: {
              moderationStatus: 'approved'
            },
            include: {
              user: {
                select: {
                  id: true,
                  username: true,
                  displayName: true,
                  avatarUrl: true
                }
              }
            },
            orderBy: {
              createdAt: 'asc'
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: 20,
        skip: 0
      })
    })
  })

  describe('Comment Reporting', () => {
    const mockComment = {
      id: 'comment1',
      content: 'Test comment',
      moderationStatus: 'approved'
    }

    it('should report a comment successfully', async () => {
      mockPrisma.comment.findUnique.mockResolvedValue(mockComment)
      mockPrisma.commentReport.findFirst.mockResolvedValue(null)
      mockPrisma.commentReport.create.mockResolvedValue({})
      mockPrisma.commentReport.count.mockResolvedValue(1)

      await commentService.reportComment('comment1', 'reporter1', {
        reason: 'spam',
        details: 'This is spam content'
      })

      expect(mockPrisma.commentReport.create).toHaveBeenCalledWith({
        data: {
          commentId: 'comment1',
          reporterId: 'reporter1',
          reason: 'spam',
          details: 'This is spam content'
        }
      })
    })

    it('should prevent duplicate reports from same user', async () => {
      mockPrisma.comment.findUnique.mockResolvedValue(mockComment)
      mockPrisma.commentReport.findFirst.mockResolvedValue({ id: 'existing-report' })

      await expect(commentService.reportComment('comment1', 'reporter1', {
        reason: 'spam'
      })).rejects.toThrow('You have already reported this comment')
    })

    it('should flag comment after multiple reports', async () => {
      mockPrisma.comment.findUnique.mockResolvedValue(mockComment)
      mockPrisma.commentReport.findFirst.mockResolvedValue(null)
      mockPrisma.commentReport.create.mockResolvedValue({})
      mockPrisma.commentReport.count.mockResolvedValue(3) // 3 reports trigger flagging

      await commentService.reportComment('comment1', 'reporter1', {
        reason: 'harassment'
      })

      expect(mockModerationService.updateCommentModerationStatus).toHaveBeenCalledWith(
        'comment1',
        'flagged',
        0.8,
        ['Multiple user reports (3 reports)', 'Primary reason: harassment']
      )
    })

    it('should get comment reports', async () => {
      const mockReports = [
        {
          id: 'report1',
          commentId: 'comment1',
          reason: 'spam',
          details: 'Spam content',
          createdAt: new Date(),
          reporter: {
            id: 'reporter1',
            username: 'reporter1',
            displayName: 'Reporter One'
          }
        }
      ]

      mockPrisma.commentReport.findMany.mockResolvedValue(mockReports)

      const result = await commentService.getCommentReports('comment1')

      expect(result).toEqual(mockReports)
      expect(mockPrisma.commentReport.findMany).toHaveBeenCalledWith({
        where: { commentId: 'comment1' },
        include: {
          reporter: {
            select: {
              id: true,
              username: true,
              displayName: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      })
    })
  })

  describe('Reply Count', () => {
    it('should get reply count for a comment', async () => {
      mockPrisma.comment.count.mockResolvedValue(5)

      const result = await commentService.getReplyCount('comment1')

      expect(result).toBe(5)
      expect(mockPrisma.comment.count).toHaveBeenCalledWith({
        where: {
          parentCommentId: 'comment1',
          moderationStatus: 'approved'
        }
      })
    })
  })
})