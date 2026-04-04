/**
 * Test HEB Add to Cart - Run this in browser console on heb.com
 * 
 * 1. Go to heb.com
 * 2. Login if needed
 * 3. Open DevTools (F12)
 * 4. Click Console tab
 * 5. Paste this entire script and press Enter
 */

(async function testHEB() {
  console.log('🧪 Testing HEB Add to Cart\n');
  
  // Test 1: Check login status
  console.log('Test 1: Checking login status...');
  const loggedOutBtns = document.querySelectorAll('button[data-testid*="logged-out-add-to-cart"]');
  const realAddBtns = document.querySelectorAll('button[data-testid*="add-to-cart"]:not([data-testid*="logged-out"])');
  
  console.log(`  Logged-out buttons: ${loggedOutBtns.length}`);
  console.log(`  Real add buttons: ${realAddBtns.length}`);
  
  if (realAddBtns.length === 0 && loggedOutBtns.length > 0) {
    console.log('  ❌ NOT LOGGED IN - Please login to HEB first');
    return;
  }
  console.log('  ✅ Appears to be logged in\n');
  
  // Test 2: Find search input
  console.log('Test 2: Finding search input...');
  const searchInput = document.querySelector('input[placeholder*="Search" i]');
  if (!searchInput) {
    console.log('  ❌ Search input not found');
    return;
  }
  console.log('  ✅ Search input found\n');
  
  // Test 3: Search for an item
  console.log('Test 3: Searching for "milk"...');
  searchInput.value = 'milk';
  searchInput.dispatchEvent(new Event('input', { bubbles: true }));
  searchInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
  
  await new Promise(r => setTimeout(r, 5000));
  console.log('  ✅ Search submitted, waited 5 seconds\n');
  
  // Test 4: Find add button
  console.log('Test 4: Finding Add to Cart button...');
  const addBtn = document.querySelector('button[data-testid*="add-to-cart"]:not([data-testid*="logged-out"])');
  
  if (!addBtn) {
    console.log('  ❌ No real add button found');
    console.log('  Looking for any add button...');
    const anyBtn = document.querySelector('button[data-testid*="add-to-cart"]');
    if (anyBtn) {
      console.log(`  Found button with data-testid: ${anyBtn.getAttribute('data-testid')}`);
      console.log(`  Button text: "${anyBtn.textContent.trim()}"`);
    }
    return;
  }
  
  console.log(`  ✅ Add button found!`);
  console.log(`     Text: "${addBtn.textContent.trim()}"`);
  console.log(`     data-testid: ${addBtn.getAttribute('data-testid')}`);
  console.log(`     Disabled: ${addBtn.disabled}`);
  console.log(`     Visible: ${addBtn.offsetParent !== null}\n`);
  
  // Test 5: Try to click it
  console.log('Test 5: Clicking Add to Cart button...');
  addBtn.scrollIntoView({ block: 'center' });
  await new Promise(r => setTimeout(r, 500));
  
  addBtn.click();
  console.log('  ✅ Button clicked!');
  console.log('  Check if item was added to cart\n');
  
  // Highlight the button for visual feedback
  addBtn.style.outline = '5px solid lime';
  addBtn.style.outlineOffset = '2px';
  
  console.log('🎉 Test complete!');
  console.log('If the button turned green and item was added, the extension should work.');
  console.log('If not, check the console for errors.');
})();
