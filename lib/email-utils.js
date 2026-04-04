/**
 * @fileoverview Unified email utilities for sending and receiving emails.
 * Consolidates functionality from send-email.js, email-client.js, and send_email_secure.py
 * @module lib/email-utils
 */

const nodemailer = require('nodemailer');
const { simpleParser } = require('mailparser');
const fs = require('fs').promises;
const path = require('path');
const { MarvinError, NetworkError, ConfigError } = require('./errors');
const { retryWithBackoff } = require('./retry-manager');
const { formatDate } = require('./date-utils');

// Default configuration
const DEFAULT_CONFIG = {
  smtp: {
    host: 'smtp.mail.me.com',
    port: 587,
    secure: false, // STARTTLS
    tls: {
      rejectUnauthorized: true,
      minVersion: 'TLSv1.2'
    },
    pool: true,
    maxConnections: 1,
    maxMessages: 5,
    rateDelta: 1000,
    rateLimit: 2
  },
  imap: {
    host: 'imap.mail.me.com',
    port: 993,
    secure: true
  },
  defaults: {
    from: 'MarvinMartian9@icloud.com',
    fromName: 'Marvin'
  }
};

/**
 * Create an SMTP transporter with the given credentials.
 * 
 * @param {Object} credentials - Email credentials
 * @param {string} credentials.user - Email address
 * @param {string} credentials.pass - App-specific password
 * @param {Object} [options={}] - Additional SMTP options
 * @returns {Object} Nodemailer transporter
 * 
 * @example
 * const transporter = createTransporter({
 *   user: 'MarvinMartian9@icloud.com',
 *   pass: process.env.ICLOUD_APP_PASSWORD
 * });
 */
function createTransporter(credentials, options = {}) {
  if (!credentials?.user || !credentials?.pass) {
    throw new ConfigError(
      'Email credentials required (user and pass)',
      'EMAIL_CREDENTIALS_MISSING'
    );
  }

  const config = {
    ...DEFAULT_CONFIG.smtp,
    ...options,
    auth: {
      user: credentials.user,
      pass: credentials.pass
    }
  };

  return nodemailer.createTransport(config);
}

/**
 * Send an email with retry logic.
 * 
 * @param {Object} options - Email options
 * @param {string} options.to - Recipient email address
 * @param {string} options.subject - Email subject
 * @param {string} [options.text] - Plain text body
 * @param {string} [options.html] - HTML body
 * @param {Array} [options.attachments] - Array of attachment objects
 * @param {Object} options.credentials - SMTP credentials
 * @param {Object} [options.retryOptions] - Retry configuration
 * @returns {Promise<Object>} Send result with messageId
 * @throws {NetworkError} If sending fails after retries
 * 
 * @example
 * await sendEmail({
 *   to: 'alex@1v1a.com',
 *   subject: 'Test',
 *   text: 'Hello world',
 *   html: '<p>Hello world</p>',
 *   credentials: { user: '...', pass: '...' }
 * });
 */
async function sendEmail(options) {
  const {
    to,
    subject,
    text,
    html,
    attachments = [],
    credentials,
    retryOptions = { maxAttempts: 3, baseDelay: 1000 }
  } = options;

  // Validate required fields
  if (!to || !subject) {
    throw new ConfigError(
      'Email requires recipient (to) and subject',
      'EMAIL_VALIDATION_FAILED'
    );
  }

  if (!text && !html) {
    throw new ConfigError(
      'Email requires text or html body',
      'EMAIL_VALIDATION_FAILED'
    );
  }

  const transporter = createTransporter(credentials);

  const mailOptions = {
    from: `"${DEFAULT_CONFIG.defaults.fromName}" <${credentials.user || DEFAULT_CONFIG.defaults.from}>`,
    to,
    subject,
    text,
    html,
    attachments: attachments.map(att => ({
      filename: att.filename || path.basename(att.path),
      path: att.path,
      content: att.content,
      contentType: att.contentType
    }))
  };

  try {
    const result = await retryWithBackoff(
      () => transporter.sendMail(mailOptions),
      retryOptions
    );

    return {
      success: true,
      messageId: result.messageId,
      accepted: result.accepted,
      rejected: result.rejected,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    throw new NetworkError(
      `Failed to send email to ${to}`,
      'EMAIL_SEND_FAILED',
      { cause: error, retryable: true, metadata: { to, subject } }
    );
  } finally {
    transporter.close();
  }
}

/**
 * Send a batch of emails with rate limiting.
 * 
 * @param {Array} emails - Array of email options
 * @param {Object} credentials - SMTP credentials
 * @param {Object} [options={}] - Options
 * @param {number} [options.concurrency=1] - Max concurrent sends
 * @param {number} [options.delayMs=1000] - Delay between sends
 * @returns {Promise<Array>} Array of send results
 * 
 * @example
 * const results = await sendEmailBatch([
 *   { to: 'a@example.com', subject: 'A', text: 'Hello A' },
 *   { to: 'b@example.com', subject: 'B', text: 'Hello B' }
 * ], credentials);
 */
async function sendEmailBatch(emails, credentials, options = {}) {
  const { concurrency = 1, delayMs = 1000 } = options;
  const results = [];

  // Process in chunks for concurrency control
  for (let i = 0; i < emails.length; i += concurrency) {
    const chunk = emails.slice(i, i + concurrency);
    
    const chunkResults = await Promise.allSettled(
      chunk.map(email => sendEmail({ ...email, credentials }))
    );

    results.push(...chunkResults.map((result, idx) => ({
      email: chunk[idx].to,
      success: result.status === 'fulfilled',
      result: result.status === 'fulfilled' ? result.value : null,
      error: result.status === 'rejected' ? result.reason?.message : null
    })));

    // Delay between chunks
    if (i + concurrency < emails.length) {
      await new Promise(r => setTimeout(r, delayMs));
    }
  }

  return results;
}

/**
 * Send an email with a template.
 * 
 * @param {string} templateName - Template name
 * @param {Object} data - Template data
 * @param {Object} options - Email options
 * @returns {Promise<Object>} Send result
 * 
 * @example
 * await sendTemplateEmail('dinner-plan', {
 *   day: 'Monday',
 *   meal: 'Chicken Curry'
 * }, { to: 'alex@1v1a.com', credentials });
 */
async function sendTemplateEmail(templateName, data, options) {
  const templates = {
    'dinner-plan': (d) => ({
      subject: `Dinner Plan: ${d.day}`,
      text: `Tonight's dinner: ${d.meal}\n\nIngredients:\n${d.ingredients?.join('\n') || 'N/A'}`,
      html: `<h2>Dinner Plan: ${d.day}</h2>
        <p><strong>Tonight's dinner:</strong> ${d.meal}</p>
        <h3>Ingredients:</h3>
        <ul>${d.ingredients?.map(i => `<li>${i}</li>`).join('') || '<li>N/A</li>'}</ul>`
    }),
    'shopping-list': (d) => ({
      subject: 'Shopping List',
      text: `Shopping List:\n\n${d.items?.join('\n') || 'No items'}`,
      html: `<h2>Shopping List</h2>
        <ul>${d.items?.map(i => `<li>${i}</li>`).join('') || '<li>No items</li>'}</ul>`
    }),
    'notification': (d) => ({
      subject: d.title || 'Notification',
      text: d.message,
      html: `<h2>${d.title || 'Notification'}</h2><p>${d.message}</p>`
    })
  };

  const template = templates[templateName];
  if (!template) {
    throw new ConfigError(
      `Unknown email template: ${templateName}`,
      'EMAIL_TEMPLATE_NOT_FOUND',
      { metadata: { availableTemplates: Object.keys(templates) } }
    );
  }

  const { subject, text, html } = template(data);
  return sendEmail({ ...options, subject, text, html });
}

/**
 * Record sent email for tracking.
 * 
 * @param {Object} record - Email record
 * @param {string} recordFile - Path to record file
 * @returns {Promise<void>}
 */
async function recordSentEmail(record, recordFile) {
  let records = [];
  
  try {
    const data = await fs.readFile(recordFile, 'utf8');
    records = JSON.parse(data);
  } catch {
    // File doesn't exist yet
  }

  records.push({
    ...record,
    recordedAt: new Date().toISOString()
  });

  // Keep only last 1000 records
  if (records.length > 1000) {
    records = records.slice(-1000);
  }

  await fs.writeFile(recordFile, JSON.stringify(records, null, 2));
}

/**
 * Get email sending statistics.
 * 
 * @param {string} recordFile - Path to record file
 * @param {Object} [options={}] - Options
 * @param {number} [options.days=7] - Days to look back
 * @returns {Promise<Object>} Statistics
 */
async function getEmailStats(recordFile, options = {}) {
  const { days = 7 } = options;
  
  let records = [];
  try {
    const data = await fs.readFile(recordFile, 'utf8');
    records = JSON.parse(data);
  } catch {
    return { total: 0, byDay: {}, byRecipient: {} };
  }

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);

  const recent = records.filter(r => new Date(r.timestamp) >= cutoff);

  const stats = {
    total: recent.length,
    byDay: {},
    byRecipient: {},
    successRate: 0
  };

  let successCount = 0;

  for (const record of recent) {
    const day = formatDate(record.timestamp, 'SHORT');
    stats.byDay[day] = (stats.byDay[day] || 0) + 1;

    const recipient = record.to || 'unknown';
    stats.byRecipient[recipient] = (stats.byRecipient[recipient] || 0) + 1;

    if (record.success) successCount++;
  }

  stats.successRate = recent.length > 0 
    ? Math.round((successCount / recent.length) * 100) 
    : 0;

  return stats;
}

/**
 * Parse email content using mailparser.
 * 
 * @param {Buffer|string} source - Raw email content
 * @returns {Promise<Object>} Parsed email
 */
async function parseEmail(source) {
  try {
    const parsed = await simpleParser(source);
    return {
      subject: parsed.subject,
      from: parsed.from?.text,
      to: parsed.to?.text,
      date: parsed.date,
      text: parsed.text,
      html: parsed.html,
      attachments: parsed.attachments?.map(att => ({
        filename: att.filename,
        contentType: att.contentType,
        size: att.size
      }))
    };
  } catch (error) {
    throw new MarvinError(
      'Failed to parse email',
      'EMAIL_PARSE_ERROR',
      { cause: error }
    );
  }
}

module.exports = {
  createTransporter,
  sendEmail,
  sendEmailBatch,
  sendTemplateEmail,
  recordSentEmail,
  getEmailStats,
  parseEmail,
  DEFAULT_CONFIG
};
