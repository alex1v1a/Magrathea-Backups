/**
 * HEB Cart Audit & Adjustment
 * Reads current cart, compares to target list, adds/removes as needed
 */

const { chromium } = require('playwright');
const fs = require('fs').promises;
const path = require('path');

const randomDelay = (min, max) => {
  const delay = Math.floor(Math.random() * (max - min + 1)) + min;
  return new Promise(r => setTimeout(r, delay));
};

// Target items from meal plan (with expected quantities)
const TARGET_ITEMS = [
  { name: "White fish fillets", searchTerm: "tilapia fillet", qty: 1.5, unit: "lbs", meal: "Fish Tacos" },
  { name: "Corn tortillas", searchTerm: "corn tortillas", qty: 1, unit: "pack", meal: "Fish Tacos" },
  { name: "Mango", searchTerm: "mango", qty: 2, unit: "each", meal: "Fish Tacos" },
  { name: "Red onion", searchTerm: "red onion", qty: 1, unit: "each", meal: "Fish Tacos" },
  { name: "Jalapeno", searchTerm: "jalapeno", qty: 2, unit: "each", meal: "Fish Tacos" },
  { name: "Cabbage slaw mix", searchTerm: "coleslaw mix", qty: 1, unit: "bag", meal: "Fish Tacos" },
  { name: "Chipotle mayo", searchTerm: "chipotle mayo", qty: 1, unit: "bottle", meal: "Fish Tacos" },
  { name: "Cod fillets", searchTerm: "cod fillet fresh", qty: 1.5, unit: "lbs", meal: "Pan-Seared Cod" },
  { name: "Unsalted butter", searchTerm: "butter unsalted", qty: 1, unit: "pack", meal: "Pan-Seared Cod" },
  { name: "Fresh parsley", searchTerm: "parsley fresh", qty: 1, unit: "bunch", meal: "Pan-Seared Cod" },
  { name: "Capers", searchTerm: "capers", qty: 1, unit: "jar", meal: "Pan-Seared Cod" },
  { name: "White wine", searchTerm: "white wine cooking", qty: 1, unit: "bottle", meal: "Pan-Seared Cod" },
  { name: "Green beans", searchTerm: "green beans fresh", qty: 1, unit: "lb", meal: "Pan-Seared Cod" },
  { name: "Chicken thighs", searchTerm: "chicken thighs bone-in", qty: 2, unit: "lbs", meal: "Lemon Herb Chicken" },
  { name: "Lemon", searchTerm: "lemon", qty: 3, unit: "each", meal: "Lemon Herb Chicken" },
  { name: "Fresh thyme", searchTerm: "thyme fresh", qty: 1, unit: "bunch", meal: "Lemon Herb Chicken" },
  { name: "Oregano", searchTerm: "oregano dried", qty: 1, unit: "container", meal: "Lemon Herb Chicken" },
  { name: "Couscous", searchTerm: "couscous", qty: 1, unit: "lb", meal: "Lemon Herb Chicken" },
  { name: "Zucchini", searchTerm: "zucchini", qty: 3, unit: "each", meal: "Lemon Herb Chicken" },
  { name: "Ribeye steak", searchTerm: "ribeye steak thin", qty: 1.5, unit: "lbs", meal: "Korean Beef Bowl" },
  { name: "Asian pear", searchTerm: "asian pear", qty: 1, unit: "each", meal: "Korean Beef Bowl" },
  { name: "Gochujang", searchTerm: "gochujang", qty: 1, unit: "container", meal: "Korean Beef Bowl" },
  { name: "Jasmine rice", searchTerm: "jasmine rice", qty: 2, unit: "lbs", meal: "Korean Beef Bowl" },
  { name: "Sesame seeds", searchTerm: "sesame seeds", qty: 1, unit: "container", meal: "Korean Beef Bowl" },
  { name: "Kimchi", searchTerm: "kimchi", qty: 16, unit: "oz", meal: "Korean Beef Bowl" },
  { name: "Chicken breast", searchTerm: "chicken breast boneless", qty: 2, unit: "lbs", meal: "Mediterranean Bowl" },
  { name: "Cucumber", searchTerm: "cucumber", qty: 2, unit: "each", meal: "Mediterranean Bowl" },
  { name: "Cherry tomatoes", searchTerm: "tomatoes cherry", qty: 1, unit: "pint", meal: "Mediterranean Bowl" },
  { name: "Feta cheese", searchTerm: "feta cheese", qty: 8, unit: "oz", meal: "Mediterranean Bowl" },
  { name: "Quinoa", searchTerm: "quinoa", qty: 2, unit: "lbs", meal: "Mediterranean Bowl" },
  { name: "Hummus", searchTerm: "hummus", qty: 10, unit: "oz", meal: "Mediterranean Bowl" },
];

async function getCartContents(page) {
  console.log('\n📖 Reading cart contents...');
  
  await page.goto('https://www.heb.com/cart', { waitUntil: 'networkidle' });
  await randomDelay(2000, 3000);
  
  const cartItems = await page.evaluate(() => {
    const items = [];
    
    // Try multiple selectors for cart items
    const selectors = [
      '[data-testid="cart-item"]',
      '.CartItem_cartItem__',
      '[class*="cartItem"]',
      '.cart-item',
      '[data-qe-id="cartItem"]'
    ];
    
    for (const selector of selectors) {
      const elements = document.querySelectorAll(selector);
      if (elements.length > 0) {
        elements.forEach(el => {
          // Try to get item name
          const nameSelectors = [
            '[data-testid="product-name"]',
            '.ProductName_productName__',
            'h3', 'h4', '.product-name',
            '[data-qe-id="productName"]'
          ];
          
          let name = '';
          for (const nameSel of nameSelectors) {
            const nameEl = el.querySelector(nameSel);
            if (nameEl) {
              name = nameEl.textContent?.trim();
              if (name) break;
            }
          }
          
          // Try to get quantity
          const qtySelectors = [
            '[data-testid="quantity-selector"]',
            'input[type="number"]',
            '.quantity-input',
            '[class*="quantity"]'
          ];
          
          let qty = 1;
          for (const qtySel of qtySelectors) {
            const qtyEl = el.querySelector(qtySel);
            if (qtyEl) {
              const val = qtyEl.value || qtyEl.textContent;
              const parsed = parseInt(val);
              if (!isNaN(parsed)) {
                qty = parsed;
                break;
              }
            }
          }
          
          // Try to get price
          const priceSelectors = [
            '[data-testid="product-price"]',
            '.price',
            '[class*="price"]'
          ];
          
          let price = '';
          for (const priceSel of priceSelectors) {
            const priceEl = el.querySelector(priceSel);
            if (priceEl) {
              price = priceEl.textContent?.trim();
              if (price) break;
            }
          }
          
          if (name) {
            items.push({ name, qty, price });
          }
        });
        
        if (items.length > 0) break;
      }
    }
    
    return items;
  });
  
  return cartItems;
}

async function auditCart() {
  console.log('═══════════════════════════════════════════════');
  console.log('🛒  HEB Cart Audit');
  console.log('═══════════════════════════════════════════════\n');
  
  // Connect to Edge via CDP
  let browser;
  try {
    browser = await chromium.connectOverCDP('http://localhost:9222');
    console.log('✅ Connected to Microsoft Edge via CDP\n');
  } catch (e) {
    console.log('❌ Could not connect to Edge on port 9222');
    console.log('   Run: node dinner-automation/scripts/launch-shared-chrome.js');
    process.exit(1);
  }
  
  const context = browser.contexts()[0];
  let page = context.pages().find(p => p.url().includes('heb.com'));
  
  if (!page) {
    page = await context.newPage();
  }
  
  // Get cart contents
  const cartItems = await getCartContents(page);
  
  console.log(`\n📊 Found ${cartItems.length} items in cart:\n`);
  
  cartItems.forEach((item, i) => {
    console.log(`${i + 1}. ${item.name}`);
    console.log(`   Qty: ${item.qty} | Price: ${item.price || 'N/A'}`);
  });
  
  // Compare with target
  console.log('\n═══════════════════════════════════════════════');
  console.log('🎯 Target Items (from meal plan):');
  console.log('═══════════════════════════════════════════════\n');
  
  TARGET_ITEMS.forEach((item, i) => {
    console.log(`${i + 1}. ${item.name} (${item.qty} ${item.unit}) - ${item.meal}`);
  });
  
  // Analysis
  console.log('\n═══════════════════════════════════════════════');
  console.log('📈 Analysis');
  console.log('═══════════════════════════════════════════════');
  console.log(`Cart items: ${cartItems.length}`);
  console.log(`Target items: ${TARGET_ITEMS.length}`);
  console.log(`Difference: ${cartItems.length - TARGET_ITEMS.length} extra items`);
  
  await browser.close();
}

auditCart().catch(console.error);
