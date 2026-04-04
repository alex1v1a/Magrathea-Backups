/**
 * Anti-Detection Library for Browser Automation
 * Implements 2025 best practices for stealth automation
 * 
 * Usage:
 *   const { StealthPage, HumanBehavior } = require('./anti-detection');
 */

const { chromium } = require('playwright');

// ============================================================================
// STEALTH PAGE - Pre-configured page with anti-detection
// ============================================================================

class StealthPage {
  constructor(page) {
    this.page = page;
    this._appliedPatches = new Set();
  }

  /**
   * Apply all anti-detection patches
   */
  async applyAllPatches() {
    await this.patchNavigatorWebdriver();
    await this.patchPlugins();
    await this.patchWebGL();
    await this.patchPermissions();
    await this.patchChromeRuntime();
    return this;
  }

  /**
   * Remove navigator.webdriver property
   */
  async patchNavigatorWebdriver() {
    if (this._appliedPatches.has('webdriver')) return;
    
    await this.page.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', {
        get: () => undefined
      });
    });
    
    this._appliedPatches.add('webdriver');
  }

  /**
   * Add realistic plugin mimeTypes
   */
  async patchPlugins() {
    if (this._appliedPatches.has('plugins')) return;
    
    await this.page.addInitScript(() => {
      // Fake plugins
      Object.defineProperty(navigator, 'plugins', {
        get: () => [
          {
            0: { type: 'application/pdf' },
            description: 'Portable Document Format',
            filename: 'internal-pdf-viewer',
            name: 'PDF Viewer'
          },
          {
            0: { type: 'application/x-google-chrome-pdf' },
            description: 'Portable Document Format',
            filename: 'internal-pdf-viewer2',
            name: 'Chrome PDF Viewer'
          }
        ]
      });

      // Fake mimeTypes
      Object.defineProperty(navigator, 'mimeTypes', {
        get: () => [
          { type: 'application/pdf', suffixes: 'pdf', description: 'Portable Document Format' },
          { type: 'application/x-google-chrome-pdf', suffixes: 'pdf', description: 'Portable Document Format' }
        ]
      });
    });
    
    this._appliedPatches.add('plugins');
  }

  /**
   * Spoof WebGL vendor/renderer
   */
  async patchWebGL() {
    if (this._appliedPatches.has('webgl')) return;
    
    await this.page.addInitScript(() => {
      const getParameter = WebGLRenderingContext.prototype.getParameter;
      WebGLRenderingContext.prototype.getParameter = function(parameter) {
        if (parameter === 37445) {
          return 'Intel Inc.'; // UNMASKED_VENDOR_WEBGL
        }
        if (parameter === 37446) {
          return 'Intel Iris OpenGL Engine'; // UNMASKED_RENDERER_WEBGL
        }
        return getParameter(parameter);
      };
    });
    
    this._appliedPatches.add('webgl');
  }

  /**
   * Override permissions API
   */
  async patchPermissions() {
    if (this._appliedPatches.has('permissions')) return;
    
    await this.page.addInitScript(() => {
      const originalQuery = window.navigator.permissions.query;
      window.navigator.permissions.query = (parameters) => {
        return Promise.resolve({ state: 'prompt', onchange: null });
      };
    });
    
    this._appliedPatches.add('permissions');
  }

  /**
   * Remove Chrome automation markers
   */
  async patchChromeRuntime() {
    if (this._appliedPatches.has('chrome')) return;
    
    await this.page.addInitScript(() => {
      window.chrome = window.chrome || {};
      window.chrome.runtime = window.chrome.runtime || {};
      
      // Remove automation-specific properties
      delete window.chrome.runtime.OnInstalledReason;
      delete window.chrome.runtime.OnRestartRequiredReason;
      delete window.chrome.runtime.OnConnectReason;
      delete window.chrome.runtime.OnSuspendReason;
    });
    
    this._appliedPatches.add('chrome');
  }

  /**
   * Get the underlying page
   */
  getPage() {
    return this.page;
  }
}

// ============================================================================
// HUMAN BEHAVIOR - Realistic user simulation
// ============================================================================

class HumanBehavior {
  constructor(page) {
    this.page = page;
  }

  /**
   * Gaussian random for more human-like delays
   */
  static gaussianRandom(min, max) {
    const u = 1 - Math.random();
    const v = Math.random();
    const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
    const mean = (min + max) / 2;
    const stdDev = (max - min) / 6;
    const result = Math.round(mean + z * stdDev);
    return Math.max(min, Math.min(max, result));
  }

  /**
   * Random delay with gaussian distribution
   */
  async delay(min, max, distribution = 'gaussian') {
    const delay = distribution === 'gaussian' 
      ? HumanBehavior.gaussianRandom(min, max)
      : Math.floor(Math.random() * (max - min + 1)) + min;
    
    await this.page.waitForTimeout(delay);
    return delay;
  }

  /**
   * Human-like scrolling
   */
  async scroll(amount = null, options = {}) {
    const scrollAmount = amount || Math.floor(Math.random() * 300) + 100;
    const direction = options.direction || 'down';
    const smooth = options.smooth !== false;
    
    if (smooth) {
      // Smooth scroll in steps
      const steps = Math.floor(Math.random() * 3) + 2;
      const stepAmount = scrollAmount / steps;
      
      for (let i = 0; i < steps; i++) {
        await this.page.evaluate((amt) => {
          window.scrollBy({ top: amt, behavior: 'smooth' });
        }, direction === 'down' ? stepAmount : -stepAmount);
        
        await this.delay(200, 500);
      }
    } else {
      await this.page.evaluate((amt) => {
        window.scrollBy(0, amt);
      }, direction === 'down' ? scrollAmount : -scrollAmount);
    }
    
    // Pause after scroll
    await this.delay(500, 1200);
  }

  /**
   * Human-like mouse movement
   */
  async moveTo(selector, options = {}) {
    const element = await this.page.locator(selector).first();
    const box = await element.boundingBox();
    
    if (!box) return false;
    
    // Add randomness to target position
    const x = box.x + (options.offsetX || Math.random() * box.width * 0.8 + box.width * 0.1);
    const y = box.y + (options.offsetY || Math.random() * box.height * 0.8 + box.height * 0.1);
    
    // Move with bezier curve simulation
    const steps = options.steps || Math.floor(Math.random() * 5) + 5;
    const currentPos = await this.page.evaluate(() => ({ x: 0, y: 0 })); // Simplified
    
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      const easeT = t * t * (3 - 2 * t); // Smoothstep easing
      
      const moveX = currentPos.x + (x - currentPos.x) * easeT;
      const moveY = currentPos.y + (y - currentPos.y) * easeT;
      
      await this.page.mouse.move(moveX, moveY);
      await this.delay(10, 30);
    }
    
    return true;
  }

  /**
   * Human-like typing
   */
  async type(selector, text, options = {}) {
    const element = await this.page.locator(selector).first();
    await element.focus();
    
    const wpm = options.wpm || 60; // Words per minute
    const msPerChar = (60 * 1000) / (wpm * 5); // Approx chars per word
    
    for (const char of text) {
      // Variable typing speed
      const variance = Math.random() * 0.4 + 0.8; // 0.8x to 1.2x
      const delay = msPerChar * variance;
      
      // Occasional pause (like thinking)
      if (Math.random() < 0.05) {
        await this.delay(200, 800);
      }
      
      await element.press(char);
      await this.page.waitForTimeout(delay);
    }
    
    // Pause after typing
    await this.delay(300, 700);
  }

  /**
   * Human-like click
   */
  async click(selector, options = {}) {
    const element = await this.page.locator(selector).first();
    
    // Move to element first
    await this.moveTo(selector, options);
    
    // Small pause before click
    await this.delay(100, 300);
    
    // Click with slight delay
    await element.click({ 
      delay: Math.floor(Math.random() * 100) + 50,
      button: options.button || 'left'
    });
    
    // Pause after click
    await this.delay(200, 500);
  }

  /**
   * Simulate reading/browsing behavior
   */
  async browse(durationMs = 5000) {
    const endTime = Date.now() + durationMs;
    
    while (Date.now() < endTime) {
      // Random scroll
      if (Math.random() < 0.7) {
        await this.scroll();
      }
      
      // Random pause (reading)
      await this.delay(1000, 3000);
      
      // Occasional small scroll back up
      if (Math.random() < 0.2) {
        await this.scroll(Math.floor(Math.random() * 100) + 50, { direction: 'up' });
      }
    }
  }
}

// ============================================================================
// SESSION MANAGER - Persistent session handling
// ============================================================================

class SessionManager {
  constructor(storagePath) {
    this.storagePath = storagePath;
    this.sessions = new Map();
  }

  /**
   * Save session state
   */
  async saveSession(name, context) {
    const storage = await context.storageState();
    this.sessions.set(name, {
      storage,
      timestamp: Date.now()
    });
    
    // Persist to disk if path provided
    if (this.storagePath) {
      const fs = require('fs').promises;
      const path = require('path');
      const filePath = path.join(this.storagePath, `${name}.json`);
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, JSON.stringify(storage, null, 2));
    }
  }

  /**
   * Load session state
   */
  async loadSession(name) {
    // Try memory first
    if (this.sessions.has(name)) {
      return this.sessions.get(name).storage;
    }
    
    // Try disk
    if (this.storagePath) {
      try {
        const fs = require('fs').promises;
        const path = require('path');
        const filePath = path.join(this.storagePath, `${name}.json`);
        const data = await fs.readFile(filePath, 'utf8');
        return JSON.parse(data);
      } catch {
        return null;
      }
    }
    
    return null;
  }

  /**
   * Create context with saved session
   */
  async createContext(browser, sessionName = null) {
    const options = {};
    
    if (sessionName) {
      const storage = await this.loadSession(sessionName);
      if (storage) {
        options.storageState = storage;
      }
    }
    
    return await browser.newContext(options);
  }
}

// ============================================================================
// USER AGENT ROTATION
// ============================================================================

const USER_AGENTS = {
  chrome: [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36'
  ],
  edge: [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0'
  ],
  firefox: [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:109.0) Gecko/20100101 Firefox/121.0'
  ]
};

function getRandomUserAgent(browser = 'chrome') {
  const agents = USER_AGENTS[browser] || USER_AGENTS.chrome;
  return agents[Math.floor(Math.random() * agents.length)];
}

function rotateUserAgent() {
  const browsers = Object.keys(USER_AGENTS);
  const browser = browsers[Math.floor(Math.random() * browsers.length)];
  return getRandomUserAgent(browser);
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  StealthPage,
  HumanBehavior,
  SessionManager,
  getRandomUserAgent,
  rotateUserAgent,
  USER_AGENTS
};
