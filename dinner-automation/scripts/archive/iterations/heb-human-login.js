const { chromium } = require('playwright');

const HEB_EMAIL = 'alex@1v1a.com';
const HEB_PASS = '$Tandal0ne';

// Human-like delay
const humanDelay = (min, max) => new Promise(r => setTimeout(r, min + Math.random() * (max - min)));

async function humanLikeLogin() {
  console.log('🛒 HEB Human-Like Login Attempt\n');
  
  const browser = await chromium.launch({
    headless: false,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    args: ['--start-maximized']
  });
  
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36'
  });
  
  const page = await context.newPage();
  
  // Go to HEB homepage first (not direct login)
  console.log('Step 1: Loading HEB homepage...');
  await page.goto('https://www.heb.com', { waitUntil: 'networkidle' });
  await humanDelay(2000, 4000);
  
  // Look for and click My Account
  console.log('Step 2: Clicking My Account...');
  
  // Try to find account button by various means
  const accountButton = await page.locator('button, a').filter({ hasText: /My account|Account|Log in|Sign in/i }).first();
  
  if (await accountButton.count() > 0) {
    await accountButton.click();
    console.log('Clicked account button');
  } else {
    // Try navigating directly
    await page.goto('https://accounts.heb.com/login');
  }
  
  await humanDelay(3000, 5000);
  
  // Take screenshot to see current state
  await page.screenshot({ path: 'heb-login-state.png' });
  console.log('Screenshot saved');
  
  // Try to find and fill email
  console.log('Step 3: Looking for email field...');
  
  // Get all input fields
  const inputs = await page.locator('input').all();
  console.log(`Found ${inputs.length} input fields`);
  
  for (let i = 0; i < inputs.length; i++) {
    const type = await inputs[i].getAttribute('type');
    const name = await inputs[i].getAttribute('name');
    const placeholder = await inputs[i].getAttribute('placeholder');
    console.log(`Input ${i}: type=${type}, name=${name}, placeholder=${placeholder}`);
  }
  
  // Try filling email with human-like typing
  const emailField = page.locator('input[type="email"], input[name="email"], input[name="username"]').first();
  if (await emailField.count() > 0) {
    console.log('Found email field, typing...');
    await emailField.click();
    await humanDelay(200, 500);
    
    // Type slowly like a human
    for (const char of HEB_EMAIL) {
      await emailField.type(char, { delay: 50 + Math.random() * 100 });
    }
    console.log('Email entered');
  }
  
  await humanDelay(1000, 2000);
  
  // Try to find and fill password
  const passField = page.locator('input[type="password"]').first();
  if (await passField.count() > 0) {
    console.log('Found password field, typing...');
    await passField.click();
    await humanDelay(200, 500);
    
    for (const char of HEB_PASS) {
      await passField.type(char, { delay: 50 + Math.random() * 100 });
    }
    console.log('Password entered');
  }
  
  await humanDelay(1000, 2000);
  
  // Try to find and click submit
  console.log('Step 4: Looking for submit button...');
  const submitBtn = page.locator('button[type="submit"], button:has-text("Log in"), button:has-text("Sign in"), button:has-text("Continue")').first();
  
  if (await submitBtn.count() > 0) {
    const btnText = await submitBtn.textContent();
    console.log(`Found button: "${btnText}"`);
    await submitBtn.click();
    console.log('Clicked submit');
  }
  
  await humanDelay(5000, 8000);
  
  // Check result
  const url = page.url();
  console.log(`\nCurrent URL: ${url}`);
  
  if (url.includes('heb.com') && !url.includes('login') && !url.includes('accounts')) {
    console.log('✅ Login appears successful!');
  } else {
    console.log('⚠️  Still on login page or redirect page');
    await page.screenshot({ path: 'heb-after-login-attempt.png' });
  }
  
  console.log('\nBrowser stays open. Check the window.');
}

humanLikeLogin().catch(err => {
  console.error('Error:', err.message);
});
