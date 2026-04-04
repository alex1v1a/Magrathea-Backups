const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

/**
 * HEB Cart - Direct Extension Control
 * Opens extension popup and automates it
 */

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const EDGE_USER_DATA = 'C:\\Users\\Admin\\AppData\\Local\\Microsoft\\Edge\\User Data';
const DATA_DIR = path.join(__dirname, '..', 'data');

// Common HEB extension IDs
const HEB_EXTENSIONS = [
  'jfmocbgdjlbepjfgbpfdngjojobnhiff', // HEB Buddy
  'heb-shopping-assistant',
  'heb-extension',
  'heb-cart-helper'
];

function loadItems() {
  try {
    const data = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'heb-extension-items.json'), 'utf8'));
    return data.items || [];
  } catch (e) {
    return [];
  }
}

async function findHEBExtension(context) {
  // Try to get extension pages
  const pages = context.pages();
  
  for (const page of pages) {
    const url = page.url();
    if (url.includes('extension') || url.includes('heb')) {
      console.log('Found extension page:', url);
      return page;
    }
  }
  
  return null;
}

async function main() {
  console.log('🛒 HEB Cart - Direct Extension Control\n');
  
  const items = loadItems();
  console.log(`📋 ${items.length} items ready\n`);
  
  const context = await chromium.launchPersistentContext(EDGE_USER_DATA, {
    headless: false,
    executablePath: EDGE_PATH,
    args: [
      '--start-maximized',
      '--enable-extensions',
      '--load-extension=' // Enable all extensions
    ]
  });
  
  const page = context.pages()[0] || await context.newPage();
  
  try {
    console.log('🌐 Opening HEB.com...');
    await page.goto('https://www.heb.com');
    await page.waitForTimeout(5000);
    
    console.log('✅ HEB loaded');
    console.log('🔍 Checking for HEB extension...\n');
    
    // Look for extension indicator
    const extIndicator = await page.locator('img[src*="extension"], div[id*="extension"]').first();
    if (await extIndicator.isVisible().catch(() => false)) {
      console.log('✅ Extension indicator found');
    }
    
    // Try to open extension via keyboard shortcut or toolbar
    console.log('🖱️  Looking for extension button...');
    
    // Inject a script that looks for extension-added elements
    await page.evaluate(() => {
      // Find any element that might be from the HEB extension
      const extElements = document.querySelectorAll('[id*="heb"], [class*="heb"], [data-extension]');
      if (extElements.length > 0) {
        console.log('Extension elements found:', extElements.length);
        extElements.forEach((el, i) => console.log(i, el.id || el.className));
      }
    });
    
    // Create an auto-clicking script
    console.log('\n🤖 Setting up auto-clicker...');
    await page.evaluate((items) => {
      window.marvinCart = {
        items: items,
        current: 0,
        
        async addAll() {
          for (const item of this.items) {
            console.log('Adding:', item.name);
            
            // Search
            const search = document.querySelector('input[name="q"], input[placeholder*="Search"]');
            if (search) {
              search.value = item.searchTerm;
              search.dispatchEvent(new Event('input', { bubbles: true }));
              
              const form = search.closest('form');
              if (form) {
                form.dispatchEvent(new Event('submit', { bubbles: true }));
              }
            }
            
            await new Promise(r => setTimeout(r, 4000));
            
            // Click first Add button
            const addBtn = document.querySelector('button:contains("Add"), button[data-testid*="add"]');
            if (addBtn) addBtn.click();
            
            await new Promise(r => setTimeout(r, 3000));
          }
          
          // Go to cart
          window.location.href = '/cart';
        }
      };
      
      // Start after 5 seconds
      setTimeout(() => window.marvinCart.addAll(), 5000);
    }, items);
    
    console.log('⏳ Auto-adder starting in 5 seconds...');
    console.log('   Items will be added automatically.\n');
    
    // Wait for completion
    await page.waitForTimeout(items.length * 8000);
    
    console.log('✅ Process complete');
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

main().catch(console.error);
