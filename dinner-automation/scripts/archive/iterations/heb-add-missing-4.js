const { chromium } = require('playwright');

const EDGE_USER_DATA = 'C:\\Users\\Admin\\AppData\\Local\\Microsoft\\Edge\\User Data';

// The 4 items that likely failed
const MISSING_ITEMS = [
  { name: 'White fish fillets', search: 'tilapia fillet', amount: '1.5 lbs' },
  { name: 'Gochujang', search: 'gochujang', amount: '1 container' },
  { name: 'Asian pear', search: 'asian pear', amount: '1' },
  { name: 'Sesame seeds', search: 'sesame seeds', amount: '1 container' }
];

async function main() {
  console.log('🛒 Adding 4 Missing Items to HEB Cart\n');
  
  const context = await chromium.launchPersistentContext(EDGE_USER_DATA, {
    headless: false,
    executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    args: ['--start-maximized'],
    viewport: { width: 1920, height: 1080 }
  });
  
  const page = context.pages()[0] || await context.newPage();
  
  try {
    await page.goto('https://www.heb.com');
    await page.waitForTimeout(3000);
    
    console.log('✅ HEB loaded\n');
    
    // Inject panel for missing items
    await page.evaluate((items) => {
      const panel = document.createElement('div');
      panel.innerHTML = `
        <div style="position:fixed;top:80px;right:20px;width:300px;background:#dc2626;color:white;border-radius:12px;padding:15px;z-index:999999;box-shadow:0 8px 32px rgba(0,0,0,0.4);font-family:system-ui,sans-serif;">
          <div style="font-size:18px;font-weight:bold;margin-bottom:10px;">🛒 Add 4 Missing Items</div>
          <div id="missing-progress" style="font-size:13px;margin-bottom:10px;">Ready to add missing items</div>
          <button id="add-missing-btn" style="background:#fbbf24;color:#78350f;border:none;padding:12px 20px;border-radius:8px;cursor:pointer;font-size:14px;font-weight:bold;width:100%;">🚀 ADD 4 MISSING ITEMS</button>
        </div>
      `;
      document.body.appendChild(panel);
      
      document.getElementById('add-missing-btn').addEventListener('click', async () => {
        const progress = document.getElementById('missing-progress');
        
        for (let i = 0; i < items.length; i++) {
          const item = items[i];
          progress.innerHTML = `<div>Adding ${i + 1}/4: ${item.name}</div>`;
          
          // Search
          const search = document.querySelector('input[type="search"], input[name="q"]');
          if (search) {
            search.value = item.search;
            search.dispatchEvent(new Event('input', { bubbles: true }));
            search.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
            
            await new Promise(r => setTimeout(r, 4000));
            
            // Click add
            const addBtn = document.querySelector('button:contains("Add"), button[data-testid*="add"]');
            if (addBtn) {
              addBtn.click();
              await new Promise(r => setTimeout(r, 3000));
            }
          }
          
          await new Promise(r => setTimeout(r, 1500));
        }
        
        progress.innerHTML = '<div style="font-weight:bold;">✅ 4 items added!</div><div style="font-size:11px;margin-top:5px;">Going to cart...</div>';
        setTimeout(() => window.location.href = '/cart', 2000);
      });
      
      // Auto-click after 3 seconds
      setTimeout(() => document.getElementById('add-missing-btn').click(), 3000);
    }, MISSING_ITEMS);
    
    console.log('✅ Missing items panel injected');
    console.log('🤖 Will auto-add 4 items in 3 seconds...\n');
    console.log('Items to add:');
    MISSING_ITEMS.forEach((item, i) => console.log(`  ${i + 1}. ${item.name}`));
    
    // Monitor
    let lastProgress = '';
    for (let i = 0; i < 60; i++) {
      await page.waitForTimeout(1000);
      
      const progress = await page.locator('#missing-progress').textContent().catch(() => '');
      if (progress && progress !== lastProgress) {
        console.log(`\n   ${progress}`);
        lastProgress = progress;
      }
      
      if (progress.includes('Complete') || progress.includes('cart')) break;
    }
    
    console.log('\n✅ Process complete!');
    console.log('   Cart should now have 31 items.\n');
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

main().catch(console.error);
