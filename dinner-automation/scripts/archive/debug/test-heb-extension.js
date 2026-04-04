const { chromium } = require('playwright');
const path = require('path');

const EXTENSION_PATH = path.join(__dirname, '..', 'heb-extension');
const HEB_EMAIL = process.env.HEB_EMAIL || 'alex@1v1a.com';
const HEB_PASSWORD = process.env.HEB_PASSWORD;

(async () => {
  console.log('🧪 Testing HEB Auto-Cart Extension\n');
  
  if (!HEB_PASSWORD) {
    console.error('❌ HEB_PASSWORD environment variable required');
    process.exit(1);
  }

  // Launch Chrome with extension loaded
  const userDataDir = 'C:\\Users\\Admin\\.openclaw\\chrome-marvin-only-profile';
  
  const browser = await chromium.launchPersistentContext(userDataDir, {
    headless: false,
    args: [
      `--disable-extensions-except=${EXTENSION_PATH}`,
      `--load-extension=${EXTENSION_PATH}`,
      '--start-maximized'
    ]
  });

  console.log('✅ Chrome launched with HEB Auto-Cart extension');
  console.log('⏳ Waiting for extension to initialize...\n');
  
  const page = await browser.newPage();
  
  try {
    // Navigate to HEB
    console.log('🌐 Navigating to HEB.com...');
    await page.goto('https://www.heb.com', { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);
    
    console.log('📍 Current URL:', page.url());
    
    // Check if logged in
    const loginLink = await page.$('text=Sign In');
    if (loginLink) {
      console.log('🔐 Logging in...');
      await loginLink.click();
      await page.waitForTimeout(2000);
      
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
        console.log('   ✅ Login submitted');
      }
    } else {
      console.log('✅ Already logged in');
    }
    
    console.log('\n📋 Ready to test extension:');
    console.log('1. Click the 🛒 HEB Auto-Cart icon in the toolbar');
    console.log('2. The extension should load weekly-plan.json automatically');
    console.log('3. Click "Start Adding Items" to begin automation\n');
    
    console.log('⏳ Keeping browser open for 60 seconds...');
    console.log('   (Close manually when done testing)\n');
    
    await page.waitForTimeout(60000);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await browser.close();
    console.log('✅ Test complete');
  }
})();
