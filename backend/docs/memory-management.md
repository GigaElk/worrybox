# Memory Management System

The memory management system provides comprehensive monitoring, leak detection, and proactive memory optimization for the Worrybox backend, with special optimizations for Render.com's 512MB memory constraints.

## Features

### 🔍 Memory Monitoring
- Real-time memory usage tracking
- Memory trend analysis and leak detection
- Platform-specific memory limits and thresholds
- Automatic memory pressure detection

### 🗑️ Garbage Collection Management
- Proactive garbage collection triggers
- Emergency cleanup procedures
- GC performance tracking and optimization
- Memory leak prevention strategies

### 📊 Memory Analytics
- Detailed memory usage metrics
- Memory growth rate analysis
- Memory leak confidence scoring
- Performance correlation analysis

### 🚨 Alert System
- Memory threshold alerts (warning, critical, emergency)
- Memory leak detection alerts
- Proactive memory management notifications
- Integration with health check system

## Architecture

### Core Components

1. **MemoryManagerService** - Main memory management orchestrator
2. **MemoryMonitoringMiddleware** - Express middleware for request-level monitoring
3. **MemoryMonitorUtil** - Development utilities and testing tools
4. **Memory Types** - TypeScript interfaces for memory metrics and configuration

### Memory Thresholds

#### Render.com (Production)
- Warning: 60% (307MB)
- Critical: 75% (384MB)
- Emergency: 90% (461MB)
- Monitoring Interval: 15 seconds

#### Local Development
- Warning: 80%
- Critical: 90%
- Emergency: 95%
- Monitoring Interval: 30 seconds

## Usage

### Basic Integration

The memory management system is automatically initialized when the server starts:

```typescript
import { MemoryManagerService } from './services/memoryManager';

const memoryManager = MemoryManagerService.getInstance();
await memoryManager.initialize();
```

### Middleware Integration

```typescript
import { memoryMonitoring } from './middleware/memoryMonitoring';

// Add memory monitoring middleware
app.use(memoryMonitoring.addMemoryHeaders());
app.use(memoryMonitoring.monitorRequestMemory());
app.use(memoryMonitoring.handleMemoryPressure());
```

### Manual Memory Management

```typescript
// Force garbage collection
const action = await memoryManager.forceGarbageCollection('manual_cleanup');

// Perform emergency cleanup
const actions = await memoryManager.performEmergencyCleanup();

// Get memory health metrics
const metrics = memoryManager.getHealthMetrics();

// Check memory pressure
await memoryManager.checkMemoryPressure();
```

## API Endpoints

### Memory Health
- `GET /api/memory/health` - Current memory status and health
- `GET /api/memory/metrics` - Detailed memory metrics
- `GET /api/memory/leak-detection` - Memory leak detection results

### Memory Management
- `POST /api/memory/gc` - Force garbage collection
- `POST /api/memory/emergency-cleanup` - Trigger emergency cleanup

### Example Response

```json
{
  "status": "healthy",
  "currentUsage": {
    "heapUsed": 45234567,
    "heapTotal": 67108864,
    "usagePercentage": 67.4,
    "platform": "render"
  },
  "trend": {
    "timeWindow": 30,
    "averageUsage": 65.2,
    "peakUsage": 72.1,
    "growthRate": 0.5,
    "isIncreasing": false,
    "leakSuspected": false
  },
  "gcStats": {
    "totalCollections": 15,
    "efficiency": 78.5,
    "averageDuration": 12.3
  },
  "recommendations": [
    "Memory usage is stable",
    "No immediate action required"
  ]
}
```

## Memory Leak Detection

### Detection Algorithm

The system uses multiple indicators to detect potential memory leaks:

1. **Growth Rate Analysis** - Monitors memory growth over time
2. **GC Efficiency** - Tracks garbage collection effectiveness
3. **Memory Pressure Patterns** - Identifies abnormal memory usage patterns
4. **Trend Analysis** - Analyzes memory usage trends over time windows

### Confidence Scoring

Memory leak confidence is calculated based on:
- Memory growth rate (40 points max)
- Consistent growth pattern (20 points)
- High peak usage (20 points)
- Low GC efficiency (15 points)
- Additional risk factors (5 points)

### Leak Response Actions

When a leak is detected:
1. **Log detailed leak information**
2. **Create memory alert**
3. **Trigger proactive garbage collection**
4. **Provide actionable recommendations**
5. **Monitor for resolution**

## Memory Optimization Strategies

### Cleanup Strategies (Priority Order)

1. **Force Garbage Collection** (Priority: 100)
   - Triggers when usage > 70%
   - Immediate memory reclamation

2. **Clear Performance Metrics** (Priority: 80)
   - Triggers when usage > 80%
   - Clears historical performance data

3. **Clear Memory Snapshots** (Priority: 60)
   - Triggers when usage > 85%
   - Reduces memory snapshot history

### Proactive Management

- **Request-based monitoring** - Tracks memory per request
- **Periodic pressure checks** - Regular memory pressure evaluation
- **Automatic GC triggers** - Smart garbage collection timing
- **Emergency mode** - Aggressive cleanup during critical situations

## Development Tools

### Memory Testing Scripts

```bash
# Check current memory status
npm run memory:status

# Force garbage collection
npm run memory:gc

# Simulate memory pressure (100MB)
npm run memory:simulate 100

# Start continuous monitoring
npm run memory:monitor

# Run full memory management test
npm run memory:test

# Generate memory report
npm run memory:report
```

### Development Monitoring

```typescript
import { memoryMonitorUtil } from './utils/memoryMonitor';

// Start development monitoring
memoryMonitorUtil.startDevelopmentMonitoring(5000); // 5 second intervals

// Simulate memory pressure for testing
await memoryMonitorUtil.simulateMemoryPressure(100); // 100MB

// Generate detailed memory report
const report = memoryMonitorUtil.generateMemoryReport();
```

## Configuration

### Environment Variables

```env
# Memory management configuration
MEMORY_WARNING_THRESHOLD=70
MEMORY_CRITICAL_THRESHOLD=85
MEMORY_EMERGENCY_THRESHOLD=95
MEMORY_MONITORING_INTERVAL=30000
MEMORY_LEAK_DETECTION=true
PROACTIVE_GC_ENABLED=true
```

### Platform-Specific Configuration

The system automatically adjusts configuration based on the detected platform:

- **Render.com**: More aggressive thresholds and frequent monitoring
- **Local Development**: Relaxed thresholds with debugging features
- **Other Platforms**: Balanced configuration

## Monitoring and Alerts

### Memory Status Levels

- **🟢 Healthy** - Normal memory usage, no action needed
- **🟡 Warning** - Elevated memory usage, monitoring increased
- **🔴 Critical** - High memory usage, proactive cleanup triggered
- **🔥 Emergency** - Critical memory usage, emergency cleanup activated

### Alert Types

- **High Usage** - Memory usage exceeds thresholds
- **Memory Leak** - Potential memory leak detected
- **GC Failure** - Garbage collection issues
- **Rapid Growth** - Abnormal memory growth patterns

### Integration with Health Checks

Memory metrics are integrated into the application health check system:

```typescript
// Health check includes memory status
const health = await healthCheckService.performEnhancedHealthCheck();
console.log(health.metrics.memoryUsage);
```

## Best Practices

### For Developers

1. **Monitor memory usage** during development
2. **Use memory profiling tools** to identify leaks
3. **Test memory-intensive operations** with the simulation tools
4. **Review memory recommendations** regularly
5. **Implement proper cleanup** in event listeners and timers

### For Production

1. **Enable proactive GC** for better performance
2. **Monitor memory alerts** and respond promptly
3. **Set up automated alerts** for critical memory situations
4. **Regular memory health checks** as part of monitoring
5. **Plan for memory constraints** on platforms like Render.com

### Memory-Efficient Coding

```typescript
// ✅ Good: Proper cleanup
const timer = setInterval(() => {
  // Do work
}, 1000);

// Clean up when done
clearInterval(timer);

// ✅ Good: Remove event listeners
const handler = (data) => { /* handle */ };
emitter.on('event', handler);
// Later...
emitter.off('event', handler);

// ❌ Bad: Memory leaks
setInterval(() => {
  // This will never be cleared
}, 1000);

// ❌ Bad: Circular references
const obj1 = { ref: null };
const obj2 = { ref: obj1 };
obj1.ref = obj2; // Circular reference
```

## Troubleshooting

### Common Issues

1. **High Memory Usage**
   - Check for memory leaks using leak detection
   - Review recent code changes
   - Monitor memory trends over time

2. **Memory Leaks**
   - Use memory profiling tools
   - Check for unclosed connections
   - Review event listener cleanup

3. **Frequent GC Triggers**
   - Analyze memory allocation patterns
   - Optimize memory-intensive operations
   - Consider increasing memory limits if possible

### Debug Commands

```bash
# Start with garbage collection exposed
node --expose-gc dist/index.js

# Enable memory debugging
NODE_ENV=development npm run memory:monitor

# Generate memory report for analysis
npm run memory:report
```

### Memory Profiling

For detailed memory analysis, use Node.js built-in profiling:

```bash
# Generate heap snapshot
node --inspect dist/index.js

# Use Chrome DevTools for memory analysis
# Navigate to chrome://inspect
```

## Performance Impact

The memory management system is designed to have minimal performance impact:

- **Monitoring overhead**: < 1ms per request
- **Memory usage**: < 5MB additional memory
- **GC impact**: Optimized timing to minimize disruption
- **CPU usage**: < 0.1% additional CPU usage

## Future Enhancements

- **Machine learning-based leak prediction**
- **Advanced memory optimization algorithms**
- **Integration with external monitoring services**
- **Automated memory scaling recommendations**
- **Enhanced memory profiling integration**