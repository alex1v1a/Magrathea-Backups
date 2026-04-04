const fs = require('fs');
const path = require('path');
const { getBrowser, getPage, releaseBrowser } = require('./shared-chrome-connector');

/**
 * Facebook Marketplace Share - Fixed Version
 * Navigates to main page first to avoid redirect loops
 */

const GROUPS = [
  'HAYS COUNTY LIST & SELL',
  'Buda/Kyle Buy, Sell & Rent',
  'Ventas De Austin, Buda, Kyle'
];

const STATE_FILE = path.join(__dirname, '..', 'data', 'fb-marketplace-state.json');

function loadState() {
  try {
    return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
  } catch {
    return { lastGroupIndex: -1, loggedIn: false };
  }
}

function saveState(state) {
  fs.writeFileSync(STATE_FILE, JSON.stringify({
    ...state,
    timestamp: new Date().toISOString()
  }, null, 2));
}

async function shareToAllGroups(listingName) {
  console.log(`📤 Sharing ${listingName} to all groups...\n`);
  
  const state = loadState();
  const results = [];
  
  const browser = await getBrowser();
  const { page } = await getPage(browser, 'https://www.facebook.com/');
  
  try {
    // Check if logged in
    await page.waitForTimeout(3000);
    const url = page.url();
    
    if (url.includes('login')) {
      console.log('❌ Session expired, needs re-login');
      await releaseBrowser(browser);
      return { error: 'Session expired', loggedIn: false };
    }
    
    console.log('✅ Facebook session active\n');
    
    // Navigate to Marketplace selling page by clicking
    console.log('🛒 Navigating to Marketplace...');
    
    // Try clicking Marketplace link
    try {
      await page.click('a[href*="marketplace"]', { timeout: 5000 });
      await page.waitForTimeout(3000);
    } catch {
      // Direct navigation as fallback
      await page.goto('https://www.facebook.com/marketplace');
    }
    
    // Now navigate to selling page
    await page.goto('https://www.facebook.com/marketplace/you/selling');
    await page.waitForTimeout(5000);
    
    console.log(`📍 Current URL: ${page.url()}`);
    
    // Check if we're on the selling page
    if (page.url().includes('selling')) {
      console.log('✅ Selling page loaded\n');
      
      // Get all listings
      const listings = await page.locator('div[role="article"]').count();
      console.log(`📦 Found ${listings} listings\n`);
      
      // For each group, update state and report
      for (let i = 0; i < GROUPS.length; i++) {
        const groupName = GROUPS[i];
        console.log(`🎯 Group ${i + 1}/${GROUPS.length}: ${groupName}`);
        console.log(`   ⚠️  Manual sharing required (click "Share" → "Groups" → "${groupName}")`);
        results.push({ group: groupName, status: 'manual_required' });
      }
      
      // Update state to rotate for next run
      const newIndex = (state.lastGroupIndex + 1) % GROUPS.length;
      saveState({ ...state, lastGroupIndex: newIndex, loggedIn: true });
      
    } else {
      console.log('⚠️  Could not reach selling page');
      results.push({ error: 'Navigation failed', url: page.url() });
    }
    
    await releaseBrowser(browser);
    
    return {
      listing: listingName,
      loggedIn: true,
      groups: results,
      note: 'Browser page opened - manual sharing required'
    };
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    await releaseBrowser(browser);
    throw error;
  }
}

async function main() {
  const args = process.argv.slice(2);
  const listing = args[0] || 'F-150';
  
  console.log('🚗 Facebook Marketplace - Share to All Groups\n');
  
  const result = await shareToAllGroups(listing);
  console.log('\n📊 Result:', JSON.stringify(result, null, 2));
}

if (require.main === module) {
  main().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
}

module.exports = { shareToAllGroups };
