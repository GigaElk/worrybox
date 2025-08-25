import { PrismaClient } from '@prisma/client';
import { DatabaseRecoveryService } from '../services/databaseRecovery';
import logger from '../services/logger';

export class DatabaseConnection {
  private static instance: PrismaClient | null = null;
  private static recoveryService: DatabaseRecoveryService;
  private static isInitialized = false;

  /**
   * Initialize the database connection with recovery service
   */
  static async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    this.recoveryService = DatabaseRecoveryService.getInstance();
    await this.recoveryService.initialize();
    this.isInitialized = true;
    
    logger.info('Database connection initialized with recovery service');
  }

  /**
   * Get database instance with automatic recovery
   */
  static async getInstance(): Promise<PrismaClient> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      this.instance = await this.recoveryService.getConnection();
      return this.instance;
    } catch (error) {
      logger.error('Failed to get database connection', error);
      throw error;
    }
  }

  /**
   * Execute database operation with automatic retry and recovery
   */
  static async executeOperation<T>(
    operation: () => Promise<T>,
    correlationId?: string
  ): Promise<T> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    return this.recoveryService.executeOperation(operation, {
      correlationId,
      operationType: 'query',
    });
  }

  /**
   * Execute database transaction with recovery
   */
  static async executeTransaction<T>(
    operation: (prisma: PrismaClient) => Promise<T>,
    correlationId?: string
  ): Promise<T> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    return this.recoveryService.executeOperation(async () => {
      const prisma = await this.getInstance();
      return prisma.$transaction(async (tx) => {
        return operation(tx as PrismaClient);
      });
    }, {
      correlationId,
      operationType: 'transaction',
    });
  }

  /**
   * Health check with recovery service metrics
   */
  static async isHealthy(): Promise<boolean> {
    if (!this.isInitialized) {
      try {
        await this.initialize();
      } catch (error) {
        return false;
      }
    }

    try {
      const metrics = this.recoveryService.getHealthMetrics();
      return metrics.connectionStatus === 'connected' && 
             metrics.poolMetrics.poolHealth !== 'unhealthy';
    } catch (error) {
      logger.error('Database health check failed:', error);
      return false;
    }
  }

  /**
   * Get detailed database health metrics
   */
  static getHealthMetrics() {
    if (!this.isInitialized || !this.recoveryService) {
      return null;
    }

    return this.recoveryService.getHealthMetrics();
  }

  /**
   * Force database recovery
   */
  static async forceRecovery(): Promise<boolean> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    return this.recoveryService.forceRecovery();
  }

  /**
   * Reset database connections (for error recovery)
   */
  static async resetConnections(): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    logger.info('Resetting database connections for error recovery');
    
    try {
      // Disconnect current instance
      if (this.instance) {
        await this.instance.$disconnect();
        this.instance = null;
      }
      
      // Force recovery through recovery service
      await this.recoveryService.forceRecovery();
      
      logger.info('Database connections reset successfully');
    } catch (error) {
      logger.error('Failed to reset database connections', error);
      throw error;
    }
  }

  /**
   * Ensure connection is available (legacy compatibility)
   */
  static async ensureConnection(): Promise<PrismaClient> {
    return this.getInstance();
  }

  /**
   * Disconnect and cleanup
   */
  static async disconnect(): Promise<void> {
    if (this.recoveryService) {
      await this.recoveryService.cleanup();
    }
    
    if (this.instance) {
      await this.instance.$disconnect();
      this.instance = null;
    }
    
    this.isInitialized = false;
    logger.info('🔌 Database disconnected and cleaned up');
  }

  // Legacy methods for backward compatibility
  
  private static async createConnection(): Promise<PrismaClient> {
    return this.getInstance();
  }

  private static async testConnection(prisma?: PrismaClient): Promise<void> {
    const connection = prisma || await this.getInstance();
    await connection.$queryRaw`SELECT 1`;
  }

  private static sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}