// Examples of how to use the new database recovery system

import { DatabaseConnection } from '../utils/databaseConnection';
import { Request, Response } from 'express';

// Example 1: Simple query with automatic recovery
export async function getUserById(userId: string) {
  return DatabaseConnection.executeOperation(async () => {
    const prisma = await DatabaseConnection.getInstance();
    return prisma.user.findUnique({
      where: { id: userId },
    });
  });
}

// Example 2: Transaction with recovery
export async function createUserWithProfile(userData: any, profileData: any) {
  return DatabaseConnection.executeTransaction(async (prisma) => {
    const user = await prisma.user.create({
      data: userData,
    });

    const profile = await prisma.profile.create({
      data: {
        ...profileData,
        userId: user.id,
      },
    });

    return { user, profile };
  });
}

// Example 3: Using the database middleware in routes
export async function getUserRoute(req: Request & { db?: any }, res: Response) {
  try {
    // Using the injected database wrapper
    const user = await req.db.query(async () => {
      const prisma = await req.db.connection();
      return prisma.user.findUnique({
        where: { id: req.params.id },
      });
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    // Database errors are automatically handled by middleware
    throw error;
  }
}

// Example 4: Complex operation with custom correlation ID
export async function complexUserOperation(userId: string, correlationId: string) {
  return DatabaseConnection.executeOperation(async () => {
    const prisma = await DatabaseConnection.getInstance();
    
    // Multiple database operations in sequence
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { posts: true, profile: true },
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Update user activity
    await prisma.user.update({
      where: { id: userId },
      data: { lastActive: new Date() },
    });

    // Create activity log
    await prisma.activityLog.create({
      data: {
        userId,
        action: 'profile_viewed',
        timestamp: new Date(),
      },
    });

    return user;
  }, correlationId);
}

// Example 5: Health check endpoint using database recovery
export async function databaseHealthRoute(req: Request, res: Response) {
  try {
    const isHealthy = await DatabaseConnection.isHealthy();
    const metrics = DatabaseConnection.getHealthMetrics();

    res.json({
      healthy: isHealthy,
      metrics,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(503).json({
      healthy: false,
      error: 'Health check failed',
      timestamp: new Date().toISOString(),
    });
  }
}

// Example 6: Manual recovery trigger
export async function triggerRecoveryRoute(req: Request, res: Response) {
  try {
    const success = await DatabaseConnection.forceRecovery();
    
    res.json({
      success,
      message: success ? 'Recovery completed' : 'Recovery failed',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to trigger recovery',
      timestamp: new Date().toISOString(),
    });
  }
}

// Example 7: Batch operations with recovery
export async function batchUpdateUsers(updates: Array<{ id: string; data: any }>) {
  return DatabaseConnection.executeTransaction(async (prisma) => {
    const results = [];
    
    for (const update of updates) {
      const result = await prisma.user.update({
        where: { id: update.id },
        data: update.data,
      });
      results.push(result);
    }
    
    return results;
  });
}

// Example 8: Error handling with recovery context
export async function robustDatabaseOperation(data: any) {
  try {
    return await DatabaseConnection.executeOperation(async () => {
      const prisma = await DatabaseConnection.getInstance();
      
      // Your database operation here
      return prisma.someModel.create({ data });
    });
  } catch (error) {
    // Check if it's a retryable error
    const metrics = DatabaseConnection.getHealthMetrics();
    
    if (metrics?.recoveryState.isRecovering) {
      throw new Error('Database is recovering, please try again later');
    }
    
    if (metrics?.recoveryState.circuitBreakerState === 'open') {
      throw new Error('Database is temporarily unavailable');
    }
    
    // Re-throw original error if not a recovery issue
    throw error;
  }
}

// Example 9: Monitoring database performance
export function logDatabaseMetrics() {
  const metrics = DatabaseConnection.getHealthMetrics();
  
  if (metrics) {
    console.log('Database Status:', {
      connectionStatus: metrics.connectionStatus,
      poolHealth: metrics.poolMetrics.poolHealth,
      queuedOperations: metrics.poolMetrics.queuedRequests,
      averageQueryTime: metrics.performanceMetrics.averageQueryTime,
      errorRate: metrics.performanceMetrics.errorRate,
      recentErrors: metrics.recentErrors.length,
    });
  }
}

// Example 10: Graceful shutdown with database cleanup
export async function gracefulShutdown() {
  console.log('Starting graceful shutdown...');
  
  try {
    // Wait for any pending operations to complete
    const metrics = DatabaseConnection.getHealthMetrics();
    if (metrics?.poolMetrics.queuedRequests > 0) {
      console.log(`Waiting for ${metrics.poolMetrics.queuedRequests} queued operations...`);
      // In a real implementation, you might want to wait or set a timeout
    }
    
    // Disconnect database
    await DatabaseConnection.disconnect();
    console.log('Database disconnected successfully');
  } catch (error) {
    console.error('Error during graceful shutdown:', error);
  }
}