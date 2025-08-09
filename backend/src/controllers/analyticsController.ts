import { Request, Response } from 'express';
import { query, validationResult } from 'express-validator';
import { GeographicAnalyticsService, GeographicAnalyticsQuery } from '../services/geographicAnalyticsService';
import { PayPalService } from '../services/paypalService';

const paypalService = PayPalService.getInstance();

const analyticsService = new GeographicAnalyticsService();

// Validation rules
export const getGeographicAnalyticsValidation = [
  query('countries')
    .optional()
    .isString()
    .withMessage('Countries must be a comma-separated string'),
  query('regions')
    .optional()
    .isString()
    .withMessage('Regions must be a comma-separated string'),
  query('timeRange')
    .optional()
    .isIn(['30d', '90d', '1y'])
    .withMessage('Time range must be 30d, 90d, or 1y'),
  query('categories')
    .optional()
    .isString()
    .withMessage('Categories must be a comma-separated string'),
  query('minUserThreshold')
    .optional()
    .isInt({ min: 50, max: 1000 })
    .withMessage('Minimum user threshold must be between 50 and 1000'),
];

export const exportAnalyticsValidation = [
  ...getGeographicAnalyticsValidation,
  query('format')
    .optional()
    .isIn(['json', 'csv'])
    .withMessage('Format must be json or csv'),
];

export class AnalyticsController {
  /**
   * Get geographic analytics data (Premium feature)
   */
  async getGeographicAnalytics(req: Request, res: Response) {
    try {
      // Check validation results
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid query parameters',
            details: errors.array(),
          },
          timestamp: new Date().toISOString(),
          path: req.path,
        });
      }

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

      // Check if user has premium access
      const hasAccess = await paypalService.hasFeatureAccess(req.user.userId, 'demographic_analytics');
      if (!hasAccess) {
        return res.status(403).json({
          error: {
            code: 'PREMIUM_REQUIRED',
            message: 'Premium subscription required to access geographic analytics',
            upgradeUrl: '/pricing',
          },
          timestamp: new Date().toISOString(),
          path: req.path,
        });
      }

      const analyticsQuery: GeographicAnalyticsQuery = {
        countries: req.query.countries ? (req.query.countries as string).split(',') : undefined,
        regions: req.query.regions ? (req.query.regions as string).split(',') : undefined,
        timeRange: (req.query.timeRange as '30d' | '90d' | '1y') || '30d',
        categories: req.query.categories ? (req.query.categories as string).split(',') : undefined,
        minUserThreshold: req.query.minUserThreshold ? parseInt(req.query.minUserThreshold as string) : undefined,
      };

      const analytics = await analyticsService.getGeographicAnalytics(analyticsQuery);

      res.json({
        data: analytics,
        meta: {
          totalRegions: analytics.length,
          timeRange: analyticsQuery.timeRange,
          privacyNote: 'All data is aggregated and anonymized with minimum privacy thresholds enforced.',
          generatedAt: new Date().toISOString(),
        },
      });
    } catch (error: any) {
      console.error('Geographic analytics error:', error);
      res.status(500).json({
        error: {
          code: 'ANALYTICS_FETCH_FAILED',
          message: 'Failed to fetch geographic analytics',
        },
        timestamp: new Date().toISOString(),
        path: req.path,
      });
    }
  }

  /**
   * Get region summaries for dashboard overview
   */
  async getRegionSummaries(req: Request, res: Response) {
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

      const hasAccess = await paypalService.hasFeatureAccess(req.user.userId, 'demographic_analytics');
      if (!hasAccess) {
        return res.status(403).json({
          error: {
            code: 'PREMIUM_REQUIRED',
            message: 'Premium subscription required to access analytics',
          },
          timestamp: new Date().toISOString(),
          path: req.path,
        });
      }

      const analyticsQuery: GeographicAnalyticsQuery = {
        timeRange: (req.query.timeRange as '30d' | '90d' | '1y') || '30d',
        countries: req.query.countries ? (req.query.countries as string).split(',') : undefined,
      };

      const summaries = await analyticsService.getRegionSummaries(analyticsQuery);

      res.json({
        data: summaries,
        meta: {
          totalRegions: summaries.length,
          timeRange: analyticsQuery.timeRange,
        },
      });
    } catch (error: any) {
      console.error('Region summaries error:', error);
      res.status(500).json({
        error: {
          code: 'SUMMARIES_FETCH_FAILED',
          message: 'Failed to fetch region summaries',
        },
        timestamp: new Date().toISOString(),
        path: req.path,
      });
    }
  }

  /**
   * Get category trends by region
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

      const hasAccess = await paypalService.hasFeatureAccess(req.user.userId, 'demographic_analytics');
      if (!hasAccess) {
        return res.status(403).json({
          error: {
            code: 'PREMIUM_REQUIRED',
            message: 'Premium subscription required to access analytics',
          },
          timestamp: new Date().toISOString(),
          path: req.path,
        });
      }

      const analyticsQuery: GeographicAnalyticsQuery = {
        timeRange: (req.query.timeRange as '30d' | '90d' | '1y') || '30d',
        countries: req.query.countries ? (req.query.countries as string).split(',') : undefined,
        categories: req.query.categories ? (req.query.categories as string).split(',') : undefined,
      };

      const trends = await analyticsService.getCategoryTrends(analyticsQuery);

      res.json({
        data: trends,
        meta: {
          timeRange: analyticsQuery.timeRange,
        },
      });
    } catch (error: any) {
      console.error('Category trends error:', error);
      res.status(500).json({
        error: {
          code: 'TRENDS_FETCH_FAILED',
          message: 'Failed to fetch category trends',
        },
        timestamp: new Date().toISOString(),
        path: req.path,
      });
    }
  }

  /**
   * Export analytics data (Premium feature)
   */
  async exportAnalytics(req: Request, res: Response) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid query parameters',
            details: errors.array(),
          },
          timestamp: new Date().toISOString(),
          path: req.path,
        });
      }

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

      const hasAccess = await paypalService.hasFeatureAccess(req.user.userId, 'demographic_analytics');
      if (!hasAccess) {
        return res.status(403).json({
          error: {
            code: 'PREMIUM_REQUIRED',
            message: 'Premium subscription required to export analytics data',
          },
          timestamp: new Date().toISOString(),
          path: req.path,
        });
      }

      const analyticsQuery: GeographicAnalyticsQuery = {
        countries: req.query.countries ? (req.query.countries as string).split(',') : undefined,
        regions: req.query.regions ? (req.query.regions as string).split(',') : undefined,
        timeRange: (req.query.timeRange as '30d' | '90d' | '1y') || '30d',
        categories: req.query.categories ? (req.query.categories as string).split(',') : undefined,
        minUserThreshold: req.query.minUserThreshold ? parseInt(req.query.minUserThreshold as string) : undefined,
      };

      const format = (req.query.format as 'json' | 'csv') || 'json';
      const exportData = await analyticsService.exportAnalyticsData(analyticsQuery, format);

      if (format === 'csv') {
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="worrybox-analytics-${Date.now()}.csv"`);
        res.send(exportData);
      } else {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="worrybox-analytics-${Date.now()}.json"`);
        res.json(exportData);
      }
    } catch (error: any) {
      console.error('Export analytics error:', error);
      res.status(500).json({
        error: {
          code: 'EXPORT_FAILED',
          message: 'Failed to export analytics data',
        },
        timestamp: new Date().toISOString(),
        path: req.path,
      });
    }
  }

  /**
   * Get available countries and regions for filtering
   */
  async getAvailableRegions(req: Request, res: Response) {
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

      const hasAccess = await paypalService.hasFeatureAccess(req.user.userId, 'demographic_analytics');
      if (!hasAccess) {
        return res.status(403).json({
          error: {
            code: 'PREMIUM_REQUIRED',
            message: 'Premium subscription required',
          },
          timestamp: new Date().toISOString(),
          path: req.path,
        });
      }

      // Get available regions with minimum user thresholds
      const regions = await analyticsService.getRegionSummaries({ timeRange: '1y' });
      
      const countries = [...new Set(regions.map(r => r.country))].sort();
      const regionsByCountry = regions.reduce((acc, region) => {
        if (!acc[region.country]) acc[region.country] = [];
        if (region.region) acc[region.country].push(region.region);
        return acc;
      }, {} as Record<string, string[]>);

      res.json({
        data: {
          countries,
          regionsByCountry,
          totalRegions: regions.length,
        },
      });
    } catch (error: any) {
      console.error('Available regions error:', error);
      res.status(500).json({
        error: {
          code: 'REGIONS_FETCH_FAILED',
          message: 'Failed to fetch available regions',
        },
        timestamp: new Date().toISOString(),
        path: req.path,
      });
    }
  }
}