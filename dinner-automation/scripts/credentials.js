/** @format */
/**
 * Secure Credential Management System
 * 
 * This module provides secure credential retrieval:
 * - Environment variables (primary)
 * - Fallback to prompting for credentials
 * - Never stores plaintext passwords in code
 * 
 * Usage:
 *   const { getCredential } = require('./credentials');
 *   const password = getCredential('ICLOUD_APP_PASSWORD');
 */

const os = require('os');
const path = require('path');
const fs = require('fs');

// Load .env file from parent directory if it exists
try {
  const dotenvPath = path.join(__dirname, '..', '.env');
  if (fs.existsSync(dotenvPath)) {
    const dotenv = require('dotenv');
    dotenv.config({ path: dotenvPath });
  }
} catch (e) {
  // dotenv not installed, will use process.env only
}

// Credential definitions with descriptions
const CREDENTIALS = {
  // iCloud credentials
  ICLOUD_EMAIL: {
    env: 'ICLOUD_EMAIL',
    description: 'iCloud email address (e.g., MarvinMartian9@icloud.com)',
    required: true,
    default: 'MarvinMartian9@icloud.com'
  },
  ICLOUD_APP_PASSWORD: {
    env: 'ICLOUD_APP_PASSWORD',
    description: 'iCloud app-specific password for email/calendar (from Apple ID settings)',
    required: true
  },
  ICLOUD_PASSWORD: {
    env: 'ICLOUD_PASSWORD',
    description: 'iCloud account password (for general account access)',
    required: false
  },

  // Gmail credentials (secondary)
  GMAIL_EMAIL: {
    env: 'GMAIL_EMAIL',
    description: 'Gmail address (optional, for secondary email)',
    required: false
  },
  GMAIL_PASSWORD: {
    env: 'GMAIL_PASSWORD',
    description: 'Gmail app password (optional)',
    required: false
  },

  // HEB credentials
  HEB_EMAIL: {
    env: 'HEB_EMAIL',
    description: 'HEB.com login email',
    required: false,
    default: 'alex@1v1a.com'
  },
  HEB_PASSWORD: {
    env: 'HEB_PASSWORD',
    description: 'HEB.com login password',
    required: false
  },

  // Home Assistant
  HOMEASSISTANT_TOKEN: {
    env: 'HOMEASSISTANT_TOKEN',
    description: 'Home Assistant Long-Lived Access Token',
    required: false
  },
  HOMEASSISTANT_URL: {
    env: 'HOMEASSISTANT_URL',
    description: 'Home Assistant URL (default: http://localhost:8123)',
    required: false,
    default: 'http://localhost:8123'
  },

  // Wyze
  WYZE_EMAIL: {
    env: 'WYZE_EMAIL',
    description: 'Wyze account email',
    required: false
  },
  WYZE_PASSWORD: {
    env: 'WYZE_PASSWORD',
    description: 'Wyze account password',
    required: false
  },
  WYZE_API_KEY: {
    env: 'WYZE_API_KEY',
    description: 'Wyze API Key',
    required: false
  },
  WYZE_API_KEY_ID: {
    env: 'WYZE_API_KEY_ID',
    description: 'Wyze API Key ID',
    required: false
  },

  // Govee
  GOVEE_API_KEY: {
    env: 'GOVEE_API_KEY',
    description: 'Govee API Key',
    required: false
  },

  // Discord
  DINNER_DISCORD_WEBHOOK: {
    env: 'DINNER_DISCORD_WEBHOOK',
    description: 'Discord webhook URL for dinner notifications',
    required: false
  },
  OPENCLAW_WEBHOOK_TOKEN: {
    env: 'OPENCLAW_WEBHOOK_TOKEN',
    description: 'OpenClaw webhook token for HA integration',
    required: false
  },

  // Model services
  MINIMAX_EMAIL: {
    env: 'MINIMAX_EMAIL',
    description: 'Minimax account email',
    required: false
  },
  MINIMAX_PASSWORD: {
    env: 'MINIMAX_PASSWORD',
    description: 'Minimax account password',
    required: false
  }
};

/**
 * Get a credential from environment variables
 * @param {string} name - Credential name (key from CREDENTIALS)
 * @param {Object} options - Options
 * @param {boolean} options.allowEmpty - Allow empty/undefined return (don't throw)
 * @returns {string|null} The credential value or null
 */
function getCredential(name, options = {}) {
  const config = CREDENTIALS[name];
  
  if (!config) {
    throw new Error(`Unknown credential: ${name}. Available: ${Object.keys(CREDENTIALS).join(', ')}`);
  }

  // Check environment variable first
  let value = process.env[config.env];
  
  // If not set and we have a default, use it
  if (!value && config.default) {
    value = config.default;
  }

  // If required and not set, throw error
  if (config.required && !value && !options.allowEmpty) {
    throw new Error(
      `Required credential '${name}' is not set.\n` +
      `  Environment variable: ${config.env}\n` +
      `  Description: ${config.description}\n` +
      `\n  Set it with: export ${config.env}=your_value`
    );
  }

  return value || null;
}

/**
 * Check if a credential is available
 * @param {string} name - Credential name
 * @returns {boolean}
 */
function hasCredential(name) {
  try {
    return !!getCredential(name, { allowEmpty: true });
  } catch {
    return false;
  }
}

/**
 * Get all credentials as an object
 * @param {boolean} includeOptional - Include optional credentials
 * @returns {Object}
 */
function getAllCredentials(includeOptional = false) {
  const result = {};
  
  for (const [name, config] of Object.entries(CREDENTIALS)) {
    if (config.required || includeOptional) {
      try {
        result[name] = getCredential(name, { allowEmpty: true });
      } catch {
        result[name] = null;
      }
    }
  }
  
  return result;
}

/**
 * Get email configuration for nodemailer
 * @returns {Object} SMTP config object
 */
function getEmailConfig() {
  return {
    smtp: {
      host: 'smtp.mail.me.com',
      port: 587,
      secure: false, // STARTTLS
      auth: {
        user: getCredential('ICLOUD_EMAIL'),
        pass: getCredential('ICLOUD_APP_PASSWORD')
      },
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
      secure: true,
      auth: {
        user: getCredential('ICLOUD_EMAIL'),
        pass: getCredential('ICLOUD_APP_PASSWORD')
      }
    }
  };
}

/**
 * Get iCloud CalDAV configuration
 * @returns {Object} CalDAV config object
 */
function getCalDAVConfig() {
  return {
    username: getCredential('ICLOUD_EMAIL'),
    password: getCredential('ICLOUD_APP_PASSWORD'),
    serverUrl: 'https://caldav.icloud.com',
    rootUrl: 'https://caldav.icloud.com'
  };
}

/**
 * Get HEB credentials
 * @returns {Object} HEB credentials object
 */
function getHEBCredentials() {
  return {
    email: getCredential('HEB_EMAIL', { allowEmpty: true }) || 'alex@1v1a.com',
    password: getCredential('HEB_PASSWORD', { allowEmpty: true })
  };
}

/**
 * Generate environment file template
 * @returns {string} .env file content
 */
function generateEnvTemplate() {
  let template = '# Dinner Automation Environment Variables\n';
  template += '# Copy this file to .env and fill in your values\n';
  template += '# Never commit .env to version control!\n\n';

  for (const [name, config] of Object.entries(CREDENTIALS)) {
    if (config.required) {
      template += `# REQUIRED: ${config.description}\n`;
      template += `${config.env}=\n\n`;
    }
  }

  template += '# --- Optional Credentials ---\n\n';

  for (const [name, config] of Object.entries(CREDENTIALS)) {
    if (!config.required) {
      template += `# ${config.description}\n`;
      if (config.default) {
        template += `# Default: ${config.default}\n`;
      }
      template += `# ${config.env}=\n\n`;
    }
  }

  return template;
}

/**
 * Save environment template to file
 * @param {string} filePath - Path to save (default: .env.example)
 */
function saveEnvTemplate(filePath = '.env.example') {
  const template = generateEnvTemplate();
  fs.writeFileSync(filePath, template);
  console.log(`Environment template saved to: ${filePath}`);
}

/**
 * Print setup instructions
 */
function printSetupInstructions() {
  console.log(`
========================================
CREDENTIAL SETUP INSTRUCTIONS
========================================

Credentials are loaded from environment variables.

OPTION 1: Environment Variables (Recommended)
---------------------------------------------
Set these in your shell profile or before running scripts:

Required:
  export ICLOUD_APP_PASSWORD=your_app_specific_password

Optional (depending on features used):
  export HEB_PASSWORD=your_heb_password
  export DINNER_DISCORD_WEBHOOK=your_discord_webhook_url
  export HOMEASSISTANT_TOKEN=your_ha_token
  export WYZE_API_KEY=your_wyze_api_key
  export GOVEE_API_KEY=your_govee_api_key

OPTION 2: .env File
-------------------
1. Copy .env.example to .env:
   cp .env.example .env

2. Edit .env and fill in your values

3. The scripts will automatically load .env

OPTION 3: iCloud Keychain (macOS only)
--------------------------------------
For macOS, you can store credentials in iCloud Keychain:

  security add-generic-password -s "dinner-automation" \
    -a "icloud-app-password" -w "your_password"

Then retrieve with:
  security find-generic-password -s "dinner-automation" \
    -a "icloud-app-password" -w

========================================
`);
}

module.exports = {
  CREDENTIALS,
  getCredential,
  hasCredential,
  getAllCredentials,
  getEmailConfig,
  getCalDAVConfig,
  getHEBCredentials,
  generateEnvTemplate,
  saveEnvTemplate,
  printSetupInstructions
};

// CLI usage
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.includes('--template')) {
    saveEnvTemplate(args[args.indexOf('--template') + 1] || '.env.example');
  } else if (args.includes('--check')) {
    console.log('Checking credential availability...\n');
    for (const name of Object.keys(CREDENTIALS)) {
      const available = hasCredential(name);
      const config = CREDENTIALS[name];
      const status = available ? '✅' : config.required ? '❌ REQUIRED' : '⬜ optional';
      console.log(`${status} ${name}: ${config.description}`);
    }
  } else if (args.includes('--setup')) {
    printSetupInstructions();
  } else {
    console.log('Secure Credential Manager');
    console.log('');
    console.log('Usage:');
    console.log('  node credentials.js --check              Check which credentials are set');
    console.log('  node credentials.js --template [file]    Generate .env template');
    console.log('  node credentials.js --setup              Show setup instructions');
    console.log('');
    console.log('Available credentials:');
    for (const [name, config] of Object.entries(CREDENTIALS)) {
      const req = config.required ? ' (required)' : '';
      console.log(`  ${name}${req}`);
    }
  }
}
