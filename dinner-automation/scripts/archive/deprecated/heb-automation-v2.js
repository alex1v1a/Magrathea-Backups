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
    slowMo: 50 
  });
  
  const context = await browser.newContext({
    viewport: { width: 1400, height: 900 }
  });
  
  const page = await context.newPage();
  
  // Enable console logging
  page.on('console', msg => {
    if (msg.type() === 'error') console.log('PAGE ERROR:', msg.text());
  });

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
    await page.goto('https://www.heb.com', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(5000);

    // Debug: Take initial screenshot
    await page.screenshot({ path: path.join(screenshotDir, 'debug-01-initial.png') });

    // Handle cookie consent
    try {
      const acceptButton = await page.$('button:has-text("Accept All Cookies"), button:has-text("Accept"), button[aria-label*="Accept"]');
      if (acceptButton) {
        console.log('   Clicking cookie accept...');
        await acceptButton.click();
        await page.waitForTimeout(2000);
      }
    } catch (e) {}

    // Look for Account/Sign In link - more flexible selectors
    console.log('🔐 Looking for Sign In link...');
    
    // Try various sign in selectors
    const signInSelectors = [
      'a[href*="login"]',
      'a[href*="signin"]',
      'a[href*="account"]',
      'button:has-text("Sign In")',
      'button:has-text("Account")',
      '[data-testid*="account"]',
      '[data-testid*="signin"]',
      'a:has-text("Sign In")',
      'a:has-text("My Account")',
      'a:has-text("Login")',
      '.account-link',
      '.sign-in-link'
    ];

    let signInButton = null;
    for (const selector of signInSelectors) {
      signInButton = await page.$(selector);
      if (signInButton) {
        console.log(`   Found sign in element: ${selector}`);
        break;
      }
    }

    if (signInButton) {
      await signInButton.click();
      await page.waitForTimeout(3000);
    } else {
      console.log('   No sign in button found, checking if already on login page...');
    }

    // Debug screenshot after clicking sign in
    await page.screenshot({ path: path.join(screenshotDir, 'debug-02-login-page.png') });

    // Enter credentials - flexible selectors
    console.log('✉️  Entering credentials...');
    
    // Try multiple email input selectors
    const emailSelectors = [
      'input[type="email"]',
      'input[name="email"]',
      'input[name="username"]',
      'input[id*="email"]',
      'input[id*="username"]',
      'input[placeholder*="email" i]',
      'input[placeholder*="username" i]',
      'input[autocomplete="email"]',
      'input[autocomplete="username"]',
      'input.input-email',
      'input.login-email'
    ];

    let emailInput = null;
    for (const selector of emailSelectors) {
      try {
        emailInput = await page.waitForSelector(selector, { timeout: 5000 });
        if (emailInput) {
          console.log(`   Found email input: ${selector}`);
          break;
        }
      } catch (e) {}
    }

    if (!emailInput) {
      throw new Error('Could not find email input field');
    }

    await emailInput.fill(HEB_EMAIL);
    await page.waitForTimeout(500);

    // Try multiple password input selectors
    const passwordSelectors = [
      'input[type="password"]',
      'input[name="password"]',
      'input[id*="password"]',
      'input[placeholder*="password" i]',
      'input[autocomplete="current-password"]',
      'input.input-password',
      'input.login-password'
    ];

    let passwordInput = null;
    for (const selector of passwordSelectors) {
      passwordInput = await page.$(selector);
      if (passwordInput) {
        console.log(`   Found password input: ${selector}`);
        break;
      }
    }

    if (!passwordInput) {
      throw new Error('Could not find password input field');
    }

    await passwordInput.fill(HEB_PASSWORD);
    await page.waitForTimeout(500);

    // Click login button
    const loginButtonSelectors = [
      'button[type="submit"]',
      'button:has-text("Sign In")',
      'button:has-text("Log In")',
      'button:has-text("Login")',
      'input[type="submit"]',
      'button.submit',
      'button.login-button'
    ];

    let loginButton = null;
    for (const selector of loginButtonSelectors) {
      loginButton = await page.$(selector);
      if (loginButton) {
        console.log(`   Found login button: ${selector}`);
        break;
      }
    }

    if (loginButton) {
      await loginButton.click();
    } else {
      // Try pressing Enter on password field
      await passwordInput.press('Enter');
    }

    await page.waitForTimeout(4000);

    // Debug screenshot after login attempt
    await page.screenshot({ path: path.join(screenshotDir, 'debug-03-after-login.png') });

    // Check for 2FA
    console.log('🔍 Checking for 2FA...');
    const twoFASelectors = [
      'input[maxlength="6"]',
      'input[placeholder*="code" i]',
      'input[name*="code" i]',
      'input[name*="otp" i]',
      'text=/Enter verification code/i',
      'text=/2FA/i',
      'text=/two.factor/i'
    ];

    let twoFAPresent = false;
    for (const selector of twoFASelectors) {
      try {
        const element = await page.waitForSelector(selector, { timeout: 2000 });
        if (element) {
          twoFAPresent = true;
          break;
        }
      } catch (e) {}
    }
    
    if (twoFAPresent) {
      console.log('📱 2FA required - fetching code from email...');
      const code = await waitFor2FAEmail(15);
      
      if (code) {
        results.twoFAHandled = true;
        results.twoFACode = code;
        console.log(`   Entering 2FA code: ${code}`);
        
        const codeInputSelectors = [
          'input[maxlength="6"]',
          'input[placeholder*="code" i]',
          'input[name*="code" i]',
          'input[type="text"]'
        ];
        
        for (const selector of codeInputSelectors) {
          try {
            await page.fill(selector, code);
            break;
          } catch (e) {}
        }
        
        await page.click('button[type="submit"], button:has-text("Verify"), button:has-text("Continue")');
        await page.waitForTimeout(3000);
      } else {
        console.log('   ⚠️ Could not fetch 2FA code from email');
      }
    } else {
      console.log('   No 2FA required');
    }

    // Verify login
    await page.waitForTimeout(3000);
    
    // Debug screenshot
    await page.screenshot({ path: path.join(screenshotDir, 'debug-04-logged-in.png') });

    // Check for logged in indicators
    const loggedInSelectors = [
      'text=/My Account/i',
      'text=/Hello/i',
      'text=/Welcome/i',
      '[data-testid*="account"]',
      '.account-dropdown',
      'a:has-text("Sign Out")',
      'button:has-text("Sign Out")'
    ];

    for (const selector of loggedInSelectors) {
      try {
        const element = await page.waitForSelector(selector, { timeout: 2000 });
        if (element) {
          results.loginSuccessful = true;
          break;
        }
      } catch (e) {}
    }

    if (results.loginSuccessful) {
      console.log('✅ Login successful!\n');
    } else {
      console.log('⚠️ Login status unclear, continuing anyway...\n');
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
        // Find and fill search box
        const searchSelectors = [
          'input[type="search"]',
          'input[name="search"]',
          'input[placeholder*="search" i]',
          'input[aria-label*="search" i]',
          'input[data-testid*="search"]',
          'input.search-input'
        ];

        let searchBox = null;
        for (const selector of searchSelectors) {
          searchBox = await page.$(selector);
          if (searchBox) break;
        }

        if (searchBox) {
          await searchBox.fill('');
          await searchBox.fill(item.hebSearch);
          await searchBox.press('Enter');
        } else {
          // Try search button
          const searchButton = await page.$('button:has-text("Search"), [data-testid*="search"], .search-icon');
          if (searchButton) {
            await searchButton.click();
            await page.waitForTimeout(1000);
            const searchInput = await page.$('input');
            if (searchInput) {
              await searchInput.fill(item.hebSearch);
              await searchInput.press('Enter');
            }
          }
        }

        await page.waitForTimeout(3000);

        // Look for Add to Cart button
        const addToCartSelectors = [
          'button:has-text("Add to Cart")',
          'button:has-text("Add")',
          '[data-testid*="add-to-cart"]',
          '[data-testid*="addToCart"]',
          '.add-to-cart',
          'button.add-to-cart',
          'button[aria-label*="Add to Cart"]'
        ];

        let added = false;
        for (const selector of addToCartSelectors) {
          const buttons = await page.$$(selector);
          if (buttons.length > 0) {
            await buttons[0].click();
            console.log(`      ✅ Added to cart`);
            results.itemsAdded++;
            added = true;
            await page.waitForTimeout(2500);
            break;
          }
        }

        if (!added) {
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
    
    const cartSelectors = [
      'a[href*="cart"]',
      'button:has-text("Cart")',
      '[data-testid*="cart"]',
      '.cart-icon',
      'a:has-text("Cart")'
    ];

    let cartButton = null;
    for (const selector of cartSelectors) {
      cartButton = await page.$(selector);
      if (cartButton) {
        await cartButton.click();
        break;
      }
    }

    if (!cartButton) {
      await page.goto('https://www.heb.com/cart');
    }
    
    await page.waitForTimeout(4000);

    // Debug screenshot of cart
    await page.screenshot({ path: path.join(screenshotDir, 'debug-05-cart.png') });

    // Extract cart total
    console.log('💰 Extracting cart total...');
    const totalSelectors = [
      'text=/\\$[0-9,]+\\.[0-9]{2}/',
      '.cart-total',
      '[data-testid*="total"]',
      '.order-total',
      '.subtotal',
      'span:has-text("$")'
    ];

    for (const selector of totalSelectors) {
      try {
        const element = await page.waitForSelector(selector, { timeout: 2000 });
        if (element) {
          const text = await element.textContent();
          const match = text.match(/\$[0-9,]+\.[0-9]{2}/);
          if (match) {
            results.cartTotal = match[0];
            console.log(`   Cart total: ${results.cartTotal}`);
            break;
          }
        }
      } catch (e) {}
    }

    // Take final screenshot
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const screenshotPath = path.join(screenshotDir, `heb-cart-${timestamp}.png`);
    await page.screenshot({ path: screenshotPath, fullPage: true });
    results.screenshot = screenshotPath;
    console.log(`   📸 Screenshot saved: ${screenshotPath}`);

    results.success = results.itemsAdded > 0;

  } catch (error) {
    console.error('❌ Fatal error:', error.message);
    results.itemsFailed.push({ reason: `Fatal error: ${error.message}` });
    
    // Error screenshot
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
