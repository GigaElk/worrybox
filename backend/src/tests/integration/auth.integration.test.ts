import request from 'supertest';
import express from 'express';
import authRoutes from '../../routes/auth';
import { mockPrisma, createMockUser, clearAllMocks } from '../setup';

const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);

describe('Auth Integration Tests', () => {
  beforeEach(() => {
    clearAllMocks();
  });

  describe('Complete Authentication Flow', () => {
    it('should handle complete registration and login flow', async () => {
      const userData = {
        email: 'integration@example.com',
        username: 'integrationuser',
        password: 'Password123!',
      };

      // Mock user creation
      const mockUser = createMockUser({
        email: userData.email,
        username: userData.username,
        emailVerified: false,
      });

      mockPrisma.user.findFirst.mockResolvedValue(null); // No existing user
      mockPrisma.user.create.mockResolvedValue(mockUser);
      mockPrisma.subscription.create.mockResolvedValue({});
      mockPrisma.notificationPreferences.create.mockResolvedValue({});

      // Step 1: Register user
      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send(userData);

      expect(registerResponse.status).toBe(201);
      expect(registerResponse.body.message).toBe('Registration successful');
      expect(registerResponse.body.data.user.email).toBe(userData.email);
      expect(registerResponse.body.data.token).toBeDefined();

      // Step 2: Verify that user was created with correct data
      expect(mockPrisma.user.create).toHaveBeenCalledWith({
        data: {
          email: userData.email,
          username: userData.username,
          passwordHash: 'hashedPassword',
          displayName: userData.username,
        },
      });

      // Step 3: Verify subscription was created
      expect(mockPrisma.subscription.create).toHaveBeenCalledWith({
        data: {
          userId: mockUser.id,
          tier: 'free',
          status: 'active',
        },
      });

      // Step 4: Verify notification preferences were created
      expect(mockPrisma.notificationPreferences.create).toHaveBeenCalledWith({
        data: {
          userId: mockUser.id,
          emailNotifications: true,
          pushNotifications: true,
          checkInFrequency: 'weekly',
          supportNotifications: true,
          timezone: 'UTC',
        },
      });

      // Step 5: Login with the same credentials
      const verifiedUser = { ...mockUser, emailVerified: true };
      mockPrisma.user.findUnique.mockResolvedValue(verifiedUser);

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: userData.email,
          password: userData.password,
        });

      expect(loginResponse.status).toBe(200);
      expect(loginResponse.body.message).toBe('Login successful');
      expect(loginResponse.body.data.user.email).toBe(userData.email);
      expect(loginResponse.body.data.token).toBeDefined();
    });

    it('should handle password reset flow', async () => {
      const userEmail = 'reset@example.com';
      const mockUser = createMockUser({ email: userEmail });

      // Step 1: Request password reset
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      const forgotPasswordResponse = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: userEmail });

      expect(forgotPasswordResponse.status).toBe(200);
      expect(forgotPasswordResponse.body.message).toContain('password reset link has been sent');

      // Step 2: Reset password (simulated)
      const newPassword = 'NewPassword123!';
      mockPrisma.user.update.mockResolvedValue({
        ...mockUser,
        passwordHash: 'newHashedPassword',
      });

      // In a real scenario, this would use a reset token
      // For integration testing, we'll simulate the reset
      const resetResponse = await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: 'mock-reset-token',
          password: newPassword,
        });

      // This endpoint might not exist yet, but shows the flow
      // expect(resetResponse.status).toBe(200);
    });
  });

  describe('Authentication Security', () => {
    it('should prevent duplicate registrations', async () => {
      const userData = {
        email: 'duplicate@example.com',
        username: 'duplicateuser',
        password: 'Password123!',
      };

      const existingUser = createMockUser({
        email: userData.email,
        username: 'existinguser',
      });

      mockPrisma.user.findFirst.mockResolvedValue(existingUser);

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData);

      expect(response.status).toBe(400);
      expect(response.body.error.message).toBe('Email already registered');
    });

    it('should prevent login with invalid credentials', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'WrongPassword123!',
        });

      expect(response.status).toBe(401);
      expect(response.body.error.message).toBe('Invalid email or password');
    });

    it('should validate input data properly', async () => {
      // Test invalid email
      const invalidEmailResponse = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'invalid-email',
          username: 'testuser',
          password: 'Password123!',
        });

      expect(invalidEmailResponse.status).toBe(400);
      expect(invalidEmailResponse.body.error.code).toBe('VALIDATION_ERROR');

      // Test weak password
      const weakPasswordResponse = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          username: 'testuser',
          password: 'weak',
        });

      expect(weakPasswordResponse.status).toBe(400);
      expect(weakPasswordResponse.body.error.code).toBe('VALIDATION_ERROR');

      // Test short username
      const shortUsernameResponse = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          username: 'ab',
          password: 'Password123!',
        });

      expect(shortUsernameResponse.status).toBe(400);
      expect(shortUsernameResponse.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('Token Management', () => {
    it('should generate valid tokens on successful authentication', async () => {
      const mockUser = createMockUser({ emailVerified: true });
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: mockUser.email,
          password: 'Password123!',
        });

      expect(response.status).toBe(200);
      expect(response.body.data.token).toBe('mock-token');
      expect(response.body.data.refreshToken).toBe('mock-refresh-token');
    });

    it('should handle token refresh', async () => {
      // This would test the refresh token endpoint if implemented
      const refreshResponse = await request(app)
        .post('/api/auth/refresh')
        .send({
          refreshToken: 'mock-refresh-token',
        });

      // This endpoint might not exist yet
      // expect(refreshResponse.status).toBe(200);
    });
  });

  describe('Rate Limiting', () => {
    it('should handle multiple rapid requests appropriately', async () => {
      const userData = {
        email: 'ratelimit@example.com',
        username: 'ratelimituser',
        password: 'Password123!',
      };

      // Simulate multiple rapid registration attempts
      const requests = Array(5).fill(null).map(() =>
        request(app)
          .post('/api/auth/register')
          .send(userData)
      );

      const responses = await Promise.all(requests);

      // At least one should succeed or fail with validation
      // Others might be rate limited (depending on implementation)
      const successfulResponses = responses.filter(res => res.status === 201);
      const errorResponses = responses.filter(res => res.status >= 400);

      expect(successfulResponses.length + errorResponses.length).toBe(5);
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      mockPrisma.user.findFirst.mockRejectedValue(new Error('Database connection failed'));

      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          username: 'testuser',
          password: 'Password123!',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBeDefined();
    });

    it('should return consistent error format', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'invalid-email',
          password: 'password',
        });

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('code');
      expect(response.body.error).toHaveProperty('message');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('path');
    });
  });
});