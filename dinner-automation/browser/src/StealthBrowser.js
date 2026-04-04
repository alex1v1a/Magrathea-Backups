/**
 * StealthBrowser - Advanced browser automation with anti-detection features
 * Designed for 24/7 automated operation
 */

const { chromium } = require('playwright-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const winston = require('winston');
const path = require('path');
const fs = require('fs');

// Setup logging
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ 
      filename: path.join(__dirname, '../logs/browser-error.log'),
      level: 'error'
    }),
    new winston.transports.File({ 
      filename: path.join(__dirname, '../logs/browser.log')
    })
  ]
});

// Real Chrome user agents for rotation
const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
];

// Common viewport sizes
const VIEWPORTS = [
  { width: 1920, height: 1080 },
  { width: 1366, height: 768 },
  { width: 1440, height: 900 },
  { width: 1536, height: 864 }
];

/**
 * StealthBrowser - Main browser automation class
 */
class StealthBrowser {
  constructor(options = {}) {
    this.profileName = options.profile || 'default';
    this.headless = options.headless !== false;
    this.slowMo = options.slowMo || 50;
    this.defaultTimeout = options.timeout || 30000;
    this.userDataDir = path.join(__dirname, '../profiles', this.profileName);
    
    // Ensure profile directory exists
    if (!fs.existsSync(this.userDataDir)) {
      fs.mkdirSync(this.userDataDir, { recursive: true });
    }
    
    this.browser = null;
    this.context = null;
    this.page = null;
    this.isRunning = false;
    this.sessionStartTime = null;
    
    // Anti-detection settings
    this.userAgent = options.userAgent || this.getRandomUserAgent();
    this.viewport = options.viewport || this.getRandomViewport();
    
    logger.info(`StealthBrowser initialized for profile: ${this.profileName}`);
  }
  
  getRandomUserAgent() {
    return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
  }
  
  getRandomViewport() {
    return VIEWPORTS[Math.floor(Math.random() * VIEWPORTS.length)];
  }
  
  /**
   * Initialize and launch the browser with stealth settings
   */
  async launch() {
    try {
      logger.info('Launching stealth browser...');
      
      // Apply stealth plugin
      chromium.use(StealthPlugin());
      
      const launchOptions = {
        headless: this.headless,
        slowMo: this.slowMo,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--disable-gpu',
          '--window-size=1920,1080',
          '--disable-blink-features=AutomationControlled',
          '--disable-features=IsolateOrigins,site-per-process',
          '--disable-web-security',
          '--disable-features=BlockInsecurePrivateNetworkRequests'
        ],
        userDataDir: this.userDataDir
      };
      
      this.browser = await chromium.launch(launchOptions);
      
      // Create context with specific settings
      this.context = await this.browser.newContext({
        userAgent: this.userAgent,
        viewport: this.viewport,
        deviceScaleFactor: 1,
        hasTouch: false,
        javaScriptEnabled: true,
        locale: 'en-US',
        timezoneId: 'America/Chicago',
        permissions: ['geolocation'],
        geolocation: { latitude: 30.2672, longitude: -97.7431 }, // Austin, TX
        colorScheme: 'light'
      });
      
      // Set default timeout
      this.context.setDefaultTimeout(this.defaultTimeout);
      this.context.setDefaultNavigationTimeout(this.defaultTimeout);
      
      // Create page
      this.page = await this.context.newPage();
      
      // Inject anti-detection scripts
      await this.injectStealthScripts();
      
      // Setup error recovery
      this.setupErrorRecovery();
      
      this.isRunning = true;
      this.sessionStartTime = Date.now();
      
      logger.info('Stealth browser launched successfully');
      return this;
      
    } catch (error) {
      logger.error('Failed to launch browser:', error);
      throw error;
    }
  }
  
  /**
   * Inject stealth scripts to evade bot detection
   */
  async injectStealthScripts() {
    // Override navigator properties
    await this.page.addInitScript(() => {
      // Remove webdriver property
      Object.defineProperty(navigator, 'webdriver', {
        get: () => undefined
      });
      
      // Override plugins
      Object.defineProperty(navigator, 'plugins', {
        get: () => [
          {
            0: { type: 'application/x-google-chrome-pdf', suffixes: 'pdf', description: 'Portable Document Format' },
            description: 'Portable Document Format',
            filename: 'internal-pdf-viewer',
            length: 1,
            name: 'Chrome PDF Plugin'
          },
          {
            0: { type: 'application/pdf', suffixes: 'pdf', description: '' },
            description: '',
            filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai',
            length: 1,
            name: 'Chrome PDF Viewer'
          },
          {
            0: { type: 'application/x-google-chrome-pdf', suffixes: 'pdf', description: 'Portable Document Format' },
            description: 'Portable Document Format',
            filename: 'internal-pdf-viewer2',
            length: 1,
            name: 'Native Client'
          }
        ]
      });
      
      // Override languages
      Object.defineProperty(navigator, 'languages', {
        get: () => ['en-US', 'en']
      });
      
      // Override permissions
      const originalQuery = window.navigator.permissions.query;
      window.navigator.permissions.query = (parameters) => (
        parameters.name === 'notifications' 
          ? Promise.resolve({ state: Notification.permission })
          : originalQuery(parameters)
      );
      
      // WebGL fingerprint randomization
      const getParameter = WebGLRenderingContext.prototype.getParameter;
      WebGLRenderingContext.prototype.getParameter = function(parameter) {
        if (parameter === 37445) {
          return 'Intel Inc.';
        }
        if (parameter === 37446) {
          return 'Intel Iris OpenGL Engine';
        }
        return getParameter(parameter);
      };
      
      // Canvas fingerprinting protection
      const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;
      HTMLCanvasElement.prototype.toDataURL = function(type) {
        if (this.width > 16 && this.height > 16) {
          const ctx = this.getContext('2d');
          if (ctx) {
            const imageData = ctx.getImageData(0, 0, this.width, this.height);
            const data = imageData.data;
            // Add subtle noise
            for (let i = 0; i < data.length; i += 4) {
              const noise = (Math.random() - 0.5) * 2;
              data[i] = Math.max(0, Math.min(255, data[i] + noise));
              data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + noise));
              data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + noise));
            }
            ctx.putImageData(imageData, 0, 0);
          }
        }
        return originalToDataURL.call(this, type);
      };
      
      // Override chrome runtime
      window.chrome = {
        runtime: {
          OnInstalledReason: { CHROME_UPDATE: 'chrome_update', INSTALL: 'install', SHARED_MODULE_UPDATE: 'shared_module_update', UPDATE: 'update' },
          OnRestartRequiredReason: { APP_UPDATE: 'app_update', OS_UPDATE: 'os_update', PERIODIC: 'periodic' },
          PlatformArch: { ARM: 'arm', ARM64: 'arm64', MIPS: 'mips', MIPS64: 'mips64', X86_32: 'x86-32', X86_64: 'x86-64' },
          PlatformNaclArch: { MIPS: 'mips', MIPS64: 'mips64', X86_32: 'x86-32', X86_64: 'x86-64' },
          PlatformOs: { ANDROID: 'android', CROS: 'cros', LINUX: 'linux', MAC: 'mac', OPENBSD: 'openbsd', WIN: 'win' },
          RequestUpdateCheckStatus: { NO_UPDATE: 'no_update', THROTTLED: 'throttled', UPDATE_AVAILABLE: 'update_available' }
        }
      };
      
      // Notification permission
      const originalNotification = window.Notification;
      Object.defineProperty(Notification, 'permission', {
        get: () => 'default'
      });
    });
    
    logger.info('Stealth scripts injected successfully');
  }
  
  /**
   * Setup automatic error recovery
   */
  setupErrorRecovery() {
    this.page.on('error', (error) => {
      logger.error('Page error:', error);
    });
    
    this.page.on('pageerror', (error) => {
      logger.error('Page JS error:', error);
    });
    
    this.page.on('requestfailed', (request) => {
      logger.warn(`Request failed: ${request.url()} - ${request.failure().errorText}`);
    });
    
    this.page.on('response', (response) => {
      if (response.status() >= 400) {
        logger.warn(`HTTP ${response.status()}: ${response.url()}`);
      }
    });
  }
  
  /**
   * Navigate to a URL with retry logic
   */
  async navigate(url, options = {}) {
    const maxRetries = options.retries || 3;
    let lastError;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        logger.info(`Navigating to ${url} (attempt ${attempt}/${maxRetries})`);
        
        await this.page.goto(url, {
          waitUntil: options.waitUntil || 'networkidle',
          timeout: options.timeout || this.defaultTimeout
        });
        
        // Random delay to appear human
        await this.randomDelay(1000, 3000);
        
        logger.info(`Successfully navigated to ${url}`);
        return true;
        
      } catch (error) {
        lastError = error;
        logger.warn(`Navigation attempt ${attempt} failed:`, error.message);
        
        if (attempt < maxRetries) {
          const waitTime = Math.pow(2, attempt) * 1000; // Exponential backoff
          logger.info(`Waiting ${waitTime}ms before retry...`);
          await this.sleep(waitTime);
        }
      }
    }
    
    throw new Error(`Failed to navigate to ${url} after ${maxRetries} attempts: ${lastError.message}`);
  }
  
  /**
   * Human-like typing with delays
   */
  async type(selector, text, options = {}) {
    const minDelay = options.minDelay || 50;
    const maxDelay = options.maxDelay || 150;
    
    logger.info(`Typing into ${selector}`);
    
    // Focus the element first
    await this.page.focus(selector);
    await this.randomDelay(200, 500);
    
    // Clear existing text if requested
    if (options.clear !== false) {
      await this.page.evaluate((sel) => {
        const el = document.querySelector(sel);
        if (el) el.value = '';
      }, selector);
      await this.randomDelay(100, 300);
    }
    
    // Type with random delays between keystrokes
    for (const char of text) {
      await this.page.type(selector, char, { delay: 0 });
      await this.randomDelay(minDelay, maxDelay);
    }
    
    logger.info(`Finished typing into ${selector}`);
  }
  
  /**
   * Human-like clicking with mouse movement
   */
  async click(selector, options = {}) {
    logger.info(`Clicking ${selector}`);
    
    // Wait for element to be visible
    await this.page.waitForSelector(selector, { 
      visible: true, 
      timeout: options.timeout || 10000 
    });
    
    // Scroll element into view
    await this.page.evaluate((sel) => {
      const el = document.querySelector(sel);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, selector);
    
    await this.randomDelay(300, 700);
    
    // Simulate human-like mouse movement
    await this.humanMouseMovement(selector);
    
    // Perform the click
    await this.page.click(selector, { 
      delay: options.delay || Math.random() * 100 + 50 
    });
    
    await this.randomDelay(500, 1500);
    logger.info(`Clicked ${selector}`);
  }
  
  /**
   * Simulate human mouse movement
   */
  async humanMouseMovement(selector) {
    try {
      const box = await this.page.evaluate((sel) => {
        const el = document.querySelector(sel);
        if (!el) return null;
        const rect = el.getBoundingClientRect();
        return {
          x: rect.left + rect.width / 2,
          y: rect.top + rect.height / 2
        };
      }, selector);
      
      if (!box) return;
      
      // Get current mouse position (or start from random position)
      const currentPos = await this.page.evaluate(() => ({
        x: window.innerWidth / 2,
        y: window.innerHeight / 2
      }));
      
      // Generate intermediate points for curved path
      const steps = 5 + Math.floor(Math.random() * 5);
      for (let i = 1; i <= steps; i++) {
        const progress = i / steps;
        const x = currentPos.x + (box.x - currentPos.x) * progress + (Math.random() - 0.5) * 50;
        const y = currentPos.y + (box.y - currentPos.y) * progress + (Math.random() - 0.5) * 50;
        
        await this.page.mouse.move(x, y);
        await this.randomDelay(20, 80);
      }
      
    } catch (error) {
      logger.warn('Mouse movement simulation failed:', error.message);
    }
  }
  
  /**
   * Scroll the page with human-like behavior
   */
  async scroll(options = {}) {
    const direction = options.direction || 'down';
    const amount = options.amount || Math.random() * 500 + 300;
    const duration = options.duration || Math.random() * 1000 + 500;
    
    logger.info(`Scrolling ${direction} by ${Math.round(amount)}px`);
    
    const scrollAmount = direction === 'down' ? amount : -amount;
    const steps = 10;
    const stepAmount = scrollAmount / steps;
    const stepDelay = duration / steps;
    
    for (let i = 0; i < steps; i++) {
      await this.page.evaluate((amt) => {
        window.scrollBy(0, amt);
      }, stepAmount);
      await this.sleep(stepDelay);
    }
    
    logger.info('Scroll completed');
  }
  
  /**
   * Take a screenshot
   */
  async screenshot(options = {}) {
    const filename = options.filename || `screenshot-${Date.now()}.png`;
    const filepath = path.join(__dirname, '../logs', filename);
    
    await this.page.screenshot({
      path: filepath,
      fullPage: options.fullPage !== false,
      type: options.type || 'png'
    });
    
    logger.info(`Screenshot saved: ${filepath}`);
    return filepath;
  }
  
  /**
   * Wait for element with retry
   */
  async waitForSelector(selector, options = {}) {
    const timeout = options.timeout || 10000;
    const visible = options.visible !== false;
    
    logger.info(`Waiting for selector: ${selector}`);
    
    try {
      await this.page.waitForSelector(selector, { 
        visible, 
        timeout 
      });
      logger.info(`Found selector: ${selector}`);
      return true;
    } catch (error) {
      logger.error(`Selector not found: ${selector}`);
      throw error;
    }
  }
  
  /**
   * Check if element exists
   */
  async elementExists(selector) {
    return await this.page.evaluate((sel) => {
      return !!document.querySelector(sel);
    }, selector);
  }
  
  /**
   * Get element text
   */
  async getText(selector) {
    return await this.page.evaluate((sel) => {
      const el = document.querySelector(sel);
      return el ? el.textContent.trim() : null;
    }, selector);
  }
  
  /**
   * Get element attribute
   */
  async getAttribute(selector, attribute) {
    return await this.page.evaluate((sel, attr) => {
      const el = document.querySelector(sel);
      return el ? el.getAttribute(attr) : null;
    }, selector, attribute);
  }
  
  /**
   * Fill a form field
   */
  async fillForm(fields) {
    logger.info(`Filling form with ${Object.keys(fields).length} fields`);
    
    for (const [selector, value] of Object.entries(fields)) {
      await this.type(selector, value);
      await this.randomDelay(500, 1000);
    }
    
    logger.info('Form filled successfully');
  }
  
  /**
   * Select from dropdown
   */
  async selectOption(selector, value) {
    logger.info(`Selecting option ${value} from ${selector}`);
    await this.page.selectOption(selector, value);
    await this.randomDelay(300, 600);
  }
  
  /**
   * Handle dialog/popup
   */
  async handleDialog(action = 'accept', text = '') {
    this.page.on('dialog', async (dialog) => {
      logger.info(`Dialog appeared: ${dialog.type()} - ${dialog.message()}`);
      
      if (action === 'accept') {
        await dialog.accept(text);
      } else {
        await dialog.dismiss();
      }
    });
  }
  
  /**
   * Random delay between min and max milliseconds
   */
  async randomDelay(min, max) {
    const delay = Math.floor(Math.random() * (max - min + 1)) + min;
    await this.sleep(delay);
  }
  
  /**
   * Sleep for specified milliseconds
   */
  async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  /**
   * Get current URL
   */
  async getCurrentUrl() {
    return this.page.url();
  }
  
  /**
   * Get page title
   */
  async getTitle() {
    return this.page.title();
  }
  
  /**
   * Execute JavaScript on the page
   */
  async evaluate(fn, ...args) {
    return await this.page.evaluate(fn, ...args);
  }
  
  /**
   * Check if element is visible
   */
  async isVisible(selector) {
    return await this.page.isVisible(selector);
  }
  
  /**
   * Wait for network to be idle
   */
  async waitForNetworkIdle(options = {}) {
    await this.page.waitForLoadState('networkidle', options);
  }
  
  /**
   * Reload the page
   */
  async reload(options = {}) {
    logger.info('Reloading page...');
    await this.page.reload({
      waitUntil: options.waitUntil || 'networkidle'
    });
    await this.randomDelay(1000, 2000);
  }
  
  /**
   * Go back in browser history
   */
  async goBack() {
    logger.info('Navigating back...');
    await this.page.goBack();
    await this.randomDelay(1000, 2000);
  }
  
  /**
   * Clear cookies
   */
  async clearCookies() {
    logger.info('Clearing cookies...');
    await this.context.clearCookies();
  }
  
  /**
   * Get all cookies
   */
  async getCookies() {
    return await this.context.cookies();
  }
  
  /**
   * Add cookies
   */
  async addCookies(cookies) {
    await this.context.addCookies(cookies);
  }
  
  /**
   * Get session duration
   */
  getSessionDuration() {
    if (!this.sessionStartTime) return 0;
    return Date.now() - this.sessionStartTime;
  }
  
  /**
   * Check if browser is running
   */
  isBrowserRunning() {
    return this.isRunning && this.browser && this.browser.isConnected();
  }
  
  /**
   * Close the browser
   */
  async close() {
    logger.info('Closing browser...');
    
    this.isRunning = false;
    
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.context = null;
      this.page = null;
    }
    
    logger.info('Browser closed successfully');
  }
  
  /**
   * Restart the browser
   */
  async restart() {
    logger.info('Restarting browser...');
    await this.close();
    await this.sleep(2000);
    return await this.launch();
  }
}

module.exports = { StealthBrowser, logger };
