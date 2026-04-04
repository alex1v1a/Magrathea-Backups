/**
 * Anti-Bot Unit Tests
 * Tests for delays, scrolls, mouse movements, and other anti-detection techniques
 */

const { describe, it, expect, beforeAll, afterAll, vi } = require('vitest');
const { MockCDPServer } = require('../mocks/cdp-server');
const { CDPClient } = require('../mocks/cdp-client');
const { 
  HumanBehaviorSimulator,
  StealthUtils,
  TimingUtils,
  MouseUtils,
  ScrollUtils
} = require('./anti-bot-helpers');

describe('Anti-Bot Functions', () => {
  let server;
  let client;
  
  beforeAll(async () => {
    server = new MockCDPServer({ port: 9223 });
    await server.start();
    
    // Create a target
    server.createTarget('https://www.heb.com', 'HEB Test Page');
  });
  
  afterAll(async () => {
    if (client) await client.disconnect();
    if (server) await server.stop();
  });

  describe('HumanBehaviorSimulator', () => {
    it('should generate random delays within expected ranges', async () => {
      const simulator = new HumanBehaviorSimulator();
      
      const delays = [];
      for (let i = 0; i < 100; i++) {
        delays.push(simulator.getRandomDelay('betweenActions'));
      }
      
      // All delays should be between 3000 and 7000ms
      delays.forEach(delay => {
        expect(delay).toBeGreaterThanOrEqual(3000);
        expect(delay).toBeLessThanOrEqual(7000);
      });
      
      // Delays should vary (not all the same)
      const uniqueDelays = new Set(delays);
      expect(uniqueDelays.size).toBeGreaterThan(10);
    });

    it('should generate different delay types with appropriate ranges', () => {
      const simulator = new HumanBehaviorSimulator();
      
      // Test all delay types
      const pageLoad = simulator.getRandomDelay('pageLoad');
      expect(pageLoad).toBeGreaterThanOrEqual(5000);
      expect(pageLoad).toBeLessThanOrEqual(10000);
      
      const afterClick = simulator.getRandomDelay('afterClick');
      expect(afterClick).toBeGreaterThanOrEqual(3000);
      expect(afterClick).toBeLessThanOrEqual(8000);
      
      const afterSearch = simulator.getRandomDelay('afterSearch');
      expect(afterSearch).toBeGreaterThanOrEqual(6000);
      expect(afterSearch).toBeLessThanOrEqual(12000);
    });

    it('should simulate typing with realistic delays', async () => {
      const simulator = new HumanBehaviorSimulator();
      const timings = [];
      
      const startTime = Date.now();
      await simulator.simulateTyping('Hello World', (char, delay) => {
        timings.push({ char, delay, timestamp: Date.now() });
      });
      const endTime = Date.now();
      
      // Should have typed all 11 characters
      expect(timings.length).toBe(11);
      
      // Each character should have a delay between 50-150ms
      timings.forEach(t => {
        expect(t.delay).toBeGreaterThanOrEqual(50);
        expect(t.delay).toBeLessThanOrEqual(150);
      });
      
      // Total time should be roughly consistent with delays
      const expectedMinTime = 11 * 50;
      expect(endTime - startTime).toBeGreaterThanOrEqual(expectedMinTime);
    });

    it('should generate scroll patterns with human-like variation', () => {
      const simulator = new HumanBehaviorSimulator();
      
      const scrollPattern = simulator.generateScrollPattern(1000);
      
      // Should have multiple scroll events
      expect(scrollPattern.length).toBeGreaterThan(3);
      expect(scrollPattern.length).toBeLessThanOrEqual(10);
      
      // Each scroll should have deltaY and delay
      scrollPattern.forEach(scroll => {
        expect(scroll).toHaveProperty('deltaY');
        expect(scroll).toHaveProperty('delay');
        expect(scroll.deltaY).toBeGreaterThanOrEqual(100);
        expect(scroll.deltaY).toBeLessThanOrEqual(500);
        expect(scroll.delay).toBeGreaterThanOrEqual(800);
        expect(scroll.delay).toBeLessThanOrEqual(3000);
      });
    });

    it('should generate mouse path with bezier curves', () => {
      const simulator = new HumanBehaviorSimulator();
      
      const start = { x: 100, y: 100 };
      const end = { x: 500, y: 300 };
      
      const path = simulator.generateMousePath(start, end);
      
      // Path should have multiple points
      expect(path.length).toBeGreaterThan(10);
      expect(path.length).toBeLessThanOrEqual(50);
      
      // Path should start and end at correct positions
      expect(path[0].x).toBe(start.x);
      expect(path[0].y).toBe(start.y);
      expect(path[path.length - 1].x).toBe(end.x);
      expect(path[path.length - 1].y).toBe(end.y);
      
      // Each point should have timing
      path.forEach((point, i) => {
        expect(point).toHaveProperty('x');
        expect(point).toHaveProperty('y');
        expect(point).toHaveProperty('timestamp');
        if (i > 0) {
          expect(point.timestamp).toBeGreaterThanOrEqual(path[i-1].timestamp);
        }
      });
    });

    it('should simulate pauses between actions', async () => {
      const simulator = new HumanBehaviorSimulator();
      
      const startTime = Date.now();
      await simulator.pause('betweenActions');
      const endTime = Date.now();
      
      // Should have waited at least the minimum
      expect(endTime - startTime).toBeGreaterThanOrEqual(3000);
    });
  });

  describe('StealthUtils', () => {
    it('should hide webdriver property', async () => {
      const script = StealthUtils.getWebdriverHiderScript();
      
      expect(script).toContain('webdriver');
      expect(script).toContain('undefined');
      expect(typeof script).toBe('string');
    });

    it('should generate plugins mock', () => {
      const plugins = StealthUtils.getMockPlugins();
      
      expect(Array.isArray(plugins)).toBe(true);
      expect(plugins.length).toBeGreaterThan(0);
      
      plugins.forEach(plugin => {
        expect(plugin).toHaveProperty('name');
        expect(plugin).toHaveProperty('filename');
        expect(plugin).toHaveProperty('description');
      });
    });

    it('should generate WebGL vendor spoof', () => {
      const script = StealthUtils.getWebGLSpoofScript();
      
      expect(script).toContain('UNMASKED_VENDOR_WEBGL');
      expect(script).toContain('UNMASKED_RENDERER_WEBGL');
      expect(typeof script).toBe('string');
    });

    it('should provide canvas fingerprint randomization', () => {
      const script = StealthUtils.getCanvasNoiseScript();
      
      expect(script).toContain('getImageData');
      expect(script).toContain('toDataURL');
      expect(typeof script).toBe('string');
    });

    it('should provide all stealth scripts combined', () => {
      const combined = StealthUtils.getCombinedStealthScript();
      
      expect(typeof combined).toBe('string');
      expect(combined.length).toBeGreaterThan(500);
      
      // Should contain key stealth elements
      expect(combined).toContain('webdriver');
      expect(combined).toContain('plugins');
      expect(combined).toContain('chrome');
    });
  });

  describe('TimingUtils', () => {
    it('should apply jitter to fixed delays', () => {
      const baseDelay = 5000;
      const jitterPercent = 0.2;
      
      const delays = [];
      for (let i = 0; i < 50; i++) {
        delays.push(TimingUtils.withJitter(baseDelay, jitterPercent));
      }
      
      // All should be within jitter range
      delays.forEach(d => {
        expect(d).toBeGreaterThanOrEqual(baseDelay * (1 - jitterPercent));
        expect(d).toBeLessThanOrEqual(baseDelay * (1 + jitterPercent));
      });
      
      // Should have variation
      const unique = new Set(delays);
      expect(unique.size).toBeGreaterThan(1);
    });

    it('should create randomized intervals', () => {
      const { min, max } = TimingUtils.getRandomizedInterval(1000, 0.3);
      
      expect(min).toBe(700);
      expect(max).toBe(1300);
    });

    it('should respect exponential backoff', () => {
      const base = 1000;
      const max = 30000;
      
      // Test increasing delays
      expect(TimingUtils.exponentialBackoff(base, 0, max)).toBe(1000);
      expect(TimingUtils.exponentialBackoff(base, 1, max)).toBe(2000);
      expect(TimingUtils.exponentialBackoff(base, 2, max)).toBe(4000);
      expect(TimingUtils.exponentialBackoff(base, 5, max)).toBe(32000); // capped at max
    });

    it('should handle retry with exponential backoff', async () => {
      let attempts = 0;
      const operation = vi.fn()
        .mockRejectedValueOnce(new Error('Fail 1'))
        .mockRejectedValueOnce(new Error('Fail 2'))
        .mockResolvedValueOnce('Success');
      
      const result = await TimingUtils.retryWithBackoff(operation, {
        maxRetries: 3,
        baseDelay: 100,
        maxDelay: 1000
      });
      
      expect(result).toBe('Success');
      expect(operation).toHaveBeenCalledTimes(3);
    });
  });

  describe('MouseUtils', () => {
    it('should calculate bezier curve points', () => {
      const p0 = { x: 0, y: 0 };
      const p1 = { x: 50, y: 100 };
      const p2 = { x: 100, y: 0 };
      
      const point = MouseUtils.cubicBezier(0.5, p0, p1, p2);
      
      expect(point).toHaveProperty('x');
      expect(point).toHaveProperty('y');
      expect(point.x).toBeGreaterThanOrEqual(0);
      expect(point.x).toBeLessThanOrEqual(100);
    });

    it('should generate control points for curve', () => {
      const start = { x: 100, y: 100 };
      const end = { x: 500, y: 300 };
      
      const { cp1, cp2 } = MouseUtils.generateControlPoints(start, end);
      
      expect(cp1).toHaveProperty('x');
      expect(cp1).toHaveProperty('y');
      expect(cp2).toHaveProperty('x');
      expect(cp2).toHaveProperty('y');
    });

    it('should add noise to mouse position', () => {
      const x = 500;
      const y = 300;
      
      const positions = [];
      for (let i = 0; i < 50; i++) {
        positions.push(MouseUtils.addNoise(x, y, 5));
      }
      
      // All should be close to original
      positions.forEach(p => {
        expect(Math.abs(p.x - x)).toBeLessThanOrEqual(5);
        expect(Math.abs(p.y - y)).toBeLessThanOrEqual(5);
      });
      
      // Should have variation
      const uniqueX = new Set(positions.map(p => p.x));
      expect(uniqueX.size).toBeGreaterThan(1);
    });
  });

  describe('ScrollUtils', () => {
    it('should generate natural scroll deltas', () => {
      const deltas = ScrollUtils.generateNaturalScroll(1000, 5);
      
      expect(deltas.length).toBe(5);
      
      // Sum should approximate target
      const sum = deltas.reduce((a, b) => a + b, 0);
      expect(Math.abs(sum - 1000)).toBeLessThan(100);
      
      // Each delta should be reasonable
      deltas.forEach(d => {
        expect(d).toBeGreaterThan(50);
        expect(d).toBeLessThan(500);
      });
    });

    it('should simulate momentum scrolling', () => {
      const initial = 500;
      const steps = ScrollUtils.simulateMomentum(initial, 0.8, 50);
      
      expect(steps.length).toBeGreaterThan(0);
      
      // Should decelerate
      for (let i = 1; i < steps.length; i++) {
        expect(steps[i]).toBeLessThanOrEqual(steps[i-1]);
      }
      
      // Should eventually stop
      expect(steps[steps.length - 1]).toBeLessThan(50);
    });

    it('should calculate scroll duration based on distance', () => {
      const shortScroll = ScrollUtils.calculateDuration(100);
      const longScroll = ScrollUtils.calculateDuration(1000);
      
      expect(longScroll).toBeGreaterThan(shortScroll);
      expect(shortScroll).toBeGreaterThanOrEqual(200);
      expect(longScroll).toBeLessThanOrEqual(3000);
    });
  });
});

/**
 * Helper classes for anti-bot functionality
 */
class HumanBehaviorSimulator {
  constructor(options = {}) {
    this.delays = {
      pageLoad: { min: 5000, max: 10000 },
      betweenActions: { min: 3000, max: 7000 },
      afterClick: { min: 3000, max: 8000 },
      afterSearch: { min: 6000, max: 12000 },
      afterType: { min: 500, max: 2000 }
    };
    
    this.typingSpeed = {
      min: 50,
      max: 150
    };
    
    Object.assign(this, options);
  }

  getRandomDelay(type) {
    const range = this.delays[type] || this.delays.betweenActions;
    return Math.floor(Math.random() * (range.max - range.min + 1)) + range.min;
  }

  async simulateTyping(text, onChar) {
    for (const char of text) {
      const delay = Math.floor(Math.random() * 
        (this.typingSpeed.max - this.typingSpeed.min + 1)) + this.typingSpeed.min;
      
      if (onChar) {
        onChar(char, delay);
      }
      
      await this._sleep(delay);
    }
  }

  generateScrollPattern(targetScroll) {
    const events = [];
    let remaining = targetScroll;
    
    while (remaining > 0) {
      const delta = Math.min(remaining, Math.floor(Math.random() * 400) + 100);
      const delay = Math.floor(Math.random() * 2200) + 800;
      
      events.push({ deltaY: delta, delay });
      remaining -= delta;
    }
    
    return events;
  }

  generateMousePath(start, end) {
    const points = [];
    const steps = Math.floor(Math.random() * 40) + 10;
    
    // Control points for bezier curve
    const cp1 = {
      x: start.x + (end.x - start.x) * (0.2 + Math.random() * 0.3),
      y: start.y + (end.y - start.y) * 0.5 + (Math.random() - 0.5) * 100
    };
    
    const cp2 = {
      x: start.x + (end.x - start.x) * (0.7 + Math.random() * 0.3),
      y: start.y + (end.y - start.y) * 0.5 + (Math.random() - 0.5) * 100
    };
    
    const baseTime = Date.now();
    
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const point = this._cubicBezier(t, start, cp1, cp2, end);
      
      // Add noise
      point.x += (Math.random() - 0.5) * 2;
      point.y += (Math.random() - 0.5) * 2;
      
      // Add timing with variation
      point.timestamp = baseTime + (i * 16) + Math.floor(Math.random() * 10);
      
      points.push(point);
    }
    
    return points;
  }

  async pause(type) {
    const delay = this.getRandomDelay(type);
    await this._sleep(delay);
  }

  _cubicBezier(t, p0, p1, p2, p3) {
    const mt = 1 - t;
    const mt2 = mt * mt;
    const mt3 = mt2 * mt;
    const t2 = t * t;
    const t3 = t2 * t;
    
    return {
      x: mt3 * p0.x + 3 * mt2 * t * p1.x + 3 * mt * t2 * p2.x + t3 * p3.x,
      y: mt3 * p0.y + 3 * mt2 * t * p1.y + 3 * mt * t2 * p2.y + t3 * p3.y
    };
  }

  _sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

class StealthUtils {
  static getWebdriverHiderScript() {
    return `
      Object.defineProperty(navigator, 'webdriver', {
        get: () => undefined,
        configurable: true
      });
      delete navigator.__proto__.webdriver;
    `;
  }

  static getMockPlugins() {
    return [
      { 
        name: 'Chrome PDF Plugin', 
        filename: 'internal-pdf-viewer', 
        description: 'Portable Document Format' 
      },
      { 
        name: 'Chrome PDF Viewer', 
        filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai', 
        description: 'Portable Document Format' 
      },
      { 
        name: 'Native Client', 
        filename: 'internal-nacl-plugin', 
        description: 'Native Client module' 
      }
    ];
  }

  static getWebGLSpoofScript() {
    return `
      const getParameter = WebGLRenderingContext.prototype.getParameter;
      WebGLRenderingContext.prototype.getParameter = function(parameter) {
        if (parameter === 0x9245) return 'Intel Inc.';
        if (parameter === 0x9246) return 'Intel Iris OpenGL Engine';
        return getParameter(parameter);
      };
    `;
  }

  static getCanvasNoiseScript() {
    return `
      const originalGetContext = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function(type) {
        const context = originalGetContext.call(this, type);
        if (context && type === '2d') {
          const originalGetImageData = context.getImageData;
          context.getImageData = function(x, y, w, h) {
            const imageData = originalGetImageData.call(this, x, y, w, h);
            for (let i = 0; i < imageData.data.length; i += 4) {
              imageData.data[i] += Math.floor(Math.random() * 2) - 1;
            }
            return imageData;
          };
        }
        return context;
      };
    `;
  }

  static getCombinedStealthScript() {
    return `
      // Hide webdriver
      ${this.getWebdriverHiderScript()}
      
      // Mock plugins
      Object.defineProperty(navigator, 'plugins', {
        get: () => ${JSON.stringify(this.getMockPlugins())}
      });
      
      // Mock chrome
      window.chrome = {
        runtime: {},
        csi: function() {},
        loadTimes: function() { return {}; }
      };
      
      // WebGL spoof
      ${this.getWebGLSpoofScript()}
      
      // Canvas noise
      ${this.getCanvasNoiseScript()}
      
      // Languages
      Object.defineProperty(navigator, 'languages', {
        get: () => ['en-US', 'en']
      });
    `;
  }
}

class TimingUtils {
  static withJitter(baseDelay, jitterPercent) {
    const jitter = baseDelay * jitterPercent;
    return baseDelay + (Math.random() * jitter * 2 - jitter);
  }

  static getRandomizedInterval(base, jitterPercent) {
    const jitter = base * jitterPercent;
    return {
      min: Math.floor(base - jitter),
      max: Math.floor(base + jitter)
    };
  }

  static exponentialBackoff(base, attempt, max) {
    return Math.min(base * Math.pow(2, attempt), max);
  }

  static async retryWithBackoff(operation, options = {}) {
    const { maxRetries = 3, baseDelay = 1000, maxDelay = 30000 } = options;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        if (attempt === maxRetries - 1) {
          throw error;
        }
        
        const delay = this.exponentialBackoff(baseDelay, attempt, maxDelay);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
}

class MouseUtils {
  static cubicBezier(t, p0, p1, p2, p3) {
    const mt = 1 - t;
    const mt2 = mt * mt;
    const mt3 = mt2 * mt;
    const t2 = t * t;
    const t3 = t2 * t;
    
    return {
      x: mt3 * p0.x + 3 * mt2 * t * p1.x + 3 * mt * t2 * p2.x + t3 * p3.x,
      y: mt3 * p0.y + 3 * mt2 * t * p1.y + 3 * mt * t2 * p2.y + t3 * p3.y
    };
  }

  static generateControlPoints(start, end) {
    const variance = 100;
    return {
      cp1: {
        x: start.x + (end.x - start.x) * 0.25 + (Math.random() - 0.5) * variance,
        y: start.y + (Math.random() - 0.5) * variance
      },
      cp2: {
        x: start.x + (end.x - start.x) * 0.75 + (Math.random() - 0.5) * variance,
        y: end.y + (Math.random() - 0.5) * variance
      }
    };
  }

  static addNoise(x, y, maxDeviation = 2) {
    return {
      x: x + (Math.random() - 0.5) * maxDeviation * 2,
      y: y + (Math.random() - 0.5) * maxDeviation * 2
    };
  }
}

class ScrollUtils {
  static generateNaturalScroll(target, steps) {
    const deltas = [];
    const base = target / steps;
    
    for (let i = 0; i < steps; i++) {
      // Add natural variation
      const variation = base * (0.8 + Math.random() * 0.4);
      deltas.push(Math.floor(variation));
    }
    
    return deltas;
  }

  static simulateMomentum(initial, friction, threshold) {
    const steps = [];
    let current = initial;
    
    while (current > threshold) {
      steps.push(current);
      current *= friction;
    }
    
    return steps;
  }

  static calculateDuration(distance) {
    // Base duration + variable based on distance
    return Math.min(2000, 200 + distance * 2);
  }
}

module.exports = {
  HumanBehaviorSimulator,
  StealthUtils,
  TimingUtils,
  MouseUtils,
  ScrollUtils
};
