import { Request, Response, NextFunction } from 'express';
import { EnhancedLogger } from '../services/enhancedLogger';

interface MonitoringAuthConfig {
  enableApiKeyAuth: boolean;
  enableAdminRoleAuth: boolean;
  enableIPWhitelist: boolean;
  apiKeys: string[];
  allowedIPs: string[];
  adminRoles: string[];
  bypassInDevelopment: boolean;
}

export class MonitoringAuthMiddleware {
  private static instance: MonitoringAuthMiddleware;
  private logger: EnhancedLogger;
  
  private config: MonitoringAuthConfig = {
    enableApiKeyAuth: true,
    enableAdminRoleAuth: true,
    enableIPWhitelist: false,
    apiKeys: [
      process.env.MONITORING_API_KEY || 'default-monitoring-key-change-me',
      process.env.ADMIN_API_KEY || 'default-admin-key-change-me',
    ].filter(key => key !== 'default-monitoring-key-change-me' && key !== 'default-admin-key-change-me'),
    allowedIPs: [
      '127.0.0.1',
      '::1',
      'localhost',
      ...(process.env.MONITORING_ALLOWED_IPS?.split(',') || []),
    ],
    adminRoles: ['admin', 'super_admin', 'system_admin'],
    bypassInDevelopment: process.env.NODE_ENV === 'development',
  };

  private constructor() {
    this.logger = EnhancedLogger.getInstance();
  }

  public static getInstance(): MonitoringAuthMiddleware {
    if (!MonitoringAuthMiddleware.instance) {
      MonitoringAuthMiddleware.instance = new MonitoringAuthMiddleware();
    }
    return MonitoringAuthMiddleware.instance;
  }

  /**
   * Middleware for read-only monitoring endpoints (metrics, status, etc.)
   */
  public requireMonitoringAccess() {
    return (req: Request, res: Response, next: NextFunction) => {
      // Bypass in development if configured
      if (this.config.bypassInDevelopment && process.env.NODE_ENV === 'development') {
        this.logger.debug('Bypassing monitoring auth in development', {
          path: req.path,
          ip: this.getClientIP(req),
        });
        return next();
      }

      // Check authentication
      if (!this.isAuthorized(req, 'read')) {
        this.logUnauthorizedAccess(req, 'monitoring_read');
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'Monitoring access requires valid authentication',
          timestamp: new Date().toISOString(),
        });
      }

      this.logAuthorizedAccess(req, 'monitoring_read');
      next();
    };
  }

  /**
   * Middleware for write operations (config changes, debug mode, etc.)
   */
  public requireAdminAccess() {
    return (req: Request, res: Response, next: NextFunction) => {
      // Never bypass admin operations, even in development
      if (!this.isAuthorized(req, 'admin')) {
        this.logUnauthorizedAccess(req, 'admin_write');
        return res.status(403).json({
          error: 'Forbidden',
          message: 'Admin access required for this operation',
          timestamp: new Date().toISOString(),
        });
      }

      this.logAuthorizedAccess(req, 'admin_write');
      next();
    };
  }

  /**
   * Middleware for sensitive diagnostic information
   */
  public requireDiagnosticAccess() {
    return (req: Request, res: Response, next: NextFunction) => {
      // Diagnostic access requires admin level
      if (!this.isAuthorized(req, 'admin')) {
        this.logUnauthorizedAccess(req, 'diagnostic_access');
        return res.status(403).json({
          error: 'Forbidden',
          message: 'Diagnostic access requires admin privileges',
          timestamp: new Date().toISOString(),
        });
      }

      this.logAuthorizedAccess(req, 'diagnostic_access');
      next();
    };
  }

  /**
   * Update authentication configuration
   */
  public updateConfig(updates: Partial<MonitoringAuthConfig>): void {
    this.config = { ...this.config, ...updates };
    this.logger.info('Monitoring auth configuration updated', {
      enableApiKeyAuth: this.config.enableApiKeyAuth,
      enableAdminRoleAuth: this.config.enableAdminRoleAuth,
      enableIPWhitelist: this.config.enableIPWhitelist,
      apiKeyCount: this.config.apiKeys.length,
      allowedIPCount: this.config.allowedIPs.length,
    });
  }

  // Private methods

  private isAuthorized(req: Request, level: 'read' | 'admin'): boolean {
    // Check API key authentication
    if (this.config.enableApiKeyAuth && this.checkApiKey(req)) {
      return true;
    }

    // Check user role authentication
    if (this.config.enableAdminRoleAuth && this.checkUserRole(req, level)) {
      return true;
    }

    // Check IP whitelist (for read access only)
    if (level === 'read' && this.config.enableIPWhitelist && this.checkIPWhitelist(req)) {
      return true;
    }

    return false;
  }

  private checkApiKey(req: Request): boolean {
    const apiKey = req.get('X-API-Key') || 
                   req.get('Authorization')?.replace('Bearer ', '') ||
                   req.query.apiKey as string;

    if (!apiKey) {
      return false;
    }

    return this.config.apiKeys.includes(apiKey);
  }

  private checkUserRole(req: Request, level: 'read' | 'admin'): boolean {
    // This would integrate with your existing auth system
    const user = (req as any).user; // Assuming user is attached by auth middleware
    
    if (!user) {
      return false;
    }

    if (level === 'admin') {
      return this.config.adminRoles.includes(user.role);
    }

    // For read access, allow any authenticated user with admin role
    return this.config.adminRoles.includes(user.role);
  }

  private checkIPWhitelist(req: Request): boolean {
    const clientIP = this.getClientIP(req);
    return this.config.allowedIPs.includes(clientIP);
  }

  private getClientIP(req: Request): string {
    return (
      req.get('X-Forwarded-For')?.split(',')[0]?.trim() ||
      req.get('X-Real-IP') ||
      req.connection.remoteAddress ||
      req.socket.remoteAddress ||
      'unknown'
    );
  }

  private logUnauthorizedAccess(req: Request, operation: string): void {
    this.logger.warn('Unauthorized monitoring access attempt', {
      operation,
      path: req.path,
      method: req.method,
      ip: this.getClientIP(req),
      userAgent: req.get('User-Agent'),
      hasApiKey: !!req.get('X-API-Key'),
      hasAuth: !!req.get('Authorization'),
      user: (req as any).user?.id || 'anonymous',
      category: 'security',
    });
  }

  private logAuthorizedAccess(req: Request, operation: string): void {
    this.logger.info('Authorized monitoring access', {
      operation,
      path: req.path,
      method: req.method,
      ip: this.getClientIP(req),
      user: (req as any).user?.id || 'api_key',
      category: 'monitoring_access',
    });
  }
}

/**
 * Factory functions for easy middleware creation
 */
export function requireMonitoringAccess() {
  return MonitoringAuthMiddleware.getInstance().requireMonitoringAccess();
}

export function requireAdminAccess() {
  return MonitoringAuthMiddleware.getInstance().requireAdminAccess();
}

export function requireDiagnosticAccess() {
  return MonitoringAuthMiddleware.getInstance().requireDiagnosticAccess();
}

export default MonitoringAuthMiddleware;