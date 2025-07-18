import { Request, Response } from 'express';
import { DashboardService } from '../services/dashboardService';

const dashboardService = new DashboardService();

export class DashboardController {
  async getDashboardData(req: Request, res: Response) {
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

      const dashboardData = await dashboardService.getDashboardData(req.user.userId);

      res.json({
        data: dashboardData,
      });
    } catch (error: any) {
      console.error('Failed to get dashboard data:', error);
      res.status(500).json({
        error: {
          code: 'DASHBOARD_DATA_FETCH_FAILED',
          message: error.message,
        },
        timestamp: new Date().toISOString(),
        path: req.path,
      });
    }
  }

  async getBasicStats(req: Request, res: Response) {
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

      const stats = await dashboardService.getBasicStats(req.user.userId);

      res.json({
        data: stats,
      });
    } catch (error: any) {
      console.error('Failed to get basic stats:', error);
      res.status(500).json({
        error: {
          code: 'BASIC_STATS_FETCH_FAILED',
          message: error.message,
        },
        timestamp: new Date().toISOString(),
        path: req.path,
      });
    }
  }

  async getRecentWorries(req: Request, res: Response) {
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

      const limit = req.query.limit ? parseInt(req.query.limit as string) : 5;
      const recentWorries = await dashboardService.getRecentWorries(req.user.userId, limit);

      res.json({
        data: recentWorries,
      });
    } catch (error: any) {
      console.error('Failed to get recent worries:', error);
      res.status(500).json({
        error: {
          code: 'RECENT_WORRIES_FETCH_FAILED',
          message: error.message,
        },
        timestamp: new Date().toISOString(),
        path: req.path,
      });
    }
  }
}