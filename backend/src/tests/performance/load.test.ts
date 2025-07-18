import request from 'supertest';
import express from 'express';
import { performance } from 'perf_hooks';
import postRoutes from '../../routes/posts';
import authRoutes from '../../routes/auth';
import { mockPrisma, createMockPost, createMockUser, measureExecutionTime, clearAllMocks } from '../setup';

const app = express();
app.use(express.json());
app.use('/api/posts', postRoutes);
app.use('/api/auth', authRoutes);

describe('Performance Tests', () => {
  beforeEach(() => {
    clearAllMocks();
  });

  describe('API Response Times', () => {
    it('should respond to GET /posts within acceptable time limits', async () => {
      const mockPosts = Array.from({ length: 20 }, (_, i) => 
        createMockPost({ id: `post-${i}`, shortContent: `Post ${i}` })
      );

      mockPrisma.post.findMany.mockResolvedValue(mockPosts);
      mockPrisma.post.count.mockResolvedValue(20);

      const { result, executionTime } = await measureExecutionTime(async () => {
        return request(app).get('/api/posts');
      });

      expect(result.status).toBe(200);
      expect(executionTime).toBeLessThan(1000); // Should respond within 1 second
      expect(result.body.data.posts).toHaveLength(20);
    });

    it('should handle large dataset queries efficiently', async () => {
      const mockPosts = Array.from({ length: 50 }, (_, i) => 
        createMockPost({ id: `post-${i}` })
      );

      mockPrisma.post.findMany.mockResolvedValue(mockPosts);
      mockPrisma.post.count.mockResolvedValue(1000);

      const { result, executionTime } = await measureExecutionTime(async () => {
        return request(app).get('/api/posts?limit=50&offset=0');
      });

      expect(result.status).toBe(200);
      expect(executionTime).toBeLessThan(2000); // Should handle large datasets within 2 seconds
      expect(result.body.data.posts).toHaveLength(50);
    });

    it('should handle post creation efficiently', async () => {
      const mockPost = createMockPost();
      mockPrisma.post.create.mockResolvedValue(mockPost);

      const { result, executionTime } = await measureExecutionTime(async () => {
        return request(app)
          .post('/api/posts')
          .set('Authorization', 'Bearer mock-token')
          .send({
            shortContent: 'Performance test post',
            worryPrompt: 'Performance test prompt',
            privacyLevel: 'public',
          });
      });

      expect(result.status).toBe(201);
      expect(executionTime).toBeLessThan(500); // Post creation should be fast
    });
  });

  describe('Concurrent Request Handling', () => {
    it('should handle multiple concurrent GET requests', async () => {
      const mockPosts = [createMockPost()];
      mockPrisma.post.findMany.mockResolvedValue(mockPosts);
      mockPrisma.post.count.mockResolvedValue(1);

      const concurrentRequests = 10;
      const requests = Array.from({ length: concurrentRequests }, () =>
        request(app).get('/api/posts')
      );

      const startTime = performance.now();
      const responses = await Promise.all(requests);
      const endTime = performance.now();

      const totalTime = endTime - startTime;
      const averageTime = totalTime / concurrentRequests;

      // All requests should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });

      // Average response time should be reasonable
      expect(averageTime).toBeLessThan(1000);
      
      // Total time should be less than sequential execution
      expect(totalTime).toBeLessThan(concurrentRequests * 500);
    });

    it('should handle concurrent POST requests', async () => {
      const mockPost = createMockPost();
      mockPrisma.post.create.mockResolvedValue(mockPost);

      const concurrentPosts = 5;
      const requests = Array.from({ length: concurrentPosts }, (_, i) =>
        request(app)
          .post('/api/posts')
          .set('Authorization', 'Bearer mock-token')
          .send({
            shortContent: `Concurrent post ${i}`,
            worryPrompt: 'Concurrent test prompt',
            privacyLevel: 'public',
          })
      );

      const startTime = performance.now();
      const responses = await Promise.all(requests);
      const endTime = performance.now();

      const totalTime = endTime - startTime;

      // All requests should succeed
      responses.forEach(response => {
        expect(response.status).toBe(201);
      });

      // Should handle concurrent writes efficiently
      expect(totalTime).toBeLessThan(3000);
    });
  });

  describe('Memory Usage', () => {
    it('should not cause memory leaks with repeated requests', async () => {
      const mockPosts = [createMockPost()];
      mockPrisma.post.findMany.mockResolvedValue(mockPosts);
      mockPrisma.post.count.mockResolvedValue(1);

      const initialMemory = process.memoryUsage();
      
      // Make many requests to test for memory leaks
      for (let i = 0; i < 100; i++) {
        await request(app).get('/api/posts');
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;

      // Memory increase should be reasonable (less than 50MB)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
    });
  });

  describe('Database Query Performance', () => {
    it('should optimize database queries for large datasets', async () => {
      // Simulate a large number of posts
      const largeMockDataset = Array.from({ length: 1000 }, (_, i) => 
        createMockPost({ id: `post-${i}` })
      );

      mockPrisma.post.findMany.mockImplementation(async (args) => {
        // Simulate database query time based on dataset size
        const delay = Math.min(args?.take || 20, 100); // Simulate query time
        await new Promise(resolve => setTimeout(resolve, delay));
        
        const offset = args?.skip || 0;
        const limit = args?.take || 20;
        return largeMockDataset.slice(offset, offset + limit);
      });

      mockPrisma.post.count.mockResolvedValue(1000);

      const { result, executionTime } = await measureExecutionTime(async () => {
        return request(app).get('/api/posts?limit=20&offset=0');
      });

      expect(result.status).toBe(200);
      expect(executionTime).toBeLessThan(1000);
      expect(result.body.data.posts).toHaveLength(20);
    });

    it('should handle complex queries efficiently', async () => {
      const mockPosts = [createMockPost()];
      
      // Mock complex query with joins
      mockPrisma.follow.findMany.mockResolvedValue([{ followingId: 'user-456' }]);
      mockPrisma.post.findMany.mockResolvedValue(mockPosts);
      mockPrisma.post.count.mockResolvedValue(1);

      const { result, executionTime } = await measureExecutionTime(async () => {
        return request(app)
          .get('/api/posts/feed/personalized')
          .set('Authorization', 'Bearer mock-token');
      });

      expect(result.status).toBe(200);
      expect(executionTime).toBeLessThan(1500); // Complex queries should still be reasonably fast
    });
  });

  describe('Pagination Performance', () => {
    it('should handle deep pagination efficiently', async () => {
      const mockPosts = Array.from({ length: 20 }, (_, i) => 
        createMockPost({ id: `post-${i + 1000}` }) // Simulate deep pagination
      );

      mockPrisma.post.findMany.mockResolvedValue(mockPosts);
      mockPrisma.post.count.mockResolvedValue(10000);

      const { result, executionTime } = await measureExecutionTime(async () => {
        return request(app).get('/api/posts?limit=20&offset=1000');
      });

      expect(result.status).toBe(200);
      expect(executionTime).toBeLessThan(1500); // Deep pagination should still be efficient
      expect(result.body.data.posts).toHaveLength(20);
      expect(result.body.data.hasMore).toBe(true);
    });
  });

  describe('Stress Testing', () => {
    it('should handle high load without degrading significantly', async () => {
      const mockPosts = [createMockPost()];
      mockPrisma.post.findMany.mockResolvedValue(mockPosts);
      mockPrisma.post.count.mockResolvedValue(1);

      const highLoadRequests = 50;
      const batchSize = 10;
      const batches = Math.ceil(highLoadRequests / batchSize);
      
      const allResponseTimes: number[] = [];

      for (let batch = 0; batch < batches; batch++) {
        const batchRequests = Array.from({ length: batchSize }, async () => {
          const { result, executionTime } = await measureExecutionTime(async () => {
            return request(app).get('/api/posts');
          });
          return { result, executionTime };
        });

        const batchResults = await Promise.all(batchRequests);
        
        batchResults.forEach(({ result, executionTime }) => {
          expect(result.status).toBe(200);
          allResponseTimes.push(executionTime);
        });
      }

      // Calculate performance metrics
      const averageResponseTime = allResponseTimes.reduce((a, b) => a + b, 0) / allResponseTimes.length;
      const maxResponseTime = Math.max(...allResponseTimes);
      const minResponseTime = Math.min(...allResponseTimes);

      // Performance should remain consistent under load
      expect(averageResponseTime).toBeLessThan(1000);
      expect(maxResponseTime).toBeLessThan(3000);
      expect(maxResponseTime - minResponseTime).toBeLessThan(2000); // Response time variance should be reasonable
    });
  });

  describe('Resource Cleanup', () => {
    it('should properly clean up resources after requests', async () => {
      const mockPost = createMockPost();
      mockPrisma.post.create.mockResolvedValue(mockPost);
      mockPrisma.post.delete.mockResolvedValue(mockPost);
      mockPrisma.post.findFirst.mockResolvedValue(mockPost);

      // Create and delete multiple posts to test resource cleanup
      for (let i = 0; i < 10; i++) {
        const createResponse = await request(app)
          .post('/api/posts')
          .set('Authorization', 'Bearer mock-token')
          .send({
            shortContent: `Test post ${i}`,
            worryPrompt: 'Test prompt',
            privacyLevel: 'public',
          });

        expect(createResponse.status).toBe(201);

        const deleteResponse = await request(app)
          .delete(`/api/posts/post-123`)
          .set('Authorization', 'Bearer mock-token');

        expect(deleteResponse.status).toBe(200);
      }

      // Verify that mocks were called correctly (indicating proper cleanup)
      expect(mockPrisma.post.create).toHaveBeenCalledTimes(10);
      expect(mockPrisma.post.delete).toHaveBeenCalledTimes(10);
    });
  });
});