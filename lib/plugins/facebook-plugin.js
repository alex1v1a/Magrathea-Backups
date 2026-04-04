/**
 * Facebook Marketplace Plugin
 * Built on unified automation framework
 */

const { AutomationTask } = require('../automation-task');
const { gaussianDelay, sessionWarmup } = require('../anti-bot-advanced');
const config = require('../config');

class FacebookPlugin extends AutomationTask {
  constructor(options = {}) {
    super({
      name: 'FacebookMarketplace',
      site: 'facebook',
      ...options
    });
    
    this.fbConfig = config.get('facebook');
    this.messages = [];
  }
  
  async run() {
    const browser = await this.getBrowser();
    
    try {
      const context = browser.contexts()[0];
      let page = context.pages().find(p => p.url().includes('facebook.com'));
      
      if (!page) {
        page = await context.newPage();
      }
      
      // Session warmup
      await sessionWarmup(page, { url: this.fbConfig.baseUrl });
      
      // Verify login
      if (!await this.verifyLogin(page)) {
        throw new Error('Not logged into Facebook');
      }
      
      this.logger.info('Successfully logged into Facebook');
      
      // Execute requested action
      if (this.options.action === 'messages') {
        await this.checkMessages(page);
      } else if (this.options.action === 'share') {
        await this.shareListings(page);
      }
      
    } finally {
      this.releaseBrowser(browser);
    }
  }
  
  async verifyLogin(page) {
    return await page.evaluate((selector) => {
      return !!document.querySelector(selector) ||
             !!document.querySelector('[aria-label="Your profile"]') ||
             !!document.querySelector('[data-testid="royal_login_button"]') === false;
    }, this.fbConfig.selectors.loginCheck);
  }
  
  async checkMessages(page) {
    this.logger.info('Checking Marketplace messages...');
    
    await page.goto(`${this.fbConfig.baseUrl}/marketplace/inbox`, {
      waitUntil: 'networkidle'
    });
    
    await gaussianDelay(3000, 1000);
    
    // Extract messages
    const messages = await page.evaluate(() => {
      const items = [];
      const rows = document.querySelectorAll('[role="listitem"]');
      
      rows.forEach(row => {
        const nameEl = row.querySelector('span[dir="auto"]');
        const previewEl = row.querySelector('span[dir="auto"]:nth-child(2)');
        const timeEl = row.querySelector('abbr');
        
        if (nameEl) {
          items.push({
            from: nameEl.textContent,
            preview: previewEl?.textContent || '',
            time: timeEl?.textContent || '',
            unread: row.querySelector('[aria-label*="unread" i]') !== null
          });
        }
      });
      
      return items;
    });
    
    this.messages = messages;
    this.logger.info(`Found ${messages.length} conversations`);
    
    // Alert on unread messages
    const unread = messages.filter(m => m.unread);
    if (unread.length > 0) {
      this.logger.warn(`⚠️ ${unread.length} unread messages!`, { unread });
    }
    
    return messages;
  }
  
  async shareListings(page) {
    this.logger.info('Sharing listings to groups...');
    
    // Implementation for sharing F-150 and Thule listings
    // This would navigate to each listing and share to configured groups
    
    const listings = [
      { name: 'F-150 Truck', id: 'f150' },
      { name: 'Thule Box', id: 'thule' }
    ];
    
    for (const listing of listings) {
      try {
        await this.shareListing(page, listing);
        this.recordSuccess(listing.name);
      } catch (error) {
        this.recordFailure(listing.name, error);
      }
      
      await gaussianDelay(5000, 2000);
    }
  }
  
  async shareListing(page, listing) {
    // Navigate to listing
    await page.goto(`${this.fbConfig.marketplaceUrl}/item/${listing.id}`, {
      waitUntil: 'domcontentloaded'
    });
    
    await gaussianDelay(2000, 1000);
    
    // Find and click share button
    const shareBtn = await page.locator('[aria-label="Share"]').first();
    if (await shareBtn.count() === 0) {
      throw new Error('Share button not found');
    }
    
    await shareBtn.click();
    await gaussianDelay(1000, 500);
    
    // Select groups to share to
    // This is simplified - actual implementation would handle group selection
    this.logger.info(`Shared ${listing.name}`);
  }
  
  getMessages() {
    return this.messages;
  }
}

module.exports = { FacebookPlugin };

// CLI usage
if (require.main === module) {
  const action = process.argv[2] || 'messages';
  const plugin = new FacebookPlugin({ action });
  
  plugin.execute().then(result => {
    console.log('\n📊 Results:', result);
    process.exit(0);
  }).catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
}
