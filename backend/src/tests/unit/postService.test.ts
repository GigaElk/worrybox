import { PostService } from '../../services/postService';
import { mockPrisma, createMockPost, createMockUser, clearAllMocks } from '../setup';

describe('PostService', () => {
  let postService: PostService;

  beforeEach(() => {
    postService = new PostService();
    clearAllMocks();
  });

  describe('createPost', () => {
    it('should create a post successfully', async () => {
      const mockUser = createMockUser();
      const mockPost = createMockPost();
      const postData = {
        shortContent: 'Test worry',
        worryPrompt: 'What is worrying you?',
        privacyLevel: 'public' as const,
      };

      mockPrisma.post.create.mockResolvedValue(mockPost);

      const result = await postService.createPost('user-123', postData);

      expect(mockPrisma.post.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-123',
          shortContent: 'Test worry',
          longContent: null,
          worryPrompt: 'What is worrying you?',
          privacyLevel: 'public',
          commentsEnabled: true,
          isScheduled: false,
          scheduledFor: null,
          publishedAt: expect.any(Date),
        },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatarUrl: true,
            },
          },
        },
      });

      expect(result.id).toBe('post-123');
      expect(result.shortContent).toBe('Test worry content');
    });

    it('should create a scheduled post', async () => {
      const mockPost = createMockPost({ isScheduled: true, publishedAt: null });
      const scheduledDate = new Date(Date.now() + 86400000); // Tomorrow
      const postData = {
        shortContent: 'Scheduled worry',
        worryPrompt: 'What is worrying you?',
        privacyLevel: 'public' as const,
        isScheduled: true,
        scheduledFor: scheduledDate.toISOString(),
      };

      mockPrisma.post.create.mockResolvedValue(mockPost);

      const result = await postService.createPost('user-123', postData);

      expect(mockPrisma.post.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-123',
          shortContent: 'Scheduled worry',
          longContent: null,
          worryPrompt: 'What is worrying you?',
          privacyLevel: 'public',
          commentsEnabled: true,
          isScheduled: true,
          scheduledFor: scheduledDate,
          publishedAt: null,
        },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatarUrl: true,
            },
          },
        },
      });

      expect(result.isScheduled).toBe(true);
    });
  });

  describe('updatePost', () => {
    it('should update a post successfully', async () => {
      const existingPost = createMockPost();
      const updatedPost = { ...existingPost, shortContent: 'Updated content' };
      const updateData = {
        shortContent: 'Updated content',
        privacyLevel: 'friends' as const,
      };

      mockPrisma.post.findFirst.mockResolvedValue(existingPost);
      mockPrisma.post.update.mockResolvedValue(updatedPost);

      const result = await postService.updatePost('post-123', 'user-123', updateData);

      expect(mockPrisma.post.findFirst).toHaveBeenCalledWith({
        where: {
          id: 'post-123',
          userId: 'user-123',
        },
      });

      expect(mockPrisma.post.update).toHaveBeenCalledWith({
        where: { id: 'post-123' },
        data: {
          shortContent: 'Updated content',
          longContent: undefined,
          privacyLevel: 'friends',
          worryPrompt: undefined,
          updatedAt: expect.any(Date),
        },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatarUrl: true,
            },
          },
        },
      });

      expect(result.shortContent).toBe('Updated content');
    });

    it('should throw error when post not found', async () => {
      mockPrisma.post.findFirst.mockResolvedValue(null);

      await expect(
        postService.updatePost('post-123', 'user-123', { shortContent: 'Updated' })
      ).rejects.toThrow('Post not found or you do not have permission to edit it');
    });

    it('should throw error when user does not own post', async () => {
      const existingPost = createMockPost({ userId: 'other-user' });
      mockPrisma.post.findFirst.mockResolvedValue(null); // Simulates no match for user

      await expect(
        postService.updatePost('post-123', 'user-123', { shortContent: 'Updated' })
      ).rejects.toThrow('Post not found or you do not have permission to edit it');
    });
  });

  describe('deletePost', () => {
    it('should delete a post successfully', async () => {
      const existingPost = createMockPost();
      mockPrisma.post.findFirst.mockResolvedValue(existingPost);
      mockPrisma.post.delete.mockResolvedValue(existingPost);

      await postService.deletePost('post-123', 'user-123');

      expect(mockPrisma.post.findFirst).toHaveBeenCalledWith({
        where: {
          id: 'post-123',
          userId: 'user-123',
        },
      });

      expect(mockPrisma.post.delete).toHaveBeenCalledWith({
        where: { id: 'post-123' },
      });
    });

    it('should throw error when post not found', async () => {
      mockPrisma.post.findFirst.mockResolvedValue(null);

      await expect(
        postService.deletePost('post-123', 'user-123')
      ).rejects.toThrow('Post not found or you do not have permission to delete it');
    });
  });

  describe('getPosts', () => {
    it('should get posts with default parameters', async () => {
      const mockPosts = [createMockPost(), createMockPost({ id: 'post-456' })];
      mockPrisma.post.findMany.mockResolvedValue(mockPosts);
      mockPrisma.post.count.mockResolvedValue(2);

      const result = await postService.getPosts({});

      expect(mockPrisma.post.findMany).toHaveBeenCalledWith({
        where: {
          publishedAt: { not: null },
          privacyLevel: 'public',
        },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatarUrl: true,
            },
          },
        },
        orderBy: [
          { publishedAt: 'desc' },
          { createdAt: 'desc' },
        ],
        take: 20,
        skip: 0,
      });

      expect(result.posts).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.hasMore).toBe(false);
    });

    it('should filter posts by privacy level', async () => {
      const mockPosts = [createMockPost({ privacyLevel: 'friends' })];
      mockPrisma.post.findMany.mockResolvedValue(mockPosts);
      mockPrisma.post.count.mockResolvedValue(1);

      await postService.getPosts({ privacyLevel: 'friends' });

      expect(mockPrisma.post.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            privacyLevel: 'friends',
          }),
        })
      );
    });

    it('should handle pagination', async () => {
      const mockPosts = [createMockPost()];
      mockPrisma.post.findMany.mockResolvedValue(mockPosts);
      mockPrisma.post.count.mockResolvedValue(25);

      const result = await postService.getPosts({ limit: 10, offset: 10 });

      expect(mockPrisma.post.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 10,
          skip: 10,
        })
      );

      expect(result.hasMore).toBe(true);
    });
  });

  describe('getPersonalizedFeed', () => {
    it('should get personalized feed for user', async () => {
      const mockFollows = [{ followingId: 'user-456' }, { followingId: 'user-789' }];
      const mockPosts = [createMockPost({ userId: 'user-456' })];

      mockPrisma.follow.findMany.mockResolvedValue(mockFollows);
      mockPrisma.post.findMany.mockResolvedValue(mockPosts);
      mockPrisma.post.count.mockResolvedValue(1);

      const result = await postService.getPersonalizedFeed('user-123');

      expect(mockPrisma.follow.findMany).toHaveBeenCalledWith({
        where: { followerId: 'user-123' },
        select: { followingId: true },
      });

      expect(mockPrisma.post.findMany).toHaveBeenCalledWith({
        where: {
          publishedAt: { not: null },
          userId: { in: ['user-123', 'user-456', 'user-789'] },
          OR: [
            { userId: 'user-123' },
            { userId: { in: ['user-456', 'user-789'] }, privacyLevel: 'public' },
            { userId: { in: ['user-456', 'user-789'] }, privacyLevel: 'friends' },
          ],
        },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatarUrl: true,
            },
          },
        },
        orderBy: [
          { publishedAt: 'desc' },
          { createdAt: 'desc' },
        ],
        take: 20,
        skip: 0,
      });

      expect(result.posts).toHaveLength(1);
    });
  });

  describe('getDiscoveryFeed', () => {
    it('should get discovery feed excluding followed users', async () => {
      const mockFollows = [{ followingId: 'user-456' }];
      const mockPosts = [createMockPost({ userId: 'user-789' })];

      mockPrisma.follow.findMany.mockResolvedValue(mockFollows);
      mockPrisma.post.findMany.mockResolvedValue(mockPosts);
      mockPrisma.post.count.mockResolvedValue(1);

      const result = await postService.getDiscoveryFeed('user-123');

      expect(mockPrisma.post.findMany).toHaveBeenCalledWith({
        where: {
          publishedAt: { not: null },
          privacyLevel: 'public',
          userId: { notIn: ['user-123', 'user-456'] },
        },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatarUrl: true,
            },
          },
        },
        orderBy: [
          { publishedAt: 'desc' },
          { createdAt: 'desc' },
        ],
        take: 20,
        skip: 0,
      });

      expect(result.posts).toHaveLength(1);
    });

    it('should get discovery feed for anonymous users', async () => {
      const mockPosts = [createMockPost()];
      mockPrisma.post.findMany.mockResolvedValue(mockPosts);
      mockPrisma.post.count.mockResolvedValue(1);

      const result = await postService.getDiscoveryFeed();

      expect(mockPrisma.post.findMany).toHaveBeenCalledWith({
        where: {
          publishedAt: { not: null },
          privacyLevel: 'public',
        },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatarUrl: true,
            },
          },
        },
        orderBy: [
          { publishedAt: 'desc' },
          { createdAt: 'desc' },
        ],
        take: 20,
        skip: 0,
      });

      expect(result.posts).toHaveLength(1);
    });
  });

  describe('addBlogContent', () => {
    it('should add blog content to post', async () => {
      const existingPost = createMockPost();
      const updatedPost = { ...existingPost, longContent: 'Blog content' };

      mockPrisma.post.findFirst.mockResolvedValue(existingPost);
      mockPrisma.post.update.mockResolvedValue(updatedPost);

      const result = await postService.addBlogContent('post-123', 'user-123', 'Blog content');

      expect(mockPrisma.post.update).toHaveBeenCalledWith({
        where: { id: 'post-123' },
        data: {
          longContent: 'Blog content',
          updatedAt: expect.any(Date),
        },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatarUrl: true,
            },
          },
        },
      });

      expect(result.longContent).toBe('Blog content');
    });
  });

  describe('removeBlogContent', () => {
    it('should remove blog content from post', async () => {
      const existingPost = createMockPost({ longContent: 'Blog content' });
      const updatedPost = { ...existingPost, longContent: null };

      mockPrisma.post.findFirst.mockResolvedValue(existingPost);
      mockPrisma.post.update.mockResolvedValue(updatedPost);

      const result = await postService.removeBlogContent('post-123', 'user-123');

      expect(mockPrisma.post.update).toHaveBeenCalledWith({
        where: { id: 'post-123' },
        data: {
          longContent: null,
          updatedAt: expect.any(Date),
        },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatarUrl: true,
            },
          },
        },
      });

      expect(result.longContent).toBeUndefined();
    });
  });
});