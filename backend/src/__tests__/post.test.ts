import request from 'supertest';
import express from 'express';
import { PrismaClient } from '@prisma/client';
import postRoutes from '../routes/posts';

// Mock Prisma
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    post: {
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
  })),
}));

const mockPrisma = new PrismaClient() as jest.Mocked<PrismaClient>;

// Mock JWT utils
jest.mock('../utils/jwt', () => ({
  verifyToken: jest.fn().mockReturnValue({
    userId: 'user-id',
    email: 'test@example.com',
    username: 'testuser',
  }),
}));

const app = express();
app.use(express.json());
app.use('/posts', postRoutes);

describe('Post Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /posts', () => {
    it('should create a post successfully', async () => {
      const mockPost = {
        id: 'post-id',
        userId: 'user-id',
        shortContent: 'This is my worry',
        longContent: null,
        worryPrompt: "What's weighing on your mind today?",
        privacyLevel: 'public',
        isScheduled: false,
        scheduledFor: null,
        publishedAt: new Date(),
        detectedLanguage: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        user: {
          id: 'user-id',
          username: 'testuser',
          displayName: 'Test User',
          avatarUrl: null,
        },
      };

      (mockPrisma.post.create as jest.Mock).mockResolvedValue(mockPost);

      const response = await request(app)
        .post('/posts')
        .set('Authorization', 'Bearer valid-token')
        .send({
          shortContent: 'This is my worry',
          worryPrompt: "What's weighing on your mind today?",
          privacyLevel: 'public',
        });

      expect(response.status).toBe(201);
      expect(response.body.message).toBe('Post created successfully');
      expect(response.body.data.shortContent).toBe('This is my worry');
    });

    it('should return validation error for invalid data', async () => {
      const response = await request(app)
        .post('/posts')
        .set('Authorization', 'Bearer valid-token')
        .send({
          shortContent: '', // Invalid: empty
          worryPrompt: 'Invalid prompt',
          privacyLevel: 'invalid',
        });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return unauthorized without token', async () => {
      const response = await request(app)
        .post('/posts')
        .send({
          shortContent: 'This is my worry',
          worryPrompt: "What's weighing on your mind today?",
          privacyLevel: 'public',
        });

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('UNAUTHORIZED');
    });
  });

  describe('GET /posts', () => {
    it('should get posts successfully', async () => {
      const mockPosts = [
        {
          id: 'post-1',
          userId: 'user-1',
          shortContent: 'First worry',
          longContent: null,
          worryPrompt: "What's weighing on your mind today?",
          privacyLevel: 'public',
          isScheduled: false,
          scheduledFor: null,
          publishedAt: new Date(),
          detectedLanguage: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          user: {
            id: 'user-1',
            username: 'user1',
            displayName: 'User One',
            avatarUrl: null,
          },
        },
      ];

      (mockPrisma.post.findMany as jest.Mock).mockResolvedValue(mockPosts);
      (mockPrisma.post.count as jest.Mock).mockResolvedValue(1);

      const response = await request(app)
        .get('/posts?limit=10');

      expect(response.status).toBe(200);
      expect(response.body.data.posts).toHaveLength(1);
      expect(response.body.data.total).toBe(1);
    });

    it('should return validation error for invalid parameters', async () => {
      const response = await request(app)
        .get('/posts?limit=100'); // Invalid: limit too high

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /posts/:postId', () => {
    it('should get a specific post successfully', async () => {
      const mockPost = {
        id: 'post-id',
        userId: 'user-id',
        shortContent: 'This is my worry',
        longContent: null,
        worryPrompt: "What's weighing on your mind today?",
        privacyLevel: 'public',
        isScheduled: false,
        scheduledFor: null,
        publishedAt: new Date(),
        detectedLanguage: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        user: {
          id: 'user-id',
          username: 'testuser',
          displayName: 'Test User',
          avatarUrl: null,
        },
      };

      (mockPrisma.post.findUnique as jest.Mock).mockResolvedValue(mockPost);

      const response = await request(app)
        .get('/posts/post-id');

      expect(response.status).toBe(200);
      expect(response.body.data.id).toBe('post-id');
    });

    it('should return 404 for non-existent post', async () => {
      (mockPrisma.post.findUnique as jest.Mock).mockResolvedValue(null);

      const response = await request(app)
        .get('/posts/non-existent');

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('POST_NOT_FOUND');
    });
  });

  describe('PUT /posts/:postId', () => {
    it('should update a post successfully', async () => {
      const mockExistingPost = {
        id: 'post-id',
        userId: 'user-id',
      };

      const mockUpdatedPost = {
        id: 'post-id',
        userId: 'user-id',
        shortContent: 'Updated worry',
        longContent: null,
        worryPrompt: "What's weighing on your mind today?",
        privacyLevel: 'public',
        isScheduled: false,
        scheduledFor: null,
        publishedAt: new Date(),
        detectedLanguage: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        user: {
          id: 'user-id',
          username: 'testuser',
          displayName: 'Test User',
          avatarUrl: null,
        },
      };

      (mockPrisma.post.findFirst as jest.Mock).mockResolvedValue(mockExistingPost);
      (mockPrisma.post.update as jest.Mock).mockResolvedValue(mockUpdatedPost);

      const response = await request(app)
        .put('/posts/post-id')
        .set('Authorization', 'Bearer valid-token')
        .send({
          shortContent: 'Updated worry',
        });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Post updated successfully');
      expect(response.body.data.shortContent).toBe('Updated worry');
    });

    it('should return 404 for non-existent post', async () => {
      (mockPrisma.post.findFirst as jest.Mock).mockResolvedValue(null);

      const response = await request(app)
        .put('/posts/non-existent')
        .set('Authorization', 'Bearer valid-token')
        .send({
          shortContent: 'Updated worry',
        });

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('POST_NOT_FOUND');
    });
  });

  describe('DELETE /posts/:postId', () => {
    it('should delete a post successfully', async () => {
      const mockExistingPost = {
        id: 'post-id',
        userId: 'user-id',
      };

      (mockPrisma.post.findFirst as jest.Mock).mockResolvedValue(mockExistingPost);
      (mockPrisma.post.delete as jest.Mock).mockResolvedValue({});

      const response = await request(app)
        .delete('/posts/post-id')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Post deleted successfully');
    });

    it('should return 404 for non-existent post', async () => {
      (mockPrisma.post.findFirst as jest.Mock).mockResolvedValue(null);

      const response = await request(app)
        .delete('/posts/non-existent')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('POST_NOT_FOUND');
    });
  });

  describe('POST /posts/:postId/blog', () => {
    it('should add blog content successfully', async () => {
      const mockExistingPost = {
        id: 'post-id',
        userId: 'user-id',
      };

      const mockUpdatedPost = {
        id: 'post-id',
        userId: 'user-id',
        shortContent: 'Original worry',
        longContent: 'Extended blog content',
        worryPrompt: "What's weighing on your mind today?",
        privacyLevel: 'public',
        isScheduled: false,
        scheduledFor: null,
        publishedAt: new Date(),
        detectedLanguage: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        user: {
          id: 'user-id',
          username: 'testuser',
          displayName: 'Test User',
          avatarUrl: null,
        },
      };

      (mockPrisma.post.findFirst as jest.Mock).mockResolvedValue(mockExistingPost);
      (mockPrisma.post.update as jest.Mock).mockResolvedValue(mockUpdatedPost);

      const response = await request(app)
        .post('/posts/post-id/blog')
        .set('Authorization', 'Bearer valid-token')
        .send({
          longContent: 'Extended blog content',
        });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Blog content added successfully');
      expect(response.body.data.longContent).toBe('Extended blog content');
    });

    it('should return validation error for invalid blog content', async () => {
      const response = await request(app)
        .post('/posts/post-id/blog')
        .set('Authorization', 'Bearer valid-token')
        .send({
          longContent: '', // Invalid: empty
        });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('DELETE /posts/:postId/blog', () => {
    it('should remove blog content successfully', async () => {
      const mockExistingPost = {
        id: 'post-id',
        userId: 'user-id',
      };

      const mockUpdatedPost = {
        id: 'post-id',
        userId: 'user-id',
        shortContent: 'Original worry',
        longContent: null,
        worryPrompt: "What's weighing on your mind today?",
        privacyLevel: 'public',
        isScheduled: false,
        scheduledFor: null,
        publishedAt: new Date(),
        detectedLanguage: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        user: {
          id: 'user-id',
          username: 'testuser',
          displayName: 'Test User',
          avatarUrl: null,
        },
      };

      (mockPrisma.post.findFirst as jest.Mock).mockResolvedValue(mockExistingPost);
      (mockPrisma.post.update as jest.Mock).mockResolvedValue(mockUpdatedPost);

      const response = await request(app)
        .delete('/posts/post-id/blog')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Blog content removed successfully');
      expect(response.body.data.longContent).toBeUndefined();
    });
  });

  describe('GET /posts/prompts', () => {
    it('should get worry prompts successfully', async () => {
      const response = await request(app)
        .get('/posts/prompts');

      expect(response.status).toBe(200);
      expect(response.body.data.prompts).toBeDefined();
      expect(Array.isArray(response.body.data.prompts)).toBe(true);
      expect(response.body.data.prompts.length).toBeGreaterThan(0);
    });
  });
});