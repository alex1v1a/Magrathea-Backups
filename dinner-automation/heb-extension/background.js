// HEB Auto Shopper - Background Service Worker
// Handles automatic cart synchronization

const SYNC_INTERVAL_MINUTES = 30; // Check every 30 minutes
const HEB_URL = 'https://www.heb.com';

// Default meal plan items (will be updated from external source)
let currentMealPlan = [];

// Load saved meal plan
chrome.storage.local.get(['mealPlan', 'lastSync'], (data) => {
  if (data.mealPlan) {
    currentMealPlan = data.mealPlan;
  }
  console.log('HEB Background: Loaded meal plan with', currentMealPlan.length, 'items');
  console.log('Last sync:', data.lastSync ? new Date(data.lastSync).toLocaleString() : 'Never');
  
  // Check for external meal plan update
  checkForExternalMealPlan();
});

/**
 * Check for meal plan updates from external script (items.json)
 */
async function checkForExternalMealPlan() {
  try {
    // items.json is web_accessible, so we can fetch it
    const response = await fetch(chrome.runtime.getURL('items.json'));
    const data = await response.json();
    
    if (data.items && data.items.length > 0) {
      // Check if different from current
      const newItemsHash = JSON.stringify(data.items.map(i => i.name));
      const currentItemsHash = JSON.stringify(currentMealPlan.map(i => i.name));
      
      if (newItemsHash !== currentItemsHash) {
        console.log('HEB Background: External meal plan detected with', data.items.length, 'items');
        currentMealPlan = data.items;
        await chrome.storage.local.set({ 
          mealPlan: currentMealPlan,
          externalUpdate: Date.now()
        });
        console.log('HEB Background: Meal plan updated from external source');
      }
    }
  } catch (e) {
    // items.json might not exist yet
    console.log('HEB Background: No external meal plan found');
  }
}

// Set up alarm for automatic sync
chrome.runtime.onStartup.addListener(() => {
  setupSyncAlarm();
});

chrome.runtime.onInstalled.addListener(() => {
  setupSyncAlarm();
});

function setupSyncAlarm() {
  chrome.alarms.create('hebSync', {
    periodInMinutes: SYNC_INTERVAL_MINUTES
  });
  console.log('HEB Background: Sync alarm set for every', SYNC_INTERVAL_MINUTES, 'minutes');
}

// Listen for alarm
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'hebSync') {
    console.log('HEB Background: Auto-sync triggered');
    checkForExternalMealPlan().then(() => {
      performAutoSync();
    });
  }
});

// Listen for messages from popup or external sources
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('HEB Background: Received message', request.action);
  
  if (request.action === 'updateMealPlan') {
    currentMealPlan = request.items;
    chrome.storage.local.set({ 
      mealPlan: currentMealPlan,
      mealPlanUpdated: Date.now()
    });
    console.log('HEB Background: Meal plan updated with', currentMealPlan.length, 'items');
    sendResponse({ success: true });
    
    // Trigger immediate sync if auto-sync is enabled
    chrome.storage.local.get(['autoSyncEnabled'], (data) => {
      if (data.autoSyncEnabled !== false) {
        console.log('HEB Background: Auto-sync enabled, triggering sync');
        performAutoSync();
      }
    });
    
  } else if (request.action === 'getMealPlan') {
    sendResponse({ mealPlan: currentMealPlan });
    
  } else if (request.action === 'manualSync') {
    console.log('HEB Background: Manual sync requested');
    performAutoSync();
    sendResponse({ success: true, message: 'Sync started' });
    
  } else if (request.action === 'toggleAutoSync') {
    chrome.storage.local.set({ autoSyncEnabled: request.enabled });
    if (request.enabled) {
      setupSyncAlarm();
    } else {
      chrome.alarms.clear('hebSync');
    }
    sendResponse({ success: true, autoSync: request.enabled });
  }
  
  return true; // Keep channel open for async
});

// Main auto-sync function
async function performAutoSync() {
  console.log('HEB Background: Starting auto-sync...');
  
  if (currentMealPlan.length === 0) {
    console.log('HEB Background: No meal plan set, skipping sync');
    return;
  }
  
  try {
    // Open HEB in a new tab
    const tab = await chrome.tabs.create({ 
      url: HEB_URL, 
      active: false // Background tab
    });
    
    console.log('HEB Background: Opened HEB tab', tab.id);
    
    // Wait for page to load
    await sleep(5000);
    
    // Check if logged in
    const isLoggedIn = await checkLoginStatus(tab.id);
    
    if (!isLoggedIn) {
      console.log('HEB Background: Not logged in, notifying user');
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon48.png',
        title: 'HEB Auto Shopper',
        message: 'Please login to HEB to sync your cart'
      });
      chrome.tabs.update(tab.id, { active: true }); // Bring tab to front
      return;
    }
    
    // Get current cart items
    const cartItems = await getCartItems(tab.id);
    console.log('HEB Background: Current cart has', cartItems.length, 'items');
    
    // Calculate what needs to be added and removed
    const mealPlanNames = currentMealPlan.map(item => item.name.toLowerCase());
    const cartNames = cartItems.map(item => item.name.toLowerCase());
    
    const toAdd = currentMealPlan.filter(item => 
      !cartNames.some(cartName => cartName.includes(item.name.toLowerCase()))
    );
    
    const toRemove = cartItems.filter(item => 
      !mealPlanNames.some(mealName => mealName.includes(item.name.toLowerCase()))
    );
    
    console.log('HEB Background: Need to add', toAdd.length, 'items');
    console.log('HEB Background: Need to remove', toRemove.length, 'items');
    
    // Remove items first
    for (const item of toRemove) {
      console.log('HEB Background: Removing', item.name);
      await removeItemFromCart(tab.id, item);
      await sleep(2000);
    }
    
    // Add new items
    for (const item of toAdd) {
      console.log('HEB Background: Adding', item.name);
      await addItemToCart(tab.id, item);
      await sleep(3000);
    }
    
    // Update last sync time
    chrome.storage.local.set({ 
      lastSync: Date.now(),
      lastSyncResult: {
        added: toAdd.length,
        removed: toRemove.length,
        total: currentMealPlan.length
      }
    });
    
    console.log('HEB Background: Sync complete!');
    
    // Optional: Close the tab if sync was successful
    // await chrome.tabs.remove(tab.id);
    
  } catch (error) {
    console.error('HEB Background: Sync error:', error);
  }
}

async function checkLoginStatus(tabId) {
  try {
    const [{ result }] = await chrome.scripting.executeScript({
      target: { tabId },
      func: () => {
        // Check if on login page
        if (window.location.href.includes('/login') || 
            window.location.href.includes('/interaction/') ||
            window.location.href.includes('/accounts.heb.com')) {
          return false;
        }
        
        // Check for account elements
        const hasAccount = !!document.querySelector('[data-testid*="account"], .account-menu');
        const hasWelcome = Array.from(document.querySelectorAll('button, a'))
          .some(btn => btn.textContent.toLowerCase().includes('welcome') || 
                       btn.textContent.toLowerCase().includes('hello'));
        
        return hasAccount || hasWelcome;
      }
    });
    return result;
  } catch (e) {
    return false;
  }
}

async function getCartItems(tabId) {
  try {
    // Navigate to cart
    await chrome.scripting.executeScript({
      target: { tabId },
      func: () => {
        window.location.href = 'https://www.heb.com/cart';
      }
    });
    
    await sleep(4000);
    
    const [{ result }] = await chrome.scripting.executeScript({
      target: { tabId },
      func: () => {
        const items = [];
        // Try multiple selectors for cart items
        const selectors = [
          '[data-testid*="cart-item"]',
          '.cart-item',
          '[class*="cart-item"]',
          '.product-list-item'
        ];
        
        for (const selector of selectors) {
          const elements = document.querySelectorAll(selector);
          elements.forEach(el => {
            const nameEl = el.querySelector('h3, .product-name, [data-testid*="name"]');
            const removeBtn = el.querySelector('button[aria-label*="remove"], button[data-testid*="remove"]');
            
            if (nameEl) {
              items.push({
                name: nameEl.textContent.trim(),
                removeSelector: removeBtn ? true : false
              });
            }
          });
        }
        
        return items;
      }
    });
    
    return result || [];
  } catch (e) {
    return [];
  }
}

async function removeItemFromCart(tabId, item) {
  try {
    const [{ result }] = await chrome.scripting.executeScript({
      target: { tabId },
      func: (itemName) => {
        // Find the item in cart
        const cartItems = document.querySelectorAll('[data-testid*="cart-item"], .cart-item, [class*="cart-item"]');
        
        for (const cartItem of cartItems) {
          const nameEl = cartItem.querySelector('h3, .product-name, [data-testid*="name"]');
          if (nameEl && nameEl.textContent.toLowerCase().includes(itemName.toLowerCase())) {
            // Find remove button
            const removeBtn = cartItem.querySelector('button[aria-label*="remove"], button[data-testid*="remove"], .remove-item, button:contains("Remove")');
            if (removeBtn) {
              removeBtn.click();
              return true;
            }
          }
        }
        return false;
      },
      args: [item.name]
    });
    
    return result;
  } catch (e) {
    return false;
  }
}

async function addItemToCart(tabId, item) {
  try {
    console.log('HEB Background: Adding item:', item.name);
    
    // Navigate to search
    await chrome.scripting.executeScript({
      target: { tabId },
      func: (searchTerm) => {
        window.location.href = `https://www.heb.com/search?q=${encodeURIComponent(searchTerm)}`;
      },
      args: [item.searchTerm || item.name]
    });
    
    // Wait for page to fully load (HEB is slow)
    await sleep(8000);
    
    // Try multiple times to find and click add button
    let attempts = 0;
    const maxAttempts = 3;
    
    while (attempts < maxAttempts) {
      attempts++;
      console.log(`HEB Background: Attempt ${attempts}/${maxAttempts} to find add button`);
      
      const [{ result }] = await chrome.scripting.executeScript({
        target: { tabId },
        func: () => {
          // Strategy 1: Look for data-testid
          let btn = document.querySelector('button[data-testid*="add-to-cart"], button[data-testid*="AddToCart"]');
          
          // Strategy 2: Look for data-automation-id
          if (!btn) {
            btn = document.querySelector('button[data-automation-id*="add"], button[data-automation-id*="Add"]');
          }
          
          // Strategy 3: Look for aria-label
          if (!btn) {
            const buttons = document.querySelectorAll('button[aria-label*="Add"], button[aria-label*="add"]');
            if (buttons.length > 0) btn = buttons[0];
          }
          
          // Strategy 4: Look for button text
          if (!btn) {
            const buttons = document.querySelectorAll('button');
            for (const b of buttons) {
              const text = b.textContent.toLowerCase().trim();
              if (text === 'add' || text === 'add to cart' || text.includes('add to cart')) {
                // Make sure button is visible and not disabled
                if (b.offsetParent !== null && !b.disabled) {
                  btn = b;
                  break;
                }
              }
            }
          }
          
          // Strategy 5: Look for add button in product cards
          if (!btn) {
            const cards = document.querySelectorAll('[data-testid*="product"], [class*="product"], article');
            for (const card of cards) {
              const addBtn = card.querySelector('button');
              if (addBtn && addBtn.textContent.toLowerCase().includes('add')) {
                if (addBtn.offsetParent !== null && !addBtn.disabled) {
                  btn = addBtn;
                  break;
                }
              }
            }
          }
          
          if (btn) {
            // Human-like interaction
            const rect = btn.getBoundingClientRect();
            const isVisible = rect.top >= 0 && rect.bottom <= window.innerHeight;
            
            if (!isVisible) {
              btn.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
            
            // Add visual feedback
            btn.style.outline = '3px solid #22c55e';
            setTimeout(() => btn.style.outline = '', 2000);
            
            // Click with slight delay
            setTimeout(() => btn.click(), 100);
            
            return { success: true, method: isVisible ? 'direct' : 'scrolled' };
          }
          
          return { success: false, reason: 'Button not found' };
        }
      });
      
      if (result && result.success) {
        console.log('HEB Background: Button clicked successfully:', result.method);
        await sleep(4000); // Wait for add to complete
        return true;
      }
      
      console.log('HEB Background: Button not found, waiting before retry...');
      await sleep(3000); // Wait before retry
    }
    
    console.log('HEB Background: Failed to add item after', maxAttempts, 'attempts');
    return false;
  } catch (e) {
    console.error('HEB Background: Error adding item:', e);
    return false;
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

console.log('HEB Background: Service worker loaded');
