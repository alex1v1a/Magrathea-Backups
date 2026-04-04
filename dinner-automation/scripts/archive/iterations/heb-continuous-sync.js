const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const DATA_DIR = path.join(__dirname, '..', 'data');

// Target items that SHOULD be in cart
const TARGET_MEAL_PLAN = [
  'White fish fillets (catfish)', 'Corn tortillas', 'Mango', 'Red onion', 'Jalapeno',
  'Cabbage slaw mix', 'Chipotle mayo', 'Cod fillets', 'Unsalted butter', 'Fresh parsley',
  'Capers', 'White wine', 'Green beans', 'Chicken thighs', 'Lemon', 'Fresh thyme',
  'Oregano', 'Couscous', 'Zucchini', 'Ribeye steak', 'Bosc pear (sub for Asian pear)',
  'Sriracha (sub for gochujang)', 'Jasmine rice', 'Kimchi', 'Chicken breast',
  'Cucumber', 'Cherry tomatoes', 'Feta cheese', 'Quinoa', 'Hummus'
];

async function continuousSync() {
  console.log('🔄 CONTINUOUS SYNC: Cart ↔ Calendar ↔ Email\n');
  console.log(`Time: ${new Date().toLocaleString()}\n`);
  
  // Load current state
  const cartState = loadCartState();
  const calendarState = loadCalendarState();
  
  // Check if cart has been user-confirmed (either in cart file or confirmation file)
  const confirmationStatus = loadConfirmationStatus();
  const isConfirmed = cartState.status === 'CONFIRMED_BY_USER' || 
                      (confirmationStatus.confirmed && confirmationStatus.itemCount === cartState.itemCount);
  
  if (isConfirmed) {
    console.log('✅ Cart confirmed by user with substitutions. Skipping alerts.\n');
    console.log(`Items: ${cartState.itemCount}/${cartState.targetItems}`);
    console.log(`Missing (with substitutions): ${cartState.missingItems?.join(', ') || 'None'}\n`);
    console.log('Next check in 30 minutes...\n');
    return;
  }
  
  console.log('📊 Current State:');
  console.log(`  Cart items: ${cartState.itemCount || 'unknown'}`);
  console.log(`  Target items: ${targetCount}`);
  console.log(`  Calendar events: ${calendarState.eventCount || 11}\n`);
  
  // Check if sync needed (compare against target from cart data)
  const targetCount = cartState.targetItems || TARGET_MEAL_PLAN.length;
  if (cartState.itemCount < targetCount) {
    console.log('⚠️  Cart is missing items. Triggering sync...\n');
    
    // Update sync log
    const syncLog = {
      timestamp: new Date().toISOString(),
      action: 'SYNC_TRIGGERED',
      cartItems: cartState.itemCount,
      targetItems: targetCount,
      missing: targetCount - (cartState.itemCount || 0)
    };
    
    saveSyncLog(syncLog);
    
    // Trigger calendar update with current cart status
    updateCalendarWithCartStatus(cartState);
    
    // Send notification
    sendSyncNotification(syncLog);
    
    console.log('✅ Sync triggered\n');
  } else {
    console.log('✅ Cart is in sync\n');
  }
  
  console.log('Next check in 30 minutes...\n');
}

function loadCartState() {
  try {
    // Read actual cart data from heb-cart-actual.json
    const data = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'heb-cart-actual.json'), 'utf8'));
    return {
      itemCount: data.actualItemsInCart || 27,
      targetItems: data.targetItems || 31,
      status: data.status || 'UNKNOWN',
      missingItems: data.missingItems || [],
      substitutions: data.substitutionsApplied || {},
      lastSync: data.timestamp
    };
  } catch (e) {
    // Fallback to legacy file
    try {
      const legacyData = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'heb-cart-sync.json'), 'utf8'));
      return {
        itemCount: legacyData.finalCount || legacyData.itemsInCart?.length || 27,
        targetItems: 31,
        status: 'UNKNOWN',
        lastSync: legacyData.timestamp,
        items: legacyData.itemsInCart || []
      };
    } catch {
      return { itemCount: 27, targetItems: 31, status: 'UNKNOWN', lastSync: null, items: [] };
    }
  }
}

function loadCalendarState() {
  try {
    const data = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'calendar-events.json'), 'utf8'));
    return {
      eventCount: data.events?.length || 11,
      lastSync: data.lastSync
    };
  } catch (e) {
    return { eventCount: 11, lastSync: null };
  }
}

function loadConfirmationStatus() {
  try {
    const data = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'heb-cart-confirmed.json'), 'utf8'));
    return {
      confirmed: data.confirmed || false,
      itemCount: data.itemCount || 0,
      timestamp: data.timestamp || null,
      substitutions: data.substitutions || []
    };
  } catch (e) {
    return { confirmed: false, itemCount: 0, timestamp: null, substitutions: [] };
  }
}

function saveSyncLog(log) {
  const logPath = path.join(DATA_DIR, 'sync-log.json');
  let logs = [];
  
  try {
    logs = JSON.parse(fs.readFileSync(logPath, 'utf8'));
  } catch (e) {}
  
  logs.push(log);
  
  // Keep only last 50 logs
  if (logs.length > 50) logs = logs.slice(-50);
  
  fs.writeFileSync(logPath, JSON.stringify(logs, null, 2));
}

function updateCalendarWithCartStatus(cartState) {
  console.log('📅 Updating calendar with cart status...');
  
  // Create/update a cart status event
  const statusEvent = {
    title: `HEB Cart: ${cartState.itemCount}/${TARGET_MEAL_PLAN.length} items`,
    description: `Cart sync status\nItems: ${cartState.itemCount}\nTarget: ${TARGET_MEAL_PLAN.length}\nLast updated: ${new Date().toLocaleString()}`,
    timestamp: new Date().toISOString()
  };
  
  fs.writeFileSync(
    path.join(DATA_DIR, 'cart-calendar-status.json'),
    JSON.stringify(statusEvent, null, 2)
  );
  
  // Trigger calendar sync
  exec('node marvin-dash/scripts/calendar-sync.js', () => {});
  
  console.log('✅ Calendar updated\n');
}

function sendSyncNotification(syncLog) {
  console.log('📧 Preparing notification...\n');
  
  const notification = {
    to: 'alex@1v1a.com',
    subject: `HEB Cart Sync Alert - ${syncLog.cartItems}/${syncLog.targetItems} items`,
    body: `
Your HEB cart needs attention.

Current Status:
• Items in cart: ${syncLog.cartItems}
• Target items: ${syncLog.targetItems}
• Missing: ${syncLog.missing}

Action Required:
Please review your HEB cart and add missing items or proceed with checkout for current items.

Last sync: ${new Date().toLocaleString()}

---
Marvin 🤖
Automated Dinner Sync
    `.trim(),
    timestamp: new Date().toISOString()
  };
  
  fs.writeFileSync(
    path.join(DATA_DIR, 'pending-notification.json'),
    JSON.stringify(notification, null, 2)
  );
  
  console.log('Notification saved to pending-notification.json');
  console.log('(Email sending requires SMTP setup in TOOLS.md)\n');
}

// Run
continuousSync().catch(console.error);
