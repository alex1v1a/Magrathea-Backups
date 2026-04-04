const { chromium } = require('playwright');

/**
 * Debug HEB Add to Cart - Test the selectors
 */

const DEBUG_PORT = 9222;

async function debugHEB() {
  console.log('🔍 Debugging HEB Add to Cart\n');
  
  try {
    // Connect to existing Chrome
    const browser = await chromium.connectOverCDP(`http://localhost:${DEBUG_PORT}`);
    console.log('✅ Connected to Chrome');
    
    // Get or create HEB page
    const contexts = browser.contexts();
    let page = null;
    
    for (const context of contexts) {
      const pages = context.pages();
      for (const p of pages) {
        const url = p.url();
        console.log('Found page:', url);
        if (url.includes('heb.com')) {
          page = p;
          break;
        }
      }
      if (page) break;
    }
    
    if (!page) {
      console.log('⚠️ No HEB page found. Creating new page...');
      const context = contexts[0] || await browser.newContext();
      page = await context.newPage();
      await page.goto('https://www.heb.com');
      await page.waitForTimeout(5000);
    }
    
    console.log('📍 Current URL:', page.url());
    
    // Check for search input
    console.log('\n🔍 Checking for search input...');
    const searchInfo = await page.evaluate(() => {
      const selectors = [
        'input[data-automation-id="searchInputBox"]',
        'input[placeholder*="Search" i]',
        'input[type="search"]',
        'input[name="q"]',
        'input[aria-label*="search" i]'
      ];
      
      for (const sel of selectors) {
        const el = document.querySelector(sel);
        if (el) {
          return {
            found: true,
            selector: sel,
            value: el.value,
            placeholder: el.placeholder,
            visible: el.offsetParent !== null
          };
        }
      }
      return { found: false };
    });
    
    console.log('Search input:', searchInfo);
    
    // Check for add to cart buttons
    console.log('\n🛒 Checking for Add to Cart buttons...');
    const buttonInfo = await page.evaluate(() => {
      const results = [];
      
      // Look for specific selectors
      const selectors = [
        'button[data-automation-id*="addToCart" i]',
        'button[data-testid*="add-to-cart" i]',
        'button[aria-label*="Add to Cart" i]'
      ];
      
      for (const sel of selectors) {
        const btns = document.querySelectorAll(sel);
        for (const btn of btns) {
          results.push({
            selector: sel,
            text: btn.textContent.trim(),
            disabled: btn.disabled,
            visible: btn.offsetParent !== null
          });
        }
      }
      
      // Also get all buttons with "add" or "cart" text
      const allButtons = document.querySelectorAll('button');
      for (const btn of allButtons) {
        const text = (btn.textContent || '').toLowerCase();
        if ((text.includes('add') || text.includes('cart')) && btn.offsetParent !== null) {
          // Avoid duplicates
          if (!results.find(r => r.text === btn.textContent.trim())) {
            results.push({
              selector: 'text-match',
              text: btn.textContent.trim(),
              disabled: btn.disabled,
              visible: true
            });
          }
        }
      }
      
      return results;
    });
    
    console.log(`Found ${buttonInfo.length} buttons:`);
    buttonInfo.slice(0, 10).forEach((btn, i) => {
      console.log(`  ${i + 1}. "${btn.text}" | selector: ${btn.selector} | disabled: ${btn.disabled} | visible: ${btn.visible}`);
    });
    
    // Test search
    if (searchInfo.found) {
      console.log('\n🧪 Testing search for "milk"...');
      
      await page.fill(searchInfo.selector, 'milk');
      await page.press(searchInfo.selector, 'Enter');
      await page.waitForTimeout(5000);
      
      // Check results
      const resultsInfo = await page.evaluate(() => {
        const products = document.querySelectorAll('[data-testid*="product"], [data-automation-id*="product"]');
        const buttons = document.querySelectorAll('button');
        
        return {
          productsFound: products.length,
          buttonsFound: buttons.length,
          pageTitle: document.title,
          url: window.location.href
        };
      });
      
      console.log('Search results:', resultsInfo);
      
      // Look for add buttons after search
      const afterSearchButtons = await page.evaluate(() => {
        const buttons = document.querySelectorAll('button');
        return Array.from(buttons)
          .filter(b => {
            const text = (b.textContent || '').toLowerCase();
            return (text.includes('add') || text.includes('cart')) && b.offsetParent !== null;
          })
          .map(b => ({
            text: b.textContent.trim(),
            disabled: b.disabled,
            dataAttr: b.getAttribute('data-automation-id') || b.getAttribute('data-testid') || 'none'
          }));
      });
      
      console.log(`\nButtons after search (${afterSearchButtons.length}):`);
      afterSearchButtons.slice(0, 5).forEach((btn, i) => {
        console.log(`  ${i + 1}. "${btn.text}" | data: ${btn.dataAttr} | disabled: ${btn.disabled}`);
      });
    }
    
    // Take screenshot
    await page.screenshot({ path: 'heb-debug-screenshot.png', fullPage: true });
    console.log('\n📸 Screenshot saved: heb-debug-screenshot.png');
    
    // Close browser connection (not Chrome)
    await browser.disconnect();
    console.log('\n✅ Debug complete');
    
  } catch (error) {
    console.error('❌ Debug error:', error.message);
    console.log(error.stack);
  }
}

debugHEB().catch(console.error);
