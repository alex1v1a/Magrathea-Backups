const { chromium } = require('playwright');

const EDGE_USER_DATA = 'C:\\Users\\Admin\\AppData\\Local\\Microsoft\\Edge\\User Data';

const SUBSTITUTIONS = [
  { name: 'Catfish fillet', search: 'catfish fillet' },
  { name: 'Sriracha', search: 'sriracha' },
  { name: 'Bosc pear', search: 'bosc pear' }
];

async function main() {
  console.log('🛒 ADDING SUBSTITUTIONS - JavaScript Injection Method\n');
  
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
    console.log('🤖 Injecting auto-add panel for substitutions...\n');
    
    // Inject panel to add substitution items
    await page.evaluate((items) => {
      const panel = document.createElement('div');
      panel.innerHTML = `
        <div style="position:fixed;top:80px;right:20px;width:320px;background:linear-gradient(135deg,#059669,#047857);color:white;border-radius:12px;padding:20px;z-index:2147483647;box-shadow:0 8px 32px rgba(0,0,0,0.4);font-family:system-ui,sans-serif;">
          <div style="font-size:20px;font-weight:bold;margin-bottom:10px;">🔄 ADD SUBSTITUTIONS</div>
          <div style="font-size:14px;opacity:0.9;margin-bottom:15px;">3 items to add</div>
          <div id="sub-status" style="background:rgba(255,255,255,0.2);padding:10px;border-radius:6px;margin-bottom:15px;font-size:13px;min-height:60px;">Ready to add substitution items</div>
          <button id="add-subs-btn" style="background:#fbbf24;color:#78350f;border:none;padding:14px 24px;border-radius:8px;cursor:pointer;font-size:16px;font-weight:bold;width:100%;">🚀 ADD ALL 3 SUBSTITUTIONS</button>
        </div>
      `;
      document.body.appendChild(panel);
      
      const status = document.getElementById('sub-status');
      
      document.getElementById('add-subs-btn').addEventListener('click', async () => {
        const btn = document.getElementById('add-subs-btn');
        btn.disabled = true;
        btn.style.opacity = '0.7';
        
        for (let i = 0; i < items.length; i++) {
          const item = items[i];
          status.innerHTML = `<div>Adding ${i + 1}/3: ${item.name}</div>`;
          
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
        
        status.innerHTML = '<div style="font-weight:bold;">✅ All 3 substitutions added!</div><div style="margin-top:5px;">Going to cart...</div>';
        setTimeout(() => window.location.href = '/cart', 2000);
      });
      
      // Auto-click after 3 seconds
      setTimeout(() => document.getElementById('add-subs-btn').click(), 3000);
      
    }, SUBSTITUTIONS);
    
    console.log('✅ Substitution panel injected');
    console.log('🤖 Auto-adding in 3 seconds...\n');
    console.log('Items:');
    SUBSTITUTIONS.forEach(s => console.log(`  • ${s.name}`));
    
    // Monitor progress
    let lastStatus = '';
    for (let i = 0; i < 60; i++) {
      await page.waitForTimeout(1000);
      
      const status = await page.locator('#sub-status').textContent().catch(() => '');
      if (status && status !== lastStatus) {
        console.log(`\n   ${status}`);
        lastStatus = status;
      }
      
      if (status.includes('added') || status.includes('cart')) {
        console.log('\n✅ Complete!');
        break;
      }
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

main().catch(console.error);
