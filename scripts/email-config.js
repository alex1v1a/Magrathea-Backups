/**
 * Email Monitor Configuration
 * Reads credentials from environment variables or a secure config file
 * 
 * Environment Variables:
 *   ICLOUD_EMAIL - iCloud email address (default: MarvinMartian9@icloud.com)
 *   ICLOUD_APP_PASSWORD - iCloud app-specific password
 *   GMAIL_EMAIL - Gmail address (default: 9marvinmartian@gmail.com)
 *   GMAIL_PASSWORD - Gmail password
 *   EMAIL_DISCORD_WEBHOOK - Discord webhook URL for notifications
 */

const fs = require('fs').promises;
const path = require('path');

const CONFIG_PATH = path.join(__dirname, '..', 'marvin-dash', 'data', 'email-config.json');

// Default configuration
const defaultConfig = {
  icloud: {
    email: 'MarvinMartian9@icloud.com',
    // App-specific password should be set via ICLOUD_APP_PASSWORD env var
  },
  gmail: {
    email: '9marvinmartian@gmail.com',
    // Password should be set via GMAIL_PASSWORD env var
  },
  discord: {
    webhook: null
  },
  keywords: [
    'urgent', 'action required', 'asap', 'important', 'priority',
    'deadline', 'expires', 'payment due', 'bill due', 'overdue',
    'security alert', 'suspicious activity', 'verification',
    'appointment', 'meeting', 'scheduled', 'confirmed',
    'delivery', 'shipped', 'tracking', 'order',
    'password', 'login', 'account', 'verify'
  ],
  prioritySenders: [
    'alex@1v1a.com',
    'sferrazzaa96@gmail.com',
    'apple.com',
    'icloud.com',
    'google.com'
  ]
};

async function loadConfig() {
  let fileConfig = {};
  
  try {
    const data = await fs.readFile(CONFIG_PATH, 'utf8');
    fileConfig = JSON.parse(data);
  } catch {
    // Config file doesn't exist, use defaults
  }
  
  // Merge with environment variables (env vars take precedence)
  const config = {
    icloud: {
      email: process.env.ICLOUD_EMAIL || fileConfig.icloud?.email || defaultConfig.icloud.email,
      password: process.env.ICLOUD_APP_PASSWORD || fileConfig.icloud?.password
    },
    gmail: {
      email: process.env.GMAIL_EMAIL || fileConfig.gmail?.email || defaultConfig.gmail.email,
      password: process.env.GMAIL_PASSWORD || fileConfig.gmail?.password
    },
    discord: {
      webhook: process.env.EMAIL_DISCORD_WEBHOOK || process.env.KANBAN_DISCORD_WEBHOOK || fileConfig.discord?.webhook
    },
    keywords: fileConfig.keywords || defaultConfig.keywords,
    prioritySenders: fileConfig.prioritySenders || defaultConfig.prioritySenders
  };
  
  return config;
}

async function saveConfig(config) {
  const dir = path.dirname(CONFIG_PATH);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(CONFIG_PATH, JSON.stringify(config, null, 2));
}

module.exports = {
  loadConfig,
  saveConfig,
  defaultConfig,
  CONFIG_PATH
};
