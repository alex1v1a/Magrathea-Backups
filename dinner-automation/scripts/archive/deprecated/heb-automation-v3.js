const { chromium } = require('playwright-extra');
const stealth = require('puppeteer-extra-plugin-stealth');
const imaps = require('imap-simple');
const fs = require('fs');
const path = require('path');

// Enable stealth mode
chromium.use(stealth());

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
      const broadSearch = [['SINCE', new Date(Date.now() - 5 * 60000).toISOString().split('T')[0]]];
      const allMessages = await connection.search(broadSearch, fetchOptions);
      
      for (const message of allMessages.slice(-5)) {
        const body = message.parts.find(part => part.which === 'TEXT');
        if (body) {
          const text = body.body.toString();
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
    args: [
      '--disable-blink-features=AutomationControlled',
      '--disable-web-security',
      '--disable-features=IsolateOrigins,site-per-process',
      '--no-sandbox',
      '--disable-setuid-sandbox'
    ]
  });
  
  const context = await browser.newContext({
    viewport: { width: 1400, height: 900 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    locale: 'en-US',
    timezoneId: 'America/Chicago'
  });
  
  const page = await context.newPage();
  
  // Add delays to appear more human
  page.on('load', () => console.log('   Page loaded:', page.url()));

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
    await page.waitForTimeout(5000);

    // Handle cookie consent
    try {
      const acceptButton = await page.$('button:has-text("Accept"), button:has-text("Allow")');
      if (acceptButton) {
        await acceptButton.click();
        await page.waitForTimeout(2000);
      }
    } catch (e) {}

    // Go directly to login page
    console.log('🔐 Navigating to login page...');
    await page.goto('https://www.heb.com/login', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(5000);

    // Enter credentials
    console.log('✉️  Entering credentials...');
    
    // Try to find and fill email
    const emailFound = await page.fill('input#email, input[name="email"], input[type="email"]', HEB_EMAIL).catch(async () => {
      // Try getting all inputs
      const inputs = await page.$$('input');
      for (const input of inputs) {
        const type = await input.getAttribute('type');
        const name = await input.getAttribute('name');
        const id = await input.getAttribute('id');
        if (type === 'email' || name?.includes('email') || id?.includes('email')) {
          await input.fill(HEB_EMAIL);
          return true;
        }
      }
      return false;
    });

    if (!emailFound) {
      throw new Error('Could not find email input');
    }

    await page.waitForTimeout(1000);

    // Fill password
    await page.fill('input#password, input[name="password"], input[type="password"]', HEB_PASSWORD).catch(async () => {
      const inputs = await page.$$('input');
      for (const input of inputs) {
        const type = await input.getAttribute('type');
        if (type === 'password') {
          await input.fill(HEB_PASSWORD);
          return true;
        }
      }
      return false;
    });

    await page.waitForTimeout(1000);

    // Click login
    await page.click('button[type="submit"], button:has-text("Sign In"), button:has-text("Login")').catch(async () => {
      const buttons = await page.$$('button');
      for (const button of buttons) {
        const text = await button.textContent();
        if (text?.toLowerCase().includes('sign in') || text?.toLowerCase().includes('login')) {
          await button.click();
          return true;
        }
      }
      // Try pressing Enter
      await page.keyboard.press('Enter');
      return true;
    });

    await page.waitForTimeout(5000);

    // Check for 2FA
    console.log('🔍 Checking for 2FA...');
    const has2FA = await page.waitForSelector('input[maxlength="6"], input[placeholder*="code"]', { timeout: 5000 }).catch(() => null);
    
    if (has2FA) {
      console.log('📱 2FA required - fetching code from email...');
      const code = await waitFor2FAEmail(15);
      
      if (code) {
        results.twoFAHandled = true;
        results.twoFACode = code;
        console.log(`   Entering 2FA code: ${code}`);
        await page.fill('input[maxlength="6"], input[placeholder*="code"]', code);
        await page.click('button[type="submit"], button:has-text("Verify")');
        await page.waitForTimeout(3000);
      } else {
        console.log('   ⚠️ Could not fetch 2FA code');
      }
    } else {
      console.log('   No 2FA required');
    }

    // Check if logged in
    await page.waitForTimeout(3000);
    const pageContent = await page.content();
    if (pageContent.toLowerCase().includes('sign out') || pageContent.toLowerCase().includes('my account') || pageContent.toLowerCase().includes('account')) {
      results.loginSuccessful = true;
      console.log('✅ Login successful!\n');
    } else {
      console.log('⚠️ Login status unclear, continuing...\n');
    }

    // Process unique items
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
        // Navigate to search
        const searchUrl = `https://www.heb.com/search?q=${encodeURIComponent(item.hebSearch)}`;
        await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.waitForTimeout(3000);

        // Click Add to Cart on first result
        const added = await page.click('button:has-text("Add to Cart"), button[data-testid*="add"], .add-to-cart').then(() => true).catch(async () => {
          // Try alternative selectors
          const buttons = await page.$$('button');
          for (const button of buttons) {
            const text = await button.textContent();
            if (text?.toLowerCase().includes('add')) {
              await button.click();
              return true;
            }
          }
          return false;
        });

        if (added) {
          console.log(`      ✅ Added to cart`);
          results.itemsAdded++;
          await page.waitForTimeout(2000);
        } else {
          console.log(`      ❌ No Add to Cart button found`);
          results.itemsFailed.push({ item: item.name, search: item.hebSearch, reason: 'No button found' });
        }
      } catch (error) {
        console.log(`      ❌ Error: ${error.message}`);
        results.itemsFailed.push({ item: item.name, search: item.hebSearch, reason: error.message });
      }
    }

    // Go to cart
    console.log('\n🛒 Navigating to cart...');
    await page.goto('https://www.heb.com/cart', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(4000);

    // Get cart total
    console.log('💰 Extracting cart total...');
    const pageText = await page.content();
    const totalMatch = pageText.match(/\$[0-9,]+\.[0-9]{2}/);
    if (totalMatch) {
      results.cartTotal = totalMatch[0];
      console.log(`   Cart total: ${results.cartTotal}`);
    }

    // Screenshot
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const screenshotPath = path.join(screenshotDir, `heb-cart-${timestamp}.png`);
    await page.screenshot({ path: screenshotPath, fullPage: true });
    results.screenshot = screenshotPath;
    console.log(`   📸 Screenshot saved`);

    results.success = results.itemsAdded > 0;

  } catch (error) {
    console.error('❌ Fatal error:', error.message);
    results.itemsFailed.push({ reason: `Fatal error: ${error.message}` });
    
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const screenshotPath = path.join(screenshotDir, `heb-cart-error-${timestamp}.png`);
      await page.screenshot({ path: screenshotPath, fullPage: true });
      results.screenshot = screenshotPath;
    } catch (e) {}
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
