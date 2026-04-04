import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    // Global test timeout
    testTimeout: 30000,
    // Hook timeout
    hookTimeout: 10000,
    // Enable global test APIs (describe, it, expect)
    globals: true,
    // Environment
    environment: 'node',
    // Setup files
    setupFiles: ['./tests/automation/setup.js'],
    // Reporters
    reporters: ['verbose'],
    // Coverage
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'tests/automation/mocks/',
        '**/*.test.js'
      ]
    },
    // Exclude patterns
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/cypress/**',
      '**/.{idea,git,cache,output,temp}/**'
    ],
    // Run tests in sequence (needed for port-based tests)
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true
      }
    }
  },
  resolve: {
    alias: {
      '@mocks': path.resolve(__dirname, './tests/automation/mocks'),
      '@unit': path.resolve(__dirname, './tests/automation/unit'),
      '@integration': path.resolve(__dirname, './tests/automation/integration'),
      '@benchmarks': path.resolve(__dirname, './tests/automation/benchmarks')
    }
  }
});
