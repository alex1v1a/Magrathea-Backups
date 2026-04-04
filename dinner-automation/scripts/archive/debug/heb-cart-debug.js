const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function debugHEBCart() {
  console.log('🔍 HEB Cart Debug - Investigating missing items\n');
  
  let browser;
  try {
    // Connect to existing Edge
    console.log('Connecting to Edge on port 9222...');
    browser = await chromium.connectOverCDP('http://localhost:9222', {
      timeout: 60000
    });
    console.log('✅ Connected to Edge\n');
    
    // Get or create context
    let context;
    const contexts = browser.contexts();
    if (contexts.length > 0) {
      context = contexts[0];
      console.log('Using existing browser context');
    } else {
      context = await browser.newContext();
      console.log('Created new browser context');
    }
    
    // Create new page
    const page = await context.newPage();
    
    // Step 1: Check cart directly
    console.log('\n📦 Step 1: Checking current cart contents...');
    await page.goto('https://www.heb.com/cart', { timeout: 60000 });
    await page.waitForTimeout(3000);
    
    // Take screenshot of cart
    await page.screenshot({ path: 'heb-cart-debug.png', fullPage: true });
    console.log('📸 Cart screenshot saved to heb-cart-debug.png');
    
    // Get cart items
    const cartItems = await page.evaluate(() => {
      const items = [];
      const productElements = document.querySelectorAll('[data-testid*="cart-item"], .cart-item, [data-qe-id*="cart"]');
      productElements.forEach(el => {
        const nameEl = el.querySelector('h3, h4, .product-name, [data-testid*="name"]');
        if (nameEl) {
          items.push(nameEl.textContent.trim());
        }
      });
      return items;
    });
    
    console.log('\n📋 Items currently in cart:');
    cartItems.forEach((item, i) => console.log(`  ${i + 1}. ${item}`));
    console.log(`\nTotal items detected: ${cartItems.length}`);
    
    // Check for rice/naan specifically
    const hasRice = cartItems.some(item => item.toLowerCase().includes('rice'));
    const hasNaan = cartItems.some(item => item.toLowerCase().includes('naan'));
    
    console.log('\n🔎 Checking for target items:');
    console.log(`  Basmati rice in cart: ${hasRice ? '✅ YES' : '❌ NO'}`);
    console.log(`  Naan bread in cart: ${hasNaan ? '✅ YES' : '❌ NO'}`);
    
    // Step 2: Try searching for basmati rice with variations
    if (!hasRice) {
      console.log('\n🌾 Step 2: Searching for basmati rice...');
      
      const riceSearchTerms = [
        'H-E-B Basmati Rice',
        'basmati rice',
        'organic basmati rice',
        'Royal Basmati Rice'
      ];
      
      for (const term of riceSearchTerms) {
        console.log(`\n  Trying search: "${term}"`);
        await page.goto(`https://www.heb.com/search?q=${encodeURIComponent(term)}`, { timeout: 60000 });
        await page.waitForTimeout(4000);
        
        // Take screenshot
        await page.screenshot({ path: `heb-search-rice-${term.replace(/\s+/g, '-')}.png` });
        
        // Check for add button
        const addButton = await page.$('button[data-qe-id="addToCart"]');
        if (addButton) {
          console.log(`  ✅ Found Add to Cart button for "${term}"`);
          
          // Check if button is disabled
          const isDisabled = await addButton.evaluate(el => el.disabled);
          console.log(`  Button disabled: ${isDisabled ? 'YES (out of stock?)' : 'NO'}`);
          
          if (!isDisabled) {
            console.log(`  🖱️ Clicking Add to Cart...`);
            await addButton.click();
            await page.waitForTimeout(3000);
            
            // Verify cart increased
            const newCartCount = await page.evaluate(() => {
              const cartLink = document.querySelector('a[data-testid="cart-link"]');
              if (cartLink) {
                const match = cartLink.getAttribute('aria-label').match(/(\d+)\s+items?/);
                return match ? parseInt(match[1]) : 0;
              }
              return 0;
            });
            
            console.log(`  Cart count after add: ${newCartCount}`);
            if (newCartCount > cartItems.length) {
              console.log(`  ✅ SUCCESS! Rice added to cart`);
              break;
            } else {
              console.log(`  ❌ Cart didn't increase — trying next search term`);
            }
          }
        } else {
          console.log(`  ❌ No Add to Cart button found`);
        }
      }
    }
    
    // Step 3: Try searching for naan
    if (!hasNaan) {
      console.log('\n🫓 Step 3: Searching for naan bread...');
      
      const naanSearchTerms = [
        'Stonefire Naan',
        'naan bread',
        'organic naan',
        'H-E-B Naan'
      ];
      
      for (const term of naanSearchTerms) {
        console.log(`\n  Trying search: "${term}"`);
        await page.goto(`https://www.heb.com/search?q=${encodeURIComponent(term)}`, { timeout: 60000 });
        await page.waitForTimeout(4000);
        
        // Take screenshot
        await page.screenshot({ path: `heb-search-naan-${term.replace(/\s+/g, '-')}.png` });
        
        // Check for add button
        const addButton = await page.$('button[data-qe-id="addToCart"]');
        if (addButton) {
          console.log(`  ✅ Found Add to Cart button for "${term}"`);
          
          const isDisabled = await addButton.evaluate(el => el.disabled);
          console.log(`  Button disabled: ${isDisabled ? 'YES (out of stock?)' : 'NO'}`);
          
          if (!isDisabled) {
            console.log(`  🖱️ Clicking Add to Cart...`);
            await addButton.click();
            await page.waitForTimeout(3000);
            
            const newCartCount = await page.evaluate(() => {
              const cartLink = document.querySelector('a[data-testid="cart-link"]');
              if (cartLink) {
                const match = cartLink.getAttribute('aria-label').match(/(\d+)\s+items?/);
                return match ? parseInt(match[1]) : 0;
              }
              return 0;
            });
            
            console.log(`  Cart count after add: ${newCartCount}`);
            break;
          }
        } else {
          console.log(`  ❌ No Add to Cart button found`);
        }
      }
    }
    
    // Final cart check
    console.log('\n📦 Final Cart Check...');
    await page.goto('https://www.heb.com/cart', { timeout: 60000 });
    await page.waitForTimeout(3000);
    
    const finalCartItems = await page.evaluate(() => {
      const items = [];
      const productElements = document.querySelectorAll('[data-testid*="cart-item"], .cart-item, [data-qe-id*="cart"]');
      productElements.forEach(el => {
        const nameEl = el.querySelector('h3, h4, .product-name, [data-testid*="name"]');
        if (nameEl) {
          items.push(nameEl.textContent.trim());
        }
      });
      return items;
    });
    
    console.log(`\n✅ FINAL CART: ${finalCartItems.length} items`);
    console.log('\nItems in cart:');
    finalCartItems.forEach((item, i) => console.log(`  ${i + 1}. ${item}`));
    
    const finalHasRice = finalCartItems.some(item => item.toLowerCase().includes('rice'));
    const finalHasNaan = finalCartItems.some(item => item.toLowerCase().includes('naan'));
    
    console.log('\n📊 Summary:');
    console.log(`  Target: 42 items`);
    console.log(`  Current: ${finalCartItems.length} items`);
    console.log(`  Missing: ${42 - finalCartItems.length} items`);
    console.log(`  Rice in cart: ${finalHasRice ? '✅' : '❌'}`);
    console.log(`  Naan in cart: ${finalHasNaan ? '✅' : '❌'}`);
    
    await page.close();
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    if (browser) {
      await browser.close().catch(() => {});
    }
    console.log('\n🏁 Debug complete');
  }
}

debugHEBCart();
