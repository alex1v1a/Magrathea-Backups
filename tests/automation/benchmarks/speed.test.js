/**
 * Performance Benchmarks
 * Measure operation times for browser automation
 */

const { describe, it, expect, beforeAll, afterAll, beforeEach } = require('vitest');
const { MockCDPServer } = require('../mocks/cdp-server');
const { CDPClient } = require('../mocks/cdp-client');
const { performance } = require('perf_hooks');

describe('Performance Benchmarks', () => {
  let server;
  let client;
  let benchmarkResults = [];
  
  beforeAll(async () => {
    server = new MockCDPServer({ port: 9225 });
    await server.start();
    server.createTarget('https://www.heb.com', 'HEB Benchmark');
  });
  
  afterAll(async () => {
    if (client) await client.disconnect();
    if (server) await server.stop();
    
    // Print benchmark summary
    console.log('\n📊 Benchmark Summary:\n');
    printBenchmarkReport(benchmarkResults);
  });

  describe('Connection Benchmarks', () => {
    beforeEach(async () => {
      if (client) await client.disconnect();
    });

    it('should connect to CDP in under 100ms', async () => {
      client = new CDPClient({ port: 9225 });
      
      const start = performance.now();
      await client.connect();
      const duration = performance.now() - start;
      
      recordBenchmark('CDP Connection', duration, 100);
      expect(duration).toBeLessThan(100);
    });

    it('should enable Page domain in under 50ms', async () => {
      client = new CDPClient({ port: 9225 });
      await client.connect();
      
      const start = performance.now();
      await client.enableDomain('Page');
      const duration = performance.now() - start;
      
      recordBenchmark('Enable Page Domain', duration, 50);
      expect(duration).toBeLessThan(50);
    });

    it('should enable all domains in under 200ms', async () => {
      client = new CDPClient({ port: 9225 });
      await client.connect();
      
      const domains = ['Page', 'DOM', 'Runtime', 'Network'];
      
      const start = performance.now();
      for (const domain of domains) {
        await client.enableDomain(domain);
      }
      const duration = performance.now() - start;
      
      recordBenchmark('Enable All Domains', duration, 200);
      expect(duration).toBeLessThan(200);
    });
  });

  describe('Navigation Benchmarks', () => {
    beforeEach(async () => {
      if (client) await client.disconnect();
      client = new CDPClient({ port: 9225 });
      await client.connect();
      await client.enableDomain('Page');
    });

    it('should navigate to page in under 500ms', async () => {
      const start = performance.now();
      await client.navigate('https://www.heb.com');
      const duration = performance.now() - start;
      
      recordBenchmark('Page Navigation', duration, 500);
      expect(duration).toBeLessThan(500);
    });

    it('should reload page in under 300ms', async () => {
      const start = performance.now();
      await client.send('Page.reload', { ignoreCache: false });
      const duration = performance.now() - start;
      
      recordBenchmark('Page Reload', duration, 300);
      expect(duration).toBeLessThan(300);
    });
  });

  describe('DOM Operation Benchmarks', () => {
    beforeEach(async () => {
      if (client) await client.disconnect();
      client = new CDPClient({ port: 9225 });
      await client.connect();
      await client.enableDomain('DOM');
    });

    it('should query DOM in under 50ms', async () => {
      await client.send('DOM.getDocument');
      
      const start = performance.now();
      await client.querySelector('button');
      const duration = performance.now() - start;
      
      recordBenchmark('DOM Query', duration, 50);
      expect(duration).toBeLessThan(50);
    });

    it('should query multiple elements in under 100ms', async () => {
      const start = performance.now();
      await client.send('DOM.querySelectorAll', {
        nodeId: 1,
        selector: 'button'
      });
      const duration = performance.now() - start;
      
      recordBenchmark('DOM Query All', duration, 100);
      expect(duration).toBeLessThan(100);
    });

    it('should get box model in under 50ms', async () => {
      const start = performance.now();
      await client.send('DOM.getBoxModel', { nodeId: 100 });
      const duration = performance.now() - start;
      
      recordBenchmark('Get Box Model', duration, 50);
      expect(duration).toBeLessThan(50);
    });
  });

  describe('JavaScript Evaluation Benchmarks', () => {
    beforeEach(async () => {
      if (client) await client.disconnect();
      client = new CDPClient({ port: 9225 });
      await client.connect();
      await client.enableDomain('Runtime');
    });

    it('should evaluate simple JS in under 20ms', async () => {
      const start = performance.now();
      await client.evaluate('1 + 1');
      const duration = performance.now() - start;
      
      recordBenchmark('Simple JS Evaluation', duration, 20);
      expect(duration).toBeLessThan(20);
    });

    it('should evaluate complex JS in under 100ms', async () => {
      const complexScript = `
        (function() {
          let sum = 0;
          for (let i = 0; i < 1000; i++) {
            sum += Math.sqrt(i);
          }
          return sum;
        })()
      `;
      
      const start = performance.now();
      await client.evaluate(complexScript);
      const duration = performance.now() - start;
      
      recordBenchmark('Complex JS Evaluation', duration, 100);
      expect(duration).toBeLessThan(100);
    });

    it('should evaluate navigator check in under 30ms', async () => {
      const stealthScript = `
        Object.defineProperty(navigator, 'webdriver', {
          get: () => undefined
        });
        navigator.webdriver
      `;
      
      const start = performance.now();
      await client.evaluate(stealthScript);
      const duration = performance.now() - start;
      
      recordBenchmark('Stealth Script Evaluation', duration, 30);
      expect(duration).toBeLessThan(30);
    });
  });

  describe('Input Action Benchmarks', () => {
    beforeEach(async () => {
      if (client) await client.disconnect();
      client = new CDPClient({ port: 9225 });
      await client.connect();
      await client.enableDomain('Input');
    });

    it('should dispatch mouse event in under 20ms', async () => {
      const start = performance.now();
      await client.send('Input.dispatchMouseEvent', {
        type: 'mouseMoved',
        x: 100,
        y: 100
      });
      const duration = performance.now() - start;
      
      recordBenchmark('Mouse Event Dispatch', duration, 20);
      expect(duration).toBeLessThan(20);
    });

    it('should dispatch key event in under 20ms', async () => {
      const start = performance.now();
      await client.send('Input.dispatchKeyEvent', {
        type: 'char',
        text: 'a'
      });
      const duration = performance.now() - start;
      
      recordBenchmark('Key Event Dispatch', duration, 20);
      expect(duration).toBeLessThan(20);
    });

    it('should perform full click in under 100ms', async () => {
      const start = performance.now();
      await client.click(500, 300);
      const duration = performance.now() - start;
      
      recordBenchmark('Full Click Action', duration, 100);
      expect(duration).toBeLessThan(100);
    });

    it('should type 10 characters in under 500ms', async () => {
      const start = performance.now();
      await client.type('helloworld', { delay: 1 }); // Fast for benchmark
      const duration = performance.now() - start;
      
      recordBenchmark('Type 10 Characters', duration, 500);
      expect(duration).toBeLessThan(500);
    });
  });

  describe('Screenshot Benchmarks', () => {
    beforeEach(async () => {
      if (client) await client.disconnect();
      client = new CDPClient({ port: 9225 });
      await client.connect();
      await client.enableDomain('Page');
    });

    it('should capture screenshot in under 200ms', async () => {
      const start = performance.now();
      await client.screenshot();
      const duration = performance.now() - start;
      
      recordBenchmark('Screenshot Capture', duration, 200);
      expect(duration).toBeLessThan(200);
    });

    it('should capture screenshot with clip in under 200ms', async () => {
      const start = performance.now();
      await client.screenshot({
        clip: { x: 0, y: 0, width: 800, height: 600 }
      });
      const duration = performance.now() - start;
      
      recordBenchmark('Clipped Screenshot', duration, 200);
      expect(duration).toBeLessThan(200);
    });
  });

  describe('Network Benchmarks', () => {
    beforeEach(async () => {
      if (client) await client.disconnect();
      client = new CDPClient({ port: 9225 });
      await client.connect();
      await client.enableDomain('Network');
    });

    it('should enable network in under 50ms', async () => {
      const start = performance.now();
      await client.send('Network.enable');
      const duration = performance.now() - start;
      
      recordBenchmark('Enable Network', duration, 50);
      expect(duration).toBeLessThan(50);
    });

    it('should set user agent in under 30ms', async () => {
      const start = performance.now();
      await client.send('Network.setUserAgentOverride', {
        userAgent: 'Mozilla/5.0'
      });
      const duration = performance.now() - start;
      
      recordBenchmark('Set User Agent', duration, 30);
      expect(duration).toBeLessThan(30);
    });
  });

  describe('Anti-Bot Action Benchmarks', () => {
    beforeEach(async () => {
      if (client) await client.disconnect();
      client = new CDPClient({ port: 9225 });
      await client.connect();
      await client.enableDomain('Input');
    });

    it('should generate mouse path in under 10ms', async () => {
      const generatePath = () => {
        const points = [];
        const steps = 20;
        for (let i = 0; i <= steps; i++) {
          points.push({
            x: 100 + (i / steps) * 400,
            y: 100 + Math.sin(i / steps * Math.PI) * 100
          });
        }
        return points;
      };
      
      const start = performance.now();
      generatePath();
      const duration = performance.now() - start;
      
      recordBenchmark('Generate Mouse Path', duration, 10);
      expect(duration).toBeLessThan(10);
    });

    it('should calculate bezier curve in under 5ms', async () => {
      const p0 = { x: 0, y: 0 };
      const p1 = { x: 50, y: 100 };
      const p2 = { x: 100, y: 0 };
      
      const start = performance.now();
      for (let t = 0; t <= 1; t += 0.01) {
        const mt = 1 - t;
        const x = mt * mt * p0.x + 2 * mt * t * p1.x + t * t * p2.x;
        const y = mt * mt * p0.y + 2 * mt * t * p1.y + t * t * p2.y;
      }
      const duration = performance.now() - start;
      
      recordBenchmark('Bezier Calculation (100 points)', duration, 5);
      expect(duration).toBeLessThan(5);
    });
  });

  describe('Full Operation Benchmarks', () => {
    beforeEach(async () => {
      if (client) await client.disconnect();
      client = new CDPClient({ port: 9225 });
    });

    it('should complete full setup in under 1s', async () => {
      const start = performance.now();
      
      await client.connect();
      await client.enableDomain('Page');
      await client.enableDomain('DOM');
      await client.enableDomain('Runtime');
      await client.enableDomain('Input');
      await client.navigate('https://www.heb.com');
      
      const duration = performance.now() - start;
      
      recordBenchmark('Full Setup', duration, 1000);
      expect(duration).toBeLessThan(1000);
    });

    it('should perform search flow in under 2s', async () => {
      await client.connect();
      await client.enableDomain('Page');
      await client.navigate('https://www.heb.com');
      
      const start = performance.now();
      
      // Simulate search flow
      await client.send('Runtime.evaluate', {
        expression: 'document.querySelector("input").focus()'
      });
      await client.type('milk', { delay: 1 });
      await client.send('Input.dispatchKeyEvent', {
        type: 'keyDown',
        key: 'Enter'
      });
      await client.navigate('https://www.heb.com/search?q=milk');
      
      const duration = performance.now() - start;
      
      recordBenchmark('Search Flow', duration, 2000);
      expect(duration).toBeLessThan(2000);
    });
  });

  describe('Load Testing', () => {
    beforeEach(async () => {
      if (client) await client.disconnect();
      client = new CDPClient({ port: 9225 });
      await client.connect();
    });

    it('should handle 100 DOM queries in under 2s', async () => {
      await client.enableDomain('DOM');
      
      const start = performance.now();
      
      for (let i = 0; i < 100; i++) {
        await client.querySelector('button');
      }
      
      const duration = performance.now() - start;
      const avgDuration = duration / 100;
      
      recordBenchmark('100 DOM Queries', duration, 2000, avgDuration);
      expect(duration).toBeLessThan(2000);
    });

    it('should handle 50 JS evaluations in under 1s', async () => {
      await client.enableDomain('Runtime');
      
      const start = performance.now();
      
      for (let i = 0; i < 50; i++) {
        await client.evaluate(`document.title + ${i}`);
      }
      
      const duration = performance.now() - start;
      const avgDuration = duration / 50;
      
      recordBenchmark('50 JS Evaluations', duration, 1000, avgDuration);
      expect(duration).toBeLessThan(1000);
    });

    it('should handle 1000 mouse events in under 3s', async () => {
      await client.enableDomain('Input');
      
      const start = performance.now();
      
      for (let i = 0; i < 1000; i++) {
        await client.send('Input.dispatchMouseEvent', {
          type: 'mouseMoved',
          x: i % 100,
          y: Math.floor(i / 100)
        });
      }
      
      const duration = performance.now() - start;
      const avgDuration = duration / 1000;
      
      recordBenchmark('1000 Mouse Events', duration, 3000, avgDuration);
      expect(duration).toBeLessThan(3000);
    });
  });

  // Helper functions

  function recordBenchmark(name, duration, threshold, avgDuration = null) {
    const passed = duration < threshold;
    benchmarkResults.push({
      name,
      duration: Math.round(duration * 100) / 100,
      threshold,
      passed,
      avgDuration: avgDuration ? Math.round(avgDuration * 100) / 100 : null
    });
  }

  function printBenchmarkReport(results) {
    const passed = results.filter(r => r.passed);
    const failed = results.filter(r => !r.passed);
    
    console.log(`Total: ${results.length} | ✅ Passed: ${passed.length} | ❌ Failed: ${failed.length}\n`);
    
    // Sort by duration
    const sorted = [...results].sort((a, b) => b.duration - a.duration);
    
    console.log('Slowest operations:');
    sorted.slice(0, 5).forEach((r, i) => {
      const status = r.passed ? '✅' : '❌';
      const avg = r.avgDuration ? ` (avg: ${r.avgDuration}ms)` : '';
      console.log(`  ${i + 1}. ${status} ${r.name}: ${r.duration}ms / ${r.threshold}ms threshold${avg}`);
    });
    
    if (failed.length > 0) {
      console.log('\n⚠️ Failed thresholds:');
      failed.forEach(r => {
        const percentOver = Math.round((r.duration / r.threshold - 1) * 100);
        console.log(`  ❌ ${r.name}: ${r.duration}ms (${percentOver}% over threshold)`);
      });
    }
    
    console.log('');
  }
});

// Export for use by other tests
module.exports = { printBenchmarkReport };
