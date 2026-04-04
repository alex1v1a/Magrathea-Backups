/**
 * HEB Session Warming & Cookie Persistence
 * Builds session trust gradually to reduce CAPTCHA triggers
 * 
 * Usage:
 *   node heb-cart-session.js --phase=1          # Run Phase 1 (Browse)
 *   node heb-cart-session.js --phase=2          # Run Phase 2 (Search)
 *   node heb-cart-session.js --phase=3          # Run Phase 3 (Cart Test)
 *   node heb-cart-session.js --warm-same-day    # Run same-day warming
 *   node heb-cart-session.js --add-items        # Add items after warming
 * 
 * Session State:
 *   - heb-session-phase1.json  - After Phase 1
 *   - heb-session-phase2.json  - After Phase 2
 *   - heb-session-warmed.json  - Fully warmed session
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
  debugPort: 9222,
  headless: false,
  cookieDir: path.join(__dirname, '..', 'data', 'cookies'),
  screenshotsDir: path.join(__dirname, '..', 'data', 'screenshots'),
  edgeExecutable: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  edgeUserData: 'C:\\Users\\Admin\\AppData\\Local\\Microsoft\\Edge\\User Data',
  hebUrl: 'https://www.heb.com',
  timeouts: {
    navigation: 60000,
    element: 30000,
    action: 15000
  }
};

// Ensure directories exist
[CONFIG.cookieDir, CONFIG.screenshotsDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Cookie file paths
const COOKIE_PATHS = {
  phase1: path.join(CONFIG.cookieDir, 'heb-session-phase1.json'),
  phase2: path.join(CONFIG.cookieDir, 'heb-session-phase2.json'),
  warmed: path.join(CONFIG.cookieDir, 'heb-session-warmed.json'),
  current: path.join(CONFIG.cookieDir, 'heb-session-current.json')
};

// Logger
const log = (msg, type = 'info') => {
  const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 19);
  const icons = { info: 'ℹ️', success: '✅', error: '❌', warn: '⚠️', debug: '🔍', phase: '📋', wait: '⏳' };
  console.log(`[${timestamp}] ${icons[type] || 'ℹ️'} ${msg}`);
};

// Utility: Random delay between min and max seconds
const randomDelay = async (min, max) => {
  const delay = Math.floor(Math.random() * (max - min + 1) + min) * 1000;
  log(`Waiting ${delay/1000}s...`, 'wait');
  await new Promise(r => setTimeout(r, delay));
};

// Utility: Random mouse movement
const humanLikeMouseMove = async (page, selector) => {
  try {
    const element = await page.locator(selector).first();
    const box = await element.boundingBox();
    if (box) {
      const x = box.x + box.width / 2 + (Math.random() * 20 - 10);
      const y = box.y + box.height / 2 + (Math.random() * 20 - 10);
      await page.mouse.move(x, y, { steps: Math.floor(Math.random() * 5) + 5 });
      await randomDelay(1, 2);
    }
  } catch (e) {
    // Ignore mouse move errors
  }
};

// Utility: Save cookies
const saveCookies = async (context, filePath) => {
  try {
    const state = await context.storageState();
    fs.writeFileSync(filePath, JSON.stringify(state, null, 2));
    log(`Cookies saved to ${path.basename(filePath)}`, 'success');
    return true;
  } catch (error) {
    log(`Failed to save cookies: ${error.message}`, 'error');
    return false;
  }
};

// Utility: Load cookies
const loadCookies = async (browserContext, filePath) => {
  try {
    if (!fs.existsSync(filePath)) {
      log(`Cookie file not found: ${filePath}`, 'warn');
      return false;
    }
    const state = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    // Storage state needs to be set at context creation time
    log(`Cookies loaded from ${path.basename(filePath)}`, 'success');
    return state;
  } catch (error) {
    log(`Failed to load cookies: ${error.message}`, 'error');
    return false;
  }
};

// Utility: Check for CAPTCHA
const checkForCaptcha = async (page) => {
  try {
    const captchaSelectors = [
      'text=CAPTCHA',
      'text=captcha',
      'text=verify you are human',
      'text=security check',
      '.g-recaptcha',
      '#recaptcha',
      '[data-testid="captcha"]',
      'iframe[src*="recaptcha"]',
      'iframe[src*="captcha"]'
    ];
    
    for (const selector of captchaSelectors) {
      const count = await page.locator(selector).count();
      if (count > 0) {
        return { detected: true, selector };
      }
    }
    
    // Check URL for captcha indicators
    const url = page.url();
    if (url.includes('captcha') || url.includes('challenge')) {
      return { detected: true, url };
    }
    
    return { detected: false };
  } catch (e) {
    return { detected: false, error: e.message };
  }
};

// Utility: Take screenshot
const takeScreenshot = async (page, name) => {
  try {
    const filename = `${Date.now()}-${name}.png`;
    const filepath = path.join(CONFIG.screenshotsDir, filename);
    await page.screenshot({ path: filepath, fullPage: false });
    log(`Screenshot saved: ${filename}`, 'debug');
    return filepath;
  } catch (e) {
    log(`Screenshot failed: ${e.message}`, 'debug');
    return null;
  }
};

// Phase 1: Browse - Build initial session trust
async function phase1Browse(options = {}) {
  log('═══════════════════════════════════════', 'phase');
  log('PHASE 1: BROWSE (Day 1 Simulation)', 'phase');
  log('═══════════════════════════════════════', 'phase');
  
  const { useExisting = false, existingCookies = null } = options;
  
  // Context options
  const contextOptions = {
    headless: false,
    viewport: { width: 1920, height: 1080 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.0 Edg/120.0.0.0',
    extraHTTPHeaders: {
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
    }
  };
  
  // Load existing cookies if provided
  if (useExisting && existingCookies) {
    contextOptions.storageState = existingCookies;
  }
  
  const context = await chromium.launchPersistentContext(CONFIG.edgeUserData, {
    ...contextOptions,
    executablePath: CONFIG.edgeExecutable,
    args: [
      '--start-maximized',
      '--disable-blink-features=AutomationControlled',
      '--disable-dev-shm-usage',
      '--no-sandbox'
    ]
  });
  
  const page = context.pages()[0] || await context.newPage();
  
  try {
    // Step 1: Visit homepage and wait
    log('Step 1: Visiting HEB homepage...');
    await page.goto(CONFIG.hebUrl, { waitUntil: 'networkidle', timeout: CONFIG.timeouts.navigation });
    await randomDelay(5, 10); // Wait 5-10 seconds
    
    // Check for CAPTCHA
    const captchaCheck = await checkForCaptcha(page);
    if (captchaCheck.detected) {
      log(`⚠️ CAPTCHA detected: ${captchaCheck.selector || captchaCheck.url}`, 'error');
      await takeScreenshot(page, 'phase1-captcha');
      return { success: false, phase: 1, reason: 'captcha', cookies: null };
    }
    
    log('Homepage loaded successfully', 'success');
    await takeScreenshot(page, 'phase1-homepage');
    
    // Step 2: Scroll like a human
    log('Step 2: Scrolling homepage...');
    await page.mouse.wheel(0, 500);
    await randomDelay(3, 5);
    await page.mouse.wheel(0, 300);
    await randomDelay(2, 4);
    await page.mouse.wheel(0, -200);
    await randomDelay(2, 3);
    
    // Step 3: Click through categories
    const categories = [
      { name: 'Produce', selector: 'a[href*="produce"], text=Produce' },
      { name: 'Meat', selector: 'a[href*="meat"], text=Meat' },
      { name: 'Bakery', selector: 'a[href*="bakery"], text=Bakery' },
      { name: 'Dairy', selector: 'a[href*="dairy"], text=Dairy' },
      { name: 'Frozen', selector: 'a[href*="frozen"], text=Frozen' }
    ];
    
    const categoriesToVisit = categories.slice(0, Math.floor(Math.random() * 3) + 3); // 3-5 categories
    
    for (let i = 0; i < categoriesToVisit.length; i++) {
      const category = categoriesToVisit[i];
      log(`Step 3.${i+1}: Browsing ${category.name} category...`);
      
      try {
        const categoryLink = await page.locator(category.selector).first();
        if (await categoryLink.isVisible().catch(() => false)) {
          await humanLikeMouseMove(page, category.selector);
          await categoryLink.click({ delay: 200 });
          await page.waitForLoadState('networkidle');
          await randomDelay(5, 8);
          
          // Scroll category page
          await page.mouse.wheel(0, 400);
          await randomDelay(3, 5);
          
          // Go back to homepage
          await page.goto(CONFIG.hebUrl, { waitUntil: 'networkidle' });
          await randomDelay(4, 7);
        }
      } catch (e) {
        log(`Could not browse ${category.name}: ${e.message}`, 'warn');
      }
    }
    
    // Step 4: View individual products
    log('Step 4: Viewing individual products...');
    const productSelectors = [
      'a[href*="/product-detail/"]',
      '[data-testid="product-card"] a',
      '.product-title a'
    ];
    
    let productsViewed = 0;
    const targetProducts = Math.floor(Math.random() * 6) + 5; // 5-10 products
    
    for (const selector of productSelectors) {
      if (productsViewed >= targetProducts) break;
      
      try {
        const products = await page.locator(selector).slice(0, 5);
        const count = await products.count();
        
        for (let j = 0; j < Math.min(count, 3); j++) {
          if (productsViewed >= targetProducts) break;
          
          const product = products.nth(j);
          if (await product.isVisible().catch(() => false)) {
            await humanLikeMouseMove(page, selector);
            await product.click({ delay: 150 });
            await page.waitForLoadState('networkidle');
            
            // Stay on product page for 10-20 seconds
            const viewTime = Math.floor(Math.random() * 11) + 10;
            log(`Viewing product for ${viewTime}s...`, 'wait');
            await new Promise(r => setTimeout(r, viewTime * 1000));
            
            // Scroll product page
            await page.mouse.wheel(0, 300);
            await randomDelay(2, 4);
            
            productsViewed++;
            
            // Go back
            await page.goto(CONFIG.hebUrl, { waitUntil: 'networkidle' });
            await randomDelay(3, 5);
          }
        }
      } catch (e) {
        // Continue to next selector
      }
    }
    
    log(`Viewed ${productsViewed} products`, 'success');
    
    // Step 5: Save cookies (NO cart actions in Phase 1)
    log('Step 5: Saving session cookies...');
    const saved = await saveCookies(context, COOKIE_PATHS.phase1);
    
    // Also copy to current and warmed
    if (saved) {
      fs.copyFileSync(COOKIE_PATHS.phase1, COOKIE_PATHS.current);
      fs.copyFileSync(COOKIE_PATHS.phase1, COOKIE_PATHS.warmed);
    }
    
    log('═══════════════════════════════════════', 'phase');
    log('PHASE 1 COMPLETE - Session warmed (no cart actions)', 'success');
    log('═══════════════════════════════════════', 'phase');
    
    return { 
      success: true, 
      phase: 1, 
      productsViewed, 
      categoriesVisited: categoriesToVisit.length,
      cookies: COOKIE_PATHS.phase1 
    };
    
  } catch (error) {
    log(`Phase 1 error: ${error.message}`, 'error');
    return { success: false, phase: 1, error: error.message };
  } finally {
    await context.close().catch(() => {});
  }
}

// Phase 2: Search - Build search history
async function phase2Search(options = {}) {
  log('═══════════════════════════════════════', 'phase');
  log('PHASE 2: SEARCH (Day 2 Simulation)', 'phase');
  log('═══════════════════════════════════════', 'phase');
  
  const { cookiesPath = COOKIE_PATHS.phase1 } = options;
  
  // Load Phase 1 cookies
  const storageState = await loadCookies(null, cookiesPath);
  
  if (!storageState) {
    log('No Phase 1 cookies found. Run Phase 1 first.', 'error');
    return { success: false, phase: 2, reason: 'no_cookies' };
  }
  
  const context = await chromium.launchPersistentContext(CONFIG.edgeUserData, {
    headless: false,
    viewport: { width: 1920, height: 1080 },
    storageState,
    executablePath: CONFIG.edgeExecutable,
    args: [
      '--start-maximized',
      '--disable-blink-features=AutomationControlled'
    ]
  });
  
  const page = context.pages()[0] || await context.newPage();
  
  try {
    // Step 1: Visit homepage with warmed cookies
    log('Step 1: Visiting HEB with warmed session...');
    await page.goto(CONFIG.hebUrl, { waitUntil: 'networkidle' });
    await randomDelay(4, 7);
    
    const captchaCheck = await checkForCaptcha(page);
    if (captchaCheck.detected) {
      log(`⚠️ CAPTCHA detected: ${captchaCheck.selector || captchaCheck.url}`, 'error');
      await takeScreenshot(page, 'phase2-captcha');
      return { success: false, phase: 2, reason: 'captcha' };
    }
    
    // Step 2: Perform searches
    const searchTerms = [
      'chicken',
      'pasta',
      'milk',
      'bread',
      'eggs',
      'rice',
      'cheese',
      'apples'
    ];
    
    const searchesToPerform = Math.floor(Math.random() * 3) + 3; // 3-5 searches
    const shuffledSearches = searchTerms.sort(() => 0.5 - Math.random()).slice(0, searchesToPerform);
    
    for (let i = 0; i < shuffledSearches.length; i++) {
      const term = shuffledSearches[i];
      log(`Step 2.${i+1}: Searching for "${term}"...`);
      
      try {
        // Find and fill search
        const searchInput = await page.locator('input[placeholder*="Search" i], input[type="search"]').first();
        await searchInput.waitFor({ state: 'visible', timeout: 10000 });
        
        // Clear and type slowly
        await searchInput.click({ delay: 200 });
        await searchInput.fill('');
        for (const char of term) {
          await searchInput.type(char, { delay: 50 + Math.random() * 100 });
        }
        
        await randomDelay(1, 2);
        await searchInput.press('Enter');
        
        // Wait for results (15-30 seconds)
        await page.waitForLoadState('networkidle');
        const waitTime = Math.floor(Math.random() * 16) + 15;
        log(`Viewing results for ${waitTime}s...`, 'wait');
        await new Promise(r => setTimeout(r, waitTime * 1000));
        
        // Scroll results
        await page.mouse.wheel(0, 400);
        await randomDelay(3, 5);
        await page.mouse.wheel(0, 300);
        await randomDelay(2, 4);
        
        // Maybe click a product (but don't add to cart)
        if (Math.random() > 0.5) {
          const productLinks = await page.locator('a[href*="/product-detail/"]').slice(0, 3);
          if (await productLinks.count() > 0) {
            const randomProduct = productLinks.nth(Math.floor(Math.random() * await productLinks.count()));
            if (await randomProduct.isVisible().catch(() => false)) {
              await randomProduct.click({ delay: 200 });
              await page.waitForLoadState('networkidle');
              await randomDelay(5, 8);
              
              // Scroll product page
              await page.mouse.wheel(0, 300);
              await randomDelay(2, 4);
            }
          }
        }
        
      } catch (e) {
        log(`Search error for "${term}": ${e.message}`, 'warn');
      }
      
      // Go back to homepage
      await page.goto(CONFIG.hebUrl, { waitUntil: 'networkidle' });
      await randomDelay(4, 7);
    }
    
    // Step 3: Save updated cookies (NO cart actions in Phase 2)
    log('Step 3: Saving updated session cookies...');
    const saved = await saveCookies(context, COOKIE_PATHS.phase2);
    
    if (saved) {
      fs.copyFileSync(COOKIE_PATHS.phase2, COOKIE_PATHS.current);
      fs.copyFileSync(COOKIE_PATHS.phase2, COOKIE_PATHS.warmed);
    }
    
    log('═══════════════════════════════════════', 'phase');
    log('PHASE 2 COMPLETE - Search history built', 'success');
    log('═══════════════════════════════════════', 'phase');
    
    return { 
      success: true, 
      phase: 2, 
      searchesPerformed: shuffledSearches.length,
      searches: shuffledSearches,
      cookies: COOKIE_PATHS.phase2 
    };
    
  } catch (error) {
    log(`Phase 2 error: ${error.message}`, 'error');
    return { success: false, phase: 2, error: error.message };
  } finally {
    await context.close().catch(() => {});
  }
}

// Phase 3: Cart Test - Attempt cart additions with warmed session
async function phase3CartTest(options = {}) {
  log('═══════════════════════════════════════', 'phase');
  log('PHASE 3: CART TEST (Day 3 - Full Session)', 'phase');
  log('═══════════════════════════════════════', 'phase');
  
  const { cookiesPath = COOKIE_PATHS.phase2, items = [], maxItems = 5 } = options;
  
  // Load warmed cookies
  const storageState = await loadCookies(null, cookiesPath);
  
  if (!storageState) {
    log('No warmed cookies found. Run Phase 2 first.', 'error');
    return { success: false, phase: 3, reason: 'no_cookies' };
  }
  
  const context = await chromium.launchPersistentContext(CONFIG.edgeUserData, {
    headless: false,
    viewport: { width: 1920, height: 1080 },
    storageState,
    executablePath: CONFIG.edgeExecutable,
    args: [
      '--start-maximized',
      '--disable-blink-features=AutomationControlled'
    ]
  });
  
  const page = context.pages()[0] || await context.newPage();
  
  const results = {
    added: [],
    failed: [],
    captchaTriggered: false,
    captchaAtItem: null
  };
  
  try {
    // Step 1: Visit homepage with fully warmed session
    log('Step 1: Testing warmed session...');
    await page.goto(CONFIG.hebUrl, { waitUntil: 'networkidle' });
    await randomDelay(5, 8);
    
    const captchaCheck = await checkForCaptcha(page);
    if (captchaCheck.detected) {
      log(`⚠️ CAPTCHA detected immediately! Session warming may need more time.`, 'error');
      results.captchaTriggered = true;
      await takeScreenshot(page, 'phase3-captcha-immediate');
      return { success: false, phase: 3, reason: 'captcha_immediate', results };
    }
    
    log('Session looks good - no CAPTCHA on entry', 'success');
    
    // Default test items if none provided
    const testItems = items.length > 0 ? items : [
      { name: 'Whole Milk', search: 'whole milk gallon' },
      { name: 'Large Eggs', search: 'large eggs dozen' },
      { name: 'White Bread', search: 'white bread' },
      { name: 'Bananas', search: 'bananas' },
      { name: 'Ground Beef', search: 'ground beef' }
    ];
    
    const itemsToAdd = testItems.slice(0, maxItems);
    
    // Step 2: Attempt cart additions
    for (let i = 0; i < itemsToAdd.length; i++) {
      const item = itemsToAdd[i];
      log(`Step 2.${i+1}: Adding "${item.name}" to cart...`);
      
      try {
        // Search for item
        const searchInput = await page.locator('input[placeholder*="Search" i], input[type="search"]').first();
        await searchInput.waitFor({ state: 'visible' });
        
        await searchInput.click({ delay: 200 });
        await searchInput.fill('');
        await randomDelay(1, 2);
        
        for (const char of item.search) {
          await searchInput.type(char, { delay: 50 + Math.random() * 100 });
        }
        
        await randomDelay(1, 2);
        await searchInput.press('Enter');
        await page.waitForLoadState('networkidle');
        await randomDelay(4, 7);
        
        // Check for CAPTCHA after search
        const searchCaptcha = await checkForCaptcha(page);
        if (searchCaptcha.detected) {
          log(`⚠️ CAPTCHA triggered during search!`, 'error');
          results.captchaTriggered = true;
          results.captchaAtItem = item.name;
          await takeScreenshot(page, `phase3-captcha-search-${i+1}`);
          break;
        }
        
        // Find and click Add to Cart
        const addButtonSelectors = [
          'button[data-testid*="add-to-cart"]:not([data-testid*="logged-out"])',
          'button:has-text("Add to cart")',
          '[data-automation-id*="addToCart"]',
          'button.add-to-cart'
        ];
        
        let added = false;
        for (const selector of addButtonSelectors) {
          try {
            const button = await page.locator(selector).first();
            if (await button.isVisible().catch(() => false)) {
              await humanLikeMouseMove(page, selector);
              await button.click({ delay: 300 });
              await randomDelay(4, 6);
              
              // Check for CAPTCHA after click
              const clickCaptcha = await checkForCaptcha(page);
              if (clickCaptcha.detected) {
                log(`⚠️ CAPTCHA triggered after add attempt!`, 'error');
                results.captchaTriggered = true;
                results.captchaAtItem = item.name;
                await takeScreenshot(page, `phase3-captcha-add-${i+1}`);
                break;
              }
              
              // Look for confirmation
              const confirmationSelectors = [
                'text=added to cart',
                'text=Added to cart',
                '[data-testid*="cart-count"]',
                '.cart-badge'
              ];
              
              for (const confSelector of confirmationSelectors) {
                const conf = await page.locator(confSelector).first();
                if (await conf.isVisible().catch(() => false)) {
                  log(`✅ "${item.name}" added successfully!`, 'success');
                  results.added.push(item);
                  added = true;
                  break;
                }
              }
              
              if (added) break;
            }
          } catch (e) {
            // Try next selector
          }
        }
        
        if (!added && !results.captchaTriggered) {
          log(`❌ Could not add "${item.name}"`, 'warn');
          results.failed.push({ item: item.name, reason: 'button_not_found' });
        }
        
        if (results.captchaTriggered) break;
        
      } catch (error) {
        log(`Error adding "${item.name}": ${error.message}`, 'error');
        results.failed.push({ item: item.name, reason: error.message });
      }
      
      // Delay between items
      if (i < itemsToAdd.length - 1 && !results.captchaTriggered) {
        await randomDelay(5, 10);
      }
    }
    
    // Final screenshot
    await takeScreenshot(page, 'phase3-final-cart');
    
    log('═══════════════════════════════════════', 'phase');
    log('PHASE 3 COMPLETE - Cart test finished', results.captchaTriggered ? 'warn' : 'success');
    log(`Added: ${results.added.length}/${itemsToAdd.length}`, 'info');
    log(`Failed: ${results.failed.length}/${itemsToAdd.length}`, 'info');
    log(`CAPTCHA triggered: ${results.captchaTriggered ? 'YES ⚠️' : 'NO ✅'}`, results.captchaTriggered ? 'warn' : 'success');
    log('═══════════════════════════════════════', 'phase');
    
    return { 
      success: !results.captchaTriggered, 
      phase: 3, 
      results,
      cookies: COOKIE_PATHS.warmed 
    };
    
  } catch (error) {
    log(`Phase 3 error: ${error.message}`, 'error');
    return { success: false, phase: 3, error: error.message, results };
  } finally {
    await context.close().catch(() => {});
  }
}

// Same-day warming alternative
async function warmSameDay(options = {}) {
  log('═══════════════════════════════════════', 'phase');
  log('SAME-DAY SESSION WARMING', 'phase');
  log('═══════════════════════════════════════', 'phase');
  
  const context = await chromium.launchPersistentContext(CONFIG.edgeUserData, {
    headless: false,
    viewport: { width: 1920, height: 1080 },
    executablePath: CONFIG.edgeExecutable,
    args: [
      '--start-maximized',
      '--disable-blink-features=AutomationControlled'
    ]
  });
  
  const page = context.pages()[0] || await context.newPage();
  
  try {
    // Step 1: Visit site and wait 30 seconds
    log('Step 1: Visiting HEB and waiting 30 seconds...');
    await page.goto(CONFIG.hebUrl, { waitUntil: 'networkidle' });
    await new Promise(r => setTimeout(r, 30000));
    
    // Step 2: Browse categories for 2 minutes
    log('Step 2: Browsing categories for 2 minutes...');
    const categories = ['produce', 'meat', 'bakery', 'dairy'];
    const startTime = Date.now();
    const browseDuration = 2 * 60 * 1000; // 2 minutes
    
    while (Date.now() - startTime < browseDuration) {
      const category = categories[Math.floor(Math.random() * categories.length)];
      try {
        const link = await page.locator(`a[href*="${category}"]`).first();
        if (await link.isVisible().catch(() => false)) {
          await link.click();
          await page.waitForLoadState('networkidle');
          await page.mouse.wheel(0, 500);
          await new Promise(r => setTimeout(r, 15000 + Math.random() * 10000));
          await page.goto(CONFIG.hebUrl, { waitUntil: 'networkidle' });
        }
      } catch (e) {
        // Continue browsing
      }
    }
    
    // Save initial cookies
    await saveCookies(context, COOKIE_PATHS.current);
    
    // Step 3: Return to dashboard for 5 minutes
    log('Step 3: Returning to dashboard for 5 minutes...');
    await page.goto(CONFIG.hebUrl + '/my-account/dashboard', { waitUntil: 'networkidle' });
    await new Promise(r => setTimeout(r, 5 * 60 * 1000));
    
    // Save warmed cookies
    await saveCookies(context, COOKIE_PATHS.warmed);
    
    log('Same-day warming complete!', 'success');
    return { success: true, cookies: COOKIE_PATHS.warmed };
    
  } catch (error) {
    log(`Same-day warming error: ${error.message}`, 'error');
    return { success: false, error: error.message };
  } finally {
    await context.close().catch(() => {});
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  const phase = args.find(a => a.startsWith('--phase='))?.split('=')[1];
  const warmSameDayFlag = args.includes('--warm-same-day');
  const fullWarming = args.includes('--full-warming');
  const addItems = args.includes('--add-items');
  const help = args.includes('--help') || args.includes('-h');
  
  if (help) {
    console.log(`
HEB Session Warming - Reduces CAPTCHA triggers through gradual trust building

Usage:
  node heb-cart-session.js [options]

Options:
  --phase=1              Run Phase 1: Browse (Day 1 simulation)
  --phase=2              Run Phase 2: Search (Day 2 simulation)
  --phase=3              Run Phase 3: Cart Test (Day 3 simulation)
  --warm-same-day        Run same-day warming (30s + 2min browse + 5min wait)
  --full-warming         Run all 3 phases sequentially
  --add-items            Add items using warmed session
  --help, -h             Show this help

Examples:
  # Multi-day warming approach:
  node heb-cart-session.js --phase=1                    # Day 1
  node heb-cart-session.js --phase=2                    # Day 2
  node heb-cart-session.js --phase=3                    # Day 3 - Test cart
  
  # Same-day warming (quicker but less effective):
  node heb-cart-session.js --warm-same-day
  
  # Full automation:
  node heb-cart-session.js --full-warming --add-items

Cookie Files:
  ${CONFIG.cookieDir}
  - heb-session-phase1.json  - After Day 1 browsing
  - heb-session-phase2.json  - After Day 2 searching
  - heb-session-warmed.json  - Fully warmed session
`);
    return;
  }
  
  log('🛒 HEB Session Warming Starting...', 'phase');
  log(`Cookie directory: ${CONFIG.cookieDir}`);
  
  if (warmSameDayFlag) {
    await warmSameDay();
  } else if (fullWarming) {
    const phase1 = await phase1Browse();
    if (!phase1.success) {
      log('Phase 1 failed, aborting', 'error');
      return;
    }
    
    const phase2 = await phase2Search({ cookiesPath: COOKIE_PATHS.phase1 });
    if (!phase2.success) {
      log('Phase 2 failed, aborting', 'error');
      return;
    }
    
    const phase3 = await phase3CartTest({ cookiesPath: COOKIE_PATHS.phase2 });
    if (!phase3.success) {
      log('Phase 3 had issues - CAPTCHA may have triggered', 'warn');
    }
    
    log('\n═══════════════════════════════════════', 'phase');
    log('FULL WARMING COMPLETE', phase3.success ? 'success' : 'warn');
    log('═══════════════════════════════════════', 'phase');
    
  } else if (phase === '1') {
    await phase1Browse();
  } else if (phase === '2') {
    await phase2Search();
  } else if (phase === '3') {
    await phase3CartTest();
  } else if (addItems) {
    // Add items using warmed session
    const warmedExists = fs.existsSync(COOKIE_PATHS.warmed);
    if (!warmedExists) {
      log('No warmed session found. Run --phase=3 or --warm-same-day first.', 'error');
      return;
    }
    
    log('Adding items with warmed session...');
    await phase3CartTest({ 
      cookiesPath: COOKIE_PATHS.warmed,
      maxItems: 10
    });
  } else {
    log('No phase specified. Use --phase=1, --phase=2, --phase=3, --warm-same-day, or --full-warming', 'warn');
    log('Use --help for usage information');
  }
}

// Run if executed directly
if (require.main === module) {
  main().catch(err => {
    log(`Fatal error: ${err.message}`, 'error');
    process.exit(1);
  });
}

module.exports = {
  phase1Browse,
  phase2Search,
  phase3CartTest,
  warmSameDay,
  COOKIE_PATHS,
  checkForCaptcha
};
