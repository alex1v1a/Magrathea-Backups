#!/usr/bin/env node
/**
 * Substitution Engine
 * Finds and manages ingredient substitutions
 * Integrates with excluded ingredients to provide alternatives
 */

const fs = require('fs');
const path = require('path');
const ExcludeManager = require('./exclude-manager');

const DATA_DIR = path.join(__dirname, '..', 'data');
const SUBSTITUTIONS_FILE = path.join(DATA_DIR, 'ingredient-substitutions.json');

class SubstitutionEngine {
  constructor() {
    this.excludeManager = new ExcludeManager();
    this.substitutions = this.loadSubstitutions();
  }

  /**
   * Load the substitution database
   */
  loadSubstitutions() {
    if (!fs.existsSync(SUBSTITUTIONS_FILE)) {
      return { substitutions: {}, metadata: { version: '1.0' } };
    }
    return JSON.parse(fs.readFileSync(SUBSTITUTIONS_FILE, 'utf8'));
  }

  /**
   * Save the substitution database
   */
  saveSubstitutions() {
    this.substitutions.metadata.lastUpdated = new Date().toISOString();
    fs.writeFileSync(SUBSTITUTIONS_FILE, JSON.stringify(this.substitutions, null, 2));
  }

  /**
   * Find substitute ingredients for an excluded ingredient
   * @param {string} ingredient - The excluded ingredient
   * @param {Object} options - Options for finding substitutes
   * @returns {Object} Substitute recommendations
   */
  findSubstitute(ingredient, options = {}) {
    const normalizedIngredient = this.normalizeIngredient(ingredient);
    
    // Check if we have this ingredient in our database
    const directMatch = this.substitutions.substitutions[normalizedIngredient];
    if (directMatch) {
      return {
        ingredient: ingredient,
        normalizedName: normalizedIngredient,
        found: true,
        category: directMatch.category,
        alternatives: directMatch.alternatives,
        bestFor: directMatch.bestFor,
        notes: directMatch.notes,
        source: 'database'
      };
    }

    // Try partial matches
    for (const [key, data] of Object.entries(this.substitutions.substitutions)) {
      if (normalizedIngredient.includes(key) || key.includes(normalizedIngredient)) {
        return {
          ingredient: ingredient,
          normalizedName: normalizedIngredient,
          found: true,
          category: data.category,
          alternatives: data.alternatives,
          bestFor: data.bestFor,
          notes: data.notes,
          source: 'database_partial',
          matchedKey: key
        };
      }
    }

    // Generate generic suggestions based on category detection
    const genericSubstitute = this.generateGenericSubstitute(normalizedIngredient, ingredient);
    if (genericSubstitute) {
      return {
        ingredient: ingredient,
        normalizedName: normalizedIngredient,
        found: true,
        category: genericSubstitute.category,
        alternatives: genericSubstitute.alternatives,
        bestFor: genericSubstitute.bestFor,
        notes: genericSubstitute.notes,
        source: 'generated'
      };
    }

    return {
      ingredient: ingredient,
      normalizedName: normalizedIngredient,
      found: false,
      alternatives: [],
      message: 'No substitute found in database. Manual selection required.'
    };
  }

  /**
   * Get the best substitute for an ingredient based on context
   * @param {string} ingredient - The ingredient to replace
   * @param {string} context - The dish/meal context (optional)
   * @returns {string|null} The best substitute or null
   */
  getBestSubstitute(ingredient, context = null) {
    const result = this.findSubstitute(ingredient);
    
    if (!result.found || result.alternatives.length === 0) {
      return null;
    }

    // If we have a context, try to find the best match
    if (context && result.bestFor) {
      const contextLower = context.toLowerCase();
      
      // Find the first alternative that matches the context
      for (let i = 0; i < result.alternatives.length; i++) {
        const alt = result.alternatives[i];
        // Check if any "best for" matches the context
        for (const useCase of result.bestFor) {
          if (contextLower.includes(useCase.toLowerCase()) || 
              useCase.toLowerCase().includes(contextLower)) {
            return alt;
          }
        }
      }
    }

    // Return the first (best) alternative
    return result.alternatives[0];
  }

  /**
   * Automatically assign substitutes to excluded ingredients that don't have one
   * @returns {Array} List of assigned substitutes
   */
  autoAssignSubstitutes() {
    const exclusions = this.excludeManager.getAllExclusions();
    const assigned = [];

    for (const [ingredient, exclusion] of Object.entries(exclusions)) {
      if (!exclusion.substitute) {
        const substitute = this.getBestSubstitute(ingredient);
        if (substitute) {
          this.excludeManager.updateSubstitute(ingredient, substitute);
          assigned.push({
            ingredient: ingredient,
            substitute: substitute,
            source: 'auto_assigned'
          });
        }
      }
    }

    return assigned;
  }

  /**
   * Generate generic substitute suggestions based on ingredient type detection
   * @param {string} normalizedIngredient - Normalized ingredient name
   * @param {string} originalIngredient - Original ingredient name
   * @returns {Object|null} Generic substitute info
   */
  generateGenericSubstitute(normalizedIngredient, originalIngredient) {
    const patterns = [
      { pattern: /\b(steak|roast|brisket|short rib)\b/, category: 'red_meat', alternatives: ['portobello mushrooms', 'seitan', 'tempeh'] },
      { pattern: /\b(fillet|fish|cod|tilapia|halibut)\b/, category: 'seafood', alternatives: ['chicken', 'tofu', 'tempeh'] },
      { pattern: /\b(sausage|bacon|ham)\b/, category: 'pork', alternatives: ['turkey sausage', 'chicken sausage', 'tempeh bacon'] },
      { pattern: /\b(cheese|cheddar|mozzarella|parmesan)\b/, category: 'dairy', alternatives: ['nutritional yeast', 'vegan cheese', 'cashew cheese'] },
      { pattern: /\b(cream|half.and.half)\b/, category: 'dairy', alternatives: ['coconut cream', 'cashew cream', 'oat creamer'] },
      { pattern: /\b(nut|almond|walnut|pecan|cashew)\b/, category: 'nut', alternatives: ['sunflower seeds', 'pumpkin seeds', 'hemp hearts'] },
      { pattern: /\b(oil|fat|shortening)\b/, category: 'oil', alternatives: ['olive oil', 'avocado oil', 'coconut oil'] },
      { pattern: /\b(herb|basil|oregano|thyme)\b/, category: 'herb', alternatives: ['italian seasoning', 'herbes de provence', 'dried herbs'] },
      { pattern: /\b(spice|pepper|cumin|paprika)\b/, category: 'spice', alternatives: ['seasoning blend', 'curry powder', 'chili powder'] }
    ];

    for (const { pattern, category, alternatives } of patterns) {
      if (pattern.test(normalizedIngredient) || pattern.test(originalIngredient.toLowerCase())) {
        return {
          category,
          alternatives,
          bestFor: ['general cooking'],
          notes: `Auto-detected ${category} substitute`
        };
      }
    }

    return null;
  }

  /**
   * Add a new substitution to the database
   * @param {string} ingredient - The ingredient
   * @param {Object} substitutionData - Substitution data
   */
  addSubstitution(ingredient, substitutionData) {
    const normalizedIngredient = this.normalizeIngredient(ingredient);
    this.substitutions.substitutions[normalizedIngredient] = {
      ...substitutionData,
      addedAt: new Date().toISOString()
    };
    this.saveSubstitutions();
  }

  /**
   * Get all substitutions in a category
   * @param {string} category - The category to filter by
   * @returns {Object} Substitutions in that category
   */
  getSubstitutionsByCategory(category) {
    const results = {};
    for (const [key, data] of Object.entries(this.substitutions.substitutions)) {
      if (data.category === category) {
        results[key] = data;
      }
    }
    return results;
  }

  /**
   * Get substitution suggestions for a meal plan
   * @param {Array} meals - Array of meal objects
   * @returns {Object} Suggestions for substitutions needed
   */
  analyzeMealPlan(meals) {
    const suggestions = [];
    const exclusions = this.excludeManager.getAllExclusions();

    for (const meal of meals) {
      const checkResult = this.excludeManager.checkMealForExcludedIngredients(meal);
      
      if (checkResult.hasExcluded) {
        for (const excluded of checkResult.excludedIngredients) {
          if (!excluded.substitute) {
            const substitute = this.findSubstitute(excluded.ingredient);
            if (substitute.found) {
              suggestions.push({
                meal: meal.name,
                ingredient: excluded.ingredient,
                matchedExclusion: excluded.matchedExclusion,
                suggestedSubstitutes: substitute.alternatives,
                bestSubstitute: substitute.alternatives[0],
                category: substitute.category,
                notes: substitute.notes
              });
            }
          }
        }
      }
    }

    return {
      totalMeals: meals.length,
      mealsNeedingSubstitutions: new Set(suggestions.map(s => s.meal)).size,
      suggestions: suggestions
    };
  }

  /**
   * Normalize ingredient name
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
   * Get statistics about the substitution database
   * @returns {Object} Statistics
   */
  getStatistics() {
    const subs = this.substitutions.substitutions;
    const categories = {};

    for (const data of Object.values(subs)) {
      categories[data.category] = (categories[data.category] || 0) + 1;
    }

    return {
      totalSubstitutions: Object.keys(subs).length,
      categories: categories,
      lastUpdated: this.substitutions.metadata?.lastUpdated
    };
  }

  /**
   * Search for substitutes by keyword
   * @param {string} keyword - Search keyword
   * @returns {Array} Matching substitutions
   */
  searchSubstitutes(keyword) {
    const results = [];
    const searchTerm = keyword.toLowerCase();

    for (const [ingredient, data] of Object.entries(this.substitutions.substitutions)) {
      if (ingredient.includes(searchTerm) || 
          data.category.includes(searchTerm) ||
          data.alternatives.some(alt => alt.includes(searchTerm)) ||
          (data.notes && data.notes.includes(searchTerm))) {
        results.push({ ingredient, ...data });
      }
    }

    return results;
  }
}

// CLI interface
if (require.main === module) {
  const engine = new SubstitutionEngine();
  const args = process.argv.slice(2);
  const command = args[0];

  switch (command) {
    case 'find':
      if (args.length < 2) {
        console.log('Usage: node substitution-engine.js find <ingredient> [context]');
        process.exit(1);
      }
      const result = engine.findSubstitute(args[1], { context: args[2] });
      console.log(`\nSubstitutes for: ${result.ingredient}`);
      console.log('='.repeat(50));
      if (result.found) {
        console.log(`Category: ${result.category}`);
        console.log(`Source: ${result.source}`);
        console.log('\nAlternatives:');
        result.alternatives.forEach((alt, i) => {
          console.log(`  ${i + 1}. ${alt}`);
        });
        console.log(`\nBest for: ${result.bestFor?.join(', ')}`);
        console.log(`Notes: ${result.notes}`);
        if (result.matchedKey) {
          console.log(`(Partial match: ${result.matchedKey})`);
        }
      } else {
        console.log(result.message);
      }
      break;

    case 'best':
      if (args.length < 2) {
        console.log('Usage: node substitution-engine.js best <ingredient> [context]');
        process.exit(1);
      }
      const best = engine.getBestSubstitute(args[1], args[2]);
      if (best) {
        console.log(`Best substitute for ${args[1]}: ${best}`);
      } else {
        console.log(`No substitute found for ${args[1]}`);
      }
      break;

    case 'auto':
      console.log('Auto-assigning substitutes to excluded ingredients...\n');
      const assigned = engine.autoAssignSubstitutes();
      if (assigned.length > 0) {
        console.log(`Assigned substitutes to ${assigned.length} ingredients:`);
        assigned.forEach(a => {
          console.log(`  - ${a.ingredient} → ${a.substitute}`);
        });
      } else {
        console.log('No ingredients needed substitute assignment.');
      }
      break;

    case 'analyze':
      const weeklyPlanPath = path.join(DATA_DIR, 'weekly-plan.json');
      if (!fs.existsSync(weeklyPlanPath)) {
        console.log('No weekly plan found. Generate a meal plan first.');
        process.exit(1);
      }
      const plan = JSON.parse(fs.readFileSync(weeklyPlanPath, 'utf8'));
      const analysis = engine.analyzeMealPlan(plan.meals);
      console.log('\nMeal Plan Analysis:');
      console.log('='.repeat(50));
      console.log(`Total meals: ${analysis.totalMeals}`);
      console.log(`Meals needing substitutions: ${analysis.mealsNeedingSubstitutions}`);
      console.log(`Total suggestions: ${analysis.suggestions.length}`);
      if (analysis.suggestions.length > 0) {
        console.log('\nSuggestions:');
        analysis.suggestions.forEach(s => {
          console.log(`\n  Meal: ${s.meal}`);
          console.log(`  Ingredient: ${s.ingredient}`);
          console.log(`  Suggested: ${s.bestSubstitute}`);
          console.log(`  Options: ${s.suggestedSubstitutes.join(', ')}`);
        });
      }
      break;

    case 'search':
      if (args.length < 2) {
        console.log('Usage: node substitution-engine.js search <keyword>');
        process.exit(1);
      }
      const searchResults = engine.searchSubstitutes(args[1]);
      console.log(`\nSearch results for "${args[1]}":`);
      console.log('='.repeat(50));
      searchResults.forEach(r => {
        console.log(`\n${r.ingredient} (${r.category})`);
        console.log(`  Alternatives: ${r.alternatives.join(', ')}`);
      });
      if (searchResults.length === 0) {
        console.log('No results found.');
      }
      break;

    case 'stats':
      const stats = engine.getStatistics();
      console.log('\nSubstitution Database Statistics:');
      console.log('='.repeat(40));
      console.log(`Total substitutions: ${stats.totalSubstitutions}`);
      console.log(`\nBy Category:`);
      for (const [cat, count] of Object.entries(stats.categories)) {
        console.log(`  ${cat}: ${count}`);
      }
      break;

    case 'list':
      const category = args[1];
      if (!category) {
        console.log('Usage: node substitution-engine.js list <category>');
        console.log('Categories: poultry, red_meat, pork, seafood, vegetable, herb, spice, dairy, oil, grain, protein, legume, nut, citrus, condiment');
        process.exit(1);
      }
      const catSubs = engine.getSubstitutionsByCategory(category);
      console.log(`\nSubstitutions in category: ${category}`);
      console.log('='.repeat(50));
      for (const [ing, data] of Object.entries(catSubs)) {
        console.log(`\n${ing}:`);
        console.log(`  → ${data.alternatives.join(', ')}`);
      }
      if (Object.keys(catSubs).length === 0) {
        console.log('No substitutions found in this category.');
      }
      break;

    default:
      console.log('Substitution Engine - Find ingredient alternatives');
      console.log('');
      console.log('Usage: node substitution-engine.js <command> [options]');
      console.log('');
      console.log('Commands:');
      console.log('  find <ingredient> [context]    Find substitutes for ingredient');
      console.log('  best <ingredient> [context]    Get best single substitute');
      console.log('  auto                           Auto-assign substitutes to exclusions');
      console.log('  analyze                        Analyze weekly plan for needed subs');
      console.log('  search <keyword>               Search substitution database');
      console.log('  stats                          Show database statistics');
      console.log('  list <category>                List substitutions by category');
      console.log('');
      console.log('Examples:');
      console.log('  node substitution-engine.js find chicken');
      console.log('  node substitution-engine.js best beef "tacos"');
      console.log('  node substitution-engine.js analyze');
  }
}

module.exports = SubstitutionEngine;