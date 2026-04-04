#!/usr/bin/env node
/**
 * Email Notifier Module
 * Handles Discord notifications for important emails
 * Uses same pattern as kanban-refresh.js for consistency
 */

const https = require('https');
const http = require('http');
const fs = require('fs').promises;
const path = require('path');

// Configuration
const DISCORD_WEBHOOK = process.env.EMAIL_DISCORD_WEBHOOK || process.env.KANBAN_DISCORD_WEBHOOK || null;
const OPENCLAW_WEBHOOK = 'http://localhost:18789/hooks/wake';
const WORKSPACE_DIR = path.join(__dirname, '..');
const DATA_DIR = path.join(WORKSPACE_DIR, 'data');
const NOTIFICATION_LOG = path.join(DATA_DIR, 'email-notifications.json');

// Ensure data directory exists
async function ensureDataDir() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
  } catch (err) {
    // Directory might already exist
  }
}

/**
 * Format email notification for Discord
 */
function formatEmailNotification(emails) {
  const now = new Date().toLocaleString('en-US', { 
    weekday: 'short', 
    month: 'short', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
  
  let content = `📧 **Important Email Alert** - ${now}\n\n`;
  
  for (const email of emails) {
    const from = email.from.name ? `${email.from.name} <${email.from.address}>` : email.from.address;
    const subject = email.subject || '(No Subject)';
    const preview = email.preview ? email.preview.substring(0, 200) + (email.preview.length > 200 ? '...' : '') : '';
    const account = email.account || 'Unknown';
    
    content += `**From:** ${from}\n`;
    content += `**Subject:** ${subject}\n`;
    content += `**Account:** ${account}\n`;
    if (preview) {
      content += `**Preview:** ${preview}\n`;
    }
    content += `\n`;
  }
  
  return {
    content: content,
    username: 'Email Monitor',
    avatar_url: 'https://cdn-icons-png.flaticon.com/512/666/666162.png'
  };
}

/**
 * Send notification to Discord webhook
 */
function sendToDiscordWebhook(webhookUrl, payload) {
  return new Promise((resolve, reject) => {
    const url = new URL(webhookUrl);
    const data = JSON.stringify(payload);
    
    const options = {
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname + url.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
      }
    };
    
    const client = url.protocol === 'https:' ? https : http;
    
    const req = client.request(options, (res) => {
      let responseData = '';
      res.on('data', chunk => responseData += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(responseData);
        } else {
          reject(new Error(`Discord API returned ${res.statusCode}: ${responseData}`));
        }
      });
    });
    
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

/**
 * Send notification via OpenClaw webhook
 */
function sendToOpenClaw(message) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      text: message,
      mode: 'now'
    });
    
    const options = {
      hostname: 'localhost',
      port: 18789,
      path: '/hooks/wake',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
      },
      timeout: 5000
    };
    
    const req = http.request(options, (res) => {
      let responseData = '';
      res.on('data', chunk => responseData += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(responseData);
        } else {
          reject(new Error(`OpenClaw webhook returned ${res.statusCode}`));
        }
      });
    });
    
    req.on('error', (err) => {
      // OpenClaw might not be running, that's ok
      resolve();
    });
    
    req.on('timeout', () => {
      req.destroy();
      resolve();
    });
    
    req.write(data);
    req.end();
  });
}

/**
 * Log notification to file for tracking
 */
async function logNotification(emails) {
  await ensureDataDir();
  
  let notifications = [];
  try {
    const data = await fs.readFile(NOTIFICATION_LOG, 'utf8');
    notifications = JSON.parse(data);
  } catch {
    // File doesn't exist yet
  }
  
  notifications.push({
    timestamp: new Date().toISOString(),
    count: emails.length,
    emails: emails.map(e => ({
      from: e.from,
      subject: e.subject,
      account: e.account,
      uid: e.uid
    }))
  });
  
  // Keep only last 100 notifications
  if (notifications.length > 100) {
    notifications = notifications.slice(-100);
  }
  
  await fs.writeFile(NOTIFICATION_LOG, JSON.stringify(notifications, null, 2));
}

/**
 * Send notification for important emails
 * Primary method: Discord webhook
 * Fallback: OpenClaw webhook
 * Always: Log to file
 */
async function notifyImportantEmails(emails) {
  if (!emails || emails.length === 0) {
    return { sent: false, reason: 'No emails to notify' };
  }
  
  try {
    // Always log the notification
    await logNotification(emails);
    
    const payload = formatEmailNotification(emails);
    
    // Try Discord webhook first
    if (DISCORD_WEBHOOK) {
      try {
        await sendToDiscordWebhook(DISCORD_WEBHOOK, payload);
        console.log('✅ Discord notification sent');
        return { sent: true, method: 'discord', count: emails.length };
      } catch (err) {
        console.error('❌ Discord webhook failed:', err.message);
      }
    }
    
    // Fallback to OpenClaw webhook
    try {
      const textMessage = payload.content.replace(/\*\*/g, ''); // Remove Discord formatting
      await sendToOpenClaw(textMessage);
      console.log('✅ OpenClaw notification sent');
      return { sent: true, method: 'openclaw', count: emails.length };
    } catch (err) {
      console.error('❌ OpenClaw webhook failed:', err.message);
    }
    
    // Last resort: just log to console
    console.log('📧 Important emails detected but no notification method available:');
    console.log(payload.content);
    
    return { sent: false, reason: 'No notification method available', logged: true };
  } catch (err) {
    console.error('❌ Notification failed:', err.message);
    return { sent: false, error: err.message };
  }
}

/**
 * Send test notification
 */
async function sendTestNotification() {
  const testEmail = {
    from: { name: 'Test Sender', address: 'test@example.com' },
    subject: 'Test: Email Monitor is Working!',
    preview: 'This is a test notification from your email monitoring system.',
    account: 'Test Account',
    uid: 'test-123'
  };
  
  console.log('Sending test notification...');
  const result = await notifyImportantEmails([testEmail]);
  console.log('Result:', result);
  return result;
}

// Export functions for use in email-monitor.js
module.exports = {
  notifyImportantEmails,
  sendTestNotification,
  formatEmailNotification,
  logNotification
};

// If run directly, send test notification
if (require.main === module) {
  sendTestNotification().then(() => process.exit(0)).catch(err => {
    console.error('Test failed:', err);
    process.exit(1);
  });
}
