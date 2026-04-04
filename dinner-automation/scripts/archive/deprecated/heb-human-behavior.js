const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const EDGE_USER_DATA = 'C:\\Users\\Admin\\AppData\\Local\\Microsoft\\Edge\\User Data';

// More human-like delays
const HUMAN_DELAYS = {
  pageLoad: 8000,
  betweenActions: 5000,
  afterClick: 6000,
  afterSearch: 10000
};

async function humanLikeBehavior() {
  console.log('🛒 HUMAN BEHAVIOR SIMULATION - Extended Delays\n');
  console.log('Using very slow, human-like timing to avoid detection...\n');
  
  const context = await chromium.launchPersistentContext(EDGE_USER_DATA, {
    headless: false,
    executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    args: [
      '--start-maximized',
      '--disable-blink-features=AutomationControlled'
    ],
    viewport: { width: 1920, height: 1080 }
  });
  
  const page = context.pages()[0] || await context.newPage();
  
  const items = [
    { name: 'Catfish fillet', search: 'catfish fillet' },
    { name: 'Sriracha', search: 'sriracha hot sauce' },
    { name: 'Bosc pear', search: 'bosc pear' }
  ];
  
  try {
    // Step 1: Load HEB and wait like a human
    console.log('1. Loading HEB homepage...');
    await page.goto('https://www.heb.com');
    console.log(`   Waiting ${HUMAN_DELAYS.pageLoad/1000}s...`);
    await page.waitForTimeout(HUMAN_DELAYS.pageLoad);
    
    // Step 2: Scroll like a human browsing
    console.log('2. Scrolling page...');
    await page.mouse.wheel(0, 300);
    await page.waitForTimeout(3000);
    await page.mouse.wheel(0, -100);
    await page.waitForTimeout(2000);
    
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      console.log(`\n3.${i+1} Adding: ${item.name}`);
      
      // Click search box naturally
      console.log('   Finding search box...');
      const searchBox = await page.locator('input[type="search"], input[name="q"]').first();
      
      if (searchBox) {
        // Click slowly
        console.log('   Clicking search box...');
        await searchBox.click({ delay: 500 });
        await page.waitForTimeout(2000);
        
        // Type slowly like human
        console.log('   Typing search term...');
        await searchBox.fill('');
        for (const char of item.search) {
          await searchBox.type(char, { delay: 100 });
        }
        await page.waitForTimeout(2000);
        
        // Press enter
        console.log('   Submitting search...');
        await searchBox.press('Enter');
        console.log(`   Waiting ${HUMAN_DELAYS.afterSearch/1000}s for results...`);
        await page.waitForTimeout(HUMAN_DELAYS.afterSearch);
        
        // Scroll through results like human
        console.log('   Scrolling results...');
        await page.mouse.wheel(0, 200);
        await page.waitForTimeout(3000);
        
        // Find add button with multiple attempts
        console.log('   Looking for add button...');
        let addButton = null;
        const selectors = [
          'button:has-text("Add")',
          'button[data-testid*="add"]',
          'button.add-to-cart',
          '[data-automation-id*="add"]'
        ];
        
        for (const selector of selectors) {
          const btn = await page.locator(selector).first();
          if (await btn.isVisible().catch(() => false)) {
            addButton = btn;
            console.log(`   Found button with: ${selector}`);
            break;
          }
          await page.waitForTimeout(1000);
        }
        
        if (addButton) {
          // Move mouse to button like human
          console.log('   Moving to add button...');
          const box = await addButton.boundingBox();
          if (box) {
            await page.mouse.move(box.x + box.width/2, box.y + box.height/2, { steps: 10 });
            await page.waitForTimeout(1000);
          }
          
          // Click with delay
          console.log('   Clicking add button...');
          await addButton.click({ delay: 300 });
          console.log(`   Waiting ${HUMAN_DELAYS.afterClick/1000}s...`);
          await page.waitForTimeout(HUMAN_DELAYS.afterClick);
          
          // Look for confirmation
          const confirmation = await page.locator('text:has("added"), text:has("cart"), .cart-count').first();
          if (confirmation) {
            console.log('   ✅ Item likely added');
          }
        } else {
          console.log('   ❌ Add button not found');
        }
      }
      
      // Human pause between items
      console.log(`   Pausing ${HUMAN_DELAYS.betweenActions/1000}s...`);
      await page.waitForTimeout(HUMAN_DELAYS.betweenActions);
    }
    
    // Check final cart
    console.log('\n4. Checking final cart...');
    await page.goto('https://www.heb.com/cart');
    console.log('   Waiting for cart to load...');
    await page.waitForTimeout(10000);
    
    // Count items
    const cartItems = await page.locator('.cart-item, [data-testid*="cart-item"]').count().catch(() => 0);
    console.log(`\n📦 Final cart count: ${cartItems} items`);
    
    if (cartItems >= 30) {
      console.log('\n🎉 SUCCESS! All 30 items in cart!');
    } else {
      console.log(`\n🟡 Cart has ${cartItems} items - some may not have persisted`);
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

console.log('Starting human behavior simulation...');
console.log('This will take ~5 minutes to complete all items\n');

humanLikeBehavior().catch(console.error);
