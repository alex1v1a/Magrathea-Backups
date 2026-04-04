/**
 * Advanced Anti-Bot Protection Module
 * Implements research-backed techniques for evading detection
 * 
 * Techniques from 2025 research:
 * - Randomized delays with gaussian distribution (more human-like)
 * - Mouse movement simulation
 * - Variable typing speeds
 * - Session behavior fingerprinting
 * - Intelligent viewport management
 */

const { chromium } = require('playwright');

/**
 * Gaussian random delay (bell curve - more human-like than uniform)
 */
function gaussianDelay(mean, stdDev) {
  // Box-Muller transform
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  const delay = Math.max(0, mean + stdDev * z);
  return new Promise(r => setTimeout(r, delay));
}

/**
 * Random delay within range (uniform distribution fallback)
 */
function randomDelay(min, max) {
  const delay = Math.floor(Math.random() * (max - min + 1)) + min;
  return new Promise(r => setTimeout(r, delay));
}

/**
 * Variable typing speed (simulates human typing)
 * @param {Object} page - Playwright page
 * @param {string} selector - Input selector
 * @param {string} text - Text to type
 */
async function humanLikeType(page, selector, text) {
  const element = await page.locator(selector).first();
  await element.focus();
  
  for (const char of text) {
    // Base typing speed: 50-150ms per character
    const baseDelay = Math.random() * 100 + 50;
    
    // Occasionally pause longer (thinking)
    const thinking = Math.random() > 0.95 ? Math.random() * 500 : 0;
    
    // Occasional typo and correction (1% chance)
    if (Math.random() > 0.99) {
      const wrongChar = String.fromCharCode(97 + Math.floor(Math.random() * 26));
      await element.type(wrongChar, { delay: baseDelay });
      await randomDelay(100, 300);
      await element.press('Backspace');
      await randomDelay(100, 200);
    }
    
    await element.type(char, { delay: baseDelay });
    await randomDelay(0, thinking);
  }
}

/**
 * Simulate human-like mouse movement to an element
 */
async function humanLikeMove(page, selector) {
  const element = await page.locator(selector).first();
  const box = await element.boundingBox();
  
  if (!box) return;
  
  // Target center of element with slight randomness
  const targetX = box.x + box.width / 2 + (Math.random() * 10 - 5);
  const targetY = box.y + box.height / 2 + (Math.random() * 10 - 5);
  
  // Get current mouse position or start from random edge
  const currentX = Math.random() * 500;
  const currentY = Math.random() * 500;
  
  // Bezier curve movement points
  const steps = Math.floor(Math.random() * 10) + 5;
  const points = [];
  
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    // Quadratic bezier with control point offset
    const controlX = (currentX + targetX) / 2 + (Math.random() * 100 - 50);
    const controlY = (currentY + targetY) / 2 + (Math.random() * 100 - 50);
    
    const x = (1 - t) * (1 - t) * currentX + 2 * (1 - t) * t * controlX + t * t * targetX;
    const y = (1 - t) * (1 - t) * currentY + 2 * (1 - t) * t * controlY + t * t * targetY;
    
    points.push({ x, y });
  }
  
  // Execute movement
  for (const point of points) {
    await page.mouse.move(point.x, point.y);
    await randomDelay(10, 30);
  }
}

/**
 * Human-like scroll with variable speed and direction changes
 */
async function humanLikeScroll(page, options = {}) {
  const {
    direction = 'down',
    minAmount = 100,
    maxAmount = 500,
    pauseChance = 0.3
  } = options;
  
  const amount = Math.floor(Math.random() * (maxAmount - minAmount + 1)) + minAmount;
  const directionMultiplier = direction === 'down' ? 1 : -1;
  
  // Scroll in chunks
  const chunks = Math.floor(Math.random() * 3) + 2;
  const chunkSize = amount / chunks;
  
  for (let i = 0; i < chunks; i++) {
    await page.evaluate((scrollAmount) => {
      window.scrollBy(0, scrollAmount);
    }, chunkSize * directionMultiplier);
    
    // Random pause between chunks
    await randomDelay(100, 500);
    
    // Occasional direction change (reading)
    if (Math.random() < pauseChance) {
      await randomDelay(500, 2000);
    }
  }
  
  // Final settle time
  await randomDelay(200, 800);
}

/**
 * Session warmup - browse naturally before automation
 */
async function sessionWarmup(page, config = {}) {
  const { url = 'https://www.heb.com', actions = 3 } = config;
  
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await gaussianDelay(3000, 1000);
  
  for (let i = 0; i < actions; i++) {
    await humanLikeScroll(page, { 
      direction: Math.random() > 0.5 ? 'down' : 'up',
      minAmount: 200,
      maxAmount: 600 
    });
    await gaussianDelay(2000, 800);
  }
}

/**
 * Randomized viewport management
 */
async function randomizeViewport(context) {
  const viewports = [
    { width: 1920, height: 1080 },
    { width: 1366, height: 768 },
    { width: 1440, height: 900 },
    { width: 1536, height: 864 },
    { width: 1280, height: 720 }
  ];
  
  const viewport = viewports[Math.floor(Math.random() * viewports.length)];
  await context.setViewportSize(viewport);
  return viewport;
}

/**
 * Stealth CDP patches - remove automation flags
 */
async function applyStealthPatches(page) {
  await page.addInitScript(() => {
    // Override navigator.webdriver
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
    
    // Patch plugins
    Object.defineProperty(navigator, 'plugins', {
      get: () => [
        { name: 'Chrome PDF Plugin', filename: 'internal-pdf-viewer' },
        { name: 'Native Client', filename: 'native-client.dll' }
      ]
    });
    
    // Hide automation
    delete navigator.__proto__.webdriver;
  });
}

/**
 * Batch processor with intelligent delays
 */
async function processBatch(items, batchSize, processFn, options = {}) {
  const {
    minDelay = 3000,
    maxDelay = 8000,
    batchPauseMin = 10000,
    batchPauseMax = 15000
  } = options;
  
  const results = [];
  
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchNum = Math.floor(i / batchSize) + 1;
    const totalBatches = Math.ceil(items.length / batchSize);
    
    console.log(`\n📦 Batch ${batchNum}/${totalBatches} (${batch.length} items)`);
    
    for (const item of batch) {
      const start = Date.now();
      const result = await processFn(item);
      results.push(result);
      
      // Variable delay between items
      if (batch.indexOf(item) < batch.length - 1 || i + batchSize < items.length) {
        await gaussianDelay((minDelay + maxDelay) / 2, (maxDelay - minDelay) / 4);
      }
    }
    
    // Longer pause between batches
    if (i + batchSize < items.length) {
      const pause = Math.floor(Math.random() * (batchPauseMax - batchPauseMin + 1)) + batchPauseMin;
      console.log(`⏱️  Pausing ${pause/1000}s between batches...`);
      await randomDelay(pause, pause + 2000);
    }
  }
  
  return results;
}

module.exports = {
  gaussianDelay,
  randomDelay,
  humanLikeType,
  humanLikeMove,
  humanLikeScroll,
  sessionWarmup,
  randomizeViewport,
  applyStealthPatches,
  processBatch
};
