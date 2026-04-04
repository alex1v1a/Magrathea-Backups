const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// Persistent storage path
const USER_DATA_DIR = 'C:\\Users\\Admin\\.openclaw\\chrome-marvin-only-profile';

async function runAuto() {
  console.log('═══════════════════════════════════════');
  console.log('🛒  HEB Cart - Auto Login Setup');
  console.log('═══════════════════════════════════════\n');
  
  // Launch Chrome with persistent context if not running
  console.log('Starting Chrome with persistent profile...');
  
  let browser;
  try {
    // Try to connect to existing
    browser = await chromium.connectOverCDP('http://localhost:9222');
    console.log('✅ Connected to existing Chrome\n');
  } catch (e) {
    // Launch new with persistence
    console.log('Launching new Chrome instance...');
    browser = await chromium.launchPersistentContext(USER_DATA_DIR, {
      headless: false,
      args: [
        '--remote-debugging-port=9222',
        '--restore-last-session',
        '--start-maximized'
      ]
    });
    console.log('✅ Chrome launched with persistent profile\n');
  }
  
  // Get page
  let page = browser.contexts?.()[0]?.pages?.().find(p => p.url().includes('heb.com'));
  if (!page) {
    page = await browser.newPage();
  }
  
  // Navigate to HEB
  console.log('Going to HEB...');
  await page.goto('https://www.heb.com');
  await sleep(3000);
  
  // Check login status
  console.log('Checking login status...');
  const isLoggedIn = await page.evaluate(() => {
    return !!document.querySelector('[data-testid="account-menu"]') && 
           !document.querySelector('a[href*="/login"]');
  });
  
  if (!isLoggedIn) {
    console.log('\n⚠️  Not logged in. Opening login page...');
    await page.goto('https://www.heb.com/login');
    console.log('📍 Navigated to: https://www.heb.com/login');
    console.log('\n🔐 PLEASE LOGIN:');
    console.log('   1. Enter your email/username');
    console.log('   2. Enter your password');
    console.log('   3. Click Sign In');
    console.log('   4. The script will continue automatically\n');
    
    // Wait for login with auto-reconnect
    let loggedIn = false;
    let attempts = 0;
    const maxAttempts = 60; // 5 minutes
    
    while (!loggedIn && attempts < maxAttempts) {
      await sleep(5000);
      attempts++;
      
      try {
        // Check if page is still valid
        if (page.isClosed()) {
          console.log('⚠️  Page closed, getting new page...');
          page = browser.contexts()[0].pages()[0] || await browser.newPage();
        }
        
        loggedIn = await page.evaluate(() => {
          return !!document.querySelector('[data-testid="account-menu"]') && 
                 !document.querySelector('a[href*="/login"]');
        });
        
        if (loggedIn) {
          console.log('✅ Login detected!\n');
          break;
        }
        
        if (attempts % 12 === 0) {
          console.log(`   Still waiting... (${attempts * 5}s elapsed)`);
        }
      } catch (e) {
        console.log('⚠️  Error checking login, retrying...');
      }
    }
    
    if (!loggedIn) {
      console.log('❌ Timeout waiting for login');
      return;
    }
  } else {
    console.log('✅ Already logged in!\n');
  }
  
  // Load items
  console.log('Loading shopping list...');
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
  
  // Add items
  const results = { added: [], failed: [] };
  
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    console.log(`[${i + 1}/${items.length}] ${item.name}...`);
    
    try {
      // Check page validity
      if (page.isClosed()) {
        console.log('   ⚠️  Page closed, reconnecting...');
        page = browser.contexts()[0].pages()[0] || await browser.newPage();
      }
      
      // Search
      await page.goto(`https://www.heb.com/search?q=${encodeURIComponent(item.searchTerm || item.name)}`);
      await sleep(3000);
      
      // Click add button
      const button = page.locator('button[data-testid*="add-to-cart"]').first();
      if (await button.count() > 0) {
        await button.click({ force: true });
        await button.evaluate(el => el.style.outline = '4px solid lime');
        await sleep(2000);
        console.log('   ✅ Added');
        results.added.push(item.name);
      } else {
        throw new Error('No button found');
      }
      
    } catch (err) {
      console.log(`   ❌ Failed: ${err.message}`);
      results.failed.push(item.name);
    }
  }
  
  // Summary
  console.log('\n═══════════════════════════════════════');
  console.log(`📊 Results: ${results.added.length} added, ${results.failed.length} failed`);
  console.log('═══════════════════════════════════════');
  
  // Keep browser open
  console.log('\n✅ Chrome stays open for future use');
  console.log('   You can close it manually when done.');
}

runAuto().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
