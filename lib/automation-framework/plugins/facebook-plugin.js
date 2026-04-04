/**
 * Facebook Plugin - Facebook/Messenger Automation
 * 
 * Implements Facebook-specific automation logic including:
 * - Marketplace search and browsing
 * - Message handling
 * - Post interactions
 * - Friend management
 */

const { BasePlugin } = require('./base-plugin');

/**
 * Facebook Plugin Configuration
 */
const FACEBOOK_CONFIG = {
  baseUrl: 'https://www.facebook.com',
  marketplaceUrl: 'https://www.facebook.com/marketplace',
  
  selectors: {
    // Login
    loginEmail: '#email, input[name="email"]',
    loginPassword: '#pass, input[name="pass"]',
    loginButton: 'button[name="login"], [data-testid="royal_login_button"]',
    
    // Session check
    navBar: '[data-testid="facebook-logo"], [role="navigation"]',
    
    // Marketplace
    marketplaceSearch: 'input[placeholder*="Search"], [role="search"] input',
    marketplaceResults: '[data-testid="marketplace_search_results"], [data-pagelet="BrowseResults"]',
    listingCard: '[data-testid="marketplace_feed_item"], [role="article"]',
    
    // Listing details
    listingTitle: 'h1, h2',
    listingPrice: 'span:contains("$")',
    listingDescription: '[data-testid="marketplace_item_description"]',
    listingSeller: 'a[href*="/profile"], [role="link"] span',
    listingLocation: 'span:contains("·")',
    
    // Messages
    messageButton: 'button:has-text("Message"), [aria-label*="Message"]',
    messageInput: '[data-testid="MWChatComposer"], textarea, [contenteditable="true"]',
    messageDialog: '[role="dialog"], [data-testid="message_dialog"]',
    
    // Filters
    priceFilterButton: 'button:has-text("Price")',
    locationFilterButton: 'button:has-text("Location")',
    filterInput: 'input[placeholder*="Min"], input[placeholder*="Max"]',
    applyFilterButton: 'button:has-text("Apply"), button:has-text("Done")',
    
    // Cookies/Prompts
    cookieAccept: '[data-testid="cookie-policy-dialog-accept-button"], button:has-text("Allow")',
    dismissPrompt: 'button:has-text("Not Now")'
  },
  
  categories: {
    vehicles: '/marketplace/vehicles/',
    property: '/marketplace/propertyrentals/',
    electronics: '/marketplace/electronics/',
    furniture: '/marketplace/furniture/',
    clothing: '/marketplace/apparel/',
    sports: '/marketplace/sports/',
    toys: '/marketplace/toys/',
    pet: '/marketplace/pet_supplies/',
    free: '/marketplace/free/'
  },
  
  retryPolicies: {
    search: { maxRetries: 3, baseDelay: 2000 },
    message: { maxRetries: 2, baseDelay: 1000 },
    browse: { maxRetries: 2, baseDelay: 1500 }
  }
};

class FacebookPlugin extends BasePlugin {
  constructor(options = {}) {
    super({
      name: 'facebook',
      baseUrl: FACEBOOK_CONFIG.baseUrl,
      ...options
    });
    
    this.config = FACEBOOK_CONFIG;
    this.listings = [];
    this.searchHistory = [];
    
    // Register retry policies
    for (const [operation, policy] of Object.entries(FACEBOOK_CONFIG.retryPolicies)) {
      this.retryManager.registerPolicy(`facebook:${operation}`, policy);
    }
  }

  /**
   * Check if user is logged in
   */
  async isLoggedIn() {
    return this.safeEvaluate((selector) => {
      return !!document.querySelector(selector);
    }, this.config.selectors.navBar);
  }

  /**
   * Login to Facebook
   */
  async login(credentials) {
    await this.navigate('/');
    await this.antiBot.pageLoadDelay();
    
    // Check if already logged in
    if (await this.isLoggedIn()) {
      this.logger.info('Already logged in to Facebook');
      return { success: true, alreadyLoggedIn: true };
    }
    
    // Fill login form
    await this.antiBot.typeWithDelay(
      this.page,
      this.config.selectors.loginEmail,
      credentials.email
    );
    
    await this.antiBot.typeWithDelay(
      this.page,
      this.config.selectors.loginPassword,
      credentials.password
    );
    
    await this.antiBot.humanClick(this.page, this.config.selectors.loginButton);
    await this.antiBot.sleep(5000, 8000);
    
    // Handle potential 2FA or checkpoints
    const url = await this.page.url();
    if (url.includes('checkpoint') || url.includes('two_factor')) {
      return { 
        success: false, 
        needs2FA: true, 
        message: '2FA or security checkpoint required' 
      };
    }
    
    // Handle initial prompts
    await this.handleInitialPrompts();
    
    const loggedIn = await this.isLoggedIn();
    return { success: loggedIn };
  }

  /**
   * Handle cookie/privacy prompts
   */
  async handleInitialPrompts() {
    // Accept cookies
    try {
      if (await this.elementExists(this.config.selectors.cookieAccept)) {
        await this.antiBot.humanClick(this.page, this.config.selectors.cookieAccept);
        await this.antiBot.sleep(1000, 2000);
      }
    } catch (e) {
      // May not appear
    }
    
    // Dismiss other prompts
    try {
      const dismissButtons = await this.page.$$(this.config.selectors.dismissPrompt);
      for (const btn of dismissButtons.slice(0, 3)) {
        await btn.click();
        await this.antiBot.sleep(500, 1000);
      }
    } catch (e) {
      // May not appear
    }
  }

  /**
   * Navigate to Marketplace
   */
  async goToMarketplace() {
    await this.navigate('/marketplace');
    await this.antiBot.pageLoadDelay();
    await this.handleInitialPrompts();
    
    return { success: true };
  }

  /**
   * Search Marketplace
   */
  async searchMarketplace(query, options = {}) {
    return this.retryManager.execute('facebook:search', async () => {
      this.searchHistory.push({ query, timestamp: new Date().toISOString() });
      
      // Ensure on marketplace
      await this.goToMarketplace();
      
      // Find search input
      const searchInput = this.config.selectors.marketplaceSearch;
      
      if (await this.elementExists(searchInput)) {
        await this.antiBot.typeWithDelay(this.page, searchInput, query);
        await this.page.keyboard.press('Enter');
      } else {
        // Fallback to URL search
        await this.navigate(`/marketplace/search/?query=${encodeURIComponent(query)}`);
      }
      
      await this.antiBot.sleep(3000, 5000);
      await this.waitForElement(this.config.selectors.marketplaceResults, 15000);
      
      // Extract listings
      this.listings = await this.extractListings();
      
      return {
        query,
        count: this.listings.length,
        listings: this.listings.slice(0, options.limit || 20)
      };
    });
  }

  /**
   * Extract listings from current page
   */
  async extractListings() {
    return this.page.evaluate(() => {
      const items = [];
      
      // Try multiple selectors for listing cards
      const selectors = [
        '[data-testid="marketplace_feed_item"]',
        '[role="article"]',
        'a[href*="/marketplace/item/"]'
      ];
      
      let cards = [];
      for (const sel of selectors) {
        cards = document.querySelectorAll(sel);
        if (cards.length > 0) break;
      }
      
      cards.forEach((card, index) => {
        if (index >= 50) return; // Limit to first 50
        
        // Find title
        const titleSelectors = ['span[dir="auto"]', 'h3', 'h4', 'a span'];
        let title = null;
        for (const sel of titleSelectors) {
          const el = card.querySelector(sel);
          if (el) {
            const text = el.textContent.trim();
            if (text.length > 0 && text.length < 200) {
              title = text;
              break;
            }
          }
        }
        
        // Get price
        const priceEl = Array.from(card.querySelectorAll('span'))
          .find(el => el.textContent.includes('$'));
        const price = priceEl?.textContent?.trim();
        
        // Get link
        const linkEl = card.tagName === 'A' ? card : card.querySelector('a');
        const url = linkEl?.href;
        
        // Get image
        const imgEl = card.querySelector('img');
        const image = imgEl?.src;
        
        // Get location
        const locationEl = Array.from(card.querySelectorAll('span'))
          .find(el => el.textContent.includes('miles') || el.textContent.includes('·'));
        const location = locationEl?.textContent?.trim();
        
        if (title && url) {
          items.push({
            title,
            price,
            url,
            image,
            location,
            index
          });
        }
      });
      
      return items;
    });
  }

  /**
   * Browse category
   */
  async browseCategory(category) {
    return this.retryManager.execute('facebook:browse', async () => {
      const path = this.config.categories[category.toLowerCase()];
      if (!path) {
        throw new Error(`Unknown category: ${category}`);
      }
      
      await this.navigate(path);
      await this.antiBot.pageLoadDelay();
      
      this.listings = await this.extractListings();
      
      return {
        category,
        count: this.listings.length,
        listings: this.listings.slice(0, 20)
      };
    });
  }

  /**
   * View specific listing
   */
  async viewListing(urlOrIndex) {
    let url = urlOrIndex;
    
    if (typeof urlOrIndex === 'number') {
      if (!this.listings[urlOrIndex]) {
        throw new Error(`Listing index ${urlOrIndex} not found`);
      }
      url = this.listings[urlOrIndex].url;
    }
    
    await this.navigate(url);
    await this.antiBot.pageLoadDelay();
    
    // Extract details
    const details = await this.page.evaluate((selectors) => {
      const title = document.querySelector('h1, h2')?.textContent?.trim();
      const price = Array.from(document.querySelectorAll('span'))
        .find(el => el.textContent.includes('$'))?.textContent?.trim();
      const description = document.querySelector('[dir="auto"]')?.textContent?.trim();
      const seller = document.querySelector('a[href*="/profile"] span')?.textContent?.trim();
      
      const images = Array.from(document.querySelectorAll('img'))
        .map(img => img.src)
        .filter(src => src && src.includes('fbcdn'));
      
      return { title, price, description, seller, images };
    }, this.config.selectors);
    
    return details;
  }

  /**
   * Apply price filter
   */
  async setPriceFilter(min = null, max = null) {
    const priceBtn = this.config.selectors.priceFilterButton;
    
    if (await this.elementExists(priceBtn)) {
      await this.antiBot.humanClick(this.page, priceBtn);
      await this.antiBot.sleep(2000, 3000);
      
      // Set min
      if (min !== null) {
        const minInput = 'input[placeholder*="Min"]"';
        if (await this.elementExists(minInput)) {
          await this.antiBot.typeWithDelay(this.page, minInput, min.toString());
        }
      }
      
      // Set max
      if (max !== null) {
        const maxInput = 'input[placeholder*="Max"]"';
        if (await this.elementExists(maxInput)) {
          await this.antiBot.typeWithDelay(this.page, maxInput, max.toString());
        }
      }
      
      // Apply
      await this.antiBot.humanClick(this.page, this.config.selectors.applyFilterButton);
      await this.antiBot.sleep(3000, 5000);
      
      // Refresh listings
      this.listings = await this.extractListings();
    }
    
    return {
      minPrice: min,
      maxPrice: max,
      count: this.listings.length
    };
  }

  /**
   * Send message to seller
   */
  async messageSeller(listingUrl, message) {
    return this.retryManager.execute('facebook:message', async () => {
      // Navigate to listing if needed
      const currentUrl = await this.page.url();
      if (!currentUrl.includes(listingUrl)) {
        await this.viewListing(listingUrl);
      }
      
      // Find and click message button
      const msgBtn = this.config.selectors.messageButton;
      if (!await this.elementExists(msgBtn)) {
        throw new Error('Message button not found');
      }
      
      await this.antiBot.humanClick(this.page, msgBtn);
      await this.antiBot.sleep(2000, 4000);
      
      // Type message if provided
      if (message) {
        const inputSelectors = [
          this.config.selectors.messageInput,
          'textarea',
          '[contenteditable="true"]'
        ];
        
        for (const selector of inputSelectors) {
          if (await this.elementExists(selector)) {
            await this.antiBot.typeWithDelay(this.page, selector, message);
            await this.page.keyboard.press('Enter');
            break;
          }
        }
      }
      
      return { success: true, messageSent: !!message };
    });
  }

  /**
   * Load more listings by scrolling
   */
  async loadMore(times = 3) {
    for (let i = 0; i < times; i++) {
      await this.antiBot.humanScroll(this.page, { 
        direction: 'down', 
        amount: 800 
      });
      await this.antiBot.sleep(2000, 3000);
    }
    
    this.listings = await this.extractListings();
    
    return {
      total: this.listings.length,
      loaded: this.listings.slice(-10)
    };
  }

  /**
   * Get seller information
   */
  async getSellerInfo() {
    return this.page.evaluate(() => {
      const sellerEl = document.querySelector('a[href*="/profile"] h3, a[href*="/profile"] h4');
      const name = sellerEl?.textContent?.trim();
      
      const ratingEl = Array.from(document.querySelectorAll('span'))
        .find(el => el.textContent.includes('rating') || el.textContent.includes('★'));
      const rating = ratingEl?.textContent?.trim();
      
      return { name, rating };
    });
  }

  /**
   * Save listing
   */
  async saveListing(listingUrl) {
    await this.viewListing(listingUrl);
    
    const saveSelectors = [
      'button:has-text("Save")',
      '[aria-label*="Save"]',
      'button[aria-label*="bookmark"]'
    ];
    
    for (const selector of saveSelectors) {
      if (await this.elementExists(selector)) {
        await this.antiBot.humanClick(this.page, selector);
        return { success: true };
      }
    }
    
    return { success: false, error: 'Save button not found' };
  }

  /**
   * Get saved listings
   */
  async getSavedListings() {
    await this.navigate('/marketplace/saved/');
    await this.antiBot.pageLoadDelay();
    
    return this.extractListings();
  }

  /**
   * Filtered search with multiple criteria
   */
  async filteredSearch(query, filters = {}) {
    await this.searchMarketplace(query);
    
    if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
      await this.setPriceFilter(filters.minPrice, filters.maxPrice);
    }
    
    if (filters.category) {
      await this.browseCategory(filters.category);
    }
    
    if (filters.loadMore) {
      await this.loadMore(filters.loadMore);
    }
    
    return {
      query,
      filters,
      count: this.listings.length,
      listings: this.listings
    };
  }
}

module.exports = { FacebookPlugin, FACEBOOK_CONFIG };
