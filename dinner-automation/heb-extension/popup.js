// HEB Extension - Popup Script v3.0
// Supports meal plan management, auto-sync, and bidirectional cart sync

// Default meal plan items
const DEFAULT_MEAL_PLAN = [
  { name: "White fish fillets", searchTerm: "white fish fillets" },
  { name: "Corn tortillas", searchTerm: "corn tortillas" },
  { name: "Mango", searchTerm: "fresh mango" },
  { name: "Red onion", searchTerm: "red onion" },
  { name: "Jalapeno", searchTerm: "jalapeno peppers" },
  { name: "Cabbage slaw mix", searchTerm: "cabbage slaw" },
  { name: "Chipotle mayo", searchTerm: "chipotle mayonnaise" },
  { name: "Cod fillets", searchTerm: "cod fillets" },
  { name: "Unsalted butter", searchTerm: "unsalted butter" },
  { name: "Fresh parsley", searchTerm: "fresh parsley" },
  { name: "Capers", searchTerm: "capers" },
  { name: "White wine", searchTerm: "dry white wine" },
  { name: "Green beans", searchTerm: "green beans" },
  { name: "Chicken thighs", searchTerm: "chicken thighs" },
  { name: "Lemon", searchTerm: "fresh lemon" },
  { name: "Fresh thyme", searchTerm: "fresh thyme" },
  { name: "Oregano", searchTerm: "fresh oregano" },
  { name: "Couscous", searchTerm: "couscous" },
  { name: "Zucchini", searchTerm: "zucchini" },
  { name: "Ribeye steak", searchTerm: "ribeye steak" },
  { name: "Asian pear", searchTerm: "asian pear" },
  { name: "Gochujang", searchTerm: "gochujang" },
  { name: "Jasmine rice", searchTerm: "jasmine rice" },
  { name: "Sesame seeds", searchTerm: "sesame seeds" },
  { name: "Kimchi", searchTerm: "kimchi" },
  { name: "Chicken breast", searchTerm: "chicken breast" },
  { name: "Cucumber", searchTerm: "cucumber" },
  { name: "Cherry tomatoes", searchTerm: "cherry tomatoes" },
  { name: "Feta cheese", searchTerm: "feta cheese" },
  { name: "Quinoa", searchTerm: "quinoa" },
  { name: "Hummus", searchTerm: "hummus" }
];

let currentMealPlan = [];
let isSyncing = false;
let autoSyncEnabled = true;

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  console.log('HEB Popup: Initializing...');
  
  // Load saved data
  await loadSavedData();
  
  // Setup UI
  setupEventListeners();
  renderMealPlan();
  updateStatus();
  
  log('Extension ready. Meal plan has ' + currentMealPlan.length + ' items.');
});

async function loadSavedData() {
  const data = await chrome.storage.local.get([
    'mealPlan', 'autoSyncEnabled', 'lastSync', 'lastSyncResult'
  ]);
  
  if (data.mealPlan && data.mealPlan.length > 0) {
    currentMealPlan = data.mealPlan;
  } else {
    // Load default on first run
    currentMealPlan = [...DEFAULT_MEAL_PLAN];
    await saveMealPlan();
  }
  
  autoSyncEnabled = data.autoSyncEnabled !== false;
  updateAutoSyncToggle();
  
  if (data.lastSync) {
    const date = new Date(data.lastSync);
    document.getElementById('last-sync').textContent = date.toLocaleString();
  }
}

function setupEventListeners() {
  // Tab switching
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      
      tab.classList.add('active');
      document.getElementById(tab.dataset.tab + '-tab').classList.add('active');
    });
  });
  
  // Auto-sync toggle
  document.getElementById('auto-sync-toggle').addEventListener('click', async () => {
    autoSyncEnabled = !autoSyncEnabled;
    updateAutoSyncToggle();
    
    // Notify background script
    await chrome.runtime.sendMessage({
      action: 'toggleAutoSync',
      enabled: autoSyncEnabled
    });
    
    log(autoSyncEnabled ? 'Auto-sync enabled' : 'Auto-sync disabled');
  });
  
  // Sync now button
  document.getElementById('sync-now-btn').addEventListener('click', async () => {
    if (isSyncing) return;
    
    isSyncing = true;
    document.getElementById('sync-now-btn').disabled = true;
    document.getElementById('sync-now-btn').textContent = 'Syncing...';
    
    log('Starting manual sync...');
    
    // Notify background script to perform sync
    const response = await chrome.runtime.sendMessage({ action: 'manualSync' });
    
    if (response.success) {
      log('Sync initiated in background. Check the HEB tab for progress.');
    }
    
    // Reset UI after a delay
    setTimeout(() => {
      isSyncing = false;
      document.getElementById('sync-now-btn').disabled = false;
      document.getElementById('sync-now-btn').textContent = 'Sync Now';
    }, 3000);
  });
  
  // View cart button
  document.getElementById('view-cart-btn').addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        window.open('https://www.heb.com/cart', '_blank');
      }
    });
  });
  
  // Add item button
  document.getElementById('add-item-btn').addEventListener('click', addNewItem);
  
  // Enter key on input
  document.getElementById('new-item-name').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') addNewItem();
  });
  
  // Clear all button
  document.getElementById('clear-all-btn').addEventListener('click', async () => {
    if (confirm('Clear all items from meal plan?')) {
      currentMealPlan = [];
      await saveMealPlan();
      renderMealPlan();
      updateStatus();
      log('Meal plan cleared');
    }
  });
  
  // Load default button
  document.getElementById('load-default-btn').addEventListener('click', async () => {
    if (confirm('Replace current meal plan with default 31 items?')) {
      currentMealPlan = [...DEFAULT_MEAL_PLAN];
      await saveMealPlan();
      renderMealPlan();
      updateStatus();
      log('Default meal plan loaded (' + currentMealPlan.length + ' items)');
    }
  });
}

async function addNewItem() {
  const input = document.getElementById('new-item-name');
  const name = input.value.trim();
  
  if (!name) return;
  
  const newItem = {
    name: name,
    searchTerm: name.toLowerCase()
  };
  
  currentMealPlan.push(newItem);
  await saveMealPlan();
  
  input.value = '';
  renderMealPlan();
  updateStatus();
  log('Added: ' + name);
}

async function removeItem(index) {
  const removed = currentMealPlan.splice(index, 1)[0];
  await saveMealPlan();
  renderMealPlan();
  updateStatus();
  log('Removed: ' + removed.name);
}

async function saveMealPlan() {
  await chrome.storage.local.set({ mealPlan: currentMealPlan });
  
  // Notify background script of meal plan change
  await chrome.runtime.sendMessage({
    action: 'updateMealPlan',
    items: currentMealPlan
  });
}

function renderMealPlan() {
  const listEl = document.getElementById('meal-plan-list');
  
  if (currentMealPlan.length === 0) {
    listEl.innerHTML = '<div style="color: #999; text-align: center; padding: 20px;">No items in meal plan</div>';
    return;
  }
  
  listEl.innerHTML = currentMealPlan.map((item, index) => `
    <div class="item">
      <span class="item-name">${escapeHtml(item.name)}</span>
      <span class="item-remove" data-index="${index}" title="Remove">×</span>
    </div>
  `).join('');
  
  // Add click handlers for remove buttons
  listEl.querySelectorAll('.item-remove').forEach(btn => {
    btn.addEventListener('click', () => removeItem(parseInt(btn.dataset.index)));
  });
}

function updateStatus() {
  document.getElementById('item-count').textContent = currentMealPlan.length + ' items';
  
  // Check cart status
  chrome.tabs.query({ url: 'https://www.heb.com/*' }, (tabs) => {
    if (tabs.length > 0) {
      document.getElementById('cart-status').textContent = 'HEB tab open';
    } else {
      document.getElementById('cart-status').textContent = 'No HEB tab';
    }
  });
}

function updateAutoSyncToggle() {
  const toggle = document.getElementById('auto-sync-toggle');
  if (autoSyncEnabled) {
    toggle.classList.add('active');
  } else {
    toggle.classList.remove('active');
  }
}

function log(message) {
  const logEl = document.getElementById('log');
  const timestamp = new Date().toLocaleTimeString();
  logEl.textContent = `[${timestamp}] ${message}\n` + logEl.textContent;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Listen for messages from background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'syncComplete') {
    log(`Sync complete! Added: ${request.added}, Removed: ${request.removed}`);
    updateStatus();
  }
});

console.log('HEB Popup: Script loaded');
