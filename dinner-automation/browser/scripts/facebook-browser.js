/**
 * Facebook Browser Automation
 * Automated Facebook Marketplace browsing and interactions
 */

const { AutomationBase } = require('../src/AutomationBase');
const { logger } = require('../src/StealthBrowser');

/**
 * Facebook Marketplace Automation Class
 */
class FacebookAutomation extends AutomationBase {
  constructor(options = {}) {
    super({
      name: 'facebook',
      profile: options.profile || 'facebook-profile',
      headless: options.headless !== false,
      slowMo: options.slowMo || 150,
      ...options
    });
    
    this.baseUrl = 'https://www.facebook.com';
    this.marketplaceUrl = 'https://www.facebook.com/marketplace';
    this.searchHistory = [];
    this.listings = [];
  }
  
  /**
   * Navigate to Facebook
   */
  async goToFacebook() {
    await this.safeNavigate(this.baseUrl);
    await this.browser.randomDelay(3000, 5000);
  }
  
  /**
   * Navigate to Marketplace
   */
  async goToMarketplace() {
    logger.info('Navigating to Facebook Marketplace');
    await this.safeNavigate(this.marketplaceUrl);
    await this.browser.randomDelay(3000, 5000);
    
    // Wait for marketplace to load
    await this.waitForElement('[data-pagelet="Marketplace"], [role="main"]', 15000);
    
    // Handle any initial prompts
    await this.handleInitialPrompts();
  }
  
  /**
   * Handle initial prompts (cookies, location, etc.)
   */
  async handleInitialPrompts() {
    // Accept cookies if presented
    try {
      const cookieButtonSelectors = [
        '[data-testid="cookie-policy-dialog-accept-button"]',
        'button:has-text("Allow")',
        'button:has-text("Accept")',
        'button:has-text("OK")',
        '[aria-label*="Accept"]'
      ];
      
      for (const selector of cookieButtonSelectors) {
        if (await this.browser.elementExists(selector)) {
          await this.browser.click(selector);
          logger.info('Accepted cookies/prompt');
          await this.browser.randomDelay(1000, 2000);
          break;
        }
      }
    } catch (error) {
      // Prompt may not appear, that's fine
    }
    
    // Handle location prompt
    try {
      const locationSelectors = [
        'button:has-text("Not Now")',
        'button:has-text("Dismiss")',
        '[aria-label*="Not Now"]'
      ];
      
      for (const selector of locationSelectors) {
        if (await this.browser.elementExists(selector)) {
          await this.browser.click(selector);
          logger.info('Dismissed location prompt');
          await this.browser.randomDelay(1000, 2000);
          break;
        }
      }
    } catch (error) {
      // Prompt may not appear
    }
  }
  
  /**
   * Search for items on Marketplace
   */
  async searchMarketplace(query, options = {}) {
    logger.info(`Searching Marketplace for: ${query}`);
    this.searchHistory.push({ query, timestamp: new Date().toISOString() });
    
    // Ensure we're on marketplace
    await this.goToMarketplace();
    
    // Find and use search box
    const searchSelectors = [
      '[data-testid="marketplace_search"]', 
      'input[placeholder*="Search"]', 
      'input[aria-label*="Search"]',
      '[role="search"] input'
    ];
    
    let searchInput = null;
    for (const selector of searchSelectors) {
      if (await this.browser.elementExists(selector)) {
        searchInput = selector;
        break;
      }
    }
    
    if (!searchInput) {
      // Try direct URL search
      await this.safeNavigate(`${this.marketplaceUrl}/search/?query=${encodeURIComponent(query)}`);
    } else {
      await this.browser.type(searchInput, query);
      await this.browser.randomDelay(1000, 2000);
      await this.browser.page.keyboard.press('Enter');
    }
    
    await this.browser.randomDelay(3000, 5000);
    await this.browser.waitForNetworkIdle();
    
    // Wait for results
    await this.waitForElement('[data-testid="marketplace_search_results"], [data-pagelet="BrowseResults"]', 15000);
    
    // Extract listings
    const listings = await this.extractListings();
    
    logger.info(`Found ${listings.length} listings`);
    return listings;
  }
  
  /**
   * Extract listing information from current page
   */
  async extractListings() {
    return await this.browser.evaluate(() => {
      const items = [];
      
      // Try multiple selectors for listing cards
      const selectors = [
        '[data-testid="marketplace_feed_item"]',
        '[role="article"]',
        '[data-pagelet="BrowseResults"] > div > div',
        'a[href*="/marketplace/item/"]'
      ];
      
      let cards = [];
      for (const sel of selectors) {
        cards = document.querySelectorAll(sel);
        if (cards.length > 0) break;
      }
      
      cards.forEach((card, index) => {
        if (index >= 20) return; // Limit to first 20
        
        // Try to find title
        const titleSelectors = ['span[dir="auto"]', 'h3', 'h4', 'a span', '.title'];
        let title = null;
        for (const sel of titleSelectors) {
          const el = card.querySelector(sel);
          if (el) {
            title = el.textContent.trim();
            if (title.length > 0 && title.length < 200) break;
          }
        }
        
        // Try to find price
        const priceEl = card.querySelector('span:contains("$")');
        const price = priceEl ? priceEl.textContent.trim() : null;
        
        // Get link
        const linkEl = card.tagName === 'A' ? card : card.querySelector('a');
        const url = linkEl ? linkEl.href : null;
        
        // Get image
        const imgEl = card.querySelector('img');
        const image = imgEl ? imgEl.src : null;
        
        // Get location
        const locationEl = card.querySelector('span:contains("miles")');
        const location = locationEl ? locationEl.textContent.trim() : null;
        
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
   * View a specific listing
   */
  async viewListing(urlOrIndex) {
    let url = urlOrIndex;
    
    // If index provided, get URL from stored listings
    if (typeof urlOrIndex === 'number') {
      if (this.listings[urlOrIndex]) {
        url = this.listings[urlOrIndex].url;
      } else {
        throw new Error(`Listing index ${urlOrIndex} not found`);
      }
    }
    
    logger.info(`Viewing listing: ${url}`);
    await this.safeNavigate(url);
    await this.browser.randomDelay(3000, 5000);
    
    // Extract listing details
    const details = await this.browser.evaluate(() => {
      const title = document.querySelector('h1, h2')?.textContent?.trim();
      const price = document.querySelector('span:contains("$")')?.textContent?.trim();
      const description = document.querySelector('[data-testid="marketplace_item_description"], div[dir="auto"]')?.textContent?.trim();
      const seller = document.querySelector('a[href*="/profile"], [role="link"] span')?.textContent?.trim();
      const location = document.querySelector('span:contains("·")')?.textContent?.trim();
      
      const images = Array.from(document.querySelectorAll('img'))
        .map(img => img.src)
        .filter(src => src && src.includes('fbcdn'));
      
      return { title, price, description, seller, location, images };
    });
    
    logger.info(`Viewed listing: ${details.title || 'Unknown'}`);
    return details;
  }
  
  /**
   * Send message to seller
   */
  async messageSeller(listingUrl, message = null) {
    logger.info(`Messaging seller for: ${listingUrl}`);
    
    // Navigate to listing if not already there
    const currentUrl = await this.getUrl();
    if (!currentUrl.includes(listingUrl)) {
      await this.viewListing(listingUrl);
    }
    
    // Find message button
    const messageSelectors = [
      'button:has-text("Message")',
      'button:has-text("Send Message")',
      '[aria-label*="Message"]',
      'a[href*="/messages/"]'
    ];
    
    let messageButton = null;
    for (const selector of messageSelectors) {
      if (await this.browser.elementExists(selector)) {
        messageButton = selector;
        break;
      }
    }
    
    if (!messageButton) {
      logger.error('Message button not found');
      return { success: false, error: 'Message button not found' };
    }
    
    await this.browser.click(messageButton);
    await this.browser.randomDelay(2000, 4000);
    
    // Check if message dialog opened
    const dialogSelectors = [
      '[role="dialog"]',
      '[data-testid="message_dialog"]',
      '.message-thread'
    ];
    
    let dialogOpen = false;
    for (const selector of dialogSelectors) {
      if (await this.browser.elementExists(selector)) {
        dialogOpen = true;
        break;
      }
    }
    
    if (!dialogOpen) {
      // Might have navigated to messages page
      await this.waitForElement('[data-testid="MWChatComposer"], textarea, input[placeholder*="message"]', 10000);
    }
    
    // Type message if provided
    if (message) {
      const inputSelectors = [
        'textarea',
        'input[placeholder*="message"]',
        '[contenteditable="true"]',
        '[data-testid="MWChatComposer"]'
      ];
      
      for (const selector of inputSelectors) {
        if (await this.browser.elementExists(selector)) {
          await this.browser.type(selector, message);
          await this.browser.randomDelay(1000, 2000);
          
          // Send message
          await this.browser.page.keyboard.press('Enter');
          logger.info('Message sent');
          
          return { success: true, message };
        }
      }
    }
    
    return { success: true, messageOpened: true };
  }
  
  /**
   * Browse by category
   */
  async browseCategory(category) {
    const categories = {
      vehicles: '/marketplace/vehicles/',
      property: '/marketplace/propertyrentals/',
      electronics: '/marketplace/electronics/',
      furniture: '/marketplace/furniture/',
      clothing: '/marketplace/apparel/',
      sports: '/marketplace/sports/',
      toys: '/marketplace/toys/',
      pet: '/marketplace/pet_supplies/'
    };
    
    const path = categories[category.toLowerCase()];
    if (!path) {
      throw new Error(`Unknown category: ${category}. Available: ${Object.keys(categories).join(', ')}`);
    }
    
    logger.info(`Browsing category: ${category}`);
    await this.safeNavigate(`${this.baseUrl}${path}`);
    await this.browser.randomDelay(3000, 5000);
    
    // Extract listings
    this.listings = await this.extractListings();
    
    return {
      category,
      listingsCount: this.listings.length,
      listings: this.listings.slice(0, 10)
    };
  }
  
  /**
   * Filter by location/distance
   */
  async setLocationFilter(location, radius = null) {
    logger.info(`Setting location filter: ${location}, radius: ${radius || 'default'}`);
    
    // Look for location filter
    const locationSelectors = [
      'button:has-text("Location")',
      'button:has-text("Austin")',
      '[aria-label*="Location"]'
    ];
    
    for (const selector of locationSelectors) {
      if (await this.browser.elementExists(selector)) {
        await this.browser.click(selector);
        await this.browser.randomDelay(2000, 3000);
        break;
      }
    }
    
    // Enter location
    const locationInput = 'input[placeholder*="city"], input[placeholder*="location"]';
    if (await this.browser.elementExists(locationInput)) {
      await this.browser.type(locationInput, location);
      await this.browser.randomDelay(1500, 2500);
      await this.browser.page.keyboard.press('Enter');
    }
    
    // Set radius if specified
    if (radius) {
      const radiusSelectors = [
        'button:has-text("miles")',
        'select',
        '[role="listbox"]'
      ];
      
      for (const selector of radiusSelectors) {
        if (await this.browser.elementExists(selector)) {
          await this.browser.click(selector);
          await this.browser.randomDelay(1000, 2000);
          
          // Select radius option
          await this.browser.click(`[role="option"]:has-text("${radius}"), option:contains("${radius}")`);
          break;
        }
      }
    }
    
    await this.browser.randomDelay(2000, 4000);
    
    // Refresh listings
    this.listings = await this.extractListings();
    
    return {
      location,
      radius,
      listingsCount: this.listings.length
    };
  }
  
  /**
   * Filter by price range
   */
  async setPriceFilter(min = null, max = null) {
    logger.info(`Setting price filter: ${min || 0} - ${max || 'any'}`);
    
    // Look for price filter
    const priceButton = 'button:has-text("Price")';
    if (await this.browser.elementExists(priceButton)) {
      await this.browser.click(priceButton);
      await this.browser.randomDelay(2000, 3000);
    }
    
    // Set min price
    if (min !== null) {
      const minInput = 'input[placeholder*="Min"], input[name="min"]';
      if (await this.browser.elementExists(minInput)) {
        await this.browser.type(minInput, min.toString());
      }
    }
    
    // Set max price
    if (max !== null) {
      const maxInput = 'input[placeholder*="Max"], input[name="max"]';
      if (await this.browser.elementExists(maxInput)) {
        await this.browser.type(maxInput, max.toString());
      }
    }
    
    // Apply filter
    const applyButton = 'button:has-text("Apply"), button:has-text("Done")';
    if (await this.browser.elementExists(applyButton)) {
      await this.browser.click(applyButton);
    }
    
    await this.browser.randomDelay(3000, 5000);
    
    // Refresh listings
    this.listings = await this.extractListings();
    
    return {
      minPrice: min,
      maxPrice: max,
      listingsCount: this.listings.length
    };
  }
  
  /**
   * Save listing for later
   */
  async saveListing(listingUrl) {
    logger.info(`Saving listing: ${listingUrl}`);
    
    await this.viewListing(listingUrl);
    
    const saveSelectors = [
      'button:has-text("Save")',
      '[aria-label*="Save"]',
      'button[aria-label*="bookmark"]'
    ];
    
    for (const selector of saveSelectors) {
      if (await this.browser.elementExists(selector)) {
        await this.browser.click(selector);
        logger.info('Listing saved');
        return { success: true };
      }
    }
    
    return { success: false, error: 'Save button not found' };
  }
  
  /**
   * Scroll and load more listings
   */
  async loadMoreListings(times = 3) {
    logger.info(`Loading more listings (${times} scrolls)`);
    
    for (let i = 0; i < times; i++) {
      await this.scroll({ direction: 'down', amount: 800 });
      await this.browser.randomDelay(2000, 4000);
    }
    
    // Extract updated listings
    this.listings = await this.extractListings();
    
    return {
      totalListings: this.listings.length,
      newListings: this.listings.slice(-10)
    };
  }
  
  /**
   * Get seller information
   */
  async getSellerInfo() {
    return await this.browser.evaluate(() => {
      const sellerEl = document.querySelector('a[href*="/profile"], [role="link"] h3, [role="link"] h4');
      const name = sellerEl?.textContent?.trim();
      
      const ratingEl = document.querySelector('span:contains("rating"), span:contains("★")');
      const rating = ratingEl?.textContent?.trim();
      
      const responseEl = document.querySelector('span:contains("Respond")');
      const responseTime = responseEl?.textContent?.trim();
      
      return { name, rating, responseTime };
    });
  }
  
  /**
   * Search with filters applied
   */
  async filteredSearch(query, filters = {}) {
    logger.info(`Starting filtered search: ${query}`, filters);
    
    // Basic search
    await this.searchMarketplace(query);
    
    // Apply location filter
    if (filters.location) {
      await this.setLocationFilter(filters.location, filters.radius);
    }
    
    // Apply price filter
    if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
      await this.setPriceFilter(filters.minPrice, filters.maxPrice);
    }
    
    // Load more if requested
    if (filters.loadMore) {
      await this.loadMoreListings(filters.loadMore);
    }
    
    // Sort if specified
    if (filters.sortBy) {
      await this.sortResults(filters.sortBy);
    }
    
    return {
      query,
      filters,
      resultsCount: this.listings.length,
      results: this.listings
    };
  }
  
  /**
   * Sort results
   */
  async sortResults(sortBy) {
    const sortOptions = {
      relevance: 'Relevance',
      recent: 'Date Listed: Newest First',
      priceLow: 'Price: Lowest First',
      priceHigh: 'Price: Highest First'
    };
    
    const sortText = sortOptions[sortBy];
    if (!sortText) {
      throw new Error(`Unknown sort option: ${sortBy}`);
    }
    
    // Open sort dropdown
    const sortButton = 'button:has-text("Sort by"), button:has-text("Sort")';
    if (await this.browser.elementExists(sortButton)) {
      await this.browser.click(sortButton);
      await this.browser.randomDelay(1000, 2000);
      
      // Select sort option
      await this.browser.click(`[role="option"]:has-text("${sortText}"), div:has-text("${sortText}")`);
      await this.browser.randomDelay(3000, 5000);
    }
  }
  
  /**
   * Get all saved listings
   */
  async getSavedListings() {
    logger.info('Getting saved listings');
    await this.safeNavigate(`${this.baseUrl}/marketplace/saved/`);
    await this.browser.randomDelay(3000, 5000);
    
    const saved = await this.extractListings();
    return saved;
  }
}

module.exports = { FacebookAutomation };

// If run directly, show usage
if (require.main === module) {
  console.log('Facebook Browser Automation');
  console.log('Usage:');
  console.log('  const { FacebookAutomation } = require("./facebook-browser");');
  console.log('  const fb = new FacebookAutomation({ headless: false });');
  console.log('  await fb.initialize();');
  console.log('  await fb.searchMarketplace("playstation 5");');
}
