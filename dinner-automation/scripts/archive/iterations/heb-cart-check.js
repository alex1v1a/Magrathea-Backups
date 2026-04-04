const { chromium } = require('playwright');

const EDGE_USER_DATA = 'C:\\Users\\Admin\\AppData\\Local\\Microsoft\\Edge\\User Data';

async function main() {
  console.log('🛒 Checking HEB Cart Status\n');
  
  const context = await chromium.launchPersistentContext(EDGE_USER_DATA, {
    headless: false,
    executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    args: ['--start-maximized'],
    viewport: { width: 1920, height: 1080 }
  });
  
  const page = context.pages()[0] || await context.newPage();
  
  try {
    // Check cart
    await page.goto('https://www.heb.com/cart');
    await page.waitForTimeout(5000);
    
    // Try to find cart items
    const cartItems = await page.locator('.cart-item, .cart-product, [data-testid*="cart-item"]').count();
    console.log(`📦 Items in cart: ${cartItems}`);
    
    // Get cart total
    const total = await page.locator('.cart-total, .order-total, [data-testid*="total"]').textContent().catch(() => 'N/A');
    console.log(`💰 Cart total: ${total}`);
    
    // Take screenshot
    await page.screenshot({ path: 'heb-cart-status.png' });
    console.log('\n📸 Screenshot saved: heb-cart-status.png');
    
    if (cartItems > 0) {
      console.log(`\n✅ SUCCESS! ${cartItems} items in cart`);
    } else {
      console.log('\n⚠️  Cart appears empty - may need to try again');
    }
    
    console.log('\n⏳ Browser staying open for review');
    await new Promise(() => {});
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

main().catch(console.error);
