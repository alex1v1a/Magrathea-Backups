const { chromium } = require('playwright');

// Get credentials from env
const HEB_EMAIL = process.env.HEB_EMAIL || 'alex@1v1a.com';
const HEB_PASSWORD = process.env.HEB_PASSWORD;

if (!HEB_PASSWORD) {
  console.error('❌ HEB_PASSWORD not set');
  process.exit(1);
}

const randomDelay = (min, max) => {
  const delay = Math.floor(Math.random() * (max - min + 1)) + min;
  return new Promise(r => setTimeout(r, delay));
};

// 42 items from current meal plan
const TARGET_ITEMS = [
  { name: "Bananas", search: "bananas organic" },
  { name: "Apples", search: "apples gala" },
  { name: "Avocados", search: "avocados hass" },
  { name: "Broccoli", search: "broccoli crowns" },
  { name: "Carrots", search: "carrots baby" },
  { name: "Potatoes", search: "potatoes russet" },
  { name: "Sweet potatoes", search: "sweet potatoes" },
  { name: "Green beans", search: "green beans fresh" },
  { name: "Bell peppers", search: "bell peppers" },
  { name: "Onions", search: "onions yellow" },
  { name: "Lettuce", search: "lettuce romaine" },
  { name: "Tomatoes", search: "tomatoes roma" },
  { name: "Chicken thighs", search: "chicken thighs bone-in" },
  { name: "Chicken breast", search: "chicken breast boneless" },
  { name: "Ground beef", search: "ground beef 80/20" },
  { name: "Salmon", search: "salmon fillet atlantic" },
  { name: "Eggs", search: "eggs large 18" },
  { name: "Milk", search: "milk whole gallon" },
  { name: "Cheddar cheese", search: "cheddar cheese shredded" },
  { name: "Sour cream", search: "sour cream" },
  { name: "Butter", search: "butter unsalted" },
  { name: "Bread", search: "bread whole wheat" },
  { name: "Spaghetti", search: "spaghetti whole wheat" },
  { name: "Rice", search: "rice long grain" },
  { name: "Black beans", search: "black beans canned" },
  { name: "Diced tomatoes", search: "tomatoes diced canned" },
  { name: "Chicken broth", search: "chicken broth" },
  { name: "Tortillas", search: "flour tortillas" },
  { name: "Peanut butter", search: "peanut butter" },
  { name: "Jelly", search: "grape jelly" }
];

async function clearCart() {
  console.log('🛒 HEB Cart Rebuild - No Hardcoded Passwords\n');
  
  const browser = await chromium.connectOverCDP('http://localhost:9222');
  const context = browser.contexts()[0];
  const page = context.pages()[0];
  
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
    await randomDelay(3000, 4000);
  }
  
  // Get current cart count
  await page.goto('https://www.heb.com/cart', { waitUntil: 'domcontentloaded' });
  await randomDelay(3000, 4000);
  
  const cartLabel = await page.$eval('a[data-testid="cart-link"]', el => el.getAttribute('aria-label')).catch(() => '');
  const cartMatch = cartLabel.match(/(\d+)\s+items?/);
  const cartCount = cartMatch ? parseInt(cartMatch[1]) : 0;
  console.log(`Current cart: ${cartCount} items`);
  
  // Clear cart
  if (cartCount > 0) {
    console.log('🗑️ Clearing cart...');
    let removed = 0;
    while (removed < cartCount) {
      const removeBtn = await page.$('button[data-testid="remove-item"]');
      if (!removeBtn) break;
      await removeBtn.click();
      await randomDelay(800, 1200);
      removed++;
      if (removed % 5 === 0) console.log(`  Removed ${removed}/${cartCount}`);
    }
    console.log(`✅ Cleared ${removed} items\n`);
  }
  
  // Add items one by one
  console.log(`📦 Adding ${TARGET_ITEMS.length} items...\n`);
  let added = 0;
  let failed = [];
  
  for (const item of TARGET_ITEMS) {
    try {
      await page.goto(`https://www.heb.com/search?q=${encodeURIComponent(item.search)}`, { 
        waitUntil: 'domcontentloaded',
        timeout: 30000 
      });
      await randomDelay(3000, 5000);
      
      // Look for add to cart button
      const addBtn = await page.$('button[data-qe-id="addToCart"]');
      if (addBtn) {
        await addBtn.click();
        await randomDelay(2000, 3000);
        added++;
        console.log(`✅ ${item.name} (${added}/${TARGET_ITEMS.length})`);
      } else {
        failed.push(item.name);
        console.log(`⚠️ ${item.name} - no add button found`);
      }
    } catch (e) {
      failed.push(item.name);
      console.log(`❌ ${item.name} - ${e.message.slice(0, 50)}`);
    }
    
    // Longer delay every 5 items
    if (added % 5 === 0 && added > 0) {
      console.log(`  ⏸️  Pausing after ${added} items...`);
      await randomDelay(5000, 8000);
    }
  }
  
  // Verify
  await page.goto('https://www.heb.com/cart', { waitUntil: 'domcontentloaded' });
  await randomDelay(3000, 4000);
  const finalLabel = await page.$eval('a[data-testid="cart-link"]', el => el.getAttribute('aria-label')).catch(() => '');
  const finalMatch = finalLabel.match(/(\d+)\s+items?/);
  const finalCount = finalMatch ? parseInt(finalMatch[1]) : 0;
  
  console.log(`\n═══════════════════════════════════════════════`);
  console.log(`📊 RESULTS`);
  console.log(`═══════════════════════════════════════════════`);
  console.log(`Added: ${added}/${TARGET_ITEMS.length}`);
  console.log(`Cart total: ${finalCount} items`);
  if (failed.length > 0) console.log(`Failed: ${failed.join(', ')}`);
  console.log(`═══════════════════════════════════════════════`);
  
  await browser.close();
}

clearCart().catch(console.error);
