/**
 * @fileoverview Example: Using the new refactored utilities
 * This demonstrates how to use the new lib/ modules
 */

// Individual modules that don't require external dependencies
const {
  ConfigError,
  NetworkError,
  isRetryableError,
  withErrorHandling
} = require('./errors');

const {
  ensureDir,
  readJsonSafe,
  writeJsonSafe,
  appendFileSafe,
  findFiles,
  getFileStats,
  deleteSafe,
  moveFileSafe
} = require('./file-utils');

const {
  formatDate,
  parseDate,
  startOf,
  addTime,
  diff,
  formatDuration,
  dateRange,
  relativeTime
} = require('./date-utils');

const {
  retryWithBackoff,
  CircuitBreaker,
  retryWithFilter,
  Bulkhead
} = require('./retry-manager');

// ═══════════════════════════════════════════════════════════════
// Example 1: Error Handling
// ═══════════════════════════════════════════════════════════════

async function exampleErrors() {
  try {
    await riskyOperation();
  } catch (error) {
    if (isRetryableError(error)) {
      console.log('Retryable error, attempting retry...');
      await retryWithBackoff(riskyOperation);
    } else if (error instanceof ConfigError) {
      console.error('Configuration error:', error.message);
    } else {
      throw error;
    }
  }
}

// ═══════════════════════════════════════════════════════════════
// Example 2: File Operations
// ═══════════════════════════════════════════════════════════════

async function exampleFileOperations() {
  // Ensure directory exists
  const dataDir = ensureDir('./data/exports');
  console.log('Data directory:', dataDir);
  
  // Read JSON with default
  const config = readJsonSafe('./config.json', { 
    defaultValue: { version: '1.0' }
  });
  console.log('Config:', config);
  
  // Write JSON atomically
  writeJsonSafe('./data/results.json', { 
    timestamp: formatDate(new Date()),
    results: [] 
  });
  console.log('Results written');
}

// ═══════════════════════════════════════════════════════════════
// Example 3: Date Utilities
// ═══════════════════════════════════════════════════════════════

function exampleDateUtilities() {
  const now = new Date();
  
  // Format for filenames
  const filename = `backup-${formatDate(now, 'FILENAME')}.zip`;
  console.log('Filename:', filename);
  // Result: backup-2024-02-13_10-30-00.zip
  
  // Calculate expiration
  const expires = addTime(now, 24, 'hours');
  console.log('Expires:', formatDate(expires, 'DISPLAY'));
  
  // Format duration
  const duration = formatDuration(90000); 
  console.log('Duration:', duration);
  // Result: '1 minute 30 seconds'
  
  // Relative time
  const yesterday = addTime(now, -1, 'days');
  console.log('Yesterday was:', relativeTime(yesterday));
  // Result: '1 day ago'
  
  // Date range
  const nextWeek = addTime(now, 7, 'days');
  const range = dateRange(now, nextWeek);
  console.log('Days until next week:', range.length);
}

// ═══════════════════════════════════════════════════════════════
// Example 4: Circuit Breaker Pattern
// ═══════════════════════════════════════════════════════════════

async function exampleCircuitBreaker() {
  const breaker = new CircuitBreaker({
    failureThreshold: 3,
    resetTimeout: 10000
  });
  
  try {
    const result = await breaker.execute(async () => {
      // API call that might fail
      return await fetchExternalData();
    });
    
    console.log('Success:', result);
  } catch (error) {
    const state = breaker.getState();
    if (state.state === 'OPEN') {
      console.error('Circuit breaker is open - service unavailable');
      console.log('Retry after:', new Date(state.nextAttempt).toLocaleTimeString());
    }
  }
}

// ═══════════════════════════════════════════════════════════════
// Helper functions for examples
// ═══════════════════════════════════════════════════════════════

async function riskyOperation() {
  // Simulated risky operation
  if (Math.random() > 0.7) {
    throw new NetworkError('Connection failed', 'CONN_FAILED');
  }
  return { success: true };
}

async function fetchExternalData() {
  // Simulated API call
  if (Math.random() > 0.5) {
    throw new Error('API Error');
  }
  return { data: [] };
}

// ═══════════════════════════════════════════════════════════════
// Run examples
// ═══════════════════════════════════════════════════════════════

async function main() {
  console.log('═'.repeat(60));
  console.log('Refactored Utilities Examples');
  console.log('═'.repeat(60));
  
  console.log('\n--- Date Utilities ---');
  exampleDateUtilities();
  
  console.log('\n--- File Operations ---');
  try {
    await exampleFileOperations();
  } catch (err) {
    console.log('File operation example error:', err.message);
  }
  
  console.log('\n--- Error Handling ---');
  await exampleErrors();
  
  console.log('\n--- Circuit Breaker ---');
  await exampleCircuitBreaker();
  
  console.log('\n' + '═'.repeat(60));
  console.log('Examples completed!');
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  exampleErrors,
  exampleFileOperations,
  exampleDateUtilities,
  exampleCircuitBreaker
};
