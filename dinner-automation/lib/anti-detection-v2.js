/**
 * Anti-Detection Module - Advanced evasion techniques
 * Helps avoid bot detection on automation targets
 * 
 * @module lib/anti-detection-v2
 */

const { logger } = require('./logger');

class AntiDetection {
  constructor(options = {}) {
    this.enabled = options.enabled !== false;
    this.stealthLevel = options.stealthLevel || 'high'; // low, medium, high
    this.humanLike = options.humanLike !== false;
    this.logger = logger.child('anti-detection');
  }

  /**
   * Generate Playwright context options with stealth settings
   */
  getStealthContextOptions() {
    if (!this.enabled) return {};

    const viewport = this._getRandomViewport();
    const userAgent = this._getRandomUserAgent();
    
    return {
      viewport,
      userAgent,
      locale: 'en-US',
      timezoneId: 'America/Chicago',
      geolocation: { latitude: 30.2672, longitude: -97.7431 }, // Austin, TX
      permissions: ['geolocation'],
      
      // Additional stealth options
      bypassCSP: true,
      ignoreHTTPSErrors: true,
      
      // Device emulation
      deviceScaleFactor: Math.random() > 0.5 ? 1 : 1.25,
      isMobile: false,
      hasTouch: false,
      
      // Color scheme
      colorScheme: Math.random() > 0.5 ? 'light' : 'dark'
    };
  }

  /**
   * Get browser launch args with anti-detection
   */
  getStealthLaunchArgs() {
    if (!this.enabled) return [];

    const args = [
      '--disable-blink-features=AutomationControlled',
      '--disable-web-security',
      '--disable-features=IsolateOrigins,site-per-process',
      '--disable-site-isolation-trials',
      '--disable-features=BlockInsecurePrivateNetworkRequests',
      '--disable-features=InterestFeedContentSuggestions',
      '--disable-features=MediaRouter',
      '--disable-features=OptimizationHints',
      '--disable-features=PasswordManager',
      '--disable-features=Translate',
      '--disable-features=OptimizationGuideModelDownloading',
      '--disable-features=NetworkPrediction',
      
      // Window size
      `--window-size=${this._getRandomViewport().width},${this._getRandomViewport().height}`,
      
      // Additional flags
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--disable-gpu',
      '--disable-software-rasterizer',
      '--disable-extensions-except=',
      '--disable-component-extensions-with-background-pages',
      '--disable-background-networking',
      '--disable-background-timer-throttling',
      '--disable-backgrounding-occluded-windows',
      '--disable-breakpad',
      '--disable-client-side-phishing-detection',
      '--disable-component-update',
      '--disable-default-apps',
      '--disable-domain-reliability',
      '--disable-features=AudioServiceOutOfProcess',
      '--disable-hang-monitor',
      '--disable-ipc-flooding-protection',
      '--disable-notifications',
      '--disable-popup-blocking',
      '--disable-print-preview',
      '--disable-prompt-on-repost',
      '--disable-renderer-backgrounding',
      '--disable-sync',
      '--force-color-profile=srgb',
      '--metrics-recording-only',
      '--no-first-run',
      '--password-store=basic',
      '--use-mock-keychain',
      '--enable-automation=false'
    ];

    return args;
  }

  /**
   * Inject stealth scripts into page
   */
  async injectStealthScripts(page) {
    if (!this.enabled) return;

    // Override navigator.webdriver
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', {
        get: () => undefined
      });

      // Override permissions
      const originalQuery = window.navigator.permissions.query;
      window.navigator.permissions.query = (parameters) => (
        parameters.name === 'notifications' 
          ? Promise.resolve({ state: Notification.permission })
          : originalQuery(parameters)
      );

      // Override plugins
      Object.defineProperty(navigator, 'plugins', {
        get: () => [
          { name: 'Chrome PDF Plugin', filename: 'internal-pdf-viewer' },
          { name: 'Chrome PDF Viewer', filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai' },
          { name: 'Native Client', filename: 'internal-nacl-plugin' }
        ]
      });

      // Override languages
      Object.defineProperty(navigator, 'languages', {
        get: () => ['en-US', 'en']
      });

      // Override webgl
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

      // Override canvas fingerprinting
      const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;
      const originalGetImageData = CanvasRenderingContext2D.prototype.getImageData;
      
      const noise = () => Math.floor(Math.random() * 2) - 1;
      
      CanvasRenderingContext2D.prototype.getImageData = function(...args) {
        const imageData = originalGetImageData.apply(this, args);
        for (let i = 0; i < imageData.data.length; i += 4) {
          imageData.data[i] += noise();
          imageData.data[i + 1] += noise();
          imageData.data[i + 2] += noise();
        }
        return imageData;
      };
    });

    this.logger.debug('Stealth scripts injected');
  }

  /**
   * Human-like mouse movements
   */
  async humanLikeMouseMovement(page, targetX, targetY) {
    if (!this.humanLike) {
      await page.mouse.move(targetX, targetY);
      return;
    }

    const current = await page.evaluate(() => ({
      x: window.innerWidth / 2,
      y: window.innerHeight / 2
    }));

    const steps = Math.floor(Math.random() * 10) + 5;
    const controlPoints = this._generateBezierPoints(
      current.x, current.y,
      targetX, targetY,
      steps
    );

    for (const point of controlPoints) {
      await page.mouse.move(point.x, point.y);
      await page.waitForTimeout(Math.random() * 50 + 20);
    }
  }

  /**
   * Human-like typing
   */
  async humanLikeType(page, selector, text) {
    if (!this.humanLike) {
      await page.fill(selector, text);
      return;
    }

    await page.click(selector);
    await page.waitForTimeout(Math.random() * 200 + 100);

    for (const char of text) {
      await page.keyboard.type(char);
      await page.waitForTimeout(Math.random() * 100 + 50);
    }
  }

  /**
   * Random delay between actions
   */
  async randomDelay(min = 500, max = 2000) {
    const delay = Math.floor(Math.random() * (max - min + 1)) + min;
    await new Promise(r => setTimeout(r, delay));
  }

  /**
   * Check for bot detection challenges
   */
  async detectChallenge(page) {
    const challengeSelectors = [
      'iframe[src*="recaptcha"]',
      'iframe[src*="hcaptcha"]',
      '.h-captcha',
      '#hcaptcha',
      '.cf-turnstile',
      '[class*="captcha"]',
      '[class*="challenge"]',
      'text=Verify you are human',
      'text=I\'m not a robot',
      'text=Security check',
      'input[name="h-captcha-response"]'
    ];

    for (const selector of challengeSelectors) {
      const element = await page.$(selector);
      if (element) {
        const isVisible = await element.isVisible().catch(() => false);
        if (isVisible) return { detected: true, selector };
      }
    }

    // Check URL patterns
    const url = page.url();
    const challengePatterns = [
      /captcha/i,
      /challenge/i,
      /verify/i,
      /bot-detection/i,
      /incapsula/i,
      /cloudflare/i
    ];

    for (const pattern of challengePatterns) {
      if (pattern.test(url)) {
        return { detected: true, type: 'url', pattern: pattern.toString() };
      }
    }

    return { detected: false };
  }

  // Private helpers
  _getRandomViewport() {
    const viewports = [
      { width: 1920, height: 1080 },
      { width: 1366, height: 768 },
      { width: 1440, height: 900 },
      { width: 1536, height: 864 },
      { width: 1280, height: 720 }
    ];
    return viewports[Math.floor(Math.random() * viewports.length)];
  }

  _getRandomUserAgent() {
    const userAgents = [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.0',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.0',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:120.0) Gecko/20100101 Firefox/120.0',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.0'
    ];
    return userAgents[Math.floor(Math.random() * userAgents.length)];
  }

  _generateBezierPoints(x1, y1, x2, y2, steps) {
    const points = [];
    const cp1x = x1 + (Math.random() - 0.5) * 200;
    const cp1y = y1 + (Math.random() - 0.5) * 200;
    const cp2x = x2 + (Math.random() - 0.5) * 200;
    const cp2y = y2 + (Math.random() - 0.5) * 200;

    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const x = this._cubicBezier(t, x1, cp1x, cp2x, x2);
      const y = this._cubicBezier(t, y1, cp1y, cp2y, y2);
      points.push({ x: Math.round(x), y: Math.round(y) });
    }

    return points;
  }

  _cubicBezier(t, p0, p1, p2, p3) {
    const oneMinusT = 1 - t;
    return (
      Math.pow(oneMinusT, 3) * p0 +
      3 * Math.pow(oneMinusT, 2) * t * p1 +
      3 * oneMinusT * Math.pow(t, 2) * p2 +
      Math.pow(t, 3) * p3
    );
  }
}

module.exports = { AntiDetection };
