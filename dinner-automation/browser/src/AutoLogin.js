/**
 * AutoLogin - Automated login handlers for various sites
 */

const { logger } = require('./StealthBrowser');

/**
 * Login handlers for different websites
 */
const LOGIN_HANDLERS = {
  /**
   * HEB.com login handler
   */
  heb: {
    url: 'https://www.heb.com/login',
    selectors: {
      emailInput: 'input[type="email"], input[name="email"], #email',
      passwordInput: 'input[type="password"], input[name="password"], #password',
      submitButton: 'button[type="submit"], button:has-text("Sign In"), [data-testid="signin-button"]',
      otpInput: 'input[type="tel"], input[name="code"], input[placeholder*="code"]',
      otpSubmit: 'button:has-text("Verify"), button:has-text("Submit")'
    },
    loginFlow: async (browser, credentials) => {
      logger.info('Starting HEB login flow');
      
      await browser.navigate(LOGIN_HANDLERS.heb.url);
      
      // Check if already logged in
      if (await browser.elementExists('[data-testid="account-menu"], .account-link, .user-name')) {
        logger.info('Already logged in to HEB');
        return { success: true, alreadyLoggedIn: true };
      }
      
      // Fill email
      await browser.type(LOGIN_HANDLERS.heb.selectors.emailInput, credentials.username);
      await browser.randomDelay(500, 1000);
      
      // Fill password
      await browser.type(LOGIN_HANDLERS.heb.selectors.passwordInput, credentials.password);
      await browser.randomDelay(500, 1000);
      
      // Click submit
      await browser.click(LOGIN_HANDLERS.heb.selectors.submitButton);
      await browser.randomDelay(2000, 4000);
      
      // Check for 2FA/OTP
      const hasOtp = await browser.elementExists(LOGIN_HANDLERS.heb.selectors.otpInput);
      if (hasOtp) {
        logger.info('2FA/OTP required for HEB');
        return { success: false, requiresOtp: true };
      }
      
      // Verify login success
      const loggedIn = await browser.elementExists('[data-testid="account-menu"], .account-link, .user-name, .welcome-message');
      
      if (loggedIn) {
        logger.info('HEB login successful');
        return { success: true };
      } else {
        const errorText = await browser.getText('.error-message, .alert-error, [role="alert"]');
        logger.error('HEB login failed:', errorText);
        return { success: false, error: errorText || 'Unknown error' };
      }
    }
  },
  
  /**
   * Facebook login handler
   */
  facebook: {
    url: 'https://www.facebook.com/login',
    selectors: {
      emailInput: '#email, input[name="email"]',
      passwordInput: '#pass, input[name="pass"]',
      submitButton: 'button[name="login"], [type="submit"]',
      checkpoint: '#checkpoint_title, [role="main"] h2',
      captcha: '.captcha, #captcha'
    },
    loginFlow: async (browser, credentials) => {
      logger.info('Starting Facebook login flow');
      
      await browser.navigate(LOGIN_HANDLERS.facebook.url);
      
      // Accept cookies if presented
      if (await browser.elementExists('[data-cookiebanner="accept_button"], button[title*="Accept"]')) {
        await browser.click('[data-cookiebanner="accept_button"], button[title*="Accept"]');
        await browser.randomDelay(1000, 2000);
      }
      
      // Check if already logged in
      if (await browser.elementExists('[aria-label="Account"], [data-testid="left_nav_profile_picture"]')) {
        logger.info('Already logged in to Facebook');
        return { success: true, alreadyLoggedIn: true };
      }
      
      // Fill email
      await browser.type(LOGIN_HANDLERS.facebook.selectors.emailInput, credentials.username);
      await browser.randomDelay(500, 1000);
      
      // Fill password
      await browser.type(LOGIN_HANDLERS.facebook.selectors.passwordInput, credentials.password);
      await browser.randomDelay(500, 1000);
      
      // Click login
      await browser.click(LOGIN_HANDLERS.facebook.selectors.submitButton);
      await browser.randomDelay(3000, 5000);
      
      // Check for checkpoint/security challenge
      const hasCheckpoint = await browser.elementExists(LOGIN_HANDLERS.facebook.selectors.checkpoint);
      if (hasCheckpoint) {
        const checkpointText = await browser.getText(LOGIN_HANDLERS.facebook.selectors.checkpoint);
        logger.warn('Facebook checkpoint detected:', checkpointText);
        return { success: false, requiresCheckpoint: true, checkpointText };
      }
      
      // Check for captcha
      const hasCaptcha = await browser.elementExists(LOGIN_HANDLERS.facebook.selectors.captcha);
      if (hasCaptcha) {
        logger.warn('Facebook captcha detected');
        return { success: false, requiresCaptcha: true };
      }
      
      // Check for 2FA
      if (await browser.elementExists('input[name="approvals_code"], input[placeholder*="code"]')) {
        logger.info('2FA required for Facebook');
        return { success: false, requiresOtp: true };
      }
      
      // Verify login success
      const loggedIn = await browser.elementExists('[aria-label="Account"], [data-testid="left_nav_profile_picture"], #facebook');
      
      if (loggedIn) {
        logger.info('Facebook login successful');
        return { success: true };
      } else {
        const errorText = await browser.getText('#error_box, ._9ay7, [role="alert"]');
        logger.error('Facebook login failed:', errorText);
        return { success: false, error: errorText || 'Unknown error' };
      }
    }
  },
  
  /**
   * Generic login handler for custom sites
   */
  generic: {
    loginFlow: async (browser, credentials, config) => {
      logger.info(`Starting generic login flow for ${config.name || 'custom site'}`);
      
      await browser.navigate(config.loginUrl);
      await browser.randomDelay(1000, 2000);
      
      // Fill username/email
      if (config.selectors.username) {
        await browser.type(config.selectors.username, credentials.username);
        await browser.randomDelay(500, 1000);
      }
      
      // Fill password
      if (config.selectors.password) {
        await browser.type(config.selectors.password, credentials.password);
        await browser.randomDelay(500, 1000);
      }
      
      // Click submit
      if (config.selectors.submit) {
        await browser.click(config.selectors.submit);
        await browser.randomDelay(3000, 5000);
      }
      
      // Check for success indicator if provided
      if (config.selectors.successIndicator) {
        const success = await browser.elementExists(config.selectors.successIndicator);
        return { success };
      }
      
      return { success: true };
    }
  }
};

/**
 * AutoLogin class for handling automated logins
 */
class AutoLogin {
  constructor(browser, credentialManager) {
    this.browser = browser;
    this.credentialManager = credentialManager;
    this.handlers = { ...LOGIN_HANDLERS };
  }
  
  /**
   * Login to a specific site
   */
  async login(site, options = {}) {
    const siteLower = site.toLowerCase();
    
    // Get credentials
    const credentials = options.credentials || this.credentialManager.getCredentials(site);
    
    if (!credentials || !credentials.username || !credentials.password) {
      throw new Error(`No credentials found for ${site}. Please set credentials first.`);
    }
    
    // Get the appropriate handler
    const handler = this.handlers[siteLower] || this.handlers.generic;
    
    try {
      const result = await handler.loginFlow(this.browser, credentials, options.config);
      return result;
    } catch (error) {
      logger.error(`Login failed for ${site}:`, error);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Check if logged in to a site
   */
  async isLoggedIn(site) {
    const checks = {
      heb: '[data-testid="account-menu"], .account-link',
      facebook: '[aria-label="Account"], [data-testid="left_nav_profile_picture"]'
    };
    
    const selector = checks[site.toLowerCase()];
    if (!selector) {
      throw new Error(`No login check defined for ${site}`);
    }
    
    return await this.browser.elementExists(selector);
  }
  
  /**
   * Logout from a site (generic - navigates to logout URL)
   */
  async logout(site) {
    const logoutUrls = {
      heb: 'https://www.heb.com/logout',
      facebook: 'https://www.facebook.com/logout.php'
    };
    
    const url = logoutUrls[site.toLowerCase()];
    if (url) {
      await this.browser.navigate(url);
      logger.info(`Logged out from ${site}`);
    }
  }
  
  /**
   * Register a custom login handler
   */
  registerHandler(site, handler) {
    this.handlers[site.toLowerCase()] = handler;
  }
}

module.exports = { AutoLogin, LOGIN_HANDLERS };
