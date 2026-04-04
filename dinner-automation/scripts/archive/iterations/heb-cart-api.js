const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

/**
 * HEB Cart - API Method
 * Makes direct cart API calls like the extension would
 */

const DATA_DIR = path.join(__dirname, '..', 'data');

function loadItems() {
  try {
    const data = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'heb-extension-items.json'), 'utf8'));
    return data.items || [];
  } catch (e) {
    return [];
  }
}

async function getProductId(searchTerm) {
  try {
    // HEB search API
    const response = await axios.get(`https://www.heb.com/search/?q=${encodeURIComponent(searchTerm)}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml'
      },
      timeout: 10000
    });
    
    // Extract product ID from HTML
    const match = response.data.match(/"productId":"(\d+)"/);
    return match ? match[1] : null;
  } catch (e) {
    return null;
  }
}

async function addToCartAPI(productId, quantity = 1) {
  try {
    // This would need the actual HEB cart API endpoint
    // Which requires authentication tokens from the browser
    console.log(`   Would add product ${productId} x${quantity}`);
    return true;
  } catch (e) {
    return false;
  }
}

async function main() {
  console.log('🛒 HEB Cart - API Method\n');
  
  const items = loadItems();
  console.log(`📋 ${items.length} items to process\n`);
  
  // Process first 5 items as test
  const testItems = items.slice(0, 5);
  
  for (const item of testItems) {
    console.log(`🔍 ${item.name} - "${item.searchTerm}"`);
    
    const productId = await getProductId(item.searchTerm);
    
    if (productId) {
      console.log(`   ✅ Found product ID: ${productId}`);
      await addToCartAPI(productId);
    } else {
      console.log(`   ❌ Product not found`);
    }
  }
  
  console.log('\n⚠️  Note: Full cart API requires authentication tokens');
  console.log('   from an active browser session. Opening browser...\n');
  
  // Open browser for manual completion
  const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const EDGE_USER_DATA = 'C:\\Users\\Admin\\AppData\\Local\\Microsoft\\Edge\\User Data';
  
  const { chromium } = require('playwright');
  const context = await chromium.launchPersistentContext(EDGE_USER_DATA, {
    headless: false,
    executablePath: EDGE_PATH,
    args: ['--start-maximized']
  });
  
  const page = context.pages()[0] || await context.newPage();
  await page.goto('https://www.heb.com');
  
  console.log('✅ Browser open. Extension should be available.');
}

main().catch(console.error);
