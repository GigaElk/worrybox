# Reliability Integration Tests

This directory contains comprehensive integration tests for the reliability and resilience features of the Worrybox application. These tests validate that the system can handle failures gracefully, recover from errors, and maintain stability under various stress conditions.

## 🎯 Test Coverage

### 1. Database Recovery Tests (`database-recovery.test.ts`)
Tests the database connection recovery system's ability to handle:
- Connection timeouts and network issues
- Connection pool exhaustion
- Exponential backoff retry logic
- Graceful degradation when database is unavailable
- Automatic reconnection after connection loss
- Health monitoring and metrics collection
- Concurrent recovery attempts
- Error logging with proper context

### 2. Memory Pressure Tests (`memory-pressure.test.ts`)
Validates the memory management system under various conditions:
- Memory usage monitoring and trend detection
- Memory leak detection algorithms
- Emergency cleanup procedures
- Platform-specific memory constraints (Render.com 512MB limit)
- Garbage collection triggering
- Memory pressure alerts and logging
- Stress testing with rapid allocation/deallocation
- Integration with logging and health systems

### 3. Scheduler Resilience Tests (`scheduler-resilience.test.ts`)
Tests the scheduler management system's resilience:
- Individual scheduler health monitoring
- Automatic restart of failed schedulers
- Staggered startup to prevent resource contention
- Graceful shutdown with proper cleanup
- Failure detection and recovery mechanisms
- Exponential backoff for restart attempts
- Resource usage monitoring
- Integration with memory management

### 4. Health Check Validation Tests (`health-check-validation.test.ts`)
Comprehensive end-to-end health check validation:
- Basic health check endpoints
- Component health validation (database, memory, schedulers)
- Enhanced health check with detailed metrics
- Startup health validation
- Performance under load
- Error handling and graceful degradation
- Correlation ID tracking
- Integration with monitoring systems

### 5. Comprehensive Reliability Suite (`reliability-test-suite.test.ts`)
Integrated scenarios testing multiple systems together:
- System stability under normal load
- Recovery from combined stress conditions
- Platform-specific behavior validation
- Error handling and recovery integration
- Performance under sustained load
- System monitoring and alerting
- End-to-end reliability validation

## 🚀 Running the Tests

### Run All Reliability Tests
```bash
npm run test:reliability
```

### Run Individual Test Suites
```bash
# Database recovery tests
npm run test:reliability:db

# Memory pressure tests
npm run test:reliability:memory

# Scheduler resilience tests
npm run test:reliability:scheduler

# Health check validation tests
npm run test:reliability:health

# Comprehensive reliability suite
npm run test:reliability:suite
```

### Run with Jest Directly
```bash
# All reliability tests
jest --testPathPattern=src/tests/integration/reliability

# Specific test file
jest src/tests/integration/reliability/database-recovery.test.ts

# With coverage
jest --testPathPattern=src/tests/integration/reliability --coverage

# Watch mode
jest --testPathPattern=src/tests/integration/reliability --watch
```

## 📊 Test Reports

The reliability test runner generates comprehensive reports including:

### Console Output
- Real-time test progress
- Success/failure rates per suite
- Performance metrics
- Detailed error information
- Actionable recommendations

### JSON Reports
Reports are saved to `test-reports/reliability-report-{timestamp}.json` with:
- Test execution details
- Performance metrics
- System health information
- Failure analysis
- Recommendations for improvements

### Example Report Structure
```json
{
  "timestamp": "2024-01-15T10:30:00.000Z",
  "environment": "test",
  "platform": "win32",
  "nodeVersion": "v18.17.0",
  "overallStatus": "passed",
  "summary": {
    "totalTests": 45,
    "passedTests": 43,
    "failedTests": 2,
    "successRate": 95.6
  },
  "recommendations": [
    "Review failed tests for specific error details",
    "Consider optimization for slow-running tests"
  ]
}
```

## 🔧 Test Configuration

### Environment Variables
```bash
# Test database (optional - uses main DB if not set)
TEST_DATABASE_URL=postgresql://user:pass@localhost:5432/test_db

# Test timeouts
TEST_TIMEOUT=30000

# Memory limits for testing
TEST_MEMORY_LIMIT_MB=512

# Enable garbage collection for memory tests
NODE_OPTIONS="--expose-gc"
```

### Jest Configuration
Tests use the main Jest configuration with specific settings for reliability tests:
- Timeout: 30 seconds (configurable)
- Environment: Node.js
- Setup files for service initialization
- Coverage collection for reliability modules

## 🎯 Success Criteria

### Reliability Requirements
- **Success Rate**: ≥95% of tests must pass
- **Database Recovery**: Must handle connection failures gracefully
- **Memory Management**: Must detect and handle memory pressure
- **Scheduler Resilience**: Must restart failed schedulers automatically
- **Health Monitoring**: Must provide accurate system health status
- **Performance**: Tests must complete within reasonable time limits

### Platform-Specific Requirements
- **Render.com**: Must respect 512MB memory limit
- **Local Development**: Must work with development database
- **Production**: Must handle production-like load patterns

## 🐛 Troubleshooting

### Common Issues

#### Database Connection Failures
```bash
# Check database is running
npm run db:studio

# Reset database connections
npm run db:push
```

#### Memory Test Failures
```bash
# Enable garbage collection
export NODE_OPTIONS="--expose-gc"

# Check available memory
node -e "console.log(process.memoryUsage())"
```

#### Timeout Issues
```bash
# Increase test timeout
export TEST_TIMEOUT=60000

# Run tests individually
npm run test:reliability:db
```

#### Platform Detection Issues
```bash
# Check platform detection
node -e "console.log(process.platform)"

# Verify environment variables
env | grep NODE_ENV
```

### Debug Mode
Run tests with debug output:
```bash
DEBUG=* npm run test:reliability
```

## 📈 Performance Benchmarks

### Expected Performance
- **Database Recovery Tests**: ~15-30 seconds
- **Memory Pressure Tests**: ~20-45 seconds  
- **Scheduler Resilience Tests**: ~25-40 seconds
- **Health Check Tests**: ~15-25 seconds
- **Comprehensive Suite**: ~30-60 seconds

### Performance Optimization
- Tests run in parallel where possible
- Memory cleanup between test suites
- Connection pooling for database tests
- Efficient resource allocation

## 🔒 Security Considerations

### Test Data
- No real user data in tests
- Mock credentials and API keys
- Isolated test environment
- Automatic cleanup of test artifacts

### Resource Limits
- Memory usage monitoring
- Connection limit enforcement
- Timeout protection
- Resource cleanup on failure

## 🚀 Continuous Integration

### CI/CD Integration
```yaml
# Example GitHub Actions workflow
- name: Run Reliability Tests
  run: |
    npm install
    npm run test:reliability
  env:
    NODE_ENV: test
    NODE_OPTIONS: "--expose-gc"
```

### Pre-deployment Validation
Reliability tests should be run before any production deployment to ensure:
- System stability under load
- Proper error handling and recovery
- Memory management effectiveness
- Database resilience
- Health monitoring accuracy

## 📚 Additional Resources

- [Database Recovery Documentation](../../../docs/database-recovery.md)
- [Memory Management Guide](../../../docs/memory-management.md)
- [Scheduler Resilience Guide](../../../docs/scheduler-resilience.md)
- [Health Check Documentation](../../../docs/health-monitoring.md)
- [Platform Optimization Guide](../../../docs/platform-optimization.md)

## 🤝 Contributing

When adding new reliability tests:

1. Follow the existing test structure and naming conventions
2. Include comprehensive error scenarios
3. Add performance benchmarks
4. Update this README with new test descriptions
5. Ensure tests are deterministic and repeatable
6. Add appropriate cleanup procedures
7. Include platform-specific considerations

### Test Template
```typescript
describe('New Reliability Feature Tests', () => {
  beforeAll(async () => {
    // Setup test environment
  });

  afterAll(async () => {
    // Cleanup test environment
  });

  describe('Normal Operation', () => {
    test('should handle normal conditions', async () => {
      // Test implementation
    });
  });

  describe('Error Conditions', () => {
    test('should recover from failures', async () => {
      // Test implementation
    });
  });

  describe('Performance', () => {
    test('should meet performance requirements', async () => {
      // Test implementation
    });
  });
});
```