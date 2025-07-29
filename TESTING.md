# Testing Guide for Worrybox

This document explains how to run tests for the Worrybox project both locally and in CI/CD.

## Quick Start

### Run All Tests Locally

**Windows:**
```bash
scripts\test-local.bat
```

**Linux/Mac:**
```bash
./scripts/test-local.sh
```

### Run Tests Individually

**Backend Tests:**
```bash
cd backend
npm run test:ci          # All tests with coverage
npm run test:unit        # Unit tests only
npm run test:integration # Integration tests only
npm run test:e2e         # End-to-end tests only
npm run test:security    # Security tests only
npm run test:performance # Performance tests only
```

**Frontend Tests:**
```bash
cd frontend
npm run test -- --run    # Run all tests once
npm run test             # Run tests in watch mode
npm run lint             # Run ESLint
```

## Test Configuration

### Backend Testing

The backend uses Jest with TypeScript and includes:

- **Unit Tests**: Test individual functions and components
- **Integration Tests**: Test API endpoints with mocked database
- **End-to-End Tests**: Test complete user workflows
- **Security Tests**: Test for vulnerabilities and security issues
- **Performance Tests**: Test response times and load handling

**Key Files:**
- `backend/jest.config.js` - Jest configuration
- `backend/src/tests/setup.ts` - Test setup and mocks
- `backend/src/tests/env.setup.ts` - Environment configuration for tests
- `backend/.env.test` - Test environment variables

### Frontend Testing

The frontend uses Vitest with React Testing Library:

- **Component Tests**: Test React components in isolation
- **Integration Tests**: Test component interactions
- **Accessibility Tests**: Ensure components are accessible

**Key Files:**
- `frontend/vite.config.ts` - Vite configuration (includes Vitest)
- `frontend/src/__tests__/` - Test files directory

## CI/CD Pipeline

The GitHub Actions workflow (`.github/workflows/ci-cd.yml`) runs:

1. **Backend Tests**: All test suites with PostgreSQL and Redis services
2. **Frontend Tests**: Component tests and linting
3. **Security Scanning**: Vulnerability scanning with Trivy
4. **Docker Build**: Build and push Docker images (on main branch)
5. **Deployment**: Deploy to production (on main branch)

### Environment Variables for CI

The CI pipeline uses these environment variables:

```yaml
NODE_ENV: test
DATABASE_URL: postgresql://postgres:postgres@localhost:5432/worrybox_test
JWT_SECRET: test-jwt-secret-key-for-testing-only
JWT_REFRESH_SECRET: test-refresh-secret-key-for-testing-only
OPENAI_API_KEY: test-openai-key
LEMONSQUEEZY_API_KEY: test-lemonsqueezy-key
# ... and more
```

## Mocking Strategy

### Backend Mocks

- **Database**: Prisma Client is mocked for all tests
- **External APIs**: OpenAI, LemonSqueezy, email services are mocked
- **Authentication**: JWT tokens are mocked
- **File System**: File operations are mocked

### Frontend Mocks

- **API Calls**: Axios requests are mocked
- **Router**: React Router is mocked for navigation tests
- **External Libraries**: Third-party components are mocked as needed

## Test Data

Test data is created using factory functions in `backend/src/tests/setup.ts`:

```typescript
const mockUser = createMockUser({ email: 'test@example.com' });
const mockPost = createMockPost({ userId: mockUser.id });
```

## Troubleshooting

### Common Issues

1. **Database Connection Errors**: Tests use mocked Prisma, so database connection issues usually indicate missing environment setup.

2. **Missing Environment Variables**: Ensure all required environment variables are set in `.env.test` or CI configuration.

3. **Port Conflicts**: Tests run on different ports than development servers.

4. **Timeout Issues**: Some tests have a 30-second timeout. Increase if needed for slower systems.

### Debug Commands

```bash
# Run tests with debug information
cd backend
npm run test:debug

# Run specific test file
npm test -- --testPathPattern=auth.test.ts

# Run tests with coverage report
npm run test:coverage
```

## Coverage Requirements

The project maintains these coverage thresholds:

- **Branches**: 70%
- **Functions**: 70%
- **Lines**: 70%
- **Statements**: 70%

Coverage reports are generated in `backend/coverage/` directory.

## Adding New Tests

### Backend Test Structure

```
backend/src/tests/
├── unit/           # Unit tests
├── integration/    # Integration tests
├── e2e/           # End-to-end tests
├── security/      # Security tests
├── performance/   # Performance tests
└── utils/         # Test utilities
```

### Frontend Test Structure

```
frontend/src/__tests__/
├── components/    # Component tests
├── pages/        # Page tests
├── services/     # Service tests
└── utils/        # Utility tests
```

### Test Naming Convention

- Unit tests: `*.test.ts`
- Integration tests: `*.integration.test.ts`
- End-to-end tests: `*.e2e.test.ts`
- Security tests: `*.security.test.ts`
- Performance tests: `*.performance.test.ts`

## Best Practices

1. **Isolation**: Each test should be independent and not rely on other tests
2. **Mocking**: Mock external dependencies to ensure tests are fast and reliable
3. **Descriptive Names**: Use clear, descriptive test names that explain what is being tested
4. **Setup/Teardown**: Use proper setup and teardown to ensure clean test state
5. **Coverage**: Aim for high test coverage but focus on testing critical paths
6. **Performance**: Keep tests fast by using mocks and avoiding real network calls

## Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Vitest Documentation](https://vitest.dev/guide/)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Prisma Testing Guide](https://www.prisma.io/docs/guides/testing)