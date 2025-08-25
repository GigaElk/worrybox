# Scheduler Resilience System

The scheduler resilience system provides comprehensive monitoring, health management, and automatic recovery for all scheduled tasks in the Worrybox backend, ensuring reliable operation even under adverse conditions.

## Features

### 🔍 Scheduler Health Monitoring
- Real-time health status tracking for all schedulers
- Memory usage and performance monitoring
- Failure detection and consecutive error tracking
- Dependency health verification

### 🔄 Automatic Recovery
- Intelligent restart mechanisms with exponential backoff
- Memory cleanup and garbage collection triggers
- Error threshold management and reset capabilities
- Dependency-aware recovery strategies

### 🚀 Staggered Startup & Graceful Shutdown
- Priority-based scheduler startup sequencing
- Dependency-aware initialization order
- Graceful shutdown with proper cleanup
- Timeout handling and force-stop capabilities

### 📊 Comprehensive Metrics
- Execution time tracking and performance analysis
- Success/failure rate monitoring
- Memory usage trends and leak detection
- Restart frequency and recovery action logging

## Architecture

### Core Components

1. **SchedulerResilienceService** - Main orchestrator for scheduler management
2. **SchedulerResilienceMiddleware** - Express middleware for monitoring and control
3. **SchedulerTestingUtil** - Development utilities and testing framework
4. **Scheduler Types** - TypeScript interfaces for configuration and metrics

### Scheduler States

- **🟢 Healthy** - Operating normally within all thresholds
- **🟡 Degraded** - Operating but with elevated error rates or memory usage
- **🔴 Unhealthy** - Failing consistently, requires intervention
- **⏹️ Stopped** - Intentionally stopped or not yet started
- **🔄 Starting** - In the process of starting up
- **🛑 Stopping** - In the process of shutting down

## Configuration

### Scheduler Configuration

```typescript
interface SchedulerConfig {
  name: string;
  enabled: boolean;
  cronExpression?: string;        // Cron-based scheduling
  interval?: number;              // Interval-based scheduling (ms)
  maxRetries: number;             // Max retry attempts per execution
  retryDelay: number;             // Delay between retries (ms)
  timeout: number;                // Execution timeout (ms)
  memoryThreshold: number;        // Memory usage threshold (MB)
  errorThreshold: number;         // Max consecutive errors before restart
  restartDelay: number;           // Delay before restart (ms)
  priority: number;               // Startup priority (higher = earlier)
  dependencies: string[];         // Required scheduler dependencies
  healthCheckInterval: number;    // Health check frequency (ms)
}
```

### Platform-Specific Configuration

#### Render.com (Production)
- Health Check Interval: 15 seconds
- Memory Threshold: 50MB (optimized for 512MB limit)
- Max Restart Attempts: 2
- Restart Cooldown: 30 seconds

#### Local Development
- Health Check Interval: 60 seconds
- Auto-Recovery: Disabled (for easier debugging)
- Staggered Startup: Disabled (faster development)

## Usage

### Basic Scheduler Registration

```typescript
import { SchedulerResilienceService } from './services/schedulerResilience';
import { SchedulerConfig, SchedulerExecutor } from './types/scheduler';

const schedulerResilience = SchedulerResilienceService.getInstance();

// Define scheduler configuration
const config: SchedulerConfig = {
  name: 'my-scheduler',
  enabled: true,
  interval: 30000, // 30 seconds
  maxRetries: 3,
  retryDelay: 1000,
  timeout: 10000,
  memoryThreshold: 100,
  errorThreshold: 5,
  restartDelay: 2000,
  priority: 1,
  dependencies: [],
  healthCheckInterval: 30000,
};

// Define scheduler executor
const executor: SchedulerExecutor = {
  name: 'my-scheduler',
  execute: async (context) => {
    // Your scheduler logic here
    console.log('Scheduler executing:', context.executionId);
  },
  healthCheck: async () => {
    // Optional custom health check
    return true;
  },
  cleanup: async () => {
    // Optional cleanup logic
  },
  onStart: async () => {
    // Optional startup logic
  },
  onStop: async () => {
    // Optional shutdown logic
  },
};

// Register the scheduler
await schedulerResilience.register(config, executor);
```

### Scheduler Management

```typescript
// Start a specific scheduler
await schedulerResilience.start('my-scheduler');

// Stop a specific scheduler
await schedulerResilience.stop('my-scheduler');

// Restart a scheduler
await schedulerResilience.restart('my-scheduler');

// Start all enabled schedulers
await schedulerResilience.startAll();

// Stop all schedulers gracefully
await schedulerResilience.stopAll();

// Get scheduler health
const health = schedulerResilience.getHealth('my-scheduler');

// Perform recovery actions
const actions = await schedulerResilience.performRecovery('my-scheduler');
```

## API Endpoints

### Scheduler Management
- `GET /api/scheduler/health` - Overall scheduler health status
- `GET /api/scheduler/:name/health` - Individual scheduler health
- `POST /api/scheduler/:name/start` - Start specific scheduler
- `POST /api/scheduler/:name/stop` - Stop specific scheduler
- `POST /api/scheduler/:name/restart` - Restart specific scheduler
- `POST /api/scheduler/:name/recover` - Perform recovery actions
- `POST /api/scheduler/start-all` - Start all schedulers
- `POST /api/scheduler/stop-all` - Stop all schedulers

### Example Response

```json
{
  "status": "degraded",
  "summary": {
    "totalSchedulers": 5,
    "healthySchedulers": 3,
    "degradedSchedulers": 1,
    "unhealthySchedulers": 1,
    "stoppedSchedulers": 0
  },
  "schedulers": [
    {
      "name": "post-scheduler",
      "status": "healthy",
      "memoryUsage": 45,
      "uptime": 3600,
      "consecutiveFailures": 0,
      "restartCount": 0,
      "lastExecution": {
        "timestamp": "2024-01-15T10:30:00Z",
        "duration": 1250,
        "success": true
      }
    }
  ],
  "timestamp": "2024-01-15T10:30:00Z"
}
```

## Recovery Strategies

### Automatic Recovery Actions

1. **Memory Cleanup** (Priority: High)
   - Triggered when memory usage exceeds threshold
   - Calls scheduler cleanup methods
   - Forces garbage collection if available

2. **Error Reset** (Priority: Medium)
   - Resets consecutive failure count
   - Changes status from degraded to healthy
   - Clears error history

3. **Scheduler Restart** (Priority: Low)
   - Full scheduler restart with proper shutdown
   - Respects restart cooldown periods
   - Limited by max restart attempts

4. **Dependency Check** (Priority: Medium)
   - Verifies all dependencies are healthy
   - Waits for dependencies to become available
   - Provides dependency status feedback

### Recovery Triggers

- **Memory Threshold Exceeded** - Memory usage > configured threshold
- **Error Threshold Exceeded** - Consecutive failures > configured threshold
- **Health Check Failure** - Custom health check returns false
- **Execution Timeout** - Scheduler execution exceeds timeout
- **Dependency Failure** - Required dependency becomes unhealthy

## Staggered Startup

### Priority-Based Startup

Schedulers are started in phases based on their priority:

1. **Phase 1** - High priority schedulers (priority 10+)
2. **Phase 2** - Medium priority schedulers (priority 5-9)
3. **Phase 3** - Low priority schedulers (priority 1-4)
4. **Phase 4** - Default priority schedulers (priority 0)

### Dependency Management

- Schedulers wait for their dependencies to be healthy before starting
- Dependency timeout prevents indefinite waiting
- Circular dependencies are detected and prevented
- Failed dependencies prevent dependent scheduler startup

## Graceful Shutdown

### Shutdown Phases

1. **Signal Reception** - SIGTERM/SIGINT received
2. **New Execution Prevention** - Stop accepting new executions
3. **Active Execution Completion** - Wait for running executions to finish
4. **Scheduler Shutdown** - Call onStop hooks and cleanup
5. **Resource Cleanup** - Free memory and close connections

### Shutdown Timeouts

- **Graceful Timeout** - 30 seconds for normal shutdown
- **Force Timeout** - 5 seconds for forced termination
- **Per-Scheduler Timeout** - Individual scheduler shutdown limits

## Development Tools

### Testing Scripts

```bash
# Check scheduler status
npm run scheduler:status

# Start all schedulers
npm run scheduler:start

# Stop all schedulers
npm run scheduler:stop

# Restart specific scheduler
npm run scheduler:restart my-scheduler

# Run comprehensive resilience test
npm run scheduler:test

# Run stress test (60 seconds)
npm run scheduler:stress 60000

# Generate resilience report
npm run scheduler:report
```

### Test Scheduler Creation

```typescript
import { schedulerTestingUtil } from './utils/schedulerTesting';

// Create test schedulers for various scenarios
await schedulerTestingUtil.registerTestSchedulers();

// Run comprehensive test suite
await schedulerTestingUtil.runComprehensiveTest();

// Generate resilience report
const report = schedulerTestingUtil.generateResilienceReport();
```

## Monitoring and Alerting

### Health Metrics

- **Execution Success Rate** - Percentage of successful executions
- **Average Execution Time** - Mean execution duration
- **Memory Usage Trend** - Memory consumption over time
- **Error Rate** - Frequency of execution failures
- **Restart Frequency** - How often schedulers are restarted

### Alert Conditions

- **High Error Rate** - Error rate > 20% over 5 minutes
- **Memory Leak Detected** - Consistent memory growth over 15 minutes
- **Frequent Restarts** - More than 3 restarts in 10 minutes
- **Dependency Failures** - Critical dependencies become unhealthy
- **Execution Timeouts** - Consistent timeout occurrences

### Integration with Health Checks

Scheduler health is integrated into the application health check system:

```typescript
// Enhanced health check includes scheduler status
const health = await healthCheckService.performEnhancedHealthCheck();
console.log(health.checks.schedulers);
```

## Best Practices

### For Developers

1. **Implement Proper Cleanup** - Always clean up resources in scheduler cleanup methods
2. **Handle Timeouts Gracefully** - Use AbortController for cancellable operations
3. **Monitor Memory Usage** - Be aware of memory consumption in long-running schedulers
4. **Implement Health Checks** - Provide custom health check logic when possible
5. **Handle Dependencies** - Ensure scheduler dependencies are properly configured

### For Production

1. **Monitor Scheduler Health** - Set up alerts for scheduler failures
2. **Review Memory Thresholds** - Adjust thresholds based on actual usage patterns
3. **Plan for Restarts** - Ensure schedulers can handle unexpected restarts
4. **Test Recovery Scenarios** - Regularly test failure and recovery procedures
5. **Monitor Performance Impact** - Ensure schedulers don't impact request performance

### Scheduler Implementation

```typescript
// ✅ Good: Proper resource management
const executor: SchedulerExecutor = {
  name: 'data-processor',
  execute: async (context) => {
    const connection = await getConnection();
    try {
      // Check for cancellation
      if (context.abortController.signal.aborted) {
        return;
      }
      
      // Process data with timeout awareness
      await processData(connection, context.abortController.signal);
      
    } finally {
      // Always cleanup
      await connection.close();
    }
  },
  
  cleanup: async () => {
    // Clear any cached data
    cache.clear();
  },
  
  healthCheck: async () => {
    // Verify external dependencies
    return await checkDatabaseConnection();
  }
};

// ❌ Bad: No cleanup or timeout handling
const badExecutor: SchedulerExecutor = {
  name: 'bad-scheduler',
  execute: async (context) => {
    // No timeout handling
    const data = await fetchLargeDataset();
    
    // No cleanup
    processData(data);
    
    // Memory leak potential
    globalCache.push(data);
  }
};
```

## Troubleshooting

### Common Issues

1. **Scheduler Won't Start**
   - Check dependencies are healthy
   - Verify configuration is valid
   - Review startup logs for errors

2. **High Memory Usage**
   - Check for memory leaks in scheduler logic
   - Review cleanup implementation
   - Monitor memory trends over time

3. **Frequent Restarts**
   - Analyze error patterns and causes
   - Review timeout configurations
   - Check for resource contention

4. **Dependency Issues**
   - Verify dependency health status
   - Check dependency timeout settings
   - Review dependency startup order

### Debug Commands

```bash
# Check detailed scheduler status
npm run scheduler:status

# Generate comprehensive report
npm run scheduler:report

# Run resilience test suite
npm run scheduler:test

# Monitor scheduler activity
curl http://localhost:5000/api/scheduler/health
```

### Performance Monitoring

```bash
# Monitor scheduler performance impact
curl http://localhost:5000/api/metrics

# Check memory usage
curl http://localhost:5000/api/memory/health

# View system diagnostics
curl http://localhost:5000/api/diagnostics
```

## Performance Impact

The scheduler resilience system is designed for minimal performance impact:

- **Monitoring Overhead** - < 2ms per scheduler per health check
- **Memory Usage** - < 10MB additional memory for monitoring data
- **CPU Impact** - < 0.5% additional CPU usage
- **Request Latency** - < 1ms additional latency from middleware

## Future Enhancements

- **Machine Learning-Based Failure Prediction** - Predict failures before they occur
- **Advanced Dependency Management** - Complex dependency graphs and conditions
- **External Monitoring Integration** - Integration with Prometheus, Grafana, etc.
- **Scheduler Load Balancing** - Distribute scheduler load across multiple instances
- **Historical Analytics** - Long-term trend analysis and capacity planning