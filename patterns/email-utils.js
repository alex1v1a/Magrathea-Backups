/**
 * Optimized Email Utilities
 * Connection pooling, batch operations, and retry logic
 */

const imaps = require('imap-simple');
const { getIMAPConfig, getSMTPConfig } = require('../patterns/credentials');

// Optional nodemailer for SMTP
let nodemailer;
try {
  nodemailer = require('nodemailer');
} catch (e) {
  // nodemailer not installed
}
const { withRetry, isTransientError } = require('../patterns/retry-utils');
const { logger } = require('../patterns/logger');

/**
 * Connection pool for IMAP connections
 */
class IMAPConnectionPool {
  constructor(options = {}) {
    this.maxConnections = options.maxConnections || 3;
    this.connections = [];
    this.available = [];
    this.waiting = [];
  }
  
  async getConnection() {
    // Return available connection
    if (this.available.length > 0) {
      return this.available.pop();
    }
    
    // Create new connection if under limit
    if (this.connections.length < this.maxConnections) {
      const conn = await this._createConnection();
      this.connections.push(conn);
      return conn;
    }
    
    // Wait for connection
    return new Promise((resolve) => {
      this.waiting.push(resolve);
    });
  }
  
  async _createConnection() {
    const config = getIMAPConfig();
    return withRetry(async () => {
      const connection = await imaps.connect(config);
      await connection.openBox('INBOX');
      return connection;
    }, {
      maxRetries: 3,
      shouldRetry: isTransientError
    });
  }
  
  releaseConnection(connection) {
    if (this.waiting.length > 0) {
      const resolve = this.waiting.shift();
      resolve(connection);
    } else {
      this.available.push(connection);
    }
  }
  
  async closeAll() {
    for (const conn of this.connections) {
      try {
        await conn.end();
      } catch (e) {
        // Ignore
      }
    }
    this.connections = [];
    this.available = [];
  }
}

/**
 * Search for emails with multiple criteria
 */
async function searchEmails(criteria, options = {}) {
  const { 
    markSeen = false, 
    since = null,
    from = null,
    subject = null
  } = options;
  
  const config = getIMAPConfig();
  
  return withRetry(async () => {
    const connection = await imaps.connect(config);
    await connection.openBox('INBOX');
    
    try {
      const searchCriteria = [];
      
      if (markSeen === false) {
        searchCriteria.push('UNSEEN');
      }
      
      if (since) {
        searchCriteria.push(['SINCE', since]);
      }
      
      if (from) {
        searchCriteria.push(['FROM', from]);
      }
      
      if (subject) {
        searchCriteria.push(['SUBJECT', subject]);
      }
      
      // Add user criteria
      if (Array.isArray(criteria)) {
        searchCriteria.push(...criteria);
      }
      
      const fetchOptions = {
        bodies: ['HEADER', 'TEXT'],
        markSeen: false
      };
      
      const messages = await connection.search(searchCriteria, fetchOptions);
      
      // Parse messages
      const parsed = messages.map(msg => {
        const header = msg.parts.find(p => p.which === 'HEADER')?.body;
        const text = msg.parts.find(p => p.which === 'TEXT')?.body;
        
        return {
          uid: msg.attributes?.uid,
          subject: header?.subject?.[0],
          from: header?.from?.[0],
          date: header?.date?.[0],
          body: text,
          headers: header
        };
      });
      
      return parsed;
    } finally {
      await connection.end();
    }
  }, {
    maxRetries: 3,
    shouldRetry: isTransientError
  });
}

/**
 * Extract verification codes from emails
 */
async function findVerificationCode(options = {}) {
  const {
    from = null,
    pattern = /\b\d{6}\b/,
    since = new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
    subjectPattern = null
  } = options;
  
  const searchSince = since.toISOString().split('T')[0];
  
  const messages = await searchEmails([], {
    from,
    since: searchSince
  });
  
  // Sort by date (newest first)
  messages.sort((a, b) => new Date(b.date) - new Date(a.date));
  
  for (const msg of messages) {
    // Check subject pattern if provided
    if (subjectPattern && !subjectPattern.test(msg.subject)) {
      continue;
    }
    
    // Search in body
    const text = msg.body || '';
    const match = text.match(pattern);
    
    if (match) {
      logger.info(`Found verification code in email from ${msg.from}`);
      return {
        code: match[0],
        email: msg
      };
    }
  }
  
  return null;
}

/**
 * Send email with retry
 */
async function sendEmail(options) {
  if (!nodemailer) {
    throw new Error('nodemailer not installed. Run: npm install nodemailer');
  }
  
  const {
    to,
    subject,
    body,
    html = null,
    attachments = [],
    from = null
  } = options;
  
  const config = getSMTPConfig();
  
  return withRetry(async () => {
    const transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: false, // STARTTLS
      auth: {
        user: config.username,
        pass: config.password
      }
    });
    
    const mailOptions = {
      from: from || config.username,
      to,
      subject,
      text: html ? undefined : body,
      html: html || undefined,
      attachments: attachments.map(att => ({
        filename: att.filename,
        content: att.content,
        path: att.path
      }))
    };
    
    const result = await transporter.sendMail(mailOptions);
    logger.info(`Email sent to ${to}: ${result.messageId}`);
    return result;
  }, {
    maxRetries: 3,
    shouldRetry: isTransientError
  });
}

/**
 * HEB-specific verification code finder
 */
async function getHEBVerificationCode() {
  logger.info('Searching for HEB verification code...');
  
  const result = await findVerificationCode({
    from: 'noreply@heb.com',
    subjectPattern: /verification/i,
    since: new Date(Date.now() - 10 * 60 * 1000) // Last 10 minutes
  });
  
  if (result) {
    logger.success(`Found HEB verification code: ${result.code}`);
    return result.code;
  }
  
  logger.warn('No HEB verification code found');
  return null;
}

module.exports = {
  IMAPConnectionPool,
  searchEmails,
  findVerificationCode,
  sendEmail,
  getHEBVerificationCode
};
