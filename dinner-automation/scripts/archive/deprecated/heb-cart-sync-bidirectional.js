const { chromium } = require('playwright');
const fs = require('fs').promises;
const path = require('path');

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const DATA_DIR = path.join(__dirname, '..', 'data');

/**
 * Load shopping list from extension items
 */
async function loadShoppingList() {
  try {
    const itemsFile = path.join(DATA_DIR, 'heb-extension-items.json');
    const data = JSON.parse(await fs.readFile(itemsFile, 'utf8'));
    
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
      
      return items;
    }
    
    // Handle flat items array (legacy format)
    return data.items || [];
  } catch (e) {
    console.error('❌ Could not load shopping list:', e.message);
    return [];
  }
}

/**
 * Get current cart items from HEB
 */
async function getCartItems(page) {
  try {
    // Navigate to cart
    await page.goto('https://www.heb.com/cart');
    await sleep(3000);
    
    // Extract cart items
    const cartItems = await page.evaluate(() => {
      const items = [];
      const cartRows = document.querySelectorAll('[data-testid="cart-item"], .cart-item, [class*="cartItem"]');
      
      cartRows.forEach(row => {
        const nameEl = row.querySelector('[data-testid="product-name"], h3, .product-name');
        const removeBtn = row.querySelector('button[data-testid*="remove"], button[aria-label*="remove"], .remove-button');
        
        if (nameEl) {
          items.push({
            name: nameEl.textContent.trim(),
            removeButton: removeBtn ? true : false
          });
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
    // Find and click remove button
    const removed = await page.evaluate((name) => {
      const cartRows = document.querySelectorAll('[data-testid="cart-item"], .cart-item, [class*="cartItem"]');
      
      for (const row of cartRows) {
        const nameEl = row.querySelector('[data-testid="product-name"], h3, .product-name');
        if (nameEl && nameEl.textContent.toLowerCase().includes(name.toLowerCase())) {
          const removeBtn = row.querySelector('button[data-testid*="remove"], button[aria-label*="remove"], .remove-button');
          if (removeBtn) {
            removeBtn.click();
            return true;
          }
        }
      }
      return false;
    }, itemName);
    
    if (removed) {
      await sleep(2000);
      return true;
    }
    return false;
  } catch (error) {
    console.error(`❌ Could not remove ${itemName}:`, error.message);
    return false;
  }
}

/**
 * Add item to cart
 */
async function addItemToCart(page, item) {
  const term = item.searchTerm || item.name;
  
  try {
    await page.goto(`https://www.heb.com/search?q=${encodeURIComponent(term)}`);
    await sleep(4000);
    
    const button = await page.locator('button[data-testid*="add-to-cart"]').first();
    
    if (await button.count() > 0) {
      await button.scrollIntoViewIfNeeded();
      await button.click({ delay: 100 });
      
      await button.evaluate(el => {
        el.style.outline = '4px solid #22c55e';
        setTimeout(() => el.style.outline = '', 2000);
      });
      
      await sleep(2000);
      return true;
    }
    return false;
  } catch (error) {
    console.error(`❌ Could not add ${item.name}:`, error.message);
    return false;
  }
}

/**
 * Main bidirectional sync
 */
async function syncHEBCart() {
  console.log('═══════════════════════════════════════');
  console.log('🛒  HEB Cart Sync - Bidirectional');
  console.log('═══════════════════════════════════════\n');
  
  // Load target items from shopping list
  const targetItems = await loadShoppingList();
  console.log(`📋 Target items from meal plan: ${targetItems.length}\n`);
  
  // Connect to Chrome
  console.log('Connecting to Chrome...');
  let browser;
  try {
    browser = await chromium.connectOverCDP('http://localhost:9222');
    console.log('✅ Connected to shared Chrome\n');
  } catch (e) {
    console.log('❌ Could not connect to Chrome on port 9222');
    console.log('Please run: node scripts/launch-shared-chrome.js');
    process.exit(1);
  }
  
  const context = browser.contexts()[0] || await browser.newContext();
  let page = context.pages().find(p => p.url().includes('heb.com'));
  
  if (!page) {
    page = await context.newPage();
    await page.goto('https://www.heb.com');
    await sleep(3000);
  }
  
  console.log(`Current page: ${page.url()}\n`);
  
  // Check login
  const isLoggedIn = await page.evaluate(() => {
    return !!document.querySelector('[data-testid="account-menu"]') && 
           !document.querySelector('a[href*="/login"]');
  });
  
  if (!isLoggedIn) {
    console.log('⚠️  Please login to HEB in the Chrome window');
    console.log('Waiting for login (max 2 minutes)...\n');
    
    let attempts = 0;
    const maxAttempts = 24;
    
    while (attempts < maxAttempts) {
      await sleep(5000);
      attempts++;
      
      const nowLoggedIn = await page.evaluate(() => {
        return !!document.querySelector('[data-testid="account-menu"]') && 
               !document.querySelector('a[href*="/login"]');
      });
      
      if (nowLoggedIn) {
        console.log('✅ Login detected!\n');
        break;
      }
    }
    
    if (attempts >= maxAttempts) {
      console.log('\n❌ Timeout: Not logged in after 2 minutes');
      await browser.disconnect();
      process.exit(1);
    }
  }
  
  console.log('✅ Logged in\n');
  
  // Get current cart items
  console.log('📦 Getting current cart items...');
  const currentCartItems = await getCartItems(page);
  console.log(`   Found ${currentCartItems.length} items in cart\n`);
  
  // Determine what to add and remove
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
  console.log(`➕ Items to add: ${toAdd.length}`);
  console.log(`➖ Items to remove: ${toRemove.length}`);
  console.log(`✓ Items already in cart: ${targetItems.length - toAdd.length}\n`);
  
  // Remove items not in meal plan
  if (toRemove.length > 0) {
    console.log('═══════════════════════════════════════');
    console.log('🗑️  REMOVING ITEMS NOT IN MEAL PLAN');
    console.log('═══════════════════════════════════════');
    
    // Navigate to cart for removal
    await page.goto('https://www.heb.com/cart');
    await sleep(3000);
    
    for (let i = 0; i < toRemove.length; i++) {
      const item = toRemove[i];
      console.log(`[${i + 1}/${toRemove.length}] Removing: ${item.name}...`);
      
      const removed = await removeItemFromCart(page, item.name);
      if (removed) {
        console.log('   ✅ Removed');
      } else {
        console.log('   ⚠️  Could not remove (may already be removed)');
      }
    }
    console.log('');
  }
  
  // Add missing items
  if (toAdd.length > 0) {
    console.log('═══════════════════════════════════════');
    console.log('➕ ADDING MISSING ITEMS');
    console.log('═══════════════════════════════════════');
    
    const results = { added: [], failed: [] };
    
    for (let i = 0; i < toAdd.length; i++) {
      const item = toAdd[i];
      console.log(`[${i + 1}/${toAdd.length}] Adding: ${item.name}...`);
      
      const added = await addItemToCart(page, item);
      if (added) {
        console.log('   ✅ Added');
        results.added.push(item.name);
      } else {
        console.log('   ❌ Failed');
        results.failed.push(item.name);
      }
    }
    console.log('');
  }
  
  // Final summary
  console.log('═══════════════════════════════════════');
  console.log('📊 SYNC COMPLETE');
  console.log('═══════════════════════════════════════');
  console.log(`➕ Added: ${toAdd.length} items`);
  console.log(`➖ Removed: ${toRemove.length} items`);
  console.log(`📦 Cart now has: ${targetItems.length} items (matches meal plan)`);
  console.log('\n👋 Done!');
  
  await browser.disconnect();
}

syncHEBCart().catch(err => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});
