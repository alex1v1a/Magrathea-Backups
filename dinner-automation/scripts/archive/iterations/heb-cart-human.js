const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

/**
 * HEB Cart - Human-like Automation
 * Slower, more random timing to avoid bot detection
 */

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const EDGE_USER_DATA = 'C:\\Users\\Admin\\AppData\\Local\\Microsoft\\Edge\\User Data';
const DATA_DIR = path.join(__dirname, '..', 'data');

function loadItems() {
  try {
    const data = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'heb-extension-items.json'), 'utf8'));
    return data.items || [];
  } catch (e) {
    return [];
  }
}

function randomDelay(min, max) {
  return Math.floor(Math.random() * (max - min + 1) + min);
}

async function humanLikeTyping(page, selector, text) {
  await page.click(selector);
  for (const char of text) {
    await page.keyboard.type(char, { delay: randomDelay(50, 150) });
  }
}

async function addItem(page, item, index, total) {
  console.log(`\n[${index}/${total}] ${item.name}`);
  
  try {
    // Navigate to HEB
    await page.goto('https://www.heb.com', { timeout: 30000 });
    await page.waitForTimeout(randomDelay(2000, 4000));
    
    // Find search with multiple selectors
    const searchSelectors = [
      'input[placeholder*="Search"]',
      'input[name="q"]',
      'input[type="search"]',
      '[data-testid*="search"] input',
      '#search-input'
    ];
    
    let searchSelector = null;
    for (const selector of searchSelectors) {
      const input = await page.locator(selector).first();
      if (await input.isVisible().catch(() => false)) {
        searchSelector = selector;
        break;
      }
    }
    
    if (!searchSelector) {
      console.log('   ⚠️ Search not found');
      return false;
    }
    
    // Type like human
    await humanLikeTyping(page, searchSelector, item.searchTerm);
    await page.waitForTimeout(randomDelay(500, 1000));
    
    // Press enter
    await page.press(searchSelector, 'Enter');
    await page.waitForTimeout(randomDelay(3000, 5000));
    
    // Scroll down like human
    await page.mouse.wheel(0, randomDelay(100, 300));
    await page.waitForTimeout(randomDelay(500, 1000));
    
    // Find add button with multiple selectors
    const addSelectors = [
      'button:has-text("Add")',
      'button[data-testid*="add"]',
      'button.add-to-cart',
      '[data-automation-id*="add"]',
      'button:has-text("Add to Cart")'
    ];
    
    for (const selector of addSelectors) {
      const btn = await page.locator(selector).first();
      if (await btn.isVisible().catch(() => false)) {
        // Move mouse to button (human-like)
        const box = await btn.boundingBox();
        if (box) {
          await page.mouse.move(box.x + box.width/2, box.y + box.height/2);
          await page.waitForTimeout(randomDelay(200, 500));
        }
        
        await btn.click();
        await page.waitForTimeout(randomDelay(2000, 4000));
        console.log('   ✅ Added');
        return true;
      }
    }
    
    console.log('   ❌ No add button');
    return false;
    
  } catch (error) {
    console.log(`   ❌ Error: ${error.message.substring(0, 50)}`);
    return false;
  }
}

async function main() {
  console.log('🛒 HEB Cart - Human-like Automation\n');
  
  const items = loadItems();
  if (items.length === 0) {
    console.log('❌ No items');
    return;
  }
  
  console.log(`📋 ${items.length} items\n`);
  
  const context = await chromium.launchPersistentContext(EDGE_USER_DATA, {
    headless: false,
    executablePath: EDGE_PATH,
    args: ['--start-maximized'],
    viewport: { width: 1920, height: 1080 }
  });
  
  const page = context.pages()[0] || await context.newPage();
  
  // Set user agent
  await page.setExtraHTTPHeaders({
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.0 Edg/120.0.0.0'
  });
  
  let added = 0;
  let failed = 0;
  
  try {
    for (let i = 0; i < items.length; i++) {
      const success = await addItem(page, items[i], i + 1, items.length);
      if (success) added++;
      else failed++;
      
      // Random delay between items
      if (i < items.length - 1) {
        const delay = randomDelay(3000, 8000);
        console.log(`   ⏳ Waiting ${delay/1000}s...`);
        await page.waitForTimeout(delay);
      }
    }
    
    console.log('\n' + '='.repeat(50));
    console.log(`✅ Added: ${added}/${items.length}`);
    console.log(`❌ Failed: ${failed}/${items.length}`);
    console.log('='.repeat(50));
    
    // Open cart
    await page.goto('https://www.heb.com/cart');
    await page.waitForTimeout(5000);
    
    console.log('\n🛒 Cart ready for checkout');
    console.log('Browser staying open...\n');
    await new Promise(() => {});
    
  } catch (error) {
    console.error('Fatal error:', error);
  }
}

main().catch(console.error);
