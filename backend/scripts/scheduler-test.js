#!/usr/bin/env node

/**
 * Scheduler Resilience Testing Script
 * 
 * This script can be used to test the scheduler resilience system
 * Run with: node scripts/scheduler-test.js [command]
 * 
 * Commands:
 *   status    - Show current scheduler status
 *   start     - Start all schedulers
 *   stop      - Stop all schedulers
 *   restart   - Restart a specific scheduler
 *   test      - Run comprehensive resilience test
 *   stress    - Run stress test
 *   report    - Generate resilience report
 */

const path = require('path');

// Add the src directory to the module path
require('module-alias/register');
require('module-alias').addAlias('@', path.join(__dirname, '../src'));

// Set environment for testing
process.env.NODE_ENV = process.env.NODE_ENV || 'development';

async function main() {
  const command = process.argv[2] || 'status';
  const schedulerName = process.argv[3];
  
  try {
    // Dynamic import to ensure proper module loading
    const { SchedulerResilienceService } = await import('../src/services/schedulerResilience.js');
    const { schedulerTestingUtil } = await import('../src/utils/schedulerTesting.js');
    
    const schedulerResilience = SchedulerResilienceService.getInstance();
    
    console.log(`🔧 Scheduler Resilience Test - Command: ${command}\\n`);
    
    switch (command) {
      case 'status':
        await showSchedulerStatus(schedulerResilience);
        break;
        
      case 'start':
        await startAllSchedulers(schedulerResilience);
        break;
        
      case 'stop':
        await stopAllSchedulers(schedulerResilience);
        break;
        
      case 'restart':
        if (!schedulerName) {
          console.log('Usage: node scripts/scheduler-test.js restart <schedulerName>');
          process.exit(1);
        }
        await restartScheduler(schedulerResilience, schedulerName);
        break;
        
      case 'test':
        await runComprehensiveTest(schedulerTestingUtil);
        break;
        
      case 'stress':
        const duration = parseInt(process.argv[3]) || 60000;
        await runStressTest(schedulerTestingUtil, duration);
        break;
        
      case 'report':
        await generateReport(schedulerTestingUtil);
        break;
        
      default:
        console.log('Unknown command. Available commands: status, start, stop, restart, test, stress, report');
        process.exit(1);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

async function showSchedulerStatus(schedulerResilience) {
  console.log('📊 Current Scheduler Status:');
  console.log('============================');
  
  const allHealth = schedulerResilience.getAllHealth();
  const allMetrics = schedulerResilience.getAllMetrics();
  
  if (allHealth.length === 0) {
    console.log('No schedulers registered');
    return;
  }
  
  const summary = {
    total: allHealth.length,
    healthy: allHealth.filter(h => h.status === 'healthy').length,
    degraded: allHealth.filter(h => h.status === 'degraded').length,
    unhealthy: allHealth.filter(h => h.status === 'unhealthy').length,
    stopped: allHealth.filter(h => h.status === 'stopped').length,
  };
  
  console.log(`Total Schedulers: ${summary.total}`);
  console.log(`Healthy: ${getStatusEmoji('healthy')} ${summary.healthy}`);
  console.log(`Degraded: ${getStatusEmoji('degraded')} ${summary.degraded}`);
  console.log(`Unhealthy: ${getStatusEmoji('unhealthy')} ${summary.unhealthy}`);
  console.log(`Stopped: ${getStatusEmoji('stopped')} ${summary.stopped}`);
  
  console.log('\\n📋 Individual Scheduler Status:');
  console.log('================================');
  
  allHealth.forEach(health => {
    const metrics = allMetrics.find(m => m.schedulerName === health.name) || {};
    
    console.log(`\\n${getStatusEmoji(health.status)} ${health.name}`);
    console.log(`  Status: ${health.status.toUpperCase()}`);
    console.log(`  Memory Usage: ${health.memoryUsage}MB`);
    console.log(`  Uptime: ${formatUptime(health.uptime)}`);
    console.log(`  Consecutive Failures: ${health.consecutiveFailures}`);
    console.log(`  Restart Count: ${health.restartCount}`);
    
    if (metrics.totalExecutions) {
      console.log(`  Total Executions: ${metrics.totalExecutions}`);
      console.log(`  Success Rate: ${((metrics.successfulExecutions / metrics.totalExecutions) * 100).toFixed(1)}%`);
      console.log(`  Average Execution Time: ${metrics.averageExecutionTime.toFixed(0)}ms`);
    }
    
    if (health.lastExecution) {
      console.log(`  Last Execution: ${health.lastExecution.success ? '✅' : '❌'} ${new Date(health.lastExecution.timestamp).toLocaleString()}`);
      if (health.lastExecution.error) {
        console.log(`  Last Error: ${health.lastExecution.error}`);
      }
    }
  });
}

async function startAllSchedulers(schedulerResilience) {
  console.log('🚀 Starting All Schedulers...');
  
  try {
    await schedulerResilience.startAll();
    
    // Wait a moment for startup to complete
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const allHealth = schedulerResilience.getAllHealth();
    const healthyCount = allHealth.filter(h => h.status === 'healthy').length;
    
    console.log(`✅ Startup completed`);
    console.log(`Healthy Schedulers: ${healthyCount}/${allHealth.length}`);
    
    if (healthyCount < allHealth.length) {
      console.log('\\n⚠️  Some schedulers failed to start:');
      allHealth.filter(h => h.status !== 'healthy').forEach(h => {
        console.log(`  - ${h.name}: ${h.status}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Failed to start schedulers:', error.message);
  }
}

async function stopAllSchedulers(schedulerResilience) {
  console.log('🛑 Stopping All Schedulers...');
  
  try {
    await schedulerResilience.stopAll();
    
    const allHealth = schedulerResilience.getAllHealth();
    const stoppedCount = allHealth.filter(h => h.status === 'stopped').length;
    
    console.log(`✅ Shutdown completed`);
    console.log(`Stopped Schedulers: ${stoppedCount}/${allHealth.length}`);
    
  } catch (error) {
    console.error('❌ Failed to stop schedulers:', error.message);
  }
}

async function restartScheduler(schedulerResilience, schedulerName) {
  console.log(`🔄 Restarting Scheduler: ${schedulerName}...`);
  
  try {
    const beforeHealth = schedulerResilience.getHealth(schedulerName);
    if (!beforeHealth) {
      console.log(`❌ Scheduler ${schedulerName} not found`);
      return;
    }
    
    await schedulerResilience.restart(schedulerName);
    
    // Wait a moment for restart to complete
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const afterHealth = schedulerResilience.getHealth(schedulerName);
    
    console.log(`✅ Restart completed`);
    console.log(`Status: ${beforeHealth.status} → ${afterHealth.status}`);
    console.log(`Restart Count: ${afterHealth.restartCount}`);
    
  } catch (error) {
    console.error(`❌ Failed to restart scheduler ${schedulerName}:`, error.message);
  }
}

async function runComprehensiveTest(schedulerTestingUtil) {
  console.log('🧪 Running Comprehensive Scheduler Resilience Test');
  console.log('==================================================\\n');
  
  try {
    await schedulerTestingUtil.runComprehensiveTest();
    console.log('\\n✅ Comprehensive test completed successfully');
  } catch (error) {
    console.error('\\n❌ Comprehensive test failed:', error.message);
  }
}

async function runStressTest(schedulerTestingUtil, duration) {
  console.log(`🔥 Running Scheduler Stress Test (${duration}ms)`);
  console.log('==============================================\\n');
  
  try {
    await schedulerTestingUtil.simulateStressTest(duration);
    console.log('\\n✅ Stress test completed');
  } catch (error) {
    console.error('\\n❌ Stress test failed:', error.message);
  }
}

async function generateReport(schedulerTestingUtil) {
  console.log('📋 Generating Scheduler Resilience Report...');
  
  const report = schedulerTestingUtil.generateResilienceReport();
  
  console.log('\\n📊 Scheduler Resilience Report:');
  console.log('===============================');
  console.log(JSON.stringify(report, null, 2));
  
  try {
    const fs = await import('fs/promises');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `scheduler-report-${timestamp}.json`;
    
    await fs.writeFile(filename, JSON.stringify(report, null, 2));
    console.log(`\\n💾 Report saved to: ${filename}`);
  } catch (error) {
    console.log('\\n⚠️  Could not save report to file:', error.message);
  }
}

function getStatusEmoji(status) {
  switch (status) {
    case 'healthy': return '✅';
    case 'degraded': return '⚠️';
    case 'unhealthy': return '❌';
    case 'stopped': return '⏹️';
    case 'starting': return '🔄';
    case 'stopping': return '🛑';
    default: return '❓';
  }
}

function formatUptime(seconds) {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${hours}h ${minutes}m`;
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