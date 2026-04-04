const { getBrowser, getPage, releaseBrowser } = require('./shared-chrome-connector');
const fs = require('fs');
const path = require('path');

/**
 * HEB Cart Auto-Add - EXTREMELY SLOW MODE (TEST VERSION)
 * Tests with just 2 items to verify anti-detection works
 */

const DATA_DIR = path.join(__dirname, '..', 'data');

// EXTREMELY SLOW MODE Configuration
const SLOW_MODE = {
  batchSize: 2, // Small test batch
  batchDelayMin: 12000,
  batchDelayMax: 20000,
  preClickDelayMin: 2000,
  preClickDelayMax: 5000,
  keystrokeDelayMin: 50,
  keystrokeDelayMax: 150,
  pageLoadWaitMin: 3000,
  pageLoadWaitMax: 7000,
  searchDelayMin: 4000,
  searchDelayMax: 8000,
  scrollDelayMin: 1000,
  scrollDelayMax: 3000,
  scrollAmountMin: 100,
  scrollAmountMax: 500,
  jitterFactor: 0.20,
  mouseMoveSteps: 5,
  mouseMoveDelayMin: 50,
  mouseMoveDelayMax: 150,
  thinkingPauseProbability: 0.3,
  thinkingPauseMin: 2000,
  thinkingPauseMax: 6000,
};

const HEB_CREDENTIALS = {
  email: 'alex@1v1a.com',
  password: '$Tandal0ne'
};

function applyJitter(value, jitterFactor = SLOW_MODE.jitterFactor) {
  const jitter = (Math.random() * 2 - 1) * jitterFactor;
  return Math.floor(value * (1 + jitter));
}

function randomInt(min, max, applyJitterToResult = false) {
  const value = Math.floor(Math.random() * (max - min + 1)) + min;
  if (applyJitterToResult) return applyJitter(value);
  return value;
}

async function humanDelay(minMs, maxMs) {
  const baseDelay = randomInt(minMs, maxMs);
  const delay = applyJitter(baseDelay);
  await new Promise(r => setTimeout(r, delay));
  return delay;
}

async function thinkingPause(page) {
  if (Math.random() < SLOW_MODE.thinkingPauseProbability) {
    const delay = await humanDelay(SLOW_MODE.thinkingPauseMin, SLOW_MODE.thinkingPauseMax);
    console.log(`   🤔 Thinking pause: ${(delay/1000).toFixed(1)}s`);
    if (Math.random() < 0.5) {
      await humanMouseMovement(page, { subtle: true });
    }
  }
}

function generateCurvedPath(startX, startY, endX, endY, steps) {
  const points = [];
  const midX = (startX + endX) / 2;
  const midY = (startY + endY) / 2;
  const offsetX = randomInt(-200, 200);
  const offsetY = randomInt(-150, 150);
  const controlX = midX + offsetX;
  const controlY = midY + offsetY;
  
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x = Math.pow(1 - t, 2) * startX + 2 * (1 - t) * t * controlX + Math.pow(t, 2) * endX;
    const y = Math.pow(1 - t, 2) * startY + 2 * (1 - t) * t * controlY + Math.pow(t, 2) * endY;
    points.push({ x: Math.round(x), y: Math.round(y) });
  }
  return points;
}

async function humanMouseMovement(page, options = {}) {
  try {
    const { subtle = false, targetElement = null } = options;
    let startX, startY, endX, endY;
    
    const viewport = await page.viewportSize();
    if (!viewport) return;
    
    if (targetElement) {
      try {
        const box = await targetElement.boundingBox();
        if (box) {
          endX = box.x + randomInt(5, Math.max(6, box.width - 5));
          endY = box.y + randomInt(5, Math.max(6, box.height - 5));
        }
      } catch (e) {}
    }
    
    if (!endX || !endY) {
      const margin = subtle ? 200 : 100;
      endX = randomInt(margin, viewport.width - margin);
      endY = randomInt(margin, viewport.height - margin);
    }
    
    startX = viewport.width / 2;
    startY = viewport.height / 2;
    
    const steps = subtle ? Math.floor(SLOW_MODE.mouseMoveSteps / 2) : SLOW_MODE.mouseMoveSteps;
    const path = generateCurvedPath(startX, startY, endX, endY, steps);
    
    for (let i = 0; i < path.length; i++) {
      await page.mouse.move(path[i].x, path[i].y);
      await new Promise(r => setTimeout(r, randomInt(SLOW_MODE.mouseMoveDelayMin, SLOW_MODE.mouseMoveDelayMax)));
    }
  } catch (e) {}
}

async function humanType(page, locator, text) {
  await locator.click();
  await humanDelay(100, 300);
  await locator.fill('');
  await humanDelay(200, 500);
  
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    await locator.press(char);
    const delay = randomInt(SLOW_MODE.keystrokeDelayMin, SLOW_MODE.keystrokeDelayMax);
    if (char === ' ' && Math.random() < 0.3) {
      await new Promise(r => setTimeout(r, delay + randomInt(100, 400)));
    } else {
      await new Promise(r => setTimeout(r, delay));
    }
  }
  await humanDelay(300, 800);
}

async function waitForPageStability(page) {
  try { await page.waitForLoadState('networkidle', { timeout: 10000 }); } catch (e) {}
  try { await page.waitForLoadState('domcontentloaded'); } catch (e) {}
  const delay = await humanDelay(SLOW_MODE.pageLoadWaitMin, SLOW_MODE.pageLoadWaitMax);
  console.log(`   ⏱️  Page stability wait: ${(delay/1000).toFixed(1)}s`);
  return delay;
}

async function preInteractionDelay(page, context = 'interaction') {
  await humanMouseMovement(page, { subtle: true });
  const delay = await humanDelay(SLOW_MODE.preClickDelayMin, SLOW_MODE.preClickDelayMax);
  if (Math.random() < 0.3) {
    console.log(`   ⏱️  Pre-${context} pause: ${(delay/1000).toFixed(1)}s`);
  }
  return delay;
}

function loadItems() {
  try {
    const data = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'heb-extension-items.json'), 'utf8'));
    // Return only first 2 items for testing
    return (data.items || []).slice(0, 2);
  } catch (error) {
    console.error('❌ Could not load items:', error.message);
    return [];
  }
}

async function checkForHumanVerification(page) {
  const challengeSelectors = [
    'iframe[src*="recaptcha"]', 'iframe[src*="captcha"]', 'iframe[src*="hcaptcha"]', 'iframe[src*="challenge"]',
    '[data-testid*="challenge"]', '[data-automation-id*="challenge"]', '.challenge-container', '#challenge-form',
    '.h-captcha', '[class*="h-captcha"]', '#hcaptcha', '.cf-turnstile', '[class*="turnstile"]',
    'text=Verify you are human', 'text=I\'m not a robot', 'text=I am human', 'text=Security check',
    'button:has-text("Verify")', 'button:has-text("I\'m not a robot")', '[role="dialog"]'
  ];
  
  for (const selector of challengeSelectors) {
    try {
      const element = page.locator(selector).first();
      const isVisible = await element.isVisible({ timeout: 1000 }).catch(() => false);
      if (isVisible) return { detected: true, selector, type: 'element' };
    } catch (e) {}
  }
  
  const pageContent = await page.content().catch(() => '');
  const pageText = await page.innerText('body').catch(() => '');
  
  const verificationPatterns = [
    /verify\s*(you are|you're)?\s*(human|a human)/i, /captcha/i, /hcaptcha/i, /i['']?m not a robot/i,
    /security\s*check/i, /additional\s*security\s*check/i, /challenge/i, /bot\s*detection/i
  ];
  
  for (const pattern of verificationPatterns) {
    if (pattern.test(pageContent) || pattern.test(pageText)) {
      return { detected: true, pattern: pattern.toString(), type: 'content' };
    }
  }
  return { detected: false };
}

async function waitForHumanResolution(page, context = 'verification') {
  console.log(`\n🛑 HUMAN VERIFICATION DETECTED: ${context}`);
  console.log('   Please resolve the challenge in the browser window.');
  const startTime = Date.now();
  const maxWaitMs = 5 * 60 * 1000;
  
  while (Date.now() - startTime < maxWaitMs) {
    await new Promise(r => setTimeout(r, 2000));
    const check = await checkForHumanVerification(page);
    if (!check.detected) {
      console.log('   ✅ Challenge appears resolved!');
      await waitForPageStability(page);
      return true;
    }
  }
  console.log('   ⚠️  Timed out waiting');
  return false;
}

async function handleHEBLogin(page) {
  const url = page.url();
  if (!url.includes('login') && !url.includes('signin')) return true;
  
  console.log('\n🔐 HEB login required...');
  
  const verification = await checkForHumanVerification(page);
  if (verification.detected) {
    const resolved = await waitForHumanResolution(page, 'login page');
    if (!resolved) return false;
  }
  
  await waitForPageStability(page);
  
  try {
    const emailField = page.locator('input[type="email"], input[name="email"], input[id="email"]').first();
    await humanMouseMovement(page, { targetElement: emailField });
    await preInteractionDelay(page, 'email entry');
    await humanType(page, emailField, HEB_CREDENTIALS.email);
    console.log('   ✅ Email entered');
    
    await thinkingPause(page);
    
    const continueBtn = page.locator('button[type="submit"], button:has-text("Continue")').first();
    if (continueBtn) {
      await humanMouseMovement(page, { targetElement: continueBtn });
      await preInteractionDelay(page, 'continue click');
      await continueBtn.click();
      await humanDelay(3000, 5000);
    }
    
    const passwordField = page.locator('input[type="password"]').first();
    await humanMouseMovement(page, { targetElement: passwordField });
    await preInteractionDelay(page, 'password entry');
    await humanType(page, passwordField, HEB_CREDENTIALS.password);
    console.log('   ✅ Password entered');
    
    await thinkingPause(page);
    
    const signInBtn = page.locator('button[type="submit"], button:has-text("Sign In")').first();
    await humanMouseMovement(page, { targetElement: signInBtn });
    await preInteractionDelay(page, 'sign in click');
    await signInBtn.click();
    await humanDelay(5000, 8000);
    
    const currentUrl = page.url();
    if (!currentUrl.includes('login') && !currentUrl.includes('signin')) {
      console.log('   ✅ Login successful!');
      return true;
    }
    return false;
  } catch (error) {
    console.log(`   ❌ Login error: ${error.message}`);
    return false;
  }
}

async function addItemToCart(page, item, index) {
  console.log(`\n${index + 1}. Adding: ${item.name}`);
  
  try {
    const verification = await checkForHumanVerification(page);
    if (verification.detected) {
      const resolved = await waitForHumanResolution(page, `adding item: ${item.name}`);
      if (!resolved) return false;
    }
    
    const searchBox = page.locator('input[placeholder*="Search"], input[name="q"], #search-input').first();
    if (!searchBox) {
      console.log('   ⚠️  Search box not found');
      return false;
    }
    
    await humanMouseMovement(page, { targetElement: searchBox });
    await preInteractionDelay(page, 'search click');
    await searchBox.click();
    await humanDelay(200, 600);
    await searchBox.fill('');
    await humanDelay(300, 700);
    
    console.log('   ⌨️  Typing search term...');
    await humanType(page, searchBox, item.searchTerm || item.name);
    await thinkingPause(page);
    
    console.log('   🔍 Submitting search...');
    await searchBox.press('Enter');
    
    const searchDelay = await humanDelay(SLOW_MODE.searchDelayMin, SLOW_MODE.searchDelayMax);
    console.log(`   ⏱️  Search results wait: ${(searchDelay/1000).toFixed(1)}s`);
    
    const verifyAfterSearch = await checkForHumanVerification(page);
    if (verifyAfterSearch.detected) {
      const resolved = await waitForHumanResolution(page, `after searching: ${item.name}`);
      if (!resolved) return false;
    }
    
    await waitForPageStability(page);
    
    // Look for "Add" button - try multiple selectors
    const addButtonSelectors = [
      'button:has-text("Add to Cart")',
      'button:has-text("Add")',
      '[data-automation-id*="add"]',
      'button[data-testid*="add"]',
      'button[aria-label*="Add"]'
    ];
    
    let addButton = null;
    for (const selector of addButtonSelectors) {
      const btn = page.locator(selector).first();
      const isVisible = await btn.isVisible({ timeout: 2000 }).catch(() => false);
      if (isVisible) {
        addButton = btn;
        break;
      }
    }
    
    if (addButton) {
      await humanMouseMovement(page, { targetElement: addButton });
      await preInteractionDelay(page, 'add to cart click');
      await addButton.click();
      
      const addDelay = await humanDelay(2000, 4000);
      console.log(`   ✅ Added to cart (${(addDelay/1000).toFixed(1)}s confirmation wait)`);
      return true;
    } else {
      console.log('   ⚠️  Add button not found');
      return false;
    }
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
    return false;
  }
}

async function runTest() {
  const items = loadItems();
  if (items.length === 0) {
    console.log('❌ No items to add');
    return;
  }
  
  console.log('🐌 HEB EXTREMELY SLOW MODE - TEST RUN (2 items)');
  console.log('   Anti-detection features:');
  console.log('   • Random delays with ±20% jitter');
  console.log('   • Curved mouse paths');
  console.log('   • Variable typing (50-150ms/keystroke)');
  console.log('   • Thinking pauses');
  console.log('   • Page load waits (3-7s)');
  console.log(`   • Search delays (4-8s)\n`);
  
  const browser = await getBrowser();
  const { page } = await getPage(browser, 'https://www.heb.com');
  
  try {
    console.log('⏳ Initial page load...');
    await waitForPageStability(page);
    
    const loggedIn = await handleHEBLogin(page);
    if (!loggedIn) {
      console.log('\n⚠️  Could not auto-login');
      await releaseBrowser(browser);
      return;
    }
    
    let added = 0;
    let failed = 0;
    
    for (let i = 0; i < items.length; i++) {
      const success = await addItemToCart(page, items[i], i);
      if (success) added++;
      else failed++;
      
      if (i < items.length - 1) {
        console.log('   🔄 Navigating back to home...');
        await page.goto('https://www.heb.com');
        await waitForPageStability(page);
        await humanDelay(2000, 4000);
      }
    }
    
    console.log(`\n📊 Test Results: ${added} added, ${failed} failed`);
    
    await humanDelay(3000, 5000);
    await page.screenshot({ path: 'heb-slow-mode-test.png', fullPage: true });
    console.log('📸 Screenshot saved: heb-slow-mode-test.png');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await releaseBrowser(browser);
  }
}

runTest().catch(console.error);
