import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    // Test environment configuration
    environment: 'jsdom',
    
    // Global setup and teardown
    globalSetup: ['./test-setup/global-setup.ts'],
    setupFiles: ['./test-setup/test-setup.ts'],
    
    // Test file patterns for comprehensive tests
    include: [
      'src/__tests__/**/*.comprehensive.test.{ts,tsx}',
      'src/__tests__/security/**/*.test.{ts,tsx}',
      'src/__tests__/performance/**/*.test.{ts,tsx}',
      'src/__tests__/integration/**/*.test.{ts,tsx}'
    ],
    
    // Exclude patterns
    exclude: [
      'node_modules/**',
      'dist/**',
      'build/**',
      '**/*.d.ts'
    ],
    
    // Test timeout configuration
    testTimeout: 30000, // 30 seconds for comprehensive tests
    hookTimeout: 10000, // 10 seconds for setup/teardown
    
    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      reportsDirectory: './coverage/comprehensive',
      include: [
        'src/components/**/*.{ts,tsx}',
        'src/services/**/*.{ts,tsx}',
        'src/pages/**/*.{ts,tsx}',
        'src/hooks/**/*.{ts,tsx}',
        'src/utils/**/*.{ts,tsx}'
      ],
      exclude: [
        'src/**/*.test.{ts,tsx}',
        'src/**/*.stories.{ts,tsx}',
        'src/**/*.d.ts',
        'src/test-utils/**',
        'src/__tests__/**'
      ],
      thresholds: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80
        },
        // Specific thresholds for critical components
        'src/components/SimilarWorriesList.tsx': {
          branches: 90,
          functions: 90,
          lines: 90,
          statements: 90
        },
        'src/services/privacyFilteringService.ts': {
          branches: 95,
          functions: 95,
          lines: 95,
          statements: 95
        }
      }
    },
    
    // Reporter configuration
    reporter: [
      'verbose',
      'json',
      'html'
    ],
    
    // Output directory for test results
    outputFile: {
      json: './test-reports/comprehensive-results.json',
      html: './test-reports/comprehensive-results.html'
    },
    
    // Parallel execution
    pool: 'threads',
    poolOptions: {
      threads: {
        maxThreads: 4,
        minThreads: 1
      }
    },
    
    // Mock configuration
    clearMocks: true,
    restoreMocks: true,
    
    // Performance monitoring
    logHeapUsage: true,
    
    // Retry configuration for flaky tests
    retry: 2,
    
    // Test isolation
    isolate: true,
    
    // Watch mode exclusions
    watchExclude: [
      'node_modules/**',
      'dist/**',
      'coverage/**',
      'test-reports/**'
    ]
  },
  
  // Resolve configuration
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@components': path.resolve(__dirname, './src/components'),
      '@services': path.resolve(__dirname, './src/services'),
      '@utils': path.resolve(__dirname, './src/utils'),
      '@hooks': path.resolve(__dirname, './src/hooks'),
      '@pages': path.resolve(__dirname, './src/pages'),
      '@contexts': path.resolve(__dirname, './src/contexts')
    }
  },
  
  // Define configuration
  define: {
    'import.meta.env.VITE_API_URL': JSON.stringify('http://localhost:3001'),
    'import.meta.env.VITE_APP_ENV': JSON.stringify('test')
  }
})