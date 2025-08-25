import { EnhancedLogger } from './enhancedLogger';
import { PerformanceMonitor } from './performanceMonitor';
import { ComprehensiveLoggingMiddleware } from '../middleware/comprehensiveLogging';
import { PlatformAdapterService } from './platformAdapter';

interface LoggingConfiguration {
  // Global logging settings
  logLevel: 'error' | 'warn' | 'info' | 'http' | 'debug';
  enableStructuredLogging: boolean;
  enableCorrelationTracking: boolean;
  enableMetricsCollection: boolean;
  
  // Performance logging
  enablePerformanceLogging: boolean;
  performanceThresholds: {
    slow: number;
    verySlow: number;
    critical: number;
    memoryWarning: number;
    memoryCritical: number;
  };
  
  // Error logging
  enableErrorContextLogging: boolean;
  enableSystemStateLogging: boolean;
  errorSeverityMapping: {
    [statusCode: number]: 'low' | 'medium' | 'high' | 'critical';
  };
  
  // Request/Response logging
  enableRequestLogging: boolean;
  enableResponseLogging: boolean;
  enableSlowRequestLogging: boolean;
  slowRequestThreshold: number;
  
  // Security and privacy
  sanitizeHeaders: boolean;
  logRequestBody: boolean;
  logResponseBody: boolean;
  maxBodySize: number;
  excludePaths: string[];
  
  // File logging (for non-serverless environments)
  enableFileLogging: boolean;
  logRotation: {
    maxSize: string;
    maxFiles: number;
  };
  
  // Environment-specific settings
  productionOptimizations: boolean;
  developmentVerbosity: boolean;
}

export class LoggingConfigManager {
  private static instance: LoggingConfigManager;
  private platformAdapter: PlatformAdapterService;
  private currentConfig: LoggingConfiguration;

  private constructor() {
    this.platformAdapter = PlatformAdapterService.getInstance();
    this.currentConfig = this.getDefaultConfiguration();
    this.applyEnvironmentOptimizations();
  }

  public static getInstance(): LoggingConfigManager {
    if (!LoggingConfigManager.instance) {
      LoggingConfigManager.instance = new LoggingConfigManager();
    }
    return LoggingConfigManager.instance;
  }

  /**
   * Get current logging configuration
   */
  getConfiguration(): LoggingConfiguration {
    return { ...this.currentConfig };
  }

  /**
   * Update logging configuration
   */
  updateConfiguration(updates: Partial<LoggingConfiguration>): void {
    this.currentConfig = { ...this.currentConfig, ...updates };
    this.applyConfiguration();
  }

  /**
   * Set log level for all loggers
   */
  setLogLevel(level: LoggingConfiguration['logLevel']): void {
    this.currentConfig.logLevel = level;
    
    const enhancedLogger = EnhancedLogger.getInstance();
    enhancedLogger.setLogLevel(level);
    
    enhancedLogger.info('Log level updated', {
      newLevel: level,
      category: 'configuration',
    });
  }

  /**
   * Configure for production environment
   */
  configureForProduction(): void {
    const productionConfig: Partial<LoggingConfiguration> = {
      logLevel: 'warn',
      enableStructuredLogging: true,
      enablePerformanceLogging: true,
      enableErrorContextLogging: true,
      enableSystemStateLogging: true,
      logRequestBody: false,
      logResponseBody: false,
      sanitizeHeaders: true,
      productionOptimizations: true,
      developmentVerbosity: false,
      excludePaths: ['/health', '/metrics', '/favicon.ico', '/robots.txt'],
    };

    this.updateConfiguration(productionConfig);
  }

  /**
   * Configure for development environment
   */
  configureForDevelopment(): void {
    const developmentConfig: Partial<LoggingConfiguration> = {
      logLevel: 'debug',
      enableStructuredLogging: false,
      enablePerformanceLogging: true,
      enableErrorContextLogging: true,
      enableSystemStateLogging: false,
      logRequestBody: true,
      logResponseBody: false,
      sanitizeHeaders: false,
      productionOptimizations: false,
      developmentVerbosity: true,
      excludePaths: ['/favicon.ico'],
    };

    this.updateConfiguration(developmentConfig);
  }

  /**
   * Configure for testing environment
   */
  configureForTesting(): void {
    const testingConfig: Partial<LoggingConfiguration> = {
      logLevel: 'error',
      enableStructuredLogging: true,
      enablePerformanceLogging: false,
      enableErrorContextLogging: false,
      enableSystemStateLogging: false,
      enableRequestLogging: false,
      enableResponseLogging: false,
      logRequestBody: false,
      logResponseBody: false,
      productionOptimizations: true,
      developmentVerbosity: false,
    };

    this.updateConfiguration(testingConfig);
  }

  /**
   * Configure performance thresholds based on platform
   */
  configurePlatformOptimizedThresholds(): void {
    const platform = this.platformAdapter.getPlatform();
    let thresholds = this.currentConfig.performanceThresholds;

    if (platform === 'render') {
      // Render.com optimized thresholds
      thresholds = {
        slow: 800, // More sensitive on Render
        verySlow: 3000,
        critical: 8000,
        memoryWarning: 30, // Lower threshold due to 512MB limit
        memoryCritical: 50,
      };
    } else if (platform === 'local') {
      // Development optimized thresholds
      thresholds = {
        slow: 2000, // More relaxed for development
        verySlow: 5000,
        critical: 10000,
        memoryWarning: 100,
        memoryCritical: 200,
      };
    }

    this.updateConfiguration({ performanceThresholds: thresholds });
  }

  /**
   * Enable debug mode temporarily
   */
  enableDebugMode(durationMs: number = 300000): void { // 5 minutes default
    const originalLevel = this.currentConfig.logLevel;
    
    this.setLogLevel('debug');
    
    const enhancedLogger = EnhancedLogger.getInstance();
    enhancedLogger.info('Debug mode enabled temporarily', {
      duration: durationMs,
      originalLevel,
      category: 'configuration',
    });

    setTimeout(() => {
      this.setLogLevel(originalLevel);
      enhancedLogger.info('Debug mode disabled, reverted to original level', {
        revertedLevel: originalLevel,
        category: 'configuration',
      });
    }, durationMs);
  }

  /**
   * Get logging recommendations based on current state
   */
  getRecommendations(): string[] {
    const recommendations: string[] = [];
    const platform = this.platformAdapter.getPlatform();
    const env = process.env.NODE_ENV || 'development';

    // Environment-specific recommendations
    if (env === 'production' && this.currentConfig.logLevel === 'debug') {
      recommendations.push('Consider using "warn" or "info" log level in production for better performance');
    }

    if (env === 'production' && this.currentConfig.logRequestBody) {
      recommendations.push('Disable request body logging in production for security and performance');
    }

    // Platform-specific recommendations
    if (platform === 'render') {
      if (this.currentConfig.enableFileLogging) {
        recommendations.push('Consider disabling file logging on Render.com as logs are handled by the platform');
      }
      
      if (this.currentConfig.performanceThresholds.memoryWarning > 50) {
        recommendations.push('Lower memory warning thresholds for Render.com\'s 512MB limit');
      }
    }

    // Performance recommendations
    const performanceMonitor = PerformanceMonitor.getInstance();
    const stats = performanceMonitor.getStats();
    
    if (stats.slowOperations > stats.totalOperations * 0.1) {
      recommendations.push('High number of slow operations detected - consider optimizing performance thresholds');
    }

    // Security recommendations
    if (!this.currentConfig.sanitizeHeaders && env === 'production') {
      recommendations.push('Enable header sanitization in production for security');
    }

    return recommendations;
  }

  /**
   * Export configuration for backup or sharing
   */
  exportConfiguration(): string {
    return JSON.stringify(this.currentConfig, null, 2);
  }

  /**
   * Import configuration from JSON
   */
  importConfiguration(configJson: string): void {
    try {
      const config = JSON.parse(configJson) as LoggingConfiguration;
      this.updateConfiguration(config);
    } catch (error) {
      const enhancedLogger = EnhancedLogger.getInstance();
      enhancedLogger.error('Failed to import logging configuration', error as Error, {
        category: 'configuration_error',
      });
      throw new Error('Invalid configuration JSON');
    }
  }

  // Private methods

  private getDefaultConfiguration(): LoggingConfiguration {
    return {
      logLevel: 'info',
      enableStructuredLogging: true,
      enableCorrelationTracking: true,
      enableMetricsCollection: true,
      
      enablePerformanceLogging: true,
      performanceThresholds: {
        slow: 1000,
        verySlow: 5000,
        critical: 10000,
        memoryWarning: 50,
        memoryCritical: 100,
      },
      
      enableErrorContextLogging: true,
      enableSystemStateLogging: true,
      errorSeverityMapping: {
        400: 'low',
        401: 'low',
        403: 'medium',
        404: 'low',
        422: 'low',
        429: 'medium',
        500: 'high',
        502: 'high',
        503: 'critical',
        504: 'high',
      },
      
      enableRequestLogging: true,
      enableResponseLogging: true,
      enableSlowRequestLogging: true,
      slowRequestThreshold: 1000,
      
      sanitizeHeaders: true,
      logRequestBody: false,
      logResponseBody: false,
      maxBodySize: 10240, // 10KB
      excludePaths: ['/health', '/metrics', '/favicon.ico'],
      
      enableFileLogging: true,
      logRotation: {
        maxSize: '10m',
        maxFiles: 5,
      },
      
      productionOptimizations: false,
      developmentVerbosity: false,
    };
  }

  private applyEnvironmentOptimizations(): void {
    const env = process.env.NODE_ENV || 'development';
    const platform = this.platformAdapter.getPlatform();

    // Apply environment-specific configurations
    switch (env) {
      case 'production':
        this.configureForProduction();
        break;
      case 'development':
        this.configureForDevelopment();
        break;
      case 'test':
        this.configureForTesting();
        break;
    }

    // Apply platform-specific optimizations
    if (platform === 'render') {
      this.currentConfig.enableFileLogging = false; // Render handles logs
      this.configurePlatformOptimizedThresholds();
    }
  }

  private applyConfiguration(): void {
    const enhancedLogger = EnhancedLogger.getInstance();
    const performanceMonitor = PerformanceMonitor.getInstance();
    const loggingMiddleware = ComprehensiveLoggingMiddleware.getInstance();

    // Update enhanced logger
    enhancedLogger.setLogLevel(this.currentConfig.logLevel);
    enhancedLogger.updateConfig({
      enableStructuredLogging: this.currentConfig.enableStructuredLogging,
      enablePerformanceLogging: this.currentConfig.enablePerformanceLogging,
      enableErrorContextLogging: this.currentConfig.enableErrorContextLogging,
      enableSystemStateLogging: this.currentConfig.enableSystemStateLogging,
      enableCorrelationTracking: this.currentConfig.enableCorrelationTracking,
      enableMetricsCollection: this.currentConfig.enableMetricsCollection,
    });

    // Update performance monitor
    performanceMonitor.updateThresholds(this.currentConfig.performanceThresholds);
    performanceMonitor.updateConfig({
      enablePerformanceLogging: this.currentConfig.enablePerformanceLogging,
      logSlowOperations: this.currentConfig.enableSlowRequestLogging,
      logMemoryWarnings: true,
    });

    // Update logging middleware
    loggingMiddleware.updateConfig({
      enableRequestLogging: this.currentConfig.enableRequestLogging,
      enableResponseLogging: this.currentConfig.enableResponseLogging,
      enablePerformanceLogging: this.currentConfig.enablePerformanceLogging,
      enableErrorLogging: this.currentConfig.enableErrorContextLogging,
      enableSlowRequestLogging: this.currentConfig.enableSlowRequestLogging,
      slowRequestThreshold: this.currentConfig.slowRequestThreshold,
      logRequestBody: this.currentConfig.logRequestBody,
      logResponseBody: this.currentConfig.logResponseBody,
      maxBodySize: this.currentConfig.maxBodySize,
      sanitizeHeaders: this.currentConfig.sanitizeHeaders,
      excludePaths: this.currentConfig.excludePaths,
    });

    enhancedLogger.info('Logging configuration applied', {
      logLevel: this.currentConfig.logLevel,
      platform: this.platformAdapter.getPlatform(),
      environment: process.env.NODE_ENV,
      category: 'configuration',
    });
  }
}

export default LoggingConfigManager;