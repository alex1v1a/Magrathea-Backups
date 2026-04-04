/**
 * Facebook Session Restore
 * Attempts to re-establish Facebook login in shared Edge
 */
const { chromium } = require('playwright');

const FB_EMAIL = 'alex@xspqr.com';
const FB_PASSWORD = 'section9';

async function restoreSession() {
  console.log('🔧 Facebook Session Restore\n');
  
  let browser;
  try {
    browser = await chromium.connectOverCDP('http://localhost:9222');
    console.log('✅ Connected to Edge\n');
  } catch (e) {
    console.log('❌ Edge not running. Starting...');
    return { status: 'edge_not_running' };
  }
  
  const context = browser.contexts()[0];
  let page = context.pages().find(p => p.url().includes('facebook.com'));
  
  if (!page) {
    page = await context.newPage();
  }
  
  // Check current state
  console.log('🔍 Checking Facebook state...');
  await page.goto('https://www.facebook.com/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);
  
  const url = page.url();
  
  if (!url.includes('login')) {
    console.log('✅ Already logged in!');
    await page.close();
    await browser.close();
    return { status: 'already_logged_in' };
  }
  
  console.log('⚠️  Login required. Attempting auto-login...\n');
  
  // Try to login
  try {
    await page.fill('input[name="email"]', FB_EMAIL);
    await page.fill('input[name="pass"]', FB_PASSWORD);
    await page.click('button[name="login"]');
    
    await page.waitForTimeout(5000);
    
    // Check result
    const newUrl = page.url();
    if (!newUrl.includes('login')) {
      console.log('✅ Login successful!');
      
      // Navigate to Marketplace to confirm
      await page.goto('https://www.facebook.com/marketplace', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(3000);
      
      const mpUrl = page.url();
      if (mpUrl.includes('marketplace')) {
        console.log('✅ Marketplace accessible');
        
        // Screenshot for verification
        await page.screenshot({ path: 'dinner-automation/data/fb-session-restored.png' });
        console.log('📸 Screenshot saved');
        
        await page.close();
        await browser.close();
        return { status: 'login_success' };
      }
    }
    
    console.log('⚠️  Login may require 2FA or manual verification');
    await page.screenshot({ path: 'dinner-automation/data/fb-login-needed.png' });
    
    await page.close();
    await browser.close();
    return { status: 'manual_intervention_needed' };
    
  } catch (error) {
    console.error('❌ Login error:', error.message);
    await page.close();
    await browser.close();
    return { status: 'error', error: error.message };
  }
}

restoreSession().then(result => {
  console.log('\n═══════════════════════════════════');
  console.log('Result:', result.status);
  console.log('═══════════════════════════════════');
}).catch(err => {
  console.error('Fatal error:', err);
});
