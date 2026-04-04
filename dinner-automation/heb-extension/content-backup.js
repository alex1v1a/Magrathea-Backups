/**
 * HEB Auto-Cart Content Script - Enhanced Version
 * Runs on HEB.com to automate cart addition
 */

console.log('🛒 HEB Auto-Cart: Content script loaded (v1.2.0 enhanced)');

let isRunning = false;
let items = [];
let currentIndex = 0;
let addedCount = 0;
let failedItems = [];
let retryCount = 0;
const MAX_RETRIES = 3;

// Auto-start check - run only once
(function autoStart() {
  // Prevent multiple auto-starts
  if (window.hebAutoCartInitialized) {
    console.log('🛒 HEB Auto-Cart: Already initialized, skipping');
    return;
  }
  window.hebAutoCartInitialized = true;
  
  console.log('🔍 Checking for auto-start items...');
  
  // Skip on login pages
  if (location.href.includes('/login') || location.href.includes('/signin') ||
      document.querySelector('input[type="password"]')) {
    console.log('🛒 On login page - skipping auto-start');
    return;
  }
  
  // Wait for page to fully load
  if (document.readyState !== 'complete') {
    window.addEventListener('load', () => setTimeout(checkAndStart, 3000));
  } else {
    setTimeout(checkAndStart, 3000);
  }
  
  async function checkAndStart() {
    // Check login status first
    const loginStatus = await checkLoginStatus();
    if (!loginStatus.loggedIn) {
      console.log('🛒 Not logged in - skipping auto-start');
      showNotification('Please login to HEB first', 'warning');
      return;
    }
    
    chrome.storage.local.get(['items', 'isRunning', 'autoStart'], (result) => {
      // Don't auto-start if already running or no items
      if (result.items && result.items.length > 0 && !result.isRunning && result.autoStart) {
        items = result.items;
        console.log(`✅ Auto-starting with ${items.length} items from storage`);
        showNotification(`Auto-starting: ${items.length} items`, 'info');
        setTimeout(() => startAutomation(), 2000);
      } else {
        fetchAutoStartData();
      }
    });
  }
})();

function fetchAutoStartData() {
  fetch(chrome.runtime.getURL('autostart-data.json'))
    .then(r => r.ok ? r.json() : null)
    .then(data => {
      if (data?.items?.length > 0 && data.autoStart && !isRunning) {
        items = data.items;
        chrome.storage.local.set({ items, isRunning: false, autoStart: true }, () => {
          showNotification(`Auto-starting: ${items.length} items`, 'info');
          setTimeout(() => startAutomation(), 2000);
        });
      }
    })
    .catch(err => console.log('No autostart data:', err.message));
}

chrome.runtime.onMessage.addListener((msg, sender, reply) => {
  try {
    if (msg.action === 'startAutomation') {
      items = msg.items || [];
      currentIndex = 0;
      addedCount = 0;
      failedItems = [];
      if (!isRunning) {
        startAutomation().catch(err => {
          console.error('Start automation error:', err);
          notifyError(err.message);
        });
      }
      reply({ status: 'started', items: items.length });
      return true;
    }
    if (msg.action === 'stopAutomation') {
      isRunning = false;
      reply({ status: 'stopped' });
      return true;
    }
    if (msg.action === 'getStatus') {
      reply({ isRunning, currentIndex, total: items?.length || 0, added: addedCount, failed: failedItems });
      return true;
    }
    if (msg.action === 'ping') {
      reply({ status: 'pong', url: location.href });
      return true;
    }
  } catch (err) {
    console.error('Message handler error:', err);
    reply({ status: 'error', error: err.message });
    return true;
  }
});

async function startAutomation() {
  if (isRunning) {
    console.log('🛒 HEB Auto-Cart: Already running, ignoring start request');
    return;
  }
  
  console.log('\n═══════════════════════════════════════');
  console.log('🛒 HEB Auto-Cart: STARTING AUTOMATION');
  console.log('═══════════════════════════════════════\n');
  
  if (!location.href.includes('heb.com')) {
    notifyError('Not on HEB.com');
    return;
  }
  
  // Skip login pages
  if (location.href.includes('/login') || location.href.includes('/signin') || 
      document.querySelector('input[type="password"]')) {
    console.log('🛒 HEB Auto-Cart: Skipping login page');
    return;
  }
  
  // Check if we have items to add
  if (!items || items.length === 0) {
    console.log('🛒 HEB Auto-Cart: No items loaded');
    showNotification('No items to add. Please load a meal plan first.', 'info');
    return;
  }
  
  console.log(`📋 Items to add: ${items.length}`);
  items.forEach((item, i) => console.log(`  ${i + 1}. ${item.name}`));
  console.log('');
  
  // Wait for page to be fully loaded
  await sleep(2000);
  
  // Check login status
  const loginStatus = await checkLoginStatus();
  console.log('🔐 Login status:', loginStatus.loggedIn ? '✅ LOGGED IN' : '❌ NOT LOGGED IN');
  
  if (!loginStatus.loggedIn) {
    console.log('🛒 HEB Auto-Cart: User not logged in');
    showNotification('⚠️ Please login to HEB first', 'warning');
    return;
  }
  
  const searchInput = findSearchInput();
  if (!searchInput) {
    console.log('🛒 HEB Auto-Cart: No search input found');
    showNotification('Search not available', 'error');
    return;
  }
  console.log('✓ Search input found\n');
  
  isRunning = true;
  retryCount = 0;
  notifyStart(items.length);
  
  for (let i = 0; i < items.length && isRunning; i++) {
    currentIndex = i;
    const item = items[i];
    
    notifyProgress(i, items.length, item.name, 'adding');
    
    try {
      const result = await addItemWithRetry(item);
      if (result.success) {
        addedCount++;
        item.status = 'done';
        notifyProgress(i + 1, items.length, item.name, 'done');
      } else {
        throw new Error(result.error);
      }
    } catch (err) {
      console.error(`Failed: ${item.name}`, err);
      failedItems.push({ item: item.name, error: err.message });
      item.status = 'error';
      notifyProgress(i, items.length, item.name, 'error', err.message);
    }
    
    if (i < items.length - 1 && isRunning) {
      await sleep(4000 + Math.random() * 2000);
    }
  }
  
  isRunning = false;
  notifyComplete(addedCount, failedItems.length, items.length, failedItems);
}

async function addItemWithRetry(item) {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(`\n📦 [${currentIndex + 1}/${items.length}] Attempt ${attempt}: ${item.name}`);
      return await addItemToCart(item);
    } catch (err) {
      console.log(`  Attempt ${attempt} failed: ${err.message}`);
      if (attempt < MAX_RETRIES) {
        await sleep(2000 * attempt);
      } else {
        throw err;
      }
    }
  }
}

async function addItemToCart(item) {
  const searchTerm = item.hebSearch || item.searchTerm || item.name;
  console.log(`\n📦 Adding: "${searchTerm}"`);
  
  // Step 1: Find and fill search
  console.log('  Step 1: Finding search input...');
  const searchInput = await findSearchInputWithRetry();
  if (!searchInput) throw new Error('Search input not found');
  console.log('  ✓ Found search input');
  
  // Clear and enter search
  searchInput.click();
  searchInput.focus();
  await sleep(100);
  searchInput.select();
  await sleep(100);
  
  // Clear and type
  searchInput.value = '';
  searchInput.value = searchTerm;
  
  // Trigger events
  ['focus', 'input', 'change', 'keyup'].forEach(evt => {
    searchInput.dispatchEvent(new Event(evt, { bubbles: true }));
  });
  await sleep(300);
  console.log(`  ✓ Typed: "${searchTerm}"`);
  
  // Step 2: Submit search
  console.log('  Step 2: Submitting search...');
  const submitBtn = document.querySelector('button[type="submit"], button[aria-label*="Search"], button[data-automation-id*="search"]');
  if (submitBtn && submitBtn.offsetParent !== null) {
    console.log('  → Clicking search button');
    submitBtn.click();
  } else {
    console.log('  → Pressing Enter');
    searchInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
  }
  
  // Wait for results with progress updates
  console.log('  → Waiting for search results...');
  await sleep(2000);
  console.log('    2 seconds...');
  await sleep(2000);
  console.log('    4 seconds...');
  await sleep(2000);
  console.log('    6 seconds - should have results');
  
  // Step 3: Find and click Add to Cart
  console.log('  Step 3: Looking for Add to Cart button...');
  
  // First, look specifically for the FIRST product's add button
  const firstProductBtn = await findFirstProductAddButton();
  if (firstProductBtn) {
    console.log('  ✓ Found first product add button');
    
    // Scroll to it
    firstProductBtn.scrollIntoView({ behavior: 'smooth', block: 'center' });
    await sleep(500);
    
    // Click it
    console.log('  → Clicking Add to Cart button');
    firstProductBtn.click();
    
    // Visual feedback
    firstProductBtn.style.outline = '3px solid green';
    
    await sleep(2000);
    await handleModals();
    
    console.log('  ✓ Clicked Add to Cart!');
    return { success: true };
  }
  
  // Fallback to general search
  console.log('  ⚠️ First product button not found, trying general search...');
  const addBtn = await findAddButtonWithRetry();
  if (!addBtn) {
    const fallbackBtn = findAddButtonFallback();
    if (!fallbackBtn) {
      console.log('  ❌ No add button found at all');
      throw new Error('Add to Cart button not found');
    }
    console.log('  ✓ Found button via fallback');
    fallbackBtn.click();
    fallbackBtn.style.outline = '3px solid orange';
    await sleep(2000);
    return { success: true };
  }
  
  console.log('  ✓ Found add button via retry');
  addBtn.click();
  addBtn.style.outline = '3px solid blue';
  await sleep(2000);
  
  return { success: true };
}

async function findFirstProductAddButton() {
  // Look for the first product in the search results
  console.log('    Looking for first product...');
  
  // Try different selectors for product containers
  const productSelectors = [
    '[data-testid="productGrid"] > div:first-child button[data-testid*="add-to-cart"]',
    '[data-automation-id*="productTile"]:first-child button[data-testid*="add-to-cart"]',
    '[data-testid*="product"]:first-of-type button[data-testid*="add-to-cart"]',
    '.product-tile:first-child button[data-testid*="add-to-cart"]',
    'article:first-of-type button[data-testid*="add-to-cart"]',
    // Fallback: look for first button with add-to-cart in the results area
    '[data-testid="productGrid"] button[data-testid*="add-to-cart"]:not([data-testid*="logged-out"])',
    '[data-automation-id*="searchResults"] button[data-testid*="add-to-cart"]:not([data-testid*="logged-out"])'
  ];
  
  for (const selector of productSelectors) {
    try {
      const btn = document.querySelector(selector);
      if (btn && !btn.disabled && btn.offsetParent !== null) {
        console.log(`    ✓ Found first product button via: ${selector}`);
        return btn;
      }
    } catch (e) {
      // Continue to next selector
    }
  }
  
  // Try to find first product area and then its button
  const productAreas = document.querySelectorAll(
    '[data-testid*="product"], [data-automation-id*="product"], .product-tile, article'
  );
  
  for (const area of productAreas.slice(0, 3)) { // Check first 3 products
    const btn = area.querySelector('button[data-testid*="add-to-cart"]:not([data-testid*="logged-out"])');
    if (btn && !btn.disabled && btn.offsetParent !== null) {
      console.log('    ✓ Found first product button via area search');
      return btn;
    }
  }
  
  console.log('    ✗ First product button not found');
  return null;
}

async function findSearchInputWithRetry() {
  for (let i = 0; i < 5; i++) {
    const input = findSearchInput();
    if (input) return input;
    await sleep(1000);
  }
  return null;
}

async function checkLoginStatus() {
  // Check multiple indicators of logged-in state
  const checks = await new Promise((resolve) => {
    const results = {
      // Check for account menu
      hasAccountMenu: !!document.querySelector('[data-testid="account-menu"], [aria-label*="Account" i], a[href*="/account"]'),
      // Check for cart with items (logged in users have persistent cart)
      cartButton: document.querySelector('[data-testid*="cart" i], [data-automation-id*="cart" i]'),
      // Check for "Add to cart" buttons that are NOT "logged-out-add-to-cart"
      realAddButtons: document.querySelectorAll('button[data-testid*="add-to-cart" i]:not([data-testid*="logged-out"])').length,
      loggedOutButtons: document.querySelectorAll('button[data-testid*="logged-out-add-to-cart" i]').length,
      // Check for sign in link (if present, user is logged out)
      hasSignInLink: !!document.querySelector('a[href*="/login"], a[href*="/signin"], button:has-text("Sign In")')
    };
    resolve(results);
  });
  
  // Determine login status
  const loggedIn = checks.realAddButtons > 0 || 
                   (checks.hasAccountMenu && !checks.hasSignInLink) ||
                   (checks.loggedOutButtons === 0 && checks.hasAccountMenu);
  
  return {
    loggedIn,
    details: checks
  };
}

function findSearchInput() {
  const selectors = [
    'input[data-automation-id="searchInputBox"]',
    'input[placeholder*="Search" i]',
    'input[type="search"]',
    'input[name="q"]',
    'input[aria-label*="search" i]',
    '#search-input'
  ];
  
  for (const sel of selectors) {
    const el = document.querySelector(sel);
    if (el && el.offsetParent !== null) return el;
  }
  
  // Fallback
  const inputs = document.querySelectorAll('input');
  for (const input of inputs) {
    const ph = (input.placeholder || '').toLowerCase();
    if (ph.includes('search') || ph.includes('find')) return input;
  }
  return null;
}

async function findAddButtonWithRetry() {
  for (let i = 0; i < 8; i++) {
    const btn = findAddButton();
    if (btn) return btn;
    
    if (i === 3) window.scrollBy(0, 400);
    await sleep(800);
  }
  return null;
}

function findAddButton() {
  // Priority: buttons that are NOT logged-out variants
  const goodSelectors = [
    'button[data-testid*="add-to-cart" i]:not([data-testid*="logged-out"])',
    'button[data-automation-id*="addToCart" i]:not([data-automation-id*="logged-out"])',
    'button[aria-label*="Add to Cart" i]:not([data-testid*="logged-out"])'
  ];
  
  for (const sel of goodSelectors) {
    try {
      const btns = document.querySelectorAll(sel);
      for (const btn of btns) {
        if (!btn.disabled && btn.offsetParent !== null) {
          console.log('  Found REAL add button via selector:', sel);
          return btn;
        }
      }
    } catch (e) {
      // Invalid selector, skip
    }
  }
  
  // Check if we only have logged-out buttons (user not logged in)
  const loggedOutBtns = document.querySelectorAll('button[data-testid*="logged-out-add-to-cart" i]');
  if (loggedOutBtns.length > 0) {
    console.log('  ⚠️ Only found logged-out buttons - user not logged in');
  }
  
  // Fallback to any add button
  const fallbackSelectors = [
    'button[data-automation-id*="addToCart" i]',
    'button[data-testid*="add-to-cart" i]',
    'button[aria-label*="Add to Cart" i]',
    'button[aria-label*="Add" i]'
  ];
  
  for (const sel of fallbackSelectors) {
    try {
      const btns = document.querySelectorAll(sel);
      for (const btn of btns) {
        if (!btn.disabled && btn.offsetParent !== null) {
          console.log('  Found add button via fallback selector:', sel);
          return btn;
        }
      }
    } catch (e) {
      // Invalid selector, skip
    }
  }
  
  // Text fallback
  const allBtns = document.querySelectorAll('button');
  for (const btn of allBtns) {
    const text = (btn.textContent || '').toLowerCase().trim();
    if ((text.includes('add to cart') || text === 'add') && !btn.disabled && btn.offsetParent !== null) {
      console.log('  Found add button via text:', text);
      return btn;
    }
  }
  return null;
}

function findAddButtonFallback() {
  // Very broad fallback - any button in product area
  const productAreas = document.querySelectorAll(
    '[data-testid*="product"], [data-automation-id*="product"], .product, .product-tile, article, .grid-item'
  );
  
  for (const area of productAreas) {
    const buttons = area.querySelectorAll('button');
    for (const btn of buttons) {
      const text = (btn.textContent || '').toLowerCase();
      if ((text.includes('add') || text.includes('cart')) && !btn.disabled && btn.offsetParent !== null) {
        console.log('  Found add button via fallback in product area');
        return btn;
      }
    }
  }
  
  // Last resort - first enabled button that mentions add
  const allButtons = document.querySelectorAll('button');
  for (const btn of allButtons) {
    if (btn.disabled || btn.offsetParent === null) continue;
    const text = (btn.textContent || '').toLowerCase();
    if (text.includes('add') && (text.includes('cart') || text.length < 10)) {
      console.log('  Found add button via last resort');
      return btn;
    }
  }
  
  return null;
}

async function handleModals() {
  const closeTexts = ['close', 'no thanks', 'continue', 'got it'];
  const btns = document.querySelectorAll('button');
  
  for (const btn of btns) {
    const text = (btn.textContent || '').toLowerCase().trim();
    if (closeTexts.includes(text) && btn.offsetParent !== null) {
      btn.click();
      await sleep(300);
    }
  }
}

// Notification functions - limit to prevent memory issues
let notificationCount = 0;
const MAX_NOTIFICATIONS = 5;

function showNotification(text, type) {
  // Limit notifications to prevent memory issues
  if (notificationCount >= MAX_NOTIFICATIONS) {
    console.log('Notification skipped (too many):', text);
    return;
  }
  notificationCount++;
  
  const div = document.createElement('div');
  div.className = 'heb-auto-cart-notification';
  div.style.cssText = `
    position: fixed; top: ${20 + (notificationCount - 1) * 70}px; right: 20px; z-index: 999999;
    background: ${type === 'error' ? '#dc2626' : type === 'success' ? '#16a34a' : '#2563eb'};
    color: white; padding: 16px 24px; border-radius: 8px;
    font-family: system-ui, sans-serif; font-size: 14px; font-weight: 600;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3); animation: slideIn 0.3s ease-out;
  `;
  div.innerHTML = text;
  document.body.appendChild(div);
  
  setTimeout(() => {
    div.remove();
    notificationCount = Math.max(0, notificationCount - 1);
  }, 5000);
}

function notifyStart(total) {
  showNotification(`🚀 Starting: ${total} items`, 'info');
  try {
    chrome.runtime.sendMessage({ action: 'automationStarted', total }, () => {
      if (chrome.runtime.lastError) {
        console.log('Background not available:', chrome.runtime.lastError.message);
      }
    });
  } catch (e) {
    console.log('Could not notify background:', e.message);
  }
}

function notifyProgress(completed, total, item, status, error) {
  try {
    chrome.runtime.sendMessage({ 
      action: 'progress', 
      completed, 
      total, 
      currentItem: item, 
      itemStatus: status,
      error 
    }, () => {
      if (chrome.runtime.lastError) {
        console.log('Progress notify failed:', chrome.runtime.lastError.message);
      }
    });
  } catch (e) {
    console.log('Could not send progress:', e.message);
  }
}

function notifyComplete(added, failed, total, failedItems) {
  showNotification(`✅ Complete! ${added}/${total} added`, 'success');
  try {
    chrome.runtime.sendMessage({ 
      action: 'automationComplete', 
      added, 
      failed, 
      total, 
      failedItems 
    }, () => {
      if (chrome.runtime.lastError) {
        console.log('Complete notify failed:', chrome.runtime.lastError.message);
      }
    });
  } catch (e) {
    console.log('Could not send complete:', e.message);
  }
}

function notifyError(error) {
  showNotification(`❌ ${error}`, 'error');
  try {
    chrome.runtime.sendMessage({ action: 'automationError', error }, () => {
      if (chrome.runtime.lastError) {
        console.log('Error notify failed:', chrome.runtime.lastError.message);
      }
    });
  } catch (e) {
    console.log('Could not send error:', e.message);
  }
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

window.addEventListener('beforeunload', () => {
  if (isRunning) {
    try {
      chrome.runtime.sendMessage({ action: 'automationError', error: 'Page navigated away' }, () => {
        // Ignore errors on unload
      });
    } catch (e) {
      // Ignore errors during unload
    }
  }
});

console.log('🛒 HEB Auto-Cart: Ready');
