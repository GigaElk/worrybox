import { Router, Request, Response } from 'express';
import { DiagnosticsService } from '../services/diagnosticsService';
import logger from '../services/logger';

const router = Router();
const diagnostics = DiagnosticsService.getInstance();

/**
 * GET /test/monitoring
 * Test endpoint to verify monitoring system is working
 */
router.get('/monitoring', async (req: Request, res: Response) => {
  try {
    logger.info('Testing monitoring system');
    
    // Collect basic metrics
    const systemMetrics = await diagnostics.collectSystemMetrics();
    
    // Create a test alert
    diagnostics.createAlert(
      'info',
      'performance',
      'Monitoring Test',
      'This is a test alert to verify the monitoring system is working',
      'test_metric',
      100,
      50
    );
    
    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      message: 'Monitoring system is working correctly',
      metrics: {
        uptime: systemMetrics.uptime,
        memoryUsage: systemMetrics.memory.heapUsed,
        memoryPressure: systemMetrics.memory.memoryPressure,
        healthStatus: systemMetrics.health.overall,
        platform: systemMetrics.platform.platform,
      },
      testAlert: 'Created test alert successfully',
    });
  } catch (error) {
    logger.error('Monitoring test failed', error);
    res.status(500).json({
      success: false,
      error: 'Monitoring test failed',
      message: (error as Error).message,
    });
  }
});

/**
 * POST /test/performance
 * Test endpoint to simulate performance issues
 */
router.post('/performance', async (req: Request, res: Response) => {
  try {
    const { delay = 1000, memoryAllocation = 0 } = req.body;
    
    logger.info('Testing performance monitoring', { delay, memoryAllocation });
    
    // Simulate delay
    if (delay > 0) {
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    
    // Simulate memory allocation
    let memoryWaste: any[] = [];
    if (memoryAllocation > 0) {
      for (let i = 0; i < memoryAllocation; i++) {
        memoryWaste.push(new Array(1000).fill('test'));
      }
    }
    
    const memoryUsage = process.memoryUsage();
    
    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      message: 'Performance test completed',
      simulatedDelay: delay,
      simulatedMemoryAllocation: memoryAllocation,
      currentMemoryUsage: {
        heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
        heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
      },
    });
    
    // Clean up memory allocation
    memoryWaste = [];
  } catch (error) {
    logger.error('Performance test failed', error);
    res.status(500).json({
      success: false,
      error: 'Performance test failed',
      message: (error as Error).message,
    });
  }
});

/**
 * POST /test/error
 * Test endpoint to simulate errors for error handling testing
 */
router.post('/error', async (req: Request, res: Response) => {
  try {
    const { errorType = 'generic', severity = 'medium' } = req.body;
    
    logger.info('Testing error handling', { errorType, severity });
    
    // Simulate different types of errors
    switch (errorType) {
      case 'database':
        throw new Error('Database connection failed - simulated error');
      
      case 'memory':
        throw new Error('Out of memory - simulated error');
      
      case 'network':
        throw new Error('Network timeout - simulated error');
      
      case 'validation':
        throw new Error('Validation failed - simulated error');
      
      case 'timeout':
        // Simulate a timeout by waiting longer than expected
        await new Promise(resolve => setTimeout(resolve, 6000));
        break;
      
      default:
        throw new Error('Generic error - simulated for testing');
    }
    
    res.json({
      success: true,
      message: 'Error test completed without throwing error',
      errorType,
    });
  } catch (error) {
    // This is expected - the error should be caught by the error handling middleware
    throw error;
  }
});

export default router;