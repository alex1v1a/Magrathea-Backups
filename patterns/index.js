/**
 * Patterns Library - Reusable Automation Patterns
 * 
 * Usage:
 *   const { retry, logger, browser } = require('./patterns');
 * 
 * @module patterns
 */

const credentials = require('./credentials');
const retryUtils = require('./retry-utils');
const logger = require('./logger');
const browserPatterns = require('./browser-patterns');
const emailUtils = require('./email-utils');
const calendarUtils = require('./calendar-utils');
const metrics = require('./metrics');

module.exports = {
  // Credentials management
  credentials,
  getCredentials: credentials.getCredentials,
  checkCredentials: credentials.checkCredentials,
  getIMAPConfig: credentials.getIMAPConfig,
  getCalDAVConfig: credentials.getCalDAVConfig,
  getSMTPConfig: credentials.getSMTPConfig,
  
  // Retry and resilience
  retry: retryUtils,
  withRetry: retryUtils.withRetry,
  sleep: retryUtils.sleep,
  isTransientError: retryUtils.isTransientError,
  circuitBreaker: retryUtils.circuitBreaker,
  batchProcess: retryUtils.batchProcess,
  
  // Logging
  logger: logger.logger,
  Logger: logger.Logger,
  log: {
    error: logger.error,
    warn: logger.warn,
    info: logger.info,
    debug: logger.debug,
    trace: logger.trace,
    section: logger.section,
    success: logger.success,
    failure: logger.failure
  },
  
  // Browser automation
  browser: browserPatterns,
  smartSelector: browserPatterns.smartSelector,
  smartClick: browserPatterns.smartClick,
  smartType: browserPatterns.smartType,
  checkLoginStatus: browserPatterns.checkLoginStatus,
  SessionManager: browserPatterns.SessionManager,
  RateLimiter: browserPatterns.RateLimiter,
  
  // Email utilities
  email: emailUtils,
  searchEmails: emailUtils.searchEmails,
  findVerificationCode: emailUtils.findVerificationCode,
  sendEmail: emailUtils.sendEmail,
  getHEBVerificationCode: emailUtils.getHEBVerificationCode,
  IMAPConnectionPool: emailUtils.IMAPConnectionPool,
  
  // Calendar utilities
  calendar: calendarUtils,
  incrementalSync: calendarUtils.incrementalSync,
  parseICal: calendarUtils.parseICal,
  eventToICal: calendarUtils.eventToICal,
  
  // Metrics
  metrics,
  recordMetric: metrics.recordMetric,
  recordExecution: metrics.recordExecution,
  MetricsReporter: metrics.MetricsReporter,
  withMetrics: metrics.withMetrics
};
