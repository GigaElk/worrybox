import { PrismaClient } from '@prisma/client';
import logger from '../services/logger';

export class DatabaseConnection {
  private static instance: PrismaClient | null = null;
  private static retryCount = 0;
  private static maxRetries = 10;
  private static retryDelay = 5000; // 5 seconds

  static async getInstance(): Promise<PrismaClient> {
    if (this.instance) {
      return this.instance;
    }

    return this.createConnection();
  }

  private static async createConnection(): Promise<PrismaClient> {
    const prisma = new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
    });

    try {
      // Test the connection
      await this.testConnection(prisma);
      
      this.instance = prisma;
      this.retryCount = 0; // Reset retry count on successful connection
      logger.info('✅ Database connected successfully');
      
      return prisma;
    } catch (error) {
      logger.error(`❌ Database connection failed (attempt ${this.retryCount + 1}/${this.maxRetries}):`, error);
      
      if (this.retryCount < this.maxRetries) {
        this.retryCount++;
        logger.info(`🔄 Retrying database connection in ${this.retryDelay / 1000} seconds...`);
        
        await this.sleep(this.retryDelay);
        return this.createConnection(); // Recursive retry
      } else {
        logger.error('💥 Max database connection retries exceeded. App will continue but database operations may fail.');
        // Don't throw error - let app start but log the issue
        this.instance = prisma; // Still return prisma instance for graceful degradation
        return prisma;
      }
    }
  }

  private static async testConnection(prisma: PrismaClient): Promise<void> {
    await prisma.$queryRaw`SELECT 1`;
  }

  private static sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  static async disconnect(): Promise<void> {
    if (this.instance) {
      await this.instance.$disconnect();
      this.instance = null;
      logger.info('🔌 Database disconnected');
    }
  }

  // Health check method
  static async isHealthy(): Promise<boolean> {
    try {
      if (!this.instance) {
        return false;
      }
      await this.testConnection(this.instance);
      return true;
    } catch (error) {
      logger.error('Database health check failed:', error);
      return false;
    }
  }

  // Retry connection if it's lost
  static async ensureConnection(): Promise<PrismaClient> {
    try {
      if (this.instance) {
        await this.testConnection(this.instance);
        return this.instance;
      }
    } catch (error) {
      logger.warn('Database connection lost, attempting to reconnect...');
      this.instance = null; // Reset instance to force reconnection
    }
    
    return this.createConnection();
  }
}