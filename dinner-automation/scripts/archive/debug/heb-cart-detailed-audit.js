/**
 * HEB Cart Detailed Audit - Compare actual cart to target list
 */
const { chromium } = require('playwright');

const randomDelay = (min, max) => new Promise(r => setTimeout(r, Math.floor(Math.random() * (max - min + 1)) + min));

// Target meal plan items
const TARGET_ITEMS = [
  { name: "White fish fillets", searchTerm: "tilapia fillet", qty: 1.5, unit: "lbs" },
  { name: "Corn tortillas", searchTerm: "corn tortillas", qty: 1, unit: "pack" },
  { name: "Mango", searchTerm: "mango", qty: 2, unit: "each" },
  { name: "Red onion", searchTerm: "red onion", qty: 1, unit: "each" },
  { name: "Jalapeno", searchTerm: "jalapeno", qty: 2, unit: "each" },
  { name: "Cabbage slaw mix", searchTerm: "coleslaw mix", qty: 1, unit: "bag" },
  { name: "Chipotle mayo", searchTerm: "chipotle mayo", qty: 1, unit: "bottle" },
  { name: "Cod fillets", searchTerm: "cod fillet fresh", qty: 1.5, unit: "lbs" },
  { name: "Unsalted butter", searchTerm: "butter unsalted", qty: 1, unit: "pack" },
  { name: "Fresh parsley", searchTerm: "parsley fresh", qty: 1, unit: "bunch" },
  { name: "Capers", searchTerm: "capers", qty: 1, unit: "jar" },
  { name: "White wine", searchTerm: "white wine cooking", qty: 1, unit: "bottle" },
  { name: "Green beans", searchTerm: "green beans fresh", qty: 1, unit: "lb" },
  { name: "Chicken thighs", searchTerm: "chicken thighs bone-in", qty: 2, unit: "lbs" },
  { name: "Lemon", searchTerm: "lemon", qty: 3, unit: "each" },
  { name: "Fresh thyme", searchTerm: "thyme fresh", qty: 1, unit: "bunch" },
  { name: "Oregano", searchTerm: "oregano dried", qty: 1, unit: "container" },
  { name: "Couscous", searchTerm: "couscous", qty: 1, unit: "lb" },
  { name: "Zucchini", searchTerm: "zucchini", qty: 3, unit: "each" },
  { name: "Ribeye steak", searchTerm: "ribeye steak thin", qty: 1.5, unit: "lbs" },
  { name: "Asian pear", searchTerm: "asian pear", qty: 1, unit: "each" },
  { name: "Gochujang", searchTerm: "gochujang", qty: 1, unit: "container" },
  { name: "Jasmine rice", searchTerm: "jasmine rice", qty: 2, unit: "lbs" },
  { name: "Sesame seeds", searchTerm: "sesame seeds", qty: 1, unit: "container" },
  { name: "Kimchi", searchTerm: "kimchi", qty: 16, unit: "oz" },
  { name: "Chicken breast", searchTerm: "chicken breast boneless", qty: 2, unit: "lbs" },
  { name: "Cucumber", searchTerm: "cucumber", qty: 2, unit: "each" },
  { name: "Cherry tomatoes", searchTerm: "tomatoes cherry", qty: 1, unit: "pint" },
  { name: "Feta cheese", searchTerm: "feta cheese", qty: 8, unit: "oz" },
  { name: "Quinoa", searchTerm: "quinoa", qty: 2, unit: "lbs" },
  { name: "Hummus", searchTerm: "hummus", qty: 10, unit: "oz" },
];

async function waitForCartLoad(page) {
  // Wait for cart to load by checking for cart items or empty cart message
  await page.waitForFunction(() => {
    const cartItems = document.querySelectorAll('[class*="CartItem"], [data-testid="cart-item"]');
    const emptyCart = document.body.innerText.includes('Your cart is empty');
    return cartItems.length > 0 || emptyCart;
  }, { timeout: 30000 });
}

async function extractAllCartItems(page) {
  const allItems = [];
  let scrollCount = 0;
  const maxScrolls = 25;
  
  while (scrollCount < maxScrolls) {
    // Extract currently visible items
    const items = await page.evaluate(() => {
      const results = [];
      const cartItems = document.querySelectorAll('[class*="CartItem"]');
      
      cartItems.forEach(item => {
        // Get name from h3 or anchor
        let name = '';
        const nameEl = item.querySelector('h3 a, h3, a[href*="/product/"]');
        if (nameEl) {
          name = nameEl.textContent?.trim();
        }
        
        // Get quantity from input
        let qty = 1;
        const qtyInput = item.querySelector('input[type="number"]');
        if (qtyInput) {
          qty = parseInt(qtyInput.value) || 1;
        }
        
        // Get price
        let price = '';
        const priceEl = item.querySelector('[class*="price"], [class*="Price"]');
        if (priceEl) {
          price = priceEl.textContent?.trim();
        }
        
        // Get size
        let size = '';
        const sizeEl = item.querySelector('[class*="size"], [class*="Size"]');
        if (sizeEl) {
          size = sizeEl.textContent?.trim();
        }
        
        if (name && name.length > 3) {
          results.push({ name, qty, price, size });
        }
      });
      
      return results;
    });
    
    // Add new unique items
    for (const item of items) {
      if (!allItems.find(i => i.name === item.name)) {
        allItems.push(item);
      }
    }
    
    // Scroll down
    await page.evaluate(() => window.scrollBy(0, 1000));
    await randomDelay(2000, 3000);
    scrollCount++;
    
    // Check if we've loaded all items (cart badge count)
    const cartCount = await page.evaluate(() => {
      const badge = document.querySelector('a[data-testid="cart-link"]');
      const match = badge?.getAttribute('aria-label')?.match(/(\d+)\s+items?/);
      return match ? parseInt(match[1]) : 0;
    });
    
    if (allItems.length >= cartCount || scrollCount >= maxScrolls) {
      break;
    }
  }
  
  return allItems;
}

function findMatch(targetName, cartItems) {
  const targetLower = targetName.toLowerCase();
  
  for (const cart of cartItems) {
    const cartLower = cart.name.toLowerCase();
    
    // Direct match
    if (cartLower.includes(targetLower) || targetLower.includes(cartLower)) {
      return cart;
    }
    
    // Keyword matching for main ingredients
    const keywords = targetLower.split(/\s+/).filter(w => w.length > 3);
    const matches = keywords.filter(kw => cartLower.includes(kw));
    if (matches.length >= 1) {
      return cart;
    }
  }
  
  return null;
}

async function auditCart() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('🛒  HEB Cart Detailed Audit');
  console.log('═══════════════════════════════════════════════════════════\n');
  
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
  console.log('🌐 Loading cart...');
  await page.goto('https://www.heb.com/cart', { waitUntil: 'domcontentloaded' });
  await waitForCartLoad(page);
  await randomDelay(3000, 5000);
  
  // Get cart count
  const cartCount = await page.evaluate(() => {
    const badge = document.querySelector('a[data-testid="cart-link"]');
    const match = badge?.getAttribute('aria-label')?.match(/(\d+)\s+items?/);
    return match ? parseInt(match[1]) : 0;
  });
  
  console.log(`📊 Cart badge: ${cartCount} items\n`);
  console.log('📜 Extracting cart items (this may take a moment)...\n');
  
  // Extract all items
  const cartItems = await extractAllCartItems(page);
  
  console.log(`✅ Extracted ${cartItems.length} items:\n`);
  
  // Display all cart items
  cartItems.forEach((item, i) => {
    console.log(`${String(i + 1).padStart(2)}. ${item.name}`);
    console.log(`    Qty: ${item.qty}${item.size ? ' | ' + item.size : ''}${item.price ? ' | ' + item.price : ''}`);
  });
  
  // Comparison
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('📊 COMPARISON TO MEAL PLAN TARGET LIST');
  console.log('═══════════════════════════════════════════════════════════\n');
  
  const matched = [];
  const missing = [];
  
  for (const target of TARGET_ITEMS) {
    const match = findMatch(target.name, cartItems);
    if (match) {
      matched.push({ target, cart: match });
    } else {
      missing.push(target);
    }
  }
  
  // Find extras
  const extra = cartItems.filter(cart => {
    return !TARGET_ITEMS.some(t => findMatch(t.name, [cart]));
  });
  
  // Display results
  console.log(`✅ MATCHED (${matched.length}/${TARGET_ITEMS.length}):\n`);
  matched.forEach(({ target, cart }, i) => {
    console.log(`  ${String(i + 1).padStart(2)}. ${target.name}`);
    console.log(`      Target: ${target.qty} ${target.unit}`);
    console.log(`      Cart:   ${cart.qty} × ${cart.name.substring(0, 50)}${cart.name.length > 50 ? '...' : ''}`);
  });
  
  if (missing.length > 0) {
    console.log(`\n⚠️  MISSING (${missing.length}):\n`);
    missing.forEach((item, i) => {
      console.log(`  ${i + 1}. ${item.name} (${item.qty} ${item.unit})`);
    });
  }
  
  if (extra.length > 0) {
    console.log(`\n📦 EXTRA ITEMS (${extra.length} - not on meal plan):\n`);
    extra.forEach((item, i) => {
      console.log(`  ${i + 1}. ${item.name} (Qty: ${item.qty})`);
    });
  }
  
  // Summary
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('📈 SUMMARY');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`Target items (meal plan): ${TARGET_ITEMS.length}`);
  console.log(`Found in cart:            ${matched.length}`);
  console.log(`Missing:                  ${missing.length}`);
  console.log(`Extra items:              ${extra.length}`);
  console.log(`Cart badge count:         ${cartCount}`);
  console.log(`Unique items extracted:   ${cartItems.length}`);
  
  // Save results
  const fs = require('fs').promises;
  await fs.writeFile(
    'dinner-automation/data/heb-cart-audit-results.json',
    JSON.stringify({
      timestamp: new Date().toISOString(),
      summary: {
        targetCount: TARGET_ITEMS.length,
        matchedCount: matched.length,
        missingCount: missing.length,
        extraCount: extra.length,
        cartBadgeCount: cartCount,
        extractedCount: cartItems.length
      },
      matched,
      missing,
      extra,
      allCartItems: cartItems
    }, null, 2)
  );
  
  console.log('\n💾 Saved to: dinner-automation/data/heb-cart-audit-results.json');
  
  await browser.close();
}

auditCart().catch(console.error);
