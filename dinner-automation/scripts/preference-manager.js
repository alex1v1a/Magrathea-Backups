#!/usr/bin/env node
/**
 * HEB Shopping Preference Manager
 * 
 * Manages organic-first shopping preferences and generates search terms
 * for the HEB cart automation system.
 * 
 * Usage:
 *   node preference-manager.js --list              # Show all preferences
 *   node preference-manager.js --toggle-organic    # Toggle organic-first on/off
 *   node preference-manager.js --search "chicken"  # Get search terms for item
 *   node preference-manager.js --apply-to-cart     # Apply preferences to current cart
 */

const fs = require('fs');
const path = require('path');

const PREFERENCES_FILE = path.join(__dirname, '..', 'data', 'shopping-preferences.json');
const CART_ITEMS_FILE = path.join(__dirname, '..', 'data', 'heb-extension-items.json');

function loadPreferences() {
  try {
    const data = fs.readFileSync(PREFERENCES_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error loading preferences:', error.message);
    process.exit(1);
  }
}

function savePreferences(prefs) {
  try {
    prefs.preferences.lastUpdated = new Date().toISOString();
    fs.writeFileSync(PREFERENCES_FILE, JSON.stringify(prefs, null, 2));
    return true;
  } catch (error) {
    console.error('Error saving preferences:', error.message);
    return false;
  }
}

function loadCartItems() {
  try {
    const data = fs.readFileSync(CART_ITEMS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error loading cart items:', error.message);
    return null;
  }
}

function toggleOrganicFirst() {
  const prefs = loadPreferences();
  const current = prefs.preferences.organicFirst;
  prefs.preferences.organicFirst = !current;
  
  if (savePreferences(prefs)) {
    const status = prefs.preferences.organicFirst ? 'ENABLED' : 'DISABLED';
    console.log(`\n✅ Organic-first preference ${status}`);
    console.log(`   ${prefs.preferences.description}\n`);
  }
}

function getSearchTerms(itemName) {
  const prefs = loadPreferences();
  const itemPrefs = prefs.itemSpecificPreferences;
  
  // Direct match
  if (itemPrefs[itemName]) {
    return itemPrefs[itemName];
  }
  
  // Fuzzy match
  const matches = Object.entries(itemPrefs).filter(([key, value]) => {
    return itemName.toLowerCase().includes(key.toLowerCase()) ||
           key.toLowerCase().includes(itemName.toLowerCase());
  });
  
  if (matches.length > 0) {
    return matches[0][1];
  }
  
  // Default: return with organic prefix if enabled
  if (prefs.preferences.organicFirst) {
    return {
      preferred: `organic ${itemName}`,
      fallback: [itemName],
      avoid: []
    };
  }
  
  return {
    preferred: itemName,
    fallback: [],
    avoid: []
  };
}

function listPreferences() {
  const prefs = loadPreferences();
  
  console.log('\n🛒 HEB Shopping Preferences');
  console.log('═'.repeat(50));
  
  console.log(`\n📋 Organic-First: ${prefs.preferences.organicFirst ? '✅ ENABLED' : '❌ DISABLED'}`);
  console.log(`   ${prefs.preferences.description}`);
  
  console.log('\n📁 Category Priorities:');
  Object.entries(prefs.categoryPreferences).forEach(([category, config]) => {
    console.log(`   • ${category}: ${config.priority.join(' → ')}`);
  });
  
  console.log('\n🏷️ HEB Preferred Brands:');
  const hebBrands = prefs.storeSpecific.HEB.preferredBrands;
  Object.entries(hebBrands).forEach(([category, brands]) => {
    console.log(`   • ${category}: ${brands.join(', ')}`);
  });
  
  console.log('\n📝 Item-Specific Preferences (sample):');
  const samples = Object.entries(prefs.itemSpecificPreferences).slice(0, 5);
  samples.forEach(([item, config]) => {
    console.log(`   • ${item}: ${config.preferred}`);
  });
  console.log(`   ... and ${Object.keys(prefs.itemSpecificPreferences).length - 5} more items`);
  
  console.log('\n💰 Price Settings:');
  console.log(`   • Organic budget multiplier: ${prefs.priceConsiderations.organicBudgetMultiplier}x`);
  console.log(`   • Max organic premium: ${prefs.priceConsiderations.maxOrganicPremiumPercent}%`);
  
  console.log('');
}

function searchItem(query) {
  const prefs = loadPreferences();
  const result = getSearchTerms(query);
  
  console.log(`\n🔍 Search Results for "${query}":`);
  console.log('═'.repeat(50));
  console.log(`   Preferred: ${result.preferred}`);
  console.log(`   Fallbacks: ${result.fallback.join(', ') || 'None'}`);
  if (result.avoid.length > 0) {
    console.log(`   Avoid: ${result.avoid.join(', ')}`);
  }
  
  // Show HEB-specific search terms
  if (prefs.preferences.organicFirst) {
    console.log(`\n   🏪 HEB Search Strategy:`);
    console.log(`      1. Try: "${result.preferred}"`);
    result.fallback.forEach((fallback, i) => {
      console.log(`      ${i + 2}. Try: "${fallback}"`);
    });
  }
  console.log('');
}

function applyPreferencesToCart() {
  const prefs = loadPreferences();
  const cart = loadCartItems();
  
  if (!cart) {
    console.error('❌ No cart items found');
    return;
  }
  
  console.log('\n🛒 Applying Preferences to Current Cart');
  console.log('═'.repeat(50));
  
  let organicCount = 0;
  let totalItems = 0;
  
  Object.entries(cart.shoppingList).forEach(([category, items]) => {
    if (Array.isArray(items)) {
      items.forEach(item => {
        totalItems++;
        if (item.organicPreferred) {
          organicCount++;
        }
        
        // Enhance with search terms if not present
        if (!item.searchTerms && prefs.preferences.organicFirst) {
          const searchConfig = getSearchTerms(item.item);
          item.searchTerms = [searchConfig.preferred, ...searchConfig.fallback];
        }
      });
    }
  });
  
  // Update cart metadata
  cart.organicPreference = {
    enabled: prefs.preferences.organicFirst,
    totalOrganicItems: organicCount,
    totalItems: totalItems,
    preferenceRate: `${Math.round((organicCount / totalItems) * 100)}% organic preferred`
  };
  
  // Save updated cart
  try {
    fs.writeFileSync(CART_ITEMS_FILE, JSON.stringify(cart, null, 2));
    console.log(`✅ Updated ${totalItems} items`);
    console.log(`🌱 ${organicCount} items (${cart.organicPreference.preferenceRate}) set to prefer organic\n`);
  } catch (error) {
    console.error('❌ Error saving cart:', error.message);
  }
}

function generateHEBSearchList() {
  const cart = loadCartItems();
  if (!cart) return;
  
  console.log('\n🏪 HEB Search Terms (Organic-First)');
  console.log('═'.repeat(60));
  console.log('Copy these into the HEB extension or search directly:\n');
  
  Object.entries(cart.shoppingList).forEach(([category, items]) => {
    if (Array.isArray(items) && items.length > 0) {
      console.log(`\n${category.toUpperCase()}:`);
      items.forEach(item => {
        const searchTerms = item.searchTerms || [item.item];
        const primary = searchTerms[0];
        const indicator = item.organicPreferred ? '🌱' : '  ';
        console.log(`  ${indicator} ${primary}`);
        if (searchTerms.length > 1) {
          console.log(`     Fallback: ${searchTerms.slice(1).join(', ')}`);
        }
      });
    }
  });
  
  console.log('\n\n📝 Legend: 🌱 = Organic preferred\n');
}

// Main command handler
const args = process.argv.slice(2);
const command = args[0];

switch (command) {
  case '--list':
  case '-l':
    listPreferences();
    break;
    
  case '--toggle-organic':
  case '-t':
    toggleOrganicFirst();
    break;
    
  case '--search':
  case '-s':
    if (args[1]) {
      searchItem(args[1]);
    } else {
      console.error('Usage: --search <item-name>');
    }
    break;
    
  case '--apply-to-cart':
  case '-a':
    applyPreferencesToCart();
    break;
    
  case '--heb-list':
  case '-h':
    generateHEBSearchList();
    break;
    
  default:
    console.log(`
🛒 HEB Shopping Preference Manager

Usage:
  node preference-manager.js [option]

Options:
  --list, -l              Show all preferences
  --toggle-organic, -t    Toggle organic-first on/off
  --search, -s <item>     Get search terms for item
  --apply-to-cart, -a     Apply preferences to current cart
  --heb-list, -h          Generate HEB search term list

Examples:
  node preference-manager.js --search "chicken breast"
  node preference-manager.js --toggle-organic
  node preference-manager.js --heb-list
`);
}

module.exports = {
  loadPreferences,
  getSearchTerms,
  toggleOrganicFirst
};
