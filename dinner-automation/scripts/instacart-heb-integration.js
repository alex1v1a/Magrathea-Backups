#!/usr/bin/env node
/**
 * Instacart API Integration for HEB Cart Automation
 * 
 * This script creates shopping lists on Instacart (HEB) from weekly meal plans.
 * Requires Instacart Developer Platform API key.
 */

const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
  BASE_URL: 'https://api.instacart.com/v1',
  RETAILER_ID: 'heb', // HEB retailer ID
  POSTAL_CODE: '78610', // Buda, TX
  COUNTRY_CODE: 'US',
  MEAL_PLAN_PATH: 'dinner-automation/data/weekly-plan.json',
  RECIPE_DB_PATH: 'dinner-automation/data/recipe-database.json',
  SECRETS_PATH: '.secrets/instacart-api.json'
};

class InstacartHEBIntegration {
  constructor() {
    this.apiKey = null;
    this.loadConfig();
  }

  loadConfig() {
    try {
      const secretsPath = path.join(process.cwd(), CONFIG.SECRETS_PATH);
      if (fs.existsSync(secretsPath)) {
        const secrets = JSON.parse(fs.readFileSync(secretsPath, 'utf8'));
        this.apiKey = secrets.api_key;
        console.log('✅ Instacart API configuration loaded');
      } else {
        console.log('⚠️  No Instacart API credentials found');
        console.log('   Apply for access at: https://www.instacart.com/company/api-developer-platform');
        console.log('   Then save credentials to:', CONFIG.SECRETS_PATH);
      }
    } catch (error) {
      console.error('❌ Error loading config:', error.message);
    }
  }

  /**
   * Search for products on HEB via Instacart
   */
  async searchProducts(query, limit = 5) {
    if (!this.apiKey) {
      console.log('❌ API key not configured');
      return null;
    }

    try {
      // Note: This is a mock implementation
      // Replace with actual API call when credentials are available
      console.log(`🔍 Searching Instacart for: "${query}"`);
      
      /* Actual implementation would be:
      const response = await fetch(
        `${CONFIG.BASE_URL}/retailers/${CONFIG.RETAILER_ID}/products/search?` +
        `query=${encodeURIComponent(query)}&limit=${limit}`,
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      if (!response.ok) {
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
      }
      
      return await response.json();
      */

      // Mock response for development
      return {
        products: [
          {
            id: `prod_${query.replace(/\s+/g, '_')}_1`,
            name: `H-E-B ${query}`,
            price: 0.00,
            unit: 'each',
            in_stock: true
          }
        ],
        total: 1
      };
    } catch (error) {
      console.error('❌ Search failed:', error.message);
      return null;
    }
  }

  /**
   * Load weekly meal plan
   */
  loadWeeklyPlan() {
    try {
      const planPath = path.join(process.cwd(), CONFIG.MEAL_PLAN_PATH);
      if (!fs.existsSync(planPath)) {
        console.log('⚠️  No weekly plan found at:', CONFIG.MEAL_PLAN_PATH);
        return null;
      }
      
      const plan = JSON.parse(fs.readFileSync(planPath, 'utf8'));
      console.log('✅ Loaded weekly meal plan');
      return plan;
    } catch (error) {
      console.error('❌ Error loading meal plan:', error.message);
      return null;
    }
  }

  /**
   * Load recipe database
   */
  loadRecipeDatabase() {
    try {
      const dbPath = path.join(process.cwd(), CONFIG.RECIPE_DB_PATH);
      if (!fs.existsSync(dbPath)) {
        console.log('⚠️  No recipe database found');
        return null;
      }
      
      const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
      console.log('✅ Loaded recipe database');
      return db;
    } catch (error) {
      console.error('❌ Error loading recipe database:', error.message);
      return null;
    }
  }

  /**
   * Parse ingredient string like "1.5 lbs cod fillets" into structured data
   */
  parseIngredient(ingText) {
    // Basic parsing - extract quantity, unit, and name
    const match = ingText.match(/^(?:(\d+(?:\.\d+)?)\s*(\w+)?\s*)?(.+)$/i);
    
    if (match) {
      const quantity = parseFloat(match[1]) || 1;
      const unit = match[2] || 'each';
      let name = match[3].trim();
      
      // Clean up common descriptors
      name = name
        .replace(/,\s*.+$/, '') // Remove after comma
        .replace(/\s+\([^)]+\)/, '') // Remove parenthetical notes
        .replace(/\s+(for serving|to taste|optional|drained|rinsed)$/i, '')
        .trim();
      
      // Determine category based on keywords
      let category = 'other';
      const lowerName = name.toLowerCase();
      if (/chicken|beef|pork|steak|fish|cod|salmon|shrimp|meat/.test(lowerName)) category = 'meat_seafood';
      else if (/rice|pasta|noodle|bread|tortilla|flour/.test(lowerName)) category = 'grains';
      else if (/milk|cheese|butter|cream|yogurt|egg/.test(lowerName)) category = 'dairy_eggs';
      else if (/carrot|onion|garlic|pepper|tomato|lettuce|spinach|broccoli|vegetable/.test(lowerName)) category = 'produce';
      else if (/oil|sauce|vinegar|soy|wine|lemon juice|lime juice/.test(lowerName)) category = 'pantry';
      else if (/salt|pepper|spice|herb|cumin|paprika|oregano/.test(lowerName)) category = 'spices';
      
      return { name, quantity, unit, category };
    }
    
    return { name: ingText, quantity: 1, unit: 'each', category: 'other' };
  }

  /**
   * Extract all ingredients from weekly meal plan
   */
  extractIngredients(mealPlan) {
    const ingredients = new Map(); // ingredient -> {quantity, unit, recipes}
    
    if (!mealPlan || !mealPlan.meals) {
      console.log('⚠️  No meals found in plan');
      return ingredients;
    }

    // Handle array format (weekly-plan.json structure)
    for (const meal of mealPlan.meals) {
      if (!meal.name || meal.name === 'None') continue;
      
      const day = meal.day;
      
      if (meal.ingredients) {
        for (const ing of meal.ingredients) {
          const key = ing.name.toLowerCase();
          
          // Determine category based on name
          let category = 'other';
          const lowerName = ing.name.toLowerCase();
          if (/chicken|beef|pork|steak|fish|cod|salmon|shrimp|meat/.test(lowerName)) category = 'meat_seafood';
          else if (/rice|pasta|noodle|bread|tortilla|flour/.test(lowerName)) category = 'grains';
          else if (/milk|cheese|butter|cream|yogurt|egg/.test(lowerName)) category = 'dairy_eggs';
          else if (/carrot|onion|garlic|pepper|tomato|lettuce|spinach|broccoli|vegetable|potato|mango|avocado|lime|lemon|cabbage/.test(lowerName)) category = 'produce';
          else if (/oil|sauce|vinegar|soy|wine|lemon juice|lime juice|mayo|mustard|capers|coconut milk|chickpeas|curry paste/.test(lowerName)) category = 'pantry';
          else if (/salt|pepper|spice|herb|cumin|paprika|oregano|cilantro|parsley|rosemary|ginger|chipotle/.test(lowerName)) category = 'spices';
          
          if (ingredients.has(key)) {
            const existing = ingredients.get(key);
            existing.quantity += 1; // Count occurrences
            existing.recipes.push(day);
          } else {
            ingredients.set(key, {
              name: ing.name,
              quantity: 1,
              amount: ing.amount || '1',
              unit: 'each',
              recipes: [day],
              category: category,
              hebSearch: ing.hebSearch || ing.name
            });
          }
        }
      }
    }

    console.log(`📋 Extracted ${ingredients.size} unique ingredients`);
    return ingredients;
  }

  /**
   * Create shopping list from ingredients
   */
  async createShoppingList(ingredients) {
    if (!this.apiKey) {
      console.log('❌ Cannot create shopping list: API key not configured');
      return null;
    }

    const items = [];
    
    for (const [key, ing] of ingredients) {
      console.log(`➕ Adding: ${ing.name} (${ing.quantity} ${ing.unit})`);
      
      // Search for product
      const searchResults = await this.searchProducts(ing.name, 3);
      
      if (searchResults && searchResults.products && searchResults.products.length > 0) {
        const product = searchResults.products[0]; // Take first match
        items.push({
          product_id: product.id,
          name: product.name,
          quantity: ing.quantity,
          unit: ing.unit,
          category: ing.category
        });
      } else {
        console.log(`   ⚠️  No product found for: ${ing.name}`);
      }
    }

    /* Actual API call would be:
    const response = await fetch(`${CONFIG.BASE_URL}/shopping_lists`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: `Weekly Meal Plan - ${new Date().toLocaleDateString()}`,
        retailer_id: CONFIG.RETAILER_ID,
        items: items.map(item => ({
          product_id: item.product_id,
          quantity: item.quantity
        }))
      })
    });
    
    return await response.json();
    */

    // Mock return
    return {
      id: 'list_' + Date.now(),
      name: `Weekly Meal Plan - ${new Date().toLocaleDateString()}`,
      item_count: items.length,
      items: items,
      checkout_url: `https://www.instacart.com/store/${CONFIG.RETAILER_ID}/checkout?list_id=list_${Date.now()}`
    };
  }

  /**
   * Generate HEB shopping list from current meal plan
   */
  async generateHEBShoppingList() {
    console.log('\n🛒 Instacart HEB Shopping List Generator\n');
    console.log('='.repeat(50));

    // Load data
    const mealPlan = this.loadWeeklyPlan();

    if (!mealPlan) {
      console.log('\n❌ No meal plan available');
      return;
    }

    // Extract ingredients
    const ingredients = this.extractIngredients(mealPlan);
    
    if (ingredients.size === 0) {
      console.log('\n❌ No ingredients found');
      return;
    }

    // Display ingredients
    console.log('\n📋 Ingredients to Shop For:');
    console.log('-'.repeat(50));
    
    const byCategory = new Map();
    for (const [key, ing] of ingredients) {
      const cat = ing.category || 'other';
      if (!byCategory.has(cat)) byCategory.set(cat, []);
      byCategory.get(cat).push(ing);
    }

    for (const [category, items] of byCategory) {
      console.log(`\n${category.toUpperCase()}:`);
      for (const item of items) {
        console.log(`  • ${item.name}: ${item.quantity} ${item.unit}`);
      }
    }

    // Create shopping list if API is configured
    if (this.apiKey) {
      console.log('\n🔄 Creating shopping list on Instacart...');
      const list = await this.createShoppingList(ingredients);
      
      if (list) {
        console.log('\n✅ Shopping list created!');
        console.log(`   Items: ${list.item_count}`);
        console.log(`   Checkout URL: ${list.checkout_url}`);
        
        // Save list locally
        const listPath = path.join(process.cwd(), 'dinner-automation/data/instacart-list.json');
        fs.writeFileSync(listPath, JSON.stringify(list, null, 2));
        console.log(`   Saved to: ${listPath}`);
      }
    } else {
      console.log('\n⚠️  API key not configured - showing ingredients only');
      console.log('   To enable automatic cart creation:');
      console.log('   1. Apply for Instacart API access');
      console.log('   2. Save credentials to .secrets/instacart-api.json');
    }

    console.log('\n' + '='.repeat(50));
  }

  /**
   * Show current configuration status
   */
  showStatus() {
    console.log('\n📊 Instacart HEB Integration Status\n');
    console.log('='.repeat(50));
    
    console.log(`API Key: ${this.apiKey ? '✅ Configured' : '❌ Not configured'}`);
    console.log(`Retailer: HEB (${CONFIG.POSTAL_CODE})`);
    console.log(`Meal Plan: ${fs.existsSync(CONFIG.MEAL_PLAN_PATH) ? '✅ Found' : '❌ Not found'}`);
    console.log(`Recipe DB: ${fs.existsSync(CONFIG.RECIPE_DB_PATH) ? '✅ Found' : '❌ Not found'}`);
    
    if (!this.apiKey) {
      console.log('\n⚠️  To get started:');
      console.log('   1. Visit: https://www.instacart.com/company/api-developer-platform');
      console.log('   2. Apply for API access');
      console.log('   3. Save your API key to .secrets/instacart-api.json');
    }
    
    console.log('\n' + '='.repeat(50));
  }
}

// CLI Interface
async function main() {
  const integration = new InstacartHEBIntegration();
  
  const args = process.argv.slice(2);
  const command = args[0];

  switch (command) {
    case '--status':
      integration.showStatus();
      break;
    case '--generate':
    case '-g':
      await integration.generateHEBShoppingList();
      break;
    case '--search':
      const query = args.slice(1).join(' ');
      if (!query) {
        console.log('Usage: node instacart-heb-integration.js --search "chicken breast"');
        process.exit(1);
      }
      const results = await integration.searchProducts(query);
      console.log('Search results:', JSON.stringify(results, null, 2));
      break;
    case '--help':
    case '-h':
    default:
      console.log(`
Instacart HEB Integration

Usage:
  node instacart-heb-integration.js [command]

Commands:
  --status, -s       Show integration status
  --generate, -g     Generate shopping list from meal plan
  --search "query"   Search for a product
  --help, -h         Show this help

Examples:
  node instacart-heb-integration.js --status
  node instacart-heb-integration.js --generate
  node instacart-heb-integration.js --search "basmati rice"
      `);
      break;
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { InstacartHEBIntegration };
