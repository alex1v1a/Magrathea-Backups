const { chromium } = require('playwright');
const fs = require('fs').promises;
const path = require('path');
const http = require('http');

const randomDelay = (min, max) => {
  const delay = Math.floor(Math.random() * (max - min + 1)) + min;
  return new Promise(r => setTimeout(r, delay));
};

// Check if --status flag is passed
const isStatusMode = process.argv.includes('--status');

// ALL 42 items from meal plan
const ALL_ITEMS = [
  { name: "cod fillets", searchTerm: "wild caught cod" },
  { name: "ribeye steak", searchTerm: "organic grass-fed ribeye" },
  { name: "white fish for tacos", searchTerm: "organic tilapia" },
  { name: "chicken breast", searchTerm: "organic chicken breast" },
  { name: "salmon fillets", searchTerm: "wild caught salmon" },
  { name: "fresh parsley", searchTerm: "organic parsley" },
  { name: "capers", searchTerm: "capers in brine" },
  { name: "mixed vegetables for stir-fry", searchTerm: "organic broccoli" },
  { name: "fresh ginger", searchTerm: "organic ginger root" },
  { name: "green onions", searchTerm: "organic green onions" },
  { name: "corn tortillas", searchTerm: "organic corn tortillas" },
  { name: "ripe mangos", searchTerm: "organic mangos" },
  { name: "jalapeño", searchTerm: "organic jalapeño" },
  { name: "fresh cilantro", searchTerm: "organic cilantro" },
  { name: "cabbage slaw mix", searchTerm: "organic coleslaw mix" },
  { name: "Asian pear", searchTerm: "organic Asian pear" },
  { name: "kimchi", searchTerm: "cabbage kimchi" },
  { name: "cucumbers", searchTerm: "organic cucumbers" },
  { name: "cherry tomatoes", searchTerm: "organic cherry tomatoes" },
  { name: "red onion", searchTerm: "organic red onion" },
  { name: "feta cheese", searchTerm: "organic feta cheese" },
  { name: "hummus", searchTerm: "organic hummus" },
  { name: "Kalamata olives", searchTerm: "Kalamata olives pitted" },
  { name: "tzatziki", searchTerm: "organic tzatziki" },
  { name: "fresh dill", searchTerm: "organic dill" },
  { name: "fresh thyme", searchTerm: "organic thyme" },
  { name: "lemon", searchTerm: "organic lemon" },
  { name: "white wine", searchTerm: "white wine" },
  { name: "oyster sauce", searchTerm: "oyster sauce" },
  { name: "cornstarch", searchTerm: "organic cornstarch" },
  { name: "beef broth", searchTerm: "organic beef broth" },
  { name: "sesame seeds", searchTerm: "organic sesame seeds" },
  { name: "chipotle mayo", searchTerm: "chipotle mayo" },
  { name: "brown sugar", searchTerm: "organic brown sugar" },
  { name: "tomato puree", searchTerm: "organic tomato puree" },
  { name: "heavy cream", searchTerm: "organic heavy cream" },
  { name: "plain yogurt", searchTerm: "organic plain yogurt" },
  { name: "garam masala", searchTerm: "garam masala" },
  { name: "turmeric", searchTerm: "organic turmeric powder" },
  { name: "cayenne pepper", searchTerm: "organic cayenne" },
  { name: "basmati rice", searchTerm: "organic basmati rice" },
  { name: "naan bread", searchTerm: "organic naan" }
];

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
    return -1;
  }
}

// FIX: Enhanced button finder with disabled checking
async function findAddToCartButton(page) {
  console.log('    🔍 Looking for add button...');
  
  // Wait for loading skeletons to disappear
  try {
    await page.waitForFunction(() => {
      const skeletons = document.querySelectorAll('[data-testid*="skeleton"], [class*="skeleton"]');
      return skeletons.length === 0;
    }, { timeout: 8000 });
  } catch (e) {
    // Continue anyway
  }
  
  // Try multiple selector strategies
  const selectors = [
    'button[data-testid*="add-to-cart" i]',
    'button[data-qe-id="addToCart"]',
    'button[data-automation-id*="add" i]',
    'button[aria-label*="add to cart" i]'
  ];
  
  for (const selector of selectors) {
    const btns = await page.locator(selector).all();
    for (const btn of btns) {
      const isVisible = await btn.isVisible().catch(() => false);
      const isEnabled = await btn.isEnabled().catch(() => false);
      const isDisabled = await btn.evaluate(el => 
        el.disabled || el.getAttribute('aria-disabled') === 'true'
      ).catch(() => true);
      
      if (isVisible && isEnabled && !isDisabled) {
        console.log(`    (found button with: ${selector})`);
        return btn;
      }
    }
  }
  
  // Fallback: text-based search
  const allBtns = await page.locator('button').all();
  for (const btn of allBtns) {
    const text = await btn.textContent().catch(() => '');
    const isVisible = await btn.isVisible().catch(() => false);
    const isDisabled = await btn.evaluate(el => 
      el.disabled || el.getAttribute('aria-disabled') === 'true'
    ).catch(() => true);
    
    if (text.toLowerCase().includes('add to cart') && isVisible && !isDisabled) {
      console.log(`    (found button by text: "${text.trim()}")`);
      return btn;
    }
  }
  
  return null;
}

// FIX: Enhanced click with better retry logic
async function clickWithRetry(page, button, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await button.scrollIntoViewIfNeeded({ timeout: 5000 });
      await randomDelay(800, 1500);
      
      // Check if disabled
      const isDisabled = await button.evaluate(el => 
        el.disabled || el.getAttribute('aria-disabled') === 'true'
      ).catch(() => true);
      
      if (isDisabled) {
        console.log(`    ⏳ Button disabled on attempt ${attempt}, waiting...`);
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
      });
      
      const clickDelay = Math.floor(Math.random() * 300) + 100;
      await button.click({ delay: clickDelay });
      
      return { success: true };
    } catch (err) {
      console.log(`    ⚠️  Click attempt ${attempt} failed: ${err.message}`);
      if (attempt < maxRetries) {
        await randomDelay(2000, 3000);
      }
    }
  }
  
  return { success: false, error: 'All attempts failed' };
}

async function checkStatus() {
  console.log('═══════════════════════════════════════════════');
  console.log('🛒  HEB Cart - Status Check');
  console.log('═══════════════════════════════════════════════\n');
  
  // Check CDP connection
  const cdpStatus = await new Promise((resolve) => {
    const req = http.get('http://localhost:9222/json/version', { timeout: 3000 }, (res) => {
      resolve(res.statusCode === 200 ? '✅ Connected' : '❌ Not responding');
    });
    req.on('error', () => resolve('❌ Not running'));
    req.on('timeout', () => { req.destroy(); resolve('❌ Timeout'); });
  });
  
  console.log(`Microsoft Edge (CDP port 9222): ${cdpStatus}\n`);
  
  if (cdpStatus !== '✅ Connected') {
    console.log('❌ Edge is not running on port 9222');
    console.log('   Run: node dinner-automation/scripts/launch-shared-chrome.js');
    process.exit(1);
  }
  
  let browser;
  try {
    browser = await chromium.connectOverCDP('http://localhost:9222');
  } catch (e) {
    console.log('❌ Could not connect to Edge via CDP');
    process.exit(1);
  }
  
  const context = browser.contexts()[0];
  let page = context.pages().find(p => p.url().includes('heb.com'));
  
  if (!page) {
    page = await context.newPage();
    await page.goto('https://www.heb.com', { waitUntil: 'domcontentloaded', timeout: 45000 });
    await randomDelay(5000, 8000); // Let scripts load
  }
  
  // Check login status
  const isLoggedIn = await page.evaluate(() => {
    return !!document.querySelector('a[href*="/my-account"]');
  });
  
  console.log(`HEB Login Status: ${isLoggedIn ? '✅ Logged in' : '❌ Not logged in'}\n`);
  
  // Get cart count
  const cartCount = await getCartCount(page);
  console.log(`🛒 Current Cart: ${cartCount} items\n`);
  
  // Calculate pending
  const targetTotal = 42;
  const pending = Math.max(0, targetTotal - cartCount);
  
  console.log('═══════════════════════════════════════════════');
  console.log('📊 Summary');
  console.log('═══════════════════════════════════════════════');
  console.log(`Items in cart:    ${cartCount}`);
  console.log(`Target items:     ${targetTotal}`);
  console.log(`Pending items:    ${pending}`);
  console.log(`Status:           ${pending === 0 ? '✅ Complete' : `🟡 ${pending} items needed`}`);
  
  await browser.close();
  process.exit(0);
}

async function addMissingItems() {
  console.log('═══════════════════════════════════════════════');
  console.log('🛒  HEB Cart - Add Missing Items');
  console.log('═══════════════════════════════════════════════\n');
  
  // Connect to Edge
  console.log('🔌 Connecting to Microsoft Edge...');
  let browser;
  try {
    browser = await chromium.connectOverCDP('http://localhost:9222');
    console.log('✅ Connected to Edge\n');
  } catch (e) {
    console.log('❌ Could not connect to Microsoft Edge on port 9222');
    console.log('   Run: node dinner-automation/scripts/launch-shared-chrome.js');
    process.exit(1);
  }
  
  const context = browser.contexts()[0];
  let page = context.pages().find(p => p.url().includes('heb.com'));
  
  if (!page) {
    page = await context.newPage();
    await page.goto('https://www.heb.com', { waitUntil: 'domcontentloaded', timeout: 45000 });
    await randomDelay(5000, 8000); // Let scripts load
  }
  
  // Get current cart count
  const currentCart = await getCartCount(page);
  console.log(`🛒 Current cart: ${currentCart} items\n`);
  
  // Calculate which items to add
  const targetTotal = 42;
  const alreadyAdded = currentCart;
  const toAdd = targetTotal - alreadyAdded;
  
  console.log(`Target: ${targetTotal} items`);
  console.log(`Already in cart: ${alreadyAdded} items`);
  console.log(`Need to add: ${toAdd} items\n`);
  
  if (toAdd <= 0) {
    console.log('✅ Cart already has all items!');
    await browser.close();
    return;
  }
  
  // Add items starting from where we left off
  const startIndex = alreadyAdded;
  const itemsToAdd = ALL_ITEMS.slice(startIndex, startIndex + toAdd);
  
  console.log(`Adding items ${startIndex + 1} to ${startIndex + itemsToAdd.length}:\n`);
  
  const results = { added: [], failed: [] };
  
  for (let i = 0; i < itemsToAdd.length; i++) {
    const item = itemsToAdd[i];
    const globalNum = startIndex + i + 1;
    
    console.log(`[${globalNum}/42] ${item.name}...`);
    
    // Get cart count BEFORE
    const countBefore = await getCartCount(page);
    console.log(`    📊 Cart before: ${countBefore}`);
    
    try {
      // Navigate to search
      await page.goto(`https://www.heb.com/search?q=${encodeURIComponent(item.searchTerm)}`, {
        waitUntil: 'domcontentloaded'
      });
      
      // FIX: Longer wait for page stabilization
      await randomDelay(6000, 9000);
      
      // Find and click add to cart button
      const btn = await findAddToCartButton(page);
      
      if (btn) {
        const clickResult = await clickWithRetry(page, btn);
        
        if (clickResult.success) {
          console.log(`    ✅ Clicked ADD TO CART`);
          
          // FIX: Longer wait and more verification retries
          let verified = false;
          for (let retry = 1; retry <= 5; retry++) {
            await randomDelay(4000, 6000); // Longer wait between checks
            const countAfter = await getCartCount(page);
            console.log(`    📊 Check ${retry}/5: Cart = ${countAfter}`);
            
            if (countAfter > countBefore) {
              console.log(`    ✅✅ VERIFIED: Cart ${countBefore} → ${countAfter}`);
              results.added.push(item.name);
              verified = true;
              break;
            }
            
            if (retry < 5) {
              console.log(`    🔄 Retry ${retry}/5...`);
            }
          }
          
          if (!verified) {
            console.log(`    ❌❌ FAILED: Cart did not increase`);
            results.failed.push({ name: item.name, error: 'Cart verification failed' });
          }
        } else {
          console.log(`    ❌ Click failed: ${clickResult.error}`);
          results.failed.push({ name: item.name, error: clickResult.error });
        }
      } else {
        console.log(`    ❌ Add to cart button not found`);
        results.failed.push({ name: item.name, error: 'Button not found' });
      }
      
    } catch (err) {
      console.log(`    ❌ Error: ${err.message}`);
      results.failed.push({ name: item.name, error: err.message });
    }
    
    // Progress report every 5 items
    if ((i + 1) % 5 === 0 || i === itemsToAdd.length - 1) {
      const currentCount = await getCartCount(page);
      console.log(`\n📈 PROGRESS: ${results.added.length}/${itemsToAdd.length} added this session`);
      console.log(`🛒 CART TOTAL: ${currentCount} items\n`);
    }
    
    // FIX: Longer delay between items
    await randomDelay(5000, 8000);
  }
  
  // Final summary
  const finalCart = await getCartCount(page);
  console.log('\n═══════════════════════════════════════════════');
  console.log('📊 FINAL RESULTS');
  console.log('═══════════════════════════════════════════════');
  console.log(`Started with: ${currentCart} items`);
  console.log(`Added now: ${results.added.length} items`);
  console.log(`Failed: ${results.failed.length} items`);
  console.log(`Final cart: ${finalCart} items`);
  
  if (results.failed.length > 0) {
    console.log('\n❌ Failed items:');
    results.failed.forEach(f => console.log(`  - ${f.name}: ${f.error}`));
  }
  
  await browser.close();
  console.log('\n👋 Done!');
}

// Main execution
if (isStatusMode) {
  checkStatus().catch(err => {
    console.error('Fatal error:', err.message);
    process.exit(1);
  });
} else {
  addMissingItems().catch(err => {
    console.error('Fatal error:', err.message);
    process.exit(1);
  });
}
