import request from 'supertest';
import express from 'express';
import { WorryAnalysisController } from '../controllers/worryAnalysisController';
import { WorryAnalysisService } from '../services/worryAnalysisService';
import { PostService } from '../services/postService';

// Mock dependencies
jest.mock('../services/worryAnalysisService');
jest.mock('../services/postService');

const app = express();
app.use(express.json());

const worryAnalysisController = new WorryAnalysisController();

// Setup routes
app.post('/analysis/posts/:postId/analyze', worryAnalysisController.analyzeWorry);
app.get('/analysis/posts/:postId', worryAnalysisController.getWorryAnalysis);
app.get('/analysis/posts/:postId/similar', worryAnalysisController.findSimilarWorries);
app.get('/analysis/posts/:postId/similar-count', worryAnalysisController.getSimilarWorryCount);
app.get('/analysis/categories', worryAnalysisController.getWorryCategories);

describe('WorryAnalysisController', () => {
  const mockWorryAnalysisService = {
    analyzeWorry: jest.fn(),
    getWorryAnalysis: jest.fn(),
    findSimilarWorries: jest.fn(),
    getWorryCategories: jest.fn(),
    getSimilarWorryCount: jest.fn(),
  };

  const mockPostService = {
    getPost: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (WorryAnalysisService.getInstance as jest.Mock).mockReturnValue(mockWorryAnalysisService);
    (PostService as jest.Mock).mockImplementation(() => mockPostService);
  });

  describe('POST /analysis/posts/:postId/analyze', () => {
    const mockPost = {
      id: 'post1',
      shortContent: 'I am worried about my health',
      worryPrompt: 'What worries you today?',
      userId: 'user1'
    };

    const mockAnalysis = {
      category: 'Health & Wellness',
      subcategory: 'Mental Health',
      sentimentScore: -0.3,
      keywords: ['worried', 'health'],
      similarWorryCount: 5,
      confidence: 0.8
    };

    it('should analyze a worry post successfully', async () => {
      mockPostService.getPost.mockResolvedValue(mockPost);
      mockWorryAnalysisService.analyzeWorry.mockResolvedValue(mockAnalysis);

      const response = await request(app)
        .post('/analysis/posts/post1/analyze')
        .expect(200);

      expect(response.body.data).toEqual(mockAnalysis);
      expect(mockPostService.getPost).toHaveBeenCalledWith('post1');
      expect(mockWorryAnalysisService.analyzeWorry).toHaveBeenCalledWith(
        'post1',
        'I am worried about my health',
        'What worries you today?'
      );
    });

    it('should return 404 if post not found', async () => {
      mockPostService.getPost.mockResolvedValue(null);

      const response = await request(app)
        .post('/analysis/posts/nonexistent/analyze')
        .expect(404);

      expect(response.body.error.code).toBe('POST_NOT_FOUND');
    });

    it('should handle analysis errors', async () => {
      mockPostService.getPost.mockResolvedValue(mockPost);
      mockWorryAnalysisService.analyzeWorry.mockRejectedValue(new Error('Analysis failed'));

      const response = await request(app)
        .post('/analysis/posts/post1/analyze')
        .expect(500);

      expect(response.body.error.code).toBe('ANALYSIS_FAILED');
    });
  });

  describe('GET /analysis/posts/:postId', () => {
    const mockAnalysis = {
      category: 'Health & Wellness',
      subcategory: 'Mental Health',
      sentimentScore: -0.3,
      keywords: ['worried', 'health'],
      similarWorryCount: 5,
      confidence: 0.8
    };

    it('should get worry analysis successfully', async () => {
      mockWorryAnalysisService.getWorryAnalysis.mockResolvedValue(mockAnalysis);

      const response = await request(app)
        .get('/analysis/posts/post1')
        .expect(200);

      expect(response.body.data).toEqual(mockAnalysis);
      expect(mockWorryAnalysisService.getWorryAnalysis).toHaveBeenCalledWith('post1');
    });

    it('should return 404 if analysis not found', async () => {
      mockWorryAnalysisService.getWorryAnalysis.mockResolvedValue(null);

      const response = await request(app)
        .get('/analysis/posts/post1')
        .expect(404);

      expect(response.body.error.code).toBe('ANALYSIS_NOT_FOUND');
    });
  });

  describe('GET /analysis/posts/:postId/similar', () => {
    const mockSimilarWorries = [
      {
        id: 'post2',
        shortContent: 'Similar worry content',
        category: 'Health & Wellness',
        similarity: 0.8,
        anonymousCount: 3
      }
    ];

    it('should find similar worries successfully', async () => {
      const mockResponse = {
        similarWorries: mockSimilarWorries,
        totalCount: 2,
        visibleCount: 2,
        hasMore: false
      };
      mockWorryAnalysisService.findSimilarWorries.mockResolvedValue(mockResponse);

      const response = await request(app)
        .get('/analysis/posts/post1/similar?limit=5')
        .expect(200);

      expect(response.body.data).toEqual(mockSimilarWorries);
      expect(response.body.meta).toEqual({
        totalCount: 2,
        visibleCount: 2,
        hasMore: false
      });
      expect(mockWorryAnalysisService.findSimilarWorries).toHaveBeenCalledWith('post1', 5, undefined, false);
    });

    it('should use default limit if not provided', async () => {
      const mockResponse = {
        similarWorries: mockSimilarWorries,
        totalCount: 2,
        visibleCount: 2,
        hasMore: false
      };
      mockWorryAnalysisService.findSimilarWorries.mockResolvedValue(mockResponse);

      await request(app)
        .get('/analysis/posts/post1/similar')
        .expect(200);

      expect(mockWorryAnalysisService.findSimilarWorries).toHaveBeenCalledWith('post1', 5, undefined, false);
    });
  });

  describe('GET /analysis/posts/:postId/similar-count', () => {
    it('should get similar worry count successfully', async () => {
      const mockCountResponse = {
        count: 8,
        breakdown: {
          aiDetectedSimilar: 5,
          meTooResponses: 3
        }
      };
      mockWorryAnalysisService.getSimilarWorryCount.mockResolvedValue(mockCountResponse);

      const response = await request(app)
        .get('/analysis/posts/post1/similar-count?breakdown=true')
        .expect(200);

      expect(response.body.data).toEqual(mockCountResponse);
      expect(mockWorryAnalysisService.getSimilarWorryCount).toHaveBeenCalledWith('post1', true);
    });

    it('should get similar worry count without breakdown', async () => {
      const mockCountResponse = { count: 8 };
      mockWorryAnalysisService.getSimilarWorryCount.mockResolvedValue(mockCountResponse);

      const response = await request(app)
        .get('/analysis/posts/post1/similar-count')
        .expect(200);

      expect(response.body.data).toEqual(mockCountResponse);
      expect(mockWorryAnalysisService.getSimilarWorryCount).toHaveBeenCalledWith('post1', false);
    });
  });

  describe('GET /analysis/categories', () => {
    const mockCategories = [
      { category: 'Health & Wellness', count: 10, percentage: 50 },
      { category: 'Relationships', count: 6, percentage: 30 },
      { category: 'Work & Career', count: 4, percentage: 20 }
    ];

    it('should get worry categories successfully', async () => {
      mockWorryAnalysisService.getWorryCategories.mockResolvedValue(mockCategories);

      const response = await request(app)
        .get('/analysis/categories')
        .expect(200);

      expect(response.body.data).toEqual(mockCategories);
      expect(mockWorryAnalysisService.getWorryCategories).toHaveBeenCalled();
    });
  });
});