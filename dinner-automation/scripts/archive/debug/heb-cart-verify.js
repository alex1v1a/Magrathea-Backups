/**
 * HEB Cart Verification with Item-Level Checking
 * Reads actual cart contents and compares to meal plan
 */
const { chromium } = require('playwright');
const fs = require('fs').promises;

const MEAL_PLAN_ITEMS = [
  { name: "White fish fillets", search: "tilapia", qty: 1.5, unit: "lbs" },
  { name: "Corn tortillas", search: "corn tortillas", qty: 1, unit: "pack" },
  { name: "Mango", search: "mango", qty: 2, unit: "each" },
  { name: "Red onion", search: "red onion", qty: 1, unit: "each" },
  { name: "Jalapeno", search: "jalapeno", qty: 2, unit: "each" },
  { name: "Cabbage slaw mix", search: "coleslaw", qty: 1, unit: "bag" },
  { name: "Chipotle mayo", search: "chipotle mayo", qty: 1, unit: "bottle" },
  { name: "Cod fillets", search: "cod", qty: 1.5, unit: "lbs" },
  { name: "Butter", search: "butter", qty: 1, unit: "pack" },
  { name: "Fresh parsley", search: "parsley", qty: 1, unit: "bunch" },
  { name: "Capers", search: "capers", qty: 1, unit: "jar" },
  { name: "White wine", search: "white wine", qty: 1, unit: "bottle" },
  { name: "Green beans", search: "green beans", qty: 1, unit: "lb" },
  { name: "Chicken thighs", search: "chicken thighs", qty: 2, unit: "lbs" },
  { name: "Lemon", search: "lemon", qty: 3, unit: "each" },
  { name: "Fresh thyme", search: "thyme", qty: 1, unit: "bunch" },
  { name: "Oregano", search: "oregano", qty: 1, unit: "container" },
  { name: "Couscous", search: "couscous", qty: 1, unit: "lb" },
  { name: "Zucchini", search: "zucchini", qty: 3, unit: "each" },
  { name: "Ribeye steak", search: "ribeye", qty: 1.5, unit: "lbs" },
  { name: "Asian pear", search: "asian pear", qty: 1, unit: "each" },
  { name: "Gochujang", search: "gochujang", qty: 1, unit: "container" },
  { name: "Jasmine rice", search: "jasmine rice", qty: 2, unit: "lbs" },
  { name: "Sesame seeds", search: "sesame", qty: 1, unit: "container" },
  { name: "Kimchi", search: "kimchi", qty: 16, unit: "oz" },
  { name: "Chicken breast", search: "chicken breast", qty: 2, unit: "lbs" },
  { name: "Cucumber", search: "cucumber", qty: 2, unit: "each" },
  { name: "Cherry tomatoes", search: "cherry tomatoes", qty: 1, unit: "pint" },
  { name: "Feta cheese", search: "feta", qty: 8, unit: "oz" },
  { name: "Quinoa", search: "quinoa", qty: 2, unit: "lbs" },
  { name: "Hummus", search: "hummus", qty: 10, unit: "oz" }
];

function fuzzyMatch(target, itemName) {
  const targetLower = target.toLowerCase();
  const itemLower = itemName.toLowerCase();
  
  // Direct inclusion
  if (itemLower.includes(targetLower) || targetLower.includes(itemLower)) {
    return true;
  }
  
  // Check for key search terms
  const searchTerms = targetLower.split(/\s+/).filter(w => w.length > 3);
  return searchTerms.some(term => itemLower.includes(term));
}

async function verifyCart() {
  console.log('═══════════════════════════════════════════════');
  console.log('🛒  HEB Cart Item-Level Verification');
  console.log('═══════════════════════════════════════════════\n');
  
  let browser;
  try {
    browser = await chromium.connectOverCDP('http://localhost:9222');
    console.log('✅ Connected to Microsoft Edge\n');
  } catch (e) {
    console.log('❌ Could not connect to Edge. Run: node dinner-automation/scripts/launch-shared-chrome.js');
    return;
  }
  
  const context = browser.contexts()[0];
  let page = context.pages().find(p => p.url().includes('heb.com'));
  
  if (!page) {
    page = await context.newPage();
  }
  
  // Navigate to cart with retry
  console.log('🌐 Loading cart...');
  await page.goto('https://www.heb.com/cart', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(5000);
  
  // Get cart count
  const cartCount = await page.evaluate(() => {
    const badge = document.querySelector('a[data-testid="cart-link"]');
    const match = badge?.getAttribute('aria-label')?.match(/(\d+)\s+items?/);
    return match ? parseInt(match[1]) : 0;
  });
  
  console.log(`📊 Cart badge: ${cartCount} items\n`);
  
  // Scroll to load all items
  console.log('📜 Scrolling to load all items...');
  for (let i = 0; i < 20; i++) {
    await page.evaluate(() => window.scrollBy(0, 1000));
    await page.waitForTimeout(2000);
  }
  
  // Extract cart items
  const cartItems = await page.evaluate(() => {
    const items = [];
    const cartElements = document.querySelectorAll('[class*="CartItem"]');
    
    cartElements.forEach(el => {
      const nameEl = el.querySelector('h3 a, h3, h4');
      const qtyEl = el.querySelector('input[type="number"]');
      
      if (nameEl) {
        items.push({
          name: nameEl.textContent?.trim(),
          qty: qtyEl ? qtyEl.value : '1'
        });
      }
    });
    
    return items;
  });
  
  console.log(`✅ Found ${cartItems.length} items in cart:\n`);
  
  // Compare with meal plan
  const found = [];
  const missing = [];
  
  for (const mealItem of MEAL_PLAN_ITEMS) {
    const match = cartItems.find(cartItem => fuzzyMatch(mealItem.search, cartItem.name));
    if (match) {
      found.push({ meal: mealItem, cart: match });
    } else {
      missing.push(mealItem);
    }
  }
  
  // Report results
  console.log('═══════════════════════════════════════════════');
  console.log('📊 VERIFICATION RESULTS');
  console.log('═══════════════════════════════════════════════\n');
  
  console.log(`✅ FOUND: ${found.length}/${MEAL_PLAN_ITEMS.length} meal plan items\n`);
  found.forEach(({ meal, cart }, i) => {
    console.log(`  ${i + 1}. ${meal.name}`);
    console.log(`     Target: ${meal.qty} ${meal.unit}`);
    console.log(`     Cart: ${cart.name.substring(0, 50)}`);
  });
  
  if (missing.length > 0) {
    console.log(`\n⚠️  MISSING: ${missing.length} items\n`);
    missing.forEach((item, i) => {
      console.log(`  ${i + 1}. ${item.name} (${item.qty} ${item.unit})`);
    });
  }
  
  // Find extra items
  const extra = cartItems.filter(cartItem => {
    return !MEAL_PLAN_ITEMS.some(mealItem => fuzzyMatch(mealItem.search, cartItem.name));
  });
  
  if (extra.length > 0) {
    console.log(`\n📦 EXTRA ITEMS (not in meal plan): ${extra.length}\n`);
    extra.slice(0, 10).forEach((item, i) => {
      console.log(`  ${i + 1}. ${item.name.substring(0, 60)}`);
    });
    if (extra.length > 10) {
      console.log(`  ... and ${extra.length - 10} more`);
    }
  }
  
  console.log('\n═══════════════════════════════════════════════');
  console.log('📈 SUMMARY');
  console.log('═══════════════════════════════════════════════');
  console.log(`Meal plan items: ${MEAL_PLAN_ITEMS.length}`);
  console.log(`Found in cart:   ${found.length}`);
  console.log(`Missing:         ${missing.length}`);
  console.log(`Extra items:     ${extra.length}`);
  console.log(`Cart total:      ${cartCount} (badge) / ${cartItems.length} (extracted)`);
  console.log(`Status:          ${found.length === MEAL_PLAN_ITEMS.length ? '✅ COMPLETE' : `⚠️ ${missing.length} items needed`}`);
  
  // Save results
  await fs.writeFile(
    'dinner-automation/data/heb-cart-verification.json',
    JSON.stringify({
      timestamp: new Date().toISOString(),
      summary: {
        totalMealItems: MEAL_PLAN_ITEMS.length,
        found: found.length,
        missing: missing.length,
        extra: extra.length,
        cartBadge: cartCount,
        extracted: cartItems.length
      },
      found,
      missing,
      extra,
      allCartItems: cartItems
    }, null, 2)
  );
  
  console.log('\n💾 Results saved: dinner-automation/data/heb-cart-verification.json');
  
  // Close page to prevent tab accumulation
  await page.close();
  
  await browser.close();
}

verifyCart().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
