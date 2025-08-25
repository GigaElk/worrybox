#!/usr/bin/env node

/**
 * Memory Management Testing Script
 * 
 * This script can be used to test the memory management system
 * Run with: node scripts/memory-test.js [command]
 * 
 * Commands:
 *   status    - Show current memory status
 *   gc        - Force garbage collection
 *   simulate  - Simulate memory pressure
 *   monitor   - Start continuous monitoring
 *   test      - Run full memory management test
 */

const path = require('path');

// Add the src directory to the module path
require('module-alias/register');
require('module-alias').addAlias('@', path.join(__dirname, '../src'));

// Set environment for testing
process.env.NODE_ENV = process.env.NODE_ENV || 'development';

async function main() {
  const command = process.argv[2] || 'status';
  
  try {
    // Dynamic import to ensure proper module loading
    const { MemoryManagerService } = await import('../src/services/memoryManager.js');
    const { memoryMonitorUtil } = await import('../src/utils/memoryMonitor.js');
    
    const memoryManager = MemoryManagerService.getInstance();
    
    // Initialize memory manager
    await memoryManager.initialize();
    
    console.log(`🧠 Memory Management Test - Command: ${command}\\n`);
    
    switch (command) {
      case 'status':
        await showMemoryStatus(memoryManager);
        break;
        
      case 'gc':
        await forceGarbageCollection(memoryManager);
        break;
        
      case 'simulate':
        const sizeMB = parseInt(process.argv[3]) || 100;
        await simulateMemoryPressure(memoryMonitorUtil, sizeMB);
        break;
        
      case 'monitor':
        const intervalMs = parseInt(process.argv[3]) || 5000;
        await startMonitoring(memoryMonitorUtil, intervalMs);
        break;
        
      case 'test':
        await runFullTest(memoryMonitorUtil);
        break;
        
      case 'report':
        await generateReport(memoryMonitorUtil);
        break;
        
      default:
        console.log('Unknown command. Available commands: status, gc, simulate, monitor, test, report');
        process.exit(1);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

async function showMemoryStatus(memoryManager) {
  console.log('📊 Current Memory Status:');
  console.log('========================');
  
  const metrics = memoryManager.getHealthMetrics();
  const memUsage = process.memoryUsage();
  
  console.log(`Status: ${getStatusEmoji(metrics.status)} ${metrics.status.toUpperCase()}`);
  console.log(`Usage: ${metrics.currentUsage.usagePercentage}%`);
  console.log(`Heap: ${Math.round(memUsage.heapUsed / 1024 / 1024)}MB / ${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`);
  console.log(`RSS: ${Math.round(memUsage.rss / 1024 / 1024)}MB`);
  console.log(`External: ${Math.round(memUsage.external / 1024 / 1024)}MB`);
  console.log(`Trend: ${metrics.trend.isIncreasing ? '📈 Increasing' : '📊 Stable'} (${metrics.trend.growthRate}MB/min)`);
  console.log(`GC Collections: ${metrics.gcStats.totalCollections}`);
  console.log(`GC Efficiency: ${Math.round(metrics.gcStats.efficiency)}%`);
  console.log(`Recent Alerts: ${metrics.recentAlerts.length}`);
  console.log(`Leak Suspected: ${metrics.leakDetection.suspectedLeaks.length > 0 ? '🚨 YES' : '✅ NO'}`);
  
  if (metrics.recommendations.length > 0) {
    console.log('\\n💡 Recommendations:');
    metrics.recommendations.forEach((rec, i) => {
      console.log(`  ${i + 1}. ${rec}`);
    });
  }
}

async function forceGarbageCollection(memoryManager) {
  console.log('🗑️  Forcing Garbage Collection...');
  
  const beforeUsage = process.memoryUsage();
  const action = await memoryManager.forceGarbageCollection('manual_test');
  const afterUsage = process.memoryUsage();
  
  const memoryFreed = beforeUsage.heapUsed - afterUsage.heapUsed;
  
  console.log(`✅ Garbage Collection ${action.success ? 'Completed' : 'Failed'}`);
  console.log(`Memory Freed: ${Math.round(memoryFreed / 1024 / 1024)}MB`);
  console.log(`Duration: ${action.duration}ms`);
  console.log(`Before: ${Math.round(beforeUsage.heapUsed / 1024 / 1024)}MB`);
  console.log(`After: ${Math.round(afterUsage.heapUsed / 1024 / 1024)}MB`);
}

async function simulateMemoryPressure(memoryMonitorUtil, sizeMB) {
  console.log(`🧪 Simulating Memory Pressure: ${sizeMB}MB`);
  console.log('This will create temporary memory pressure for testing...');
  
  await memoryMonitorUtil.simulateMemoryPressure(sizeMB);
  
  console.log('✅ Memory pressure simulation completed');
}

async function startMonitoring(memoryMonitorUtil, intervalMs) {
  console.log(`👀 Starting Memory Monitoring (${intervalMs}ms intervals)`);
  console.log('Press Ctrl+C to stop monitoring\\n');
  
  memoryMonitorUtil.startDevelopmentMonitoring(intervalMs);
  
  // Keep the process running
  process.on('SIGINT', () => {
    console.log('\\n🛑 Stopping memory monitoring...');
    memoryMonitorUtil.stopDevelopmentMonitoring();
    process.exit(0);
  });
  
  // Keep alive
  setInterval(() => {}, 1000);
}

async function runFullTest(memoryMonitorUtil) {
  console.log('🧪 Running Full Memory Management Test');
  console.log('=====================================\\n');
  
  await memoryMonitorUtil.testMemoryManagement();
  
  console.log('\\n✅ Full memory management test completed');
}

async function generateReport(memoryMonitorUtil) {
  console.log('📋 Generating Memory Report...');
  
  const report = memoryMonitorUtil.generateMemoryReport();
  
  console.log('\\n📊 Memory Report:');
  console.log('=================');
  console.log(JSON.stringify(report, null, 2));
  
  try {
    const filename = await memoryMonitorUtil.saveMemoryReport();
    console.log(`\\n💾 Report saved to: ${filename}`);
  } catch (error) {
    console.log('\\n⚠️  Could not save report to file:', error.message);
  }
}

function getStatusEmoji(status) {
  switch (status) {
    case 'healthy': return '✅';
    case 'warning': return '⚠️';
    case 'critical': return '🚨';
    case 'emergency': return '🔥';
    default: return '❓';
  }
}

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error.message);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Run the main function
main().catch(console.error);