module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: [
    '**/__tests__/**/*.ts',
    '**/?(*.)+(spec|test).ts',
    '**/tests/**/*.test.ts'
  ],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  setupFilesAfterEnv: ['<rootDir>/src/tests/setup.ts'],
  setupFiles: ['<rootDir>/src/tests/env.setup.ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/index.ts',
    '!src/tests/**/*.ts',
    '!src/**/*.test.ts',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html', 'json'],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
  testTimeout: 30000,
  maxWorkers: '50%',
  // Test categories
  projects: [
    {
      preset: 'ts-jest',
      testEnvironment: 'node',
      displayName: 'unit',
      testMatch: ['<rootDir>/src/tests/unit/**/*.test.ts'],
      setupFiles: ['<rootDir>/src/tests/env.setup.ts'],
      setupFilesAfterEnv: ['<rootDir>/src/tests/setup.ts'],
      transform: {
        '^.+\\.ts$': 'ts-jest',
      },
    },
    {
      preset: 'ts-jest',
      testEnvironment: 'node',
      displayName: 'integration',
      testMatch: ['<rootDir>/src/tests/integration/**/*.test.ts'],
      setupFiles: ['<rootDir>/src/tests/env.setup.ts'],
      setupFilesAfterEnv: ['<rootDir>/src/tests/setup.ts'],
      transform: {
        '^.+\\.ts$': 'ts-jest',
      },
    },
    {
      preset: 'ts-jest',
      testEnvironment: 'node',
      displayName: 'e2e',
      testMatch: ['<rootDir>/src/tests/e2e/**/*.test.ts'],
      setupFiles: ['<rootDir>/src/tests/env.setup.ts'],
      setupFilesAfterEnv: ['<rootDir>/src/tests/setup.ts'],
      transform: {
        '^.+\\.ts$': 'ts-jest',
      },
    },
    {
      preset: 'ts-jest',
      testEnvironment: 'node',
      displayName: 'performance',
      testMatch: ['<rootDir>/src/tests/performance/**/*.test.ts'],
      setupFiles: ['<rootDir>/src/tests/env.setup.ts'],
      setupFilesAfterEnv: ['<rootDir>/src/tests/setup.ts'],
      transform: {
        '^.+\\.ts$': 'ts-jest',
      },
    },
    {
      preset: 'ts-jest',
      testEnvironment: 'node',
      displayName: 'security',
      testMatch: ['<rootDir>/src/tests/security/**/*.test.ts'],
      setupFiles: ['<rootDir>/src/tests/env.setup.ts'],
      setupFilesAfterEnv: ['<rootDir>/src/tests/setup.ts'],
      transform: {
        '^.+\\.ts$': 'ts-jest',
      },
    },
  ],
};