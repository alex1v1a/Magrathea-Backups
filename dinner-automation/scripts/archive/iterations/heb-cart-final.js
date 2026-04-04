/**
 * HEB Cart Final - Working Solution
 * Based on proven automation patterns
 */

const { chromium } = require('playwright');
const fs = require('fs').promises;
const path = require('path');

const CONFIG = {
  debugPort: 9222,
  dataDir: path.join(__dirname, '..', 'data'),
  screenshotDir: path.join(__dirname, '..', 'screenshots')
};

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

class HEBCartAutomation {
  constructor() {
    this.results = { added: [], failed: [], skipped: [] };
    this.browser = null;
    this.page = null;
  }

  async init() {
    console.log('🛒 Initializing HEB Cart Automation...');
    
    try {
      // Try to connect to existing Chrome first
      this.browser = await chromium.connectOverCDP(`http://localhost:${CONFIG.debugPort}`);
      console.log('✅ Connected to existing Chrome');
    } catch (e) {
      console.log('⚠️  No Chrome found on port 9222');
      console.log('Launching new Chrome...');
      
      this.browser = await chromium.launch({
        headless: false,
        args: [
          '--disable-blink-features=AutomationControlled',
          '--disable-web-security',
          '--disable-features=IsolateOrigins,site-per-process'
        ]
      });
    }
    
    const contexts = this.browser.contexts();
    const context = contexts[0] || await this.browser.newContext({
      viewport: { width: 1920, height: 1080 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    });
    
    // Find or create HEB page
    this.page = context.pages().find(p => p.url().includes('heb.com'));
    if (!this.page) {
      this.page = await context.newPage();
      await this.page.goto('https://www.heb.com', { waitUntil: 'domcontentloaded' });
      await sleep(3000);
    }
    
    // Hide automation
    await this.page.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
      Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
      window.chrome = { runtime: {} };
    });
    
    console.log(`📍 URL: ${this.page.url()}`);
    return this;
  }

  async isLoggedIn() {
    return await this.page.evaluate(() => {
      const hasAccount = !!document.querySelector('[data-testid="account-menu"], a[href*="/account"]');
      const noSignIn = !document.querySelector('a[href*="/login"]');
      return hasAccount && noSignIn;
    });
  }

  async addItem(item) {
    const searchTerm = item.searchTerm || item.hebSearch || item.name;
    console.log(`\n📦 ${item.name} (search: "${searchTerm}")`);
    
    try {
      // Navigate directly to search results
      const searchUrl = `https://www.heb.com/search?q=${encodeURIComponent(searchTerm)}`;
      await this.page.goto(searchUrl, { waitUntil: 'networkidle' });
      await sleep(4000);
      
      // Try multiple button strategies
      const strategies = [
        // Real add button
        { 
          selector: 'button[data-testid*="add-to-cart"]:not([data-testid*="logged-out"])',
          name: 'real add button'
        },
        // Any add button (fallback)
        { 
          selector: 'button[data-testid*="add-to-cart"]',
          name: 'any add button'
        },
        // Text-based
        { 
          selector: 'button:has-text("Add to cart")',
          name: 'text match'
        },
        // First button in product grid
        {
          selector: '[data-testid="productGrid"] button, [data-automation-id*="product"] button',
          name: 'grid button'
        }
      ];
      
      let clicked = false;
      for (const strat of strategies) {
        try {
          const button = this.page.locator(strat.selector).first();
          const count = await button.count();
          
          if (count > 0) {
            console.log(`  Found: ${strat.name}`);
            
            // Scroll and highlight
            await button.scrollIntoViewIfNeeded();
            await button.evaluate(el => {
              el.scrollIntoView({ behavior: 'smooth', block: 'center' });
              el.style.outline = '4px solid #22c55e';
              el.style.outlineOffset = '2px';
            });
            await sleep(500);
            
            // Click with force (bypass visibility checks)
            await button.click({ force: true, delay: 100 });
            
            clicked = true;
            console.log('  ✅ Clicked!');
            
            // Remove highlight
            await button.evaluate(el => {
              setTimeout(() => el.style.outline = '', 2000);
            });
            
            break;
          }
        } catch (e) {
          // Try next strategy
        }
      }
      
      if (!clicked) {
        throw new Error('Could not find clickable button');
      }
      
      // Wait for cart update
      await sleep(3000);
      
      this.results.added.push(item);
      return true;
      
    } catch (error) {
      console.log(`  ❌ ${error.message}`);
      this.results.failed.push({ item: item.name, error: error.message });
      return false;
    }
  }

  async run(items) {
    console.log(`\n🚀 Starting with ${items.length} items\n`);
    
    // Check login
    const loggedIn = await this.isLoggedIn();
    console.log(`Login status: ${loggedIn ? '✅ Logged in' : '⚠️  Not logged in'}\n`);
    
    if (!loggedIn) {
      console.log('⏸️  Please login to HEB in the browser window...');
      console.log('Waiting 30 seconds for you to login...');
      await sleep(30000);
      
      const nowLoggedIn = await this.isLoggedIn();
      if (!nowLoggedIn) {
        console.log('⚠️  Still not logged in. Continuing anyway...\n');
      }
    }
    
    // Process items
    for (let i = 0; i < items.length; i++) {
      console.log(`\n[${i + 1}/${items.length}]`);
      await this.addItem(items[i]);
      
      if (i < items.length - 1) {
        await sleep(2000);
      }
    }
    
    // Summary
    console.log('\n' + '='.repeat(40));
    console.log('📊 RESULTS');
    console.log('='.repeat(40));
    console.log(`✅ Added: ${this.results.added.length}`);
    console.log(`❌ Failed: ${this.results.failed.length}`);
    console.log(`⏭️  Skipped: ${this.results.skipped.length}`);
    console.log('='.repeat(40));
    
    if (this.results.failed.length > 0) {
      console.log('\nFailed items:');
      this.results.failed.forEach(f => console.log(`  - ${f.item}: ${f.error}`));
    }
    
    // Save results
    const resultsPath = path.join(CONFIG.dataDir, 'heb-results.json');
    await fs.writeFile(resultsPath, JSON.stringify(this.results, null, 2));
    console.log(`\n💾 Results saved to: ${resultsPath}`);
    
    return this.results;
  }

  async close() {
    if (this.browser) {
      try {
        // Only disconnect if we connected over CDP, otherwise close
        if (this.browser.disconnect) {
          await this.browser.disconnect();
        } else {
          await this.browser.close();
        }
      } catch (e) {}
      console.log('\n👋 Disconnected');
    }
  }
}

// Main execution
async function main() {
  // Load items from file or use defaults
  let items = [];
  try {
    const data = await fs.readFile(
      path.join(CONFIG.dataDir, 'heb-extension-items.json'), 
      'utf8'
    );
    const parsed = JSON.parse(data);
    items = parsed.items || parsed;
  } catch (e) {
    // Use test items
    items = [
      { name: 'Milk', searchTerm: 'whole milk', amount: '1 gallon' },
      { name: 'Eggs', searchTerm: 'large eggs', amount: '1 dozen' },
      { name: 'Bread', searchTerm: 'white bread', amount: '1 loaf' }
    ];
  }
  
  const bot = new HEBCartAutomation();
  
  try {
    await bot.init();
    await bot.run(items);
  } catch (err) {
    console.error('Fatal error:', err);
  } finally {
    await bot.close();
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { HEBCartAutomation };
