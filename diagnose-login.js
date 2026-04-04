// Test script - Run this in console on heb.com when logged in
(function diagnoseLogin() {
  console.log('=== HEB Login Diagnosis ===\n');
  
  // Check 1: Account menu
  const accountMenu = document.querySelector('[data-testid="account-menu"], a[href*="/account"], [data-automation-id*="account"]');
  console.log('1. Account menu element:', accountMenu ? 'FOUND' : 'NOT FOUND');
  if (accountMenu) {
    console.log('   Text:', accountMenu.textContent.trim().substring(0, 50));
  }
  
  // Check 2: Sign In button
  const signInBtn = document.querySelector('a[href*="login"], button[data-testid*="signin"], [data-automation-id*="signin"]');
  console.log('2. Sign In button:', signInBtn ? 'VISIBLE (not logged in)' : 'NOT FOUND (likely logged in)');
  
  // Check 3: Cart with badge
  const cartBadge = document.querySelector('[data-testid*="cart"] [data-testid*="badge"], .cart-count, [data-automation-id*="cart-count"]');
  console.log('3. Cart badge:', cartBadge ? `FOUND (count: ${cartBadge.textContent})` : 'NOT FOUND');
  
  // Check 4: All add-to-cart buttons
  const allButtons = document.querySelectorAll('button[data-testid*="add-to-cart"]');
  const loggedOutButtons = document.querySelectorAll('button[data-testid*="logged-out-add-to-cart"]');
  const realButtons = document.querySelectorAll('button[data-testid*="add-to-cart"]:not([data-testid*="logged-out"])');
  
  console.log('4. Add to Cart buttons:');
  console.log('   Total:', allButtons.length);
  console.log('   Logged-out variant:', loggedOutButtons.length);
  console.log('   Real (no logged-out):', realButtons.length);
  
  // Check 5: User name/avatar
  const userName = document.querySelector('[data-testid*="user"], .user-name, [data-automation-id*="user"]');
  const avatar = document.querySelector('img[alt*="avatar"], [data-testid*="avatar"]');
  console.log('5. User indicators:');
  console.log('   User name element:', userName ? `FOUND: "${userName.textContent.trim()}"` : 'NOT FOUND');
  console.log('   Avatar:', avatar ? 'FOUND' : 'NOT FOUND');
  
  // Recommendation
  console.log('\n=== Diagnosis ===');
  if (accountMenu && !signInBtn) {
    console.log('✅ You APPEAR to be logged in (account menu visible, no sign in button)');
    
    if (realButtons.length === 0 && loggedOutButtons.length > 0) {
      console.log('⚠️  BUT: Only logged-out buttons found!');
      console.log('   → Try refreshing the page (F5)');
      console.log('   → Or navigate to a product page and check buttons there');
    } else if (realButtons.length > 0) {
      console.log('✅ Real add buttons found! Extension should work.');
    }
  } else if (signInBtn) {
    console.log('❌ Sign in button visible - you are NOT logged in');
  }
})();
