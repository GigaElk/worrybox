import request from 'supertest';
import express from 'express';
import { PrismaClient } from '@prisma/client';
import authRoutes from '../routes/auth';

// Mock Prisma
jest.mock('@prisma/client');
const mockPrisma = {
  user: {
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  subscription: {
    create: jest.fn(),
  },
  notificationPreferences: {
    create: jest.fn(),
  },
};

// Mock bcrypt
jest.mock('bcryptjs', () => ({
  hash: jest.fn().mockResolvedValue('hashedPassword'),
  compare: jest.fn().mockResolvedValue(true),
}));

// Mock JWT utils
jest.mock('../utils/jwt', () => ({
  generateTokens: jest.fn().mockReturnValue({
    token: 'mock-token',
    refreshToken: 'mock-refresh-token',
  }),
  verifyToken: jest.fn().mockReturnValue({
    userId: 'user-id',
    email: 'test@example.com',
    username: 'testuser',
  }),
}));

// Mock email utils
jest.mock('../utils/email', () => ({
  sendVerificationEmail: jest.fn().mockResolvedValue(undefined),
  sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined),
}));

const app = express();
app.use(express.json());
app.use('/auth', authRoutes);

describe('Auth Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /auth/register', () => {
    it('should register a new user successfully', async () => {
      const mockUser = {
        id: 'user-id',
        email: 'test@example.com',
        username: 'testuser',
        displayName: 'testuser',
        avatarUrl: null,
        emailVerified: false,
      };

      (mockPrisma.user.findFirst as jest.Mock).mockResolvedValue(null);
      (mockPrisma.user.create as jest.Mock).mockResolvedValue(mockUser);
      (mockPrisma.subscription.create as jest.Mock).mockResolvedValue({});
      (mockPrisma.notificationPreferences.create as jest.Mock).mockResolvedValue({});

      const response = await request(app)
        .post('/auth/register')
        .send({
          email: 'test@example.com',
          username: 'testuser',
          password: 'Password123',
        });

      expect(response.status).toBe(201);
      expect(response.body.message).toBe('Registration successful');
      expect(response.body.data.user.email).toBe('test@example.com');
      expect(response.body.data.token).toBe('mock-token');
    });

    it('should return error for existing email', async () => {
      (mockPrisma.user.findFirst as jest.Mock).mockResolvedValue({
        email: 'test@example.com',
      });

      const response = await request(app)
        .post('/auth/register')
        .send({
          email: 'test@example.com',
          username: 'testuser',
          password: 'Password123',
        });

      expect(response.status).toBe(400);
      expect(response.body.error.message).toBe('Email already registered');
    });

    it('should return validation error for invalid email', async () => {
      const response = await request(app)
        .post('/auth/register')
        .send({
          email: 'invalid-email',
          username: 'testuser',
          password: 'Password123',
        });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return validation error for weak password', async () => {
      const response = await request(app)
        .post('/auth/register')
        .send({
          email: 'test@example.com',
          username: 'testuser',
          password: 'weak',
        });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('POST /auth/login', () => {
    it('should login user successfully', async () => {
      const mockUser = {
        id: 'user-id',
        email: 'test@example.com',
        username: 'testuser',
        displayName: 'testuser',
        avatarUrl: null,
        emailVerified: true,
        passwordHash: 'hashedPassword',
      };

      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      const response = await request(app)
        .post('/auth/login')
        .send({
          email: 'test@example.com',
          password: 'Password123',
        });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Login successful');
      expect(response.body.data.user.email).toBe('test@example.com');
      expect(response.body.data.token).toBe('mock-token');
    });

    it('should return error for non-existent user', async () => {
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      const response = await request(app)
        .post('/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'Password123',
        });

      expect(response.status).toBe(401);
      expect(response.body.error.message).toBe('Invalid email or password');
    });

    it('should return validation error for invalid email format', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          email: 'invalid-email',
          password: 'Password123',
        });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('POST /auth/forgot-password', () => {
    it('should send password reset email', async () => {
      const mockUser = {
        id: 'user-id',
        email: 'test@example.com',
      };

      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      const response = await request(app)
        .post('/auth/forgot-password')
        .send({
          email: 'test@example.com',
        });

      expect(response.status).toBe(200);
      expect(response.body.message).toContain('password reset link has been sent');
    });

    it('should return success even for non-existent email', async () => {
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      const response = await request(app)
        .post('/auth/forgot-password')
        .send({
          email: 'nonexistent@example.com',
        });

      expect(response.status).toBe(200);
      expect(response.body.message).toContain('password reset link has been sent');
    });
  });
});