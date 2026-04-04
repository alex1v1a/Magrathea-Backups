const { chromium } = require('playwright');
const { getBrowser, getPage, releaseBrowser } = require('./shared-chrome-connector');

/**
 * HEB Cart Monitor - Debug and fix automation issues
 * Watches automation and logs what's happening
 */

async function monitorHEB() {
  console.log('🔍 HEB Automation Monitor\n');
  
  const browser = await getBrowser();
  
  try {
    // Get all pages
    const contexts = browser.contexts();
    for (const context of contexts) {
      const pages = context.pages();
      for (const page of pages) {
        const url = page.url();
        console.log('Page found:', url);
        
        if (url.includes('heb.com')) {
          console.log('✅ Found HEB page, monitoring...');
          
          // Inject debug script
          await page.evaluate(() => {
            // Override console.log to capture
            const originalLog = console.log;
            window.hebDebugLogs = [];
            console.log = (...args) => {
              window.hebDebugLogs.push(args.join(' '));
              originalLog.apply(console, args);
            };
          });
          
          // Wait and check logs
          await new Promise(r => setTimeout(r, 5000));
          
          const logs = await page.evaluate(() => window.hebDebugLogs || []);
          console.log('\n📋 Captured logs:');
          logs.forEach(log => console.log('  ', log));
          
          // Check for search input
          const hasSearch = await page.evaluate(() => {
            const selectors = [
              'input[data-automation-id="searchInputBox"]',
              'input[placeholder*="Search" i]',
              'input[type="search"]'
            ];
            for (const sel of selectors) {
              if (document.querySelector(sel)) return sel;
            }
            return null;
          });
          console.log('\n🔍 Search input:', hasSearch || 'NOT FOUND');
          
          // Check for add buttons
          const addButtons = await page.evaluate(() => {
            const buttons = document.querySelectorAll('button');
            return Array.from(buttons)
              .filter(b => {
                const text = (b.textContent || '').toLowerCase();
                return text.includes('add') || text.includes('cart');
              })
              .map(b => ({
                text: b.textContent.trim().substring(0, 50),
                disabled: b.disabled,
                visible: b.offsetParent !== null,
                selector: b.getAttribute('data-automation-id') || b.getAttribute('data-testid') || 'no-id'
              }));
          });
          console.log('\n🛒 Add buttons found:', addButtons.length);
          addButtons.slice(0, 5).forEach((btn, i) => {
            console.log(`  ${i + 1}. "${btn.text}" | disabled: ${btn.disabled} | visible: ${btn.visible} | id: ${btn.selector}`);
          });
          
          // Take screenshot
          await page.screenshot({ path: 'heb-monitor-screenshot.png' });
          console.log('\n📸 Screenshot saved: heb-monitor-screenshot.png');
        }
      }
    }
    
    await releaseBrowser(browser);
    console.log('\n✅ Monitor complete');
    
  } catch (error) {
    console.error('❌ Monitor error:', error.message);
    await releaseBrowser(browser);
  }
}

monitorHEB().catch(console.error);
