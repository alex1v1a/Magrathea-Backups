#!/usr/bin/env node
/**
 * Dinner Plan Email System v3.0
 * 
 * Improvements over v2:
 * - Circuit breaker pattern for SMTP, Unsplash, and Twilio APIs
 * - Exponential backoff with jitter for all external calls
 * - Structured error logging with context throughout
 * - Graceful degradation when services fail (email works even if images fail)
 * - Rate limit detection and automatic backoff
 * - Comprehensive timeout handling
 * - Better cleanup and resource management
 * 
 * Usage:
 *   node dinner-email-system-v3.js --send-test
 *   node dinner-email-system-v3.js --check-reply
 *   node dinner-email-system-v3.js --status
 */

const fs = require('fs').promises;
const path = require('path');
const https = require('https');
const { execSync } = require('child_process');

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
  // Paths
  DATA_DIR: path.join(__dirname, '..', 'data'),
  WORKSPACE_DIR: path.join(__dirname, '..', '..'),
  LOGS_DIR: path.join(__dirname, '..', 'logs'),
  
  // Config files
  SMTP_CONFIG_FILE: path.join(__dirname, '..', '..', '.secrets', 'icloud-smtp.json'),
  TWILIO_CONFIG_FILE: path.join(__dirname, '..', '..', '.secrets', 'twilio.json'),
  UNSPLASH_CONFIG_FILE: path.join(__dirname, '..', '..', '.secrets', 'unsplash.json'),
  
  // Data files
  WEEKLY_PLAN_FILE: path.join(__dirname, '..', 'data', 'weekly-plan.json'),
  RECIPE_DATABASE_FILE: path.join(__dirname, '..', 'data', 'recipe-database.json'),
  YOUTUBE_CACHE_FILE: path.join(__dirname, '..', 'data', 'youtube-cache.json'),
  TRACKING_DB_FILE: path.join(__dirname, '..', 'data', 'dinner-tracking-db.json'),
  PENDING_CHANGES_FILE: path.join(__dirname, '..', 'data', 'dinner-pending-changes.json'),
  IMAGE_CACHE_FILE: path.join(__dirname, '..', 'data', 'meal-image-cache.json'),
  
  // Email config
  EMAIL: {
    from: process.env.DINNER_EMAIL_FROM || 'MarvinMartian9@icloud.com',
    fromName: process.env.DINNER_EMAIL_FROM_NAME || 'Marvin Maverick',
    to: process.env.DINNER_EMAIL_TO || 'alex@1v1a.com',
    toPhone: process.env.DINNER_SMS_TO || '+18083818835',
    subjectPrefix: '🍽️ Dinner Plan',
    fallbackDelayMs: 6 * 60 * 60 * 1000 // 6 hours
  },
  
  // Retry configuration
  RETRY: {
    SMTP_MAX_RETRIES: parseInt(process.env.SMTP_RETRY_MAX_ATTEMPTS) || 3,
    UNSPLASH_MAX_RETRIES: parseInt(process.env.UNSPLASH_RETRY_MAX_ATTEMPTS) || 3,
    TWILIO_MAX_RETRIES: parseInt(process.env.TWILIO_RETRY_MAX_ATTEMPTS) || 2,
    BASE_DELAY: 1000,
    MAX_DELAY: 30000
  },
  
  // Circuit breaker configuration
  CIRCUIT: {
    SMTP_FAILURE_THRESHOLD: 3,
    SMTP_RESET_TIMEOUT: 300000, // 5 minutes
    UNSPLASH_FAILURE_THRESHOLD: 5,
    UNSPLASH_RESET_TIMEOUT: 60000,
    TWILIO_FAILURE_THRESHOLD: 3,
    TWILIO_RESET_TIMEOUT: 120000
  },
  
  // Timeouts
  TIMEOUT: {
    HTTP: 15000,
    SMTP: 30000,
    UNSPLASH: 10000
  }
};

// ============================================================================
// STRUCTURED LOGGER
// ============================================================================

class StructuredLogger {
  constructor(context = {}) {
    this.context = context;
    this.logs = [];
  }

  log(level, message, meta = {}) {
    const entry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...this.context,
      ...meta
    };
    
    this.logs.push(entry);
    
    const prefix = {
      error: '❌',
      warn: '⚠️',
      info: 'ℹ️',
      success: '✅',
      debug: '🔍'
    }[level] || '•';
    
    const metaStr = Object.keys(meta).length > 0 
      ? ' | ' + JSON.stringify(meta, null, 0).slice(1, -1).replace(/"/g, '')
      : '';
    
    console.log(`${prefix} ${message}${metaStr}`);
  }

  error(message, meta) { this.log('error', message, meta); }
  warn(message, meta) { this.log('warn', message, meta); }
  info(message, meta) { this.log('info', message, meta); }
  success(message, meta) { this.log('success', message, meta); }
  debug(message, meta) { this.log('debug', message, meta); }

  async saveToFile(filename) {
    const logFile = path.join(CONFIG.LOGS_DIR, filename || `email-v3-${Date.now()}.json`);
    try {
      await fs.mkdir(CONFIG.LOGS_DIR, { recursive: true });
      await fs.writeFile(logFile, JSON.stringify(this.logs, null, 2));
      return logFile;
    } catch (err) {
      console.error('Failed to save logs:', err.message);
      return null;
    }
  }
}

const logger = new StructuredLogger({ service: 'dinner-email-v3' });

// ============================================================================
// CIRCUIT BREAKER
// ============================================================================

class CircuitBreaker {
  constructor(name, options = {}) {
    this.name = name;
    this.failureThreshold = options.failureThreshold || 5;
    this.resetTimeout = options.resetTimeout || 60000;
    this.halfOpenMaxCalls = options.halfOpenMaxCalls || 3;
    
    this.state = 'CLOSED';
    this.failures = 0;
    this.lastFailureTime = null;
    this.halfOpenCalls = 0;
    this.stats = { totalCalls: 0, totalFailures: 0, totalSuccesses: 0 };
  }

  async execute(fn, ...args) {
    this.stats.totalCalls++;
    
    if (this.state === 'OPEN') {
      const timeSinceLastFailure = Date.now() - this.lastFailureTime;
      if (timeSinceLastFailure >= this.resetTimeout) {
        logger.info(`Circuit '${this.name}' moving to HALF_OPEN`);
        this.state = 'HALF_OPEN';
        this.halfOpenCalls = 0;
      } else {
        const remainingSec = Math.ceil((this.resetTimeout - timeSinceLastFailure) / 1000);
        throw new Error(`Circuit '${this.name}' is OPEN. Retry in ${remainingSec}s`);
      }
    }

    if (this.state === 'HALF_OPEN' && this.halfOpenCalls >= this.halfOpenMaxCalls) {
      throw new Error(`Circuit '${this.name}' HALF_OPEN limit reached`);
    }

    if (this.state === 'HALF_OPEN') {
      this.halfOpenCalls++;
    }

    try {
      const result = await fn(...args);
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  onSuccess() {
    this.failures = 0;
    this.stats.totalSuccesses++;
    if (this.state === 'HALF_OPEN') {
      logger.success(`Circuit '${this.name}' closed after successful HALF_OPEN test`);
      this.state = 'CLOSED';
    }
  }

  onFailure() {
    this.failures++;
    this.stats.totalFailures++;
    this.lastFailureTime = Date.now();

    if (this.failures >= this.failureThreshold) {
      logger.error(`Circuit '${this.name}' opened after ${this.failures} failures`);
      this.state = 'OPEN';
    }
  }

  getStats() {
    return {
      name: this.name,
      state: this.state,
      ...this.stats,
      failureRate: this.stats.totalCalls > 0 
        ? (this.stats.totalFailures / this.stats.totalCalls).toFixed(2)
        : 0
    };
  }
}

// Initialize circuit breakers
const circuits = {
  smtp: new CircuitBreaker('smtp', {
    failureThreshold: CONFIG.CIRCUIT.SMTP_FAILURE_THRESHOLD,
    resetTimeout: CONFIG.CIRCUIT.SMTP_RESET_TIMEOUT
  }),
  unsplash: new CircuitBreaker('unsplash', {
    failureThreshold: CONFIG.CIRCUIT.UNSPLASH_FAILURE_THRESHOLD,
    resetTimeout: CONFIG.CIRCUIT.UNSPLASH_RESET_TIMEOUT
  }),
  twilio: new CircuitBreaker('twilio', {
    failureThreshold: CONFIG.CIRCUIT.TWILIO_FAILURE_THRESHOLD,
    resetTimeout: CONFIG.CIRCUIT.TWILIO_RESET_TIMEOUT
  })
};

// ============================================================================
// RETRY UTILITIES
// ============================================================================

function isRetryableError(error) {
  if (error.code === 'ECONNRESET') return true;
  if (error.code === 'ETIMEDOUT') return true;
  if (error.code === 'ECONNREFUSED') return true;
  if (error.status === 429) return true; // Rate limited
  if (error.status === 503) return true; // Service unavailable
  if (error.status === 502) return true;
  if (error.status === 504) return true;
  if (error.message?.includes('timeout')) return true;
  if (error.message?.includes('circuit') && error.message?.includes('OPEN')) return false;
  return false;
}

function calculateBackoffDelay(attempt, baseDelay = CONFIG.RETRY.BASE_DELAY, maxDelay = CONFIG.RETRY.MAX_DELAY) {
  const exponential = baseDelay * Math.pow(2, attempt - 1);
  const jitter = Math.random() * 1000;
  return Math.min(exponential + jitter, maxDelay);
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function withRetry(fn, options = {}) {
  const { 
    maxRetries = 3, 
    baseDelay = CONFIG.RETRY.BASE_DELAY,
    maxDelay = CONFIG.RETRY.MAX_DELAY,
    onRetry = null,
    context = {}
  } = options;

  let lastError;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      if (attempt === maxRetries) {
        throw new Error(`Failed after ${maxRetries} attempts: ${error.message}`);
      }

      if (!isRetryableError(error)) {
        throw error;
      }

      const delay = calculateBackoffDelay(attempt, baseDelay, maxDelay);
      
      if (onRetry) {
        onRetry({ attempt, maxRetries, delay, error, context });
      }

      await sleep(delay);
    }
  }

  throw lastError;
}

// ============================================================================
// CONFIG LOADING WITH FALLBACK
// ============================================================================

async function loadConfigWithFallback(filePath, fallback = null) {
  try {
    const data = await fs.readFile(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    logger.warn(`Could not load config from ${path.basename(filePath)}`, { 
      error: error.message 
    });
    return fallback;
  }
}

async function loadSmtpConfig() {
  return loadConfigWithFallback(CONFIG.SMTP_CONFIG_FILE);
}

async function loadTwilioConfig() {
  return loadConfigWithFallback(CONFIG.TWILIO_CONFIG_FILE);
}

async function loadUnsplashConfig() {
  return loadConfigWithFallback(CONFIG.UNSPLASH_CONFIG_FILE);
}

// ============================================================================
// SMTP WITH RETRY AND CIRCUIT BREAKER
// ============================================================================

async function sendEmailViaSmtp(to, subject, htmlBody, config, trackingId = null) {
  return circuits.smtp.execute(async () => {
    return withRetry(async () => {
      const boundary = `----=_Part_${Date.now()}`;
      const date = new Date().toUTCString();
      const messageId = `${Date.now()}@icloud.com`;
      
      // Create plain text version
      const plainText = htmlBody
        .replace(/\u003cstyle[^\u003e]*\u003e[\s\S]*?\u003c\/style\u003e/gi, '')
        .replace(/\u003c[^\u003e]*\u003e/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .substring(0, 2000);
      
      const emailContent = [
        `MIME-Version: 1.0`,
        `Content-Type: multipart/alternative; boundary="${boundary}"`,
        ``,
        `--${boundary}`,
        `Content-Type: text/plain; charset=utf-8`,
        ``,
        plainText + (plainText.length >= 2000 ? '\n\n[View full email in HTML]' : ''),
        ``,
        `--${boundary}`,
        `Content-Type: text/html; charset=utf-8`,
        ``,
        htmlBody,
        ``,
        `--${boundary}--`
      ].join('\r\n');
      
      const fullEmail = [
        `From: "${CONFIG.EMAIL.fromName}" \u003c${config.email}\u003e`,
        `To: ${to}`,
        `Subject: ${subject}`,
        `Date: ${date}`,
        `Message-Id: \u003c${messageId}\u003e`,
        emailContent
      ].join('\r\n');
      
      const tempFile = path.join(CONFIG.DATA_DIR, `temp-email-${Date.now()}.eml`);
      
      try {
        await fs.writeFile(tempFile, fullEmail);
        
        const curlCmd = [
          'curl',
          '-s',
          '--url', 'smtp://smtp.mail.me.com:587',
          '--ssl-reqd',
          '--mail-from', config.email,
          '--mail-rcpt', to,
          '--upload-file', tempFile,
          '--user', `${config.email}:${config.app_specific_password}`,
          '--tlsv1.2',
          '--max-time', '30'
        ];
        
        execSync(curlCmd.join(' '), { 
          encoding: 'utf8',
          timeout: CONFIG.TIMEOUT.SMTP,
          stdio: ['pipe', 'pipe', 'pipe']
        });
        
        return { success: true, messageId };
        
      } finally {
        // Always cleanup temp file
        await fs.unlink(tempFile).catch(() => {});
      }
    }, {
      maxRetries: CONFIG.RETRY.SMTP_MAX_RETRIES,
      context: { operation: 'sendEmail', to, subject },
      onRetry: ({ attempt, delay }) => {
        logger.warn(`SMTP retry ${attempt}/${CONFIG.RETRY.SMTP_MAX_RETRIES}`, { delay });
      }
    });
  });
}

// ============================================================================
// UNSPLASH IMAGE SERVICE WITH FALLBACK
// ============================================================================

class ImageService {
  constructor() {
    this.cacheFile = CONFIG.IMAGE_CACHE_FILE;
    this.config = null;
    this.defaultImages = {
      'italian': 'https://images.unsplash.com/photo-1498579150354-977475b7ea0b?w=600&h=400&fit=crop',
      'mexican': 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=600&h=400&fit=crop',
      'asian': 'https://images.unsplash.com/photo-1553621042-f6e147245754?w=600&h=400&fit=crop',
      'indian': 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=600&h=400&fit=crop',
      'american': 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&h=400&fit=crop',
      'mediterranean': 'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=600&h=400&fit=crop',
      'pasta': 'https://images.unsplash.com/photo-1551183053-bf91a1d81141?w=600&h=400&fit=crop',
      'chicken': 'https://images.unsplash.com/photo-1532550907401-a500c9a57435?w=600&h=400&fit=crop',
      'beef': 'https://images.unsplash.com/photo-1544025162-d76694265947?w=600&h=400&fit=crop',
      'fish': 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=600&h=400&fit=crop',
      'salad': 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=600&h=400&fit=crop',
      'soup': 'https://images.unsplash.com/photo-1547592166-23acbe3a624b?w=600&h=400&fit=crop',
      'pizza': 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=600&h=400&fit=crop',
      'default': 'https://images.unsplash.com/photo-1495521821757-a1efb6729352?w=600&h=400&fit=crop'
    };
  }

  async loadConfig() {
    if (this.config) return this.config;
    this.config = await loadUnsplashConfig();
    return this.config;
  }

  async loadCache() {
    try {
      const data = await fs.readFile(this.cacheFile, 'utf8');
      return JSON.parse(data);
    } catch {
      return {};
    }
  }

  async saveCache(cache) {
    try {
      await fs.writeFile(this.cacheFile, JSON.stringify(cache, null, 2));
    } catch (err) {
      logger.warn('Failed to save image cache', { error: err.message });
    }
  }

  async getMealImage(mealName, cuisine, cache) {
    // Allow caller to pass in a shared cache object so we only
    // hit the filesystem once per run instead of per meal.
    if (!cache) {
      cache = await this.loadCache();
    }
    
    // Check cache first
    if (cache[mealName] && !this.isExpired(cache[mealName])) {
      logger.debug(`Using cached image for ${mealName}`);
      return cache[mealName].url;
    }

    // Try Unsplash with circuit breaker
    const config = await this.loadConfig();
    if (config?.accessKey) {
      try {
        const url = await this.fetchFromUnsplash(mealName, cuisine, config.accessKey);
        if (url) {
          cache[mealName] = {
            url,
            fetchedAt: new Date().toISOString(),
            source: 'unsplash'
          };
          await this.saveCache(cache);
          return url;
        }
      } catch (error) {
        logger.warn(`Unsplash fetch failed for ${mealName}`, { 
          error: error.message,
          circuitState: circuits.unsplash.state
        });
        // Continue to fallback - don't throw
      }
    }

    // Fallback to default
    return this.getDefaultImage(mealName, cuisine);
  }

  async fetchFromUnsplash(mealName, cuisine, accessKey) {
    return circuits.unsplash.execute(async () => {
      return withRetry(async () => {
        const query = cuisine ? `${cuisine} food ${mealName}` : `food ${mealName}`;
        const encodedQuery = encodeURIComponent(query);
        const url = `https://api.unsplash.com/search/photos?query=${encodedQuery}&per_page=1&orientation=landscape`;
        
        return new Promise((resolve, reject) => {
          const req = https.get(url, {
            headers: {
              'Authorization': `Client-ID ${accessKey}`,
              'Accept-Version': 'v1'
            },
            timeout: CONFIG.TIMEOUT.UNSPLASH
          }, (res) => {
            // Handle rate limiting
            if (res.statusCode === 429) {
              const retryAfter = res.headers['retry-after'] || 60;
              reject({ 
                status: 429, 
                message: `Rate limited. Retry after ${retryAfter}s`,
                retryAfter: parseInt(retryAfter) * 1000
              });
              return;
            }

            if (res.statusCode !== 200) {
              reject({ status: res.statusCode, message: `HTTP ${res.statusCode}` });
              return;
            }

            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
              try {
                const json = JSON.parse(data);
                if (json.results && json.results.length > 0) {
                  resolve(json.results[0].urls.regular);
                } else {
                  resolve(null);
                }
              } catch (e) {
                reject(e);
              }
            });
          });
          
          req.on('error', reject);
          req.on('timeout', () => {
            req.destroy();
            reject(new Error('Request timeout'));
          });
        });
      }, {
        maxRetries: CONFIG.RETRY.UNSPLASH_MAX_RETRIES,
        context: { operation: 'fetchFromUnsplash', mealName },
        onRetry: ({ attempt, delay, error }) => {
          if (error.status === 429) {
            logger.warn(`Unsplash rate limited, backing off`, { attempt, delay });
          } else {
            logger.debug(`Unsplash retry ${attempt}`, { delay });
          }
        }
      });
    });
  }

  getDefaultImage(mealName, cuisine) {
    const nameLower = mealName.toLowerCase();
    const cuisineLower = (cuisine || '').toLowerCase();
    
    // Check cuisine first
    if (cuisineLower && this.defaultImages[cuisineLower]) {
      return this.defaultImages[cuisineLower];
    }
    
    // Check meal name keywords
    for (const [key, url] of Object.entries(this.defaultImages)) {
      if (nameLower.includes(key)) return url;
    }
    
    return this.defaultImages.default;
  }

  isExpired(cached) {
    const fetched = new Date(cached.fetchedAt).getTime();
    return (Date.now() - fetched) > (7 * 24 * 60 * 60 * 1000); // 7 days
  }

  async getImagesForPlan(meals, recipes) {
    const images = {};
    
    // Load cache once and reuse for all meals to avoid repeated
    // disk reads when resolving images for a single plan.
    const cache = await this.loadCache();
    
    for (const meal of meals) {
      const recipe = recipes[meal.name];
      images[meal.name] = await this.getMealImage(meal.name, recipe?.cuisine, cache);
    }
    
    return images;
  }
}

// ============================================================================
// SMS SERVICE WITH CIRCUIT BREAKER
// ============================================================================

class SmsService {
  constructor() {
    this.config = null;
  }

  async loadConfig() {
    if (this.config) return this.config;
    this.config = await loadTwilioConfig();
    return this.config;
  }

  async sendSms(to, message) {
    const config = await this.loadConfig();
    if (!config) {
      logger.warn('Twilio config not found, skipping SMS');
      return { success: false, error: 'Config not found', skipped: true };
    }

    return circuits.twilio.execute(async () => {
      return withRetry(async () => {
        const payload = new URLSearchParams({
          To: to,
          From: config.fromNumber,
          Body: message
        });

        const auth = Buffer.from(`${config.accountSid}:${config.authToken}`).toString('base64');

        return new Promise((resolve, reject) => {
          const req = https.request({
            hostname: 'api.twilio.com',
            port: 443,
            path: `/2010-04-01/Accounts/${config.accountSid}/Messages.json`,
            method: 'POST',
            headers: {
              'Authorization': `Basic ${auth}`,
              'Content-Type': 'application/x-www-form-urlencoded',
              'Content-Length': payload.toString().length
            },
            timeout: CONFIG.TIMEOUT.HTTP
          }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
              try {
                const json = JSON.parse(data);
                if (json.sid) {
                  resolve({ success: true, sid: json.sid });
                } else {
                  reject(new Error(json.message || 'Unknown Twilio error'));
                }
              } catch (e) {
                reject(e);
              }
            });
          });

          req.on('error', reject);
          req.on('timeout', () => {
            req.destroy();
            reject(new Error('Twilio request timeout'));
          });
          
          req.write(payload.toString());
          req.end();
        });
      }, {
        maxRetries: CONFIG.RETRY.TWILIO_MAX_RETRIES,
        context: { operation: 'sendSms', to },
        onRetry: ({ attempt, delay }) => {
          logger.warn(`Twilio retry ${attempt}/${CONFIG.RETRY.TWILIO_MAX_RETRIES}`, { delay });
        }
      });
    });
  }

  async sendReminder(plan, hoursElapsed) {
    const meals = plan.meals.slice(0, 3).map(m => `• ${m.day}: ${m.name}`).join('\n');
    const moreText = plan.meals.length > 3 ? `\n...and ${plan.meals.length - 3} more` : '';
    
    const message = `🍽️ Dinner Plan Reminder\n\n${meals}${moreText}\n\nReply:\n"Yes" to confirm\n"Swap Monday to [meal]" to change\n"Remove Tuesday" to skip`;

    return this.sendSms(CONFIG.EMAIL.toPhone, message);
  }
}

// ============================================================================
// STATUS TRACKER
// ============================================================================

class StatusTracker {
  constructor() {
    this.dbFile = CONFIG.TRACKING_DB_FILE;
  }

  async loadDb() {
    try {
      const data = await fs.readFile(this.dbFile, 'utf8');
      return JSON.parse(data);
    } catch {
      return { sessions: {}, current: null };
    }
  }

  async saveDb(db) {
    await fs.writeFile(this.dbFile, JSON.stringify(db, null, 2));
  }

  async startSession(planData) {
    const db = await this.loadDb();
    const sessionId = `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const session = {
      id: sessionId,
      weekOf: planData.weekOf || new Date().toISOString(),
      createdAt: new Date().toISOString(),
      status: 'sent',
      timeline: [{ status: 'sent', timestamp: new Date().toISOString() }],
      meals: planData.meals?.map(m => ({
        day: m.day,
        name: m.name,
        status: 'pending'
      })) || [],
      openedAt: null,
      repliedAt: null,
      confirmedAt: null,
      smsSent: false,
      smsSentAt: null
    };
    
    db.sessions[sessionId] = session;
    db.current = sessionId;
    await this.saveDb(db);
    
    logger.success(`Started tracking session: ${sessionId}`);
    return session;
  }

  async shouldSendSms() {
    const session = await this.getCurrentSession();
    if (!session) return false;
    if (session.status !== 'sent' && session.status !== 'opened') return false;
    if (session.smsSent) return false;
    
    const elapsed = Date.now() - new Date(session.createdAt).getTime();
    return elapsed >= CONFIG.EMAIL.fallbackDelayMs;
  }

  async getCurrentSession() {
    const db = await this.loadDb();
    if (!db.current) return null;
    return db.sessions[db.current] || null;
  }

  async recordSmsSent(sessionId) {
    const db = await this.loadDb();
    const session = db.sessions[sessionId];
    if (!session) return false;
    
    session.smsSent = true;
    session.smsSentAt = new Date().toISOString();
    session.timeline.push({ status: 'sms_sent', timestamp: session.smsSentAt });
    
    await this.saveDb(db);
    return true;
  }
}

// ============================================================================
// EMAIL TEMPLATE ENGINE (Simplified from v2)
// ============================================================================

class EmailTemplateEngine {
  renderDinnerPlanEmail(data) {
    const { plan, images, trackingId, weekOf } = data;
    
    let mealsHtml = '';
    for (const meal of plan.meals) {
      const imageUrl = images[meal.name] || this.getDefaultImage();
      mealsHtml += this.renderMealCard(meal, imageUrl);
    }

    return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Weekly Dinner Plan</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
        .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #d81e05, #ff6b35); padding: 30px; text-align: center; color: white; }
        .header h1 { margin: 0; font-size: 28px; }
        .content { padding: 30px; }
        .meal-card { background: #f8f9fa; border-radius: 12px; margin: 20px 0; overflow: hidden; }
        .meal-image { width: 100%; height: 200px; object-fit: cover; }
        .meal-content { padding: 20px; }
        .meal-day { color: #d81e05; font-size: 12px; font-weight: bold; text-transform: uppercase; }
        .meal-name { font-size: 22px; font-weight: bold; margin: 5px 0; }
        .footer { background: #212529; color: #adb5bd; padding: 20px; text-align: center; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🍽️ Weekly Dinner Plan</h1>
          <p>Week of ${weekOf}</p>
        </div>
        <div class="content">
          <h2>This Week's Menu</h2>
          ${mealsHtml}
          <p style="text-align: center; color: #6c757d; margin-top: 30px;">
            Reply to confirm or make changes!
          </p>
        </div>
        <div class="footer">
          <div>Marvin Maverick - Alex's Assistant</div>
        </div>
      </div>
    </body>
    </html>`;
  }

  renderMealCard(meal, imageUrl) {
    return `
    <div class="meal-card">
      <img src="${imageUrl}" alt="${meal.name}" class="meal-image" onerror="this.style.display='none'">
      <div class="meal-content">
        <div class="meal-day">${meal.day}</div>
        <div class="meal-name">${meal.name}</div>
        <div>⏱️ ${meal.prepTime} | 💰 $${meal.estimatedCost} | ⚡ ${meal.difficulty}</div>
      </div>
    </div>`;
  }

  getDefaultImage() {
    return 'https://images.unsplash.com/photo-1495521821757-a1efb6729352?w=600&h=400&fit=crop';
  }
}

// ============================================================================
// DATA LOADING
// ============================================================================

async function loadWeeklyPlan() {
  try {
    const data = await fs.readFile(CONFIG.WEEKLY_PLAN_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    logger.error('Failed to load weekly plan', { error: error.message });
    return null;
  }
}

async function loadRecipeDatabase() {
  try {
    const data = await fs.readFile(CONFIG.RECIPE_DATABASE_FILE, 'utf8');
    const db = JSON.parse(data);
    return db.recipes || {};
  } catch (error) {
    logger.warn('Failed to load recipe database', { error: error.message });
    return {};
  }
}

// ============================================================================
// MAIN FUNCTIONS
// ============================================================================

async function sendDinnerPlanEmail() {
  logger.info('Sending dinner plan confirmation email...');
  
  const config = await loadSmtpConfig();
  if (!config) {
    logger.error('SMTP configuration not found');
    return { success: false, error: 'SMTP config missing' };
  }
  
  const plan = await loadWeeklyPlan();
  if (!plan) {
    logger.error('No weekly plan available');
    return { success: false, error: 'No plan available' };
  }
  
  // Start tracking
  const tracker = new StatusTracker();
  const session = await tracker.startSession(plan);
  
  // Fetch images (with graceful fallback)
  logger.info('Fetching meal images...');
  const imageService = new ImageService();
  const recipes = await loadRecipeDatabase();
  let mealImages;
  
  try {
    mealImages = await imageService.getImagesForPlan(plan.meals, recipes);
    logger.success(`Fetched images for ${Object.keys(mealImages).length} meals`);
  } catch (error) {
    logger.warn('Image fetch failed, using defaults', { error: error.message });
    mealImages = {};
    for (const meal of plan.meals) {
      mealImages[meal.name] = imageService.getDefaultImage(meal.name, recipes[meal.name]?.cuisine);
    }
  }
  
  // Build email
  const templates = new EmailTemplateEngine();
  const weekOf = new Date(plan.weekOf).toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric'
  });
  
  const htmlContent = templates.renderDinnerPlanEmail({
    plan,
    images: mealImages,
    trackingId: session.id,
    weekOf
  });
  
  const subject = `${CONFIG.EMAIL.subjectPrefix}: Week of ${weekOf}`;
  
  // Send email with circuit breaker and retry
  logger.info('Sending via iCloud SMTP...');
  
  try {
    const result = await sendEmailViaSmtp(CONFIG.EMAIL.to, subject, htmlContent, config, session.id);
    
    if (result.success) {
      logger.success('Dinner plan email sent successfully!', {
        to: CONFIG.EMAIL.to,
        subject,
        sessionId: session.id
      });
      
      // Save preview
      const previewFile = path.join(CONFIG.DATA_DIR, 'pending-dinner-email-v3.html');
      await fs.writeFile(previewFile, htmlContent);
      
      return { success: true, sessionId: session.id };
    }
  } catch (error) {
    logger.error('Failed to send email', { 
      error: error.message,
      circuitState: circuits.smtp.state
    });
    return { success: false, error: error.message };
  }
}

async function sendSmsFallback() {
  logger.info('Sending SMS fallback...');
  
  const tracker = new StatusTracker();
  const session = await tracker.getCurrentSession();
  
  if (!session) {
    logger.warn('No active session');
    return { success: false, error: 'No active session' };
  }
  
  if (session.smsSent) {
    logger.info('SMS already sent for this session');
    return { success: false, alreadySent: true };
  }
  
  const plan = await loadWeeklyPlan();
  if (!plan) {
    logger.error('No plan available');
    return { success: false, error: 'No plan available' };
  }
  
  const hoursElapsed = Math.floor(
    (Date.now() - new Date(session.createdAt).getTime()) / (1000 * 60 * 60)
  );
  
  const smsService = new SmsService();
  
  try {
    const result = await smsService.sendReminder(plan, hoursElapsed);
    
    if (result.success) {
      await tracker.recordSmsSent(session.id);
      logger.success('SMS sent successfully!', { sid: result.sid });
      return { success: true, sid: result.sid };
    } else if (result.skipped) {
      logger.warn('SMS skipped - no config');
      return { success: false, skipped: true };
    } else {
      logger.error('SMS failed', { error: result.error });
      return { success: false, error: result.error };
    }
  } catch (error) {
    logger.error('SMS error', { 
      error: error.message,
      circuitState: circuits.twilio.state
    });
    return { success: false, error: error.message };
  }
}

async function showStatus() {
  const tracker = new StatusTracker();
  const session = await tracker.getCurrentSession();
  
  if (!session) {
    console.log('\n📊 No active dinner plan session\n');
    return;
  }
  
  const hoursElapsed = Math.floor(
    (Date.now() - new Date(session.createdAt).getTime()) / (1000 * 60 * 60)
  );
  
  console.log('\n📊 Dinner Plan Tracking Status');
  console.log('═══════════════════════════════════════');
  console.log(`Status:        ${session.status.toUpperCase()}`);
  console.log(`Session ID:    ${session.id}`);
  console.log(`Week of:       ${new Date(session.weekOf).toLocaleDateString()}`);
  console.log(`Hours elapsed: ${hoursElapsed}`);
  console.log('───────────────────────────────────────');
  console.log(`📧 Email opened:   ${session.openedAt ? '✅' : '⏳'}`);
  console.log(`💬 Reply received: ${session.repliedAt ? '✅' : '⏳'}`);
  console.log(`✅ Confirmed:      ${session.confirmedAt ? '✅' : '⏳'}`);
  console.log(`📱 SMS sent:       ${session.smsSent ? '✅' : '⏳'}`);
  console.log('═══════════════════════════════════════\n');
  
  // Show circuit breaker stats
  console.log('Circuit Breaker Status:');
  Object.entries(circuits).forEach(([name, cb]) => {
    const stats = cb.getStats();
    console.log(`  ${name}: ${stats.state} (${stats.totalCalls} calls, ${stats.totalFailures} failures)`);
  });
  console.log('');
}

// ============================================================================
// CLI
// ============================================================================

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  
  try {
    switch (command) {
      case '--send-test':
        const result = await sendDinnerPlanEmail();
        process.exit(result.success ? 0 : 1);
        
      case '--send-sms':
        const smsResult = await sendSmsFallback();
        process.exit(smsResult.success ? 0 : 1);
        
      case '--status':
        await showStatus();
        process.exit(0);
        
      default:
        console.log(`
Dinner Plan Email System v3.0

Usage:
  --send-test    Send dinner plan email
  --send-sms     Send SMS fallback manually
  --status       Show tracking status

Features:
  • Circuit breaker protection for all APIs
  • Exponential backoff retry logic
  • Graceful degradation when services fail
  • Structured error logging
        `);
        process.exit(0);
    }
  } catch (error) {
    logger.error('Fatal error', { error: error.message, stack: error.stack });
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  sendDinnerPlanEmail,
  sendSmsFallback,
  showStatus,
  CircuitBreaker,
  ImageService,
  SmsService,
  StructuredLogger
};
