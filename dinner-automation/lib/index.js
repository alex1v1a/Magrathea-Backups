/**
 * Dinner Automation Shared Library
 * 
 * Centralized utilities for the dinner-automation codebase.
 * 
 * @example
 * const { CDPClient, logger, withRetry, formatDateTime, getConfig } = require('./lib');
 * 
 * @module lib
 */

// CDP Client
const { CDPClient, connectToBrowser, getBrowserInfo, listPages } = require('./cdp-client');

// Retry Utilities
const { 
  withRetry, 
  sleep, 
  CircuitBreaker, 
  CircuitBreakerError,
  CIRCUIT_STATE,
  batchProcess,
  withTimeout,
  debounce,
  throttle
} = require('./retry-utils');

// Logger
const { Logger, logger, LOG_LEVELS } = require('./logger');

// Date Utilities
const { 
  formatDateTime, 
  formatRelativeTime, 
  formatDuration,
  addTime, 
  diff, 
  isToday, 
  getWeekRange,
  timestampForFilename,
  DATE_FORMATS
} = require('./date-utils');

// Configuration
const { Config, getConfig, createConfig, DEFAULTS } = require('./config');

// Browser Automation
const {
  BROWSER_CONFIG,
  smartSelector,
  smartClick,
  smartType,
  waitForAnySelector,
  checkLoginStatus,
  waitForPageReady,
  elementExists,
  safeEvaluate,
  smartNavigate,
  humanLikeScroll,
  SessionManager,
  RateLimiter
} = require('./browser');

// Selectors
const {
  HEB_SELECTORS,
  FB_SELECTORS,
  COMMON_SELECTORS,
  flattenSelectors,
  getSelectorByPath,
  mergeSelectors,
  validateSelectors
} = require('./selectors');

// Validation
const {
  ValidationError,
  ValidationErrors,
  validateEmail,
  validateUrl,
  validateLength,
  validatePattern,
  validateRange,
  validatePositive,
  validateRequired,
  validateArray,
  validateHEBCartItem,
  validateMarketplaceConfig,
  validateAutomationConfig,
  sanitizeString,
  sanitizeFilename,
  sanitizeHTML,
  validateSchema
} = require('./validation');

// OpenAI Batch API
const {
  OpenAIBatchQueue,
  BATCH_CONFIG,
  enqueueOpenAIRequest,
  processOpenAIQueue
} = require('./openai-batch');

// Connection Pool
const {
  ConnectionPool,
  PooledConnection,
  POOL_CONFIG,
  getConnectionPool,
  resetConnectionPool
} = require('./connection-pool');

// Cache
const {
  Cache,
  CacheEntry,
  CACHE_CONFIG,
  getCache,
  resetCache
} = require('./cache');

// Metrics
const {
  Metrics,
  Timer,
  METRICS_CONFIG,
  getMetrics,
  resetMetrics
} = require('./metrics');

// Performance Utilities
const {
  Batcher,
  SimpleCache,
  RetryStrategy,
  Profiler,
  ProgressTracker,
  RateLimiter: PerformanceRateLimiter
} = require('./performance-utils');

// HTTP Client
const { HTTPClient } = require('./http-client');

// Selector Engine
const { SelectorEngine, SELECTOR_GROUPS } = require('./selector-engine');

// Anti-Detection v2
const { AntiDetection } = require('./anti-detection-v2');

module.exports = {
  // CDP Client
  CDPClient,
  connectToBrowser,
  getBrowserInfo,
  listPages,
  
  // Retry Utilities
  withRetry,
  sleep,
  CircuitBreaker,
  CircuitBreakerError,
  CIRCUIT_STATE,
  batchProcess,
  withTimeout,
  debounce,
  throttle,
  
  // Logger
  Logger,
  logger,
  LOG_LEVELS,
  
  // Date Utilities
  formatDateTime,
  formatRelativeTime,
  formatDuration,
  addTime,
  diff,
  isToday,
  getWeekRange,
  timestampForFilename,
  DATE_FORMATS,
  
  // Configuration
  Config,
  getConfig,
  createConfig,
  DEFAULTS,
  
  // Browser Automation
  BROWSER_CONFIG,
  smartSelector,
  smartClick,
  smartType,
  waitForAnySelector,
  checkLoginStatus,
  waitForPageReady,
  elementExists,
  safeEvaluate,
  smartNavigate,
  humanLikeScroll,
  SessionManager,
  RateLimiter,
  
  // Selectors
  HEB_SELECTORS,
  FB_SELECTORS,
  COMMON_SELECTORS,
  flattenSelectors,
  getSelectorByPath,
  mergeSelectors,
  validateSelectors,
  
  // Validation
  ValidationError,
  ValidationErrors,
  validateEmail,
  validateUrl,
  validateLength,
  validatePattern,
  validateRange,
  validatePositive,
  validateRequired,
  validateArray,
  validateHEBCartItem,
  validateMarketplaceConfig,
  validateAutomationConfig,
  sanitizeString,
  sanitizeFilename,
  sanitizeHTML,
  validateSchema,
  
  // OpenAI Batch API
  OpenAIBatchQueue,
  BATCH_CONFIG,
  enqueueOpenAIRequest,
  processOpenAIQueue,
  
  // Connection Pool
  ConnectionPool,
  PooledConnection,
  POOL_CONFIG,
  getConnectionPool,
  resetConnectionPool,
  
  // Cache
  Cache,
  CacheEntry,
  CACHE_CONFIG,
  getCache,
  resetCache,
  
  // Metrics
  Metrics,
  Timer,
  METRICS_CONFIG,
  getMetrics,
  resetMetrics,
  
  // Performance Utilities
  Batcher,
  SimpleCache,
  RetryStrategy,
  Profiler,
  ProgressTracker,
  PerformanceRateLimiter,
  
  // HTTP Client
  HTTPClient,
  
  // Selector Engine
  SelectorEngine,
  SELECTOR_GROUPS,
  
  // Anti-Detection v2
  AntiDetection
};
