#!/usr/bin/env node
/**
 * Exclude Manager
 * Manages the excluded ingredients list
 * Provides CRUD operations for exclusions with reasons and substitutes
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const EXCLUDE_FILE = path.join(DATA_DIR, 'excluded-ingredients.json');

class ExcludeManager {
  constructor() {
    this.ensureDataDir();
  }

  ensureDataDir() {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  }

  /**
   * Load excluded ingredients data
   */
  loadExclusions() {
    if (!fs.existsSync(EXCLUDE_FILE)) {
      return { exclusions: {}, version: '1.0', lastUpdated: null, metadata: { totalExclusions: 0 } };
    }
    return JSON.parse(fs.readFileSync(EXCLUDE_FILE, 'utf8'));
  }

  /**
   * Save excluded ingredients data
   */
  saveExclusions(data) {
    data.lastUpdated = new Date().toISOString();
    data.metadata = data.metadata || {};
    data.metadata.totalExclusions = Object.keys(data.exclusions).length;
    fs.writeFileSync(EXCLUDE_FILE, JSON.stringify(data, null, 2));
  }

  /**
   * Add an ingredient to the exclusion list
   * @param {string} ingredient - The ingredient to exclude
   * @param {string} reason - The reason for exclusion (e.g., 'allergy', 'preference', 'dietary')
   * @param {string} substitute - Optional preferred substitute
   * @returns {Object} The added exclusion
   */
  addExclusion(ingredient, reason = 'preference', substitute = null) {
    const data = this.loadExclusions();
    const normalizedIngredient = this.normalizeIngredient(ingredient);
    
    const exclusion = {
      ingredient: normalizedIngredient,
      originalName: ingredient,
      reason: reason,
      substitute: substitute,
      addedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      autoDetected: false,
      source: 'manual'
    };

    // Check if this ingredient is already excluded
    const existingKey = Object.keys(data.exclusions).find(
      key => key.toLowerCase() === normalizedIngredient.toLowerCase()
    );

    if (existingKey) {
      // Update existing
      exclusion.addedAt = data.exclusions[existingKey].addedAt;
      exclusion.updatedAt = new Date().toISOString();
      exclusion.history = data.exclusions[existingKey].history || [];
      exclusion.history.push({
        reason: data.exclusions[existingKey].reason,
        substitute: data.exclusions[existingKey].substitute,
        updatedAt: data.exclusions[existingKey].updatedAt
      });
    }

    data.exclusions[normalizedIngredient] = exclusion;
    this.saveExclusions(data);

    return exclusion;
  }

  /**
   * Add an exclusion from email reply parsing
   * @param {string} ingredient - The ingredient to exclude
   * @param {string} reason - Detected reason from email
   * @param {string} sourceEmail - Email address that requested exclusion
   * @returns {Object} The added exclusion
   */
  addExclusionFromEmail(ingredient, reason, sourceEmail) {
    const data = this.loadExclusions();
    const normalizedIngredient = this.normalizeIngredient(ingredient);
    
    // Check if already excluded
    const existingKey = Object.keys(data.exclusions).find(
      key => key.toLowerCase() === normalizedIngredient.toLowerCase()
    );

    const exclusion = {
      ingredient: normalizedIngredient,
      originalName: ingredient,
      reason: reason || 'preference',
      substitute: null, // Will be filled by substitution engine
      addedAt: existingKey ? data.exclusions[existingKey].addedAt : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      autoDetected: true,
      source: 'email_reply',
      sourceEmail: sourceEmail,
      emailReplies: existingKey ? (data.exclusions[existingKey].emailReplies || []) : []
    };

    exclusion.emailReplies.push({
      email: sourceEmail,
      reason: reason,
      timestamp: new Date().toISOString()
    });

    data.exclusions[normalizedIngredient] = exclusion;
    this.saveExclusions(data);

    return exclusion;
  }

  /**
   * Remove an ingredient from the exclusion list
   * @param {string} ingredient - The ingredient to remove
   * @returns {boolean} True if removed, false if not found
   */
  removeExclusion(ingredient) {
    const data = this.loadExclusions();
    const normalizedIngredient = this.normalizeIngredient(ingredient);
    
    const existingKey = Object.keys(data.exclusions).find(
      key => key.toLowerCase() === normalizedIngredient.toLowerCase()
    );

    if (existingKey) {
      delete data.exclusions[existingKey];
      this.saveExclusions(data);
      return true;
    }
    return false;
  }

  /**
   * Get all excluded ingredients
   * @returns {Object} Map of excluded ingredients
   */
  getAllExclusions() {
    const data = this.loadExclusions();
    return data.exclusions;
  }

  /**
   * Get exclusion details for a specific ingredient
   * @param {string} ingredient - The ingredient to check
   * @returns {Object|null} Exclusion details or null
   */
  getExclusion(ingredient) {
    const data = this.loadExclusions();
    const normalizedIngredient = this.normalizeIngredient(ingredient);
    
    const existingKey = Object.keys(data.exclusions).find(
      key => key.toLowerCase() === normalizedIngredient.toLowerCase()
    );

    return existingKey ? data.exclusions[existingKey] : null;
  }

  /**
   * Check if an ingredient is excluded
   * @param {string} ingredient - The ingredient to check
   * @returns {boolean} True if excluded
   */
  isExcluded(ingredient) {
    return this.getExclusion(ingredient) !== null;
  }

  /**
   * Check if a meal contains excluded ingredients
   * @param {Object} meal - The meal object with ingredients array
   * @returns {Object} Result with hasExcluded boolean and list of excluded ingredients
   */
  checkMealForExcludedIngredients(meal) {
    const excludedIngredients = [];
    const exclusions = this.getAllExclusions();
    const exclusionKeys = Object.keys(exclusions).map(k => k.toLowerCase());

    for (const ingredient of meal.ingredients || []) {
      const ingredientName = ingredient.name || ingredient;
      const normalizedName = this.normalizeIngredient(ingredientName);
      
      // Check direct match
      if (exclusionKeys.includes(normalizedName.toLowerCase())) {
        excludedIngredients.push({
          ingredient: ingredientName,
          matchedExclusion: normalizedName,
          reason: exclusions[normalizedName]?.reason,
          substitute: exclusions[normalizedName]?.substitute
        });
        continue;
      }

      // Check partial matches (e.g., "chicken breast" matches "chicken")
      for (const exclusionKey of exclusionKeys) {
        if (normalizedName.toLowerCase().includes(exclusionKey) || 
            exclusionKey.includes(normalizedName.toLowerCase())) {
          excludedIngredients.push({
            ingredient: ingredientName,
            matchedExclusion: exclusionKey,
            reason: exclusions[exclusionKey]?.reason,
            substitute: exclusions[exclusionKey]?.substitute,
            partialMatch: true
          });
          break;
        }
      }
    }

    return {
      hasExcluded: excludedIngredients.length > 0,
      excludedIngredients: excludedIngredients,
      mealName: meal.name
    };
  }

  /**
   * Update the substitute for an excluded ingredient
   * @param {string} ingredient - The excluded ingredient
   * @param {string} substitute - The new substitute
   * @returns {Object|null} Updated exclusion or null if not found
   */
  updateSubstitute(ingredient, substitute) {
    const data = this.loadExclusions();
    const normalizedIngredient = this.normalizeIngredient(ingredient);
    
    const existingKey = Object.keys(data.exclusions).find(
      key => key.toLowerCase() === normalizedIngredient.toLowerCase()
    );

    if (existingKey) {
      data.exclusions[existingKey].substitute = substitute;
      data.exclusions[existingKey].updatedAt = new Date().toISOString();
      this.saveExclusions(data);
      return data.exclusions[existingKey];
    }
    return null;
  }

  /**
   * Normalize ingredient name for consistent matching
   * @param {string} ingredient - Raw ingredient name
   * @returns {string} Normalized name
   */
  normalizeIngredient(ingredient) {
    if (!ingredient) return '';
    return ingredient
      .toLowerCase()
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/[^\w\s]/g, '')
      .replace(/\s+(fillet|fillets|steak|steaks|breast|breasts|thigh|thighs|chop|chops|ground)\s*/i, '');
  }

  /**
   * Get statistics about exclusions
   * @returns {Object} Statistics
   */
  getStatistics() {
    const data = this.loadExclusions();
    const exclusions = Object.values(data.exclusions);
    
    const byReason = {};
    const bySource = {};
    const withSubstitute = exclusions.filter(e => e.substitute).length;

    for (const exclusion of exclusions) {
      byReason[exclusion.reason] = (byReason[exclusion.reason] || 0) + 1;
      bySource[exclusion.source] = (bySource[exclusion.source] || 0) + 1;
    }

    return {
      totalExclusions: exclusions.length,
      byReason,
      bySource,
      withSubstitute,
      withoutSubstitute: exclusions.length - withSubstitute,
      lastUpdated: data.lastUpdated
    };
  }

  /**
   * Export exclusions to a simple format for meal planning
   * @returns {Object} Simple { ingredient: substitute } map
   */
  exportForMealPlanning() {
    const data = this.loadExclusions();
    const exportMap = {};
    
    for (const [key, exclusion] of Object.entries(data.exclusions)) {
      exportMap[key] = {
        substitute: exclusion.substitute,
        reason: exclusion.reason
      };
    }

    return exportMap;
  }

  /**
   * Import exclusions from external source
   * @param {Array} exclusionsArray - Array of { ingredient, reason, substitute } objects
   */
  importExclusions(exclusionsArray) {
    for (const item of exclusionsArray) {
      this.addExclusion(item.ingredient, item.reason, item.substitute);
    }
  }

  /**
   * Clear all exclusions (use with caution)
   */
  clearAllExclusions() {
    const data = this.loadExclusions();
    data.exclusions = {};
    data.lastUpdated = new Date().toISOString();
    data.metadata = { totalExclusions: 0 };
    this.saveExclusions(data);
  }
}

// CLI interface
if (require.main === module) {
  const manager = new ExcludeManager();
  const args = process.argv.slice(2);
  const command = args[0];

  switch (command) {
    case 'add':
      if (args.length < 2) {
        console.log('Usage: node exclude-manager.js add <ingredient> [reason] [substitute]');
        process.exit(1);
      }
      const result = manager.addExclusion(args[1], args[2], args[3]);
      console.log(`Added exclusion: ${result.ingredient}`);
      console.log(`  Reason: ${result.reason}`);
      console.log(`  Substitute: ${result.substitute || 'None set'}`);
      break;

    case 'remove':
      if (args.length < 2) {
        console.log('Usage: node exclude-manager.js remove <ingredient>');
        process.exit(1);
      }
      if (manager.removeExclusion(args[1])) {
        console.log(`Removed exclusion: ${args[1]}`);
      } else {
        console.log(`Ingredient not found in exclusions: ${args[1]}`);
      }
      break;

    case 'list':
      const exclusions = manager.getAllExclusions();
      console.log('\nExcluded Ingredients:');
      console.log('='.repeat(60));
      for (const [key, exclusion] of Object.entries(exclusions)) {
        console.log(`\n${exclusion.ingredient}`);
        console.log(`  Reason: ${exclusion.reason}`);
        console.log(`  Substitute: ${exclusion.substitute || 'None'}`);
        console.log(`  Added: ${new Date(exclusion.addedAt).toLocaleDateString()}`);
      }
      if (Object.keys(exclusions).length === 0) {
        console.log('No ingredients currently excluded.');
      }
      break;

    case 'check':
      if (args.length < 2) {
        console.log('Usage: node exclude-manager.js check <ingredient>');
        process.exit(1);
      }
      const exclusion = manager.getExclusion(args[1]);
      if (exclusion) {
        console.log(`\n${args[1]} is EXCLUDED`);
        console.log(`  Reason: ${exclusion.reason}`);
        console.log(`  Substitute: ${exclusion.substitute || 'None'}`);
      } else {
        console.log(`\n${args[1]} is NOT excluded`);
      }
      break;

    case 'stats':
      const stats = manager.getStatistics();
      console.log('\nExclusion Statistics:');
      console.log('='.repeat(40));
      console.log(`Total Exclusions: ${stats.totalExclusions}`);
      console.log(`With Substitutes: ${stats.withSubstitute}`);
      console.log(`Without Substitutes: ${stats.withoutSubstitute}`);
      console.log(`\nBy Reason:`);
      for (const [reason, count] of Object.entries(stats.byReason)) {
        console.log(`  ${reason}: ${count}`);
      }
      console.log(`\nBy Source:`);
      for (const [source, count] of Object.entries(stats.bySource)) {
        console.log(`  ${source}: ${count}`);
      }
      break;

    case 'set-substitute':
      if (args.length < 3) {
        console.log('Usage: node exclude-manager.js set-substitute <ingredient> <substitute>');
        process.exit(1);
      }
      const updated = manager.updateSubstitute(args[1], args[2]);
      if (updated) {
        console.log(`Updated substitute for ${args[1]}: ${args[2]}`);
      } else {
        console.log(`Ingredient not found in exclusions: ${args[1]}`);
      }
      break;

    case 'clear':
      if (args.includes('--confirm')) {
        manager.clearAllExclusions();
        console.log('All exclusions cleared.');
      } else {
        console.log('Warning: This will clear ALL exclusions!');
        console.log('Run with --confirm to proceed.');
      }
      break;

    default:
      console.log('Exclude Manager - Manage ingredient exclusions');
      console.log('');
      console.log('Usage: node exclude-manager.js <command> [options]');
      console.log('');
      console.log('Commands:');
      console.log('  add <ingredient> [reason] [substitute]  Add an exclusion');
      console.log('  remove <ingredient>                     Remove an exclusion');
      console.log('  list                                    List all exclusions');
      console.log('  check <ingredient>                      Check if ingredient is excluded');
      console.log('  stats                                   Show statistics');
      console.log('  set-substitute <ingredient> <sub>       Set substitute for exclusion');
      console.log('  clear --confirm                         Clear all exclusions');
      console.log('');
      console.log('Examples:');
      console.log('  node exclude-manager.js add chicken allergy tofu');
      console.log('  node exclude-manager.js add beef preference "ground turkey"');
      console.log('  node exclude-manager.js list');
  }
}

module.exports = ExcludeManager;