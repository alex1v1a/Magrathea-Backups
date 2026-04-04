const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

/**
 * Update HEB Extension Meal Plan
 * 
 * This script reads the weekly dinner plan and updates the HEB extension's
 * meal plan accordingly. The extension will then automatically sync the cart.
 * 
 * Usage: node update-heb-meal-plan.js
 */

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function updateMealPlan() {
  console.log('🔄 Updating HEB Meal Plan...\n');
  
  // Read the dinner plan
  const dinnerPlanPath = path.join(__dirname, '..', 'data', 'weekly-dinner-plan.json');
  
  if (!fs.existsSync(dinnerPlanPath)) {
    console.error('❌ Dinner plan not found at:', dinnerPlanPath);
    console.log('Run the dinner plan generator first.');
    process.exit(1);
  }
  
  const dinnerPlan = JSON.parse(fs.readFileSync(dinnerPlanPath, 'utf8'));
  console.log(`Loaded dinner plan for week of ${dinnerPlan.weekOf}`);
  
  // Extract all ingredients from the dinner plan
  const allIngredients = [];
  
  for (const dinner of dinnerPlan.dinners) {
    if (dinner.ingredients) {
      for (const ingredient of dinner.ingredients) {
        allIngredients.push({
          name: ingredient.name,
          searchTerm: ingredient.searchTerm || ingredient.name,
          quantity: ingredient.quantity,
          unit: ingredient.unit
        });
      }
    }
  }
  
  console.log(`Found ${allIngredients.length} ingredients from ${dinnerPlan.dinners.length} dinners`);
  
  // Deduplicate ingredients (keep unique by name)
  const uniqueIngredients = [];
  const seen = new Set();
  
  for (const item of allIngredients) {
    const key = item.name.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      uniqueIngredients.push({
        name: item.name,
        searchTerm: item.searchTerm
      });
    }
  }
  
  console.log(`Deduplicated to ${uniqueIngredients.length} unique items\n`);
  
  // Connect to Edge and update the extension
  console.log('Connecting to Edge browser...');
  
  try {
    // Launch Edge with remote debugging
    const browser = await chromium.launch({
      headless: false,
      executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
      args: ['--remote-debugging-port=9223']
    });
    
    const context = await browser.newContext();
    const page = await context.newPage();
    
    // Navigate to a page where we can execute the extension API
    await page.goto('https://www.heb.com');
    await sleep(3000);
    
    // Execute script to update extension meal plan
    console.log('Updating extension meal plan...');
    
    await page.evaluate((items) => {
      // Send message to extension
      chrome.runtime.sendMessage({
        action: 'updateMealPlan',
        items: items
      }, (response) => {
        console.log('Extension response:', response);
      });
    }, uniqueIngredients);
    
    await sleep(2000);
    
    console.log('\n✅ Meal plan updated successfully!');
    console.log(`   ${uniqueIngredients.length} items will be synced to HEB cart`);
    console.log('\nThe extension will automatically sync on its next scheduled run (every 30 min)');
    console.log('Or you can click "Sync Now" in the extension popup to sync immediately.');
    
    await browser.close();
    
  } catch (error) {
    console.error('\n❌ Error updating meal plan:', error.message);
    console.log('\nAlternative: Update the meal plan manually in the extension popup');
  }
}

// Run if called directly
if (require.main === module) {
  updateMealPlan().catch(console.error);
}

module.exports = { updateMealPlan };
