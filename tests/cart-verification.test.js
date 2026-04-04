/**
 * Cart Verification Tests
 * Tests for cart manipulation and verification logic
 */

const { TestRunner } = require('./test-runner');
const runner = new TestRunner();

// Mock cart and meal plan data
const mockMealPlan = {
  weekOf: '2025-02-10',
  meals: [
    {
      day: 'Monday',
      name: 'Pork Tenderloin with Brussels Sprouts',
      ingredients: [
        { name: 'Pork tenderloin', amount: '1.5 lbs' },
        { name: 'Brussels sprouts', amount: '1.5 lbs' },
        { name: 'Dijon mustard', amount: '2 tbsp' }
      ]
    },
    {
      day: 'Tuesday',
      name: 'Turkey Chili',
      ingredients: [
        { name: 'Ground turkey', amount: '1.5 lbs' },
        { name: 'Black beans', amount: '1 can' },
        { name: 'Diced tomatoes', amount: '1 can' }
      ]
    }
  ]
};

const mockCart = {
  items: [
    { id: 'item1', name: 'Pork Tenderloin', quantity: 1, unit: 'each', inCart: true },
    { id: 'item2', name: 'Fresh Brussels Sprouts', quantity: 1.5, unit: 'lbs', inCart: true },
    { id: 'item3', name: 'Ground Turkey 93/7', quantity: 1, unit: 'each', inCart: true }
  ],
  lastUpdated: new Date().toISOString()
};

// Cart verification functions (extracted for testing)
function normalizeItemName(name) {
  return name.toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function findMatchingCartItem(ingredient, cartItems) {
  const normalizedIngredient = normalizeItemName(ingredient.name);
  
  return cartItems.find(item => {
    const normalizedItem = normalizeItemName(item.name);
    // Check for substring match or similarity
    return normalizedItem.includes(normalizedIngredient) ||
           normalizedIngredient.includes(normalizedItem) ||
           calculateSimilarity(normalizedItem, normalizedIngredient) > 0.7;
  });
}

function calculateSimilarity(str1, str2) {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;
  
  if (longer.length === 0) return 1.0;
  
  const costs = [];
  for (let i = 0; i <= shorter.length; i++) {
    let lastValue = i;
    for (let j = 0; j <= longer.length; j++) {
      if (i === 0) {
        costs[j] = j;
      } else if (j > 0) {
        let newValue = costs[j - 1];
        if (shorter[i - 1] !== longer[j - 1]) {
          newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
        }
        costs[j - 1] = lastValue;
        lastValue = newValue;
      }
    }
    if (i > 0) costs[longer.length] = lastValue;
  }
  
  return (longer.length - costs[longer.length]) / longer.length;
}

function verifyCart(mealPlan, cart) {
  const required = [];
  const found = [];
  const missing = [];

  mealPlan.meals.forEach(meal => {
    meal.ingredients.forEach(ingredient => {
      required.push({
        meal: meal.day,
        ...ingredient
      });

      const match = findMatchingCartItem(ingredient, cart.items);
      if (match) {
        found.push({
          ingredient: ingredient.name,
          cartItem: match.name,
          matched: true
        });
      } else {
        missing.push({
          meal: meal.day,
          ingredient: ingredient.name,
          amount: ingredient.amount
        });
      }
    });
  });

  return {
    totalRequired: required.length,
    found: found.length,
    missing: missing.length,
    missingItems: missing,
    matchRate: required.length > 0 ? (found.length / required.length) : 0,
    complete: missing.length === 0
  };
}

function addItemToCart(cart, newItem) {
  const existingIndex = cart.items.findIndex(item => 
    normalizeItemName(item.name) === normalizeItemName(newItem.name)
  );

  if (existingIndex >= 0) {
    cart.items[existingIndex].quantity += newItem.quantity || 1;
    cart.items[existingIndex].updatedAt = new Date().toISOString();
  } else {
    cart.items.push({
      ...newItem,
      id: `item_${Date.now()}`,
      addedAt: new Date().toISOString()
    });
  }

  cart.lastUpdated = new Date().toISOString();
  return cart;
}

function removeItemFromCart(cart, itemName) {
  const normalizedName = normalizeItemName(itemName);
  const initialLength = cart.items.length;
  
  cart.items = cart.items.filter(item => 
    !normalizeItemName(item.name).includes(normalizedName) &&
    !normalizedName.includes(normalizeItemName(item.name))
  );

  cart.lastUpdated = new Date().toISOString();
  return {
    cart,
    removed: cart.items.length < initialLength,
    removedCount: initialLength - cart.items.length
  };
}

function clearCart(cart) {
  const itemCount = cart.items.length;
  cart.items = [];
  cart.lastUpdated = new Date().toISOString();
  cart.clearedAt = new Date().toISOString();
  return { cart, clearedCount: itemCount };
}

// Tests
runner.describe('Cart Item Normalization', () => {
  runner.it('normalizes simple item names', () => {
    runner.assertEqual(normalizeItemName('Pork Tenderloin'), 'pork tenderloin');
  });

  runner.it('removes special characters', () => {
    runner.assertEqual(normalizeItemName('Ground Turkey (93/7)'), 'ground turkey 937');
  });

  runner.it('handles extra whitespace', () => {
    runner.assertEqual(normalizeItemName('  Fresh   Brussels   Sprouts  '), 'fresh brussels sprouts');
  });

  runner.it('handles empty strings', () => {
    runner.assertEqual(normalizeItemName(''), '');
  });
});

runner.describe('Item Matching', () => {
  runner.it('finds exact match', () => {
    const match = findMatchingCartItem(
      { name: 'Pork Tenderloin' },
      mockCart.items
    );
    runner.assertTrue(match !== undefined);
    runner.assertEqual(match.name, 'Pork Tenderloin');
  });

  runner.it('finds partial match', () => {
    const match = findMatchingCartItem(
      { name: 'Brussels sprouts' },
      mockCart.items
    );
    runner.assertTrue(match !== undefined);
    runner.assertIncludes(match.name.toLowerCase(), 'brussels');
  });

  runner.it('returns undefined for no match', () => {
    const match = findMatchingCartItem(
      { name: 'Dragon Fruit' },
      mockCart.items
    );
    runner.assertEqual(match, undefined);
  });

  runner.it('calculates string similarity', () => {
    const sim = calculateSimilarity('pork tenderloin', 'pork tender loin');
    runner.assertTrue(sim > 0.8);
  });
});

runner.describe('Cart Verification', () => {
  runner.it('verifies complete cart correctly', () => {
    const result = verifyCart(mockMealPlan, mockCart);
    runner.assertObjectHas(result, 'totalRequired');
    runner.assertObjectHas(result, 'found');
    runner.assertObjectHas(result, 'missing');
    runner.assertObjectHas(result, 'matchRate');
  });

  runner.it('identifies missing items', () => {
    const result = verifyCart(mockMealPlan, mockCart);
    runner.assertTrue(result.missing > 0);
    runner.assertTrue(result.missingItems.some(item => 
      item.ingredient === 'Dijon mustard'
    ));
  });

  runner.it('calculates match rate correctly', () => {
    const result = verifyCart(mockMealPlan, mockCart);
    runner.assertTrue(result.matchRate >= 0 && result.matchRate <= 1);
    runner.assertApprox(result.matchRate, result.found / result.totalRequired, 0.01);
  });

  runner.it('marks incomplete when items missing', () => {
    const result = verifyCart(mockMealPlan, mockCart);
    runner.assertFalse(result.complete);
  });
});

runner.describe('Cart Manipulation', () => {
  runner.it('adds new item to cart', () => {
    const testCart = { items: [...mockCart.items], lastUpdated: mockCart.lastUpdated };
    const newCart = addItemToCart(testCart, { name: 'Avocado', quantity: 2 });
    runner.assertTrue(newCart.items.some(item => item.name === 'Avocado'));
    runner.assertEqual(newCart.items.length, mockCart.items.length + 1);
  });

  runner.it('increments quantity for existing item', () => {
    const testCart = { items: [{id: 'item1', name: 'Pork Tenderloin', quantity: 1, unit: 'each', inCart: true}], lastUpdated: new Date().toISOString() };
    const newCart = addItemToCart(testCart, { name: 'Pork Tenderloin', quantity: 1 });
    const item = newCart.items.find(i => i.name === 'Pork Tenderloin');
    runner.assertTrue(item.quantity > 1);
  });

  runner.it('removes item from cart', () => {
    const testCart = { items: [
      {id: 'item1', name: 'Pork Tenderloin', quantity: 1, unit: 'each', inCart: true},
      {id: 'item2', name: 'Fresh Brussels Sprouts', quantity: 1.5, unit: 'lbs', inCart: true}
    ], lastUpdated: new Date().toISOString() };
    const result = removeItemFromCart(testCart, 'Pork Tenderloin');
    runner.assertTrue(result.removed);
    runner.assertEqual(result.cart.items.length, 1);
  });

  runner.it('handles remove of non-existent item', () => {
    const testCart = { items: [{id: 'item1', name: 'Pork Tenderloin', quantity: 1, unit: 'each', inCart: true}], lastUpdated: new Date().toISOString() };
    const result = removeItemFromCart(testCart, 'Dragon Fruit');
    runner.assertFalse(result.removed);
    runner.assertEqual(result.removedCount, 0);
  });

  runner.it('clears entire cart', () => {
    const testCart = { items: [
      {id: 'item1', name: 'Pork Tenderloin', quantity: 1, unit: 'each', inCart: true},
      {id: 'item2', name: 'Fresh Brussels Sprouts', quantity: 1.5, unit: 'lbs', inCart: true}
    ], lastUpdated: new Date().toISOString() };
    const result = clearCart(testCart);
    runner.assertEqual(result.cart.items.length, 0);
    runner.assertEqual(result.clearedCount, 2);
    runner.assertObjectHas(result.cart, 'clearedAt');
  });
});

runner.describe('Edge Cases', () => {
  runner.it('handles empty cart', () => {
    const emptyCart = { items: [], lastUpdated: new Date().toISOString() };
    const result = verifyCart(mockMealPlan, emptyCart);
    runner.assertEqual(result.found, 0);
    runner.assertEqual(result.missing, result.totalRequired);
    runner.assertEqual(result.matchRate, 0);
  });

  runner.it('handles empty meal plan', () => {
    const emptyPlan = { weekOf: '2025-02-10', meals: [] };
    const result = verifyCart(emptyPlan, mockCart);
    runner.assertEqual(result.totalRequired, 0);
    runner.assertEqual(result.matchRate, 0);
    runner.assertTrue(result.complete);
  });

  runner.it('handles null/undefined inputs gracefully', () => {
    runner.assertThrows(() => verifyCart(null, mockCart), 'Should throw for null plan');
    runner.assertThrows(() => verifyCart(mockMealPlan, null), 'Should throw for null cart');
  });
});

// Run tests
runner.run().then(success => {
  process.exit(success ? 0 : 1);
});
