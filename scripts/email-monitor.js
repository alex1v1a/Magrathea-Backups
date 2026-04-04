#!/usr/bin/env node
/**
 * Email Monitor
 * Checks multiple email accounts via IMAP for important emails
 * Runs every 15 minutes via cron/scheduled task
 * 
 * Usage:
 *   node scripts/email-monitor.js           # Check emails
 *   node scripts/email-monitor.js --test    # Send test notification
 *   node scripts/email-monitor.js --init    # Initialize state file
 */

const Imap = require('imap');
const { simpleParser } = require('mailparser');
const fs = require('fs').promises;
const path = require('path');
const { notifyImportantEmails } = require('./email-notifier.js');
const { loadConfig } = require('./email-config.js');

// Configuration
const WORKSPACE_DIR = path.join(__dirname, '..');
const DATA_DIR = path.join(WORKSPACE_DIR, 'marvin-dash', 'data');
const STATE_FILE = path.join(DATA_DIR, 'email-monitor-state.json');

// Email account configurations - will be loaded from config
let EMAIL_ACCOUNTS = [];

async function loadEmailAccounts() {
  const config = await loadConfig();
  
  EMAIL_ACCOUNTS = [
    {
      name: 'iCloud Primary',
      user: config.icloud.email,
      password: config.icloud.password,
      host: 'imap.mail.me.com',
      port: 993,
      tls: true,
      tlsOptions: { rejectUnauthorized: false }
    },
    {
      name: 'Gmail Secondary',
      user: config.gmail.email,
      password: config.gmail.password,
      host: 'imap.gmail.com',
      port: 993,
      tls: true,
      tlsOptions: { rejectUnauthorized: false }
    }
    // Note: alex@1v1a.com would require credentials - add if available
  ];
  
  // Update priority keywords and senders from config
  if (config.keywords) {
    PRIORITY_KEYWORDS.length = 0;
    PRIORITY_KEYWORDS.push(...config.keywords);
  }
  if (config.prioritySenders) {
    PRIORITY_SENDERS.length = 0;
    PRIORITY_SENDERS.push(...config.prioritySenders);
  }
}

// Priority keywords to look for in subject/body
const PRIORITY_KEYWORDS = [
  'urgent', 'action required', 'asap', 'important', 'priority',
  'deadline', 'expires', 'payment due', 'bill due', 'overdue',
  'security alert', 'suspicious activity', 'verification',
  'appointment', 'meeting', 'scheduled', 'confirmed',
  'delivery', 'shipped', 'tracking', 'order',
  'password', 'login', 'account', 'verify'
];

// Priority senders (from address patterns)
const PRIORITY_SENDERS = [
  'alex@1v1a.com',
  'sferrazzaa96@gmail.com',
  'noreply@apple.com',
  'noreply@icloud.com',
  'google.com',
  'amazon.com',
  'bank', 'credit', 'finance', 'paypal'
];

// Spam/promotional patterns to exclude
const SPAM_PATTERNS = [
  'unsubscribe', 'promotional', 'marketing', 'newsletter',
  'no-reply@marketing', 'noreply@promo', 'offers@'
];

// State tracking
let monitorState = {
  lastCheck: null,
  lastNotifiedUids: {}, // account -> { uid: timestamp }
  totalChecks: 0,
  totalImportantFound: 0,
  errors: []
};

// ANSI colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  const timestamp = new Date().toISOString();
  console.log(`${colors[color]}[${timestamp}] ${message}${colors.reset}`);
}

async function loadState() {
  try {
    const data = await fs.readFile(STATE_FILE, 'utf8');
    monitorState = JSON.parse(data);
  } catch {
    // State file doesn't exist yet
    monitorState = {
      lastCheck: null,
      lastNotifiedUids: {},
      totalChecks: 0,
      totalImportantFound: 0,
      errors: []
    };
  }
}

async function saveState() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(STATE_FILE, JSON.stringify(monitorState, null, 2));
  } catch (err) {
    log(`Failed to save state: ${err.message}`, 'red');
  }
}

function isImportantEmail(email) {
  const subject = (email.subject || '').toLowerCase();
  const from = (email.from?.address || '').toLowerCase();
  const fromName = (email.from?.name || '').toLowerCase();
  const text = (email.text || '').toLowerCase();
  
  // Check for spam patterns first
  for (const pattern of SPAM_PATTERNS) {
    if (subject.includes(pattern) || from.includes(pattern)) {
      return false;
    }
  }
  
  // Check priority keywords in subject
  for (const keyword of PRIORITY_KEYWORDS) {
    if (subject.includes(keyword)) {
      return true;
    }
  }
  
  // Check priority senders
  for (const sender of PRIORITY_SENDERS) {
    if (from.includes(sender.toLowerCase()) || fromName.includes(sender.toLowerCase())) {
      return true;
    }
  }
  
  // Check for keywords in body (first 500 chars)
  const bodyPreview = text.substring(0, 500);
  for (const keyword of ['urgent', 'action required', 'asap', 'security alert']) {
    if (bodyPreview.includes(keyword)) {
      return true;
    }
  }
  
  return false;
}

function checkAccount(account) {
  return new Promise((resolve, reject) => {
    const imap = new Imap({
      user: account.user,
      password: account.password,
      host: account.host,
      port: account.port,
      tls: account.tls,
      tlsOptions: account.tlsOptions || {},
      connTimeout: 30000,
      authTimeout: 30000,
      keepalive: false
    });
    
    let connectionClosed = false;
    const importantEmails = [];
    const accountKey = account.name;
    
    // Force close helper
    function forceClose() {
      if (!connectionClosed) {
        connectionClosed = true;
        try {
          imap.destroy();
        } catch (e) {
          // Ignore
        }
      }
    }
    
    // Track notified UIDs for this account
    if (!monitorState.lastNotifiedUids[accountKey]) {
      monitorState.lastNotifiedUids[accountKey] = {};
    }
    const notifiedUids = monitorState.lastNotifiedUids[accountKey];
    
    // Set account-level timeout
    const accountTimeout = setTimeout(() => {
      log(`Account ${accountKey} timed out, forcing close`, 'yellow');
      forceClose();
      resolve({ account: accountKey, emails: importantEmails, count: importantEmails.length });
    }, 60000); // 60 seconds per account
    
    imap.once('ready', () => {
      imap.openBox('INBOX', true, (err, box) => {
        if (err) {
          imap.end();
          return reject(err);
        }
        
        // Search for unseen emails from the last 24 hours
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        
        imap.search(['UNSEEN', ['SINCE', yesterday.toDateString()]], (err, results) => {
          if (err) {
            imap.end();
            return reject(err);
          }
          
          if (!results || results.length === 0) {
            imap.end();
            return resolve({ account: accountKey, emails: [], count: 0 });
          }
          
          // Filter out already notified emails
          const newResults = results.filter(uid => !notifiedUids[uid.toString()]);
          
          if (newResults.length === 0) {
            imap.end();
            return resolve({ account: accountKey, emails: [], count: 0 });
          }
          
          log(`Found ${newResults.length} new unread email(s) in ${accountKey}`, 'cyan');
          
          const fetch = imap.fetch(newResults, { bodies: '', struct: true });
          let processedCount = 0;
          
          fetch.on('message', (msg, seqno) => {
            let uid = null;
            const chunks = [];
            
            msg.on('body', (stream) => {
              stream.on('data', chunk => chunks.push(chunk));
            });
            
            msg.once('attributes', (attrs) => {
              uid = attrs.uid;
            });
            
            msg.once('end', async () => {
              processedCount++;
              
              if (chunks.length === 0) {
                if (processedCount >= newResults.length) {
                  imap.end();
                }
                return;
              }
              
              try {
                const raw = Buffer.concat(chunks);
                const parsed = await simpleParser(raw);
                
                const email = {
                  uid: uid?.toString(),
                  from: {
                    name: parsed.from?.value[0]?.name || '',
                    address: parsed.from?.value[0]?.address || ''
                  },
                  subject: parsed.subject || '(No Subject)',
                  date: parsed.date,
                  preview: parsed.text?.substring(0, 300) || '',
                  account: accountKey
                };
                
                if (isImportantEmail(email)) {
                  importantEmails.push(email);
                  // Mark as notified
                  if (uid) {
                    notifiedUids[uid.toString()] = Date.now();
                  }
                }
                
              } catch (parseErr) {
                log(`Failed to parse email: ${parseErr.message}`, 'yellow');
              }
              
              if (processedCount >= newResults.length) {
                imap.end();
              }
            });
          });
          
          fetch.once('error', (err) => {
            log(`Fetch error: ${err.message}`, 'red');
            imap.end();
          });
          
          fetch.once('end', () => {
            // Wait for all messages to be processed
            setTimeout(() => {
              clearTimeout(accountTimeout);
              if (!connectionClosed) {
                connectionClosed = true;
                imap.end();
              }
            }, 1000);
          });
        });
      });
    });
    
    imap.once('error', (err) => {
      reject(err);
    });
    
    imap.once('end', () => {
      clearTimeout(accountTimeout);
      connectionClosed = true;
      resolve({ account: accountKey, emails: importantEmails, count: importantEmails.length });
    });
    
    imap.connect();
  });
}

async function checkAllAccounts() {
  // Set a global timeout to ensure the script doesn't hang
  const GLOBAL_TIMEOUT = 5 * 60 * 1000; // 5 minutes
  const timeoutId = setTimeout(() => {
    log('Global timeout reached, forcing exit', 'red');
    process.exit(1);
  }, GLOBAL_TIMEOUT);
  
  log('Starting email check...', 'bright');
  
  // Load configuration
  await loadEmailAccounts();
  await loadState();
  
  const allImportantEmails = [];
  const errors = [];
  
  for (const account of EMAIL_ACCOUNTS) {
    // Skip accounts without passwords
    if (!account.password) {
      log(`Skipping ${account.name}: No password configured`, 'yellow');
      continue;
    }
    
    try {
      log(`Checking ${account.name} (${account.user})...`, 'blue');
      const result = await checkAccount(account);
      
      if (result.count > 0) {
        log(`Found ${result.count} important email(s) in ${account.name}`, 'green');
        allImportantEmails.push(...result.emails);
      } else {
        log(`No important emails in ${account.name}`, 'cyan');
      }
    } catch (err) {
      const errorMsg = `${account.name}: ${err.message}`;
      log(`Error checking ${account.name}: ${err.message}`, 'red');
      errors.push(errorMsg);
    }
  }
  
  // Update state
  monitorState.lastCheck = new Date().toISOString();
  monitorState.totalChecks++;
  monitorState.totalImportantFound += allImportantEmails.length;
  
  // Keep only last 10 errors
  monitorState.errors = [...monitorState.errors, ...errors].slice(-10);
  
  await saveState();
  
  // Send notifications if important emails found
  if (allImportantEmails.length > 0) {
    log(`Sending notification for ${allImportantEmails.length} important email(s)...`, 'green');
    const result = await notifyImportantEmails(allImportantEmails);
    
    if (result.sent) {
      log(`Notification sent via ${result.method}`, 'green');
    } else {
      log(`Notification not sent: ${result.reason}`, 'yellow');
    }
  } else {
    log('No important emails to notify', 'cyan');
  }
  
  log('Email check complete', 'bright');
  
  // Clear the global timeout
  clearTimeout(timeoutId);
  
  return { 
    checked: EMAIL_ACCOUNTS.length, 
    important: allImportantEmails.length,
    errors: errors.length 
  };
}

async function initState() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  monitorState = {
    lastCheck: null,
    lastNotifiedUids: {},
    totalChecks: 0,
    totalImportantFound: 0,
    errors: []
  };
  await saveState();
  log('State file initialized', 'green');
}

async function showStatus() {
  await loadState();
  
  console.log('\n' + '='.repeat(50));
  console.log('Email Monitor Status');
  console.log('='.repeat(50));
  console.log(`Last Check: ${monitorState.lastCheck || 'Never'}`);
  console.log(`Total Checks: ${monitorState.totalChecks}`);
  console.log(`Important Emails Found: ${monitorState.totalImportantFound}`);
  console.log(`Recent Errors: ${monitorState.errors.length}`);
  
  if (monitorState.errors.length > 0) {
    console.log('\nRecent Errors:');
    monitorState.errors.slice(-5).forEach(e => console.log(`  - ${e}`));
  }
  
  console.log('='.repeat(50) + '\n');
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--test')) {
    const { sendTestNotification } = require('./email-notifier.js');
    await sendTestNotification();
    return;
  }
  
  if (args.includes('--init')) {
    await initState();
    return;
  }
  
  if (args.includes('--status')) {
    await showStatus();
    return;
  }
  
  // Default: check emails
  await checkAllAccounts();
}

main().catch(err => {
  log(`Fatal error: ${err.message}`, 'red');
  console.error(err);
  process.exit(1);
});
