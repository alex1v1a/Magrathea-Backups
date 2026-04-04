const { chromium } = require('playwright');
const { getCredentials } = require('./patterns/credentials');

// Get credentials from environment
const HEB_EMAIL = process.env.HEB_EMAIL || 'alex@1v1a.com';
const HEB_PASSWORD = process.env.HEB_PASSWORD;

if (!HEB_PASSWORD) {
  console.error('❌ HEB_PASSWORD environment variable not set');
  process.exit(1);
}

// 42 items from meal plan
const itemsToAdd = [
  // Produce
  'Bananas',
  'Apples',
  'Lemons',
  'Avocados',
  'Broccoli',
  'Carrots',
  'Potatoes',
  'Sweet potatoes',
  'Green beans',
  'Bell peppers',
  'Onions',
  'Lettuce',
  'Tomatoes',
  'Cilantro',
  'Garlic',
  'Berries',
  // Meat & Seafood
  'Chicken thighs',
  'Chicken breast',
  'Ground beef',
  'Salmon',
  'Sliced turkey',
  // Dairy
  'Eggs',
  'Milk',
  'Greek yogurt',
  'Shredded cheddar cheese',
  'Shredded Mexican blend',
  'Sour cream',
  'Butter',
  'Cheese sticks',
  // Pantry
  'Whole wheat bread',
  'Whole wheat spaghetti',
  'Rice',
  'Black beans',
  'Refried beans',
  'Diced tomatoes',
  'Chicken broth',
  'Corn tortillas',
  'Flour tortillas',
  'Pizza dough',
  'Marinara sauce',
  'Peanut butter',
  'Jelly'
];

async function clearAndAddCart() {
  console.log('🛒 HEB Cart Clear & Rebuild\n');
  
  const browser = await chromium.connectOverCDP('http://localhost:9222');
  const context = browser.contexts()[0] || await browser.newContext();
  const page = context.pages()[0] || await context.newPage();
  
  // Check if logged in
  await page.goto('https://www.heb.com/cart');
  await page.waitForTimeout(3000);
  
  // Login if needed
  if (await page.isVisible('text=Log in').catch(() => false)) {
    console.log('🔑 Logging in...');
    await page.fill('input[type="email"]', HEB_EMAIL);
    await page.click('button:has-text("Continue")');
    await page.waitForTimeout(2000);
    await page.fill('input[type="password"]', HEB_PASSWORD);
    await page.click('button:has-text("Log in")');
    await page.waitForTimeout(5000);
  }
  
  // Clear cart
  console.log('🗑️ Clearing cart...');
  const removeButtons = await page.$$('button[data-testid="remove-item"]');
  for (const btn of removeButtons) {
    await btn.click();
    await page.waitForTimeout(500);
  }
  
  // Add items
  console.log(`📦 Adding ${itemsToAdd.length} items...\n`);
  let added = 0;
  
  for (const item of itemsToAdd) {
    try {
      await page.goto(`https://www.heb.com/search?q=${encodeURIComponent(item)}`);
      await page.waitForTimeout(2000);
      
      const addBtn = await page.$('button[data-qe-id="addToCart"]');
      if (addBtn) {
        await addBtn.click();
        added++;
        console.log(`✅ ${item}`);
      } else {
        console.log(`⚠️ ${item} - not found`);
      }
      await page.waitForTimeout(1500);
    } catch (e) {
      console.log(`❌ ${item} - ${e.message}`);
    }
  }
  
  // Verify
  await page.goto('https://www.heb.com/cart');
  await page.waitForTimeout(3000);
  const cartCount = await page.$eval('[data-testid="cart-link"]', el => {
    const match = el.textContent.match(/(\d+)/);
    return match ? parseInt(match[1]) : 0;
  }).catch(() => 0);
  
  console.log(`\n📊 Complete: ${added}/${itemsToAdd.length} items added`);
  console.log(`🛒 Cart now has: ${cartCount} items`);
  
  await browser.close();
}

clearAndAddCart().catch(console.error);
