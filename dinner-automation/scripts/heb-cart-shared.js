const { getBrowser, getPage, releaseBrowser } = require('./shared-chrome-connector');
const fs = require('fs');
const path = require('path');

/**
 * HEB Cart Auto-Add - Shared Chrome Edition
 * Connects to shared Chrome instance via CDP
 * LOCKED to Marvin profile only
 * 
 * Human-like behavior: Random delays, batch processing
 */

const DATA_DIR = path.join(__dirname, '..', 'data');
const BATCH_SIZE = 5; // Process 5 items at a time
const BATCH_DELAY_MIN = 8000; // 8 seconds between batches
const BATCH_DELAY_MAX = 15000; // 15 seconds between batches

// HEB Credentials - loaded from environment variables
// Set HEB_EMAIL and HEB_PASSWORD in your .env file
const HEB_CREDENTIALS = {
  email: process.env.HEB_EMAIL || process.env.HEB_USERNAME,
  password: process.env.HEB_PASSWORD
};

// Validate credentials are configured
if (!HEB_CREDENTIALS.email || !HEB_CREDENTIALS.password) {
  console.error('ERROR: HEB credentials not configured');
  console.error('Set HEB_EMAIL and HEB_PASSWORD environment variables');
  console.error('Or use: source .env && node heb-cart-shared.js');
  process.exit(1);
}

/**
 * Get random integer between min and max (inclusive)
 */
function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Human-like random delay
 */
async function humanDelay(page, minMs = 2000, maxMs = 5000) {
  const delay = randomInt(minMs, maxMs);
  await page.waitForTimeout(delay);
}

/**
 * Simulate human-like mouse movement
 */
async function humanMouseMovement(page) {
  try {
    // Get viewport size
    const viewport = await page.viewportSize();
    if (!viewport) return;
    
    // Move mouse to random position
    const x = randomInt(100, viewport.width - 100);
    const y = randomInt(100, viewport.height - 100);
    await page.mouse.move(x, y);
    await page.waitForTimeout(randomInt(200, 800));
  } catch (e) {
    // Mouse movement not critical
  }
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
  // Common selectors for human verification elements
  const challengeSelectors = [
    // CAPTCHA/Iframe challenges
    'iframe[src*="recaptcha"]',
    'iframe[src*="captcha"]',
    'iframe[src*="hcaptcha"]',
    'iframe[src*="challenge"]',
    // HEB-specific or common bot detection
    '[data-testid*="challenge"]',
    '[data-automation-id*="challenge"]',
    '.challenge-container',
    '#challenge-form',
    // hCaptcha specific
    '.h-captcha',
    '[class*="h-captcha"]',
    '#hcaptcha',
    'input[name="h-captcha-response"]',
    // Cloudflare/Human verification
    '.cf-turnstile',
    '[class*="turnstile"]',
    // Common verification text
    'text=Verify you are human',
    'text=I\'m not a robot',
    'text=I am human',
    'text=Security check',
    'text=Additional security check',
    'text=Please verify',
    // Button-based challenges
    'button:has-text("Verify")',
    'button:has-text("I\'m not a robot")',
    'button:has-text("I am human")',
    'button:has-text("Continue")',
    // Checkbox challenges
    'input[type="checkbox"][name*="captcha"]',
    'input[type="checkbox"][class*="captcha"]',
    // Modal dialogs
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
      // Continue checking other selectors
    }
  }
  
  // Check for specific text patterns in page content
  const pageContent = await page.content().catch(() => '');
  const pageText = await page.innerText('body').catch(() => '');
  const combinedText = pageContent + ' ' + pageText;
  
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
    if (pattern.test(pageContent)) {
      return { detected: true, pattern: pattern.toString(), type: 'content' };
    }
  }
  
  // Check if page is stuck (same URL for too long with no interaction possible)
  // This is a heuristic for invisible challenges
  
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
  const maxWaitMs = 5 * 60 * 1000; // 5 minutes max wait
  const checkInterval = 2000;
  
  while (Date.now() - startTime < maxWaitMs) {
    await page.waitForTimeout(checkInterval);
    
    // Check if challenge is still present
    const check = await checkForHumanVerification(page);
    if (!check.detected) {
      console.log('   ✅ Challenge appears to be resolved!');
      await page.waitForTimeout(5000); // Give page time to settle
      
      // Refresh to get full page after challenge
      console.log('   🔄 Refreshing page...');
      await page.goto('https://www.heb.com');
      await page.waitForTimeout(3000);
      
      return true;
    }
    
    // Also check if we're now logged in or on cart page
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
    // Navigate to cart page
    await page.goto('https://www.heb.com/cart');
    await page.waitForTimeout(3000);
    
    // Check for human verification
    const verification = await checkForHumanVerification(page);
    if (verification.detected) {
      const resolved = await waitForHumanResolution(page, 'cart page loading');
      if (!resolved) return false;
    }
    
    // Look for "Remove" buttons - try to find and click them
    let itemsRemoved = 0;
    const maxAttempts = 50; // Safety limit
    
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      // Check for verification before each removal
      const verifyCheck = await checkForHumanVerification(page);
      if (verifyCheck.detected) {
        const resolved = await waitForHumanResolution(page, 'item removal');
        if (!resolved) break;
      }
      
      try {
        // Look for remove button
        const removeBtn = page.locator('button:has-text("Remove"), button[data-automation-id*="remove"], button[aria-label*="Remove"]').first();
        
        // Check if button exists by trying to click with short timeout
        await removeBtn.click({ timeout: 2000 });
        await page.waitForTimeout(1500);
        itemsRemoved++;
      } catch (e) {
        // No more remove buttons or click failed
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
 * Auto-login to HEB if on login page
 */
async function handleHEBLogin(page) {
  const url = page.url();
  if (!url.includes('login') && !url.includes('signin')) {
    return true; // Already logged in
  }
  
  console.log('\n🔐 HEB login required - auto-logging in...');
  
  try {
    // Check for human verification before login
    const verification = await checkForHumanVerification(page);
    if (verification.detected) {
      const resolved = await waitForHumanResolution(page, 'login page');
      if (!resolved) return false;
    }
    
    // Wait for email field
    const emailField = await page.locator('input[type="email"], input[name="email"], input[id="email"], input[placeholder*="email" i]').first();
    if (!emailField) {
      console.log('   ⚠️  Email field not found');
      return false;
    }
    
    await emailField.fill(HEB_CREDENTIALS.email);
    console.log('   ✅ Email entered');
    
    // Look for continue/submit button
    const continueBtn = await page.locator('button[type="submit"], button:has-text("Continue"), button:has-text("Next")').first();
    if (continueBtn) {
      await continueBtn.click();
      await page.waitForTimeout(2000);
    }
    
    // Check for verification after email
    const verifyAfterEmail = await checkForHumanVerification(page);
    if (verifyAfterEmail.detected) {
      const resolved = await waitForHumanResolution(page, 'after entering email');
      if (!resolved) return false;
    }
    
    // Wait for password field
    const passwordField = await page.locator('input[type="password"], input[name="password"], input[id="password"]').first();
    if (!passwordField) {
      console.log('   ⚠️  Password field not found');
      return false;
    }
    
    await passwordField.fill(HEB_CREDENTIALS.password);
    console.log('   ✅ Password entered');
    
    // Click sign in button
    const signInBtn = await page.locator('button[type="submit"], button:has-text("Sign In"), button:has-text("Log In"), button:has-text("Login"), input[type="submit"]').first();
    if (signInBtn) {
      await signInBtn.click();
      await page.waitForTimeout(5000);
      
      // Check for verification after sign in
      const verifyAfterSignin = await checkForHumanVerification(page);
      if (verifyAfterSignin.detected) {
        const resolved = await waitForHumanResolution(page, 'after sign in');
        if (!resolved) return false;
      }
      
      // Check if login succeeded
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
    // First check if we're on a challenge page
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
    
    // Check for human verification before searching
    const verification = await checkForHumanVerification(page);
    if (verification.detected) {
      const resolved = await waitForHumanResolution(page, `adding item: ${item.name}`);
      if (!resolved) return false;
    }
    
    // Human-like mouse movement before interacting
    await humanMouseMovement(page);
    
    const searchBox = await page.locator('input[placeholder*="Search"], input[name="q"], #search-input, [data-automation-id*="search"]').first();
    if (!searchBox) {
      console.log('   ⚠️  Search box not found');
      return false;
    }
    
    // Human-like delay before clicking
    await humanDelay(page, 500, 1500);
    await searchBox.click();
    await humanDelay(page, 200, 600);
    await searchBox.fill('');
    
    // Type with small delays between keystrokes (simulated)
    await searchBox.fill(item.searchTerm || item.name);
    await humanDelay(page, 300, 800);
    await searchBox.press('Enter');
    
    // Human-like wait for results
    await humanDelay(page, 2500, 4500);
    
    // Check for verification after search
    const verifyAfterSearch = await checkForHumanVerification(page);
    if (verifyAfterSearch.detected) {
      const resolved = await waitForHumanResolution(page, `after searching: ${item.name}`);
      if (!resolved) return false;
    }
    
    const addButton = await page.locator('button:has-text("Add to Cart"), button:has-text("Add"), [data-automation-id*="add"]').first();
    
    if (addButton) {
      // Human-like delay before clicking add
      await humanDelay(page, 500, 1200);
      await addButton.click();
      await humanDelay(page, 1500, 3000);
      console.log('   ✅ Added to cart');
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
  
  console.log('🛒 HEB Auto-Add to Cart (Shared Chrome)');
  console.log(`📦 ${items.length} items to add`);
  console.log(`🔄 Batch size: ${BATCH_SIZE} items with human-like delays\n`);
  
  const browser = await getBrowser();
  const { page } = await getPage(browser, 'https://www.heb.com');
  
  try {
    // Initial human-like delay
    await humanDelay(page, 3000, 5000);
    
    // Handle login if needed
    const loggedIn = await handleHEBLogin(page);
    if (!loggedIn) {
      console.log('\n⚠️  Could not auto-login to HEB');
      console.log('   Please check credentials or log in manually.');
      await releaseBrowser(browser);
      return;
    }
    
    // Clear cart before adding new items
    await clearCart(page);
    
    let added = 0;
    let failed = 0;
    let batchNumber = 1;
    
    // Process in batches
    for (let i = 0; i < items.length; i += BATCH_SIZE) {
      const batch = items.slice(i, i + BATCH_SIZE);
      const isLastBatch = i + BATCH_SIZE >= items.length;
      
      console.log(`\n📦 BATCH ${batchNumber}: Processing ${batch.length} items (${i + 1}-${Math.min(i + batch.length, items.length)} of ${items.length})`);
      
      // Process each item in batch
      for (let j = 0; j < batch.length; j++) {
        const itemIndex = i + j;
        const success = await addItemToCart(page, batch[j], itemIndex);
        if (success) added++;
        else failed++;
        
        // Navigate back to home for next item
        if (j < batch.length - 1 || !isLastBatch) {
          await page.goto('https://www.heb.com');
          // Small delay between items in same batch
          await humanDelay(page, 1000, 2500);
        }
      }
      
      // Delay between batches (except after last batch)
      if (!isLastBatch) {
        const batchDelay = randomInt(BATCH_DELAY_MIN, BATCH_DELAY_MAX);
        console.log(`\n⏱️  Batch ${batchNumber} complete. Pausing ${(batchDelay/1000).toFixed(1)}s before next batch...`);
        await page.waitForTimeout(batchDelay);
      }
      
      batchNumber++;
    }
    
    console.log(`\n📊 Results: ${added} added, ${failed} failed, ${items.length} total`);
    await page.screenshot({ path: 'heb-cart-final.png', fullPage: true });
    console.log('📸 Screenshot saved: heb-cart-final.png');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await releaseBrowser(browser);
  }
}

runAutomation().catch(console.error);
