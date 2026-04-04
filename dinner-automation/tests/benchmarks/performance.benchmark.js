import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { chromium } from 'playwright';
import { BrowserPool } from '../../utils/browser-pool.js';
import { ParallelProcessor } from '../../utils/parallel-processor.js';

/**
 * Browser Performance Benchmarks
 * 
 * These benchmarks measure:
 * - Browser launch time
 * - Context creation overhead
 * - Page navigation speed
 * - Selector performance
 * - Memory usage patterns
 */

describe('Browser Launch Benchmarks', () => {
  it('should measure cold browser launch time', async () => {
    const start = performance.now();
    const browser = await chromium.launch({ headless: true });
    const launchTime = performance.now() - start;
    
    console.log(`Cold browser launch: ${launchTime.toFixed(0)}ms`);
    expect(launchTime).toBeLessThan(5000); // Should launch under 5s
    
    await browser.close();
  });

  it('should measure context creation vs new browser', async () => {
    const browser = await chromium.launch({ headless: true });
    
    // Measure new browser launch
    const browserStart = performance.now();
    const browser2 = await chromium.launch({ headless: true });
    const browserTime = performance.now() - browserStart;
    await browser2.close();
    
    // Measure context creation
    const contextStart = performance.now();
    const context = await browser.newContext();
    const contextTime = performance.now() - contextStart;
    await context.close();
    
    console.log(`New browser: ${browserTime.toFixed(0)}ms`);
    console.log(`New context: ${contextTime.toFixed(0)}ms`);
    console.log(`Context is ${(browserTime/contextTime).toFixed(1)}x faster`);
    
    await browser.close();
  });
});

describe('Browser Pool Benchmarks', () => {
  let pool;

  afterAll(async () => {
    if (pool) await pool.close();
  });

  it('should benchmark pool acquisition vs fresh browser', async () => {
    // Fresh browser approach
    const freshStart = performance.now();
    const browser1 = await chromium.launch({ headless: true });
    const page1 = await browser1.newPage();
    await page1.goto('https://example.com');
    const freshTime = performance.now() - freshStart;
    await browser1.close();

    // Pool approach
    pool = new BrowserPool({ 
      maxContexts: 2,
      launchOptions: { headless: true }
    });
    
    // Warm up pool
    const { release } = await pool.acquirePage({ url: 'https://example.com' });
    await release();
    
    // Measure pooled acquisition
    const poolStart = performance.now();
    const { page: page2, release: release2 } = await pool.acquirePage({ url: 'https://example.com' });
    const poolTime = performance.now() - poolStart;
    await release2();

    console.log(`Fresh browser + navigate: ${freshTime.toFixed(0)}ms`);
    console.log(`Pooled acquisition: ${poolTime.toFixed(0)}ms`);
    console.log(`Pool speedup: ${(freshTime/poolTime).toFixed(1)}x`);
    
    expect(poolTime).toBeLessThan(freshTime * 0.5); // Pool should be 2x+ faster
  });

  it('should measure concurrent page performance', async () => {
    pool = new BrowserPool({ 
      maxContexts: 5,
      maxPagesPerContext: 3,
      launchOptions: { headless: true }
    });

    const urls = ['https://example.com', 'https://example.org', 'https://example.net'];
    
    const start = performance.now();
    const results = await Promise.all(
      urls.map(url => pool.withPage(async page => {
        await page.goto(url, { waitUntil: 'networkidle' });
        return page.url();
      }))
    );
    const totalTime = performance.now() - start;

    console.log(`3 concurrent navigations: ${totalTime.toFixed(0)}ms`);
    console.log(`Average per page: ${(totalTime/3).toFixed(0)}ms`);
    
    expect(results).toHaveLength(3);
    expect(totalTime).toBeLessThan(10000); // Should complete under 10s
  });
});

describe('Selector Performance Benchmarks', () => {
  let browser;
  let page;

  beforeAll(async () => {
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    page = await context.newPage();
    await page.goto('https://example.com');
  });

  afterAll(async () => {
    await browser.close();
  });

  it('should compare selector strategies', async () => {
    const iterations = 100;
    
    // CSS selector
    const cssStart = performance.now();
    for (let i = 0; i < iterations; i++) {
      await page.locator('h1').count();
    }
    const cssTime = performance.now() - cssStart;
    
    // Text selector
    const textStart = performance.now();
    for (let i = 0; i < iterations; i++) {
      await page.getByText('Example Domain').count();
    }
    const textTime = performance.now() - textStart;
    
    // Role selector
    const roleStart = performance.now();
    for (let i = 0; i < iterations; i++) {
      await page.getByRole('heading').count();
    }
    const roleTime = performance.now() - roleStart;

    console.log(`CSS selector: ${(cssTime/iterations).toFixed(2)}ms avg`);
    console.log(`Text selector: ${(textTime/iterations).toFixed(2)}ms avg`);
    console.log(`Role selector: ${(roleTime/iterations).toFixed(2)}ms avg`);
    
    expect(cssTime).toBeLessThan(textTime); // CSS should be fastest
  });
});

describe('Parallel Processing Benchmarks', () => {
  it('should measure parallel vs sequential processing', async () => {
    const items = Array.from({ length: 20 }, (_, i) => i);
    const processor = async (n) => {
      await new Promise(r => setTimeout(r, 100)); // 100ms work
      return n * 2;
    };

    // Sequential
    const seqStart = performance.now();
    for (const item of items) {
      await processor(item);
    }
    const seqTime = performance.now() - seqStart;

    // Parallel (concurrency 5)
    const pp = new ParallelProcessor({ concurrency: 5 });
    const parStart = performance.now();
    await pp.process(items, processor);
    const parTime = performance.now() - parStart;

    console.log(`Sequential: ${seqTime.toFixed(0)}ms`);
    console.log(`Parallel (5x): ${parTime.toFixed(0)}ms`);
    console.log(`Speedup: ${(seqTime/parTime).toFixed(1)}x`);

    pp.destroy();
    
    expect(parTime).toBeLessThan(seqTime * 0.5);
  });

  it('should measure rate limiting overhead', async () => {
    const pp = new ParallelProcessor({ rateLimit: 10 }); // 10/sec
    const items = Array.from({ length: 10 }, (_, i) => i);
    
    const start = performance.now();
    await pp.process(items, async (n) => n * 2);
    const elapsed = performance.now() - start;

    console.log(`10 items at 10/sec rate limit: ${elapsed.toFixed(0)}ms`);
    
    // Should take roughly 1 second (10 items at 10/sec)
    expect(elapsed).toBeGreaterThan(800);
    expect(elapsed).toBeLessThan(1500);

    pp.destroy();
  });
});

describe('Memory Usage Benchmarks', () => {
  it('should track memory during browser operations', async () => {
    const getMemory = () => ({
      heapUsed: (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(1),
      rss: (process.memoryUsage().rss / 1024 / 1024).toFixed(1)
    });

    const before = getMemory();
    console.log(`Before: Heap ${before.heapUsed}MB, RSS ${before.rss}MB`);

    const pool = new BrowserPool({ maxContexts: 3 });
    
    // Acquire multiple pages
    const acquisitions = [];
    for (let i = 0; i < 5; i++) {
      const { page, release } = await pool.acquirePage({ url: 'about:blank' });
      acquisitions.push({ page, release });
    }

    const during = getMemory();
    console.log(`During: Heap ${during.heapUsed}MB, RSS ${during.rss}MB`);

    // Release all
    for (const { release } of acquisitions) {
      await release();
    }

    await pool.close();

    // Force garbage collection if available
    if (global.gc) global.gc();
    await new Promise(r => setTimeout(r, 100));

    const after = getMemory();
    console.log(`After: Heap ${after.heapUsed}MB, RSS ${after.rss}MB`);

    expect(true).toBe(true); // Memory tracking only
  });
});
