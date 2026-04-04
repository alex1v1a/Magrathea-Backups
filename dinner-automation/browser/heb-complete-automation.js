/**
 * HEB Complete Automation - Login with 2FA and add items to cart
 */

const { StealthBrowser } = require('./src/StealthBrowser');
const fs = require('fs');
const path = require('path');

// Load cart items
const cartData = JSON.parse(fs.readFileSync('../data/heb-cart-pending.json', 'utf8'));
const items = cartData.items;

const HEB_EMAIL = 'alex@1v1a.com';
const HEB_PASSWORD = '$Tandal0ne';
const ICLOUD_EMAIL = 'alex@1v1a.com';
const ICLOUD_PASSWORD = 'pasg-vifp-rzob-uimt';

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function getVerificationCodeFromIcloud(browser) {
  console.log('Checking iCloud email for HEB verification code...');
  
  // Open a new page for iCloud mail
  const mailPage = await browser.context.newPage();
  await mailPage.goto('https://www.icloud.com/mail');
  await delay(5000);
  
  // Check if login needed
  const needsLogin = await mailPage.evaluate(() => {
    return !!document.querySelector('input[type="email"], #account_name_text_field');
  });
  
  if (needsLogin) {
    console.log('Logging into iCloud...');
    
    // Apple ID
    await mailPage.fill('input[type="email"], #account_name_text_field', ICLOUD_EMAIL);
    await delay(1000);
    
    // Press enter or click continue
    await mailPage.keyboard.press('Enter');
    await delay(3000);
    
    // Password
    await mailPage.fill('input[type="password"], #password_text_field', ICLOUD_PASSWORD);
    await delay(1000);
    
    await mailPage.keyboard.press('Enter');
    await delay(8000);
    
    // Handle trust dialog
    const trustBtn = await mailPage.$('button:has-text("Trust"), .trust-button');
    if (trustBtn) {
      await trustBtn.click();
      await delay(3000);
    }
  }
  
  // Wait for mail to load
  await delay(5000);
  
  // Search for HEB emails
  const searchInput = await mailPage.$('input[placeholder*="Search"], .search-input');
  if (searchInput) {
    await searchInput.fill('HEB');
    await delay(2000);
    await mailPage.keyboard.press('Enter');
    await delay(5000);
  }
  
  // Look for verification code in email list
  const code = await mailPage.evaluate(() => {
    const emails = document.querySelectorAll('.message-row, .mail-row, [role="row"]');
    for (const email of emails) {
      const text = email.textContent || '';
      if (text.toLowerCase().includes('heb') && text.toLowerCase().includes('verification')) {
        // Look for 6-digit code
        const match = text.match(/\b(\d{6})\b/);
        if (match) return match[1];
        
        // Try clicking to open email
        email.click();
        return null;
      }
    }
    return null;
  });
  
  if (code) {
    await mailPage.close();
    return code;
  }
  
  // If we clicked an email, wait and check content
  await delay(3000);
  
  const codeFromContent = await mailPage.evaluate(() => {
    const content = document.body.textContent || '';
    const match = content.match(/\b(\d{6})\b/);
    return match ? match[1] : null;
  });
  
  await mailPage.close();
  return codeFromContent;
}

async function completeHEBAutomation() {
  const browser = new StealthBrowser({
    profile: 'heb-main',
    headless: false,
    slowMo: 50
  });
  
  try {
    await browser.launch();
    
    // Step 1: Navigate to HEB and start login
    console.log('=== Step 1: Starting HEB login ===');
    await browser.navigate('https://www.heb.com/login');
    await browser.randomDelay(2000, 3000);
    
    // Check if already logged in
    const alreadyLoggedIn = await browser.elementExists('[data-testid="account-menu"], .account-dropdown');
    if (alreadyLoggedIn) {
      console.log('Already logged in to HEB');
    } else {
      // Fill login form
      console.log('Filling login credentials...');
      await browser.type('input[type="email"], input[name="email"]', HEB_EMAIL);
      await browser.randomDelay(500, 1000);
      
      await browser.type('input[type="password"], input[name="password"]', HEB_PASSWORD);
      await browser.randomDelay(500, 1000);
      
      // Click sign in
      await browser.click('button[type="submit"], button:has-text("Sign In")');
      await browser.randomDelay(3000, 5000);
      
      // Check for 2FA
      const needs2FA = await browser.elementExists('input[type="tel"], input[name="code"], input[placeholder*="code"], input[placeholder*="verification"]');
      
      if (needs2FA) {
        console.log('2FA required - checking email for verification code...');
        
        // Wait a moment for email to arrive
        await delay(5000);
        
        // Get verification code from iCloud
        let code = null;
        let attempts = 0;
        
        while (!code && attempts < 10) {
          code = await getVerificationCodeFromIcloud(browser);
          if (code) {
            console.log('Found verification code:', code);
            break;
          }
          console.log('Code not found yet, waiting... (attempt', attempts + 1, ')');
          await delay(3000);
          attempts++;
        }
        
        if (!code) {
          throw new Error('Could not find verification code in email');
        }
        
        // Enter the verification code
        console.log('Entering verification code:', code);
        await browser.type('input[type="tel"], input[name="code"], input[placeholder*="code"]', code);
        await browser.randomDelay(500, 1000);
        
        // Submit
        await browser.click('button:has-text("Verify"), button:has-text("Submit"), button[type="submit"]');
        await browser.randomDelay(5000, 8000);
        
        // Trust this device if prompted
        const trustPrompt = await browser.elementExists('button:has-text("Trust"), button:has-text("Yes"), label:has-text("Trust")');
        if (trustPrompt) {
          await browser.click('button:has-text("Trust"), button:has-text("Yes"), label:has-text("Trust")');
          await browser.randomDelay(3000, 5000);
        }
      }
      
      // Verify login success
      const loggedIn = await browser.elementExists('[data-testid="account-menu"], .account-dropdown, .welcome-message');
      if (!loggedIn) {
        throw new Error('Login failed - could not verify successful login');
      }
      console.log('Login successful!');
    }
    
    // Step 2: Add items to cart
    console.log('=== Step 2: Adding items to cart ===');
    console.log(`Adding ${items.length} items...`);
    
    const results = [];
    
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      console.log(`[${i + 1}/${items.length}] Adding: ${item.name} (${item.hebSearch})`);
      
      try {
        // Search for product
        const searchUrl = `https://www.heb.com/search/?q=${encodeURIComponent(item.hebSearch)}`;
        await browser.navigate(searchUrl);
        await browser.randomDelay(2000, 3000);
        
        // Wait for search results
        await browser.waitForSelector('[data-testid="product-grid"], .product-grid, .search-results, .product-card', 10000);
        
        // Try to add first product
        const addButtonSelectors = [
          '[data-testid="add-to-cart"]',
          'button:has-text("Add to Cart")',
          'button:has-text("Add")',
          '.add-to-cart-button',
          '[data-automation-id="add-to-cart-button"]'
        ];
        
        let added = false;
        for (const selector of addButtonSelectors) {
          const exists = await browser.elementExists(selector);
          if (exists) {
            await browser.click(selector);
            added = true;
            break;
          }
        }
        
        if (added) {
          console.log(`  ✓ Added ${item.name}`);
          results.push({ item: item.name, success: true });
        } else {
          console.log(`  ✗ Could not find add button for ${item.name}`);
          results.push({ item: item.name, success: false, error: 'Add button not found' });
        }
        
        await browser.randomDelay(2000, 4000);
        
      } catch (error) {
        console.log(`  ✗ Error adding ${item.name}:`, error.message);
        results.push({ item: item.name, success: false, error: error.message });
      }
    }
    
    // Step 3: View cart and take screenshot
    console.log('=== Step 3: Viewing cart ===');
    await browser.navigate('https://www.heb.com/cart');
    await browser.randomDelay(3000, 5000);
    
    // Get cart summary
    const cartInfo = await browser.evaluate(() => {
      const itemCount = document.querySelectorAll('[data-testid="cart-item"], .cart-item').length;
      const totalEl = document.querySelector('[data-testid="cart-total"], .cart-total, .order-total');
      return {
        itemCount,
        total: totalEl ? totalEl.textContent.trim() : 'Unknown'
      };
    });
    
    console.log('Cart items:', cartInfo.itemCount);
    console.log('Cart total:', cartInfo.total);
    
    // Take screenshot of cart
    const screenshotPath = path.join(__dirname, 'logs', `heb-cart-${Date.now()}.png`);
    await browser.page.screenshot({ path: screenshotPath, fullPage: true });
    console.log('Screenshot saved:', screenshotPath);
    
    // Save results
    const resultsPath = path.join(__dirname, 'logs', 'heb-cart-results.json');
    fs.writeFileSync(resultsPath, JSON.stringify({
      timestamp: new Date().toISOString(),
      results,
      cart: cartInfo,
      screenshot: screenshotPath
    }, null, 2));
    
    console.log('=== Summary ===');
    console.log('Items added successfully:', results.filter(r => r.success).length);
    console.log('Items failed:', results.filter(r => !r.success).length);
    console.log('Cart total:', cartInfo.total);
    
    await browser.close();
    
    return {
      success: true,
      itemsAdded: results.filter(r => r.success).length,
      totalItems: items.length,
      cartTotal: cartInfo.total,
      screenshot: screenshotPath
    };
    
  } catch (error) {
    console.error('Automation failed:', error);
    await browser.screenshot({ filename: 'heb-error.png' });
    await browser.close();
    throw error;
  }
}

// Run the automation
completeHEBAutomation()
  .then(result => {
    console.log('\n✓ HEB automation completed successfully!');
    console.log('Items added:', result.itemsAdded);
    console.log('Cart total:', result.cartTotal);
    process.exit(0);
  })
  .catch(error => {
    console.error('\n✗ HEB automation failed:', error.message);
    process.exit(1);
  });
