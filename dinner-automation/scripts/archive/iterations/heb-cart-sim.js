/**
 * HEB Cart Builder - Simulation Mode
 * Generates a cart summary based on weekly meal plan without browser automation
 * This avoids bot detection issues while still providing useful output
 */

const fs = require('fs').promises;
const path = require('path');

// Estimated HEB prices for common ingredients (approximate)
const PRICE_DATABASE = {
  // Seafood
  'tilapia fillet': { price: 7.99, unit: 'lb', size: 1.5 },
  'cod fillet fresh': { price: 12.99, unit: 'lb', size: 1.5 },
  
  // Proteins
  'chicken thighs bone-in': { price: 2.49, unit: 'lb', size: 2 },
  'chicken breast boneless': { price: 4.99, unit: 'lb', size: 2 },
  'ribeye steak thin': { price: 14.99, unit: 'lb', size: 1.5 },
  
  // Produce
  'mango': { price: 1.25, unit: 'each', size: 2 },
  'red onion': { price: 0.89, unit: 'each', size: 2 },
  'jalapeno': { price: 0.15, unit: 'each', size: 2 },
  'lemon': { price: 0.50, unit: 'each', size: 3 },
  'zucchini': { price: 1.29, unit: 'lb', size: 2 },
  'cucumber': { price: 0.79, unit: 'each', size: 2 },
  'tomatoes cherry': { price: 3.49, unit: 'pint', size: 1 },
  'asian pear': { price: 2.49, unit: 'each', size: 1 },
  'green beans fresh': { price: 2.99, unit: 'lb', size: 1 },
  
  // Pantry
  'corn tortillas': { price: 2.99, unit: 'pack', size: 1 },
  'coleslaw mix': { price: 2.49, unit: 'bag', size: 1 },
  'chipotle mayo': { price: 3.99, unit: 'bottle', size: 1 },
  'butter unsalted': { price: 4.99, unit: 'pack', size: 1 },
  'capers': { price: 3.49, unit: 'jar', size: 1 },
  'white wine cooking': { price: 4.99, unit: 'bottle', size: 1 },
  'couscous': { price: 3.99, unit: 'lb', size: 1 },
  'gochujang': { price: 5.99, unit: 'container', size: 1 },
  'jasmine rice': { price: 4.99, unit: 'bag', size: 2 },
  'sesame seeds': { price: 3.99, unit: 'container', size: 1 },
  'kimchi': { price: 6.99, unit: 'jar', size: 1 },
  'feta cheese': { price: 5.99, unit: 'container', size: 1 },
  'quinoa': { price: 6.99, unit: 'bag', size: 2 },
  'hummus': { price: 3.99, unit: 'container', size: 1 },
  
  // Herbs
  'parsley fresh': { price: 1.99, unit: 'bunch', size: 1 },
  'thyme fresh': { price: 2.49, unit: 'bunch', size: 1 },
  'oregano dried': { price: 3.99, unit: 'container', size: 1 },
};

// Default price for unknown items
const DEFAULT_PRICE = 4.99;

/**
 * Build cart from weekly meal plan
 */
async function buildCart(weeklyPlanPath) {
  console.log('🛒 HEB Cart Builder - Simulation Mode');
  console.log('=====================================\\n');
  
  // Load weekly plan
  const weeklyPlan = JSON.parse(await fs.readFile(weeklyPlanPath, 'utf-8'));
  console.log(`📅 Week of: ${weeklyPlan.weekOf}`);
  console.log(`🍽️  Meals planned: ${weeklyPlan.meals.length}\\n`);
  
  const cartItems = [];
  const outOfStock = [];
  let subtotal = 0;
  
  // Process each meal
  for (const meal of weeklyPlan.meals) {
    console.log(`\\n📋 ${meal.day}: ${meal.name}`);
    console.log(`   Category: ${meal.category} | Difficulty: ${meal.difficulty} | Prep: ${meal.prepTime}`);
    
    for (const ingredient of meal.ingredients) {
      const searchTerm = ingredient.hebSearch.toLowerCase();
      const priceInfo = PRICE_DATABASE[searchTerm] || { price: DEFAULT_PRICE, unit: 'item', size: 1 };
      
      const item = {
        name: ingredient.name,
        searchTerm: ingredient.hebSearch,
        amount: ingredient.amount,
        estimatedPrice: priceInfo.price,
        unit: priceInfo.unit,
        quantity: priceInfo.size,
        meal: meal.name,
        day: meal.day,
        inStock: true
      };
      
      const itemTotal = priceInfo.price * priceInfo.size;
      item.totalPrice = itemTotal;
      subtotal += itemTotal;
      
      cartItems.push(item);
      console.log(`   ✓ ${ingredient.name} (${ingredient.amount}) - ~$${itemTotal.toFixed(2)}`);
    }
  }
  
  // Calculate totals
  const taxRate = 0.0825; // Texas tax rate
  const tax = subtotal * taxRate;
  const total = subtotal + tax;
  
  // Check budget
  const budget = weeklyPlan.budget;
  const remainingBudget = budget.allocated - total;
  
  console.log(`\\n\\n💰 CART SUMMARY`);
  console.log(`================`);
  console.log(`Items: ${cartItems.length}`);
  console.log(`Subtotal: $${subtotal.toFixed(2)}`);
  console.log(`Tax (8.25%): $${tax.toFixed(2)}`);
  console.log(`Total: $${total.toFixed(2)}`);
  console.log(`\\n📊 BUDGET`);
  console.log(`Allocated: $${budget.allocated.toFixed(2)}`);
  console.log(`Spent: $${total.toFixed(2)}`);
  console.log(`Remaining: $${remainingBudget.toFixed(2)}`);
  
  if (remainingBudget >= 0) {
    console.log(`✅ Within budget!`);
  } else {
    console.log(`⚠️  Over budget by $${Math.abs(remainingBudget).toFixed(2)}`);
  }
  
  // Create cart summary
  const cartSummary = {
    metadata: {
      generatedAt: new Date().toISOString(),
      store: 'HEB.com (Simulation)',
      weekOf: weeklyPlan.weekOf,
      note: 'Prices are estimates based on typical HEB pricing'
    },
    budget: {
      allocated: budget.allocated,
      estimatedMealCost: budget.estimatedMealCost,
      cartSubtotal: subtotal,
      tax: tax,
      cartTotal: total,
      remaining: remainingBudget,
      withinBudget: remainingBudget >= 0
    },
    items: cartItems,
    outOfStock: outOfStock,
    meals: weeklyPlan.meals.map(m => ({
      day: m.day,
      name: m.name,
      category: m.category,
      difficulty: m.difficulty,
      prepTime: m.prepTime,
      healthy: m.healthy
    }))
  };
  
  // Save cart summary
  const date = new Date().toISOString().split('T')[0];
  const outputPath = path.join(__dirname, '..', 'data', `cart-summary-${date}.json`);
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, JSON.stringify(cartSummary, null, 2));
  console.log(`\\n💾 Cart summary saved to: ${outputPath}`);
  
  return cartSummary;
}

// Main execution
async function main() {
  try {
    const weeklyPlanPath = process.argv[2] || path.join(__dirname, '..', 'data', 'weekly-plan.json');
    const cart = await buildCart(weeklyPlanPath);
    console.log(`\\n✅ Cart building complete!`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

module.exports = { buildCart, PRICE_DATABASE };

// Run if called directly
if (require.main === module) {
  main();
}
