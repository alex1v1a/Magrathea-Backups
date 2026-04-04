const { getBrowser, getPage, releaseBrowser } = require('./shared-chrome-connector');
const fs = require('fs');
const path = require('path');

/**
 * HEB Cart Auto-Add - EXTREMELY SLOW MODE
 * Anti-Detection Edition: Human-like timing and behavior
 * 
 * This script implements extreme anti-detection measures:
 * - Random delays with jitter (±20%)
 * - Human-like mouse movements with curved paths
 * - Variable typing speeds with per-keystroke delays
 * - Simulated reading/thinking pauses
 * - Natural scroll behavior with pauses
 * - Full page load waits before interaction
 */

const DATA_DIR = path.join(__dirname, '..', 'data');

// EXTREMELY SLOW MODE Configuration
const SLOW_MODE = {
  // Batch processing with long delays
  batchSize: 3, // Smaller batches
  batchDelayMin: 12000, // 12 seconds between batches
  batchDelayMax: 20000, // 20 seconds between batches
  
  // Pre-click delays (simulate thinking/reading)
  preClickDelayMin: 2000, // 2 seconds
  preClickDelayMax: 5000, // 5 seconds
  
  // Typing delays (natural human typing)
  keystrokeDelayMin: 50,  // 50ms between keystrokes
  keystrokeDelayMax: 150, // 150ms between keystrokes
  
  // Post-page-load wait (let page fully render)
  pageLoadWaitMin: 3000,  // 3 seconds
  pageLoadWaitMax: 7000,  // 7 seconds
  
  // Between searches (HEB is sensitive here)
  searchDelayMin: 4000,   // 4 seconds
  searchDelayMax: 8000,   // 8 seconds
  
  // Scroll behavior
  scrollDelayMin: 1000,   // 1 second between scrolls
  scrollDelayMax: 3000,   // 3 seconds between scrolls
  scrollAmountMin: 100,   // Minimum scroll pixels
  scrollAmountMax: 500,   // Maximum scroll pixels
  
  // Jitter factor (±20% randomization on all delays)
  jitterFactor: 0.20,
  
  // Mouse movement
  mouseMoveSteps: 5,      // Number of intermediate points for curved paths
  mouseMoveDelayMin: 50,  // Delay between mouse move steps
  mouseMoveDelayMax: 150,
  
  // "Thinking" pauses - random pauses to simulate reading/decision making
  thinkingPauseProbability: 0.3, // 30% chance of a thinking pause
  thinkingPauseMin: 2000,        // 2 seconds
  thinkingPauseMax: 6000,        // 6 seconds
};

// HEB Credentials - stored securely, only used for automation
const HEB_CREDENTIALS = {
  email: 'alex@1v1a.com',
  password: '$Tandal0ne'
};

/**
 * Apply jitter to a delay value (±jitterFactor%)
 */
function applyJitter(value, jitterFactor = SLOW_MODE.jitterFactor) {
  const jitter = (Math.random() * 2 - 1) * jitterFactor; // -jitterFactor to +jitterFactor
  return Math.floor(value * (1 + jitter));
}

/**
 * Get random integer between min and max (inclusive) with jitter applied
 */
function randomInt(min, max, applyJitterToResult = false) {
  const value = Math.floor(Math.random() * (max - min + 1)) + min;
  if (applyJitterToResult) {
    return applyJitter(value);
  }
  return value;
}

/**
 * Human-like random delay with jitter
 */
async function humanDelay(minMs, maxMs) {
  const baseDelay = randomInt(minMs, maxMs);
  const delay = applyJitter(baseDelay);
  await new Promise(r => setTimeout(r, delay));
  return delay;
}

/**
 * Simulate a "thinking pause" - simulates user reading or deciding
 */
async function thinkingPause(page) {
  if (Math.random() < SLOW_MODE.thinkingPauseProbability) {
    const delay = await humanDelay(SLOW_MODE.thinkingPauseMin, SLOW_MODE.thinkingPauseMax);
    console.log(`   🤔 Thinking pause: ${(delay/1000).toFixed(1)}s`);
    
    // Occasionally move mouse during thinking (looking at different parts of page)
    if (Math.random() < 0.5) {
      await humanMouseMovement(page, { subtle: true });
    }
  }
}

/**
 * Generate a curved path between two points using quadratic bezier
 */
function generateCurvedPath(startX, startY, endX, endY, steps) {
  const points = [];
  
  // Control point for curve (randomized to create natural looking curves)
  const midX = (startX + endX) / 2;
  const midY = (startY + endY) / 2;
  const offsetX = randomInt(-200, 200);
  const offsetY = randomInt(-150, 150);
  const controlX = midX + offsetX;
  const controlY = midY + offsetY;
  
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    // Quadratic bezier curve: B(t) = (1-t)²P₀ + 2(1-t)tP₁ + t²P₂
    const x = Math.pow(1 - t, 2) * startX + 
              2 * (1 - t) * t * controlX + 
              Math.pow(t, 2) * endX;
    const y = Math.pow(1 - t, 2) * startY + 
              2 * (1 - t) * t * controlY + 
              Math.pow(t, 2) * endY;
    points.push({ x: Math.round(x), y: Math.round(y) });
  }
  
  return points;
}

/**
 * Simulate human-like mouse movement with curved paths
 */
async function humanMouseMovement(page, options = {}) {
  try {
    const { subtle = false, targetElement = null } = options;
    
    let startX, startY, endX, endY;
    
    // Get current mouse position or use center of viewport
    const viewport = await page.viewportSize();
    if (!viewport) return;
    
    // If we have a target element, get its position
    if (targetElement) {
      try {
        const box = await targetElement.boundingBox();
        if (box) {
          // Target a random point within the element (not just center)
          endX = box.x + randomInt(5, Math.max(6, box.width - 5));
          endY = box.y + randomInt(5, Math.max(6, box.height - 5));
        }
      } catch (e) {
        // Fall back to random position
      }
    }
    
    // If no target or couldn't get bounding box, use random position
    if (!endX || !endY) {
      const margin = subtle ? 200 : 100;
      endX = randomInt(margin, viewport.width - margin);
      endY = randomInt(margin, viewport.height - margin);
    }
    
    // Use current mouse position or viewport center as start
    startX = viewport.width / 2;
    startY = viewport.height / 2;
    
    // Generate curved path
    const steps = subtle 
      ? Math.floor(SLOW_MODE.mouseMoveSteps / 2) 
      : SLOW_MODE.mouseMoveSteps;
    const path = generateCurvedPath(startX, startY, endX, endY, steps);
    
    // Move mouse along the curved path
    for (let i = 0; i < path.length; i++) {
      await page.mouse.move(path[i].x, path[i].y);
      const stepDelay = randomInt(
        SLOW_MODE.mouseMoveDelayMin, 
        SLOW_MODE.mouseMoveDelayMax
      );
      await new Promise(r => setTimeout(r, stepDelay));
    }
    
  } catch (e) {
    // Mouse movement not critical
  }
}

/**
 * Type text like a human - variable speed, occasional pauses
 */
async function humanType(page, locator, text) {
  // Clear field first with human-like timing
  await locator.click();
  await humanDelay(100, 300);
  await locator.fill('');
  await humanDelay(200, 500);
  
  // Type each character with variable delay
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    await locator.press(char);
    
    // Variable delay between keystrokes
    const delay = randomInt(
      SLOW_MODE.keystrokeDelayMin,
      SLOW_MODE.keystrokeDelayMax
    );
    
    // Occasionally pause longer (like thinking between words)
    if (char === ' ' && Math.random() < 0.3) {
      await new Promise(r => setTimeout(r, delay + randomInt(100, 400)));
    } else {
      await new Promise(r => setTimeout(r, delay));
    }
  }
  
  // Pause after typing (like reviewing what was typed)
  await humanDelay(300, 800);
}

/**
 * Scroll the page in a human-like manner
 */
async function humanScroll(page, options = {}) {
  const { 
    direction = 'down', 
    amount = null,
    pauseAfter = true 
  } = options;
  
  const scrollAmount = amount || randomInt(
    SLOW_MODE.scrollAmountMin,
    SLOW_MODE.scrollAmountMax
  );
  
  const deltaY = direction === 'up' ? -scrollAmount : scrollAmount;
  
  // Scroll in smaller chunks with pauses
  const chunks = randomInt(3, 5);
  const chunkSize = deltaY / chunks;
  
  for (let i = 0; i < chunks; i++) {
    await page.mouse.wheel(0, chunkSize);
    await new Promise(r => setTimeout(r, randomInt(100, 300)));
  }
  
  if (pauseAfter) {
    await humanDelay(SLOW_MODE.scrollDelayMin, SLOW_MODE.scrollDelayMax);
  }
}

/**
 * Wait for page to be fully loaded and stable before interacting
 */
async function waitForPageStability(page) {
  // Wait for network to be idle
  try {
    await page.waitForLoadState('networkidle', { timeout: 10000 });
  } catch (e) {
    // Continue anyway
  }
  
  // Wait for DOM to be ready
  try {
    await page.waitForLoadState('domcontentloaded');
  } catch (e) {
    // Continue anyway
  }
  
  // Additional human-like delay to "read" the page
  const delay = await humanDelay(
    SLOW_MODE.pageLoadWaitMin,
    SLOW_MODE.pageLoadWaitMax
  );
  
  console.log(`   ⏱️  Page stability wait: ${(delay/1000).toFixed(1)}s`);
  
  return delay;
}

/**
 * Pre-interaction ritual: simulate human preparing to click
 */
async function preInteractionDelay(page, context = 'interaction') {
  // Move mouse near the area first
  await humanMouseMovement(page, { subtle: true });
  
  // Pause as if reading/deciding
  const delay = await humanDelay(
    SLOW_MODE.preClickDelayMin,
    SLOW_MODE.preClickDelayMax
  );
  
  if (Math.random() < 0.3) {
    console.log(`   ⏱️  Pre-${context} pause: ${(delay/1000).toFixed(1)}s`);
  }
  
  return delay;
}

function loadItems() {
  try {
    const data = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'heb-extension-items.json'), 'utf8'));
    return data.items || [];
  } catch (error) {
    console.error('❌ Could not load items:', error.message);
    return [];
  }
}

/**
 * Check for human verification dialog/challenge
 */
async function checkForHumanVerification(page) {
  const challengeSelectors = [
    'iframe[src*="recaptcha"]',
    'iframe[src*="captcha"]',
    'iframe[src*="hcaptcha"]',
    'iframe[src*="challenge"]',
    '[data-testid*="challenge"]',
    '[data-automation-id*="challenge"]',
    '.challenge-container',
    '#challenge-form',
    '.h-captcha',
    '[class*="h-captcha"]',
    '#hcaptcha',
    'input[name="h-captcha-response"]',
    '.cf-turnstile',
    '[class*="turnstile"]',
    'text=Verify you are human',
    'text=I\'m not a robot',
    'text=I am human',
    'text=Security check',
    'text=Additional security check',
    'text=Please verify',
    'button:has-text("Verify")',
    'button:has-text("I\'m not a robot")',
    'button:has-text("I am human")',
    'button:has-text("Continue")',
    'input[type="checkbox"][name*="captcha"]',
    'input[type="checkbox"][class*="captcha"]',
    '[role="dialog"]',
    '.modal-content',
    '.popup-content'
  ];
  
  for (const selector of challengeSelectors) {
    try {
      const element = page.locator(selector).first();
      const isVisible = await element.isVisible({ timeout: 1000 }).catch(() => false);
      if (isVisible) {
        return { detected: true, selector, type: 'element' };
      }
    } catch (e) {
      // Continue checking
    }
  }
  
  const pageContent = await page.content().catch(() => '');
  const pageText = await page.innerText('body').catch(() => '');
  
  const verificationPatterns = [
    /verify\s*(you are|you're)?\s*(human|a human)/i,
    /captcha/i,
    /hcaptcha/i,
    /i['']?m not a robot/i,
    /i am human/i,
    /security\s*check/i,
    /additional\s*security\s*check/i,
    /challenge/i,
    /please\s*verify/i,
    /bot\s*detection/i,
    /automated\s*access/i,
    /prove\s*you('re| are)?\s*(human|not a robot)/i
  ];
  
  for (const pattern of verificationPatterns) {
    if (pattern.test(pageContent) || pattern.test(pageText)) {
      return { detected: true, pattern: pattern.toString(), type: 'content' };
    }
  }
  
  return { detected: false };
}

/**
 * Wait for human to resolve verification
 */
async function waitForHumanResolution(page, context = 'verification') {
  console.log(`\n🛑 HUMAN VERIFICATION DETECTED: ${context}`);
  console.log('   Please resolve the challenge in the browser window.');
  console.log('   Waiting for you to complete...');
  
  const startTime = Date.now();
  const maxWaitMs = 5 * 60 * 1000;
  const checkInterval = 2000;
  
  while (Date.now() - startTime < maxWaitMs) {
    await new Promise(r => setTimeout(r, checkInterval));
    
    const check = await checkForHumanVerification(page);
    if (!check.detected) {
      console.log('   ✅ Challenge appears to be resolved!');
      await waitForPageStability(page);
      
      console.log('   🔄 Refreshing page...');
      await page.goto('https://www.heb.com');
      await waitForPageStability(page);
      
      return true;
    }
    
    const url = page.url();
    if (!url.includes('challenge') && !url.includes('captcha') && !url.includes('verify')) {
      console.log('   ✅ Navigation changed - challenge likely resolved!');
      return true;
    }
  }
  
  console.log('   ⚠️  Timed out waiting for human resolution');
  return false;
}

/**
 * Clear HEB cart before adding new items
 */
async function clearCart(page) {
  console.log('\n🗑️  Clearing cart...');
  
  try {
    await page.goto('https://www.heb.com/cart');
    await waitForPageStability(page);
    
    const verification = await checkForHumanVerification(page);
    if (verification.detected) {
      const resolved = await waitForHumanResolution(page, 'cart page loading');
      if (!resolved) return false;
    }
    
    let itemsRemoved = 0;
    const maxAttempts = 50;
    
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const verifyCheck = await checkForHumanVerification(page);
      if (verifyCheck.detected) {
        const resolved = await waitForHumanResolution(page, 'item removal');
        if (!resolved) break;
      }
      
      try {
        await preInteractionDelay(page, 'remove click');
        const removeBtn = page.locator('button:has-text("Remove"), button[data-automation-id*="remove"], button[aria-label*="Remove"]').first();
        await removeBtn.click({ timeout: 2000 });
        await humanDelay(1500, 2500);
        itemsRemoved++;
      } catch (e) {
        break;
      }
    }
    
    if (itemsRemoved > 0) {
      console.log(`   ✅ Removed ${itemsRemoved} items from cart`);
    } else {
      console.log('   ℹ️  Cart was already empty or no remove buttons found');
    }
    
    return true;
  } catch (error) {
    console.log(`   ⚠️  Could not clear cart: ${error.message}`);
    return false;
  }
}

/**
 * Auto-login to HEB with human-like behavior
 */
async function handleHEBLogin(page) {
  const url = page.url();
  if (!url.includes('login') && !url.includes('signin')) {
    return true;
  }
  
  console.log('\n🔐 HEB login required - auto-logging in (slow mode)...');
  
  try {
    const verification = await checkForHumanVerification(page);
    if (verification.detected) {
      const resolved = await waitForHumanResolution(page, 'login page');
      if (!resolved) return false;
    }
    
    await waitForPageStability(page);
    
    // Find email field
    const emailField = page.locator('input[type="email"], input[name="email"], input[id="email"], input[placeholder*="email" i]').first();
    if (!emailField) {
      console.log('   ⚠️  Email field not found');
      return false;
    }
    
    // Move mouse to field and click with delay
    await humanMouseMovement(page, { targetElement: emailField });
    await preInteractionDelay(page, 'email entry');
    
    // Type email like a human
    await humanType(page, emailField, HEB_CREDENTIALS.email);
    console.log('   ✅ Email entered (human-like typing)');
    
    // Occasional thinking pause after email
    await thinkingPause(page);
    
    // Find and click continue
    const continueBtn = page.locator('button[type="submit"], button:has-text("Continue"), button:has-text("Next")').first();
    if (continueBtn) {
      await humanMouseMovement(page, { targetElement: continueBtn });
      await preInteractionDelay(page, 'continue click');
      await continueBtn.click();
      await humanDelay(3000, 5000);
    }
    
    const verifyAfterEmail = await checkForHumanVerification(page);
    if (verifyAfterEmail.detected) {
      const resolved = await waitForHumanResolution(page, 'after entering email');
      if (!resolved) return false;
    }
    
    // Find password field
    const passwordField = page.locator('input[type="password"], input[name="password"], input[id="password"]').first();
    if (!passwordField) {
      console.log('   ⚠️  Password field not found');
      return false;
    }
    
    // Move mouse to password field with natural movement
    await humanMouseMovement(page, { targetElement: passwordField });
    await preInteractionDelay(page, 'password entry');
    
    // Type password like a human
    await humanType(page, passwordField, HEB_CREDENTIALS.password);
    console.log('   ✅ Password entered (human-like typing)');
    
    // Another thinking pause
    await thinkingPause(page);
    
    // Click sign in
    const signInBtn = page.locator('button[type="submit"], button:has-text("Sign In"), button:has-text("Log In"), button:has-text("Login"), input[type="submit"]').first();
    if (signInBtn) {
      await humanMouseMovement(page, { targetElement: signInBtn });
      await preInteractionDelay(page, 'sign in click');
      await signInBtn.click();
      await humanDelay(5000, 8000);
      
      const verifyAfterSignin = await checkForHumanVerification(page);
      if (verifyAfterSignin.detected) {
        const resolved = await waitForHumanResolution(page, 'after sign in');
        if (!resolved) return false;
      }
      
      const currentUrl = page.url();
      if (!currentUrl.includes('login') && !currentUrl.includes('signin')) {
        console.log('   ✅ Login successful!');
        return true;
      } else {
        console.log('   ⚠️  Login may have failed - still on login page');
        return false;
      }
    }
    
    return false;
  } catch (error) {
    console.log(`   ❌ Login error: ${error.message}`);
    return false;
  }
}

async function addItemToCart(page, item, index) {
  console.log(`\n${index + 1}. Adding: ${item.name} (${item.searchTerm || item.name})`);
  
  try {
    // Check for challenge page
    const url = page.url();
    const title = await page.title().catch(() => '');
    const bodyText = await page.innerText('body').catch(() => '');
    
    if (url.includes('captcha') || 
        url.includes('challenge') || 
        bodyText.toLowerCase().includes('i am human') ||
        bodyText.toLowerCase().includes('additional security check') ||
        title === '' || 
        bodyText.length < 500) {
      console.log('   ⚠️  Challenge page detected!');
      const resolved = await waitForHumanResolution(page, `challenge before: ${item.name}`);
      if (!resolved) return false;
    }
    
    const verification = await checkForHumanVerification(page);
    if (verification.detected) {
      const resolved = await waitForHumanResolution(page, `adding item: ${item.name}`);
      if (!resolved) return false;
    }
    
    // Find search box
    const searchBox = page.locator('input[placeholder*="Search"], input[name="q"], #search-input, [data-automation-id*="search"]').first();
    if (!searchBox) {
      console.log('   ⚠️  Search box not found');
      return false;
    }
    
    // Move mouse to search box naturally
    await humanMouseMovement(page, { targetElement: searchBox });
    await preInteractionDelay(page, 'search click');
    
    // Click search box
    await searchBox.click();
    await humanDelay(200, 600);
    
    // Clear and type search term like a human
    await searchBox.fill('');
    await humanDelay(300, 700);
    
    console.log('   ⌨️  Typing search term...');
    await humanType(page, searchBox, item.searchTerm || item.name);
    
    // Thinking pause before submitting
    await thinkingPause(page);
    
    // Press Enter to search
    console.log('   🔍 Submitting search...');
    await searchBox.press('Enter');
    
    // LONG wait for search results (HEB is sensitive here)
    const searchDelay = await humanDelay(
      SLOW_MODE.searchDelayMin,
      SLOW_MODE.searchDelayMax
    );
    console.log(`   ⏱️  Search results wait: ${(searchDelay/1000).toFixed(1)}s`);
    
    // Check for verification after search
    const verifyAfterSearch = await checkForHumanVerification(page);
    if (verifyAfterSearch.detected) {
      const resolved = await waitForHumanResolution(page, `after searching: ${item.name}`);
      if (!resolved) return false;
    }
    
    // Wait for page to fully render
    await waitForPageStability(page);
    
    // Occasional scroll to "look at results"
    if (Math.random() < 0.4) {
      console.log('   📜 Scrolling to view results...');
      await humanScroll(page, { direction: 'down', pauseAfter: true });
    }
    
    // Find add button
    const addButton = page.locator('button:has-text("Add to Cart"), button:has-text("Add"), [data-automation-id*="add"]').first();
    
    if (addButton) {
      // Move mouse to button naturally
      await humanMouseMovement(page, { targetElement: addButton });
      await preInteractionDelay(page, 'add to cart click');
      
      await addButton.click();
      
      // Wait after adding
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

async function runAutomation() {
  const items = loadItems();
  if (items.length === 0) {
    console.log('❌ No items to add');
    return;
  }
  
  console.log('🐌 HEB Auto-Add to Cart - EXTREMELY SLOW MODE');
  console.log('   Anti-detection features enabled:');
  console.log('   • Random delays with ±20% jitter');
  console.log('   • Curved mouse paths with intermediate points');
  console.log('   • Variable typing speeds (50-150ms per keystroke)');
  console.log('   • Thinking pauses between actions');
  console.log('   • Natural scroll behavior');
  console.log('   • Full page load waits (3-7s)');
  console.log(`   • Batch size: ${SLOW_MODE.batchSize} items`);
  console.log(`\n📦 ${items.length} items to add\n`);
  
  const browser = await getBrowser();
  const { page } = await getPage(browser, 'https://www.heb.com');
  
  try {
    // Initial page stability wait
    console.log('⏳ Initial page load...');
    await waitForPageStability(page);
    
    // Handle login
    const loggedIn = await handleHEBLogin(page);
    if (!loggedIn) {
      console.log('\n⚠️  Could not auto-login to HEB');
      await releaseBrowser(browser);
      return;
    }
    
    // Clear cart
    await clearCart(page);
    
    let added = 0;
    let failed = 0;
    let batchNumber = 1;
    
    // Process in batches
    for (let i = 0; i < items.length; i += SLOW_MODE.batchSize) {
      const batch = items.slice(i, i + SLOW_MODE.batchSize);
      const isLastBatch = i + SLOW_MODE.batchSize >= items.length;
      
      console.log(`\n📦 BATCH ${batchNumber}: Processing ${batch.length} items (${i + 1}-${Math.min(i + batch.length, items.length)} of ${items.length})`);
      
      for (let j = 0; j < batch.length; j++) {
        const itemIndex = i + j;
        const success = await addItemToCart(page, batch[j], itemIndex);
        if (success) added++;
        else failed++;
        
        if (j < batch.length - 1 || !isLastBatch) {
          console.log('   🔄 Navigating back to home...');
          await page.goto('https://www.heb.com');
          await waitForPageStability(page);
          
          // Small delay between items in same batch
          await humanDelay(2000, 4000);
        }
      }
      
      if (!isLastBatch) {
        const batchDelay = randomInt(
          SLOW_MODE.batchDelayMin, 
          SLOW_MODE.batchDelayMax,
          true // Apply jitter
        );
        console.log(`\n⏱️  Batch ${batchNumber} complete. Pausing ${(batchDelay/1000).toFixed(1)}s before next batch...`);
        await new Promise(r => setTimeout(r, batchDelay));
        
        // Occasional scroll during batch pause
        if (Math.random() < 0.3) {
          console.log('   📜 Casual scrolling during pause...');
          await humanScroll(page, { direction: Math.random() < 0.5 ? 'up' : 'down' });
        }
      }
      
      batchNumber++;
    }
    
    console.log(`\n📊 Results: ${added} added, ${failed} failed, ${items.length} total`);
    
    // Final screenshot with delay
    await humanDelay(3000, 5000);
    await page.screenshot({ path: 'heb-cart-final.png', fullPage: true });
    console.log('📸 Screenshot saved: heb-cart-final.png');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await releaseBrowser(browser);
  }
}

runAutomation().catch(console.error);
