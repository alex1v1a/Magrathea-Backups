/**
 * HEB Cart Automation with Anti-Bot Protection & Verification
 * 
 * LESSONS LEARNED (Apply to ALL bot detection scenarios):
 * 1. RANDOM DELAYS: Never use fixed intervals - always random between min/max
 * 2. VERIFICATION: Always verify action succeeded (cart count, page state)
 * 3. RETRY LOGIC: If verification fails, retry before marking as failed
 * 4. CART CONFIRMATION: Check cart count before/after each add
 * 5. LONGER PAUSES: 2-3 seconds minimum, 5-10 seconds between major actions
 * 6. HUMAN-LIKE TIMING: Mouse movements, scrolls, variable typing speeds
 * 7. SESSION WARMING: Visit site first, browse naturally before actions
 * 8. RATE LIMITING: Fewer requests per minute, batch operations
 * 9. BUTTON STATE: Always check disabled state before clicking
 * 10. SELECTOR FALLBACK: Use multiple selector strategies
 */

const { chromium } = require('playwright');
const fs = require('fs').promises;
const path = require('path');

const randomDelay = (min, max) => {
  const delay = Math.floor(Math.random() * (max - min + 1)) + min;
  return new Promise(r => setTimeout(r, delay));
};

// Gaussian random for more human-like delays
function gaussianRandom(min, max) {
  const u = 1 - Math.random();
  const v = Math.random();
  const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  const mean = (min + max) / 2;
  const stdDev = (max - min) / 6;
  const result = Math.round(mean + z * stdDev);
  return Math.max(min, Math.min(max, result));
}

async function humanLikeScroll(page) {
  const scrollAmount = Math.floor(Math.random() * 300) + 100;
  await page.evaluate((amount) => window.scrollBy(0, amount), scrollAmount);
  await randomDelay(500, 1200);
}

async function sessionWarmup(page) {
  console.log('  🌡️  Session warmup...');
  
  // Patch navigator.webdriver to avoid detection
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', {
      get: () => undefined
    });
    // Hide automation markers
    delete window.chrome?.runtime?.OnInstalledReason;
    delete window.chrome?.runtime?.OnRestartRequiredReason;
  });
  
  await page.goto('https://www.heb.com', { waitUntil: 'domcontentloaded' });
  await randomDelay(4000, 6000);
  
  // Multiple scrolls to simulate browsing
  for (let i = 0; i < 3; i++) {
    await humanLikeScroll(page);
    await randomDelay(1000, 2000);
  }
  
  await randomDelay(2000, 4000);
  console.log('  ✅ Session warmed');
}

// GET CART COUNT: Check how many items are in cart
// FIX: Updated to use localStorage (HEB changed their site - aria-label no longer includes count)
async function getCartCount(page) {
  try {
    // NEW: Primary method - read from localStorage (most reliable)
    const storageCount = await page.evaluate(() => {
      try {
        const raw = localStorage.getItem('PurchaseCart');
        if (!raw) return 0;
        const cartData = JSON.parse(raw);
        
        // Count items by splitting ProductNames
        if (cartData.ProductNames) {
          const items = cartData.ProductNames.split('<SEP>').filter(n => n.trim());
          return items.length;
        }
        
        // Alternative: check Products array
        if (cartData.Products && Array.isArray(cartData.Products)) {
          return cartData.Products.length;
        }
        
        return 0;
      } catch (e) {
        return 0;
      }
    });
    
    if (storageCount > 0) {
      return storageCount;
    }
    
    // Fallback: Extract from aria-label (no longer includes count on HEB as of Feb 2026)
    const count = await page.evaluate(() => {
      const cartLink = document.querySelector('a[data-testid="cart-link"], a[href*="/cart"]');
      if (cartLink) {
        const ariaLabel = cartLink.getAttribute('aria-label');
        if (ariaLabel) {
          const match = ariaLabel.match(/(\d+)\s+items?\s+in\s+your\s+cart/i);
          if (match) return parseInt(match[1]);
        }
      }
      
      // Method 2: Badge with various class patterns
      const badgeSelectors = [
        '[data-testid="cart-badge"]',
        '[data-testid="cart-count"]',
        '[class*="cartBadge"]',
        '[class*="badge"]',
        '.CartLink_cartBadge',
        '.Badge_badge'
      ];
      
      for (const selector of badgeSelectors) {
        const badge = document.querySelector(selector);
        if (badge) {
          const text = badge.textContent?.trim();
          const num = parseInt(text);
          if (!isNaN(num)) return num;
        }
      }
      
      // Method 3: Cart link text (just the number)
      const cartLinks = document.querySelectorAll('a[href*="/cart"]');
      for (const link of cartLinks) {
        const text = link.textContent?.trim();
        // Just a number like "2"
        if (/^\d+$/.test(text)) return parseInt(text);
      }
      
      return 0;
    });
    return count;
  } catch (e) {
    return -1; // Error state
  }
}

// VERIFY CART INCREASED: Check if cart count went up
// FIX: Increased wait times for HEB's slower backend
async function verifyCartIncreased(page, initialCount, maxRetries = 5) {
  for (let i = 0; i < maxRetries; i++) {
    // FIX: Longer wait between checks (HEB backend can be slow)
    await randomDelay(3000, 5000);
    const newCount = await getCartCount(page);
    
    if (newCount > initialCount) {
      return { success: true, newCount, added: newCount - initialCount };
    }
    
    console.log(`    🔄 Verification retry ${i + 1}/${maxRetries}...`);
  }
  
  return { success: false, newCount: await getCartCount(page) };
}

async function staggeredBatch(items, batchSize, processFn) {
  const results = [];
  
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    console.log(`\n📦 Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(items.length/batchSize)} (${batch.length} items)`);
    
    for (const item of batch) {
      const result = await processFn(item);
      results.push(result);
    }
    
    if (i + batchSize < items.length) {
      const pauseSeconds = Math.floor(Math.random() * 6) + 10;
      console.log(`\n⏱️  Pausing ${pauseSeconds}s between batches...`);
      await randomDelay(pauseSeconds * 1000, pauseSeconds * 1000 + 2000);
    }
  }
  
  return results;
}

async function loadItems() {
  try {
    const data = await fs.readFile(
      path.join(__dirname, '..', 'data', 'heb-extension-items.json'),
      'utf8'
    );
    const parsed = JSON.parse(data);
    
    if (parsed.shoppingList) {
      const items = [];
      const categories = ['proteins', 'produce', 'pantry', 'grainsAndBread'];
      
      for (const category of categories) {
        if (parsed.shoppingList[category]) {
          for (const item of parsed.shoppingList[category]) {
            items.push({
              name: item.item,
              searchTerm: item.searchTerms ? item.searchTerms[0] : item.item,
              amount: item.quantity,
              for: item.for,
              priority: item.priority,
              organic: item.organicPreferred
            });
          }
        }
      }
      
      console.log(`📋 Loaded ${items.length} items from shopping list\n`);
      return items;
    }
    
    return parsed.items || parsed;
  } catch (e) {
    console.log('⚠️  Could not load items file:', e.message);
    return [];
  }
}

// FIX: Completely rewritten button detection with better selector strategies
async function findAndClickAddButton(page) {
  console.log('    🔍 Searching for add to cart button...');
  
  // FIX: Wait for any loading skeletons to disappear first
  try {
    await page.waitForFunction(() => {
      const skeletons = document.querySelectorAll('[data-testid*="skeleton"], [class*="skeleton"], [class*="loading"]');
      return skeletons.length === 0;
    }, { timeout: 10000 });
  } catch (e) {
    console.log('    ⚠️  Loading state check timeout, continuing anyway...');
  }
  
  // FIX: Dynamic scroll to find products
  await page.evaluate(() => {
    // Scroll until we find product buttons
    const scrollStep = 300;
    let currentScroll = 0;
    const maxScroll = 1500;
    
    while (currentScroll < maxScroll) {
      const buttons = document.querySelectorAll('button[data-testid*="add"], button[data-qe-id*="add"], button[data-automation-id*="add"]');
      const visibleButton = Array.from(buttons).find(btn => {
        const rect = btn.getBoundingClientRect();
        return rect.top > 0 && rect.top < window.innerHeight && !btn.disabled;
      });
      
      if (visibleButton) return;
      
      window.scrollBy(0, scrollStep);
      currentScroll += scrollStep;
    }
  });
  
  await randomDelay(1000, 2000);
  
  // FIX: Comprehensive selector strategies with disabled checking
  const strategies = [
    // Strategy 1: data-testid with add-to-cart (newer HEB pattern)
    async () => {
      const btns = await page.locator('button[data-testid*="add-to-cart" i]').all();
      for (const btn of btns) {
        const isVisible = await btn.isVisible().catch(() => false);
        const isEnabled = await btn.isEnabled().catch(() => false);
        const isDisabled = await btn.evaluate(el => el.disabled || el.getAttribute('aria-disabled') === 'true').catch(() => true);
        
        if (isVisible && isEnabled && !isDisabled) {
          console.log(`    (found ADD TO CART button - data-testid)`);
          return btn;
        }
      }
      return null;
    },
    
    // Strategy 2: data-qe-id="addToCart" (original pattern)
    async () => {
      const btns = await page.locator('button[data-qe-id="addToCart"]').all();
      for (const btn of btns) {
        const isVisible = await btn.isVisible().catch(() => false);
        const isEnabled = await btn.isEnabled().catch(() => false);
        const isDisabled = await btn.evaluate(el => el.disabled || el.getAttribute('aria-disabled') === 'true').catch(() => true);
        
        if (isVisible && isEnabled && !isDisabled) {
          console.log(`    (found ADD TO CART button - data-qe-id)`);
          return btn;
        }
      }
      return null;
    },
    
    // Strategy 3: data-automation-id (another HEB pattern)
    async () => {
      const btns = await page.locator('button[data-automation-id*="add" i]').all();
      for (const btn of btns) {
        const isVisible = await btn.isVisible().catch(() => false);
        const isEnabled = await btn.isEnabled().catch(() => false);
        const isDisabled = await btn.evaluate(el => el.disabled || el.getAttribute('aria-disabled') === 'true').catch(() => true);
        
        if (isVisible && isEnabled && !isDisabled) {
          console.log(`    (found ADD TO CART button - automation-id)`);
          return btn;
        }
      }
      return null;
    },
    
    // Strategy 4: Text contains "Add to cart" with strict verification
    async () => {
      const btns = await page.locator('button').all();
      for (const btn of btns) {
        const isVisible = await btn.isVisible().catch(() => false);
        if (!isVisible) continue;
        
        const text = await btn.textContent().catch(() => '');
        const isDisabled = await btn.evaluate(el => el.disabled || el.getAttribute('aria-disabled') === 'true').catch(() => true);
        
        // Look for "Add to cart" text (not just "Add")
        if (text.toLowerCase().includes('add to cart') && !isDisabled) {
          console.log(`    (found button with "Add to cart" text)`);
          return btn;
        }
      }
      return null;
    },
    
    // Strategy 5: aria-label contains "cart" (avoid "list")
    async () => {
      const btns = await page.locator('button[aria-label*="cart" i]').all();
      for (const btn of btns) {
        const isVisible = await btn.isVisible().catch(() => false);
        if (!isVisible) continue;
        
        const label = await btn.getAttribute('aria-label');
        const isDisabled = await btn.evaluate(el => el.disabled || el.getAttribute('aria-disabled') === 'true').catch(() => true);
        
        if (label && !label.toLowerCase().includes('list') && !isDisabled) {
          console.log(`    (found button with cart aria-label)`);
          return btn;
        }
      }
      return null;
    },
    
    // Strategy 6: First visible Add button in product grid (last resort)
    async () => {
      // Look for product cards first
      const cards = await page.locator('[data-testid*="product"], article, [class*="product"]').all();
      for (const card of cards) {
        const btn = card.locator('button').filter({ hasText: /add/i }).first();
        if (await btn.count() > 0) {
          const isVisible = await btn.isVisible().catch(() => false);
          const isDisabled = await btn.evaluate(el => el.disabled || el.getAttribute('aria-disabled') === 'true').catch(() => true);
          
          if (isVisible && !isDisabled) {
            console.log(`    (found button in product card)`);
            return btn;
          }
        }
      }
      return null;
    }
  ];
  
  for (let i = 0; i < strategies.length; i++) {
    try {
      const btn = await strategies[i]();
      if (btn) return btn;
    } catch (e) {
      // Continue to next strategy
    }
  }
  
  return null;
}

// FIX: Better click handling with retry logic
async function clickAddButton(page, button) {
  const maxAttempts = 3;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      console.log(`    👆 Clicking button (attempt ${attempt}/${maxAttempts})...`);
      
      // Scroll into view
      await button.scrollIntoViewIfNeeded({ timeout: 5000 });
      await randomDelay(800, 1500);
      
      // Check if still enabled
      const isDisabled = await button.evaluate(el => el.disabled || el.getAttribute('aria-disabled') === 'true').catch(() => true);
      if (isDisabled) {
        console.log(`    ⚠️  Button disabled, waiting...`);
        await randomDelay(2000, 3000);
        continue;
      }
      
      // Visual feedback
      await button.evaluate(el => {
        el.style.outline = '3px solid #22c55e';
        el.style.outlineOffset = '2px';
        setTimeout(() => {
          el.style.outline = '';
          el.style.outlineOffset = '';
        }, 1500);
      }).catch(() => {});
      
      // Click with human-like delay
      const clickDelay = Math.floor(Math.random() * 300) + 100;
      await button.click({ delay: clickDelay, timeout: 10000 });
      
      // Wait for potential loading state
      await randomDelay(1000, 2000);
      
      // Check if click registered (button might show loading state)
      const isLoading = await button.evaluate(el => {
        return el.disabled || 
               el.textContent.toLowerCase().includes('adding') ||
               el.getAttribute('aria-busy') === 'true';
      }).catch(() => false);
      
      if (isLoading) {
        console.log(`    ⏳ Button shows loading state, click registered`);
        return { success: true };
      }
      
      return { success: true };
      
    } catch (err) {
      console.log(`    ⚠️  Click attempt ${attempt} failed: ${err.message}`);
      if (attempt < maxAttempts) {
        await randomDelay(2000, 3000);
      }
    }
  }
  
  return { success: false, error: 'All click attempts failed' };
}

async function addToHEBCart() {
  console.log('═══════════════════════════════════════');
  console.log('🛒  HEB Cart Automation (Verified Mode)');
  console.log('═══════════════════════════════════════\n');
  console.log('⚙️  Settings:');
  console.log('   • Random delays: 3-8s between items');
  console.log('   • Cart verification: After each item');
  console.log('   • Retry on failure: Up to 3 attempts');
  console.log('   • Batch size: 5 items per group\n');
  
  const items = await loadItems();
  if (items.length === 0) {
    console.log('❌ No items to add');
    process.exit(1);
  }
  
  console.log(`Items to add: ${items.length}`);
  console.log(`Estimated time: ${Math.ceil(items.length * 6 / 60)}-${Math.ceil(items.length * 10 / 60)} minutes\n`);
  
  console.log('🔌 Connecting to Edge...');
  let browser;
  try {
    browser = await chromium.connectOverCDP('http://localhost:9222');
    console.log('✅ Connected to shared Edge\n');
  } catch (e) {
    console.log('❌ Could not connect to Edge on port 9222');
    console.log('Please run: node scripts/launch-shared-chrome.js');
    process.exit(1);
  }
  
  const context = browser.contexts()[0];
  let page = context.pages().find(p => p.url().includes('heb.com'));
  
  if (!page) {
    page = await context.newPage();
  }
  
  await sessionWarmup(page);
  
  console.log(`Current page: ${page.url()}\n`);
  
  const isLoggedIn = await page.evaluate(() => {
    const hasMyAccount = !!document.querySelector('a[href*="/my-account"]');
    const hasLoginLink = !!document.querySelector('a[href*="/login"]');
    return hasMyAccount && !hasLoginLink;
  });
  
  if (!isLoggedIn) {
    console.log('❌ Not logged in. Please login in the browser window first.');
    await browser.close();
    process.exit(1);
  }
  
  console.log('✅ Logged in detected\n');
  
  // Get initial cart count
  const initialCartCount = await getCartCount(page);
  console.log(`🛒 Initial cart count: ${initialCartCount} items\n`);
  
  const results = { added: [], failed: [], verified: [] };
  
  await staggeredBatch(items, 5, async (item) => {
    const term = item.searchTerm || item.name;
    const itemNum = results.added.length + results.failed.length + 1;
    
    console.log(`[${itemNum}/${items.length}] ${item.name}...`);
    
    // Get cart count BEFORE adding
    const countBefore = await getCartCount(page);
    
    try {
      await page.goto(`https://www.heb.com/search?q=${encodeURIComponent(term)}`, {
        waitUntil: 'domcontentloaded'
      });
      
      await randomDelay(5000, 8000); // FIX: Longer wait for page to stabilize
      await humanLikeScroll(page);
      
      const button = await findAndClickAddButton(page);
      
      if (button) {
        const clickResult = await clickAddButton(page, button);
        
        if (clickResult.success) {
          // VERIFY: Check if cart increased
          const verification = await verifyCartIncreased(page, countBefore, 5);
          
          if (verification.success) {
            console.log(`  ✅ Added & verified! (Cart: ${countBefore} → ${verification.newCount})`);
            results.added.push(item.name);
            results.verified.push(item.name);
          } else {
            console.log(`  ⚠️  Clicked but cart didn't increase (Cart still: ${verification.newCount})`);
            
            // FIX: Retry once with fresh page load
            console.log(`  🔄 Retrying with fresh search...`);
            await randomDelay(3000, 5000);
            await page.goto(`https://www.heb.com/search?q=${encodeURIComponent(term)}`, {
              waitUntil: 'domcontentloaded'
            });
            await randomDelay(5000, 7000);
            
            const retryButton = await findAndClickAddButton(page);
            if (retryButton) {
              const retryClick = await clickAddButton(page, retryButton);
              if (retryClick.success) {
                const retryVerify = await verifyCartIncreased(page, countBefore, 3);
                if (retryVerify.success) {
                  console.log(`  ✅ Retry successful! (Cart: ${countBefore} → ${retryVerify.newCount})`);
                  results.added.push(item.name);
                  results.verified.push(item.name);
                } else {
                  results.failed.push({ 
                    name: item.name, 
                    error: 'Cart verification failed after retry',
                    countBefore,
                    countAfter: retryVerify.newCount
                  });
                }
              } else {
                results.failed.push({ name: item.name, error: 'Retry click failed' });
              }
            } else {
              results.failed.push({ name: item.name, error: 'No button found on retry' });
            }
          }
        } else {
          console.log(`  ⚠️  Click failed: ${clickResult.error}`);
          results.failed.push({ name: item.name, error: clickResult.error });
        }
      } else {
        console.log('  ❌ No add button found');
        results.failed.push({ name: item.name, error: 'No add button' });
      }
      
      await randomDelay(4000, 8000); // FIX: Longer delay between items
      
    } catch (err) {
      console.log(`  ❌ Failed: ${err.message}`);
      results.failed.push({ name: item.name, error: err.message });
    }
  });
  
  // Final verification
  const finalCartCount = await getCartCount(page);
  const totalAdded = finalCartCount - initialCartCount;
  
  console.log('\n═══════════════════════════════════════');
  console.log('📊  RESULTS');
  console.log('═══════════════════════════════════════');
  console.log(`🛒 Cart: ${initialCartCount} → ${finalCartCount} (+${totalAdded})`);
  console.log(`✅ Added: ${results.added.length}/${items.length}`);
  console.log(`✓ Verified: ${results.verified.length}/${items.length}`);
  console.log(`❌ Failed: ${results.failed.length}/${items.length}`);
  
  if (results.failed.length > 0) {
    console.log('\nFailed items:');
    results.failed.forEach(f => {
      if (typeof f === 'object') {
        console.log(`  - ${f.name}: ${f.error}`);
      } else {
        console.log(`  - ${f}`);
      }
    });
  }
  
  await browser.close();
  console.log('\n👋 Done!');
}

addToHEBCart().catch(err => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});
