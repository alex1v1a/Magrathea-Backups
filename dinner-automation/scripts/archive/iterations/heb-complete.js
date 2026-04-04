const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const USER_DATA_DIR = 'C:\\Users\\Admin\\.openclaw\\chrome-marvin-only-profile';
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function runHEBAutomation() {
  console.log('═══════════════════════════════════════');
  console.log('🛒  HEB Cart Automation');
  console.log('═══════════════════════════════════════\n');
  
  // Load items
  let items = [];
  try {
    const data = JSON.parse(fs.readFileSync(
      path.join(__dirname, '..', 'data', 'heb-extension-items.json'),
      'utf8'
    ));
    items = data.items || [];
    console.log(`📦 ${items.length} items to add\n`);
  } catch (e) {
    console.error('❌ No items file found');
    return;
  }
  
  // Launch Chrome with Marvin profile
  console.log('Launching Chrome with Marvin profile...');
  const context = await chromium.launchPersistentContext(USER_DATA_DIR, {
    headless: false,
    args: ['--remote-debugging-port=9222', '--start-maximized']
  });
  
  const page = context.pages()[0] || await context.newPage();
  
  // Go to HEB
  console.log('Going to HEB...');
  await page.goto('https://www.heb.com');
  await sleep(3000);
  
  // Check login
  console.log('Checking login status...');
  let isLoggedIn = await page.evaluate(() => {
    return !!document.querySelector('[data-testid="account-menu"]') && 
           !document.querySelector('a[href*="/login"]');
  });
  
  if (!isLoggedIn) {
    console.log('\n⚠️  Not logged in. Opening login page...');
    await page.goto('https://www.heb.com/login');
    console.log('📍 https://www.heb.com/login');
    console.log('\n🔐 PLEASE LOGIN:');
    console.log('   1. Enter your HEB email/username');
    console.log('   2. Enter your password');
    console.log('   3. Click Sign In');
    console.log('   4. Script will continue automatically\n');
    
    // Wait for login (up to 5 minutes)
    for (let i = 0; i < 60; i++) {
      await sleep(5000);
      
      try {
        isLoggedIn = await page.evaluate(() => {
          return !!document.querySelector('[data-testid="account-menu"]') && 
                 !document.querySelector('a[href*="/login"]');
        });
        
        if (isLoggedIn) {
          console.log('✅ Login detected!\n');
          break;
        }
        
        if ((i + 1) % 12 === 0) {
          console.log(`   Waiting... (${(i + 1) * 5}s)`);
        }
      } catch (e) {
        // Page might be navigating, ignore
      }
    }
    
    if (!isLoggedIn) {
      console.log('❌ Timeout waiting for login');
      await context.close();
      return;
    }
  } else {
    console.log('✅ Already logged in!\n');
  }
  
  // Add items
  const results = { added: [], failed: [] };
  
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    console.log(`[${i + 1}/${items.length}] ${item.name}...`);
    
    try {
      // Search
      await page.goto(`https://www.heb.com/search?q=${encodeURIComponent(item.searchTerm || item.name)}`);
      await sleep(3000);
      
      // Find and click add button
      const button = page.locator('button[data-testid*="add-to-cart"]').first();
      
      if (await button.count() > 0) {
        await button.click({ force: true });
        await button.evaluate(el => el.style.outline = '4px solid lime');
        await sleep(2000);
        console.log('   ✅ Added');
        results.added.push(item.name);
      } else {
        throw new Error('No add button found');
      }
      
    } catch (err) {
      console.log(`   ❌ Failed: ${err.message}`);
      results.failed.push({ name: item.name, error: err.message });
    }
  }
  
  // Summary
  console.log('\n═══════════════════════════════════════');
  console.log('📊 RESULTS');
  console.log('═══════════════════════════════════════');
  console.log(`✅ Added: ${results.added.length}/${items.length}`);
  console.log(`❌ Failed: ${results.failed.length}/${items.length}`);
  
  if (results.failed.length > 0) {
    console.log('\nFailed items:');
    results.failed.forEach(f => console.log(`  - ${f.name}`));
  }
  
  console.log('\n✅ Done! Chrome stays open.');
  // Don't close - let user see the cart
}

runHEBAutomation().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
