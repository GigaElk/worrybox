import { Request, Response } from 'express';
import { WorryAnalysisService } from '../services/worryAnalysisService';
import { PostService } from '../services/postService';

const worryAnalysisService = WorryAnalysisService.getInstance();
const postService = new PostService();

export class WorryAnalysisController {
  /**
   * Analyze a worry post
   */
  async analyzeWorry(req: Request, res: Response) {
    try {
      const { postId } = req.params;

      // Get the post to analyze
      const post = await postService.getPost(postId);
      if (!post) {
        return res.status(404).json({
          error: {
            code: 'POST_NOT_FOUND',
            message: 'Post not found',
          },
          timestamp: new Date().toISOString(),
          path: req.path,
        });
      }

      // Perform analysis
      const analysis = await worryAnalysisService.analyzeWorry(
        postId,
        post.shortContent,
        post.worryPrompt
      );

      res.json({
        data: analysis,
      });
    } catch (error: any) {
      console.error('Failed to analyze worry:', error);
      res.status(500).json({
        error: {
          code: 'ANALYSIS_FAILED',
          message: error.message,
        },
        timestamp: new Date().toISOString(),
        path: req.path,
      });
    }
  }

  /**
   * Get analysis for a worry post
   */
  async getWorryAnalysis(req: Request, res: Response) {
    try {
      const { postId } = req.params;

      const analysis = await worryAnalysisService.getWorryAnalysis(postId);

      if (!analysis) {
        return res.status(404).json({
          error: {
            code: 'ANALYSIS_NOT_FOUND',
            message: 'Analysis not found for this post',
          },
          timestamp: new Date().toISOString(),
          path: req.path,
        });
      }

      res.json({
        data: analysis,
      });
    } catch (error: any) {
      console.error('Failed to get worry analysis:', error);
      res.status(500).json({
        error: {
          code: 'ANALYSIS_FETCH_FAILED',
          message: error.message,
        },
        timestamp: new Date().toISOString(),
        path: req.path,
      });
    }
  }

  /**
   * Find similar worries
   */
  async findSimilarWorries(req: Request, res: Response) {
    try {
      const { postId } = req.params;
      const limit = parseInt(req.query.limit as string) || 5;

      const similarWorries = await worryAnalysisService.findSimilarWorries(postId, limit);

      res.json({
        data: similarWorries,
      });
    } catch (error: any) {
      console.error('Failed to find similar worries:', error);
      res.status(500).json({
        error: {
          code: 'SIMILAR_WORRIES_FETCH_FAILED',
          message: error.message,
        },
        timestamp: new Date().toISOString(),
        path: req.path,
      });
    }
  }

  /**
   * Get worry categories and statistics
   */
  async getWorryCategories(req: Request, res: Response) {
    try {
      const categories = await worryAnalysisService.getWorryCategories();

      res.json({
        data: categories,
      });
    } catch (error: any) {
      console.error('Failed to get worry categories:', error);
      res.status(500).json({
        error: {
          code: 'CATEGORIES_FETCH_FAILED',
          message: error.message,
        },
        timestamp: new Date().toISOString(),
        path: req.path,
      });
    }
  }

  /**
   * Update similar worry counts (admin/background task)
   */
  async updateSimilarWorryCounts(req: Request, res: Response) {
    try {
      await worryAnalysisService.updateSimilarWorryCounts();

      res.json({
        message: 'Similar worry counts updated successfully',
      });
    } catch (error: any) {
      console.error('Failed to update similar worry counts:', error);
      res.status(500).json({
        error: {
          code: 'UPDATE_COUNTS_FAILED',
          message: error.message,
        },
        timestamp: new Date().toISOString(),
        path: req.path,
      });
    }
  }
}