/**
 * Facebook Marketplace Automation - REFACTORED
 * 
 * Refactored to use shared library utilities:
 * - Uses lib/logger for structured logging
 * - Uses lib/validation for input validation
 * - Uses lib/selectors for CSS selectors
 * - Uses lib/browser for browser automation
 * - Uses lib/retry-utils for retry logic
 * 
 * @module scripts/facebook-marketplace-refactored
 * @requires playwright
 * @requires ../lib
 */

const fs = require('fs').promises;
const path = require('path');

// Shared library utilities
const {
  logger,
  getConfig,
  withRetry,
  sleep,
  timestampForFilename,
  formatRelativeTime,
  validateRequired,
  ValidationError,
  FB_SELECTORS,
  COMMON_SELECTORS,
  smartSelector,
  smartClick,
  smartType,
  smartNavigate,
  checkLoginStatus,
  elementExists,
  waitForAnySelector,
  SessionManager,
  RateLimiter
} = require('../lib');

// Component-specific logger
const log = logger.child('facebook-marketplace');

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
  browser: {
    debugPort: 9224,
    connectTimeout: 30000
  },
  
  timing: {
    minDelay: 1000,
    maxDelay: 3000,
    navigationTimeout: 30000,
    selectorTimeout: 5000
  },
  
  keywords: [
    'f-150', 'f150', 'truck', 'thule', 'box', 'cargo',
    'rack', 'buy', 'interested', 'available', 'price', 
    'offer', 'still', 'have'
  ],
  
  groups: [
    'HAYS COUNTY LIST & SELL',
    'Buda/Kyle Buy, Sell & Rent',
    'Ventas De Austin, Buda, Kyle'
  ],
  
  maxConversations: 20
};

// ============================================================================
// STATE MANAGEMENT
// ============================================================================

/**
 * Manages persistent state for Facebook automation
 */
class FBStateManager {
  constructor() {
    this.config = getConfig();
    this.filePath = path.join(this.config.getPath('data'), 'fb-marketplace-state.json');
    this.cache = null;
    this.dirty = false;
    this._writeTimeout = null;
  }

  /**
   * Load state from file
   * @returns {Promise<Object>} State object
   */
  async load() {
    if (this.cache) return this.cache;
    
    try {
      const data = await fs.readFile(this.filePath, 'utf8');
      this.cache = JSON.parse(data);
      log.debug('State loaded', { lastGroupIndex: this.cache.lastGroupIndex });
      return this.cache;
    } catch (error) {
      log.debug('No existing state, using defaults');
      return { lastGroupIndex: -1, loggedIn: false, lastCheck: null };
    }
  }

  /**
   * Save state to file (debounced)
   * @param {Object} state - State to save
   */
  async save(state) {
    this.cache = { 
      ...state, 
      timestamp: new Date().toISOString() 
    };
    this.dirty = true;
    
    // Debounce writes - only write every 5 seconds
    if (!this._writeTimeout) {
      this._writeTimeout = setTimeout(async () => {
        if (this.dirty) {
          try {
            await fs.writeFile(this.filePath, JSON.stringify(this.cache, null, 2));
            log.debug('State saved');
            this.dirty = false;
          } catch (error) {
            log.error('Failed to save state', error);
          }
        }
        this._writeTimeout = null;
      }, 5000);
    }
  }

  /**
   * Get next group to share to
   * @returns {Promise<{group: string, index: number}>}
   */
  async getNextGroup() {
    const state = await this.load();
    const nextIndex = (state.lastGroupIndex + 1) % CONFIG.groups.length;
    return { group: CONFIG.groups[nextIndex], index: nextIndex };
  }
}

// ============================================================================
// FACEBOOK MARKETPLACE AUTOMATION
// ============================================================================

/**
 * Manages Facebook Marketplace automation
 */
class FacebookMarketplaceAutomation {
  constructor(options = {}) {
    this.options = {
      dryRun: false,
      debugPort: CONFIG.browser.debugPort,
      verbose: false,
      ...options
    };
    
    this.session = new SessionManager({ debugPort: this.options.debugPort });
    this.stateManager = new FBStateManager();
    this.rateLimiter = new RateLimiter({
      minDelay: CONFIG.timing.minDelay,
      maxDelay: CONFIG.timing.maxDelay
    });
    this.results = [];
  }

  /**
   * Connect to browser
   * @returns {Promise<void>}
   */
  async connect() {
    log.info('Connecting to browser', { port: this.options.debugPort });
    await this.session.connect();
    log.success('Connected to browser');
  }

  /**
   * Verify Facebook login status
   * @returns {Promise<boolean>}
   */
  async verifyLogin() {
    log.info('Verifying Facebook login...');
    
    // Navigate to Facebook
    await smartNavigate(this.session.page, 'https://www.facebook.com', {
      timeout: CONFIG.timing.navigationTimeout,
      waitUntil: 'networkidle'
    });
    
    await sleep(2000);
    
    const isLoggedIn = await checkLoginStatus(this.session.page, {
      loginIndicators: FB_SELECTORS.nav.home,
      logoutIndicators: FB_SELECTORS.login.emailInput
    });
    
    if (isLoggedIn) {
      log.success('Facebook login verified');
    } else {
      log.error('Not logged in to Facebook');
    }
    
    return isLoggedIn;
  }

  /**
   * Check Marketplace messages
   * @returns {Promise<Array>} Actionable messages
   */
  async checkMessages() {
    log.section('CHECKING MARKETPLACE MESSAGES');
    
    const page = this.session.page;
    
    // Navigate to inbox
    await smartNavigate(page, 'https://www.facebook.com/marketplace/inbox/', {
      timeout: CONFIG.timing.navigationTimeout,
      waitUntil: 'networkidle'
    });
    
    await sleep(3000);
    
    // Take debug screenshot
    await this.session.screenshot('marketplace-inbox');
    
    // Find conversation threads
    const conversationSelectors = [
      '[role="listitem"]',
      '[data-testid="messenger-list-item"]',
      'div[role="button"][tabindex="0"]',
      '[data-pagelet="MWInboxList"] div[role="button"]'
    ];
    
    let conversations = [];
    for (const selector of conversationSelectors) {
      conversations = await page.$$(selector);
      if (conversations.length > 0) {
        log.info(`Found ${conversations.length} conversations`);
        break;
      }
    }
    
    if (conversations.length === 0) {
      log.warn('No conversations found');
      return [];
    }
    
    // Process conversations
    const messages = [];
    const toProcess = conversations.slice(0, CONFIG.maxConversations);
    
    for (let i = 0; i < toProcess.length; i++) {
      await this.rateLimiter.wait();
      
      try {
        const text = await toProcess[i].textContent().catch(() => '');
        if (!text || text.length < 5) continue;
        
        // Skip UI text
        if (text.includes('Marketplace') && text.length < 50) continue;
        
        const lowerText = text.toLowerCase();
        const matchedKeywords = CONFIG.keywords.filter(kw => 
          lowerText.includes(kw.toLowerCase())
        );
        
        const lines = text.split('\n').filter(l => l.trim());
        const sender = lines[0]?.trim() || 'Unknown';
        const preview = lines.slice(1, 4).join(' ').trim() || text.slice(0, 150);
        
        messages.push({
          sender,
          preview: preview.slice(0, 200),
          keywords: matchedKeywords,
          hasKeywords: matchedKeywords.length > 0,
          index: i
        });
      } catch (error) {
        log.debug('Error processing conversation', { error: error.message, index: i });
      }
    }
    
    const actionable = messages.filter(m => m.hasKeywords);
    
    log.info(`\n📊 Summary: ${messages.length} messages, ${actionable.length} actionable`);
    
    if (actionable.length > 0) {
      log.section('🎯 ACTIONABLE MESSAGES');
      actionable.forEach(msg => {
        log.info(`${msg.sender}: "${msg.preview.slice(0, 80)}..."`);
        log.debug(`   Keywords: ${msg.keywords.join(', ')}`);
      });
    }
    
    return actionable;
  }

  /**
   * Share F-150 listing to a group
   * @returns {Promise<Object>} Share result
   */
  async shareToGroup() {
    log.section('SHARING F-150 LISTING');
    
    const { group, index } = await this.stateManager.getNextGroup();
    log.info(`Next group: ${group}`);
    
    if (this.options.dryRun) {
      log.info('Dry run - would share to:', { group });
      return { success: true, dryRun: true, group };
    }
    
    const page = this.session.page;
    
    try {
      // Navigate to selling page
      await smartNavigate(page, 'https://www.facebook.com/marketplace/you/selling', {
        timeout: CONFIG.timing.navigationTimeout,
        waitUntil: 'networkidle'
      });
      
      await sleep(2000);
      
      // Click share button
      const shareClicked = await smartClick(page, FB_SELECTORS.listing.shareButton);
      if (!shareClicked) {
        throw new Error('Could not find share button');
      }
      
      await sleep(1500);
      
      // Click "Share to a group"
      const groupClicked = await smartClick(page, FB_SELECTORS.listing.shareToGroup);
      if (!groupClicked) {
        throw new Error('Could not find "Share to a group" option');
      }
      
      await sleep(1500);
      
      // Search for group
      await smartType(page, FB_SELECTORS.listing.searchGroups, group);
      await sleep(2000);
      
      // Select group by clicking on it
      const groupSelector = `text=${group}`;
      const groupFound = await smartClick(page, [groupSelector]);
      if (!groupFound) {
        throw new Error(`Could not find group: ${group}`);
      }
      
      await sleep(1500);
      
      // Click post
      const posted = await smartClick(page, FB_SELECTORS.listing.postButton);
      if (!posted) {
        throw new Error('Could not click Post button');
      }
      
      // Save state
      await this.stateManager.save({ lastGroupIndex: index });
      
      log.success(`Successfully shared to ${group}`);
      return { success: true, group };
      
    } catch (error) {
      log.error(`Failed to share to ${group}`, error);
      return { success: false, group, error: error.message };
    }
  }

  /**
   * Run automation based on mode
   * @param {string} mode - 'messages', 'share', or 'both'
   * @returns {Promise<Object>} Results
   */
  async run(mode = 'messages') {
    log.section('FACEBOOK MARKETPLACE AUTOMATION');
    log.info(`Mode: ${mode}`);
    
    const startTime = Date.now();
    
    try {
      // Connect to browser
      await this.connect();
      
      // Verify login
      const isLoggedIn = await this.verifyLogin();
      if (!isLoggedIn) {
        return {
          success: false,
          error: 'Not logged in to Facebook. Please login manually first.'
        };
      }
      
      const results = {
        messages: [],
        share: null,
        success: true
      };
      
      // Check messages
      if (mode === 'messages' || mode === 'both') {
        results.messages = await this.checkMessages();
      }
      
      // Share to group
      if (mode === 'share' || mode === 'both') {
        results.share = await this.shareToGroup();
        results.success = results.share.success;
      }
      
      const duration = Date.now() - startTime;
      log.success('Automation completed', { duration });
      
      return { ...results, duration };
      
    } catch (error) {
      log.error('Automation failed', error);
      
      // Take error screenshot
      await this.session.screenshot('facebook-error');
      
      return {
        success: false,
        error: error.message,
        duration: Date.now() - startTime
      };
    } finally {
      await this.cleanup();
    }
  }

  /**
   * Cleanup resources
   * @returns {Promise<void>}
   */
  async cleanup() {
    log.info('Cleaning up...');
    await this.session.close();
  }
}

// ============================================================================
// CLI FUNCTIONS
// ============================================================================

/**
 * Parse command line arguments
 * @returns {Object} Parsed options
 */
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    mode: 'messages',
    verbose: false,
    dryRun: false,
    debugPort: CONFIG.browser.debugPort
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    switch (arg) {
      case '--help':
      case '-h':
        showHelp();
        process.exit(0);
        
      case '--messages':
        options.mode = 'messages';
        break;
        
      case '--share':
        options.mode = 'share';
        break;
        
      case '--both':
        options.mode = 'both';
        break;
        
      case '--verbose':
      case '-v':
        options.verbose = true;
        break;
        
      case '--dry-run':
        options.dryRun = true;
        break;
        
      case '--debug-port':
        options.debugPort = parseInt(args[++i], 10);
        break;
    }
  }

  return options;
}

/**
 * Display help message
 */
function showHelp() {
  console.log(`
Facebook Marketplace Automation - Refactored

Automates Facebook Marketplace tasks including checking messages
and sharing listings to groups.

Usage:
  node facebook-marketplace-refactored.js [mode] [options]

Modes:
  --messages    Check Marketplace inbox for actionable messages (default)
  --share       Share F-150 listing to next group
  --both        Run both modes

Options:
  --help, -h         Show this help message
  --verbose, -v      Enable verbose logging
  --dry-run          Run without making changes
  --debug-port N     CDP debug port (default: 9224)

Examples:
  node facebook-marketplace-refactored.js
  node facebook-marketplace-refactored.js --share --verbose
  node facebook-marketplace-refactored.js --both --dry-run
`);
}

// ============================================================================
// MAIN ENTRY POINT
// ============================================================================

async function main() {
  const options = parseArgs();
  
  if (options.verbose) {
    logger.setLevel(3); // DEBUG
  }

  const automation = new FacebookMarketplaceAutomation(options);
  
  try {
    const result = await automation.run(options.mode);
    process.exit(result.success ? 0 : 1);
  } catch (error) {
    log.error('Fatal error', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

// Export for testing
module.exports = { 
  FacebookMarketplaceAutomation, 
  FBStateManager,
  parseArgs 
};
