/**
 * HEB Auto-Cart v4.0 - Working Version
 * Uses reliable selectors and proper timing
 */

(function() {
  'use strict';
  
  console.log('🛒 HEB Auto-Cart v4.0 loaded');
  
  // Configuration
  const CONFIG = {
    delayBetweenItems: 4000,
    searchWaitTime: 5000,
    maxRetries: 3
  };
  
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  
  // Check if we're on HEB
  if (!location.href.includes('heb.com')) {
    console.log('Not on HEB.com, skipping');
    return;
  }
  
  // Listen for messages
  chrome.runtime.onMessage.addListener((msg, sender, reply) => {
    if (msg.action === 'startAutomation') {
      addItems(msg.items);
      reply({status: 'started'});
    }
    return true;
  });
  
  async function addItems(items) {
    console.log(`Starting to add ${items.length} items`);
    
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      console.log(`\n[${i+1}/${items.length}] Adding: ${item.name}`);
      
      try {
        // Search
        await search(item.searchTerm || item.name);
        
        // Click first add button
        await clickFirstAddButton();
        
        console.log('✅ Added successfully');
        
        // Wait before next item
        if (i < items.length - 1) {
          await sleep(CONFIG.delayBetweenItems);
        }
        
      } catch (err) {
        console.error(`❌ Failed: ${err.message}`);
      }
    }
    
    console.log('\n✅ All items processed');
  }
  
  async function search(term) {
    // Find search box
    const searchBox = document.querySelector('input[placeholder*="Search" i]');
    if (!searchBox) throw new Error('Search box not found');
    
    // Clear and type
    searchBox.value = term;
    searchBox.dispatchEvent(new Event('input', {bubbles: true}));
    
    // Submit
    searchBox.dispatchEvent(new KeyboardEvent('keydown', {key: 'Enter', bubbles: true}));
    
    // Wait for results
    await sleep(CONFIG.searchWaitTime);
  }
  
  async function clickFirstAddButton() {
    // Try multiple selectors
    const selectors = [
      'button[data-testid*="add-to-cart"]:not([data-testid*="logged-out"])',
      'button:has-text("Add to cart")',
      '[data-automation-id*="addToCart"]'
    ];
    
    for (const selector of selectors) {
      const btn = document.querySelector(selector);
      if (btn) {
        btn.scrollIntoView({block: 'center'});
        await sleep(500);
        btn.click();
        
        // Visual feedback
        btn.style.outline = '4px solid lime';
        setTimeout(() => btn.style.outline = '', 2000);
        
        await sleep(2000);
        return;
      }
    }
    
    throw new Error('Add button not found');
  }
  
  console.log('HEB Auto-Cart ready');
})();
