/**
 * Utils Index - Export all utility modules
 * @module utils
 */

const { BrowserPool } = require('./browser-pool');
const { RetryWrapper, CircuitBreaker, withRetry } = require('./retry-wrapper');
const { ParallelProcessor, parallelMap, parallelFilter, rateLimited } = require('./parallel-processor');
const { CacheManager, getDefaultCache } = require('./cache-manager');
const { MetricsCollector, timed } = require('./metrics-collector');

module.exports = {
  // Browser Pool
  BrowserPool,
  
  // Retry & Circuit Breaker
  RetryWrapper,
  CircuitBreaker,
  withRetry,
  
  // Parallel Processing
  ParallelProcessor,
  parallelMap,
  parallelFilter,
  rateLimited,
  
  // Caching
  CacheManager,
  getDefaultCache,
  
  // Metrics
  MetricsCollector,
  timed
};
