const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// Kill any existing Chrome and launch with Alexander's profile + debug port
async function launchChromeWithDebug() {
  console.log('🛒 Setting up Chrome with Alexander\'s profile...\n');
  
  // Kill existing Chrome
  console.log('Stopping existing Chrome...');
  try {
    await new Promise((resolve) => {
      exec('taskkill /F /IM chrome.exe', () => resolve());
    });
  } catch (e) {}
  
  await sleep(2000);
  
  // Launch Chrome with Alexander's profile and debug port
  console.log('Launching Chrome with debug port 9222...');
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const userDataDir = 'C:\\Users\\Admin\\AppData\\Local\\Google\\Chrome\\User Data';
  
  const args = [
    `--remote-debugging-port=9222`,
    `--user-data-dir="${userDataDir}"`,
    `--profile-directory=Default`,
    `--restore-last-session`,
    `--no-first-run`,
    `--start-maximized`,
    `https://www.heb.com`
  ];
  
  // Launch detached
  const proc = exec(`"${chromePath}" ${args.join(' ')}`, {
    detached: true,
    windowsHide: false
  });
  
  console.log('Chrome launched, PID:', proc.pid);
  console.log('Waiting for Chrome to initialize...\n');
  
  // Wait for Chrome to be ready
  await sleep(10000);
  
  // Now connect via CDP
  console.log('Connecting to Chrome on port 9222...');
  
  try {
    const browser = await chromium.connectOverCDP('http://localhost:9222');
    console.log('✅ Connected to Chrome!\n');
    
    const context = browser.contexts()[0] || await browser.newContext();
    const page = context.pages().find(p => p.url().includes('heb.com')) || await context.newPage();
    
    // Check login
    console.log('Checking HEB login status...');
    await page.goto('https://www.heb.com');
    await sleep(3000);
    
    const isLoggedIn = await page.evaluate(() => {
      return !!document.querySelector('[data-testid="account-menu"]') && 
             !document.querySelector('a[href*="/login"]');
    });
    
    console.log('Login status:', isLoggedIn ? '✅ LOGGED IN' : '❌ NOT LOGGED IN');
    
    if (!isLoggedIn) {
      console.log('\n⚠️  Please login in the Chrome window');
      console.log('Waiting 60 seconds...\n');
      
      for (let i = 0; i < 12; i++) {
        await sleep(5000);
        const nowLoggedIn = await page.evaluate(() => {
          return !!document.querySelector('[data-testid="account-menu"]');
        });
        
        if (nowLoggedIn) {
          console.log('✅ Login detected!\n');
          break;
        }
        
        if ((i + 1) % 3 === 0) {
          console.log(`Waiting... (${(i + 1) * 5}s)`);
        }
      }
    }
    
    // Load items
    const itemsFile = path.join(__dirname, '..', 'data', 'heb-extension-items.json');
    const items = JSON.parse(fs.readFileSync(itemsFile, 'utf8')).items || [];
    console.log(`\n📦 Adding ${items.length} items...\n`);
    
    // Add items
    const results = { added: [], failed: [] };
    
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      console.log(`[${i+1}/${items.length}] ${item.name}...`);
      
      try {
        // Search
        await page.goto(`https://www.heb.com/search?q=${encodeURIComponent(item.searchTerm || item.name)}`);
        await sleep(4000);
        
        // Click add button
        const addBtn = page.locator('button[data-testid*="add-to-cart"]').first();
        if (await addBtn.count() > 0) {
          await addBtn.click();
          await addBtn.evaluate(el => el.style.outline = '4px solid lime');
          await sleep(2000);
          console.log('   ✅ Added');
          results.added.push(item.name);
        } else {
          throw new Error('Button not found');
        }
        
      } catch (err) {
        console.log(`   ❌ ${err.message}`);
        results.failed.push(item.name);
      }
    }
    
    console.log(`\n✅ Complete! Added: ${results.added.length}/${items.length}`);
    
  } catch (err) {
    console.error('❌ Error:', err.message);
  }
}

launchChromeWithDebug().catch(console.error);
