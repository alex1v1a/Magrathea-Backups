/**
 * Optimized Email Monitor v2
 * 
 * Improvements over v1:
 * - Parallel account checking (faster)
 * - Circuit breaker for failing accounts
 * - Better error handling and recovery
 * - Structured logging
 * - Metrics collection
 */

const Imap = require('imap');
const { simpleParser } = require('mailparser');
const fs = require('fs').promises;
const path = require('path');
const { CircuitBreaker } = require('../../lib/utils/circuit-breaker');

// Configuration
const DATA_DIR = path.join(__dirname, '..', 'data');
const STATE_FILE = path.join(DATA_DIR, 'email-monitor-state-v2.json');

// Priority keywords
const PRIORITY_KEYWORDS = [
  'urgent', 'action required', 'asap', 'important', 'priority',
  'deadline', 'expires', 'payment due', 'bill due', 'overdue',
  'security alert', 'suspicious activity', 'verification',
  'appointment', 'meeting', 'scheduled', 'confirmed',
  'delivery', 'shipped', 'tracking', 'order',
  'password', 'login', 'account', 'verify'
];

// Priority senders
const PRIORITY_SENDERS = [
  'alex@1v1a.com',
  'sferrazzaa96@gmail.com',
  'noreply@apple.com',
  'noreply@icloud.com',
  'google.com',
  'amazon.com'
];

// Spam patterns
const SPAM_PATTERNS = [
  'unsubscribe', 'promotional', 'marketing', 'newsletter',
  'no-reply@marketing', 'noreply@promo', 'offers@'
];

class EmailMonitorV2 {
  constructor(config = {}) {
    this.accounts = config.accounts || [];
    this.state = {
      lastCheck: null,
      lastNotifiedUids: {},
      totalChecks: 0,
      totalImportantFound: 0,
      errors: []
    };
    this.circuitBreakers = new Map();
  }

  /**
   * Load state from disk
   */
  async loadState() {
    try {
      const data = await fs.readFile(STATE_FILE, 'utf8');
      this.state = JSON.parse(data);
    } catch {
      // Use default state
    }
  }

  /**
   * Save state to disk
   */
  async saveState() {
    try {
      await fs.mkdir(DATA_DIR, { recursive: true });
      await fs.writeFile(STATE_FILE, JSON.stringify(this.state, null, 2));
    } catch (err) {
      console.error('Failed to save state:', err.message);
    }
  }

  /**
   * Get or create circuit breaker for account
   */
  getCircuitBreaker(accountName) {
    if (!this.circuitBreakers.has(accountName)) {
      this.circuitBreakers.set(accountName, new CircuitBreaker({
        failureThreshold: 3,
        resetTimeout: 300000 // 5 minutes
      }));
    }
    return this.circuitBreakers.get(accountName);
  }

  /**
   * Check all accounts in parallel
   */
  async checkAllAccounts() {
    console.log('📧 Starting email check...');
    await this.loadState();

    const startTime = Date.now();

    // Check all accounts in parallel with circuit breakers
    const checkPromises = this.accounts.map(account => {
      if (!account.password) {
        console.log(`⏭️  Skipping ${account.name}: No password`);
        return Promise.resolve({ account: account.name, emails: [], skipped: true });
      }

      const breaker = this.getCircuitBreaker(account.name);
      return breaker.execute(() => this.checkAccount(account))
        .catch(error => ({
          account: account.name,
          emails: [],
          error: error.message
        }));
    });

    const results = await Promise.all(checkPromises);

    // Aggregate results
    const allEmails = [];
    const errors = [];

    for (const result of results) {
      if (result.error) {
        errors.push(`${result.account}: ${result.error}`);
        console.log(`❌ ${result.account}: ${result.error}`);
      } else if (result.skipped) {
        console.log(`⏭️  ${result.account}: Skipped`);
      } else {
        console.log(`✅ ${result.account}: ${result.emails.length} important emails`);
        allEmails.push(...result.emails);
      }
    }

    // Update state
    this.state.lastCheck = new Date().toISOString();
    this.state.totalChecks++;
    this.state.totalImportantFound += allEmails.length;
    this.state.errors = [...this.state.errors, ...errors].slice(-10);

    await this.saveState();

    const duration = Date.now() - startTime;
    console.log(`\n📊 Checked ${this.accounts.length} accounts in ${duration}ms`);
    console.log(`📧 Found ${allEmails.length} important emails`);

    return {
      emails: allEmails,
      checked: this.accounts.length,
      errors: errors.length,
      duration
    };
  }

  /**
   * Check a single email account
   */
  async checkAccount(account) {
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

      const importantEmails = [];
      const accountKey = account.name;
      let connectionClosed = false;

      // Track notified UIDs
      if (!this.state.lastNotifiedUids[accountKey]) {
        this.state.lastNotifiedUids[accountKey] = {};
      }
      const notifiedUids = this.state.lastNotifiedUids[accountKey];

      // Timeout handler
      const timeout = setTimeout(() => {
        if (!connectionClosed) {
          connectionClosed = true;
          imap.destroy();
          resolve({ account: accountKey, emails: importantEmails, timeout: true });
        }
      }, 60000);

      imap.once('ready', () => {
        imap.openBox('INBOX', true, (err, box) => {
          if (err) {
            clearTimeout(timeout);
            imap.end();
            return reject(err);
          }

          // Search for unseen emails from last 24 hours
          const yesterday = new Date();
          yesterday.setDate(yesterday.getDate() - 1);

          imap.search(['UNSEEN', ['SINCE', yesterday.toDateString()]], (err, results) => {
            if (err) {
              clearTimeout(timeout);
              imap.end();
              return reject(err);
            }

            if (!results || results.length === 0) {
              clearTimeout(timeout);
              imap.end();
              return resolve({ account: accountKey, emails: [] });
            }

            // Filter already notified
            const newResults = results.filter(uid => !notifiedUids[uid.toString()]);

            if (newResults.length === 0) {
              clearTimeout(timeout);
              imap.end();
              return resolve({ account: accountKey, emails: [] });
            }

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
                    clearTimeout(timeout);
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

                  if (this.isImportantEmail(email)) {
                    importantEmails.push(email);
                    if (uid) {
                      notifiedUids[uid.toString()] = Date.now();
                    }
                  }
                } catch (parseErr) {
                  console.error(`Parse error: ${parseErr.message}`);
                }

                if (processedCount >= newResults.length) {
                  clearTimeout(timeout);
                  imap.end();
                }
              });
            });

            fetch.once('error', (err) => {
              console.error(`Fetch error: ${err.message}`);
              clearTimeout(timeout);
              imap.end();
            });
          });
        });
      });

      imap.once('error', (err) => {
        clearTimeout(timeout);
        reject(err);
      });

      imap.once('end', () => {
        connectionClosed = true;
        clearTimeout(timeout);
        resolve({ account: accountKey, emails: importantEmails });
      });

      imap.connect();
    });
  }

  /**
   * Check if email is important
   */
  isImportantEmail(email) {
    const subject = (email.subject || '').toLowerCase();
    const from = (email.from?.address || '').toLowerCase();
    const fromName = (email.from?.name || '').toLowerCase();
    const text = (email.preview || '').toLowerCase();

    // Check spam patterns first
    for (const pattern of SPAM_PATTERNS) {
      if (subject.includes(pattern) || from.includes(pattern)) {
        return false;
      }
    }

    // Check priority keywords
    for (const keyword of PRIORITY_KEYWORDS) {
      if (subject.includes(keyword)) return true;
    }

    // Check priority senders
    for (const sender of PRIORITY_SENDERS) {
      if (from.includes(sender.toLowerCase()) || fromName.includes(sender.toLowerCase())) {
        return true;
      }
    }

    // Check body for urgent keywords
    for (const keyword of ['urgent', 'action required', 'asap', 'security alert']) {
      if (text.includes(keyword)) return true;
    }

    return false;
  }

  /**
   * Get current status
   */
  getStatus() {
    return {
      ...this.state,
      circuitBreakers: Array.from(this.circuitBreakers.entries()).map(([name, breaker]) => ({
        account: name,
        state: breaker.getState()
      }))
    };
  }
}

// CLI usage
if (require.main === module) {
  const config = {
    accounts: [
      {
        name: 'iCloud',
        user: process.env.ICLOUD_EMAIL,
        password: process.env.ICLOUD_PASSWORD,
        host: 'imap.mail.me.com',
        port: 993,
        tls: true
      },
      {
        name: 'Gmail',
        user: process.env.GMAIL_EMAIL,
        password: process.env.GMAIL_PASSWORD,
        host: 'imap.gmail.com',
        port: 993,
        tls: true
      }
    ]
  };

  const monitor = new EmailMonitorV2(config);
  
  monitor.checkAllAccounts()
    .then(result => {
      console.log('\n✅ Email check complete');
      if (result.emails.length > 0) {
        console.log('\n📧 Important emails:');
        result.emails.forEach(email => {
          console.log(`  - ${email.account}: ${email.subject}`);
        });
      }
      process.exit(0);
    })
    .catch(err => {
      console.error('❌ Fatal error:', err.message);
      process.exit(1);
    });
}

module.exports = { EmailMonitorV2 };
