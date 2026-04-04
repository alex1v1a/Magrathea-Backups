/**
 * Secure Credential Manager
 * Loads credentials from environment variables with fallbacks
 * NEVER hardcode passwords in scripts
 */

const path = require('path');
const fs = require('fs');

// Load .env file if present
try {
  const envPath = path.join(process.cwd(), '.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
      const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
      if (match && !process.env[match[1]]) {
        process.env[match[1]] = match[2].replace(/^["']|["']$/g, '');
      }
    });
  }
} catch (e) {
  // Silent fail - env file optional
}

const CREDENTIALS = {
  // iCloud / Apple
  icloud: {
    email: process.env.ICLOUD_EMAIL || 'MarvinMartian9@icloud.com',
    password: process.env.ICLOUD_APP_PASSWORD,
    smtp: {
      host: 'smtp.mail.me.com',
      port: 587
    },
    imap: {
      host: 'imap.mail.me.com',
      port: 993,
      tls: true
    },
    caldav: {
      serverUrl: 'https://caldav.icloud.com',
      username: process.env.ICLOUD_EMAIL || 'MarvinMartian9@icloud.com',
      password: process.env.ICLOUD_APP_PASSWORD
    }
  },
  
  // Facebook
  facebook: {
    email: process.env.FACEBOOK_EMAIL || 'alex@xspqr.com',
    password: process.env.FACEBOOK_PASSWORD,
    marketplace: {
      listingUrl: process.env.F150_LISTING_URL || 'https://www.facebook.com/marketplace/item/2269858303434147/'
    }
  },
  
  // HEB
  heb: {
    email: process.env.HEB_EMAIL || 'alex@1v1a.com',
    password: process.env.HEB_PASSWORD
  },
  
  // Home Assistant
  homeassistant: {
    url: process.env.HA_URL || 'http://localhost:8123',
    token: process.env.HOMEASSISTANT_TOKEN
  },
  
  // Govee
  govee: {
    apiKey: process.env.GOVEE_API_KEY
  },
  
  // Wyze
  wyze: {
    email: process.env.WYZE_EMAIL || 'Alex@1v1a.com',
    password: process.env.WYZE_PASSWORD,
    apiKeyId: process.env.WYZE_API_KEY_ID,
    apiKey: process.env.WYZE_API_KEY
  }
};

/**
 * Get credentials for a service
 * @param {string} service - Service name (icloud, facebook, heb, etc.)
 * @param {string} [key] - Specific key within service
 * @returns {any} Credential value
 * @throws {Error} If credential not found and required
 */
function getCredentials(service, key = null) {
  const serviceCreds = CREDENTIALS[service];
  if (!serviceCreds) {
    throw new Error(`Unknown service: ${service}`);
  }
  
  if (key) {
    const keys = key.split('.');
    let value = serviceCreds;
    for (const k of keys) {
      value = value?.[k];
      if (value === undefined) {
        throw new Error(`Credential not found: ${service}.${key}`);
      }
    }
    return value;
  }
  
  return serviceCreds;
}

/**
 * Check if all required credentials are present
 * @param {string} service - Service name
 * @param {string[]} required - List of required credential keys
 * @returns {boolean}
 */
function checkCredentials(service, required = []) {
  try {
    for (const key of required) {
      const value = getCredentials(service, key);
      if (!value) return false;
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Get IMAP config ready for imap-simple
 * @returns {Object} IMAP configuration
 */
function getIMAPConfig() {
  const password = getCredentials('icloud', 'password');
  if (!password) {
    throw new Error('ICLOUD_APP_PASSWORD environment variable not set');
  }
  
  return {
    imap: {
      user: getCredentials('icloud', 'email'),
      password: password,
      host: 'imap.mail.me.com',
      port: 993,
      tls: true,
      authTimeout: 3000
    }
  };
}

/**
 * Get CalDAV config ready for tsdav
 * @returns {Object} CalDAV configuration
 */
function getCalDAVConfig() {
  const password = getCredentials('icloud', 'password');
  if (!password) {
    throw new Error('ICLOUD_APP_PASSWORD environment variable not set');
  }
  
  return {
    serverUrl: 'https://caldav.icloud.com',
    credentials: {
      username: getCredentials('icloud', 'email'),
      password: password
    },
    authMethod: 'Basic',
    defaultAccountType: 'caldav'
  };
}

/**
 * Get SMTP config
 * @returns {Object} SMTP configuration
 */
function getSMTPConfig() {
  const password = getCredentials('icloud', 'password');
  if (!password) {
    throw new Error('ICLOUD_APP_PASSWORD environment variable not set');
  }
  
  return {
    host: 'smtp.mail.me.com',
    port: 587,
    username: getCredentials('icloud', 'email'),
    password: password
  };
}

module.exports = {
  CREDENTIALS,
  getCredentials,
  checkCredentials,
  getIMAPConfig,
  getCalDAVConfig,
  getSMTPConfig
};
