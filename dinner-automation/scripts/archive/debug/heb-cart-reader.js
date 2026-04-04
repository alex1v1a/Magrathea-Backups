/**
 * HEB Cart Reader - Reads all items from cart
 */
const { chromium } = require('playwright');

const randomDelay = (min, max) => new Promise(r => setTimeout(r, Math.floor(Math.random() * (max - min + 1)) + min));

async function scrollToLoadAllItems(page) {
  console.log('📜 Scrolling to load all cart items...');
  
  let lastHeight = 0;
  let scrollAttempts = 0;
  const maxAttempts = 10;
  
  while (scrollAttempts < maxAttempts) {
    const currentHeight = await page.evaluate(() => document.body.scrollHeight);
    
    if (currentHeight === lastHeight) {
      break;
    }
    
    await page.evaluate(() => window.scrollBy(0, 1000));
    await randomDelay(1000, 2000);
    
    lastHeight = currentHeight;
    scrollAttempts++;
  }
  
  console.log(`   Scrolled ${scrollAttempts} times`);
}

async function getCartItems(page) {
  return await page.evaluate(() => {
    const items = [];
    
    // Find all cart item containers
    const cartItems = document.querySelectorAll('[class*="CartItem"]');
    
    cartItems.forEach(item => {
      // Extract name
      let name = '';
      const nameEl = item.querySelector('h3, h4, [class*="ProductName"], [data-testid*="name"]');
      if (nameEl) {
        name = nameEl.textContent?.trim();
      }
      
      // Extract quantity - look for number inputs or quantity display
      let qty = 1;
      const qtyInput = item.querySelector('input[type="number"]');
      if (qtyInput) {
        qty = parseInt(qtyInput.value) || 1;
      }
      
      // Extract price
      let price = '';
      const priceEl = item.querySelector('[class*="price"], [class*="Price"]');
      if (priceEl) {
        price = priceEl.textContent?.trim();
      }
      
      // Extract size/weight info
      let size = '';
      const sizeEl = item.querySelector('[class*="size"], [class*="Size"]');
      if (sizeEl) {
        size = sizeEl.textContent?.trim();
      }
      
      if (name) {
        items.push({ name, qty, price, size });
      }
    });
    
    return items;
  });
}

async function readCart() {
  console.log('═══════════════════════════════════════════════');
  console.log('🛒  HEB Cart Reader');
  console.log('═══════════════════════════════════════════════\n');
  
  let browser;
  try {
    browser = await chromium.connectOverCDP('http://localhost:9222');
  } catch (e) {
    console.log('❌ Could not connect to Edge on port 9222');
    return;
  }
  
  const context = browser.contexts()[0];
  let page = context.pages().find(p => p.url().includes('heb.com'));
  
  if (!page) {
    page = await context.newPage();
  }
  
  // Navigate to cart
  console.log('🌐 Loading cart page...');
  await page.goto('https://www.heb.com/cart', { waitUntil: 'networkidle' });
  await randomDelay(3000, 5000);
  
  // Get cart count from badge
  const cartCount = await page.evaluate(() => {
    const badge = document.querySelector('a[data-testid="cart-link"]');
    if (badge) {
      const match = badge.getAttribute('aria-label')?.match(/(\d+)\s+items?/);
      return match ? parseInt(match[1]) : 0;
    }
    return 0;
  });
  
  console.log(`📊 Cart badge shows: ${cartCount} items\n`);
  
  // Scroll to load all items
  await scrollToLoadAllItems(page);
  
  // Read cart items
  const items = await getCartItems(page);
  
  console.log(`\n📦 Found ${items.length} cart items:\n`);
  
  items.forEach((item, i) => {
    console.log(`${String(i + 1).padStart(2)}. ${item.name}`);
    if (item.size) console.log(`    Size: ${item.size}`);
    console.log(`    Qty: ${item.qty} | Price: ${item.price || 'N/A'}`);
  });
  
  // Save to file for comparison
  const cartData = {
    timestamp: new Date().toISOString(),
    itemCount: cartCount,
    itemsFound: items.length,
    items: items
  };
  
  const fs = require('fs').promises;
  await fs.writeFile(
    'dinner-automation/data/heb-cart-current-contents.json',
    JSON.stringify(cartData, null, 2)
  );
  
  console.log('\n💾 Saved to: dinner-automation/data/heb-cart-current-contents.json');
  
  await browser.close();
}

readCart().catch(console.error);
