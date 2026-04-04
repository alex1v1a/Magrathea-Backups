/**
 * Test Setup
 * Global test configuration and utilities
 */

import { beforeAll, afterAll, afterEach } from 'vitest';

// Increase timeout for integration tests
export const INTEGRATION_TIMEOUT = 30000;
export const UNIT_TIMEOUT = 10000;

// Port ranges for different test types
export const PORTS = {
  UNIT: 9200,
  INTEGRATION: 9220,
  BENCHMARKS: 9240
};

// Helper to get unique port
export function getTestPort(basePort, testIndex = 0) {
  return basePort + testIndex;
}

// Global cleanup tracking
const cleanupFns = [];

export function registerCleanup(fn) {
  cleanupFns.push(fn);
}

// Clean up after each test
afterEach(async () => {
  while (cleanupFns.length > 0) {
    const fn = cleanupFns.pop();
    try {
      await fn();
    } catch (err) {
      console.error('Cleanup error:', err);
    }
  }
});

// Suppress expected console errors in tests
const originalError = console.error;
console.error = (...args) => {
  // Filter out expected errors during testing
  const message = args[0]?.toString() || '';
  if (
    message.includes('Connection timeout') ||
    message.includes('Random error injected') ||
    message.includes('Insufficient resources') ||
    message.includes('Navigation timeout') ||
    message.includes('Evaluation timeout')
  ) {
    return; // Suppress expected errors
  }
  originalError.apply(console, args);
};
