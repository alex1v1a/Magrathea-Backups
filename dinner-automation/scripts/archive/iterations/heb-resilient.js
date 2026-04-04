const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

class HEBCartManager {
  constructor() {
    this.browser = null;
    this.page = null;
    this.items = [];
    this.results = { added: [], failed: [] };
    this.currentIndex = 0;
  }

  async loadItems() {
    try {
      const data = JSON.parse(fs.readFileSync(
        path.join(__dirname, '..', 'data', 'heb-extension-items.json'), 
        'utf8'
      ));
      this.items = data.items || [];
      console.log(`📦 Loaded ${this.items.length} items`);
    } catch (e) {
      console.error('❌ Failed to load items:', e.message);
      process.exit(1);
    }
  }

  async connect() {
    console.log('\n🔌 Connecting to Chrome...');
    try {
      this.browser = await chromium.connectOverCDP('http://localhost:9222');
      console.log('✅ Connected');
      
      // Get or create context
      let context = this.browser.contexts()[0];
      if (!context) {
        context = await this.browser.newContext();
      }
      
      // Get or create page
      this.page = context.pages().find(p => p.url().includes('heb.com'));
      if (!this.page) {
        this.page = await context.newPage();
        await this.page.goto('https://www.heb.com');
      }
      
      console.log(`📍 Page URL: ${this.page.url()}`);
      return true;
    } catch (err) {
      console.error('❌ Connection failed:', err.message);
      return false;
    }
  }

  async isLoggedIn() {
    try {
      return await this.page.evaluate(() => {
        return !!document.querySelector('[data-testid="account-menu"]') && 
               !document.querySelector('a[href*="/login"]');
      });
    } catch (e) {
      return false;
    }
  }

  async waitForLogin() {
    console.log('\n⏳ Waiting for login (2 min max)...');
    for (let i = 0; i < 24; i++) {
      await sleep(5000);
      
      // Check if still connected
      if (!this.browser || !this.page || this.page.isClosed()) {
        console.log('⚠️  Connection lost, reconnecting...');
        const connected = await this.connect();
        if (!connected) {
          console.log('❌ Reconnect failed, waiting...');
          continue;
        }
      }
      
      const loggedIn = await this.isLoggedIn();
      if (loggedIn) {
        console.log('✅ Logged in!');
        return true;
      }
      
      if ((i + 1) % 6 === 0) {
        console.log(`   Waiting... (${(i + 1) * 5}s)`);
      }
    }
    
    console.log('❌ Login timeout');
    return false;
  }

  async addItem(item) {
    const term = item.searchTerm || item.name;
    console.log(`\n[${this.currentIndex + 1}/${this.items.length}] ${item.name}`);
    
    try {
      // Navigate
      await this.page.goto(`https://www.heb.com/search?q=${encodeURIComponent(term)}`);
      await sleep(3000);
      
      // Click add button
      const button = this.page.locator('button[data-testid*="add-to-cart"]').first();
      if (await button.count() > 0) {
        await button.click({ force: true });
        await button.evaluate(el => el.style.outline = '4px solid lime');
        await sleep(2000);
        console.log('   ✅ Added');
        this.results.added.push(item.name);
        return true;
      } else {
        throw new Error('No add button found');
      }
    } catch (err) {
      console.log(`   ❌ Failed: ${err.message}`);
      this.results.failed.push({ name: item.name, error: err.message });
      return false;
    }
  }

  async run() {
    console.log('═══════════════════════════════════════');
    console.log('🛒  HEB Cart - Resilient Version');
    console.log('═══════════════════════════════════════\n');
    
    await this.loadItems();
    
    // Connect and verify login
    const connected = await this.connect();
    if (!connected) {
      console.log('❌ Could not connect to Chrome');
      return;
    }
    
    const loggedIn = await this.isLoggedIn();
    if (!loggedIn) {
      const loginSuccess = await this.waitForLogin();
      if (!loginSuccess) return;
    }
    
    // Add items with crash recovery
    for (this.currentIndex = 0; this.currentIndex < this.items.length; this.currentIndex++) {
      const item = this.items[this.currentIndex];
      
      // Check connection before each item
      if (!this.browser || !this.page || this.page.isClosed()) {
        console.log('\n⚠️  Connection lost, reconnecting...');
        const reconnected = await this.connect();
        if (!reconnected) {
          console.log('❌ Reconnect failed, skipping item');
          this.results.failed.push({ name: item.name, error: 'Connection lost' });
          continue;
        }
        
        // Verify still logged in after reconnect
        const stillLoggedIn = await this.isLoggedIn();
        if (!stillLoggedIn) {
          console.log('⚠️  Not logged in after reconnect, waiting...');
          const loginSuccess = await this.waitForLogin();
          if (!loginSuccess) return;
        }
      }
      
      await this.addItem(item);
    }
    
    // Summary
    console.log('\n═══════════════════════════════════════');
    console.log('📊  RESULTS');
    console.log('═══════════════════════════════════════');
    console.log(`✅ Added: ${this.results.added.length}/${this.items.length}`);
    console.log(`❌ Failed: ${this.results.failed.length}/${this.items.length}`);
    
    if (this.browser) {
      try {
        if (this.browser.disconnect) await this.browser.disconnect();
      } catch (e) {}
    }
    
    console.log('\n👋 Done!');
  }
}

// Run
const manager = new HEBCartManager();
manager.run().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
