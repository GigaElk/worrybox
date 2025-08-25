import { randomUUID } from 'crypto';

export class CorrelationService {
  private static instance: CorrelationService;

  public static getInstance(): CorrelationService {
    if (!CorrelationService.instance) {
      CorrelationService.instance = new CorrelationService();
    }
    return CorrelationService.instance;
  }

  /**
   * Generate a new correlation ID for request tracking
   */
  generateCorrelationId(): string {
    return `req_${randomUUID().replace(/-/g, '').substring(0, 16)}`;
  }

  /**
   * Generate a correlation ID for system operations
   */
  generateSystemCorrelationId(operation: string): string {
    return `sys_${operation}_${Date.now().toString(36)}`;
  }

  /**
   * Generate a correlation ID for health checks
   */
  generateHealthCheckCorrelationId(): string {
    return `health_${Date.now().toString(36)}`;
  }

  /**
   * Extract correlation ID from request headers or generate new one
   */
  getOrCreateCorrelationId(headers: Record<string, any>): string {
    const existingId = headers['x-correlation-id'] || headers['X-Correlation-ID'];
    return existingId || this.generateCorrelationId();
  }

  /**
   * Validate correlation ID format
   */
  isValidCorrelationId(id: string): boolean {
    if (!id || typeof id !== 'string') return false;
    
    // Check for our standard formats
    const patterns = [
      /^req_[a-f0-9]{16}$/,     // Request IDs
      /^sys_\w+_[a-z0-9]+$/,    // System operation IDs
      /^health_[a-z0-9]+$/,     // Health check IDs
    ];
    
    return patterns.some(pattern => pattern.test(id));
  }
}