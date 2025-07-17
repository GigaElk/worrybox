// Mock the entire Prisma module
const mockPrisma = {
  post: {
    findMany: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    findFirst: jest.fn(),
    count: jest.fn(),
  },
}

jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => mockPrisma)
}))

// Mock node-cron
const mockCronJob = {
  stop: jest.fn(),
}

jest.mock('node-cron', () => ({
  schedule: jest.fn().mockReturnValue(mockCronJob),
}))

import { SchedulingService } from '../services/schedulingService'
import * as cron from 'node-cron'

describe('SchedulingService', () => {
  let schedulingService: SchedulingService

  beforeEach(() => {
    schedulingService = SchedulingService.getInstance()
    jest.clearAllMocks()
  })

  describe('startScheduler', () => {
    it('should start the cron job', () => {
      // Reset the singleton instance for this test
      ;(SchedulingService as any).instance = null
      const freshService = SchedulingService.getInstance()
      
      freshService.startScheduler()
      
      expect(cron.schedule).toHaveBeenCalledWith('* * * * *', expect.any(Function))
    })
  })

  describe('stopScheduler', () => {
    it('should stop the cron job', () => {
      schedulingService.startScheduler()
      schedulingService.stopScheduler()
      
      expect(mockCronJob.stop).toHaveBeenCalled()
    })
  })

  describe('getScheduledPosts', () => {
    it('should return scheduled posts for a user', async () => {
      const mockPosts = [
        {
          id: 'post1',
          userId: 'user1',
          shortContent: 'Test worry',
          isScheduled: true,
          scheduledFor: new Date(),
          publishedAt: null,
          user: { id: 'user1', username: 'testuser', displayName: 'Test User', avatarUrl: null }
        }
      ]

      mockPrisma.post.findMany.mockResolvedValue(mockPosts)

      const result = await schedulingService.getScheduledPosts('user1')

      expect(mockPrisma.post.findMany).toHaveBeenCalledWith({
        where: {
          userId: 'user1',
          isScheduled: true,
          publishedAt: null
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
          scheduledFor: 'asc'
        }
      })

      expect(result).toEqual(mockPosts)
    })
  })

  describe('cancelScheduledPost', () => {
    it('should cancel a scheduled post', async () => {
      const mockPost = {
        id: 'post1',
        userId: 'user1',
        isScheduled: true,
        publishedAt: null
      }

      mockPrisma.post.findFirst.mockResolvedValue(mockPost)
      mockPrisma.post.delete.mockResolvedValue(mockPost)

      await schedulingService.cancelScheduledPost('post1', 'user1')

      expect(mockPrisma.post.findFirst).toHaveBeenCalledWith({
        where: {
          id: 'post1',
          userId: 'user1',
          isScheduled: true,
          publishedAt: null
        }
      })

      expect(mockPrisma.post.delete).toHaveBeenCalledWith({
        where: { id: 'post1' }
      })
    })

    it('should throw error if post not found', async () => {
      mockPrisma.post.findFirst.mockResolvedValue(null)

      await expect(schedulingService.cancelScheduledPost('post1', 'user1'))
        .rejects.toThrow('Scheduled post not found or you do not have permission to cancel it')
    })
  })

  describe('updateScheduledPost', () => {
    it('should update a scheduled post', async () => {
      const mockPost = {
        id: 'post1',
        userId: 'user1',
        isScheduled: true,
        publishedAt: null
      }

      const mockUpdatedPost = {
        ...mockPost,
        shortContent: 'Updated content',
        createdAt: new Date(),
        updatedAt: new Date(),
        scheduledFor: new Date(),
        publishedAt: null,
        user: { id: 'user1', username: 'testuser', displayName: 'Test User', avatarUrl: null }
      }

      mockPrisma.post.findFirst.mockResolvedValue(mockPost)
      mockPrisma.post.update.mockResolvedValue(mockUpdatedPost)

      const updateData = { shortContent: 'Updated content' }
      const result = await schedulingService.updateScheduledPost('post1', 'user1', updateData)

      expect(mockPrisma.post.findFirst).toHaveBeenCalledWith({
        where: {
          id: 'post1',
          userId: 'user1',
          isScheduled: true,
          publishedAt: null
        }
      })

      expect(mockPrisma.post.update).toHaveBeenCalledWith({
        where: { id: 'post1' },
        data: {
          ...updateData,
          updatedAt: expect.any(Date)
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

      expect(result.shortContent).toBe('Updated content')
    })

    it('should throw error if post not found', async () => {
      mockPrisma.post.findFirst.mockResolvedValue(null)

      await expect(schedulingService.updateScheduledPost('post1', 'user1', {}))
        .rejects.toThrow('Scheduled post not found or you do not have permission to edit it')
    })
  })

  describe('getSchedulingStats', () => {
    it('should return scheduling statistics', async () => {
      mockPrisma.post.count
        .mockResolvedValueOnce(10) // totalScheduled
        .mockResolvedValueOnce(3)  // scheduledToday
        .mockResolvedValueOnce(7)  // scheduledThisWeek

      const result = await schedulingService.getSchedulingStats()

      expect(result).toEqual({
        totalScheduled: 10,
        scheduledToday: 3,
        scheduledThisWeek: 7
      })

      expect(mockPrisma.post.count).toHaveBeenCalledTimes(3)
    })
  })
})