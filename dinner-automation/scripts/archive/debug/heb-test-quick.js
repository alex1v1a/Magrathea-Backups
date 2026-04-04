const { chromium } = require('playwright');

const HEB_EMAIL = process.env.HEB_EMAIL || 'alex@1v1a.com';
const HEB_PASSWORD = process.env.HEB_PASSWORD;

if (!HEB_PASSWORD) {
  console.error('HEB_PASSWORD environment variable required');
  process.exit(1);
}

(async () => {
  console.log('🚀 Starting HEB Playwright Test\n');
  
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  try {
    // Step 1: Navigate to HEB
    console.log('1️⃣ Navigating to HEB.com...');
    await page.goto('https://www.heb.com', { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);
    console.log('   ✅ Page loaded\n');
    
    // Step 2: Check login status
    console.log('2️⃣ Checking login status...');
    const signInLink = await page.$('text=Sign In');
    if (signInLink) {
      console.log('   Not logged in, logging in...');
      await signInLink.click();
      await page.waitForTimeout(3000);
      
      // Fill credentials
      const emailField = await page.$('input[type="email"], input[name="email"]');
      if (emailField) {
        await emailField.fill(HEB_EMAIL);
        console.log('   ✅ Email filled');
      }
      
      const passwordField = await page.$('input[type="password"]');
      if (passwordField) {
        await passwordField.fill(HEB_PASSWORD);
        console.log('   ✅ Password filled');
      }
      
      const submitBtn = await page.$('button[type="submit"], button:has-text("Sign In")');
      if (submitBtn) {
        await submitBtn.click();
        await page.waitForTimeout(5000);
        console.log('   ✅ Login submitted\n');
      }
    } else {
      console.log('   ✅ Already logged in\n');
    }
    
    // Step 3: Test search
    console.log('3️⃣ Testing search...');
    await page.waitForTimeout(5000); // Wait longer for page to fully load
    
    // Try to find search input
    const searchInput = await page.$('input[type="search"], input[name="q"], input[placeholder*="Search"]');
    
    if (searchInput) {
      await searchInput.fill('milk');
      await searchInput.press('Enter');
      await page.waitForTimeout(5000);
      console.log('   ✅ Search executed\n');
      
      // Step 4: Find add-to-cart buttons
      console.log('4️⃣ Looking for add-to-cart buttons...');
      const addButtons = await page.$$('button:has-text("Add")');
      console.log(`   ✅ Found ${addButtons.length} add buttons\n`);
      
      // Step 5: Try to add first item (test only - won't actually add)
      if (addButtons.length > 0) {
        console.log('5️⃣ Test complete - ready to add items! ✅\n');
      }
    } else {
      console.log('   ❌ Search input not found');
      
      // Debug: Get all input elements
      const inputs = await page.$$eval('input', inputs => inputs.map(i => ({
        type: i.type,
        name: i.name,
        placeholder: i.placeholder,
        className: i.className?.substring(0, 50)
      })));
      console.log('   Found inputs:', JSON.stringify(inputs, null, 2));
      
      // Debug: Get page title and URL
      const title = await page.title();
      const url = page.url();
      console.log(`   Page: ${title} at ${url}`);
      
      console.log('   Taking screenshot...');
      await page.screenshot({ path: 'heb-debug.png', fullPage: true });
      console.log('   Screenshot saved to heb-debug.png\n');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    try {
      await page.screenshot({ path: 'heb-error.png' });
      console.log('Error screenshot saved to heb-error.png');
    } catch {}
  } finally {
    await browser.close();
    console.log('Browser closed.');
  }
})();
