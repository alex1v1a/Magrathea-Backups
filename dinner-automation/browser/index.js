/**
 * Stealth Browser Automation System
 * Main entry point
 */

const { StealthBrowser, logger } = require('./src/StealthBrowser');
const { CredentialManager } = require('./src/CredentialManager');
const { AutoLogin } = require('./src/AutoLogin');
const { AutomationBase } = require('./src/AutomationBase');
const { HEBAutomation } = require('./scripts/heb-browser');
const { FacebookAutomation } = require('./scripts/facebook-browser');

module.exports = {
  // Core components
  StealthBrowser,
  CredentialManager,
  AutoLogin,
  AutomationBase,
  
  // Site-specific automations
  HEBAutomation,
  FacebookAutomation,
  
  // Utilities
  logger
};
