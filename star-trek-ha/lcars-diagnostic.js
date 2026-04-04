// ==========================================
// LCARS Diagnostic Tool
// Run in browser console (F12) on HA page
// ==========================================

console.log('🔍 LCARS Diagnostic Tool');
console.log('========================');

// Check if card-mod is loaded
const cardMod = document.querySelector('script[src*="card-mod"]');
console.log('✓ card-mod loaded:', !!cardMod);
if (cardMod) console.log('  Source:', cardMod.src);

// Check if lcars.js is loaded  
const lcars = document.querySelector('script[src*="lcars"]');
console.log('✓ lcars.js loaded:', !!lcars);
if (lcars) console.log('  Source:', lcars.src);

// Check Antonio font
const antonio = document.querySelector('link[href*="Antonio"]');
console.log('✓ Antonio font loaded:', !!antonio);

// Check current theme
const theme = localStorage.getItem('selectedTheme');
console.log('✓ Selected theme:', theme || 'default');

// Check if card-mod styles are applied
const cards = document.querySelectorAll('ha-card');
console.log('✓ Number of cards found:', cards.length);

// Sample a button card
const btnCard = document.querySelector('ha-card:has(button)');
if (btnCard) {
  const style = window.getComputedStyle(btnCard);
  console.log('✓ Sample button styles:');
  console.log('  Background:', style.backgroundColor);
  console.log('  Border radius:', style.borderRadius);
  console.log('  Font family:', style.fontFamily);
}

console.log('\n📋 FIX INSTRUCTIONS:');
console.log('1. Settings → Dashboards → ⋮ → Resources');
console.log('2. Add Resource: /local/community/lovelace-card-mod/card-mod.js (JS Module)');
console.log('3. Add Resource: /local/community/ha-lcars/lcars.js (JS Module)');
console.log('4. Click profile name (bottom left) → Theme → LCARS Default');
console.log('5. Ctrl+F5 to hard refresh');
