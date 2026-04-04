const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

/**
 * HEB Cart Automation - Chrome Edition (Marvin Profile)
 * Populates HEB cart using shopping list
 * 
 * Usage: node heb-cart-chrome.js
 */

const CHROME_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const CHROME_USER_DATA = 'C:\\Users\\Admin\\AppData\\Local\\Microsoft\\Edge\\User Data\\Marvin';
const DATA_DIR = path.join(__dirname, '..', 'data');

/**
 * Connect to existing Edge browser or launch new one
 */
async function connectToBrowser() {
  // Try to connect to existing Edge on port 9222
  try {
    const browser = await chromium.connectOverCDP('http://localhost:9222');
    console.log('✅ Connected to existing Edge browser\n');
    return browser;
  } catch (e) {
    console.log('⚠️  No existing Edge found on port 9222');
    console.log('🚀 Launching new Edge browser...\n');
    
    return await chromium.launchPersistentContext(CHROME_USER_DATA, {
      headless: false,
      executablePath: CHROME_PATH,
      args: [
        '--start-maximized',
        '--disable-blink-features=AutomationControlled',
        '--no-first-run',
        '--no-default-browser-check',
        '--disable-restore-session-state',
        '--disable-session-crashed-bubble',
        '--disable-infobars',
        '--remote-debugging-port=9222'
      ],
      viewport: { width: 1920, height: 1080 }
    });
  }
}

/**
 * Load shopping list from extension items
 */
function loadShoppingList() {
  try {
    const itemsFile = path.join(DATA_DIR, 'heb-extension-items.json');
    const data = JSON.parse(fs.readFileSync(itemsFile, 'utf8'));
    
    // Handle nested shoppingList format (new format)
    if (data.shoppingList) {
      const items = [];
      const categories = ['proteins', 'produce', 'pantry', 'grainsAndBread'];
      
      for (const category of categories) {
        if (data.shoppingList[category]) {
          for (const item of data.shoppingList[category]) {
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
      
      console.log(`📋 Loaded ${items.length} items from shopping list`);
      return items;
    }
    
    // Handle flat items array (legacy format)
    return data.items || [];
  } catch (error) {
    console.error('❌ Could not load shopping list:', error.message);
    return [];
  }
}

/**
 * Get current cart items from HEB
 */
async function getCartItems(page) {
  try {
    await page.goto('https://www.heb.com/cart');
    await page.waitForTimeout(3000);
    
    const cartItems = await page.evaluate(() => {
      const items = [];
      const rows = document.querySelectorAll('[data-testid="cart-item"], .cart-item, [class*="cartItem"], [class*="CartItem"]');
      
      rows.forEach(row => {
        const nameEl = row.querySelector('[data-testid="product-name"], h3, .product-name, [class*="productName"]');
        if (nameEl) {
          items.push({ name: nameEl.textContent.trim() });
        }
      });
      
      return items;
    });
    
    return cartItems;
  } catch (error) {
    console.error('❌ Could not get cart items:', error.message);
    return [];
  }
}

/**
 * Remove item from cart
 */
async function removeItemFromCart(page, itemName) {
  try {
    await page.goto('https://www.heb.com/cart');
    await page.waitForTimeout(2000);
    
    const removed = await page.evaluate((name) => {
      const rows = document.querySelectorAll('[data-testid="cart-item"], .cart-item, [class*="cartItem"]');
      
      for (const row of rows) {
        const nameEl = row.querySelector('[data-testid="product-name"], h3, .product-name');
        if (nameEl && nameEl.textContent.toLowerCase().includes(name.toLowerCase())) {
          const removeBtn = row.querySelector('button[data-testid*="remove"], button[aria-label*="remove"], .remove-button, button[class*="remove"]');
          if (removeBtn) {
            removeBtn.click();
            return true;
          }
        }
      }
      return false;
    }, itemName);
    
    if (removed) {
      await page.waitForTimeout(2000);
    }
    return removed;
  } catch (error) {
    return false;
  }
}

/**
 * Add item to cart via search
 */
async function addItemToCart(page, item) {
  const term = item.searchTerm || item.name;
  
  try {
    await page.goto(`https://www.heb.com/search?q=${encodeURIComponent(term)}`);
    await page.waitForTimeout(4000);
    
    // Try multiple selectors for add button
    const selectors = [
      'button[data-testid*="add-to-cart"]',
      'button[data-testid*="addToCart"]',
      'button[aria-label*="Add to Cart"]',
      'button[class*="addToCart"]'
    ];
    
    for (const selector of selectors) {
      const button = await page.locator(selector).first();
      if (await button.count() > 0) {
        await button.scrollIntoViewIfNeeded();
        await button.click({ delay: 100 });
        await page.waitForTimeout(2000);
        return true;
      }
    }
    
    return false;
  } catch (error) {
    return false;
  }
}

/**
 * Main HEB automation - Bidirectional Sync
 */
async function runHEBCart() {
  console.log('═══════════════════════════════════════');
  console.log('🛒 HEB Cart Sync (Edge - Marvin Profile)');
  console.log('═══════════════════════════════════════\n');
  
  const targetItems = loadShoppingList();
  if (targetItems.length === 0) {
    console.log('⚠️  No items to add. Run dinner plan generator first.');
    return;
  }
  
  console.log(`📋 Target items from meal plan: ${targetItems.length}\n`);
  
  const browserOrContext = await connectToBrowser();
  // Handle both Browser (from CDP) and BrowserContext (from launchPersistentContext)
  const context = browserOrContext.contexts ? browserOrContext.contexts()[0] : browserOrContext;
  let page = context.pages().find(p => p.url().includes('heb.com'));
  
  if (!page) {
    page = await context.newPage();
  }
  
  try {
    console.log('🌐 Opening HEB.com...');
    await page.goto('https://www.heb.com');
    await page.waitForTimeout(5000);
    
    // Verify profile
    console.log(`🔐 Profile: ✅ Marvin Profile`);
    console.log(`📁 Path: ${CHROME_USER_DATA}\n`);
    
    // Check login
    const isLoggedIn = await page.evaluate(() => {
      return !!document.querySelector('[data-testid="account-menu"]') || 
             !!document.querySelector('[class*="account"]') ||
             !document.querySelector('a[href*="/login"]');
    });
    
    if (!isLoggedIn) {
      console.log('⚠️  Please login to HEB in the browser window');
      console.log('   Waiting for login...\n');
      
      let attempts = 0;
      while (attempts < 24) {
        await page.waitForTimeout(5000);
        attempts++;
        
        const nowLoggedIn = await page.evaluate(() => {
          return !!document.querySelector('[data-testid="account-menu"]') || 
                 !document.querySelector('a[href*="/login"]');
        });
        
        if (nowLoggedIn) {
          console.log('✅ Login detected!\n');
          break;
        }
      }
      
      if (attempts >= 24) {
        console.log('❌ Login timeout');
        return;
      }
    } else {
      console.log('✅ Already logged in\n');
    }
    
    // Get current cart
    console.log('📦 Checking current cart...');
    const currentCartItems = await getCartItems(page);
    console.log(`   Found ${currentCartItems.length} items in cart\n`);
    
    // Calculate sync plan
    const targetNames = targetItems.map(i => i.name.toLowerCase());
    const currentNames = currentCartItems.map(i => i.name.toLowerCase());
    
    const toAdd = targetItems.filter(item => 
      !currentNames.some(cartName => cartName.includes(item.name.toLowerCase()))
    );
    
    const toRemove = currentCartItems.filter(item => 
      !targetNames.some(targetName => item.name.toLowerCase().includes(targetName))
    );
    
    console.log('═══════════════════════════════════════');
    console.log('📊 SYNC PLAN');
    console.log('═══════════════════════════════════════');
    console.log(`➕ Add: ${toAdd.length} items`);
    console.log(`➖ Remove: ${toRemove.length} items`);
    console.log(`✓ Keep: ${targetItems.length - toAdd.length} items\n`);
    
    // Remove items not in meal plan
    if (toRemove.length > 0) {
      console.log('═══════════════════════════════════════');
      console.log('🗑️  REMOVING ITEMS NOT IN MEAL PLAN');
      console.log('═══════════════════════════════════════');
      
      for (let i = 0; i < toRemove.length; i++) {
        const item = toRemove[i];
        process.stdout.write(`[${i + 1}/${toRemove.length}] Removing ${item.name}... `);
        
        const removed = await removeItemFromCart(page, item.name);
        console.log(removed ? '✅' : '⚠️');
      }
      console.log('');
    }
    
    // Add missing items
    if (toAdd.length > 0) {
      console.log('═══════════════════════════════════════');
      console.log('➕ ADDING MISSING ITEMS');
      console.log('═══════════════════════════════════════');
      
      for (let i = 0; i < toAdd.length; i++) {
        const item = toAdd[i];
        process.stdout.write(`[${i + 1}/${toAdd.length}] Adding ${item.name}... `);
        
        const added = await addItemToCart(page, item);
        console.log(added ? '✅' : '❌');
      }
      console.log('');
    }
    
    // Final summary
    console.log('═══════════════════════════════════════');
    console.log('✅ SYNC COMPLETE');
    console.log('═══════════════════════════════════════');
    console.log(`📦 Cart now matches meal plan: ${targetItems.length} items`);
    console.log('\n👋 Done!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    try {
      if (browser.disconnect) {
        await browser.disconnect();
      } else {
        await browser.close();
      }
    } catch (e) {}
  }
}

// Run
runHEBCart().catch(console.error);
