// HEB Cart Clear Bookmarklet
// Run this in browser console at heb.com/cart

javascript:(function(){
  console.log('🗑️ HEB Cart Bulk Clear Starting...');
  let count = 0;
  const removeAll = async () => {
    const buttons = document.querySelectorAll('button[data-testid="remove-item"], button[aria-label*="Remove"]');
    if (buttons.length === 0) {
      console.log(`✅ Cart cleared! Removed ${count} items.`);
      alert(`Cart cleared! Removed ${count} items. You can now run the automation to add exact ingredients.`);
      return;
    }
    for (const btn of buttons) {
      btn.click();
      count++;
      await new Promise(r => setTimeout(r, 300));
    }
    console.log(`Removed batch, total: ${count}...`);
    setTimeout(removeAll, 1000);
  };
  removeAll();
})();
