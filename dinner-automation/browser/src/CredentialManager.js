/**
 * CredentialManager - Securely manage login credentials for various sites
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { logger } = require('./StealthBrowser');

const CREDENTIALS_FILE = path.join(__dirname, '../profiles', 'credentials.json');

class CredentialManager {
  constructor() {
    this.credentials = {};
    this.loadCredentials();
  }
  
  /**
   * Load credentials from file
   */
  loadCredentials() {
    try {
      if (fs.existsSync(CREDENTIALS_FILE)) {
        const data = fs.readFileSync(CREDENTIALS_FILE, 'utf8');
        this.credentials = JSON.parse(data);
        logger.info('Credentials loaded successfully');
      } else {
        logger.info('No credentials file found, starting fresh');
        this.credentials = {};
      }
    } catch (error) {
      logger.error('Failed to load credentials:', error);
      this.credentials = {};
    }
  }
  
  /**
   * Save credentials to file
   */
  saveCredentials() {
    try {
      const dir = path.dirname(CREDENTIALS_FILE);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      fs.writeFileSync(CREDENTIALS_FILE, JSON.stringify(this.credentials, null, 2));
      logger.info('Credentials saved successfully');
    } catch (error) {
      logger.error('Failed to save credentials:', error);
    }
  }
  
  /**
   * Get credentials for a specific site
   */
  getCredentials(site) {
    const siteLower = site.toLowerCase();
    const creds = this.credentials[siteLower];
    
    if (!creds) {
      logger.warn(`No credentials found for ${site}`);
      return null;
    }
    
    // Check if credentials are from environment variables
    if (creds.fromEnv) {
      return {
        username: process.env[creds.usernameEnv],
        password: process.env[creds.passwordEnv]
      };
    }
    
    return creds;
  }
  
  /**
   * Set credentials for a specific site
   */
  setCredentials(site, username, password, options = {}) {
    const siteLower = site.toLowerCase();
    
    this.credentials[siteLower] = {
      username,
      password,
      fromEnv: options.fromEnv || false,
      usernameEnv: options.usernameEnv,
      passwordEnv: options.passwordEnv,
      lastUpdated: new Date().toISOString()
    };
    
    this.saveCredentials();
    logger.info(`Credentials set for ${site}`);
  }
  
  /**
   * Set credentials to use environment variables
   */
  setCredentialsFromEnv(site, usernameEnv, passwordEnv) {
    this.setCredentials(site, null, null, {
      fromEnv: true,
      usernameEnv,
      passwordEnv
    });
  }
  
  /**
   * Remove credentials for a site
   */
  removeCredentials(site) {
    const siteLower = site.toLowerCase();
    delete this.credentials[siteLower];
    this.saveCredentials();
    logger.info(`Credentials removed for ${site}`);
  }
  
  /**
   * List all sites with stored credentials
   */
  listSites() {
    return Object.keys(this.credentials);
  }
  
  /**
   * Check if credentials exist for a site
   */
  hasCredentials(site) {
    const creds = this.getCredentials(site);
    return creds && creds.username && creds.password;
  }
}

module.exports = { CredentialManager };
