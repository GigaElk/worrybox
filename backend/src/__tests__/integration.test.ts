import request from 'supertest'
import { app } from '../index'
import { prisma } from '../config/database'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

// Mock the database
vi.mock('../config/database', () => ({
  prisma: {
    post: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    like: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    meToo: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    follow: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    worryAnalysis: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}))

const mockPrisma = prisma as any

describe('Backend Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Complete Support Workflow', () => {
    it('handles full support workflow from post creation to MeToo', async () => {
      // Mock user authentication
      const mockUser = {
        id: 'user-1',
        username: 'testuser',
        email: 'test@example.com',
      }

      // Mock post creation
      const mockPost = {
        id: 'post-1',
        shortContent: 'Test worry post',
        userId: 'user-1',
        createdAt: new Date(),
        user: mockUser,
      }

      mockPrisma.post.create.mockResolvedValue(mockPost)
      mockPrisma.post.findUnique.mockResolvedValue(mockPost)
      mockPrisma.meToo.findFirst.mockResolvedValue(null)
      mockPrisma.meToo.create.mockResolvedValue({
        id: 'metoo-1',
        userId: 'user-2',
        postId: 'post-1',
      })
      mockPrisma.meToo.count.mockResolvedValue(1)

      // Step 1: Create a post
      const postResponse = await request(app)
        .post('/api/posts')
        .set('Authorization', 'Bearer valid-token')
        .send({
          shortContent: 'Test worry post',
          fullContent: 'This is a detailed worry post',
          isAnonymous: false,
        })
        .expect(201)

      expect(postResponse.body.data.post.shortContent).toBe('Test worry post')

      // Step 2: Another user adds MeToo to the post
      const meTooResponse = await request(app)
        .post('/api/metoo/post-1')
        .set('Authorization', 'Bearer another-valid-token')
        .expect(201)

      expect(meTooResponse.body.data.meToo.postId).toBe('post-1')

      // Step 3: Get MeToo count
      const countResponse = await request(app)
        .get('/api/metoo/post-1/count')
        .expect(200)

      expect(countResponse.body.data.count).toBe(1)
    })

    it('handles support workflow with error recovery', async () => {
      // Mock database error on first attempt, success on retry
      mockPrisma.meToo.create
        .mockRejectedValueOnce(new Error('Database connection failed'))
        .mockResolvedValueOnce({
          id: 'metoo-1',
          userId: 'user-1',
          postId: 'post-1',
        })

      mockPrisma.post.findUnique.mockResolvedValue({
        id: 'post-1',
        shortContent: 'Test post',
        userId: 'user-2',
      })
      mockPrisma.meToo.findFirst.mockResolvedValue(null)

      // First attempt should fail
      await request(app)
        .post('/api/metoo/post-1')
        .set('Authorization', 'Bearer valid-token')
        .expect(500)

      // Second attempt should succeed
      await request(app)
        .post('/api/metoo/post-1')
        .set('Authorization', 'Bearer valid-token')
        .expect(201)
    })
  })

  describe('Complete Follow Workflow', () => {
    it('handles full follow workflow with stats updates', async () => {
      const mockFollower = {
        id: 'user-1',
        username: 'follower',
        email: 'follower@example.com',
      }

      const mockFollowee = {
        id: 'user-2',
        username: 'followee',
        email: 'followee@example.com',
      }

      mockPrisma.user.findUnique
        .mockResolvedValueOnce(mockFollowee) // For follow request
        .mockResolvedValueOnce(mockFollowee) // For stats request

      mockPrisma.follow.findFirst.mockResolvedValue(null)
      mockPrisma.follow.create.mockResolvedValue({
        id: 'follow-1',
        followerId: 'user-1',
        followeeId: 'user-2',
      })

      mockPrisma.follow.count
        .mockResolvedValueOnce(5) // followers count
        .mockResolvedValueOnce(3) // following count

      // Step 1: Follow a user
      const followResponse = await request(app)
        .post('/api/follows/user-2')
        .set('Authorization', 'Bearer user-1-token')
        .expect(201)

      expect(followResponse.body.data.follow.followeeId).toBe('user-2')

      // Step 2: Get follow stats
      const statsResponse = await request(app)
        .get('/api/follows/user-2/stats')
        .expect(200)

      expect(statsResponse.body.data.followersCount).toBe(5)
      expect(statsResponse.body.data.followingCount).toBe(3)
    })

    it('prevents self-following', async () => {
      await request(app)
        .post('/api/follows/user-1')
        .set('Authorization', 'Bearer user-1-token')
        .expect(400)
    })

    it('handles duplicate follow attempts', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-2',
        username: 'followee',
      })

      mockPrisma.follow.findFirst.mockResolvedValue({
        id: 'existing-follow',
        followerId: 'user-1',
        followeeId: 'user-2',
      })

      await request(app)
        .post('/api/follows/user-2')
        .set('Authorization', 'Bearer user-1-token')
        .expect(400)
    })
  })

  describe('Profile Picture Upload Workflow', () => {
    it('handles complete profile picture upload workflow', async () => {
      const mockUser = {
        id: 'user-1',
        username: 'testuser',
        email: 'test@example.com',
        avatarUrl: null,
      }

      const updatedUser = {
        ...mockUser,
        avatarUrl: 'https://cloudinary.com/uploaded-image.jpg',
      }

      mockPrisma.user.findUnique.mockResolvedValue(mockUser)
      mockPrisma.user.update.mockResolvedValue(updatedUser)

      // Mock file upload (this would typically involve multipart/form-data)
      const uploadResponse = await request(app)
        .post('/api/profile-picture/upload')
        .set('Authorization', 'Bearer valid-token')
        .attach('profilePicture', Buffer.from('fake-image-data'), 'test.jpg')
        .expect(200)

      expect(uploadResponse.body.data.profilePictureUrl).toBe(
        'https://cloudinary.com/uploaded-image.jpg'
      )
    })

    it('validates file types and sizes', async () => {
      // Test invalid file type
      await request(app)
        .post('/api/profile-picture/upload')
        .set('Authorization', 'Bearer valid-token')
        .attach('profilePicture', Buffer.from('fake-data'), 'test.txt')
        .expect(400)

      // Test file too large (mock a large buffer)
      const largeBuffer = Buffer.alloc(6 * 1024 * 1024) // 6MB
      await request(app)
        .post('/api/profile-picture/upload')
        .set('Authorization', 'Bearer valid-token')
        .attach('profilePicture', largeBuffer, 'large.jpg')
        .expect(400)
    })

    it('handles profile picture deletion', async () => {
      const mockUser = {
        id: 'user-1',
        username: 'testuser',
        avatarUrl: 'https://cloudinary.com/old-image.jpg',
      }

      const updatedUser = {
        ...mockUser,
        avatarUrl: null,
      }

      mockPrisma.user.findUnique.mockResolvedValue(mockUser)
      mockPrisma.user.update.mockResolvedValue(updatedUser)

      const deleteResponse = await request(app)
        .delete('/api/profile-picture')
        .set('Authorization', 'Bearer valid-token')
        .expect(200)

      expect(deleteResponse.body.message).toBe('Profile picture removed successfully')
    })
  })

  describe('Data Consistency and Transaction Handling', () => {
    it('maintains data consistency during concurrent operations', async () => {
      // Mock transaction behavior
      mockPrisma.$transaction.mockImplementation(async (operations) => {
        const results = []
        for (const operation of operations) {
          results.push(await operation)
        }
        return results
      })

      const mockPost = {
        id: 'post-1',
        shortContent: 'Test post',
        userId: 'user-1',
      }

      mockPrisma.post.findUnique.mockResolvedValue(mockPost)
      mockPrisma.meToo.findFirst.mockResolvedValue(null)
      mockPrisma.meToo.create.mockResolvedValue({
        id: 'metoo-1',
        userId: 'user-2',
        postId: 'post-1',
      })
      mockPrisma.meToo.count.mockResolvedValue(1)

      // Simulate concurrent MeToo requests
      const requests = Array.from({ length: 3 }, (_, i) =>
        request(app)
          .post('/api/metoo/post-1')
          .set('Authorization', `Bearer user-${i + 2}-token`)
      )

      const responses = await Promise.allSettled(requests)

      // At least one should succeed, others might fail due to race conditions
      const successfulResponses = responses.filter(
        (response) => response.status === 'fulfilled' && response.value.status === 201
      )

      expect(successfulResponses.length).toBeGreaterThan(0)
    })

    it('handles database transaction rollbacks', async () => {
      // Mock transaction that fails partway through
      mockPrisma.$transaction.mockRejectedValue(new Error('Transaction failed'))

      mockPrisma.post.findUnique.mockResolvedValue({
        id: 'post-1',
        shortContent: 'Test post',
        userId: 'user-1',
      })

      await request(app)
        .post('/api/metoo/post-1')
        .set('Authorization', 'Bearer valid-token')
        .expect(500)

      // Verify that no partial data was created
      expect(mockPrisma.meToo.create).not.toHaveBeenCalled()
    })
  })

  describe('API Error Handling and Recovery', () => {
    it('provides consistent error responses across endpoints', async () => {
      // Test 404 errors
      mockPrisma.post.findUnique.mockResolvedValue(null)

      const notFoundResponse = await request(app)
        .get('/api/posts/non-existent')
        .expect(404)

      expect(notFoundResponse.body.error.code).toBe('NOT_FOUND')
      expect(notFoundResponse.body.error.message).toBe('Post not found')
      expect(notFoundResponse.body.correlationId).toBeDefined()

      // Test validation errors
      const validationResponse = await request(app)
        .post('/api/posts')
        .set('Authorization', 'Bearer valid-token')
        .send({}) // Missing required fields
        .expect(400)

      expect(validationResponse.body.error.code).toBe('VALIDATION_ERROR')
      expect(validationResponse.body.correlationId).toBeDefined()
    })

    it('handles service degradation gracefully', async () => {
      // Mock partial service failure
      mockPrisma.post.findMany.mockResolvedValue([
        {
          id: 'post-1',
          shortContent: 'Test post',
          userId: 'user-1',
          createdAt: new Date(),
          user: {
            id: 'user-1',
            username: 'testuser',
          },
        },
      ])
      mockPrisma.post.count.mockResolvedValue(1)

      // MeToo service fails
      mockPrisma.meToo.count.mockRejectedValue(new Error('MeToo service down'))

      const response = await request(app)
        .get('/api/posts')
        .expect(200)

      // Should still return posts with default values for failed services
      expect(response.body.data.posts).toHaveLength(1)
      expect(response.body.data.posts[0].meTooCount).toBe(0) // Default value
    })

    it('logs errors appropriately without exposing sensitive information', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      mockPrisma.post.findMany.mockRejectedValue(
        new Error('Database connection string: user:password@host')
      )

      const response = await request(app)
        .get('/api/posts')
        .expect(500)

      // Should log the full error internally
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Database connection string')
      )

      // Should not expose sensitive information in response
      expect(response.body.error.message).not.toContain('password')
      expect(response.body.error.message).toBe('Failed to fetch posts')

      consoleSpy.mockRestore()
    })
  })

  describe('Performance and Scalability', () => {
    it('handles high-volume requests efficiently', async () => {
      // Mock efficient database queries
      mockPrisma.post.findMany.mockResolvedValue([])
      mockPrisma.post.count.mockResolvedValue(0)

      const startTime = Date.now()

      // Simulate multiple concurrent requests
      const requests = Array.from({ length: 10 }, () =>
        request(app).get('/api/posts')
      )

      const responses = await Promise.all(requests)
      const endTime = Date.now()

      // All requests should succeed
      responses.forEach((response) => {
        expect(response.status).toBe(200)
      })

      // Should complete within reasonable time (adjust threshold as needed)
      expect(endTime - startTime).toBeLessThan(5000)
    })

    it('implements proper pagination', async () => {
      const mockPosts = Array.from({ length: 25 }, (_, i) => ({
        id: `post-${i + 1}`,
        shortContent: `Post ${i + 1}`,
        userId: 'user-1',
        createdAt: new Date(),
        user: { id: 'user-1', username: 'testuser' },
      }))

      mockPrisma.post.findMany.mockResolvedValue(mockPosts.slice(0, 20))
      mockPrisma.post.count.mockResolvedValue(25)

      const response = await request(app)
        .get('/api/posts?limit=20&offset=0')
        .expect(200)

      expect(response.body.data.posts).toHaveLength(20)
      expect(response.body.data.total).toBe(25)
      expect(response.body.data.hasMore).toBe(true)

      // Test second page
      mockPrisma.post.findMany.mockResolvedValue(mockPosts.slice(20, 25))

      const secondPageResponse = await request(app)
        .get('/api/posts?limit=20&offset=20')
        .expect(200)

      expect(secondPageResponse.body.data.posts).toHaveLength(5)
      expect(secondPageResponse.body.data.hasMore).toBe(false)
    })
  })
})