const { chromium } = require('playwright');
const imaps = require('imap-simple');
const fs = require('fs');
const path = require('path');

const IMAP_EMAIL = 'MarvinMartian9@icloud.com';
const IMAP_PASSWORD = 'pasg-vifp-rzob-uimt';

const itemsFile = 'dinner-automation/data/heb-cart-pending.json';
const resultsFile = 'dinner-automation/data/heb-cart-results.json';
const screenshotDir = 'dinner-automation/data/screenshots';

if (!fs.existsSync(screenshotDir)) {
  fs.mkdirSync(screenshotDir, { recursive: true });
}

async function fetch2FACode() {
  console.log('📧 Checking email for 2FA code...');
  const config = {
    imap: {
      user: IMAP_EMAIL,
      password: IMAP_PASSWORD,
      host: 'imap.mail.me.com',
      port: 993,
      tls: true,
      authTimeout: 3000
    }
  };

  try {
    const connection = await imaps.connect(config);
    await connection.openBox('INBOX');
    
    const broadSearch = [['SINCE', new Date(Date.now() - 5 * 60000).toISOString().split('T')[0]]];
    const fetchOptions = { bodies: ['HEADER', 'TEXT'] };
    const allMessages = await connection.search(broadSearch, fetchOptions);
    
    for (const message of allMessages.slice(-5)) {
      const body = message.parts.find(part => part.which === 'TEXT');
      if (body) {
        const text = body.body.toString();
        const codeMatch = text.match(/\b\d{6}\b/);
        if (codeMatch) {
          console.log(`   Found 2FA code: ${codeMatch[0]}`);
          await connection.end();
          return codeMatch[0];
        }
      }
    }
    
    await connection.end();
    return null;
  } catch (error) {
    console.error('   Error fetching email:', error.message);
    return null;
  }
}

async function addItemsToCart() {
  const data = JSON.parse(fs.readFileSync(itemsFile, 'utf8'));
  const items = data.items;
  
  console.log(`🛒 Starting HEB Cart Automation - ${items.length} items to add\n`);
  console.log('⚠️  IMPORTANT: Please manually log in to HEB in the browser window that will open.');
  console.log('     The automation will wait for you to complete login.\n');

  const browser = await chromium.launch({ 
    headless: false,
    args: ['--disable-blink-features=AutomationControlled']
  });
  
  const context = await browser.newContext({
    viewport: { width: 1400, height: 900 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36'
  });
  
  const page = await context.newPage();

  const results = {
    loginSuccessful: false,
    twoFAHandled: false,
    twoFACode: null,
    itemsAdded: 0,
    itemsFailed: [],
    cartTotal: null,
    screenshot: null,
    success: false,
    timestamp: new Date().toISOString()
  };

  try {
    // Navigate to HEB
    console.log('🌐 Opening HEB.com - Please log in manually...');
    await page.goto('https://www.heb.com', { waitUntil: 'networkidle', timeout: 60000 });
    
    // Wait for user to log in manually
    console.log('⏳ Waiting for manual login (300 seconds timeout)...');
    console.log('   Please:');
    console.log('   1. Click "Sign In" or "Account"');
    console.log('   2. Enter credentials: alex@1v1a.com / $Tandal0ne');
    console.log('   3. Complete any 2FA (or I will auto-fetch the code)');
    console.log('   4. Once logged in, press ENTER in this terminal to continue\n');
    
    // Set up 2FA auto-detection
    let twoFACode = null;
    const checkFor2FA = async () => {
      for (let i = 0; i < 60; i++) {
        const content = await page.content().catch(() => '');
        if (content.includes('verification') || content.includes('code') || content.includes('2FA')) {
          console.log('   🔍 2FA screen detected - fetching code from email...');
          twoFACode = await fetch2FACode();
          if (twoFACode) {
            console.log(`   Auto-entering 2FA code: ${twoFACode}`);
            // Try to auto-fill
            await page.fill('input[maxlength="6"], input[type="text"]', twoFACode).catch(() => {});
            await page.click('button[type="submit"]').catch(() => {});
            results.twoFAHandled = true;
            results.twoFACode = twoFACode;
          }
          break;
        }
        await new Promise(r => setTimeout(r, 5000));
      }
    };
    
    checkFor2FA();
    
    // Wait for user to indicate they're logged in
    process.stdin.once('data', () => {
      console.log('   User indicated login complete. Continuing...');
    });
    
    await new Promise(resolve => {
      const timeout = setTimeout(() => {
        console.log('   Timeout - proceeding anyway...');
        resolve();
      }, 300000);
      
      process.stdin.once('data', () => {
        clearTimeout(timeout);
        resolve();
      });
    });

    // Check login status
    const content = await page.content();
    if (content.toLowerCase().includes('sign out') || content.toLowerCase().includes('my account')) {
      results.loginSuccessful = true;
      console.log('✅ Login confirmed!\n');
    } else {
      console.log('⚠️  Login status unclear, attempting to proceed...\n');
    }

    // Remove duplicates
    const uniqueItems = [];
    const seen = new Set();
    for (const item of items) {
      const key = `${item.hebSearch}-${item.amount}`;
      if (!seen.has(key)) {
        seen.add(key);
        uniqueItems.push(item);
      }
    }

    console.log(`📋 Adding ${uniqueItems.length} unique items to cart...\n`);

    for (let i = 0; i < uniqueItems.length; i++) {
      const item = uniqueItems[i];
      console.log(`   [${i + 1}/${uniqueItems.length}] Searching: "${item.hebSearch}"...`);
      
      try {
        const searchUrl = `https://www.heb.com/search?q=${encodeURIComponent(item.hebSearch)}`;
        await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.waitForTimeout(2500);

        // Try to click Add to Cart
        const added = await page.click('button:has-text("Add to Cart")').then(() => true).catch(() => false);

        if (added) {
          console.log(`      ✅ Added to cart`);
          results.itemsAdded++;
        } else {
          console.log(`      ❌ Add to Cart button not found`);
          results.itemsFailed.push({ item: item.name, search: item.hebSearch, reason: 'Button not found' });
        }
        
        await page.waitForTimeout(2000);
      } catch (error) {
        console.log(`      ❌ Error: ${error.message}`);
        results.itemsFailed.push({ item: item.name, search: item.hebSearch, reason: error.message });
      }
    }

    // Go to cart
    console.log('\n🛒 Navigating to cart...');
    await page.goto('https://www.heb.com/cart', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(3000);

    // Get cart total
    const cartText = await page.content();
    const totalMatch = cartText.match(/\$[0-9,]+\.[0-9]{2}/);
    if (totalMatch) {
      results.cartTotal = totalMatch[0];
      console.log(`💰 Cart total: ${results.cartTotal}`);
    }

    // Screenshot
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const screenshotPath = path.join(screenshotDir, `heb-cart-${timestamp}.png`);
    await page.screenshot({ path: screenshotPath, fullPage: true });
    results.screenshot = screenshotPath;
    console.log(`📸 Screenshot saved`);

    results.success = results.itemsAdded > 0;

  } catch (error) {
    console.error('❌ Fatal error:', error.message);
    results.itemsFailed.push({ reason: `Fatal error: ${error.message}` });
  } finally {
    fs.writeFileSync(resultsFile, JSON.stringify(results, null, 2));
    console.log(`\n💾 Results saved to ${resultsFile}`);
    
    await page.waitForTimeout(5000);
    await browser.close();
  }

  return results;
}

addItemsToCart().then(results => {
  console.log('\n========================================');
  console.log('📊 HEB CART AUTOMATION RESULTS');
  console.log('========================================');
  console.log(`✅ Login successful: ${results.loginSuccessful}`);
  console.log(`🔐 2FA handled: ${results.twoFAHandled}${results.twoFACode ? ` (code: ${results.twoFACode})` : ''}`);
  console.log(`📦 Items added: ${results.itemsAdded}`);
  console.log(`💰 Cart total: ${results.cartTotal || 'N/A'}`);
  console.log(`📸 Screenshot: ${results.screenshot || 'N/A'}`);
  if (results.itemsFailed.length > 0) {
    console.log(`\n❌ Failures (${results.itemsFailed.length}):`);
    results.itemsFailed.forEach(f => console.log(`   - ${f.item || f.reason}`));
  }
  console.log('========================================\n');
  process.exit(results.success ? 0 : 1);
}).catch(err => {
  console.error('Script failed:', err);
  process.exit(1);
});
