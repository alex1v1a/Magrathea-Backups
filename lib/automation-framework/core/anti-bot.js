/**
 * AntiBot - Anti-Detection and Humanization Module
 * 
 * Provides sophisticated anti-bot detection evasion techniques including:
 * - Randomized delays and timing patterns
 * - Human-like mouse movements and scrolling
 * - Browser fingerprint randomization
 * - Behavior pattern variation
 */

const { randomInt, randomFloat } = require('../utils/random');

/**
 * AntiBot configuration defaults
 */
const DEFAULT_CONFIG = {
  // Delay settings (in milliseconds)
  delays: {
    minActionDelay: 500,
    maxActionDelay: 2000,
    minTypingDelay: 50,
    maxTypingDelay: 150,
    minPageLoadDelay: 2000,
    maxPageLoadDelay: 5000,
    minScrollDelay: 100,
    maxScrollDelay: 300
  },
  
  // Mouse movement settings
  mouse: {
    enableHumanMovement: true,
    movementSteps: { min: 5, max: 15 },
    movementVariance: 50, // pixels of randomness
    clickDelay: { min: 50, max: 150 }
  },
  
  // Scroll settings
  scroll: {
    enableHumanScroll: true,
    scrollSteps: { min: 10, max: 20 },
    scrollVariance: { min: 50, max: 150 },
    pauseBetweenScrolls: { min: 500, max: 1500 }
  },
  
  // Fingerprint settings
  fingerprint: {
    rotateUserAgents: true,
    rotateViewports: true,
    randomizeWebGL: true,
    randomizeCanvas: true,
    randomizePlugins: true
  }
};

/**
 * User agent rotation pool
 */
const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:121.0) Gecko/20100101 Firefox/121.0'
];

/**
 * Viewport rotation pool
 */
const VIEWPORTS = [
  { width: 1920, height: 1080 },
  { width: 1366, height: 768 },
  { width: 1440, height: 900 },
  { width: 1536, height: 864 },
  { width: 1280, height: 720 },
  { width: 1680, height: 1050 }
];

/**
 * Time-of-day behavior patterns
 */
const BEHAVIOR_PATTERNS = {
  morning: { // 6am - 12pm
    fasterActions: true,
    shorterDelays: true,
    scrollDepth: 'medium'
  },
  afternoon: { // 12pm - 6pm
    moderatePace: true,
    normalDelays: true,
    scrollDepth: 'deep'
  },
  evening: { // 6pm - 12am
    slowerActions: true,
    longerDelays: true,
    scrollDepth: 'shallow'
  },
  night: { // 12am - 6am
    verySlow: true,
    longestDelays: true,
    scrollDepth: 'minimal'
  }
};

class AntiBot {
  constructor(config = {}) {
    this.config = this.mergeConfig(DEFAULT_CONFIG, config);
    this.sessionStartTime = Date.now();
    this.actionCount = 0;
    this.currentPattern = this.detectTimePattern();
    
    // Initialize with random fingerprint
    this.currentUserAgent = this.getRandomUserAgent();
    this.currentViewport = this.getRandomViewport();
  }

  /**
   * Merge user config with defaults
   */
  mergeConfig(defaults, user) {
    const merged = { ...defaults };
    for (const key in user) {
      if (typeof user[key] === 'object' && !Array.isArray(user[key])) {
        merged[key] = { ...defaults[key], ...user[key] };
      } else {
        merged[key] = user[key];
      }
    }
    return merged;
  }

  /**
   * Detect current time-based behavior pattern
   */
  detectTimePattern() {
    const hour = new Date().getHours();
    if (hour >= 6 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 18) return 'afternoon';
    if (hour >= 18 && hour < 24) return 'evening';
    return 'night';
  }

  /**
   * Get random user agent
   */
  getRandomUserAgent() {
    return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
  }

  /**
   * Get random viewport
   */
  getRandomViewport() {
    return VIEWPORTS[Math.floor(Math.random() * VIEWPORTS.length)];
  }

  /**
   * Calculate delay based on time pattern and randomization
   */
  calculateDelay(baseMin, baseMax) {
    const pattern = BEHAVIOR_PATTERNS[this.currentPattern];
    let multiplier = 1;
    
    if (pattern) {
      if (pattern.shorterDelays) multiplier = 0.7;
      if (pattern.longerDelays) multiplier = 1.3;
      if (pattern.longestDelays) multiplier = 1.8;
    }
    
    // Add randomness
    const randomFactor = 0.8 + (Math.random() * 0.4); // 0.8 - 1.2
    const min = Math.floor(baseMin * multiplier * randomFactor);
    const max = Math.floor(baseMax * multiplier * randomFactor);
    
    return randomInt(min, max);
  }

  /**
   * Sleep for calculated delay
   */
  async sleep(min, max) {
    const delay = this.calculateDelay(min, max);
    return new Promise(resolve => setTimeout(resolve, delay));
  }

  /**
   * Random delay between actions
   */
  async actionDelay() {
    const { minActionDelay, maxActionDelay } = this.config.delays;
    await this.sleep(minActionDelay, maxActionDelay);
    this.actionCount++;
  }

  /**
   * Random delay after page load
   */
  async pageLoadDelay() {
    const { minPageLoadDelay, maxPageLoadDelay } = this.config.delays;
    await this.sleep(minPageLoadDelay, maxPageLoadDelay);
  }

  /**
   * Get typing delay for a character
   */
  getTypingDelay() {
    const { minTypingDelay, maxTypingDelay } = this.config.delays;
    return this.calculateDelay(minTypingDelay, maxTypingDelay);
  }

  /**
   * Type text with human-like delays
   */
  async typeWithDelay(page, selector, text) {
    await page.focus(selector);
    await this.sleep(200, 500);
    
    // Clear existing text
    await page.evaluate((sel) => {
      const el = document.querySelector(sel);
      if (el) el.value = '';
    }, selector);
    await this.sleep(100, 300);
    
    // Type with random delays
    for (const char of text) {
      await page.type(selector, char, { delay: 0 });
      const delay = this.getTypingDelay();
      
      // Occasionally pause longer (thinking)
      if (Math.random() < 0.05) {
        await this.sleep(500, 1500);
      } else {
        await this.sleep(delay * 0.5, delay * 1.5);
      }
    }
    
    this.actionCount++;
  }

  /**
   * Generate human-like mouse movement path
   */
  generateMousePath(startX, startY, endX, endY) {
    const steps = randomInt(
      this.config.mouse.movementSteps.min,
      this.config.mouse.movementSteps.max
    );
    
    const path = [];
    const variance = this.config.mouse.movementVariance;
    
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      
      // Bezier curve with randomness
      const controlX = (startX + endX) / 2 + randomInt(-variance, variance);
      const controlY = (startY + endY) / 2 + randomInt(-variance, variance);
      
      const x = (1 - t) * (1 - t) * startX + 2 * (1 - t) * t * controlX + t * t * endX;
      const y = (1 - t) * (1 - t) * startY + 2 * (1 - t) * t * controlY + t * t * endY;
      
      path.push({
        x: Math.round(x),
        y: Math.round(y),
        delay: randomInt(20, 80)
      });
    }
    
    return path;
  }

  /**
   * Perform human-like mouse movement on page
   */
  async humanMouseMovement(page, targetSelector) {
    if (!this.config.mouse.enableHumanMovement) {
      return;
    }
    
    try {
      // Get target position
      const targetBox = await page.evaluate((sel) => {
        const el = document.querySelector(sel);
        if (!el) return null;
        const rect = el.getBoundingClientRect();
        return {
          x: rect.left + rect.width / 2,
          y: rect.top + rect.height / 2
        };
      }, targetSelector);
      
      if (!targetBox) return;
      
      // Get current mouse position or use center
      const currentPos = await page.evaluate(() => ({
        x: window.innerWidth / 2,
        y: window.innerHeight / 2
      }));
      
      // Generate and execute path
      const path = this.generateMousePath(
        currentPos.x,
        currentPos.y,
        targetBox.x,
        targetBox.y
      );
      
      for (const point of path) {
        await page.mouse.move(point.x, point.y);
        await this.sleep(point.delay * 0.5, point.delay * 1.5);
      }
      
    } catch (error) {
      // Silently fail - mouse movement is cosmetic
    }
  }

  /**
   * Perform human-like click
   */
  async humanClick(page, selector) {
    // Scroll into view
    await page.evaluate((sel) => {
      const el = document.querySelector(sel);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, selector);
    
    await this.sleep(300, 700);
    
    // Move mouse to element
    await this.humanMouseMovement(page, selector);
    
    // Random click delay
    const { min, max } = this.config.mouse.clickDelay;
    await this.sleep(min, max);
    
    // Perform click
    await page.click(selector);
    
    // Post-click delay
    await this.actionDelay();
  }

  /**
   * Generate scroll segments for human-like scrolling
   */
  generateScrollSegments(totalAmount) {
    const steps = randomInt(
      this.config.scroll.scrollSteps.min,
      this.config.scroll.scrollSteps.max
    );
    
    const segments = [];
    let remaining = totalAmount;
    
    for (let i = 0; i < steps && remaining > 0; i++) {
      const variance = this.config.scroll.scrollVariance;
      const baseAmount = remaining / (steps - i);
      const amount = Math.floor(baseAmount + randomInt(variance.min, variance.max));
      
      segments.push({
        amount: Math.min(amount, remaining),
        delay: randomInt(
          this.config.scroll.minScrollDelay,
          this.config.scroll.maxScrollDelay
        )
      });
      
      remaining -= amount;
    }
    
    return segments;
  }

  /**
   * Perform human-like scroll
   */
  async humanScroll(page, options = {}) {
    const direction = options.direction || 'down';
    const amount = options.amount || randomInt(300, 800);
    const duration = options.duration || randomInt(500, 1500);
    
    const segments = this.generateScrollSegments(amount);
    const stepDelay = duration / segments.length;
    
    for (const segment of segments) {
      const scrollAmount = direction === 'down' ? segment.amount : -segment.amount;
      
      await page.evaluate((amt) => {
        window.scrollBy(0, amt);
      }, scrollAmount);
      
      await this.sleep(stepDelay * 0.8, stepDelay * 1.2);
    }
    
    // Pause after scroll
    const { min, max } = this.config.scroll.pauseBetweenScrolls;
    await this.sleep(min, max);
    
    this.actionCount++;
  }

  /**
   * Get anti-detection scripts to inject
   */
  getAntiDetectionScripts() {
    return `
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
      ${this.config.fingerprint.randomizeWebGL ? `
      const getParameter = WebGLRenderingContext.prototype.getParameter;
      WebGLRenderingContext.prototype.getParameter = function(parameter) {
        if (parameter === 37445) return 'Intel Inc.';
        if (parameter === 37446) return 'Intel Iris OpenGL Engine';
        return getParameter(parameter);
      };
      ` : ''}
      
      // Canvas fingerprinting protection
      ${this.config.fingerprint.randomizeCanvas ? `
      const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;
      HTMLCanvasElement.prototype.toDataURL = function(type) {
        if (this.width > 16 && this.height > 16) {
          const ctx = this.getContext('2d');
          if (ctx) {
            const imageData = ctx.getImageData(0, 0, this.width, this.height);
            const data = imageData.data;
            for (let i = 0; i < data.length; i += 4) {
              const noise = (Math.random() - 0.5) * 2;
              data[i] = Math.max(0, Math.min(255, data[i] + noise));
            }
            ctx.putImageData(imageData, 0, 0);
          }
        }
        return originalToDataURL.call(this, type);
      };
      ` : ''}
      
      // Chrome runtime override
      window.chrome = {
        runtime: {
          OnInstalledReason: { 
            CHROME_UPDATE: 'chrome_update', 
            INSTALL: 'install', 
            SHARED_MODULE_UPDATE: 'shared_module_update', 
            UPDATE: 'update' 
          },
          OnRestartRequiredReason: { 
            APP_UPDATE: 'app_update', 
            OS_UPDATE: 'os_update', 
            PERIODIC: 'periodic' 
          },
          PlatformArch: { 
            ARM: 'arm', 
            ARM64: 'arm64', 
            MIPS: 'mips', 
            MIPS64: 'mips64', 
            X86_32: 'x86-32', 
            X86_64: 'x86-64' 
          },
          PlatformOs: { 
            ANDROID: 'android', 
            CROS: 'cros', 
            LINUX: 'linux', 
            MAC: 'mac', 
            OPENBSD: 'openbsd', 
            WIN: 'win' 
          }
        }
      };
    `;
  }

  /**
   * Inject anti-detection scripts into page
   */
  async injectAntiDetection(page) {
    const scripts = this.getAntiDetectionScripts();
    await page.addInitScript(scripts);
  }

  /**
   * Get random action pattern (for varying behavior)
   */
  getRandomActionPattern() {
    const patterns = [
      { name: 'thorough', scrollDepth: 'deep', clickDelay: 1.2 },
      { name: 'quick', scrollDepth: 'shallow', clickDelay: 0.8 },
      { name: 'browsing', scrollDepth: 'medium', clickDelay: 1.0 }
    ];
    return patterns[Math.floor(Math.random() * patterns.length)];
  }

  /**
   * Get session statistics
   */
  getStats() {
    return {
      sessionDuration: Date.now() - this.sessionStartTime,
      actionCount: this.actionCount,
      currentPattern: this.currentPattern,
      userAgent: this.currentUserAgent,
      viewport: this.currentViewport
    };
  }
}

module.exports = {
  AntiBot,
  USER_AGENTS,
  VIEWPORTS,
  BEHAVIOR_PATTERNS,
  DEFAULT_CONFIG
};
