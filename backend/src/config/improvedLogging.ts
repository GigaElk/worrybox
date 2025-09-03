import { LoggingConfigManager } from '../services/loggingConfig';

export function initializeImprovedLogging(): void {
  const loggingConfigManager = LoggingConfigManager.getInstance();
  const environment = process.env.NODE_ENV || 'development';
  
  // For development, use minimal logging to reduce console noise
  if (environment === 'development') {
    // Set environment variable to disable Morgan HTTP logging
    process.env.DISABLE_HTTP_LOGGING = 'true';
    
    const quietConfig = {
      logLevel: 'error' as const,
      enableStructuredLogging: false,
      enablePerformanceLogging: false,
      enableErrorContextLogging: false,
      enableSystemStateLogging: false,
      enableRequestLogging: false,
      enableResponseLogging: false,
      enableSlowRequestLogging: false,
      logRequestBody: false,
      logResponseBody: false,
      enableCorrelationTracking: false,
      enableMetricsCollection: false,
      excludePaths: ['/favicon.ico', '/health', '/metrics', '/api/health', '/api'],
      performanceThresholds: {
        slow: 30000, // Very high thresholds to avoid noise
        verySlow: 60000,
        critical: 120000,
        memoryWarning: 1000,
        memoryCritical: 2000,
      },
    };
    
    loggingConfigManager.updateConfiguration(quietConfig);
    
    // Also set the winston logger level directly
    const winston = require('winston');
    const defaultLogger = winston.loggers.get('default');
    if (defaultLogger) {
      defaultLogger.level = 'error';
    }
    
    console.log('✅ Quiet logging configuration applied for development');
    return;
  }
  
  // Improved configuration for production/other environments
  const improvedConfig = {
    // 6.1: Log 404s at INFO level instead of WARN
    errorSeverityMapping: {
      400: 'low' as const,
      401: 'low' as const,
      403: 'medium' as const,
      404: 'low' as const, // 404s treated as low severity
      422: 'low' as const,
      429: 'medium' as const,
      500: 'high' as const,
      502: 'high' as const,
      503: 'critical' as const,
      504: 'high' as const,
    },
    
    // 6.2: Reduce duplicate log entries
    enableResponseLogging: false,
    
    // 6.5: Higher memory thresholds for stable usage
    performanceThresholds: {
      slow: 1000,
      verySlow: 5000,
      critical: 10000,
      memoryWarning: environment === 'production' ? 100 : 50,
      memoryCritical: environment === 'production' ? 200 : 100,
    },
    
    // 6.6: Enable correlation tracking
    enableCorrelationTracking: true,
    enableStructuredLogging: true,
  };

  loggingConfigManager.updateConfiguration(improvedConfig);
  console.log('✅ Improved logging configuration applied');
}