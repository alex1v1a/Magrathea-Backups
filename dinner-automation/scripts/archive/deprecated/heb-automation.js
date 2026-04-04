const { chromium } = require('playwright');
const imaps = require('imap-simple');
const fs = require('fs');
const path = require('path');

const HEB_EMAIL = 'alex@1v1a.com';
const HEB_PASSWORD = '$Tandal0ne';
const IMAP_EMAIL = 'MarvinMartian9@icloud.com';
const IMAP_PASSWORD = 'pasg-vifp-rzob-uimt';

const itemsFile = 'dinner-automation/data/heb-cart-pending.json';
const resultsFile = 'dinner-automation/data/heb-cart-results.json';
const screenshotDir = 'dinner-automation/data/screenshots';

// Ensure screenshot directory exists
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
    
    // Search for recent emails from HEB
    const searchCriteria = [
      'UNSEEN',
      ['FROM', 'heb.com'],
      ['SINCE', new Date().toISOString().split('T')[0]]
    ];
    
    const fetchOptions = { bodies: ['HEADER', 'TEXT'] };
    const messages = await connection.search(searchCriteria, fetchOptions);
    
    if (messages.length === 0) {
      console.log('   No unread HEB emails found, checking all recent emails...');
      // Try broader search
      const broadSearch = [['SINCE', new Date(Date.now() - 5 * 60000).toISOString().split('T')[0]]];
      const allMessages = await connection.search(broadSearch, fetchOptions);
      
      for (const message of allMessages.slice(-5)) {
        const body = message.parts.find(part => part.which === 'TEXT');
        if (body) {
          const text = body.body.toString();
          // Look for 6-digit code
          const codeMatch = text.match(/\b\d{6}\b/);
          if (codeMatch) {
            console.log(`   Found potential 2FA code: ${codeMatch[0]}`);
            await connection.end();
            return codeMatch[0];
          }
        }
      }
    } else {
      for (const message of messages) {
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
    }
    
    await connection.end();
    return null;
  } catch (error) {
    console.error('   Error fetching email:', error.message);
    return null;
  }
}

async function waitFor2FAEmail(maxAttempts = 10) {
  for (let i = 0; i < maxAttempts; i++) {
    console.log(`   Attempt ${i + 1}/${maxAttempts}...`);
    const code = await fetch2FACode();
    if (code) return code;
    await new Promise(r => setTimeout(r, 3000));
  }
  return null;
}

async function addItemsToCart() {
  const data = JSON.parse(fs.readFileSync(itemsFile, 'utf8'));
  const items = data.items;
  
  console.log(`🛒 Starting HEB Cart Automation - ${items.length} items to add\n`);

  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 100 
  });
  
  const context = await browser.newContext({
    viewport: { width: 1400, height: 900 }
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
    console.log('🌐 Navigating to HEB.com...');
    await page.goto('https://www.heb.com', { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForTimeout(3000);

    // Handle cookie consent if present
    try {
      const acceptCookies = await page.$('button:has-text("Accept")');
      if (acceptCookies) {
        await acceptCookies.click();
        await page.waitForTimeout(1000);
      }
    } catch (e) {}

    // Click Sign In
    console.log('🔐 Looking for Sign In button...');
    const signInButton = await page.$('a:has-text("Sign In"), button:has-text("Sign In"), [data-testid*="signin"], .sign-in');
    if (signInButton) {
      await signInButton.click();
      await page.waitForTimeout(2000);
    }

    // Enter credentials
    console.log('✉️  Entering credentials...');
    await page.fill('input[type="email"], input[name="email"], #email, [placeholder*="email" i]', HEB_EMAIL);
    await page.fill('input[type="password"], input[name="password"], #password, [placeholder*="password" i]', HEB_PASSWORD);
    
    // Click login button
    await page.click('button[type="submit"], button:has-text("Sign In"), button:has-text("Log In")');
    await page.waitForTimeout(3000);

    // Check for 2FA
    console.log('🔍 Checking for 2FA...');
    const twoFAPrompt = await page.$('text=/verification|verify|code|2FA|two.factor/i');
    const codeInput = await page.$('input[type="text"][maxlength="6"], input[placeholder*="code" i], input[name*="code" i]');
    
    if (twoFAPrompt || codeInput) {
      console.log('📱 2FA required - fetching code from email...');
      const code = await waitFor2FAEmail(15);
      
      if (code) {
        results.twoFAHandled = true;
        results.twoFACode = code;
        console.log(`   Entering 2FA code: ${code}`);
        await page.fill('input[type="text"][maxlength="6"], input[placeholder*="code" i], input[name*="code" i]', code);
        await page.click('button[type="submit"], button:has-text("Verify"), button:has-text("Continue")');
        await page.waitForTimeout(3000);
      } else {
        console.log('   ⚠️ Could not fetch 2FA code from email');
        results.itemsFailed.push({ reason: '2FA code not found in email' });
      }
    } else {
      console.log('   No 2FA required');
      results.twoFAHandled = false;
    }

    // Verify login
    await page.waitForTimeout(3000);
    const userIndicator = await page.$('text=/account|profile|welcome|hello|my account/i, .account-icon, [data-testid*="account"]');
    const cartIndicator = await page.$('[data-testid*="cart"], .cart-icon, a:has-text("Cart")');
    
    if (userIndicator || cartIndicator) {
      console.log('✅ Login successful!\n');
      results.loginSuccessful = true;
    } else {
      console.log('⚠️ Login status unclear, continuing anyway...\n');
    }

    // Add items to cart
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
        // Clear and fill search box
        const searchBox = await page.$('input[type="search"], input[placeholder*="search" i], input[name*="search" i], #search');
        if (searchBox) {
          await searchBox.fill('');
          await searchBox.fill(item.hebSearch);
          await searchBox.press('Enter');
        } else {
          // Alternative: click search icon
          const searchIcon = await page.$('button:has-text("Search"), .search-icon, [data-testid*="search"]');
          if (searchIcon) await searchIcon.click();
        }

        await page.waitForTimeout(3000);

        // Look for Add to Cart button
        const addToCartButtons = await page.$$('button:has-text("Add to Cart"), button:has-text("Add"), [data-testid*="add-to-cart"], .add-to-cart');
        
        if (addToCartButtons.length > 0) {
          // Click the first Add to Cart button
          await addToCartButtons[0].click();
          console.log(`      ✅ Added to cart`);
          results.itemsAdded++;
          await page.waitForTimeout(2500);
        } else {
          console.log(`      ❌ No Add to Cart button found`);
          results.itemsFailed.push({ 
            item: item.name, 
            search: item.hebSearch, 
            reason: 'No Add to Cart button found' 
          });
        }
      } catch (error) {
        console.log(`      ❌ Error: ${error.message}`);
        results.itemsFailed.push({ 
          item: item.name, 
          search: item.hebSearch, 
          reason: error.message 
        });
      }
    }

    // Navigate to cart
    console.log('\n🛒 Navigating to cart...');
    const cartButton = await page.$('a[href*="cart"], button:has-text("Cart"), [data-testid*="cart"], .cart-icon');
    if (cartButton) {
      await cartButton.click();
    } else {
      await page.goto('https://www.heb.com/cart');
    }
    
    await page.waitForTimeout(4000);

    // Extract cart total
    console.log('💰 Extracting cart total...');
    const cartTotalElement = await page.$('text=/\\$[0-9]+\\.[0-9]{2}/, .cart-total, [data-testid*="total"], .order-total');
    if (cartTotalElement) {
      const totalText = await cartTotalElement.textContent();
      const totalMatch = totalText.match(/\$[0-9]+\.[0-9]{2}/);
      if (totalMatch) {
        results.cartTotal = totalMatch[0];
        console.log(`   Cart total: ${results.cartTotal}`);
      }
    }

    // Take screenshot
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const screenshotPath = path.join(screenshotDir, `heb-cart-${timestamp}.png`);
    await page.screenshot({ path: screenshotPath, fullPage: true });
    results.screenshot = screenshotPath;
    console.log(`   📸 Screenshot saved: ${screenshotPath}`);

    results.success = results.itemsAdded > 0;

  } catch (error) {
    console.error('❌ Fatal error:', error.message);
    results.itemsFailed.push({ reason: `Fatal error: ${error.message}` });
    
    // Try to take error screenshot
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const screenshotPath = path.join(screenshotDir, `heb-cart-error-${timestamp}.png`);
      await page.screenshot({ path: screenshotPath, fullPage: true });
      results.screenshot = screenshotPath;
    } catch (e) {}
  } finally {
    // Save results
    fs.writeFileSync(resultsFile, JSON.stringify(results, null, 2));
    console.log(`\n💾 Results saved to ${resultsFile}`);
    
    // Keep browser open for a bit to see results
    await page.waitForTimeout(10000);
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
