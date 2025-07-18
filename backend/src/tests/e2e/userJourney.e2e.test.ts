import request from 'supertest';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';

// Import all routes
import authRoutes from '../../routes/auth';
import userRoutes from '../../routes/users';
import postRoutes from '../../routes/posts';
import followRoutes from '../../routes/follows';
import dashboardRoutes from '../../routes/dashboard';

import { mockPrisma, createMockUser, createMockPost, clearAllMocks } from '../setup';

// Create a full app instance for E2E testing
const createTestApp = () => {
  const app = express();
  
  // Middleware
  app.use(helmet());
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Routes
  app.use('/api/auth', authRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/posts', postRoutes);
  app.use('/api/follows', followRoutes);
  app.use('/api/dashboard', dashboardRoutes);

  return app;
};

describe('End-to-End User Journeys', () => {
  let app: express.Application;

  beforeAll(() => {
    app = createTestApp();
  });

  beforeEach(() => {
    clearAllMocks();
  });

  describe('Complete New User Journey', () => {
    it('should handle complete user onboarding and first post creation', async () => {
      const userData = {
        email: 'newuser@example.com',
        username: 'newuser',
        password: 'SecurePassword123!',
      };

      // Step 1: User Registration
      const mockUser = createMockUser({
        id: 'new-user-123',
        email: userData.email,
        username: userData.username,
      });

      mockPrisma.user.findFirst.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue(mockUser);
      mockPrisma.subscription.create.mockResolvedValue({});
      mockPrisma.notificationPreferences.create.mockResolvedValue({});

      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send(userData);

      expect(registerResponse.status).toBe(201);
      const { token } = registerResponse.body.data;

      // Step 2: Get User Profile
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      const profileResponse = await request(app)
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${token}`);

      expect(profileResponse.status).toBe(200);
      expect(profileResponse.body.data.email).toBe(userData.email);

      // Step 3: Update Profile
      const updatedUser = { ...mockUser, displayName: 'New User Display', bio: 'Hello world!' };
      mockPrisma.user.update.mockResolvedValue(updatedUser);

      const updateProfileResponse = await request(app)
        .put('/api/users/profile')
        .set('Authorization', `Bearer ${token}`)
        .send({
          displayName: 'New User Display',
          bio: 'Hello world!',
        });

      expect(updateProfileResponse.status).toBe(200);
      expect(updateProfileResponse.body.data.displayName).toBe('New User Display');

      // Step 4: Create First Post
      const mockPost = createMockPost({
        id: 'first-post-123',
        userId: mockUser.id,
        shortContent: 'My first worry post',
        worryPrompt: 'What is worrying you today?',
      });

      mockPrisma.post.create.mockResolvedValue(mockPost);

      const createPostResponse = await request(app)
        .post('/api/posts')
        .set('Authorization', `Bearer ${token}`)
        .send({
          shortContent: 'My first worry post',
          worryPrompt: 'What is worrying you today?',
          privacyLevel: 'public',
        });

      expect(createPostResponse.status).toBe(201);
      expect(createPostResponse.body.data.shortContent).toBe('My first worry post');

      // Step 5: View Dashboard (should show the new post)
      mockPrisma.post.count
        .mockResolvedValueOnce(1) // totalWorries
        .mockResolvedValueOnce(1) // worriesThisWeek
        .mockResolvedValueOnce(0); // resolvedWorries
      mockPrisma.follow.count
        .mockResolvedValueOnce(0) // followers
        .mockResolvedValueOnce(0); // following
      mockPrisma.worryResolution.count.mockResolvedValue(0);
      mockPrisma.post.findMany.mockResolvedValue([mockPost]);

      const dashboardResponse = await request(app)
        .get('/api/dashboard')
        .set('Authorization', `Bearer ${token}`);

      expect(dashboardResponse.status).toBe(200);
      expect(dashboardResponse.body.data.stats.totalWorries).toBe(1);
      expect(dashboardResponse.body.data.recentWorries).toHaveLength(1);

      // Step 6: Get Posts Feed
      mockPrisma.post.findMany.mockResolvedValue([mockPost]);
      mockPrisma.post.count.mockResolvedValue(1);

      const feedResponse = await request(app)
        .get('/api/posts')
        .set('Authorization', `Bearer ${token}`);

      expect(feedResponse.status).toBe(200);
      expect(feedResponse.body.data.posts).toHaveLength(1);
      expect(feedResponse.body.data.posts[0].shortContent).toBe('My first worry post');
    });
  });

  describe('Social Interaction Journey', () => {
    it('should handle user following and personalized feed', async () => {
      const user1 = createMockUser({ id: 'user-1', username: 'user1' });
      const user2 = createMockUser({ id: 'user-2', username: 'user2' });
      const token1 = 'token-user-1';
      const token2 = 'token-user-2';

      // Step 1: User 1 follows User 2
      mockPrisma.user.findUnique
        .mockResolvedValueOnce(user1)
        .mockResolvedValueOnce(user2);
      mockPrisma.follow.findFirst.mockResolvedValue(null);
      mockPrisma.follow.create.mockResolvedValue({
        id: 'follow-123',
        followerId: user1.id,
        followingId: user2.id,
        createdAt: new Date(),
        follower: user1,
        following: user2,
      });

      const followResponse = await request(app)
        .post('/api/follows')
        .set('Authorization', `Bearer ${token1}`)
        .send({ userId: user2.id });

      expect(followResponse.status).toBe(201);

      // Step 2: User 2 creates a post
      const user2Post = createMockPost({
        id: 'user2-post',
        userId: user2.id,
        shortContent: 'User 2 worry',
        user: user2,
      });

      mockPrisma.post.create.mockResolvedValue(user2Post);

      const createPostResponse = await request(app)
        .post('/api/posts')
        .set('Authorization', `Bearer ${token2}`)
        .send({
          shortContent: 'User 2 worry',
          worryPrompt: 'What is worrying you?',
          privacyLevel: 'public',
        });

      expect(createPostResponse.status).toBe(201);

      // Step 3: User 1 gets personalized feed (should include User 2's post)
      mockPrisma.follow.findMany.mockResolvedValue([{ followingId: user2.id }]);
      mockPrisma.post.findMany.mockResolvedValue([user2Post]);
      mockPrisma.post.count.mockResolvedValue(1);

      const personalizedFeedResponse = await request(app)
        .get('/api/posts/feed/personalized')
        .set('Authorization', `Bearer ${token1}`);

      expect(personalizedFeedResponse.status).toBe(200);
      expect(personalizedFeedResponse.body.data.posts).toHaveLength(1);
      expect(personalizedFeedResponse.body.data.posts[0].userId).toBe(user2.id);

      // Step 4: User 1 unfollows User 2
      mockPrisma.follow.findFirst.mockResolvedValue({
        id: 'follow-123',
        followerId: user1.id,
        followingId: user2.id,
      });
      mockPrisma.follow.delete.mockResolvedValue({});

      const unfollowResponse = await request(app)
        .delete('/api/follows')
        .set('Authorization', `Bearer ${token1}`)
        .send({ userId: user2.id });

      expect(unfollowResponse.status).toBe(200);

      // Step 5: User 1's personalized feed should be empty
      mockPrisma.follow.findMany.mockResolvedValue([]);
      mockPrisma.post.findMany.mockResolvedValue([]);
      mockPrisma.post.count.mockResolvedValue(0);

      const emptyFeedResponse = await request(app)
        .get('/api/posts/feed/personalized')
        .set('Authorization', `Bearer ${token1}`);

      expect(emptyFeedResponse.status).toBe(200);
      expect(emptyFeedResponse.body.data.posts).toHaveLength(0);
    });
  });

  describe('Post Management Journey', () => {
    it('should handle complete post lifecycle', async () => {
      const user = createMockUser();
      const token = 'user-token';

      // Step 1: Create a post
      const mockPost = createMockPost({
        id: 'lifecycle-post',
        userId: user.id,
        shortContent: 'Original content',
        longContent: null,
      });

      mockPrisma.post.create.mockResolvedValue(mockPost);

      const createResponse = await request(app)
        .post('/api/posts')
        .set('Authorization', `Bearer ${token}`)
        .send({
          shortContent: 'Original content',
          worryPrompt: 'What is worrying you?',
          privacyLevel: 'public',
        });

      expect(createResponse.status).toBe(201);

      // Step 2: Update the post
      const updatedPost = { ...mockPost, shortContent: 'Updated content' };
      mockPrisma.post.findFirst.mockResolvedValue(mockPost);
      mockPrisma.post.update.mockResolvedValue(updatedPost);

      const updateResponse = await request(app)
        .put(`/api/posts/${mockPost.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          shortContent: 'Updated content',
          privacyLevel: 'friends',
        });

      expect(updateResponse.status).toBe(200);
      expect(updateResponse.body.data.shortContent).toBe('Updated content');

      // Step 3: Add blog content
      const postWithBlog = { ...updatedPost, longContent: 'Detailed blog content' };
      mockPrisma.post.findFirst.mockResolvedValue(updatedPost);
      mockPrisma.post.update.mockResolvedValue(postWithBlog);

      const addBlogResponse = await request(app)
        .post(`/api/posts/${mockPost.id}/blog`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          longContent: 'Detailed blog content',
        });

      expect(addBlogResponse.status).toBe(200);
      expect(addBlogResponse.body.data.longContent).toBe('Detailed blog content');

      // Step 4: Remove blog content
      const postWithoutBlog = { ...postWithBlog, longContent: null };
      mockPrisma.post.findFirst.mockResolvedValue(postWithBlog);
      mockPrisma.post.update.mockResolvedValue(postWithoutBlog);

      const removeBlogResponse = await request(app)
        .delete(`/api/posts/${mockPost.id}/blog`)
        .set('Authorization', `Bearer ${token}`);

      expect(removeBlogResponse.status).toBe(200);
      expect(removeBlogResponse.body.data.longContent).toBeUndefined();

      // Step 5: Delete the post
      mockPrisma.post.findFirst.mockResolvedValue(postWithoutBlog);
      mockPrisma.post.delete.mockResolvedValue(postWithoutBlog);

      const deleteResponse = await request(app)
        .delete(`/api/posts/${mockPost.id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(deleteResponse.status).toBe(200);
    });
  });

  describe('Privacy and Security Journey', () => {
    it('should enforce privacy controls throughout user journey', async () => {
      const user1 = createMockUser({ id: 'user-1' });
      const user2 = createMockUser({ id: 'user-2' });
      const token1 = 'token-1';
      const token2 = 'token-2';

      // Step 1: User 1 creates a private post
      const privatePost = createMockPost({
        id: 'private-post',
        userId: user1.id,
        privacyLevel: 'private',
        shortContent: 'Private worry',
      });

      mockPrisma.post.create.mockResolvedValue(privatePost);

      const createPrivatePostResponse = await request(app)
        .post('/api/posts')
        .set('Authorization', `Bearer ${token1}`)
        .send({
          shortContent: 'Private worry',
          worryPrompt: 'Private worry prompt',
          privacyLevel: 'private',
        });

      expect(createPrivatePostResponse.status).toBe(201);

      // Step 2: User 2 tries to access User 1's private post (should fail)
      mockPrisma.post.findUnique.mockResolvedValue(privatePost);

      const accessPrivatePostResponse = await request(app)
        .get(`/api/posts/${privatePost.id}`)
        .set('Authorization', `Bearer ${token2}`);

      expect(accessPrivatePostResponse.status).toBe(404); // Should not be found for other users

      // Step 3: User 1 can access their own private post
      const accessOwnPostResponse = await request(app)
        .get(`/api/posts/${privatePost.id}`)
        .set('Authorization', `Bearer ${token1}`);

      expect(accessOwnPostResponse.status).toBe(200);

      // Step 4: User 2 tries to edit User 1's post (should fail)
      mockPrisma.post.findFirst.mockResolvedValue(null); // No post found for user 2

      const unauthorizedEditResponse = await request(app)
        .put(`/api/posts/${privatePost.id}`)
        .set('Authorization', `Bearer ${token2}`)
        .send({
          shortContent: 'Hacked content',
        });

      expect(unauthorizedEditResponse.status).toBe(404);

      // Step 5: Anonymous user tries to access private post (should fail)
      const anonymousAccessResponse = await request(app)
        .get(`/api/posts/${privatePost.id}`);

      expect(anonymousAccessResponse.status).toBe(404);
    });
  });

  describe('Error Recovery Journey', () => {
    it('should handle errors gracefully throughout user journey', async () => {
      const token = 'valid-token';

      // Step 1: Handle database connection errors
      mockPrisma.post.create.mockRejectedValue(new Error('Database connection failed'));

      const dbErrorResponse = await request(app)
        .post('/api/posts')
        .set('Authorization', `Bearer ${token}`)
        .send({
          shortContent: 'Test post',
          worryPrompt: 'Test prompt',
          privacyLevel: 'public',
        });

      expect(dbErrorResponse.status).toBe(500);
      expect(dbErrorResponse.body.error).toBeDefined();

      // Step 2: Handle validation errors
      const validationErrorResponse = await request(app)
        .post('/api/posts')
        .set('Authorization', `Bearer ${token}`)
        .send({
          shortContent: '', // Invalid: empty content
          worryPrompt: 'Test prompt',
          privacyLevel: 'invalid', // Invalid privacy level
        });

      expect(validationErrorResponse.status).toBe(400);
      expect(validationErrorResponse.body.error.code).toBe('VALIDATION_ERROR');

      // Step 3: Handle authentication errors
      const unauthenticatedResponse = await request(app)
        .post('/api/posts')
        .send({
          shortContent: 'Test post',
          worryPrompt: 'Test prompt',
          privacyLevel: 'public',
        });

      expect(unauthenticatedResponse.status).toBe(401);

      // Step 4: Handle not found errors
      mockPrisma.post.findUnique.mockResolvedValue(null);

      const notFoundResponse = await request(app)
        .get('/api/posts/nonexistent-post-id')
        .set('Authorization', `Bearer ${token}`);

      expect(notFoundResponse.status).toBe(404);
    });
  });
});