/**
 * Reliability Tests Setup
 * 
 * This file sets up the test environment for reliability integration tests.
 * It ensures all services are properly initialized and configured for testing.
 */

import { DatabaseConnection } from '../../../utils/databaseConnection';
import { MemoryManagerService } from '../../../services/memoryManager';
import { SchedulerManagerService } from '../../../services/schedulerManager';
import { DiagnosticsService } from '../../../services/diagnosticsService';
import { EnhancedLogger } from '../../../services/enhancedLogger';
import { PlatformAdapterService } from '../../../services/platformAdapter';
import { LoggingConfigManager } from '../../../services/loggingConfig';

// Global test configuration
const TEST_CONFIG = {
  // Reduce timeouts for faster tests
  DATABASE_TIMEOUT: 10000,
  MEMORY_CHECK_INTERVAL: 1000,
  SCHEDULER_CHECK_INTERVAL: 2000,
  
  // Test-specific thresholds
  MEMORY_WARNING_THRESHOLD: 100, // MB
  MEMORY_CRITICAL_THRESHOLD: 200, // MB
  
  // Performance expectations
  MAX_RESPONSE_TIME: 5000, // ms
  MAX_MEMORY_INCREASE: 100, // MB
  
  // Reliability requirements
  MIN_SUCCESS_RATE: 0.8, // 80%
  MAX_ERROR_RATE: 0.1, // 10%
};

// Global test state
let isSetupComplete = false;
let setupError: Error | null = null;

/**
 * Initialize all services for reliability testing
 */
export async function setupReliabilityTests(): Promise<void> {
  if (isSetupComplete) {
    if (setupError) {
      throw setupError;
    }
    return;
  }

  try {
    console.log('🔧 Setting up reliability test environment...');

    // Configure logging for tests
    const loggingConfig = LoggingConfigManager.getInstance();
    loggingConfig.configureForTesting();

    // Initialize platform adapter
    const platformAdapter = PlatformAdapterService.getInstance();
    console.log(`📍 Platform detected: ${platformAdapter.getPlatform()}`);

    // Initialize database connection
    console.log('🗄️  Initializing database connection...');
    await DatabaseConnection.initialize();
    
    const isDbHealthy = await DatabaseConnection.isHealthy();
    if (!isDbHealthy) {
      throw new Error('Database is not healthy - cannot run reliability tests');
    }
    console.log('✅ Database connection established');

    // Initialize memory manager
    console.log('🧠 Starting memory monitoring...');
    const memoryManager = MemoryManagerService.getInstance();
    memoryManager.startMonitoring();
    
    // Verify memory monitoring is working
    const memoryStats = await memoryManager.getMemoryStats();
    if (!memoryStats) {
      throw new Error('Memory monitoring is not working');
    }
    console.log('✅ Memory monitoring active');

    // Initialize diagnostics service
    console.log('📊 Initializing diagnostics service...');
    const diagnostics = DiagnosticsService.getInstance();
    await diagnostics.initialize();
    
    // Verify diagnostics are working
    const systemMetrics = await diagnostics.collectSystemMetrics();
    if (!systemMetrics) {
      throw new Error('Diagnostics service is not working');
    }
    console.log('✅ Diagnostics service active');

    // Initialize scheduler manager
    console.log('⏰ Initializing scheduler manager...');
    const schedulerManager = SchedulerManagerService.getInstance();
    
    // Verify scheduler manager is working
    const schedulerStats = await schedulerManager.getSchedulerStats();
    if (!schedulerStats) {
      throw new Error('Scheduler manager is not working');
    }
    console.log('✅ Scheduler manager active');

    // Perform initial health check
    console.log('🏥 Performing initial system health check...');
    const initialHealth = await diagnostics.collectSystemMetrics();
    
    if (initialHealth.health.overall === 'critical') {
      console.warn('⚠️  System health is critical - tests may be unreliable');
    } else {
      console.log(`✅ System health: ${initialHealth.health.overall}`);
    }

    // Log system information
    console.log('📋 System Information:');
    console.log(`   Memory: ${initialHealth.memory.heapUsed}MB / ${initialHealth.memory.heapTotal}MB`);
    console.log(`   Platform: ${initialHealth.platform.platform}`);
    console.log(`   Uptime: ${Math.round(initialHealth.uptime)}s`);

    isSetupComplete = true;
    console.log('🎯 Reliability test environment ready!');

  } catch (error) {
    setupError = error as Error;
    console.error('❌ Failed to setup reliability test environment:', error);
    throw error;
  }
}

/**
 * Cleanup after reliability tests
 */
export async function cleanupReliabilityTests(): Promise<void> {
  try {
    console.log('🧹 Cleaning up reliability test environment...');

    // Cleanup diagnostics
    const diagnostics = DiagnosticsService.getInstance();
    await diagnostics.cleanup();

    // Cleanup database
    await DatabaseConnection.disconnect();

    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }

    console.log('✅ Cleanup complete');
  } catch (error) {
    console.error('❌ Cleanup failed:', error);
    // Don't throw - cleanup failures shouldn't fail tests
  }
}

/**
 * Get test configuration
 */
export function getTestConfig() {
  return { ...TEST_CONFIG };
}

/**
 * Wait for system to stabilize after operations
 */
export async function waitForSystemStabilization(timeoutMs: number = 5000): Promise<void> {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeoutMs) {
    try {
      const diagnostics = DiagnosticsService.getInstance();
      const health = await diagnostics.collectSystemMetrics();
      
      if (health.health.overall !== 'critical') {
        return; // System is stable
      }
    } catch (error) {
      // Continue waiting
    }
    
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.warn('⚠️  System did not stabilize within timeout');
}

/**
 * Create test data for memory pressure tests
 */
export function createMemoryPressure(sizeMB: number): any[] {
  const data: any[] = [];
  const itemsPerMB = 1024; // Approximate
  
  for (let i = 0; i < sizeMB * itemsPerMB; i++) {
    data.push(new Array(100).fill(`test-data-${i}`));
  }
  
  return data;
}

/**
 * Measure operation performance
 */
export async function measurePerformance<T>(
  operation: () => Promise<T>,
  name: string = 'operation'
): Promise<{ result: T; duration: number; memoryDelta: number }> {
  const startTime = Date.now();
  const startMemory = process.memoryUsage().heapUsed;
  
  const result = await operation();
  
  const endTime = Date.now();
  const endMemory = process.memoryUsage().heapUsed;
  
  const duration = endTime - startTime;
  const memoryDelta = Math.round((endMemory - startMemory) / 1024 / 1024); // MB
  
  console.log(`📈 ${name}: ${duration}ms, ${memoryDelta}MB`);
  
  return { result, duration, memoryDelta };
}

/**
 * Assert system health meets reliability requirements
 */
export async function assertSystemHealth(
  expectedLevel: 'healthy' | 'degraded' | 'unhealthy' | 'critical' = 'healthy'
): Promise<void> {
  const diagnostics = DiagnosticsService.getInstance();
  const health = await diagnostics.collectSystemMetrics();
  
  const healthLevels = ['healthy', 'degraded', 'unhealthy', 'critical'];
  const expectedIndex = healthLevels.indexOf(expectedLevel);
  const actualIndex = healthLevels.indexOf(health.health.overall);
  
  if (actualIndex > expectedIndex) {
    throw new Error(
      `System health is ${health.health.overall}, expected ${expectedLevel} or better`
    );
  }
}

/**
 * Verify all critical services are operational
 */
export async function verifyCriticalServices(): Promise<void> {
  const services = [
    {
      name: 'Database',
      check: () => DatabaseConnection.isHealthy(),
    },
    {
      name: 'Memory Manager',
      check: async () => {
        const memoryManager = MemoryManagerService.getInstance();
        const stats = await memoryManager.getMemoryStats();
        return stats.status !== 'critical';
      },
    },
    {
      name: 'Diagnostics',
      check: async () => {
        const diagnostics = DiagnosticsService.getInstance();
        const metrics = await diagnostics.collectSystemMetrics();
        return !!metrics.timestamp;
      },
    },
  ];

  for (const service of services) {
    const isHealthy = await service.check();
    if (!isHealthy) {
      throw new Error(`Critical service ${service.name} is not operational`);
    }
  }
}

// Export test utilities
export const ReliabilityTestUtils = {
  setupReliabilityTests,
  cleanupReliabilityTests,
  getTestConfig,
  waitForSystemStabilization,
  createMemoryPressure,
  measurePerformance,
  assertSystemHealth,
  verifyCriticalServices,
};

export default ReliabilityTestUtils;