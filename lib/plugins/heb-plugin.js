/**
 * HEB Plugin - H-E-B Grocery Automation
 * Built on unified automation framework
 */

const { AutomationTask } = require('../automation-task');
const { gaussianDelay, humanLikeScroll, sessionWarmup } = require('../anti-bot-advanced');
const config = require('../config');

class HEBPlugin extends AutomationTask {
  constructor(options = {}) {
    super({
      name: 'HEBCart',
      site: 'heb',
      ...options
    });
    
    this.hebConfig = config.get('heb');
    this.cartCount = 0;
    this.addedItems = [];
    this.failedItems = [];
  }
  
  async run() {
    const items = await this.loadItems();
    this.logger.info(`Loaded ${items.length} items to add`);
    
    const browser = await this.getBrowser();
    
    try {
      const context = browser.contexts()[0];
      const page = context.pages().find(p => p.url().includes('heb.com')) || await context.newPage();
      
      // Session warmup
      await sessionWarmup(page, { url: this.hebConfig.baseUrl });
      
      // Verify login
      if (!await this.verifyLogin(page)) {
        throw new Error('Not logged into HEB');
      }
      
      // Get initial cart count
      this.cartCount = await this.getCartCount(page);
      this.logger.info(`Initial cart count: ${this.cartCount}`);
      
      // Process items with verification
      for (const item of items) {
        await this.addItemWithVerification(page, item);
      }
      
      // Final summary
      this.logger.info('Cart update complete', {
        initial: this.cartCount,
        final: await this.getCartCount(page),
        added: this.addedItems.length,
        failed: this.failedItems.length
      });
      
    } finally {
      this.releaseBrowser(browser);
    }
  }
  
  async loadItems() {
    const fs = require('fs').promises;
    const path = require('path');
    
    try {
      const data = await fs.readFile(
        path.join(__dirname, '..', '..', 'dinner-automation', 'data', 'heb-extension-items.json'),
        'utf8'
      );
      const parsed = JSON.parse(data);
      
      const items = [];
      const categories = ['proteins', 'produce', 'pantry', 'grainsAndBread'];
      
      for (const category of categories) {
        if (parsed.shoppingList?.[category]) {
          for (const item of parsed.shoppingList[category]) {
            items.push({
              name: item.item,
              searchTerm: item.searchTerms?.[0] || item.item,
              quantity: item.quantity,
              for: item.for,
              category
            });
          }
        }
      }
      
      return items;
    } catch (e) {
      this.logger.error('Failed to load items', { error: e.message });
      return [];
    }
  }
  
  async verifyLogin(page) {
    return await page.evaluate(() => {
      return !!document.querySelector('a[href*="/my-account"]') ||
             !!document.querySelector('[data-testid="account-menu"]');
    });
  }
  
  async getCartCount(page) {
    try {
      return await page.evaluate((selector) => {
        const cartLink = document.querySelector(selector);
        if (cartLink) {
          const ariaLabel = cartLink.getAttribute('aria-label');
          if (ariaLabel) {
            const match = ariaLabel.match(/(\d+)\s+items?\s+in\s+your\s+cart/i);
            if (match) return parseInt(match[1]);
          }
        }
        return 0;
      }, this.hebConfig.selectors.cartLink);
    } catch (e) {
      return 0;
    }
  }
  
  async addItemWithVerification(page, item) {
    const countBefore = await this.getCartCount(page);
    
    try {
      // Search for item
      await page.goto(`${this.hebConfig.baseUrl}/search?q=${encodeURIComponent(item.searchTerm)}`, {
        waitUntil: 'domcontentloaded'
      });
      
      await gaussianDelay(4000, 1500);
      await humanLikeScroll(page, { minAmount: 200, maxAmount: 400 });
      
      // Find and click add button
      const button = await this.findAddButton(page);
      
      if (!button) {
        throw new Error('Add button not found');
      }
      
      await button.scrollIntoViewIfNeeded();
      await gaussianDelay(1000, 500);
      
      await button.click({ delay: Math.random() * 200 + 100 });
      
      // Verify cart increased
      await this.verifyCartIncrease(page, countBefore, item);
      
      this.addedItems.push(item.name);
      this.logger.info(`✅ Added: ${item.name}`);
      
    } catch (error) {
      this.failedItems.push({ name: item.name, error: error.message });
      this.logger.error(`❌ Failed: ${item.name}`, { error: error.message });
    }
    
    // Anti-bot delay
    await gaussianDelay(this.config.antiBot.minDelay, this.config.antiBot.maxDelay);
  }
  
  async findAddButton(page) {
    const strategies = [
      { selector: 'button[data-qe-id="addToCart"]', name: 'data-qe-id' },
      { selector: 'button:has-text("Add to cart")', name: 'text' },
      { selector: 'button[aria-label*="cart" i]', name: 'aria-label' }
    ];
    
    for (const strategy of strategies) {
      try {
        const btn = page.locator(strategy.selector).first();
        if (await btn.count() > 0 && await btn.isVisible()) {
          this.logger.debug(`Found button using ${strategy.name}`);
          return btn;
        }
      } catch (e) {}
    }
    
    return null;
  }
  
  async verifyCartIncrease(page, before, item, maxRetries = 3) {
    for (let i = 0; i < maxRetries; i++) {
      await gaussianDelay(2000, 1000);
      const after = await this.getCartCount(page);
      
      if (after > before) {
        this.cartCount = after;
        return true;
      }
      
      this.logger.debug(`Verification retry ${i + 1}`, { before, after });
    }
    
    throw new Error('Cart verification failed - item may not have been added');
  }
  
  getResults() {
    return {
      added: this.addedItems,
      failed: this.failedItems,
      cartCount: this.cartCount
    };
  }
}

module.exports = { HEBPlugin };

// CLI usage
if (require.main === module) {
  const plugin = new HEBPlugin();
  plugin.execute().then(result => {
    console.log('\n📊 Results:', result);
    process.exit(0);
  }).catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
}
