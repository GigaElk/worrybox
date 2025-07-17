import { Request, Response } from 'express';
import { AnalyticsService } from '../services/analyticsService';
import { LemonSqueezyService } from '../services/lemonSqueezyService';

const analyticsService = AnalyticsService.getInstance();
const lemonSqueezyService = LemonSqueezyService.getInstance();

export class AnalyticsController {
  /**
   * Get personal analytics for the authenticated user
   */
  async getPersonalAnalytics(req: Request, res: Response) {
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

      // Check if user has access to personal analytics
      const hasAccess = await lemonSqueezyService.hasFeatureAccess(req.user.userId, 'personal_analytics');
      if (!hasAccess) {
        return res.status(403).json({
          error: {
            code: 'FEATURE_ACCESS_DENIED',
            message: 'Personal analytics requires a Supporter or Premium subscription',
            upgradeRequired: true,
          },
          timestamp: new Date().toISOString(),
          path: req.path,
        });
      }

      const timeRange = (req.query.timeRange as '30d' | '90d' | '1y') || '30d';
      
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

      const analytics = await analyticsService.getPersonalAnalytics(req.user.userId, timeRange);

      res.json({
        data: analytics,
        timeRange,
      });
    } catch (error: any) {
      console.error('Failed to get personal analytics:', error);
      res.status(500).json({
        error: {
          code: 'ANALYTICS_FETCH_FAILED',
          message: error.message,
        },
        timestamp: new Date().toISOString(),
        path: req.path,
      });
    }
  }

  /**
   * Get worry frequency data for charts
   */
  async getWorryFrequencyData(req: Request, res: Response) {
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

      // Check if user has access to personal analytics
      const hasAccess = await lemonSqueezyService.hasFeatureAccess(req.user.userId, 'personal_analytics');
      if (!hasAccess) {
        return res.status(403).json({
          error: {
            code: 'FEATURE_ACCESS_DENIED',
            message: 'Personal analytics requires a Supporter or Premium subscription',
            upgradeRequired: true,
          },
          timestamp: new Date().toISOString(),
          path: req.path,
        });
      }

      const days = parseInt(req.query.days as string) || 30;
      
      // Validate days parameter
      if (days < 1 || days > 365) {
        return res.status(400).json({
          error: {
            code: 'INVALID_DAYS_PARAMETER',
            message: 'Days parameter must be between 1 and 365',
          },
          timestamp: new Date().toISOString(),
          path: req.path,
        });
      }

      const frequencyData = await analyticsService.getWorryFrequencyData(req.user.userId, days);

      res.json({
        data: frequencyData,
        days,
      });
    } catch (error: any) {
      console.error('Failed to get worry frequency data:', error);
      res.status(500).json({
        error: {
          code: 'FREQUENCY_DATA_FETCH_FAILED',
          message: error.message,
        },
        timestamp: new Date().toISOString(),
        path: req.path,
      });
    }
  }

  /**
   * Get category trend data for charts
   */
  async getCategoryTrendData(req: Request, res: Response) {
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

      // Check if user has access to personal analytics
      const hasAccess = await lemonSqueezyService.hasFeatureAccess(req.user.userId, 'personal_analytics');
      if (!hasAccess) {
        return res.status(403).json({
          error: {
            code: 'FEATURE_ACCESS_DENIED',
            message: 'Personal analytics requires a Supporter or Premium subscription',
            upgradeRequired: true,
          },
          timestamp: new Date().toISOString(),
          path: req.path,
        });
      }

      const days = parseInt(req.query.days as string) || 30;
      
      // Validate days parameter
      if (days < 1 || days > 365) {
        return res.status(400).json({
          error: {
            code: 'INVALID_DAYS_PARAMETER',
            message: 'Days parameter must be between 1 and 365',
          },
          timestamp: new Date().toISOString(),
          path: req.path,
        });
      }

      const categoryTrends = await analyticsService.getCategoryTrendData(req.user.userId, days);

      res.json({
        data: categoryTrends,
        days,
      });
    } catch (error: any) {
      console.error('Failed to get category trend data:', error);
      res.status(500).json({
        error: {
          code: 'CATEGORY_TREND_FETCH_FAILED',
          message: error.message,
        },
        timestamp: new Date().toISOString(),
        path: req.path,
      });
    }
  }

  /**
   * Get analytics summary for dashboard
   */
  async getAnalyticsSummary(req: Request, res: Response) {
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

      // Check if user has access to personal analytics
      const hasAccess = await lemonSqueezyService.hasFeatureAccess(req.user.userId, 'personal_analytics');
      if (!hasAccess) {
        return res.status(403).json({
          error: {
            code: 'FEATURE_ACCESS_DENIED',
            message: 'Personal analytics requires a Supporter or Premium subscription',
            upgradeRequired: true,
          },
          timestamp: new Date().toISOString(),
          path: req.path,
        });
      }

      const analytics = await analyticsService.getPersonalAnalytics(req.user.userId, '30d');
      
      // Return a simplified summary for dashboard widgets
      const summary = {
        overview: analytics.overview,
        topCategories: analytics.categories.breakdown.slice(0, 5),
        recentInsights: analytics.insights.slice(0, 3),
        sentimentSummary: {
          average: analytics.sentiment.averageSentiment,
          distribution: analytics.sentiment.sentimentDistribution
        }
      };

      res.json({
        data: summary,
      });
    } catch (error: any) {
      console.error('Failed to get analytics summary:', error);
      res.status(500).json({
        error: {
          code: 'ANALYTICS_SUMMARY_FETCH_FAILED',
          message: error.message,
        },
        timestamp: new Date().toISOString(),
        path: req.path,
      });
    }
  }
}