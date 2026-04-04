const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');

function loadItems() {
  try {
    return JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'heb-extension-items.json'), 'utf8')).items || [];
  } catch (e) { return []; }
}

async function main() {
  const items = loadItems();
  console.log('🛒 HEB Cart - Direct Page Automation\n');
  console.log(`📋 ${items.length} items\n`);
  
  // Use Edge with clean profile
  const context = await chromium.launch({
    headless: false,
    executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    args: ['--start-maximized'],
    viewport: { width: 1920, height: 1080 }
  });
  
  const page = await context.newPage();
  await page.goto('https://www.heb.com');
  await page.waitForTimeout(5000);
  
  console.log('✅ HEB loaded');
  console.log('🤖 Injecting auto-cart panel...\n');
  
  // Inject the automation panel
  await page.evaluate((items) => {
    // Create floating panel
    const panel = document.createElement('div');
    panel.id = 'marvin-cart-panel';
    panel.style.cssText = `
      position: fixed;
      top: 80px;
      right: 20px;
      width: 320px;
      background: linear-gradient(135deg, #dc2626, #b91c1c);
      color: white;
      border-radius: 12px;
      padding: 20px;
      z-index: 2147483647;
      box-shadow: 0 8px 32px rgba(0,0,0,0.4);
      font-family: system-ui, -apple-system, sans-serif;
    `;
    
    panel.innerHTML = `
      <div style="font-size: 20px; font-weight: bold; margin-bottom: 10px;">🛒 Marvin Auto-Cart</div>
      <div style="font-size: 14px; margin-bottom: 15px; opacity: 0.9;">${items.length} items ready to add</div>
      <button id="marvin-add-btn" style="
        background: white;
        color: #dc2626;
        border: none;
        padding: 14px 24px;
        border-radius: 8px;
        cursor: pointer;
        font-size: 16px;
        font-weight: bold;
        width: 100%;
        box-shadow: 0 2px 8px rgba(0,0,0,0.2);
      ">🚀 ADD ALL ITEMS</button>
      <div id="marvin-progress" style="margin-top: 12px; font-size: 13px; min-height: 20px;">Click button to start</div>
      <div style="margin-top: 10px; font-size: 11px; opacity: 0.8;">Items: ${items.slice(0,3).map(i=>i.name).join(', ')}, ...</div>
    `;
    
    document.body.appendChild(panel);
    
    // Auto-click after 3 seconds
    setTimeout(() => {
      const btn = document.getElementById('marvin-add-btn');
      if (btn) {
        btn.style.background = '#fbbf24';
        btn.textContent = '🚀 ADDING ITEMS...';
        btn.click();
      }
    }, 3000);
    
    // Handle the add process
    document.getElementById('marvin-add-btn').addEventListener('click', async () => {
      const progress = document.getElementById('marvin-progress');
      const btn = document.getElementById('marvin-add-btn');
      
      btn.disabled = true;
      btn.style.opacity = '0.7';
      
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        progress.textContent = `Adding ${i + 1}/${items.length}: ${item.name}...`;
        
        try {
          // Find and use search
          const search = document.querySelector('input[type="search"], input[name="q"], input[placeholder*="Search"]');
          if (search) {
            search.value = item.searchTerm;
            search.dispatchEvent(new Event('input', { bubbles: true }));
            search.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
            
            await new Promise(r => setTimeout(r, 4000));
            
            // Try multiple add button selectors
            const addSelectors = [
              'button:has-text("Add")',
              '[data-testid*="add"]',
              'button.add-to-cart',
              'button[data-automation-id*="add"]'
            ];
            
            for (const sel of addSelectors) {
              const btn = document.querySelector(sel);
              if (btn) {
                btn.click();
                await new Promise(r => setTimeout(r, 3000));
                break;
              }
            }
          }
        } catch (e) {}
        
        await new Promise(r => setTimeout(r, 2000));
      }
      
      progress.textContent = '✅ All items added! Going to cart...';
      btn.textContent = '✅ DONE';
      btn.style.background = '#22c55e';
      
      setTimeout(() => {
        window.location.href = '/cart';
      }, 2000);
    });
  }, items);
  
  console.log('✅ Auto-cart panel injected!');
  console.log('🤖 Will auto-click "ADD ALL ITEMS" in 3 seconds...\n');
  console.log('   Do not interact with the browser.\n');
  
  // Monitor progress
  let lastStatus = '';
  for (let i = 0; i < 300; i++) {
    await page.waitForTimeout(1000);
    
    const status = await page.locator('#marvin-progress').textContent().catch(() => '');
    if (status && status !== lastStatus) {
      console.log(`   ${status}`);
      lastStatus = status;
    }
    
    if (status.includes('DONE') || status.includes('cart')) {
      console.log('\n✅ Process complete!');
      break;
    }
  }
  
  // Check cart
  await page.goto('https://www.heb.com/cart');
  await page.waitForTimeout(5000);
  
  const cartItems = await page.locator('.cart-item, [data-testid*="cart-item"]').count().catch(() => 0);
  console.log(`\n📦 Items in cart: ${cartItems}`);
  
  if (cartItems > 0) {
    console.log(`✅ SUCCESS! ${cartItems} items added!`);
  } else {
    console.log('⚠️  Cart may be empty - check browser');
  }
  
  console.log('\n⏳ Browser staying open');
  await new Promise(() => {});
}

main().catch(console.error);
