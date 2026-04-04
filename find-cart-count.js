const { chromium } = require('playwright');

async function findCartCountMethod() {
  console.log('🔍 Finding cart count method...\n');
  
  try {
    const browser = await chromium.connectOverCDP('http://localhost:9222');
    const context = browser.contexts()[0] || await browser.newContext();
    const page = await context.newPage();
    
    // Go to cart page
    console.log('Navigating to cart page...');
    await page.goto('https://www.heb.com/cart', { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });
    await page.waitForTimeout(3000);
    
    // Method 1: Check for visible cart count element
    console.log('\n--- Method 1: Badge/Bubble element ---');
    const badges = await page.locator('[class*="badge"], [class*="count"], [data-testid*="cart-count"]').all();
    console.log(`Found ${badges.length} potential badge elements`);
    for (const badge of badges.slice(0, 3)) {
      const text = await badge.textContent().catch(() => 'none');
      const visible = await badge.isVisible().catch(() => false);
      console.log(`  Badge: "${text?.trim()}", visible: ${visible}`);
    }
    
    // Method 2: Check page title
    console.log('\n--- Method 2: Page title ---');
    const title = await page.title();
    console.log(`Title: ${title}`);
    
    // Method 3: Check for cart items count in heading
    console.log('\n--- Method 3: Cart heading ---');
    const headings = await page.locator('h1, h2').all();
    for (const h of headings) {
      const text = await h.textContent().catch(() => '');
      if (text.toLowerCase().includes('cart') || text.includes('item')) {
        console.log(`  Heading: "${text?.trim()}"`);
      }
    }
    
    // Method 4: Count cart item rows
    console.log('\n--- Method 4: Cart item rows ---');
    const itemRows = await page.locator('[data-testid*="cart-item"], [class*="cart-item"], tr[class*="item"]').all();
    console.log(`Found ${itemRows.length} cart item rows`);
    
    // Method 5: Check localStorage/sessionStorage for cart data
    console.log('\n--- Method 5: Browser storage ---');
    const localStorage = await page.evaluate(() => {
      const data = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key.toLowerCase().includes('cart') || key.toLowerCase().includes('heb')) {
          data[key] = localStorage.getItem(key);
        }
      }
      return data;
    });
    console.log('LocalStorage cart-related keys:', Object.keys(localStorage));
    
    // Method 6: Check cookies
    console.log('\n--- Method 6: Cookies ---');
    const cookies = await context.cookies();
    const cartCookies = cookies.filter(c => 
      c.name.toLowerCase().includes('cart') || 
      c.name.toLowerCase().includes('item')
    );
    console.log(`Cart-related cookies: ${cartCookies.map(c => c.name).join(', ')}`);
    
    // Method 7: Network intercept - check if there's an API call
    console.log('\n--- Method 7: Look for cart API endpoint ---');
    // This would require listening to network requests
    
    // Method 8: Check page HTML for data
    console.log('\n--- Method 8: Check for cart data in page HTML ---');
    const html = await page.content();
    const cartMatches = html.match(/cart.*count[:\s]*(\d+)/i) || 
                       html.match(/"cartCount["\']?\s*:\s*(\d+)/i) ||
                       html.match(/(\d+)\s*items?\s*in\s*your\s*cart/i);
    if (cartMatches) {
      console.log(`Found cart count in HTML: ${cartMatches[1]}`);
    } else {
      console.log('No cart count found in HTML');
    }
    
    // Method 9: Check the cart icon/badge in header
    console.log('\n--- Method 9: Header cart badge ---');
    await page.goto('https://www.heb.com/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    
    // Look for cart with badge
    const cartBadges = await page.locator('a[href*="cart"] [class*="badge"], a[data-testid*="cart"] [class*="badge"]').all();
    console.log(`Found ${cartBadges.length} cart badge elements`);
    for (const badge of cartBadges) {
      const text = await badge.textContent().catch(() => 'none');
      const visible = await badge.isVisible().catch(() => false);
      console.log(`  Cart badge: "${text?.trim()}", visible: ${visible}`);
    }
    
    await browser.close();
    console.log('\n✅ Cart count investigation complete');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

findCartCountMethod();
