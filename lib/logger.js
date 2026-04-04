/**
 * Marvin Logger - Structured logging utility
 * Uses Pino for performance, with Winston-like flexibility
 */

const path = require('path');
const fs = require('fs');

// Simple logger implementation (can swap for Pino/Winston later)
class MarvinLogger {
  constructor(options = {}) {
    this.name = options.name || 'marvin';
    this.level = options.level || process.env.LOG_LEVEL || 'info';
    this.logDir = options.logDir || path.join(__dirname, '..', 'logs');
    
    this.levels = {
      trace: 10,
      debug: 20,
      info: 30,
      warn: 40,
      error: 50,
      fatal: 60
    };
    
    // Ensure log directory exists
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
    
    this.logFile = path.join(this.logDir, `${this.name}-${new Date().toISOString().split('T')[0]}.log`);
  }
  
  _shouldLog(level) {
    return this.levels[level] >= this.levels[this.level];
  }
  
  _format(level, message, meta = {}) {
    const entry = {
      timestamp: new Date().toISOString(),
      level,
      name: this.name,
      message,
      ...meta
    };
    return JSON.stringify(entry);
  }
  
  _write(level, message, meta) {
    if (!this._shouldLog(level)) return;
    
    const formatted = this._format(level, message, meta);
    
    // Console output with colors
    const colors = {
      trace: '\x1b[90m', // gray
      debug: '\x1b[36m', // cyan
      info: '\x1b[32m',  // green
      warn: '\x1b[33m',  // yellow
      error: '\x1b[31m', // red
      fatal: '\x1b[35m'  // magenta
    };
    const reset = '\x1b[0m';
    
    console.log(`${colors[level]}[${level.toUpperCase()}]${reset} ${message}`);
    
    // File output (structured)
    fs.appendFileSync(this.logFile, formatted + '\n');
  }
  
  trace(msg, meta) { this._write('trace', msg, meta); }
  debug(msg, meta) { this._write('debug', msg, meta); }
  info(msg, meta) { this._write('info', msg, meta); }
  warn(msg, meta) { this._write('warn', msg, meta); }
  error(msg, meta) { this._write('error', msg, meta); }
  fatal(msg, meta) { this._write('fatal', msg, meta); }
  
  child(meta) {
    const childLogger = new MarvinLogger({
      name: this.name,
      level: this.level,
      logDir: this.logDir
    });
    childLogger._childMeta = meta;
    return childLogger;
  }
}

// Create default logger
const logger = new MarvinLogger({ name: 'marvin' });

module.exports = {
  MarvinLogger,
  logger
};
