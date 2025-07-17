import { Request, Response } from 'express';
import { DemographicAnalyticsService } from '../services/demographicAnalyticsService';
import { LemonSqueezyService } from '../services/lemonSqueezyService';

const demographicAnalyticsService = DemographicAnalyticsService.getInstance();
const lemonSqueezyService = LemonSqueezyService.getInstance();

export class DemographicAnalyticsController {
  /**
   * Get comprehensive demographic analytics
   */
  async getDemographicAnalytics(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
          },
          timestamp: new Date().toISOString(),
          path: req.path,
        });
      }

      // Check if user has access to demographic analytics (Premium feature)
      const hasAccess = await lemonSqueezyService.hasFeatureAccess(req.user.userId, 'demographic_analytics');
      if (!hasAccess) {
        return res.status(403).json({
          error: {
            code: 'FEATURE_ACCESS_DENIED',
            message: 'Demographic analytics requires a Premium subscription',
            upgradeRequired: true,
          },
          timestamp: new Date().toISOString(),
          path: req.path,
        });
      }

      const timeRange = (req.query.timeRange as '30d' | '90d' | '1y') || '90d';
      
      // Validate time range
      if (!['30d', '90d', '1y'].includes(timeRange)) {
        return res.status(400).json({
          error: {
            code: 'INVALID_TIME_RANGE',
            message: 'Time range must be one of: 30d, 90d, 1y',
          },
          timestamp: new Date().toISOString(),
          path: req.path,
        });
      }

      const analytics = await demographicAnalyticsService.getDemographicAnalytics(timeRange);

      res.json({
        data: analytics,
        timeRange,
        privacyNote: 'All demographic data is anonymized and aggregated to protect user privacy. Minimum sample sizes are enforced.',
      });
    } catch (error: any) {
      console.error('Failed to get demographic analytics:', error);
      res.status(500).json({
        error: {
          code: 'DEMOGRAPHIC_ANALYTICS_FETCH_FAILED',
          message: error.message,
        },
        timestamp: new Date().toISOString(),
        path: req.path,
      });
    }
  }

  /**
   * Get worry heat map data for visualization
   */
  async getWorryHeatMapData(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
          },
          timestamp: new Date().toISOString(),
          path: req.path,
        });
      }

      // Check if user has access to demographic analytics
      const hasAccess = await lemonSqueezyService.hasFeatureAccess(req.user.userId, 'demographic_analytics');
      if (!hasAccess) {
        return res.status(403).json({
          error: {
            code: 'FEATURE_ACCESS_DENIED',
            message: 'Heat map data requires a Premium subscription',
            upgradeRequired: true,
          },
          timestamp: new Date().toISOString(),
          path: req.path,
        });
      }

      const timeRange = (req.query.timeRange as '30d' | '90d' | '1y') || '90d';
      
      // Validate time range
      if (!['30d', '90d', '1y'].includes(timeRange)) {
        return res.status(400).json({
          error: {
            code: 'INVALID_TIME_RANGE',
            message: 'Time range must be one of: 30d, 90d, 1y',
          },
          timestamp: new Date().toISOString(),
          path: req.path,
        });
      }

      const heatMapData = await demographicAnalyticsService.getWorryHeatMapData(timeRange);

      res.json({
        data: heatMapData,
        timeRange,
      });
    } catch (error: any) {
      console.error('Failed to get heat map data:', error);
      res.status(500).json({
        error: {
          code: 'HEAT_MAP_DATA_FETCH_FAILED',
          message: error.message,
        },
        timestamp: new Date().toISOString(),
        path: req.path,
      });
    }
  }

  /**
   * Get trending topics with growth analysis
   */
  async getTrendingTopics(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
          },
          timestamp: new Date().toISOString(),
          path: req.path,
        });
      }

      // Check if user has access to demographic analytics
      const hasAccess = await lemonSqueezyService.hasFeatureAccess(req.user.userId, 'demographic_analytics');
      if (!hasAccess) {
        return res.status(403).json({
          error: {
            code: 'FEATURE_ACCESS_DENIED',
            message: 'Trending topics requires a Premium subscription',
            upgradeRequired: true,
          },
          timestamp: new Date().toISOString(),
          path: req.path,
        });
      }

      const limit = parseInt(req.query.limit as string) || 10;
      
      // Validate limit parameter
      if (limit < 1 || limit > 50) {
        return res.status(400).json({
          error: {
            code: 'INVALID_LIMIT_PARAMETER',
            message: 'Limit parameter must be between 1 and 50',
          },
          timestamp: new Date().toISOString(),
          path: req.path,
        });
      }

      const trendingTopics = await demographicAnalyticsService.getTrendingTopics(limit);

      res.json({
        data: trendingTopics,
        limit,
      });
    } catch (error: any) {
      console.error('Failed to get trending topics:', error);
      res.status(500).json({
        error: {
          code: 'TRENDING_TOPICS_FETCH_FAILED',
          message: error.message,
        },
        timestamp: new Date().toISOString(),
        path: req.path,
      });
    }
  }

  /**
   * Get category trends for demographic analysis
   */
  async getCategoryTrends(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
          },
          timestamp: new Date().toISOString(),
          path: req.path,
        });
      }

      // Check if user has access to demographic analytics
      const hasAccess = await lemonSqueezyService.hasFeatureAccess(req.user.userId, 'demographic_analytics');
      if (!hasAccess) {
        return res.status(403).json({
          error: {
            code: 'FEATURE_ACCESS_DENIED',
            message: 'Category trends requires a Premium subscription',
            upgradeRequired: true,
          },
          timestamp: new Date().toISOString(),
          path: req.path,
        });
      }

      const timeRange = (req.query.timeRange as '30d' | '90d' | '1y') || '90d';
      
      const analytics = await demographicAnalyticsService.getDemographicAnalytics(timeRange);

      res.json({
        data: {
          trending: analytics.categoryTrends.trending,
          seasonal: analytics.categoryTrends.seasonal,
          timeRange
        },
      });
    } catch (error: any) {
      console.error('Failed to get category trends:', error);
      res.status(500).json({
        error: {
          code: 'CATEGORY_TRENDS_FETCH_FAILED',
          message: error.message,
        },
        timestamp: new Date().toISOString(),
        path: req.path,
      });
    }
  }

  /**
   * Get community health metrics
   */
  async getCommunityHealth(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
          },
          timestamp: new Date().toISOString(),
          path: req.path,
        });
      }

      // Check if user has access to demographic analytics
      const hasAccess = await lemonSqueezyService.hasFeatureAccess(req.user.userId, 'demographic_analytics');
      if (!hasAccess) {
        return res.status(403).json({
          error: {
            code: 'FEATURE_ACCESS_DENIED',
            message: 'Community health metrics requires a Premium subscription',
            upgradeRequired: true,
          },
          timestamp: new Date().toISOString(),
          path: req.path,
        });
      }

      const timeRange = (req.query.timeRange as '30d' | '90d' | '1y') || '90d';
      
      const analytics = await demographicAnalyticsService.getDemographicAnalytics(timeRange);

      res.json({
        data: {
          overview: analytics.overview,
          communityHealth: analytics.communityHealth,
          sentimentAnalysis: analytics.sentimentAnalysis,
          timeRange
        },
      });
    } catch (error: any) {
      console.error('Failed to get community health metrics:', error);
      res.status(500).json({
        error: {
          code: 'COMMUNITY_HEALTH_FETCH_FAILED',
          message: error.message,
        },
        timestamp: new Date().toISOString(),
        path: req.path,
      });
    }
  }
}