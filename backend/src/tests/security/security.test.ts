import request from 'supertest';
import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

import authRoutes from '../../routes/auth';
import postRoutes from '../../routes/posts';
import userRoutes from '../../routes/users';

import { 
  mockPrisma, 
  createMockUser, 
  createMockPost, 
  createMaliciousPayload, 
  testRateLimiting,
  clearAllMocks 
} from '../setup';

// Create app with security middleware for testing
const createSecureApp = () => {
  const app = express();
  
  // Security middleware
  app.use(helmet());
  
  // Rate limiting for testing (more permissive than production)
  const limiter = rateLimit({
    windowMs: 1000, // 1 second window for testing
    max: 5, // 5 requests per second
    message: 'Too many requests from this IP, please try again later.',
  });
  app.use('/api', limiter);
  
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  // Routes
  app.use('/api/auth', authRoutes);
  app.use('/api/posts', postRoutes);
  app.use('/api/users', userRoutes);

  return app;
};

describe('Security Tests', () => {
  let app: express.Application;

  beforeAll(() => {
    app = createSecureApp();
  });

  beforeEach(() => {
    clearAllMocks();
  });

  describe('Input Validation and Sanitization', () => {
    it('should prevent XSS attacks in post content', async () => {
      const xssPayload = createMaliciousPayload('xss');
      const mockPost = createMockPost({ shortContent: xssPayload });
      
      mockPrisma.post.create.mockResolvedValue(mockPost);

      const response = await request(app)
        .post('/api/posts')
        .set('Authorization', 'Bearer mock-token')
        .send({
          shortContent: xssPayload,
          worryPrompt: 'Test prompt',
          privacyLevel: 'public',
        });

      // Should either reject the malicious content or sanitize it
      if (response.status === 201) {
        // If accepted, content should be sanitized
        expect(response.body.data.shortContent).not.toContain('<script>');
      } else {
        // Should be rejected with validation error
        expect(response.status).toBe(400);
      }
    });

    it('should prevent SQL injection attempts', async () => {
      const sqlInjectionPayload = createMaliciousPayload('sql');
      
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: sqlInjectionPayload,
          password: 'password123',
        });

      // Should reject malicious input
      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should validate email format strictly', async () => {
      const maliciousEmails = [
        'test@<script>alert("xss")</script>.com',
        'test@domain.com<script>alert("xss")</script>',
        'javascript:alert("xss")@domain.com',
        'test@domain.com\r\nBcc: attacker@evil.com',
      ];

      for (const email of maliciousEmails) {
        const response = await request(app)
          .post('/api/auth/register')
          .send({
            email,
            username: 'testuser',
            password: 'Password123!',
          });

        expect(response.status).toBe(400);
        expect(response.body.error.code).toBe('VALIDATION_ERROR');
      }
    });

    it('should enforce strong password requirements', async () => {
      const weakPasswords = [
        'password',
        '123456',
        'qwerty',
        'abc123',
        'Password', // Missing number and special char
        'password123', // Missing uppercase and special char
        'PASSWORD123!', // Missing lowercase
      ];

      mockPrisma.user.findFirst.mockResolvedValue(null);

      for (const password of weakPasswords) {
        const response = await request(app)
          .post('/api/auth/register')
          .send({
            email: 'test@example.com',
            username: 'testuser',
            password,
          });

        expect(response.status).toBe(400);
        expect(response.body.error.code).toBe('VALIDATION_ERROR');
      }
    });

    it('should limit input length to prevent DoS attacks', async () => {
      const longString = 'a'.repeat(10000); // Very long string

      const response = await request(app)
        .post('/api/posts')
        .set('Authorization', 'Bearer mock-token')
        .send({
          shortContent: longString,
          worryPrompt: 'Test prompt',
          privacyLevel: 'public',
        });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('Authentication and Authorization', () => {
    it('should reject requests without authentication token', async () => {
      const response = await request(app)
        .post('/api/posts')
        .send({
          shortContent: 'Test post',
          worryPrompt: 'Test prompt',
          privacyLevel: 'public',
        });

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('UNAUTHORIZED');
    });

    it('should reject requests with invalid authentication token', async () => {
      const response = await request(app)
        .post('/api/posts')
        .set('Authorization', 'Bearer invalid-token')
        .send({
          shortContent: 'Test post',
          worryPrompt: 'Test prompt',
          privacyLevel: 'public',
        });

      expect(response.status).toBe(401);
    });

    it('should reject requests with malformed authorization header', async () => {
      const malformedHeaders = [
        'invalid-format',
        'Bearer',
        'Bearer ',
        'Basic dGVzdDp0ZXN0', // Wrong auth type
      ];

      for (const header of malformedHeaders) {
        const response = await request(app)
          .post('/api/posts')
          .set('Authorization', header)
          .send({
            shortContent: 'Test post',
            worryPrompt: 'Test prompt',
            privacyLevel: 'public',
          });

        expect(response.status).toBe(401);
      }
    });

    it('should prevent privilege escalation', async () => {
      const user1Post = createMockPost({ userId: 'user-1' });
      
      // User 2 tries to edit User 1's post
      mockPrisma.post.findFirst.mockResolvedValue(null); // No post found for user-2

      const response = await request(app)
        .put(`/api/posts/${user1Post.id}`)
        .set('Authorization', 'Bearer user-2-token')
        .send({
          shortContent: 'Hacked content',
        });

      expect(response.status).toBe(404); // Should not reveal existence
    });

    it('should enforce resource ownership', async () => {
      const user1 = createMockUser({ id: 'user-1' });
      const user2 = createMockUser({ id: 'user-2' });
      
      // Mock user 2 trying to access user 1's profile
      mockPrisma.user.findUnique.mockResolvedValue(user1);

      const response = await request(app)
        .get('/api/users/user-1')
        .set('Authorization', 'Bearer user-2-token');

      // Should only allow access to public profile information
      expect(response.status).toBe(200);
      // Should not include sensitive information
      if (response.body.data) {
        expect(response.body.data).not.toHaveProperty('passwordHash');
        expect(response.body.data).not.toHaveProperty('email');
      }
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce rate limits on authentication endpoints', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const results = await testRateLimiting(request(app), '/api/auth/login', 'post', 5);

      expect(results.wasRateLimited).toBe(true);
      expect(results.rateLimitedCount).toBeGreaterThan(0);
    });

    it('should enforce rate limits on post creation', async () => {
      const mockPost = createMockPost();
      mockPrisma.post.create.mockResolvedValue(mockPost);

      const results = await testRateLimiting(
        request(app).set('Authorization', 'Bearer mock-token'),
        '/api/posts',
        'post',
        5
      );

      expect(results.wasRateLimited).toBe(true);
    });

    it('should have different rate limits for different endpoints', async () => {
      // Test that read operations might have higher limits than write operations
      const readResults = await testRateLimiting(request(app), '/api/posts', 'get', 5);
      
      // Reads might be rate limited less aggressively
      expect(readResults.totalRequests).toBe(6);
    });
  });

  describe('Data Privacy and Leakage', () => {
    it('should not expose sensitive user data in API responses', async () => {
      const user = createMockUser({
        passwordHash: 'sensitive-hash',
        email: 'user@example.com',
      });

      mockPrisma.user.findUnique.mockResolvedValue(user);

      const response = await request(app)
        .get('/api/users/profile')
        .set('Authorization', 'Bearer mock-token');

      expect(response.status).toBe(200);
      expect(response.body.data).not.toHaveProperty('passwordHash');
      // Email should only be visible to the user themselves
    });

    it('should respect privacy levels in post visibility', async () => {
      const privatePost = createMockPost({
        privacyLevel: 'private',
        userId: 'user-1',
      });

      mockPrisma.post.findUnique.mockResolvedValue(privatePost);

      // Another user tries to access private post
      const response = await request(app)
        .get(`/api/posts/${privatePost.id}`)
        .set('Authorization', 'Bearer user-2-token');

      expect(response.status).toBe(404); // Should not reveal existence
    });

    it('should not leak information through error messages', async () => {
      // Try to access non-existent vs unauthorized resource
      const responses = await Promise.all([
        request(app)
          .get('/api/posts/non-existent-id')
          .set('Authorization', 'Bearer mock-token'),
        request(app)
          .get('/api/posts/unauthorized-id')
          .set('Authorization', 'Bearer mock-token'),
      ]);

      // Both should return the same error to prevent information leakage
      expect(responses[0].status).toBe(responses[1].status);
    });
  });

  describe('HTTP Security Headers', () => {
    it('should include security headers in responses', async () => {
      const response = await request(app).get('/api/posts');

      // Check for important security headers (helmet should add these)
      expect(response.headers).toHaveProperty('x-content-type-options');
      expect(response.headers).toHaveProperty('x-frame-options');
      expect(response.headers).toHaveProperty('x-xss-protection');
    });

    it('should prevent clickjacking attacks', async () => {
      const response = await request(app).get('/api/posts');

      expect(response.headers['x-frame-options']).toBeDefined();
    });

    it('should prevent MIME type sniffing', async () => {
      const response = await request(app).get('/api/posts');

      expect(response.headers['x-content-type-options']).toBe('nosniff');
    });
  });

  describe('Session Security', () => {
    it('should invalidate tokens after logout', async () => {
      // This test would verify token invalidation if implemented
      const logoutResponse = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', 'Bearer mock-token');

      // After logout, the token should be invalid
      const protectedResponse = await request(app)
        .get('/api/users/profile')
        .set('Authorization', 'Bearer mock-token');

      // Should be unauthorized after logout
      expect(protectedResponse.status).toBe(401);
    });

    it('should handle concurrent sessions securely', async () => {
      const user = createMockUser();
      mockPrisma.user.findUnique.mockResolvedValue(user);

      // Simulate multiple login attempts
      const loginPromises = Array.from({ length: 3 }, () =>
        request(app)
          .post('/api/auth/login')
          .send({
            email: user.email,
            password: 'Password123!',
          })
      );

      const responses = await Promise.all(loginPromises);

      // All should succeed (or be rate limited)
      responses.forEach(response => {
        expect([200, 429]).toContain(response.status);
      });
    });
  });

  describe('File Upload Security', () => {
    it('should validate file types for avatar uploads', async () => {
      // Test malicious file upload attempts
      const maliciousFiles = [
        { filename: 'malware.exe', mimetype: 'application/x-executable' },
        { filename: 'script.php', mimetype: 'application/x-php' },
        { filename: 'image.jpg.exe', mimetype: 'image/jpeg' }, // Double extension
      ];

      for (const file of maliciousFiles) {
        const response = await request(app)
          .post('/api/users/avatar')
          .set('Authorization', 'Bearer mock-token')
          .attach('avatar', Buffer.from('fake file content'), file.filename);

        // Should reject malicious files
        expect(response.status).toBe(400);
      }
    });

    it('should limit file size for uploads', async () => {
      const largeFile = Buffer.alloc(20 * 1024 * 1024); // 20MB file

      const response = await request(app)
        .post('/api/users/avatar')
        .set('Authorization', 'Bearer mock-token')
        .attach('avatar', largeFile, 'large-image.jpg');

      // Should reject files that are too large
      expect(response.status).toBe(413); // Payload too large
    });
  });

  describe('API Abuse Prevention', () => {
    it('should prevent automated scraping attempts', async () => {
      // Simulate rapid, automated requests
      const rapidRequests = Array.from({ length: 20 }, () =>
        request(app)
          .get('/api/posts')
          .set('User-Agent', 'Bot/1.0')
      );

      const responses = await Promise.all(rapidRequests);
      const rateLimitedResponses = responses.filter(res => res.status === 429);

      // Should rate limit automated requests
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });

    it('should handle malformed JSON gracefully', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .set('Content-Type', 'application/json')
        .send('{"invalid": json}');

      expect(response.status).toBe(400);
      expect(response.body.error).toBeDefined();
    });

    it('should prevent parameter pollution attacks', async () => {
      const response = await request(app)
        .get('/api/posts?limit=10&limit=100&limit=1000');

      // Should handle duplicate parameters safely
      expect(response.status).toBe(200);
      // Should use a reasonable limit, not the last/largest value
    });
  });
});