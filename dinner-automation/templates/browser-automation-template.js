/**
 * {{SCRIPT_NAME}} - Browser Automation
 * 
 * {{SCRIPT_DESCRIPTION}}
 * 
 * Connects to existing browser via CDP and performs automation tasks.
 * 
 * Usage:
 *   node {{FILE_NAME}} [options]
 * 
 * Options:
 *   --help, -h       Show this help message
 *   --verbose, -v    Enable verbose logging
 *   --headless       Run in headless mode (if launching new browser)
 *   --debug-port N   CDP debug port (default: 9222)
 *   --dry-run        Run without making changes
 * 
 * @module scripts/{{FILE_NAME}}
 */

// ============================================================================
// IMPORTS
// ============================================================================

const fs = require('fs').promises;
const path = require('path');

// Shared library - browser automation utilities
const { 
  logger, 
  getConfig, 
  withRetry,
  CDPClient,
  HEB_SELECTORS,
  FB_SELECTORS,
  smartSelector,
  smartClick,
  smartType,
  smartNavigate,
  checkLoginStatus,
  elementExists,
  sleep,
  validateArray,
  validateRequired,
  timestampForFilename
} = require('../lib');

// Component logger
const log = logger.child('{{COMPONENT_NAME}}');

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
  browser: {
    debugPort: 9222,
    connectTimeout: 30000
  },
  
  timing: {
    minDelay: 1000,
    maxDelay: 3000,
    navigationTimeout: 30000,
    selectorTimeout: 5000
  },
  
  retry: {
    maxRetries: 3,
    baseDelay: 1000,
    backoffMultiplier: 2
  },
  
  urls: {
    heb: 'https://www.heb.com',
    facebook: 'https://www.facebook.com'
  }
};

// ============================================================================
// MAIN CLASS
// ============================================================================

/**
 * {{CLASS_DESCRIPTION}}
 */
class {{CLASS_NAME}} {
  constructor(options = {}) {
    this.options = {
      debugPort: CONFIG.browser.debugPort,
      headless: false,
      dryRun: false,
      verbose: false,
      ...options
    };
    
    this.client = null;
    this.page = null;
    this.browser = null;
    this.context = null;
  }

  /**
   * Connect to browser via CDP
   * @returns {Promise<void>}
   * @throws {Error} If connection fails
   */
  async connect() {
    log.info('Connecting to browser', { port: this.options.debugPort });
    
    try {
      this.client = new CDPClient({ 
        debugPort: this.options.debugPort,
        connectTimeout: CONFIG.browser.connectTimeout
      });
      
      const { browser, context, page } = await this.client.connect();
      
      this.browser = browser;
      this.context = context;
      this.page = page;
      
      log.success('Connected to browser');
      
    } catch (error) {
      log.error('Failed to connect to browser', error);
      throw new Error(
        `Could not connect to browser on port ${this.options.debugPort}. ` +
        'Ensure Chrome/Edge is running with --remote-debugging-port=' + this.options.debugPort
      );
    }
  }

  /**
   * Verify login status
   * @returns {Promise<boolean>} True if logged in
   */
  async verifyLogin() {
    log.info('Checking login status...');
    
    const currentUrl = this.page.url();
    
    // Determine which site we're on
    if (currentUrl.includes('heb.com')) {
      return await this.verifyHEBLogin();
    } else if (currentUrl.includes('facebook.com')) {
      return await this.verifyFacebookLogin();
    }
    
    log.warn('Unknown site, cannot verify login');
    return false;
  }

  /**
   * Verify HEB login
   * @returns {Promise<boolean>}
   */
  async verifyHEBLogin() {
    const isLoggedIn = await checkLoginStatus(this.page, {
      loginIndicators: HEB_SELECTORS.header.accountMenu,
      logoutIndicators: [
        'a[href*="/login"]',
        'button:has-text("Sign In")'
      ]
    });
    
    if (isLoggedIn) {
      log.success('HEB login verified');
      return true;
    } else {
      log.error('Not logged in to HEB');
      return false;
    }
  }

  /**
   * Verify Facebook login
   * @returns {Promise<boolean>}
   */
  async verifyFacebookLogin() {
    const isLoggedIn = await checkLoginStatus(this.page, {
      loginIndicators: FB_SELECTORS.nav.home,
      logoutIndicators: FB_SELECTORS.login.emailInput
    });
    
    if (isLoggedIn) {
      log.success('Facebook login verified');
      return true;
    } else {
      log.error('Not logged in to Facebook');
      return false;
    }
  }

  /**
   * Navigate to URL with retry
   * @param {string} url - URL to navigate to
   * @returns {Promise<void>}
   */
  async navigate(url) {
    log.info('Navigating', { url });
    
    await smartNavigate(this.page, url, {
      timeout: CONFIG.timing.navigationTimeout,
      waitUntil: 'networkidle'
    });
    
    // Human-like delay after navigation
    await sleep(CONFIG.timing.minDelay);
    
    log.success('Navigation complete');
  }

  /**
   * Run the main automation
   * @returns {Promise<Object>} Results
   */
  async run() {
    log.section('{{SCRIPT_NAME}} STARTING');
    
    const startTime = Date.now();
    
    try {
      // Connect to browser
      await this.connect();
      
      // Verify login
      const isLoggedIn = await this.verifyLogin();
      if (!isLoggedIn) {
        return {
          success: false,
          error: 'Not logged in. Please login manually first.'
        };
      }
      
      // Perform main action
      const result = await this.performAction();
      
      const duration = Date.now() - startTime;
      log.success('Automation completed', { duration });
      
      return {
        success: true,
        duration,
        result
      };
      
    } catch (error) {
      log.error('Automation failed', error);
      
      // Take error screenshot
      await this.takeScreenshot('error');
      
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
   * Perform the main automation action
   * Override this method in subclasses
   * @returns {Promise<any>}
   */
  async performAction() {
    // IMPLEMENT YOUR LOGIC HERE
    
    // Example: Search and click
    // await this.navigate('https://www.heb.com/search/?q=query');
    // await smartClick(this.page, HEB_SELECTORS.cart.addButton);
    
    throw new Error('performAction() must be implemented');
  }

  /**
   * Take screenshot
   * @param {string} name - Screenshot name
   * @returns {Promise<string|null>} Screenshot path
   */
  async takeScreenshot(name) {
    try {
      const timestamp = timestampForFilename();
      const filename = `${name}-${timestamp}.png`;
      const filepath = path.join(getConfig().getPath('screenshots'), filename);
      
      await this.page.screenshot({ path: filepath, fullPage: true });
      log.debug('Screenshot saved', { path: filepath });
      
      return filepath;
    } catch (error) {
      log.error('Screenshot failed', error);
      return null;
    }
  }

  /**
   * Cleanup resources
   * @returns {Promise<void>}
   */
  async cleanup() {
    log.info('Cleaning up...');
    
    if (this.client) {
      await this.client.disconnect();
      this.client = null;
    }
    
    this.page = null;
    this.context = null;
    this.browser = null;
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
    verbose: false,
    headless: false,
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
        
      case '--verbose':
      case '-v':
        options.verbose = true;
        break;
        
      case '--headless':
        options.headless = true;
        break;
        
      case '--debug-port':
        options.debugPort = parseInt(args[++i], 10);
        break;
        
      case '--dry-run':
        options.dryRun = true;
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
{{SCRIPT_NAME}}

{{SCRIPT_DESCRIPTION}}

Usage:
  node {{FILE_NAME}} [options]

Options:
  --help, -h       Show this help message
  --verbose, -v    Enable verbose logging
  --headless       Run in headless mode
  --debug-port N   CDP debug port (default: 9222)
  --dry-run        Run without making changes

Examples:
  node {{FILE_NAME}}
  node {{FILE_NAME}} --verbose --dry-run
  node {{FILE_NAME}} --debug-port 9224
`);
}

// ============================================================================
// MAIN ENTRY POINT
// ============================================================================

async function main() {
  const options = parseArgs();
  
  // Set log level
  if (options.verbose) {
    logger.setLevel(3); // DEBUG
  }
  
  const automation = new {{CLASS_NAME}}(options);
  const result = await automation.run();
  
  process.exit(result.success ? 0 : 1);
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('Fatal error:', error.message);
    process.exit(1);
  });
}

// Export for testing and extension
module.exports = { {{CLASS_NAME}}, parseArgs };
