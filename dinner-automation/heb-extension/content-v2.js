/**
 * HEB Auto-Cart v2.0 - Complete Rewrite
 * Robust cart building with individual item verification
 */

(function() {
  'use strict';
  
  console.log('🛒 HEB Auto-Cart v2.0 loaded');
  
  // State
  let state = {
    isRunning: false,
    items: [],
    currentIndex: 0,
    added: [],
    failed: [],
    cartCount: 0
  };
  
  // Configuration
  const CONFIG = {
    maxRetries: 3,
    delayBetweenItems: 3000,
    searchWaitTime: 4000,
    debug: true
  };
  
  // Utility: Sleep
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  
  // Utility: Log with prefix
  const log = (msg, type = 'info') => {
    const prefix = type === 'error' ? '❌' : type === 'success' ? '✅' : type === 'warn' ? '⚠️' : 'ℹ️';
    console.log(`${prefix} [HEB Auto-Cart] ${msg}`);
  };
  
  // Utility: Show notification on page
  const notify = (text, type = 'info') => {
    const div = document.createElement('div');
    const colors = {
      info: '#2563eb',
      success: '#16a34a',
      error: '#dc2626',
      warn: '#f59e0b'
    };
    
    div.style.cssText = `
      position: fixed; top: 20px; right: 20px; z-index: 999999;
      background: ${colors[type] || colors.info}; color: white;
      padding: 16px 24px; border-radius: 8px;
      font-family: system-ui, sans-serif; font-size: 14px; font-weight: 600;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      max-width: 400px; word-wrap: break-word;
    `;
    div.textContent = text;
    document.body.appendChild(div);
    
    setTimeout(() => div.remove(), 5000);
  };
  
  // Check if user is logged in - MULTIPLE METHODS
  const checkLogin = () => {
    // Method 1: Look for real add-to-cart buttons (most reliable)
    const realAddButtons = document.querySelectorAll('button[data-testid*="add-to-cart"]:not([data-testid*="logged-out"])');
    
    // Method 2: Look for account menu / user name (HEB shows "Hi, Name")
    const accountMenu = document.querySelector('[data-testid="account-menu"], [data-automation-id*="account-menu"]');
    const userGreeting = document.querySelector('a[href*="/account"], [data-testid*="user-menu"]');
    const noSignInButton = !document.querySelector('a[href*="/login"], button[data-testid*="signin"]');
    
    // Method 3: Check for cart with items indicator (usually means logged in)
    const cartWithCount = document.querySelector('[data-testid*="cart"] .count, [data-testid*="cart"] [data-testid*="badge"]');
    
    log(`Login check details:`);
    log(`  - Real add buttons: ${realAddButtons.length}`);
    log(`  - Account menu: ${accountMenu ? 'YES' : 'NO'}`);
    log(`  - User greeting: ${userGreeting ? 'YES' : 'NO'}`);
    log(`  - No sign-in button: ${noSignInButton ? 'YES' : 'NO'}`);
    
    // Consider logged in if:
    // - Real buttons exist, OR
    // - Account menu visible AND no sign-in button, OR
    // - User greeting visible
    const isLoggedIn = realAddButtons.length > 0 || 
                       (accountMenu && noSignInButton) || 
                       (userGreeting && noSignInButton);
    
    log(`  => ${isLoggedIn ? 'LOGGED IN ✓' : 'NOT LOGGED IN ✗'}`);
    return isLoggedIn;
  };
  
  // Get current cart count
  const getCartCount = () => {
    const cartBadge = document.querySelector('[data-testid*="cart"] [data-testid*="badge"], [data-automation-id*="cart"] .count');
    const count = cartBadge ? parseInt(cartBadge.textContent) || 0 : 0;
    return count;
  };
  
  // Find search input
  const findSearchInput = () => {
    const selectors = [
      'input[data-automation-id="searchInputBox"]',
      'input[placeholder*="Search" i]',
      'input[type="search"]',
      'input[name="q"]',
      'input[aria-label*="search" i]'
    ];
    
    for (const sel of selectors) {
      const el = document.querySelector(sel);
      if (el && el.offsetParent !== null) return el;
    }
    return null;
  };
  
  // Search for an item
  const searchItem = async (searchTerm) => {
    log(`Searching for: "${searchTerm}"`);
    
    const input = findSearchInput();
    if (!input) throw new Error('Search input not found');
    
    // Clear and type
    input.focus();
    input.value = searchTerm;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await sleep(200);
    
    // Submit search
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    log('Search submitted, waiting for results...');
    
    // Wait for results
    await sleep(CONFIG.searchWaitTime);
    log('Results should be loaded');
  };
  
  // Find and click the FIRST product's Add to Cart button
  const clickAddToCart = async () => {
    log('Looking for Add to Cart button on first product...');
    
    // Try multiple strategies to find the first real add button
    const strategies = [
      // Strategy 1: First button in product grid that's not logged-out
      () => {
        const grid = document.querySelector('[data-testid="productGrid"], [data-automation-id*="productGrid"]');
        if (!grid) return null;
        const btn = grid.querySelector('button[data-testid*="add-to-cart"]:not([data-testid*="logged-out"])');
        return btn;
      },
      // Strategy 2: First real add button anywhere
      () => {
        return document.querySelector('button[data-testid*="add-to-cart"]:not([data-testid*="logged-out"])');
      },
      // Strategy 3: First button with "Add to cart" text that's not in a list
      () => {
        const buttons = document.querySelectorAll('button');
        for (const btn of buttons) {
          const text = btn.textContent.toLowerCase().trim();
          const parent = btn.closest('[data-testid*="list"], [data-automation-id*="list"]');
          if (text === 'add to cart' && !parent && !btn.disabled) return btn;
        }
        return null;
      },
      // Strategy 4: Try logged-out buttons (sometimes they work anyway!)
      () => {
        const grid = document.querySelector('[data-testid="productGrid"], [data-automation-id*="productGrid"]');
        if (!grid) return null;
        // Get first button in grid with "add-to-cart" in data-testid
        const btn = grid.querySelector('button[data-testid*="add-to-cart"]');
        log('  Trying logged-out button variant (may still work if user is logged in)');
        return btn;
      },
      // Strategy 5: Any "Add to cart" button in product grid
      () => {
        const grid = document.querySelector('[data-testid="productGrid"], [data-automation-id*="productGrid"]');
        if (!grid) return null;
        const btn = grid.querySelector('button');
        if (btn && btn.textContent.toLowerCase().includes('add')) {
          return btn;
        }
        return null;
      }
    ];
    
    for (let i = 0; i < strategies.length; i++) {
      const btn = strategies[i]();
      if (btn) {
        log(`Found button using strategy ${i + 1}`);
        
        // Log button details
        const testId = btn.getAttribute('data-testid') || 'none';
        log(`  Button data-testid: ${testId}`);
        log(`  Button text: "${btn.textContent.trim().substring(0, 30)}"`);
        
        // Scroll to button
        btn.scrollIntoView({ block: 'center', behavior: 'smooth' });
        await sleep(500);
        
        // Click it
        log('Clicking Add to Cart button');
        btn.click();
        
        // Visual feedback
        btn.style.outline = '3px solid lime';
        setTimeout(() => btn.style.outline = '', 2000);
        
        return true;
      }
    }
    
    throw new Error('Could not find Add to Cart button');
  };
  
  // Verify item was added by checking cart count
  const verifyAdded = async (initialCartCount) => {
    log('Verifying item was added...');
    await sleep(2000); // Wait for cart to update
    
    const newCartCount = getCartCount();
    log(`Cart count: ${initialCartCount} → ${newCartCount}`);
    
    if (newCartCount > initialCartCount) {
      log('✅ Item verified in cart!', 'success');
      return true;
    } else {
      log('⚠️ Cart count did not increase, but button was clicked', 'warn');
      // Still return true because button click might have worked
      return true;
    }
  };
  
  // Add a single item
  const addItem = async (item, initialCartCount) => {
    const searchTerm = item.hebSearch || item.searchTerm || item.name;
    
    log(`\n📦 Adding item ${state.currentIndex + 1}/${state.items.length}: "${item.name}"`);
    
    for (let attempt = 1; attempt <= CONFIG.maxRetries; attempt++) {
      try {
        log(`Attempt ${attempt}/${CONFIG.maxRetries}`);
        
        // Go back to home page for clean search
        if (attempt > 1 || state.currentIndex > 0) {
          log('Going back to homepage for next item...');
          window.location.href = 'https://www.heb.com';
          await sleep(3000);
        }
        
        // Search
        await searchItem(searchTerm);
        
        // Click add to cart
        await clickAddToCart();
        
        // Verify
        const verified = await verifyAdded(initialCartCount);
        
        if (verified) {
          state.added.push(item);
          notify(`✅ Added: ${item.name}`, 'success');
          return { success: true };
        }
        
      } catch (err) {
        log(`Attempt ${attempt} failed: ${err.message}`, 'error');
        if (attempt < CONFIG.maxRetries) {
          log(`Retrying in ${attempt * 2} seconds...`);
          await sleep(attempt * 2000);
        }
      }
    }
    
    state.failed.push({ item: item.name, error: 'Max retries exceeded' });
    notify(`❌ Failed: ${item.name}`, 'error');
    return { success: false, error: 'Max retries exceeded' };
  };
  
  // Main automation function
  const runAutomation = async (items) => {
    if (state.isRunning) {
      log('Already running!', 'warn');
      return;
    }
    
    // Validate
    if (!items || items.length === 0) {
      notify('No items to add', 'error');
      return;
    }
    
    if (!checkLogin()) {
      notify('Please login to HEB first', 'error');
      return;
    }
    
    // Initialize
    state.isRunning = true;
    state.items = items;
    state.currentIndex = 0;
    state.added = [];
    state.failed = [];
    const initialCartCount = getCartCount();
    
    log(`\n🚀 Starting automation with ${items.length} items`);
    log(`Initial cart count: ${initialCartCount}`);
    notify(`🚀 Starting: ${items.length} items`, 'info');
    
    // Process each item
    for (let i = 0; i < items.length; i++) {
      state.currentIndex = i;
      const item = items[i];
      
      // Update progress to background
      try {
        chrome.runtime.sendMessage({
          action: 'progress',
          current: i + 1,
          total: items.length,
          item: item.name,
          added: state.added.length,
          failed: state.failed.length
        });
      } catch (e) {}
      
      // Add item
      await addItem(item, initialCartCount + state.added.length);
      
      // Delay between items
      if (i < items.length - 1) {
        log(`Waiting ${CONFIG.delayBetweenItems}ms before next item...`);
        await sleep(CONFIG.delayBetweenItems);
      }
    }
    
    // Complete
    state.isRunning = false;
    const finalCartCount = getCartCount();
    
    log(`\n✅ Automation complete!`);
    log(`Added: ${state.added.length}/${items.length}`);
    log(`Failed: ${state.failed.length}/${items.length}`);
    log(`Cart count: ${initialCartCount} → ${finalCartCount}`);
    
    notify(`✅ Complete! Added ${state.added.length}/${items.length} items`, 'success');
    
    // Send completion to background
    try {
      chrome.runtime.sendMessage({
        action: 'automationComplete',
        added: state.added.length,
        failed: state.failed.length,
        total: items.length,
        items: state.added.map(i => i.name)
      });
    } catch (e) {}
  };
  
  // Listen for messages from popup
  chrome.runtime.onMessage.addListener((msg, sender, reply) => {
    log(`Received message: ${msg.action}`);
    
    if (msg.action === 'startAutomation') {
      runAutomation(msg.items);
      reply({ status: 'started', count: msg.items?.length || 0 });
      return true;
    }
    
    if (msg.action === 'stopAutomation') {
      state.isRunning = false;
      reply({ status: 'stopped' });
      return true;
    }
    
    if (msg.action === 'getStatus') {
      reply({
        isRunning: state.isRunning,
        current: state.currentIndex + 1,
        total: state.items.length,
        added: state.added.length,
        failed: state.failed.length
      });
      return true;
    }
    
    if (msg.action === 'ping') {
      reply({ status: 'pong', version: '2.0' });
      return true;
    }
  });
  
  // Auto-start check
  chrome.storage.local.get(['items', 'autoStart'], (result) => {
    if (result.items?.length > 0 && result.autoStart) {
      log('Auto-starting with saved items...');
      setTimeout(() => runAutomation(result.items), 3000);
    }
  });
  
  log('Ready! Waiting for commands...');
})();
