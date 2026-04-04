const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

// Load meal plan for correct search terms
const mealPlanPath = path.join(__dirname, '..', 'data', 'weekly-plan.json');
let mealPlan = { meals: [] };
try {
  mealPlan = JSON.parse(fs.readFileSync(mealPlanPath, 'utf8'));
  console.log('📋 Loaded meal plan with', mealPlan.meals.length, 'meals');
} catch (e) {
  console.log('⚠️ Could not load meal plan, using defaults');
}

// Build ingredient list from meal plan
const ingredientsToAdd = [];
mealPlan.meals.forEach(meal => {
  if (meal.ingredients) {
    meal.ingredients.forEach(ing => {
      if (ing.hebSearch && !ing.inStock) {
        ingredientsToAdd.push({
          name: ing.name,
          search: ing.hebSearch,
          meal: meal.name
        });
      }
    });
  }
});

console.log(`🎯 Target: ${ingredientsToAdd.length} ingredients to add\n`);

async function completeCart() {
  console.log('🛒 HEB Cart Completion — Persistent Mode\n');
  console.log('=' .repeat(50));
  
  let browser;
  let addedCount = 0;
  let failedItems = [];
  
  try {
    // Connect to Edge
    console.log('\n🔌 Connecting to Microsoft Edge...');
    browser = await chromium.connectOverCDP('http://localhost:9222', {
      timeout: 60000
    });
    console.log('✅ Connected to Edge\n');
    
    const context = browser.contexts()[0] || await browser.newContext();
    const page = await context.newPage();
    
    // Check initial cart
    console.log('📦 Checking initial cart...');
    await page.goto('https://www.heb.com/cart', { timeout: 60000 });
    await page.waitForTimeout(3000);
    
    const initialCart = await page.evaluate(() => {
      const cartLink = document.querySelector('a[data-testid="cart-link"]');
      if (cartLink) {
        const match = cartLink.getAttribute('aria-label')?.match(/(\d+)\s+items?/);
        return match ? parseInt(match[1]) : 0;
      }
      return 0;
    });
    
    console.log(`📊 Initial cart: ${initialCart} items`);
    console.log(`🎯 Target: 42 items`);
    console.log(`📋 Need to add: ${42 - initialCart} items\n`);
    
    // Add each ingredient
    for (let i = 0; i < ingredientsToAdd.length; i++) {
      const item = ingredientsToAdd[i];
      console.log(`\n[${i + 1}/${ingredientsToAdd.length}] Adding: ${item.name}`);
      console.log(`    Search: "${item.search}"`);
      console.log(`    Meal: ${item.meal}`);
      
      try {
        // Search for item
        await page.goto(`https://www.heb.com/search?q=${encodeURIComponent(item.search)}`, { 
          timeout: 60000,
          waitUntil: 'domcontentloaded'
        });
        await page.waitForTimeout(4000);
        
        // Find add button
        const addButton = await page.$('button[data-qe-id="addToCart"]');
        if (!addButton) {
          console.log('    ❌ No Add to Cart button found');
          failedItems.push({ item: item.name, reason: 'No button' });
          continue;
        }
        
        // Check if disabled
        const isDisabled = await addButton.evaluate(el => el.disabled);
        if (isDisabled) {
          console.log('    ⚠️ Button disabled (out of stock)');
          failedItems.push({ item: item.name, reason: 'Out of stock' });
          continue;
        }
        
        // Get cart count before
        const cartBefore = await page.evaluate(() => {
          const cartLink = document.querySelector('a[data-testid="cart-link"]');
          if (cartLink) {
            const match = cartLink.getAttribute('aria-label')?.match(/(\d+)\s+items?/);
            return match ? parseInt(match[1]) : 0;
          }
          return 0;
        });
        
        // Click add
        await addButton.click();
        console.log('    🖱️ Clicked ADD TO CART');
        await page.waitForTimeout(3000);
        
        // Verify cart increased
        await page.goto('https://www.heb.com/cart', { timeout: 60000 });
        await page.waitForTimeout(2000);
        
        const cartAfter = await page.evaluate(() => {
          const cartLink = document.querySelector('a[data-testid="cart-link"]');
          if (cartLink) {
            const match = cartLink.getAttribute('aria-label')?.match(/(\d+)\s+items?/);
            return match ? parseInt(match[1]) : 0;
          }
          return 0;
        });
        
        if (cartAfter > cartBefore) {
          console.log(`    ✅ SUCCESS! Cart: ${cartBefore} → ${cartAfter}`);
          addedCount++;
        } else {
          console.log(`    ❌ Failed — cart still at ${cartAfter}`);
          failedItems.push({ item: item.name, reason: 'No cart increase' });
        }
        
        // Progress report every 5 items
        if ((i + 1) % 5 === 0) {
          console.log('\n' + '='.repeat(50));
          console.log(`📊 PROGRESS: ${i + 1}/${ingredientsToAdd.length} processed`);
          console.log(`✅ Added: ${addedCount}`);
          console.log(`❌ Failed: ${failedItems.length}`);
          console.log('='.repeat(50) + '\n');
        }
        
      } catch (error) {
        console.log(`    ❌ Error: ${error.message}`);
        failedItems.push({ item: item.name, reason: error.message });
      }
    }
    
    // Final verification
    console.log('\n' + '='.repeat(50));
    console.log('📊 FINAL VERIFICATION');
    console.log('='.repeat(50));
    
    await page.goto('https://www.heb.com/cart', { timeout: 60000 });
    await page.waitForTimeout(3000);
    
    const finalCart = await page.evaluate(() => {
      const cartLink = document.querySelector('a[data-testid="cart-link"]');
      if (cartLink) {
        const match = cartLink.getAttribute('aria-label')?.match(/(\d+)\s+items?/);
        return match ? parseInt(match[1]) : 0;
      }
      return 0;
    });
    
    // Get cart items list
    const cartItems = await page.evaluate(() => {
      const items = [];
      const productElements = document.querySelectorAll('[data-testid*="cart-item"], .cart-item');
      productElements.forEach(el => {
        const nameEl = el.querySelector('h3, h4, .product-name, [data-testid*="name"]');
        if (nameEl) {
          items.push(nameEl.textContent.trim());
        }
      });
      return items;
    });
    
    console.log(`\n📦 Final Cart: ${finalCart} items`);
    console.log(`✅ Added this run: ${addedCount}`);
    console.log(`📋 Target: 42 items`);
    console.log(`📉 Missing: ${42 - finalCart} items`);
    
    if (cartItems.length > 0) {
      console.log('\n📋 Items in cart:');
      cartItems.forEach((item, i) => console.log(`  ${i + 1}. ${item}`));
    }
    
    if (failedItems.length > 0) {
      console.log('\n❌ Failed items:');
      failedItems.forEach(f => console.log(`  - ${f.item}: ${f.reason}`));
    }
    
    // Save report
    const report = {
      timestamp: new Date().toISOString(),
      initialCart,
      finalCart,
      added: addedCount,
      target: 42,
      missing: 42 - finalCart,
      failedItems,
      cartItems
    };
    
    fs.writeFileSync('heb-completion-report.json', JSON.stringify(report, null, 2));
    console.log('\n📝 Report saved: heb-completion-report.json');
    
    await page.close();
    
  } catch (error) {
    console.error('\n❌ Fatal error:', error.message);
    console.error(error.stack);
  } finally {
    if (browser) await browser.close().catch(() => {});
    console.log('\n🏁 Complete');
  }
}

completeCart();
