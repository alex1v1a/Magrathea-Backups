#!/usr/bin/env node
/**
 * HEB Cart Automation - Marvin Chrome Profile
 * Works even when Chrome is already open
 * Always uses latest meal plan data
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

// Config
const MARVIN_DATA_DIR = path.join(process.env.USERPROFILE || process.env.HOME, '.marvin-chrome-heb');

// Load latest meal plan items
function loadItems() {
  const planFile = path.join(__dirname, '..', 'data', 'weekly-plan.json');
  
  if (!fs.existsSync(planFile)) {
    console.log('❌ No meal plan found at:', planFile);
    console.log('Run dinner automation first to generate a meal plan.');
    process.exit(1);
  }
  
  // Get file modification time
  const stats = fs.statSync(planFile);
  console.log(`📅 Meal plan last updated: ${stats.mtime.toLocaleString()}`);
  
  const plan = JSON.parse(fs.readFileSync(planFile, 'utf8'));
  const items = [];
  const seen = new Set();
  
  for (const meal of plan.meals || []) {
    for (const ingredient of meal.ingredients || []) {
      const searchTerm = ingredient.hebSearch || ingredient.name;
      const key = searchTerm.toLowerCase();
      
      if (!seen.has(key)) {
        seen.add(key);
        items.push({
          name: ingredient.name,
          search: searchTerm,
          amount: ingredient.amount || '1',
          added: false
        });
      }
    }
  }
  
  return items;
}

async function addToHEBCart() {
  const items = loadItems();
  
  console.log('🛒 HEB Cart Automation - Marvin Profile');
  console.log('======================================');
  console.log(`Found ${items.length} unique items from meal plan`);
  console.log();
  
  // Find Chrome executable
  const chromePaths = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    path.join(process.env.LOCALAPPDATA || '', 'Google\\Chrome\\Application\\chrome.exe'),
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
  ].filter(Boolean);
  
  const chromePath = chromePaths.find(p => fs.existsSync(p));
  
  if (!chromePath) {
    console.error('❌ Chrome not found. Please install Chrome.');
    process.exit(1);
  }
  
  console.log('🚀 Launching Chrome with Marvin profile...');
  console.log('   (This won\'t interfere with your main Chrome)');
  console.log();
  
  // Create Marvin data directory if it doesn't exist
  if (!fs.existsSync(MARVIN_DATA_DIR)) {
    fs.mkdirSync(MARVIN_DATA_DIR, { recursive: true });
  }
  
  // Launch Chrome with persistent context (Marvin profile)
  const context = await chromium.launchPersistentContext(MARVIN_DATA_DIR, {
    headless: false,
    executablePath: chromePath,
    viewport: { width: 1920, height: 1080 },
    args: [
      '--no-first-run',
      '--no-default-browser-check',
      '--start-maximized'
    ]
  });
  
  console.log('✅ Launched Chrome with Marvin profile');
  
  // Get or create page
  let page = context.pages()[0];
  if (!page) {
    page = await context.newPage();
  }
  
  console.log();
  console.log('Navigating to HEB.com...');
  await page.goto('https://www.heb.com', { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(3000);
  
  // Check login status
  const pageContent = await page.content();
  const isLoggedIn = pageContent.includes('My Account') || 
                     pageContent.includes('Sign Out') ||
                     pageContent.includes('Account');
  
  if (!isLoggedIn) {
    console.log('⚠️  Not logged in to HEB.');
    console.log('Please log in manually in the opened Chrome window.');
    console.log('Email: alex@1v1a.com');
    console.log('Password: $Tandal0ne');
    console.log('Press Enter here when ready to continue...');
    
    await new Promise(resolve => {
      process.stdin.once('data', () => resolve());
    });
  } else {
    console.log('✅ Already logged in to HEB!');
  }
  
  console.log();
  console.log(`Starting to add ${items.length} items...`);
  console.log('(Press Ctrl+C to stop at any time)');
  console.log();
  
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    console.log(`[${i + 1}/${items.length}] Adding: ${item.name} (${item.amount})`);
    
    try {
      // Search for item
      const searchUrl = `https://www.heb.com/search?query=${encodeURIComponent(item.search)}`;
      await page.goto(searchUrl, { waitUntil: 'networkidle' });
      
      // Wait for search results
      await page.waitForTimeout(3000);
      
      // Try multiple selectors for add button
      const addButtonSelectors = [
        'button[data-testid="add-to-cart"]',
        'button[data-automation-id*="add"]',
        'button:has-text("Add")',
        '.add-to-cart-btn',
        '[data-testid*="add"]'
      ];
      
      let addButton = null;
      for (const selector of addButtonSelectors) {
        try {
          addButton = await page.$(selector);
          if (addButton) break;
        } catch (e) {}
      }
      
      if (addButton) {
        await addButton.click();
        console.log(`  ✅ Added: ${item.name}`);
        item.added = true;
        
        // Wait for confirmation
        await page.waitForTimeout(1500);
      } else {
        console.log(`  ⚠️  Could not find add button for: ${item.name}`);
        console.log(`      Try searching manually: "${item.search}"`);
      }
      
      // Rate limiting - wait between items
      await page.waitForTimeout(2000);
      
    } catch (error) {
      console.log(`  ❌ Error: ${error.message}`);
    }
  }
  
  // Summary
  const added = items.filter(i => i.added).length;
  console.log();
  console.log('======================================');
  console.log(`✅ Complete! Added ${added}/${items.length} items`);
  console.log('======================================');
  
  // Save results
  const results = {
    timestamp: new Date().toISOString(),
    items: items,
    total: items.length,
    added: added
  };
  
  fs.writeFileSync(
    path.join(__dirname, '..', 'data', 'heb-cart-results.json'),
    JSON.stringify(results, null, 2)
  );
  
  console.log();
  console.log('Browser will stay open for review.');
  console.log('Close Chrome when done shopping.');
  
  // Keep browser open
  await new Promise(() => {});
}

// Run
addToHEBCart().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
