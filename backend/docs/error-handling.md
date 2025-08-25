# Enhanced Error Handling and Recovery System

The enhanced error handling system provides comprehensive error management, automatic recovery mechanisms, and graceful degradation capabilities for the Worrybox backend, replacing traditional process.exit calls with intelligent recovery strategies.

## Features

### 🔍 Comprehensive Error Context Capture
- Detailed error context with correlation ID tracking
- Request metadata and system state capture
- Memory usage and system load at error time
- Sanitized headers and body data for security

### 🔄 Automatic Error Recovery
- Intelligent retry mechanisms with exponential backoff
- Circuit breaker pattern for failing services
- Graceful degradation strategies
- Memory cleanup and garbage collection triggers

### ⏰ Request Timeout Management
- Configurable request timeouts per route/method
- Proper cleanup and resource management
- Abort controller integration for cancellation
- Timeout-specific error handling

### 🛡️ Graceful Shutdown System
- Replaces process.exit calls with graceful recovery
- Phased shutdown with proper cleanup
- Active request completion waiting
- Service-specific cleanup procedures

## Architecture

### Core Components

1. **ErrorHandlingService** - Main error management orchestrator
2. **ErrorHandlingMiddleware** - Express middleware for error capture and recovery
3. **GracefulShutdownService** - Replaces process.exit with graceful shutdown
4. **Error Types** - Comprehensive TypeScript interfaces for error management

### Error Categories

- **🔍 Validation** - Input validation and data format errors
- **🔐 Authentication** - Authentication and token-related errors
- **🚫 Authorization** - Permission and access control errors
- **🗄️ Database** - Database connection and query errors
- **🌐 External API** - Third-party service integration errors
- **⏰ Timeout** - Request and operation timeout errors
- **🌍 Network** - Network connectivity and communication errors
- **⚙️ System** - General system and runtime errors

## Configuration

### Error Recovery Configuration

```typescript
interface ErrorRecoveryConfig {
  enabled: boolean;
  maxRetryAttempts: number;
  retryDelay: number; // milliseconds
  exponentialBackoff: boolean;
  circuitBreakerEnabled: boolean;
  circuitBreakerThreshold: number;
  circuitBreakerTimeout: number; // milliseconds
  gracefulDegradationEnabled: boolean;
  requestTimeoutEnabled: boolean;
  defaultRequestTimeout: number; // milliseconds
  errorContextCapture: boolean;
  errorMetricsEnabled: boolean;
  correlationIdTracking: boolean;
}
```

### Platform-Specific Configuration

#### Render.com (Production)
- Max Retry Attempts: 2 (fewer retries for faster response)
- Retry Delay: 500ms (faster retries)
- Default Request Timeout: 25 seconds
- Circuit Breaker Threshold: 3 (more aggressive)

#### Local Development
- Error Context Capture: Enhanced (more detailed for debugging)
- Error Metrics: Disabled (reduce overhead)
- Circuit Breaker: Disabled (easier debugging)

## Usage

### Basic Error Handling

The system automatically captures and handles errors through middleware:

```typescript
// Errors are automatically captured and processed
app.get('/api/example', async (req, res) => {
  // Any error thrown here will be handled by the system
  throw new Error('Something went wrong');
});

// Use async error wrapper for explicit handling
app.get('/api/safe', errorHandlingMiddleware.asyncErrorHandler(async (req, res) => {
  const data = await riskyOperation();
  res.json(data);
}));
```

### Enhanced Error Creation

```typescript
import { EnhancedError } from './types/errorHandling';

// Create enhanced error with additional context
const error = new Error('Database connection failed') as EnhancedError;
error.code = 'DB_CONNECTION_ERROR';
error.statusCode = 503;
error.category = 'database';
error.severity = 'high';
error.recoverable = true;
error.retryable = true;

throw error;
```

### Manual Error Recovery

```typescript
import { ErrorHandlingService } from './services/errorHandling';

const errorHandling = ErrorHandlingService.getInstance();

try {
  // Risky operation
  await performDatabaseOperation();
} catch (error) {
  // Create error context
  const context = errorHandling.createErrorContext(req);
  
  // Attempt recovery
  const recoveryActions = await errorHandling.handleError(error, context);
  
  // Check if recovery was successful
  const recovered = recoveryActions.some(action => action.success);
  
  if (recovered) {
    // Continue with degraded functionality
    const fallbackData = await errorHandling.attemptGracefulDegradation(error, context);
    return res.json(fallbackData);
  }
  
  // Recovery failed, return error
  throw error;
}
```

### Retry Operations

```typescript
import { ErrorHandlingService } from './services/errorHandling';

const errorHandling = ErrorHandlingService.getInstance();
const context = errorHandling.createErrorContext(req);

// Retry with default configuration
const result = await errorHandling.retryOperation(async () => {
  return await unreliableApiCall();
}, context);

// Retry with custom configuration
const customResult = await errorHandling.retryOperation(async () => {
  return await anotherApiCall();
}, context, {
  maxAttempts: 5,
  baseDelay: 2000,
  exponentialBackoff: true,
  jitter: true,
});
```

## API Endpoints

### Error Management
- `GET /api/errors/metrics` - Error metrics and statistics
- `GET /api/errors/alerts` - Active error alerts
- `POST /api/errors/alerts/:id/acknowledge` - Acknowledge error alert
- `POST /api/errors/alerts/:id/resolve` - Resolve error alert

### Development Testing
- `GET /api/test/error/:type` - Trigger test errors (development only)

### Example Response

```json
{
  "metrics": {
    "totalErrors": 45,
    "errorsByType": {
      "database": 12,
      "network": 8,
      "timeout": 5
    },
    "errorsByEndpoint": {
      "/api/posts": 15,
      "/api/users": 8
    },
    "errorRate": 2.3,
    "averageRecoveryTime": 1250,
    "successfulRecoveries": 38,
    "failedRecoveries": 7,
    "lastError": {
      "timestamp": "2024-01-15T10:30:00Z",
      "type": "database",
      "message": "Connection timeout",
      "correlationId": "req-123-456"
    }
  },
  "circuitBreakers": [
    {
      "name": "/api/external-service",
      "state": "half_open",
      "failureCount": 3,
      "failureThreshold": 5,
      "timeout": 60000
    }
  ],
  "timestamp": "2024-01-15T10:30:00Z"
}
```

## Error Recovery Strategies

### Automatic Recovery Handlers

1. **Database Error Handler** (Priority: 100)
   - Attempts database reconnection
   - Waits before retry
   - Falls back to cached data if available

2. **Memory Error Handler** (Priority: 90)
   - Triggers garbage collection
   - Performs memory cleanup
   - Activates memory pressure management

3. **Network Error Handler** (Priority: 80)
   - Implements retry with delay
   - Activates circuit breaker on repeated failures
   - Provides network-specific error context

### Graceful Degradation Strategies

1. **Cache Fallback** (Priority: 100)
   - Returns cached data when database is unavailable
   - Applies to read operations on API endpoints
   - Excludes authentication endpoints

2. **Read-Only Mode** (Priority: 90)
   - Blocks write operations during database issues
   - Allows read operations to continue
   - Provides clear user messaging

3. **Simplified Response** (Priority: 70)
   - Returns basic response structure on timeout
   - Reduces response complexity
   - Maintains API compatibility

## Circuit Breaker Pattern

### Circuit Breaker States

- **🟢 Closed** - Normal operation, requests pass through
- **🔴 Open** - Failures exceeded threshold, requests blocked
- **🟡 Half-Open** - Testing if service has recovered

### Configuration

```typescript
interface CircuitBreakerState {
  name: string; // Endpoint or service name
  state: 'closed' | 'open' | 'half_open';
  failureCount: number;
  failureThreshold: number; // Max failures before opening
  timeout: number; // Time to wait before half-open
  successCount: number;
  totalRequests: number;
}
```

### Behavior

- **Failure Threshold**: 5 failures (3 on Render.com)
- **Timeout**: 60 seconds before attempting half-open
- **Recovery**: Single success in half-open closes circuit
- **Scope**: Per-endpoint circuit breakers

## Request Timeout Management

### Timeout Configuration

```typescript
interface TimeoutConfig {
  default: number; // 30 seconds (25 on Render.com)
  routes: {
    '/api/health': 5000,
    '/api/metrics': 10000,
    '/api/diagnostics': 15000,
  };
  methods: {
    'GET': 15000,
    'POST': 30000,
    'PUT': 30000,
    'DELETE': 10000,
  };
  enabled: boolean;
  gracePeriod: number; // 5 seconds
  cleanupDelay: number; // 1 second
}
```

### Timeout Handling

- **Automatic Cleanup** - Resources cleaned up on timeout
- **Abort Controller** - Proper request cancellation
- **Grace Period** - Additional time for cleanup
- **Custom Timeouts** - Route and method-specific timeouts

## Graceful Shutdown System

### Shutdown Phases (Priority Order)

1. **Stop New Requests** (Priority: 100) - Stop accepting new connections
2. **Wait for Active Requests** (Priority: 90) - Complete ongoing requests
3. **Stop Schedulers** (Priority: 80) - Gracefully stop all schedulers
4. **Cleanup Error Handling** (Priority: 70) - Clean up error handling system
5. **Cleanup Memory Management** (Priority: 60) - Clean up memory monitoring
6. **Close Database Connections** (Priority: 50) - Disconnect from database
7. **Platform Cleanup** (Priority: 40) - Platform-specific cleanup
8. **Final Cleanup** (Priority: 10) - Final resource cleanup

### Shutdown Configuration

```typescript
interface ShutdownConfig {
  gracefulTimeout: number; // 30 seconds (25 on Render.com)
  forceTimeout: number; // 5 seconds
  enableGracefulShutdown: boolean;
  cleanupServices: boolean;
  waitForActiveRequests: boolean;
  maxActiveRequestWait: number; // 10 seconds (5 on Render.com)
}
```

### Signal Handling

- **SIGTERM** - Graceful shutdown request
- **SIGINT** - Interrupt signal (Ctrl+C)
- **SIGUSR2** - Restart signal (nodemon)
- **Uncaught Exception** - Attempt recovery before shutdown
- **Unhandled Rejection** - Attempt recovery before shutdown

## Development Tools

### Testing Scripts

```bash
# Check error metrics
npm run error:metrics

# View active alerts
npm run error:alerts

# Test error handling
npm run error:test [error-type]

# Test error recovery
npm run error:recovery

# Test circuit breaker
npm run error:circuit

# Test request timeout
npm run error:timeout
```

### Error Types for Testing

- **database** - Database connection errors
- **memory** - Memory allocation errors
- **network** - Network connectivity errors
- **timeout** - Request timeout errors
- **validation** - Input validation errors
- **generic** - General system errors

### Example Test Usage

```bash
# Test all error types
npm run error:test all

# Test specific error type
npm run error:test database

# Test circuit breaker functionality
npm run error:circuit

# View current error metrics
npm run error:metrics
```

## Monitoring and Alerting

### Error Metrics

- **Total Errors** - Count of all errors
- **Error Rate** - Percentage of requests resulting in errors
- **Recovery Success Rate** - Percentage of successful recoveries
- **Average Recovery Time** - Mean time to recover from errors
- **Errors by Type** - Breakdown by error category
- **Errors by Endpoint** - Breakdown by API endpoint

### Alert Levels

- **🔥 Critical** - System-threatening errors requiring immediate attention
- **❌ Error** - Significant errors affecting functionality
- **⚠️ Warning** - Minor errors or degraded performance

### Alert Conditions

- **High Error Rate** - Error rate > 10% over 5 minutes
- **Recovery Failures** - Multiple recovery attempts failed
- **Circuit Breaker Open** - Service circuit breaker activated
- **Memory Errors** - Memory-related errors detected
- **Database Errors** - Database connectivity issues

## Best Practices

### For Developers

1. **Use Correlation IDs** - Always include correlation IDs for request tracking
2. **Implement Custom Health Checks** - Provide service-specific health checks
3. **Handle Timeouts Gracefully** - Use AbortController for cancellable operations
4. **Categorize Errors Properly** - Set appropriate error categories and severity
5. **Test Error Scenarios** - Regularly test error handling and recovery

### For Production

1. **Monitor Error Metrics** - Set up alerts for error rate thresholds
2. **Review Recovery Actions** - Regularly review recovery action effectiveness
3. **Tune Circuit Breakers** - Adjust thresholds based on service characteristics
4. **Plan for Degradation** - Design fallback strategies for critical paths
5. **Test Graceful Shutdown** - Ensure proper shutdown behavior under load

### Error Handling Implementation

```typescript
// ✅ Good: Proper error handling with context
app.get('/api/data', async (req, res) => {
  try {
    const data = await fetchData();
    res.json(data);
  } catch (error) {
    // Error will be handled by global error handler
    // with automatic recovery attempts
    throw error;
  }
});

// ✅ Good: Enhanced error with context
const createEnhancedError = (message: string, category: string) => {
  const error = new Error(message) as EnhancedError;
  error.category = category;
  error.severity = 'medium';
  error.recoverable = true;
  return error;
};

// ❌ Bad: Using process.exit
app.get('/api/bad', async (req, res) => {
  try {
    const data = await riskyOperation();
    res.json(data);
  } catch (error) {
    console.error('Fatal error');
    process.exit(1); // Don't do this!
  }
});

// ❌ Bad: No error context
throw new Error('Something failed'); // Minimal context
```

## Troubleshooting

### Common Issues

1. **High Error Rate**
   - Check error metrics for patterns
   - Review recent deployments
   - Verify external service health

2. **Recovery Failures**
   - Check recovery action logs
   - Verify service dependencies
   - Review timeout configurations

3. **Circuit Breaker Issues**
   - Check failure thresholds
   - Verify service health
   - Review timeout settings

4. **Timeout Problems**
   - Check request timeout configuration
   - Monitor request duration
   - Verify resource cleanup

### Debug Commands

```bash
# Check current error status
curl http://localhost:5000/api/errors/metrics

# View active alerts
curl http://localhost:5000/api/errors/alerts

# Test specific error type
curl http://localhost:5000/api/test/error/database

# Check system health
curl http://localhost:5000/api/health
```

### Log Analysis

Error logs include comprehensive context:

```json
{
  "level": "error",
  "message": "Database connection failed",
  "correlationId": "req-123-456",
  "errorCode": "DB_CONNECTION_ERROR",
  "errorCategory": "database",
  "errorSeverity": "high",
  "path": "/api/posts",
  "method": "GET",
  "userId": "user-789",
  "ip": "192.168.1.100",
  "memoryUsage": {
    "heapUsed": 45234567,
    "heapTotal": 67108864
  },
  "systemLoad": {
    "cpuUsage": 15.5,
    "memoryUsage": 67.4,
    "activeConnections": 12
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

## Performance Impact

The error handling system is designed for minimal performance impact:

- **Middleware Overhead** - < 2ms per request
- **Memory Usage** - < 15MB additional memory
- **Error Processing** - < 5ms average processing time
- **Recovery Time** - < 2 seconds average recovery time

## Future Enhancements

- **Machine Learning Error Prediction** - Predict errors before they occur
- **Advanced Recovery Strategies** - More sophisticated recovery mechanisms
- **External Monitoring Integration** - Integration with monitoring services
- **Distributed Error Tracking** - Cross-service error correlation
- **Automated Recovery Tuning** - Self-adjusting recovery parameters