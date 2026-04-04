/**
 * Logger - Structured Logging Utility
 * 
 * Provides consistent, structured logging across the dinner-automation
 * codebase with support for multiple log levels, structured data, and
 * file output.
 * 
 * @module lib/logger
 */

const fs = require('fs');
const path = require('path');
const { formatDateTime } = require('./date-utils');

// Log levels with numeric priorities
const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  SUCCESS: 2,
  DEBUG: 3,
  TRACE: 4
};

// Level names for display
const LEVEL_NAMES = {
  [LOG_LEVELS.ERROR]: 'ERROR',
  [LOG_LEVELS.WARN]: 'WARN',
  [LOG_LEVELS.INFO]: 'INFO',
  [LOG_LEVELS.SUCCESS]: 'SUCCESS',
  [LOG_LEVELS.DEBUG]: 'DEBUG',
  [LOG_LEVELS.TRACE]: 'TRACE'
};

// Emoji indicators for each level
const LEVEL_EMOJI = {
  [LOG_LEVELS.ERROR]: '❌',
  [LOG_LEVELS.WARN]: '⚠️',
  [LOG_LEVELS.INFO]: 'ℹ️',
  [LOG_LEVELS.SUCCESS]: '✅',
  [LOG_LEVELS.DEBUG]: '🔍',
  [LOG_LEVELS.TRACE]: '→'
};

// Default configuration
const DEFAULT_CONFIG = {
  level: LOG_LEVELS.INFO,
  timestamps: true,
  colors: true,
  emoji: true,
  structured: false,
  outputFile: null,
  maxFileSize: 10 * 1024 * 1024, // 10MB
  maxFiles: 5
};

/**
 * Logger class with structured logging support
 */
class Logger {
  constructor(options = {}) {
    this.config = { ...DEFAULT_CONFIG, ...options };
    this.logFileStream = null;
    this.component = options.component || 'app';
    
    if (this.config.outputFile) {
      this.setupFileOutput();
    }
  }

  /**
   * Setup file output stream
   */
  setupFileOutput() {
    try {
      const dir = path.dirname(this.config.outputFile);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      this.logFileStream = fs.createWriteStream(this.config.outputFile, { flags: 'a' });
    } catch (error) {
      console.error('Failed to setup log file:', error.message);
    }
  }

  /**
   * Create a child logger with specific component
   * @param {string} component - Component name
   * @param {Object} extraContext - Additional context
   * @returns {Logger}
   */
  child(component, extraContext = {}) {
    return new Logger({
      ...this.config,
      component: this.component ? `${this.component}.${component}` : component,
      ...extraContext
    });
  }

  /**
   * Check if level should be logged
   * @param {number} level - Log level
   * @returns {boolean}
   */
  shouldLog(level) {
    return level <= this.config.level;
  }

  /**
   * Format log message
   * @param {number} level - Log level
   * @param {string} message - Message
   * @param {Object} meta - Metadata
   * @returns {string}
   */
  formatMessage(level, message, meta = {}) {
    const timestamp = this.config.timestamps ? formatDateTime(new Date(), 'iso') : null;
    const levelName = LEVEL_NAMES[level] || 'UNKNOWN';
    const emoji = this.config.emoji ? LEVEL_EMOJI[level] || '' : '';

    if (this.config.structured) {
      return JSON.stringify({
        timestamp,
        level: levelName,
        component: this.component,
        message,
        ...meta
      });
    }

    const parts = [];
    if (timestamp) parts.push(`[${timestamp}]`);
    parts.push(emoji);
    parts.push(`[${levelName}]`);
    if (this.component) parts.push(`[${this.component}]`);
    parts.push(message);
    
    if (Object.keys(meta).length > 0) {
      parts.push(JSON.stringify(meta));
    }

    return parts.filter(Boolean).join(' ');
  }

  /**
   * Write log entry
   * @param {number} level - Log level
   * @param {string} message - Message
   * @param {Object} meta - Metadata
   */
  log(level, message, meta = {}) {
    if (!this.shouldLog(level)) return;

    const formatted = this.formatMessage(level, message, meta);
    
    // Console output
    console.log(formatted);
    
    // File output
    if (this.logFileStream) {
      this.logFileStream.write(formatted + '\n');
    }
  }

  // Level-specific logging methods
  error(message, error, meta = {}) {
    const errorMeta = error ? { 
      error: error.message, 
      stack: error.stack,
      ...meta 
    } : meta;
    this.log(LOG_LEVELS.ERROR, message, errorMeta);
  }

  warn(message, meta = {}) {
    this.log(LOG_LEVELS.WARN, message, meta);
  }

  info(message, meta = {}) {
    this.log(LOG_LEVELS.INFO, message, meta);
  }

  success(message, meta = {}) {
    this.log(LOG_LEVELS.SUCCESS, message, meta);
  }

  debug(message, meta = {}) {
    this.log(LOG_LEVELS.DEBUG, message, meta);
  }

  trace(message, meta = {}) {
    this.log(LOG_LEVELS.TRACE, message, meta);
  }

  /**
   * Log a section header
   * @param {string} title - Section title
   */
  section(title) {
    const line = '='.repeat(40);
    console.log(`\n${line}\n${title}\n${line}`);
  }

  /**
   * Log a table of data
   * @param {string} title - Table title
   * @param {Object} data - Data to display
   */
  table(title, data) {
    this.section(title);
    console.table(data);
  }

  /**
   * Start a timer for performance tracking
   * @param {string} label - Timer label
   * @returns {Function} End timer function
   */
  timer(label) {
    const start = Date.now();
    this.debug(`Timer started: ${label}`);
    
    return (message = 'completed') => {
      const duration = Date.now() - start;
      this.debug(`${label} ${message} in ${duration}ms`, { duration });
      return duration;
    };
  }

  /**
   * Close logger and cleanup resources
   */
  close() {
    if (this.logFileStream) {
      this.logFileStream.end();
      this.logFileStream = null;
    }
  }
}

// Default logger instance
const defaultLogger = new Logger();

// Convenience exports for default logger
const logger = {
  error: (msg, err, meta) => defaultLogger.error(msg, err, meta),
  warn: (msg, meta) => defaultLogger.warn(msg, meta),
  info: (msg, meta) => defaultLogger.info(msg, meta),
  success: (msg, meta) => defaultLogger.success(msg, meta),
  debug: (msg, meta) => defaultLogger.debug(msg, meta),
  trace: (msg, meta) => defaultLogger.trace(msg, meta),
  section: (title) => defaultLogger.section(title),
  table: (title, data) => defaultLogger.table(title, data),
  timer: (label) => defaultLogger.timer(label),
  child: (comp, ctx) => defaultLogger.child(comp, ctx),
  
  // Configuration
  setLevel: (level) => { defaultLogger.config.level = level; },
  setStructured: (val) => { defaultLogger.config.structured = val; },
  
  // Create new logger instance
  create: (opts) => new Logger(opts)
};

module.exports = {
  Logger,
  logger,
  LOG_LEVELS,
  LEVEL_NAMES,
  DEFAULT_CONFIG
};
