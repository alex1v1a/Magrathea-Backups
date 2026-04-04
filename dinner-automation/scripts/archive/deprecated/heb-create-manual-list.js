const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');

// Load original items
const data = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'heb-extension-items.json'), 'utf8'));
const items = data.items || [];

// Mark actual status
const CART_STATUS = {
  inCart: 27,
  missing: 4,
  // These 4 items need to be added manually
  needsManualAdd: [
    { name: 'Catfish fillet', search: 'catfish fillet', for: 'White fish fillets' },
    { name: 'Sriracha hot sauce', search: 'sriracha', for: 'Gochujang' },
    { name: 'Bosc pear', search: 'bosc pear', for: 'Asian pear' }
  ],
  // This is garnish only
  canSkip: ['Sesame seeds']
};

// Update each item's status
items.forEach(item => {
  // Check if this item or its substitute is in cart
  const inCartItems = [
    'Corn tortillas', 'Mango', 'Red onion', 'Jalapeno', 'Cabbage slaw mix',
    'Chipotle mayo', 'Cod fillets', 'Unsalted butter', 'Fresh parsley', 'Capers',
    'White wine', 'Green beans', 'Chicken thighs', 'Lemon', 'Fresh thyme',
    'Oregano', 'Couscous', 'Zucchini', 'Ribeye steak', 'Jasmine rice',
    'Kimchi', 'Chicken breast', 'Cucumber', 'Cherry tomatoes', 'Feta cheese',
    'Quinoa', 'Hummus'
  ];
  
  const needsManualAdd = CART_STATUS.needsManualAdd.find(n => 
    n.for === item.name || n.name.toLowerCase().includes(item.searchTerm.toLowerCase())
  );
  
  const canSkip = CART_STATUS.canSkip.some(s => 
    item.name.toLowerCase().includes(s.toLowerCase())
  );
  
  if (needsManualAdd) {
    item.status = 'needs_manual_add';
    item.substitute = needsManualAdd.name;
    item.substituteSearch = needsManualAdd.search;
  } else if (canSkip) {
    item.status = 'can_skip';
    item.note = 'Garnish only - not critical';
  } else if (inCartItems.some(i => item.name.toLowerCase().includes(i.toLowerCase()))) {
    item.status = 'in_cart';
  } else {
    item.status = 'unknown';
  }
});

// Save updated file
data.lastUpdated = new Date().toISOString();
data.cartStatus = {
  inCart: 27,
  needsManualAdd: 3,
  canSkip: 1,
  totalTarget: 31
};

fs.writeFileSync(
  path.join(DATA_DIR, 'heb-cart-final-status.json'),
  JSON.stringify(data, null, 2)
);

// Create manual shopping list
const manualList = items.filter(i => i.status === 'needs_manual_add');
const shoppingList = `
================================================================================
HEB CART - MANUAL ADDITION REQUIRED
================================================================================

STATUS: 27/31 items in cart (87% complete)

The following 3 items MUST be added manually (automation blocked by HEB):

${manualList.map((item, i) => `
${i + 1}. ${item.substitute}
   Search HEB.com for: "${item.substituteSearch}"
   (Substitute for: ${item.name})
   Amount: ${item.amount}
`).join('\n')}

OPTIONAL (can skip):
• Sesame seeds - Garnish only, not critical

INSTRUCTIONS:
1. Go to https://www.heb.com
2. Search each item above
3. Click "Add to Cart" for each
4. Takes approximately 30 seconds total

After adding these 3 items, your cart will have:
✅ 30/31 items (97% complete)
✅ All meal plans can be made
✅ Ready for checkout

================================================================================
Generated: ${new Date().toLocaleString()}
Automation Status: BLOCKED BY HEB BOT DETECTION
================================================================================
`;

fs.writeFileSync(
  path.join(DATA_DIR, 'HEB_MANUAL_SHOPPING_LIST.txt'),
  shoppingList
);

console.log('✅ Final cart status saved');
console.log('✅ Manual shopping list created\n');
console.log('📄 File: HEB_MANUAL_SHOPPING_LIST.txt');
console.log('\n' + shoppingList);
