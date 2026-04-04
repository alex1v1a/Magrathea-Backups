const { chromium } = require('playwright');
const { getCredentials } = require('./patterns/credentials');

// Get credentials from environment
const HEB_EMAIL = process.env.HEB_EMAIL || 'alex@1v1a.com';
const HEB_PASSWORD = process.env.HEB_PASSWORD;

if (!HEB_PASSWORD) {
  console.error('❌ HEB_PASSWORD environment variable not set');
  process.exit(1);
}

// Exact items from meal plan ingredients list
const MEAL_PLAN_ITEMS = [
  // Produce
  { name: "Bananas", search: "bananas organic", qty: 1 },
  { name: "Apples", search: "apples gala bag", qty: 1 },
  { name: "Lemons", search: "lemons", qty: 3 },
  { name: "Avocados", search: "avocados hass", qty: 4 },
  { name: "Broccoli", search: "broccoli crowns", qty: 2 },
  { name: "Carrots", search: "carrots baby bag", qty: 1 },
  { name: "Potatoes", search: "potatoes russet bag", qty: 1 },
  { name: "Sweet potatoes", search: "sweet potatoes", qty: 3 },
  { name: "Green beans", search: "green beans fresh", qty: 1 },
  { name: "Bell peppers", search: "bell peppers mixed", qty: 3 },
  { name: "Onions", search: "onions yellow bag", qty: 1 },
  { name: "Lettuce", search: "lettuce romaine hearts", qty: 1 },
  { name: "Tomatoes", search: "tomatoes roma", qty: 6 },
  { name: "Cilantro", search: "cilantro bunch", qty: 1 },
  { name: "Garlic", search: "garlic head", qty: 1 },
  { name: "Berries", search: "strawberries fresh", qty: 1 },
  
  // Meat & Seafood
  { name: "Chicken thighs", search: "chicken thighs bone in", qty: 3 },
  { name: "Chicken breast", search: "chicken breast boneless", qty: 2 },
  { name: "Ground beef", search: "ground beef 80/20", qty: 2 },
  { name: "Salmon", search: "salmon fillet atlantic", qty: 1 },
  { name: "Sliced turkey", search: "turkey deli sliced", qty: 1 },
  
  // Dairy & Eggs
  { name: "Eggs", search: "eggs large 18 count", qty: 1 },
  { name: "Milk", search: "milk whole gallon", qty: 1 },
  { name: "Greek yogurt", search: "greek yogurt plain", qty: 1 },
  { name: "Cheddar cheese", search: "cheddar cheese shredded", qty: 1 },
  { name: "Mexican blend cheese", search: "mexican cheese blend shredded", qty: 1 },
  { name: "Sour cream", search: "sour cream", qty: 1 },
  { name: "Butter", search: "butter unsalted", qty: 1 },
  { name: "Cheese sticks", search: "cheese sticks string", qty: 1 },
  
  // Pantry
  { name: "Whole wheat bread", search: "bread whole wheat", qty: 1 },
  { name: "Spaghetti", search: "spaghetti whole wheat", qty: 1 },
  { name: "Rice", search: "rice long grain", qty: 1 },
  { name: "Black beans", search: "black beans canned", qty: 2 },
  { name: "Refried beans", search: "refried beans canned", qty: 1 },
  { name: "Diced tomatoes", search: "tomatoes diced canned", qty: 2 },
  { name: "Chicken broth", search: "chicken broth", qty: 1 },
  { name: "Corn tortillas", search: "corn tortillas", qty: 1 },
  { name: "Flour tortillas", search: "flour tortillas", qty: 1 },
  { name: "Pizza dough", search: "pizza dough", qty: 1 },
  { name: "Marinara sauce", search: "marinara sauce", qty: 1 },
  { name: "Peanut butter", search: "peanut butter", qty: 1 },
  { name: "Jelly", search: "grape jelly", qty: 1 },
  { name: "Honey", search: "honey", qty: 1 },
  { name: "Olive oil", search: "olive oil", qty: 1 },
  { name: "Oats", search: "oats old fashioned", qty: 1 },
  { name: "Granola", search: "granola", qty: 1 },
  { name: "Taco seasoning", search: "taco seasoning", qty: 1 },
  { name: "Pepperoni", search: "pepperoni", qty: 1 },
  
  // Frozen
  { name: "Frozen corn", search: "corn frozen", qty: 1 },
  { name: "Cornbread mix", search: "cornbread mix", qty: 1 }
];

const randomDelay = (min, max) => {
  const delay = Math.floor(Math.random() * (max - min + 1)) + min;
  return new Promise(r => setTimeout(r, delay));
};

async function clearCartCompletely(page) {
  console.log('🗑️ Clearing cart completely...');
  await page.goto('https://www.heb.com/cart', { waitUntil: 'domcontentloaded' });
  await randomDelay(3000, 5000);
  
  let removed = 0;
  let attempts = 0;
  const maxAttempts = 200; // Safety limit
  
  while (attempts < maxAttempts) {
    // Find all remove buttons
    const removeButtons = await page.$$('button[data-testid="remove-item"], button[aria-label*="Remove"], button[data-qe-id*="remove"]');
    
    if (removeButtons.length === 0) {
      console.log(`✅ Cart cleared — removed ${removed} items`);
      break;
    }
    
    // Click the first remove button
    try {
      await removeButtons[0].click();
      removed++;
      if (removed % 10 === 0) console.log(`  Removed ${removed} items...`);
      await randomDelay(500, 1000);
    } catch (e) {
      console.log(`  ⚠️ Click failed, retrying...`);
      await randomDelay(1000, 2000);
    }
    
    attempts++;
    
    // Refresh page every 20 items to avoid stale elements
    if (attempts % 20 === 0) {
      await page.goto('https://www.heb.com/cart', { waitUntil: 'domcontentloaded' });
      await randomDelay(2000, 3000);
    }
  }
  
  return removed;
}

async function syncCart() {
  console.log('🛒 HEB Cart Sync — Matching Ingredients List\n');
  console.log(`Target: ${MEAL_PLAN_ITEMS.length} unique items from meal plan\n`);
  
  const browser = await chromium.connectOverCDP('http://localhost:9222');
  const context = browser.contexts()[0] || await browser.newContext();
  const page = context.pages()[0] || await context.newPage();
  
  // Login check
  await page.goto('https://www.heb.com/cart', { waitUntil: 'domcontentloaded' });
  await randomDelay(2000, 3000);
  
  if (await page.isVisible('text=Log in').catch(() => false)) {
    console.log('🔑 Logging in...');
    await page.fill('input[type="email"]', HEB_EMAIL);
    await page.click('button[type="submit"]');
    await randomDelay(2000, 3000);
    await page.fill('input[type="password"]', HEB_PASSWORD);
    await page.click('button[type="submit"]');
    await randomDelay(5000, 7000);
  }
  
  // Get current cart count before clearing
  const beforeLabel = await page.$eval('a[data-testid="cart-link"]', el => el.getAttribute('aria-label')).catch(() => '');
  const beforeMatch = beforeLabel.match(/(\d+)\s+items?/);
  const beforeCount = beforeMatch ? parseInt(beforeMatch[1]) : 0;
  console.log(`📊 Current cart: ${beforeCount} items`);
  
  // Clear cart completely
  const cleared = await clearCartCompletely(page);
  console.log();
  
  // Add all meal plan items
  console.log(`📦 Adding ${MEAL_PLAN_ITEMS.length} items from meal plan...\n`);
  let added = 0;
  let failed = [];
  
  for (let i = 0; i < MEAL_PLAN_ITEMS.length; i++) {
    const item = MEAL_PLAN_ITEMS[i];
    try {
      console.log(`[${i + 1}/${MEAL_PLAN_ITEMS.length}] Adding: ${item.name}`);
      
      await page.goto(`https://www.heb.com/search?q=${encodeURIComponent(item.search)}`, { 
        waitUntil: 'domcontentloaded',
        timeout: 30000 
      });
      await randomDelay(3000, 5000);
      
      // Look for add to cart button with multiple selectors
      const addBtnSelectors = [
        'button[data-qe-id="addToCart"]',
        'button[data-testid="add-to-cart"]',
        'button:has-text("Add to cart")',
        'button[aria-label*="Add to cart"]'
      ];
      
      let clicked = false;
      for (const selector of addBtnSelectors) {
        const btn = await page.$(selector);
        if (btn) {
          await btn.click();
          clicked = true;
          break;
        }
      }
      
      if (clicked) {
        await randomDelay(2000, 3000);
        added++;
        console.log(`  ✅ Added`);
      } else {
        failed.push(item.name);
        console.log(`  ⚠️ Add button not found`);
      }
      
      // Longer delay every 10 items
      if ((i + 1) % 10 === 0) {
        console.log(`  ⏸️  Pausing after ${i + 1} items...`);
        await randomDelay(5000, 8000);
      }
    } catch (e) {
      failed.push(item.name);
      console.log(`  ❌ Error: ${e.message.slice(0, 60)}`);
    }
  }
  
  // Verify final cart
  await page.goto('https://www.heb.com/cart', { waitUntil: 'domcontentloaded' });
  await randomDelay(3000, 5000);
  const finalLabel = await page.$eval('a[data-testid="cart-link"]', el => el.getAttribute('aria-label')).catch(() => '');
  const finalMatch = finalLabel.match(/(\d+)\s+items?/);
  const finalCount = finalMatch ? parseInt(finalMatch[1]) : 0;
  
  console.log(`\n${'='.repeat(50)}`);
  console.log('📊 SYNC COMPLETE');
  console.log(`${'='.repeat(50)}`);
  console.log(`Items added: ${added}/${MEAL_PLAN_ITEMS.length}`);
  console.log(`Cart total: ${finalCount} items`);
  console.log(`Failed: ${failed.length > 0 ? failed.join(', ') : 'None'}`);
  console.log(`${'='.repeat(50)}`);
  
  if (failed.length > 0) {
    console.log('\n⚠️ Some items could not be added. You may need to:');
    console.log('   - Search for substitutes on HEB.com');
    console.log('   - Add missing items manually');
  }
  
  await browser.close();
}

syncCart().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
