import request from 'supertest';
import express from 'express';
import { PrismaClient } from '@prisma/client';
import userRoutes from '../routes/users';

// Mock Prisma
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    user: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
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
app.use('/users', userRoutes);

describe('User Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('PUT /users/profile', () => {
    it('should update user profile successfully', async () => {
      const mockUpdatedUser = {
        id: 'user-id',
        email: 'test@example.com',
        username: 'testuser',
        displayName: 'Test User',
        bio: 'Updated bio',
        avatarUrl: 'https://example.com/avatar.jpg',
        emailVerified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (mockPrisma.user.update as jest.Mock).mockResolvedValue(mockUpdatedUser);

      const response = await request(app)
        .put('/users/profile')
        .set('Authorization', 'Bearer valid-token')
        .send({
          displayName: 'Test User',
          bio: 'Updated bio',
          avatarUrl: 'https://example.com/avatar.jpg',
        });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Profile updated successfully');
      expect(response.body.data.displayName).toBe('Test User');
      expect(response.body.data.bio).toBe('Updated bio');
    });

    it('should return validation error for invalid data', async () => {
      const response = await request(app)
        .put('/users/profile')
        .set('Authorization', 'Bearer valid-token')
        .send({
          displayName: '', // Invalid: empty string
          bio: 'a'.repeat(501), // Invalid: too long
          avatarUrl: 'not-a-url', // Invalid: not a URL
        });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return unauthorized without token', async () => {
      const response = await request(app)
        .put('/users/profile')
        .send({
          displayName: 'Test User',
        });

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('UNAUTHORIZED');
    });
  });

  describe('GET /users/profile', () => {
    it('should get user profile successfully', async () => {
      const mockUser = {
        id: 'user-id',
        email: 'test@example.com',
        username: 'testuser',
        displayName: 'Test User',
        bio: 'Test bio',
        avatarUrl: 'https://example.com/avatar.jpg',
        emailVerified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      const response = await request(app)
        .get('/users/profile')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(response.body.data.username).toBe('testuser');
      expect(response.body.data.email).toBe('test@example.com');
    });

    it('should return unauthorized without token', async () => {
      const response = await request(app)
        .get('/users/profile');

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('UNAUTHORIZED');
    });
  });

  describe('GET /users/username/:username', () => {
    it('should get user by username successfully', async () => {
      const mockUser = {
        id: 'user-id',
        email: 'test@example.com',
        username: 'testuser',
        displayName: 'Test User',
        bio: 'Test bio',
        avatarUrl: 'https://example.com/avatar.jpg',
        emailVerified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      const response = await request(app)
        .get('/users/username/testuser');

      expect(response.status).toBe(200);
      expect(response.body.data.username).toBe('testuser');
      expect(response.body.data.email).toBeUndefined(); // Email should not be exposed
    });

    it('should return 404 for non-existent user', async () => {
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      const response = await request(app)
        .get('/users/username/nonexistent');

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('USER_NOT_FOUND');
    });
  });

  describe('GET /users/search', () => {
    it('should search users successfully', async () => {
      const mockUsers = [
        {
          id: 'user-1',
          username: 'testuser1',
          displayName: 'Test User 1',
          avatarUrl: null,
          bio: 'Bio 1',
        },
        {
          id: 'user-2',
          username: 'testuser2',
          displayName: 'Test User 2',
          avatarUrl: null,
          bio: 'Bio 2',
        },
      ];

      (mockPrisma.user.findMany as jest.Mock).mockResolvedValue(mockUsers);
      (mockPrisma.user.count as jest.Mock).mockResolvedValue(2);

      const response = await request(app)
        .get('/users/search?query=test&limit=10');

      expect(response.status).toBe(200);
      expect(response.body.data.users).toHaveLength(2);
      expect(response.body.data.total).toBe(2);
      expect(response.body.data.hasMore).toBe(false);
    });

    it('should return validation error for invalid parameters', async () => {
      const response = await request(app)
        .get('/users/search?limit=100'); // Invalid: limit too high

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /users/username-available/:username', () => {
    it('should check username availability successfully', async () => {
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      const response = await request(app)
        .get('/users/username-available/newuser');

      expect(response.status).toBe(200);
      expect(response.body.data.available).toBe(true);
      expect(response.body.data.username).toBe('newuser');
    });

    it('should return false for taken username', async () => {
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'other-user-id',
        username: 'takenuser',
      });

      const response = await request(app)
        .get('/users/username-available/takenuser');

      expect(response.status).toBe(200);
      expect(response.body.data.available).toBe(false);
    });

    it('should return validation error for invalid username', async () => {
      const response = await request(app)
        .get('/users/username-available/ab'); // Invalid: too short

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('INVALID_USERNAME');
    });
  });
});