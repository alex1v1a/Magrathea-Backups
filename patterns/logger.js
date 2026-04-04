/**
 * Unified Logging System
 * Structured logging with levels, colors, and file output
 */

const fs = require('fs');
const path = require('path');

// ANSI color codes
const COLORS = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m'
};

// Log levels
const LEVELS = {
  ERROR: { value: 0, color: 'red', label: 'ERROR' },
  WARN: { value: 1, color: 'yellow', label: 'WARN' },
  INFO: { value: 2, color: 'green', label: 'INFO' },
  DEBUG: { value: 3, color: 'blue', label: 'DEBUG' },
  TRACE: { value: 4, color: 'dim', label: 'TRACE' }
};

class Logger {
  constructor(options = {}) {
    this.name = options.name || 'app';
    this.level = options.level || 'INFO';
    this.logDir = options.logDir || path.join(process.cwd(), 'logs');
    this.enableConsole = options.enableConsole !== false;
    this.enableFile = options.enableFile !== false;
    this.enableColors = options.enableColors !== false;
    
    this.currentLevel = LEVELS[this.level.toUpperCase()] || LEVELS.INFO;
    this.logFile = null;
    
    if (this.enableFile) {
      this._initLogFile();
    }
  }
  
  _initLogFile() {
    try {
      if (!fs.existsSync(this.logDir)) {
        fs.mkdirSync(this.logDir, { recursive: true });
      }
      
      const date = new Date().toISOString().split('T')[0];
      const logPath = path.join(this.logDir, `${this.name}-${date}.log`);
      this.logFile = logPath;
    } catch (e) {
      console.error('Failed to initialize log file:', e.message);
    }
  }
  
  _shouldLog(level) {
    return level.value <= this.currentLevel.value;
  }
  
  _formatMessage(level, message, meta = {}) {
    const timestamp = new Date().toISOString();
    const metaStr = Object.keys(meta).length > 0 
      ? ' ' + JSON.stringify(meta) 
      : '';
    return `[${timestamp}] [${level.label}] [${this.name}] ${message}${metaStr}`;
  }
  
  _writeToFile(formattedMessage) {
    if (!this.logFile) return;
    
    try {
      fs.appendFileSync(this.logFile, formattedMessage + '\n');
    } catch (e) {
      // Silent fail for file logging
    }
  }
  
  _writeToConsole(formattedMessage, level) {
    if (!this.enableConsole) return;
    
    const color = this.enableColors ? COLORS[level.color] : '';
    const reset = this.enableColors ? COLORS.reset : '';
    
    console.log(`${color}${formattedMessage}${reset}`);
  }
  
  log(levelName, message, meta = {}) {
    const level = LEVELS[levelName.toUpperCase()];
    if (!level || !this._shouldLog(level)) return;
    
    const formatted = this._formatMessage(level, message, meta);
    
    this._writeToFile(formatted);
    this._writeToConsole(formatted, level);
  }
  
  error(message, meta) { this.log('ERROR', message, meta); }
  warn(message, meta) { this.log('WARN', message, meta); }
  info(message, meta) { this.log('INFO', message, meta); }
  debug(message, meta) { this.log('DEBUG', message, meta); }
  trace(message, meta) { this.log('TRACE', message, meta); }
  
  // Section header for visual separation
  section(title) {
    const line = '═'.repeat(40);
    this.info('');
    this.info(`${line}`);
    this.info(`  ${title}`);
    this.info(`${line}`);
  }
  
  // Success/failure helpers
  success(message, meta) { 
    this.info(`✅ ${message}`, meta); 
  }
  
  failure(message, meta) { 
    this.error(`❌ ${message}`, meta); 
  }
  
  // Create child logger with context
  child(context) {
    const childLogger = new Logger({
      name: `${this.name}:${context}`,
      level: this.level,
      logDir: this.logDir,
      enableConsole: this.enableConsole,
      enableFile: this.enableFile,
      enableColors: this.enableColors
    });
    return childLogger;
  }
}

// Default logger instance
const defaultLogger = new Logger({ name: 'marvin' });

// Quick logging functions
module.exports = {
  Logger,
  logger: defaultLogger,
  
  // Direct level functions
  error: (msg, meta) => defaultLogger.error(msg, meta),
  warn: (msg, meta) => defaultLogger.warn(msg, meta),
  info: (msg, meta) => defaultLogger.info(msg, meta),
  debug: (msg, meta) => defaultLogger.debug(msg, meta),
  trace: (msg, meta) => defaultLogger.trace(msg, meta),
  section: (title) => defaultLogger.section(title),
  success: (msg, meta) => defaultLogger.success(msg, meta),
  failure: (msg, meta) => defaultLogger.failure(msg, meta)
};
