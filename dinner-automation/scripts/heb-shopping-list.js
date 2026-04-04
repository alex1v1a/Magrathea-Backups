#!/usr/bin/env node
/**
 * HEB Shopping List Generator
 * Creates a formatted, organized shopping list from weekly meal plan
 * Optimized for fast manual entry into HEB app
 */

const fs = require('fs');
const path = require('path');
// const { sendEmail } = require('../../send-email'); // Email functionality disabled for now

const CONFIG = {
  MEAL_PLAN_PATH: 'dinner-automation/data/weekly-plan.json',
  OUTPUT_PATH: 'dinner-automation/data/heb-shopping-list.txt',
  EMAIL_TO: 'alex@1v1a.com'
};

class HEBShoppingListGenerator {
  constructor() {
    this.mealPlan = null;
  }

  loadMealPlan() {
    try {
      const planPath = path.join(process.cwd(), CONFIG.MEAL_PLAN_PATH);
      if (!fs.existsSync(planPath)) {
        console.log('❌ No weekly plan found');
        return false;
      }
      
      this.mealPlan = JSON.parse(fs.readFileSync(planPath, 'utf8'));
      console.log('✅ Loaded weekly meal plan');
      return true;
    } catch (error) {
      console.error('❌ Error loading meal plan:', error.message);
      return false;
    }
  }

  /**
   * Categorize ingredients by HEB store section for efficient shopping
   */
  categorizeIngredients() {
    const categories = {
      'PRODUCE': [],
      'MEAT & SEAFOOD': [],
      'DAIRY & EGGS': [],
      'BREAD & TORTILLAS': [],
      'PANTRY': [],
      'FROZEN': [],
      'SPICES & HERBS': [],
      'OTHER': []
    };

    if (!this.mealPlan || !this.mealPlan.meals) {
      return categories;
    }

    for (const meal of this.mealPlan.meals) {
      if (!meal.ingredients) continue;

      for (const ing of meal.ingredients) {
        const name = ing.name.toLowerCase();
        const hebSearch = ing.hebSearch || ing.name;
        
        // Determine category
        let category = 'OTHER';
        
        if (/carrot|onion|garlic|pepper|tomato|lettuce|spinach|broccoli|potato|mango|avocado|lime|lemon|cabbage|jalapeno|brussels|sprout|parsley|rosemary|cilantro|ginger|green onion|scallion/.test(name)) {
          category = 'PRODUCE';
        }
        else if (/chicken|beef|pork|steak|fish|cod|salmon|shrimp|meat|tenderloin|flank|thigh|fillet/.test(name)) {
          category = 'MEAT & SEAFOOD';
        }
        else if (/milk|cheese|butter|cream|yogurt|egg/.test(name)) {
          category = 'DAIRY & EGGS';
        }
        else if (/bread|tortilla|naan|roll|bun/.test(name)) {
          category = 'BREAD & TORTILLAS';
        }
        else if (/frozen|ice cream/.test(name)) {
          category = 'FROZEN';
        }
        else if (/salt|pepper|spice|cumin|paprika|oregano|chipotle|powder/.test(name)) {
          category = 'SPICES & HERBS';
        }
        else if (/oil|sauce|vinegar|soy|wine|capers|coconut|chickpeas|curry|paste|mustard|rice|pasta/.test(name)) {
          category = 'PANTRY';
        }

        // Check if already in list
        const existing = categories[category].find(i => i.name.toLowerCase() === ing.name.toLowerCase());
        if (existing) {
          existing.meals.push(meal.day);
        } else {
          categories[category].push({
            name: ing.name,
            amount: ing.amount,
            hebSearch: hebSearch,
            meals: [meal.day]
          });
        }
      }
    }

    return categories;
  }

  /**
   * Generate formatted shopping list
   */
  generateList() {
    if (!this.loadMealPlan()) {
      return null;
    }

    const categories = this.categorizeIngredients();
    const weekOf = this.mealPlan.weekOf || new Date().toISOString().split('T')[0];
    
    let list = [];
    list.push('═══════════════════════════════════════════════');
    list.push('🛒  H-E-B SHOPPING LIST');
    list.push(`📅  Week of: ${weekOf}`);
    list.push('═══════════════════════════════════════════════');
    list.push('');

    // Summary
    let totalItems = 0;
    for (const [cat, items] of Object.entries(categories)) {
      totalItems += items.length;
    }
    
    list.push(`📊 Total Items: ${totalItems}`);
    list.push(`💰 Estimated Budget: $${this.mealPlan.budget?.estimatedMealCost || '---'}`);
    list.push('');

    // List by category
    for (const [category, items] of Object.entries(categories)) {
      if (items.length === 0) continue;

      list.push('─'.repeat(50));
      list.push(`📍 ${category} (${items.length} items)`);
      list.push('─'.repeat(50));

      for (const item of items.sort((a, b) => a.name.localeCompare(b.name))) {
        list.push(`  ☐ ${item.name}`);
        list.push(`     Amount: ${item.amount}`);
        list.push(`     Search: "${item.hebSearch}"`);
        list.push(`     For: ${item.meals.join(', ')}`);
        list.push('');
      }
    }

    list.push('═══════════════════════════════════════════════');
    list.push('📝 NOTES:');
    list.push('• Search exact terms in HEB app for best results');
    list.push('• Check H-E-B brand products first (often cheaper)');
    list.push('• Use curbside pickup to save time');
    list.push('═══════════════════════════════════════════════');

    return list.join('\n');
  }

  /**
   * Save list to file and optionally email
   */
  async saveAndSend(email = false) {
    const listText = this.generateList();
    
    if (!listText) {
      console.log('❌ Failed to generate list');
      return false;
    }

    // Save to file
    const outputPath = path.join(process.cwd(), CONFIG.OUTPUT_PATH);
    fs.writeFileSync(outputPath, listText);
    console.log(`✅ Shopping list saved to: ${CONFIG.OUTPUT_PATH}`);

    // Display
    console.log('\n' + listText);

    // Email if requested
    if (email) {
      console.log('\n📧 Sending email...');
      // Note: Requires email system to be working
      console.log('   (Email functionality pending dinner automation email fix)');
    }

    return true;
  }

  /**
   * Generate compact list for quick copy-paste
   */
  generateCompactList() {
    if (!this.loadMealPlan()) {
      return null;
    }

    const categories = this.categorizeIngredients();
    const weekOf = this.mealPlan.weekOf || new Date().toISOString().split('T')[0];

    let lines = [];
    lines.push(`HEB Shopping List - Week of ${weekOf}`);
    lines.push('');

    for (const [category, items] of Object.entries(categories)) {
      if (items.length === 0) continue;
      lines.push(`${category}:`);
      for (const item of items.sort((a, b) => a.name.localeCompare(b.name))) {
        lines.push(`  • ${item.name} (${item.amount})`);
      }
      lines.push('');
    }

    return lines.join('\n');
  }
}

// CLI
async function main() {
  const generator = new HEBShoppingListGenerator();
  const args = process.argv.slice(2);
  const command = args[0];

  switch (command) {
    case '--generate':
    case '-g':
      await generator.saveAndSend(false);
      break;
    case '--email':
    case '-e':
      await generator.saveAndSend(true);
      break;
    case '--compact':
    case '-c':
      const compact = generator.generateCompactList();
      if (compact) {
        console.log(compact);
        // Copy to clipboard would go here
      }
      break;
    case '--help':
    case '-h':
    default:
      console.log(`
HEB Shopping List Generator

Usage:
  node heb-shopping-list.js [command]

Commands:
  --generate, -g     Generate and save shopping list (default)
  --email, -e        Generate and email the list
  --compact, -c      Generate compact list for copy-paste
  --help, -h         Show this help

Examples:
  node heb-shopping-list.js --generate
  node heb-shopping-list.js --compact
      `);
      break;
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { HEBShoppingListGenerator };
