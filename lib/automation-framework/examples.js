/**
 * Automation Framework Examples
 * 
 * Demonstrates usage of the unified automation framework.
 */

const { 
  Framework, 
  HEBPlugin, 
  FacebookPlugin,
  JobPriority 
} = require('./index');

// ============================================
// Example 1: Basic HEB Cart Building
// ============================================
async function exampleBasicHEB() {
  console.log('=== Example 1: Basic HEB Cart Building ===\n');
  
  const framework = new Framework({
    profilesDir: './profiles',
    maxConcurrentJobs: 1
  });
  
  try {
    await framework.initialize();
    
    const heb = framework.createPlugin('heb', {
      profile: 'heb-example',
      headless: false,
      slowMo: 100
    });
    
    await heb.initialize();
    
    // Login
    const loginResult = await heb.login({
      email: process.env.HEB_EMAIL,
      password: process.env.HEB_PASSWORD
    });
    
    if (loginResult.needs2FA) {
      console.log('2FA required - waiting for code...');
      // In practice, you'd get this from email/SMS
      const code = '123456'; 
      await heb.complete2FA(code);
    }
    
    // Build cart
    const result = await heb.buildCart([
      { name: 'organic whole milk gallon', quantity: 1 },
      { name: 'sourdough bread', quantity: 2 },
      { name: 'organic eggs dozen', quantity: 1 }
    ]);
    
    console.log('Cart Results:');
    console.log(`  Items added: ${result.cart.count}`);
    console.log(`  Total: ${result.cart.total}`);
    console.log(`  Success rate: ${result.results.filter(r => r.success).length}/${result.results.length}`);
    
    await heb.shutdown();
    
  } finally {
    await framework.shutdown();
  }
}

// ============================================
// Example 2: Facebook Marketplace Search
// ============================================
async function exampleFacebookSearch() {
  console.log('=== Example 2: Facebook Marketplace Search ===\n');
  
  const framework = new Framework();
  
  try {
    await framework.initialize();
    
    const fb = framework.createPlugin('facebook', {
      profile: 'facebook-example',
      headless: false
    });
    
    await fb.initialize();
    
    // Search marketplace
    const search = await fb.searchMarketplace('vintage furniture', { limit: 10 });
    console.log(`Found ${search.count} listings for "vintage furniture"`);
    
    // Show first 5 results
    search.listings.slice(0, 5).forEach((item, i) => {
      console.log(`  ${i + 1}. ${item.title} - ${item.price || 'No price'}`);
    });
    
    // Apply price filter
    await fb.setPriceFilter(50, 200);
    console.log('Applied price filter: $50 - $200');
    
    await fb.shutdown();
    
  } finally {
    await framework.shutdown();
  }
}

// ============================================
// Example 3: Queued Job Processing
// ============================================
async function exampleQueuedJobs() {
  console.log('=== Example 3: Queued Job Processing ===\n');
  
  const framework = new Framework({
    maxConcurrentJobs: 2
  });
  
  try {
    await framework.initialize();
    
    // Queue multiple cart building jobs
    const jobs = [];
    
    jobs.push(framework.queueJob('heb:cart', {
      items: [
        { name: 'milk', quantity: 1 },
        { name: 'bread', quantity: 1 }
      ],
      credentials: {
        email: process.env.HEB_EMAIL,
        password: process.env.HEB_PASSWORD
      }
    }, { priority: JobPriority.HIGH }));
    
    jobs.push(framework.queueJob('facebook:search', {
      query: 'playstation 5',
      filters: { minPrice: 200, maxPrice: 500 }
    }, { priority: JobPriority.NORMAL }));
    
    console.log(`Queued ${jobs.length} jobs`);
    console.log('Job IDs:', jobs.map(j => j.id));
    
    // Wait for all jobs
    const results = await Promise.all(
      jobs.map(job => framework.waitForJob(job.id, 120000))
    );
    
    console.log('All jobs completed:');
    results.forEach((result, i) => {
      console.log(`  Job ${i + 1}:`, result);
    });
    
  } finally {
    await framework.shutdown();
  }
}

// ============================================
// Example 4: Direct Browser Pool Usage
// ============================================
async function exampleBrowserPool() {
  console.log('=== Example 4: Direct Browser Pool Usage ===\n');
  
  const { BrowserPool, AntiBot } = require('./index');
  
  const pool = new BrowserPool({
    maxInstances: 3,
    healthCheckInterval: 30000
  });
  
  try {
    await pool.initialize();
    
    // Acquire browser
    const browser = await pool.acquire('custom-profile', {
      headless: false,
      target: 'chrome'
    });
    
    console.log('Browser acquired:', browser.id);
    console.log('Metrics:', browser.getMetrics());
    
    // Use anti-bot
    const antiBot = new AntiBot();
    await antiBot.injectAntiDetection(browser.page);
    
    // Navigate and interact
    await browser.page.goto('https://example.com');
    await antiBot.pageLoadDelay();
    
    console.log('Page loaded:', await browser.page.title());
    
    // Release when done
    await pool.release(browser.id);
    
    console.log('Pool metrics:', pool.getMetrics());
    
  } finally {
    await pool.shutdown();
  }
}

// ============================================
// Example 5: Retry Manager
// ============================================
async function exampleRetryManager() {
  console.log('=== Example 5: Retry Manager ===\n');
  
  const { RetryManager } = require('./index');
  
  const retryManager = new RetryManager({
    maxRetries: 3,
    baseDelay: 1000,
    jitter: true
  });
  
  // Register custom policy
  retryManager.registerPolicy('flaky-operation', {
    maxRetries: 5,
    retryableErrors: ['timeout', 'network', 'ECONNRESET']
  });
  
  let attempts = 0;
  
  try {
    const result = await retryManager.execute('flaky-operation', async () => {
      attempts++;
      console.log(`  Attempt ${attempts}`);
      
      if (attempts < 3) {
        throw new Error('Simulated network error');
      }
      
      return 'Success!';
    });
    
    console.log('Result:', result);
    
  } catch (error) {
    console.log('Final error:', error.message);
  }
  
  console.log('Stats:', retryManager.getStats());
}

// ============================================
// Example 6: Creating Custom Plugin
// ============================================
async function exampleCustomPlugin() {
  console.log('=== Example 6: Custom Plugin ===\n');
  
  const { BasePlugin } = require('./index');
  
  // Define custom plugin
  class ExampleSitePlugin extends BasePlugin {
    constructor(options) {
      super({
        name: 'examplesite',
        baseUrl: 'https://httpbin.org',
        ...options
      });
    }
    
    async isLoggedIn() {
      // Example: check for auth token
      const cookies = await this.getCookies();
      return cookies.some(c => c.name === 'session');
    }
    
    async login(credentials) {
      await this.navigate('/forms/post');
      
      await this.antiBot.typeWithDelay(
        this.page,
        'input[name="custname"]',
        credentials.username
      );
      
      await this.antiBot.humanClick(this.page, 'button[type="submit"]');
      
      return { success: true };
    }
    
    async fetchData() {
      return this.retryManager.execute('examplesite:fetch', async () => {
        await this.navigate('/get');
        
        const data = await this.page.evaluate(() => ({
          url: window.location.href,
          title: document.title
        }));
        
        return data;
      });
    }
  }
  
  // Use the custom plugin
  const framework = new Framework();
  
  try {
    await framework.initialize();
    
    // Register custom plugin with framework
    const plugin = new ExampleSitePlugin({
      profile: 'example',
      headless: true
    });
    
    framework.plugins.set('examplesite', plugin);
    await plugin.initialize();
    
    const data = await plugin.fetchData();
    console.log('Fetched data:', data);
    
    await plugin.shutdown();
    
  } finally {
    await framework.shutdown();
  }
}

// ============================================
// Run examples
// ============================================
async function main() {
  const examples = {
    basicHEB: exampleBasicHEB,
    facebook: exampleFacebookSearch,
    queued: exampleQueuedJobs,
    browserPool: exampleBrowserPool,
    retryManager: exampleRetryManager,
    customPlugin: exampleCustomPlugin
  };
  
  const exampleName = process.argv[2];
  
  if (exampleName && examples[exampleName]) {
    await examples[exampleName]();
  } else {
    console.log('Available examples:');
    console.log('  node examples.js basicHEB');
    console.log('  node examples.js facebook');
    console.log('  node examples.js queued');
    console.log('  node examples.js browserPool');
    console.log('  node examples.js retryManager');
    console.log('  node examples.js customPlugin');
  }
}

main().catch(console.error);
