/**
 * Unified Configuration Manager
 * Centralized configuration for all Marvin automation scripts
 * 
 * Usage: const config = require('./config-manager.js').load();
 */

const fs = require('fs').promises;
const path = require('path');

const CONFIG_DIR = path.join(__dirname, '..', 'config');
const DEFAULT_CONFIG_PATH = path.join(CONFIG_DIR, 'default.json');
const USER_CONFIG_PATH = path.join(CONFIG_DIR, 'user.json');

// Default configuration
const DEFAULT_CONFIG = {
  // Browser automation settings
  browser: {
    type: 'edge', // 'edge', 'chrome', 'firefox'
    headless: true,
    slowMo: 0,
    viewport: { width: 1920, height: 1080 },
    timeout: 30000,
    retries: 3,
    sessionPersistence: true,
    sessionDir: path.join(__dirname, '..', 'data', 'sessions')
  },
  
  // HEB automation settings
  heb: {
    enabled: true,
    baseUrl: 'https://www.heb.com',
    cartCheckInterval: 30, // minutes
    maxCartItems: 50,
    substitutionPolicy: 'auto', // 'auto', 'manual', 'skip'
    preferredStore: 'Buda',
    notificationEmail: true,
    notificationDiscord: true
  },
  
  // Facebook Marketplace settings
  facebook: {
    enabled: true,
    baseUrl: 'https://www.facebook.com/marketplace',
    messageCheckInterval: 60, // minutes
    shareInterval: 60, // minutes between group shares
    groups: [
      'HAYS COUNTY LIST \u0026 SELL',
      'Buda/Kyle Buy, Sell \u0026 Rent',
      'Ventas De Austin, Buda, Kyle'
    ],
    f150ListingId: null, // Will be auto-detected
    autoReply: true,
    replyTemplates: {
      initial: "Thanks for your interest in the F-150! It's still available. When would you like to see it?",
      viewing: "Great! I'm available most evenings after 5pm and weekends. What's your schedule like?",
      price: "I'm asking $8,500 OBO. The truck is in great condition with regular maintenance."
    }
  },
  
  // Email settings
  email: {
    enabled: true,
    imap: {
      host: 'imap.mail.me.com',
      port: 993,
      tls: true
    },
    smtp: {
      host: 'smtp.mail.me.com',
      port: 587,
      secure: false
    },
    checkInterval: 15, // minutes
    dinnerNotificationTime: '09:00', // When to send weekly dinner plan
    senderName: 'Marvin 🤖'
  },
  
  // Calendar settings
  calendar: {
    enabled: true,
    provider: 'icloud', // 'icloud', 'google', 'outlook'
    syncInterval: 15, // minutes
    calendars: ['Dinner', 'Home', 'Work'],
    defaultReminder: 30 // minutes before event
  },
  
  // Discord notifications
  discord: {
    enabled: true,
    webhookUrl: process.env.DINNER_DISCORD_WEBHOOK || null,
    notifications: {
      dinnerPlan: true,
      cartUpdates: true,
      errors: true,
      systemStatus: false
    }
  },
  
  // Monitoring and alerting
  monitoring: {
    enabled: true,
    healthCheckInterval: 5, // minutes
    autoRecovery: true,
    alertThreshold: 3, // consecutive failures before alert
    metricsRetention: 30 // days
  },
  
  // Performance settings
  performance: {
    maxConcurrentJobs: 3,
    jobTimeout: 300000, // 5 minutes
    memoryThreshold: 512, // MB
    cpuThreshold: 80 // percent
  },
  
  // Security settings
  security: {
    credentialStore: 'env', // 'env', 'keychain', 'file'
    encryptSensitiveData: true,
    auditLog: true,
    maxLoginAttempts: 3
  },
  
  // Paths
  paths: {
    data: path.join(__dirname, '..', 'data'),
    logs: path.join(__dirname, '..', 'logs'),
    backups: path.join(__dirname, '..', 'backups'),
    temp: path.join(__dirname, '..', 'temp')
  }
};

class ConfigManager {
  constructor() {
    this.config = null;
    this.watchers = new Set();
  }

  async load() {
    // Ensure config directory exists
    await this.ensureDir(CONFIG_DIR);
    
    // Load or create default config
    let userConfig = {};
    try {
      const userData = await fs.readFile(USER_CONFIG_PATH, 'utf8');
      userConfig = JSON.parse(userData);
    } catch {
      // No user config yet, that's okay
    }
    
    // Deep merge default and user configs
    this.config = this.deepMerge(DEFAULT_CONFIG, userConfig);
    
    // Save default if it doesn't exist
    try {
      await fs.access(DEFAULT_CONFIG_PATH);
    } catch {
      await fs.writeFile(
        DEFAULT_CONFIG_PATH, 
        JSON.stringify(DEFAULT_CONFIG, null, 2)
      );
    }
    
    return this.config;
  }

  async saveUserConfig(updates) {
    this.config = this.deepMerge(this.config || DEFAULT_CONFIG, updates);
    
    // Only save user overrides, not defaults
    const userConfig = this.extractUserOverrides(DEFAULT_CONFIG, this.config);
    
    await this.ensureDir(CONFIG_DIR);
    await fs.writeFile(
      USER_CONFIG_PATH,
      JSON.stringify(userConfig, null, 2)
    );
    
    // Notify watchers
    this.watchers.forEach(cb => cb(this.config));
    
    return this.config;
  }

  get(path) {
    if (!this.config) {
      throw new Error('Config not loaded. Call load() first.');
    }
    
    const keys = path.split('.');
    let value = this.config;
    
    for (const key of keys) {
      if (value === undefined || value === null) {
        return undefined;
      }
      value = value[key];
    }
    
    return value;
  }

  async set(path, value) {
    if (!this.config) {
      await this.load();
    }
    
    const keys = path.split('.');
    let target = this.config;
    
    for (let i = 0; i < keys.length - 1; i++) {
      if (!(keys[i] in target)) {
        target[keys[i]] = {};
      }
      target = target[keys[i]];
    }
    
    target[keys[keys.length - 1]] = value;
    
    await this.saveUserConfig({});
    return this.config;
  }

  onChange(callback) {
    this.watchers.add(callback);
    return () => this.watchers.delete(callback);
  }

  deepMerge(target, source) {
    const output = { ...target };
    
    for (const key in source) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        output[key] = this.deepMerge(target[key] || {}, source[key]);
      } else {
        output[key] = source[key];
      }
    }
    
    return output;
  }

  extractUserDefaults(defaults, current, result = {}) {
    for (const key in current) {
      if (!(key in defaults)) {
        result[key] = current[key];
      } else if (
        current[key] && 
        typeof current[key] === 'object' && 
        !Array.isArray(current[key])
      ) {
        const nested = this.extractUserDefaults(defaults[key], current[key]);
        if (Object.keys(nested).length > 0) {
          result[key] = nested;
        }
      } else if (JSON.stringify(defaults[key]) !== JSON.stringify(current[key])) {
        result[key] = current[key];
      }
    }
    return result;
  }

  extractUserOverrides(defaults, current) {
    return this.extractUserDefaults(defaults, current);
  }

  async ensureDir(dir) {
    try {
      await fs.access(dir);
    } catch {
      await fs.mkdir(dir, { recursive: true });
    }
  }

  validate() {
    const errors = [];
    
    // Validate required fields
    if (!this.get('email.imap.host')) {
      errors.push('IMAP host is required');
    }
    
    if (!this.get('email.smtp.host')) {
      errors.push('SMTP host is required');
    }
    
    if (this.get('discord.enabled') && !this.get('discord.webhookUrl')) {
      errors.push('Discord webhook URL is required when Discord is enabled');
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }

  // Environment-specific overrides
  applyEnvironmentOverrides() {
    const env = process.env.NODE_ENV || 'development';
    
    if (env === 'development') {
      this.config.browser.headless = false;
      this.config.browser.slowMo = 100;
    }
    
    if (env === 'test') {
      this.config.monitoring.enabled = false;
      this.config.email.enabled = false;
      this.config.discord.enabled = false;
    }
  }
}

// Singleton instance
let instance = null;

module.exports = {
  ConfigManager,
  load: async () => {
    if (!instance) {
      instance = new ConfigManager();
      await instance.load();
    }
    return instance.config;
  },
  getInstance: () => {
    if (!instance) {
      instance = new ConfigManager();
    }
    return instance;
  },
  DEFAULT_CONFIG
};

// CLI for configuration management
if (require.main === module) {
  const args = process.argv.slice(2);
  const command = args[0];
  
  const manager = new ConfigManager();
  
  (async () => {
    switch (command) {
      case 'get':
        await manager.load();
        console.log(JSON.stringify(manager.get(args[1]), null, 2));
        break;
        
      case 'set':
        await manager.load();
        await manager.set(args[1], JSON.parse(args[2]));
        console.log(`Set ${args[1]} = ${args[2]}`);
        break;
        
      case 'validate':
        await manager.load();
        const result = manager.validate();
        if (result.valid) {
          console.log('✅ Configuration is valid');
        } else {
          console.log('❌ Configuration errors:');
          result.errors.forEach(e => console.log(`  - ${e}`));
          process.exit(1);
        }
        break;
        
      case 'reset':
        await fs.unlink(USER_CONFIG_PATH).catch(() => {});
        console.log('User configuration reset to defaults');
        break;
        
      default:
        console.log('Usage: node config-manager.js [get|set|validate|reset] [path] [value]');
        console.log('  get <path>     - Get configuration value');
        console.log('  set <path> <value> - Set configuration value');
        console.log('  validate       - Validate configuration');
        console.log('  reset          - Reset to defaults');
    }
  })();
}
