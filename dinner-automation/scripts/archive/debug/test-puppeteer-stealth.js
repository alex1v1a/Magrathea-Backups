const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

// Add stealth plugin
puppeteer.use(StealthPlugin());

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function testWithStealth() {
  console.log('Testing HEB with Puppeteer Stealth...\n');
  
  const browser = await puppeteer.launch({
    headless: false,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    args: ['--window-size=1920,1080']
  });
  
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });
  
  try {
    console.log('Going to HEB...');
    await page.goto('https://www.heb.com', { waitUntil: 'networkidle2' });
    await sleep(3000);
    
    // Check for blocking message
    const pageContent = await page.content();
    if (pageContent.includes('ad blocker') || pageContent.includes('firewall')) {
      console.log('❌ HEB is showing blocking message');
    } else {
      console.log('✅ Page loaded without blocking');
    }
    
    // Check login status
    const hasAccount = await page.$('[data-testid="account-menu"]') !== null;
    const hasSignIn = await page.$('a[href*="/login"]') !== null;
    console.log('Logged in:', hasAccount && !hasSignIn);
    
    // Test search
    console.log('\nTesting search...');
    await page.goto('https://www.heb.com/search?q=milk', { waitUntil: 'networkidle2' });
    await sleep(3000);
    
    // Look for buttons
    const buttons = await page.$$('button[data-testid*="add-to-cart"]');
    console.log(`Found ${buttons.length} buttons`);
    
    if (buttons.length > 0) {
      const testId = await buttons[0].evaluate(el => el.getAttribute('data-testid'));
      console.log('First button testid:', testId);
      
      // Try to click
      console.log('\nClicking first button...');
      await buttons[0].evaluate(el => el.scrollIntoView({ block: 'center' }));
      await sleep(500);
      await buttons[0].click();
      await buttons[0].evaluate(el => el.style.outline = '4px solid lime');
      console.log('✅ Clicked!');
      
      await sleep(3000);
    }
    
    console.log('\nKeeping browser open for 30 seconds...');
    await sleep(30000);
    
  } catch (err) {
    console.error('Error:', err.message);
  }
  
  await browser.close();
}

testWithStealth().catch(console.error);
