#!/usr/bin/env node

/**
 * Error Handling Testing Script
 * 
 * This script can be used to test the error handling and recovery system
 * Run with: node scripts/error-test.js [command]
 * 
 * Commands:
 *   metrics   - Show current error metrics
 *   alerts    - Show active error alerts
 *   test      - Test error handling with various error types
 *   recovery  - Test error recovery mechanisms
 *   circuit   - Test circuit breaker functionality
 *   timeout   - Test request timeout handling
 */

const path = require('path');

// Add the src directory to the module path
require('module-alias/register');
require('module-alias').addAlias('@', path.join(__dirname, '../src'));

// Set environment for testing
process.env.NODE_ENV = process.env.NODE_ENV || 'development';

async function main() {
  const command = process.argv[2] || 'metrics';
  
  try {
    console.log(`🔧 Error Handling Test - Command: ${command}\\n`);
    
    switch (command) {
      case 'metrics':
        await showErrorMetrics();
        break;
        
      case 'alerts':
        await showErrorAlerts();
        break;
        
      case 'test':
        const errorType = process.argv[3] || 'all';
        await testErrorHandling(errorType);
        break;
        
      case 'recovery':
        await testErrorRecovery();
        break;
        
      case 'circuit':
        await testCircuitBreaker();
        break;
        
      case 'timeout':
        await testRequestTimeout();
        break;
        
      default:
        console.log('Unknown command. Available commands: metrics, alerts, test, recovery, circuit, timeout');
        process.exit(1);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

async function showErrorMetrics() {
  console.log('📊 Current Error Metrics:');
  console.log('=========================');
  
  try {
    const response = await fetch('http://localhost:5000/api/errors/metrics');
    const data = await response.json();
    
    console.log(`Total Errors: ${data.metrics.totalErrors}`);
    console.log(`Error Rate: ${data.metrics.errorRate}%`);
    console.log(`Successful Recoveries: ${data.metrics.successfulRecoveries}`);
    console.log(`Failed Recoveries: ${data.metrics.failedRecoveries}`);
    console.log(`Average Recovery Time: ${data.metrics.averageRecoveryTime}ms`);
    
    if (data.metrics.lastError) {
      console.log('\\n🚨 Last Error:');
      console.log(`  Type: ${data.metrics.lastError.type}`);
      console.log(`  Message: ${data.metrics.lastError.message}`);
      console.log(`  Time: ${new Date(data.metrics.lastError.timestamp).toLocaleString()}`);
      console.log(`  Correlation ID: ${data.metrics.lastError.correlationId}`);
    }
    
    console.log('\\n📈 Errors by Type:');
    Object.entries(data.metrics.errorsByType).forEach(([type, count]) => {
      console.log(`  ${type}: ${count}`);
    });
    
    console.log('\\n🌐 Errors by Endpoint:');
    Object.entries(data.metrics.errorsByEndpoint).forEach(([endpoint, count]) => {
      console.log(`  ${endpoint}: ${count}`);
    });
    
    if (data.circuitBreakers.length > 0) {
      console.log('\\n⚡ Circuit Breakers:');
      data.circuitBreakers.forEach(cb => {
        console.log(`  ${cb.name}: ${cb.state} (failures: ${cb.failureCount}/${cb.failureThreshold})`);
      });
    }
    
  } catch (error) {
    console.error('Failed to fetch error metrics:', error.message);
  }
}

async function showErrorAlerts() {
  console.log('🚨 Active Error Alerts:');
  console.log('=======================');
  
  try {
    const response = await fetch('http://localhost:5000/api/errors/alerts');
    const data = await response.json();
    
    if (data.alerts.length === 0) {
      console.log('No active alerts');
      return;
    }
    
    console.log(`Total Alerts: ${data.totalAlerts}`);
    console.log(`Critical: ${data.criticalAlerts}, Error: ${data.errorAlerts}, Warning: ${data.warningAlerts}`);
    
    console.log('\\n📋 Alert Details:');
    data.alerts.forEach((alert, index) => {
      console.log(`\\n${index + 1}. ${getLevelEmoji(alert.level)} ${alert.level.toUpperCase()}`);
      console.log(`   ID: ${alert.id}`);
      console.log(`   Type: ${alert.type}`);
      console.log(`   Message: ${alert.message}`);
      console.log(`   Time: ${new Date(alert.timestamp).toLocaleString()}`);
      console.log(`   Correlation ID: ${alert.correlationId}`);
      console.log(`   Acknowledged: ${alert.acknowledged ? '✅' : '❌'}`);
      console.log(`   Resolved: ${alert.resolvedAt ? '✅' : '❌'}`);
      
      if (alert.affectedEndpoints.length > 0) {
        console.log(`   Affected Endpoints: ${alert.affectedEndpoints.join(', ')}`);
      }
      
      if (alert.recoveryActions.length > 0) {
        console.log(`   Recovery Actions: ${alert.recoveryActions.join(', ')}`);
      }
    });
    
  } catch (error) {
    console.error('Failed to fetch error alerts:', error.message);
  }
}

async function testErrorHandling(errorType) {
  console.log(`🧪 Testing Error Handling: ${errorType}`);
  console.log('=====================================');
  
  const errorTypes = errorType === 'all' 
    ? ['database', 'memory', 'network', 'timeout', 'validation', 'generic']
    : [errorType];
  
  for (const type of errorTypes) {
    console.log(`\\n🔬 Testing ${type} error...`);
    
    try {
      const response = await fetch(`http://localhost:5000/api/test/error/${type}`, {
        method: 'GET',
        headers: {
          'X-Correlation-ID': `test-${type}-${Date.now()}`,
        },
      });
      
      const data = await response.json();
      
      if (response.ok) {
        console.log(`✅ ${type} error test completed without triggering error`);
      } else {
        console.log(`🔧 ${type} error handled gracefully:`);
        console.log(`   Status: ${response.status}`);
        console.log(`   Error Code: ${data.error?.code}`);
        console.log(`   Message: ${data.error?.message}`);
        console.log(`   Recoverable: ${data.error?.recoverable}`);
        console.log(`   Retryable: ${data.error?.retryable}`);
        
        if (data.recoveryActions && data.recoveryActions.length > 0) {
          console.log(`   Recovery Actions: ${data.recoveryActions.map(a => a.type).join(', ')}`);
        }
        
        if (data.error?.correlationId) {
          console.log(`   Correlation ID: ${data.error.correlationId}`);
        }
      }
      
    } catch (error) {
      console.error(`❌ ${type} error test failed:`, error.message);
    }
    
    // Wait between tests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}

async function testErrorRecovery() {
  console.log('🔄 Testing Error Recovery Mechanisms');
  console.log('====================================');
  
  // Test retry mechanism
  console.log('\\n🔁 Testing retry mechanism...');
  try {
    // This should trigger retries
    const response = await fetch('http://localhost:5000/api/test/error/network');
    console.log(`Retry test response: ${response.status}`);
  } catch (error) {
    console.log(`Retry test error: ${error.message}`);
  }
  
  // Test graceful degradation
  console.log('\\n📉 Testing graceful degradation...');
  try {
    const response = await fetch('http://localhost:5000/api/test/error/database');
    const data = await response.json();
    
    if (data.degraded) {
      console.log('✅ Graceful degradation activated');
      console.log(`   Message: ${data.message}`);
    } else {
      console.log('❌ Graceful degradation not activated');
    }
  } catch (error) {
    console.log(`Degradation test error: ${error.message}`);
  }
  
  // Check recovery metrics
  console.log('\\n📊 Recovery metrics after tests...');
  await showErrorMetrics();
}

async function testCircuitBreaker() {
  console.log('⚡ Testing Circuit Breaker');
  console.log('==========================');
  
  const endpoint = '/api/test/error/network';
  const testCount = 10;
  
  console.log(`Making ${testCount} requests to trigger circuit breaker...`);
  
  for (let i = 1; i <= testCount; i++) {
    try {
      const response = await fetch(`http://localhost:5000${endpoint}`, {
        headers: {
          'X-Correlation-ID': `circuit-test-${i}`,
        },
      });
      
      console.log(`Request ${i}: ${response.status} ${response.statusText}`);
      
      if (response.status === 503) {
        const data = await response.json();
        if (data.error?.code === 'CIRCUIT_BREAKER_OPEN') {
          console.log('🔴 Circuit breaker is now OPEN');
          console.log(`   Retry after: ${data.error.retryAfter} seconds`);
          break;
        }
      }
      
    } catch (error) {
      console.log(`Request ${i}: Error - ${error.message}`);
    }
    
    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  
  // Check circuit breaker status
  console.log('\\n📊 Circuit breaker status:');
  await showErrorMetrics();
}

async function testRequestTimeout() {
  console.log('⏰ Testing Request Timeout');
  console.log('==========================');
  
  console.log('Making request that should timeout...');
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 35000); // 35 seconds
    
    const response = await fetch('http://localhost:5000/api/test/error/timeout', {
      signal: controller.signal,
      headers: {
        'X-Correlation-ID': `timeout-test-${Date.now()}`,
      },
    });
    
    clearTimeout(timeoutId);
    
    if (response.status === 408) {
      console.log('✅ Request timeout handled correctly');
      const data = await response.json();
      console.log(`   Timeout: ${data.error?.timeout}ms`);
      console.log(`   Correlation ID: ${data.error?.correlationId}`);
    } else {
      console.log(`❌ Unexpected response: ${response.status}`);
    }
    
  } catch (error) {
    if (error.name === 'AbortError') {
      console.log('✅ Request was aborted (timeout simulation)');
    } else {
      console.log(`❌ Timeout test error: ${error.message}`);
    }
  }
}

function getLevelEmoji(level) {
  switch (level) {
    case 'critical': return '🔥';
    case 'error': return '❌';
    case 'warning': return '⚠️';
    default: return '📝';
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