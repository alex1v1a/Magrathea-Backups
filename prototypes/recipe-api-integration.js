/**
 * Recipe Enrichment Prototype
 * 
 * Enriches recipe database with nutritional data and metadata
 * Uses Spoonacular API (free tier: 150 points/day)
 * 
 * Usage:
 *   node prototypes/recipe-api-integration.js "Chicken Tikka Masala"
 *   node prototypes/recipe-api-integration.js --enrich-database
 *   node prototypes/recipe-api-integration.js --estimate-costs
 */

const https = require('https');
const fs = require('fs').promises;
const path = require('path');

const CONFIG_FILE = path.join(__dirname, '..', '.secrets', 'spoonacular.json');
const RECIPE_DB_FILE = path.join(__dirname, '..', 'dinner-automation', 'data', 'recipe-database.json');
const ENRICHED_DB_FILE = path.join(__dirname, '..', 'dinner-automation', 'data', 'recipe-database-enriched.json');
const POINTS_LOG_FILE = path.join(__dirname, '..', 'dinner-automation', 'data', 'spoonacular-points.log');

/**
 * Load API configuration
 */
async function loadConfig() {
  try {
    const data = await fs.readFile(CONFIG_FILE, 'utf8');
    return JSON.parse(data);
  } catch {
    return null;
  }
}

/**
 * Log API points usage
 */
async function logPointsUsed(points, action) {
  const log = {
    timestamp: new Date().toISOString(),
    points,
    action,
    remaining: 150 - points // Approximate
  };
  
  try {
    const existing = await fs.readFile(POINTS_LOG_FILE, 'utf8').catch(() => '[]');
    const logs = JSON.parse(existing);
    logs.push(log);
    await fs.writeFile(POINTS_LOG_FILE, JSON.stringify(logs.slice(-100), null, 2)); // Keep last 100
  } catch {
    // Ignore errors
  }
}

/**
 * Make API request to Spoonacular
 */
function makeApiRequest(endpoint, apiKey) {
  return new Promise((resolve, reject) => {
    const url = `https://api.spoonacular.com${endpoint}${endpoint.includes('?') ? '&' : '?'}apiKey=${apiKey}`;
    
    https.get(url, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Marvin-Dinner-Automation/1.0'
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.status === 'failure') {
            reject(new Error(json.message || 'API error'));
          } else {
            resolve(json);
          }
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

/**
 * Search for a recipe by name
 * Cost: ~1 point
 */
async function searchRecipe(query, apiKey) {
  const encoded = encodeURIComponent(query);
  const result = await makeApiRequest(`/recipes/complexSearch?query=${encoded}&number=1&addRecipeNutrition=true`, apiKey);
  
  await logPointsUsed(1, `search: ${query}`);
  
  if (result.results?.length > 0) {
    return result.results[0];
  }
  return null;
}

/**
 * Get recipe information
 * Cost: ~1 point
 */
async function getRecipeInfo(recipeId, apiKey) {
  const result = await makeApiRequest(`/recipes/${recipeId}/information?includeNutrition=true`, apiKey);
  await logPointsUsed(1, `info: ${recipeId}`);
  return result;
}

/**
 * Get ingredient substitutes
 * Cost: ~0.5 point
 */
async function getSubstitutes(ingredient, apiKey) {
  try {
    const result = await makeApiRequest(`/food/ingredients/substitutes?ingredientName=${encodeURIComponent(ingredient)}`, apiKey);
    await logPointsUsed(0.5, `substitutes: ${ingredient}`);
    return result.substitutes || [];
  } catch {
    return [];
  }
}

/**
 * Parse ingredients for cost estimation
 * Cost: ~0.5 point per ingredient
 */
async function parseIngredients(ingredients, apiKey) {
  const ingredientList = ingredients.join('\n');
  const encoded = encodeURIComponent(ingredientList);
  
  try {
    const result = await makeApiRequest(`/recipes/parseIngredients?ingredientList=${encoded}&servings=4`, apiKey);
    await logPointsUsed(0.5 * ingredients.length, `parse: ${ingredients.length} ingredients`);
    return result;
  } catch {
    return null;
  }
}

/**
 * Enrich a single recipe
 */
async function enrichRecipe(recipeName, apiKey) {
  console.log(`🔍 Searching: "${recipeName}"`);
  
  const searchResult = await searchRecipe(recipeName, apiKey);
  if (!searchResult) {
    console.log(`  ❌ Not found in API`);
    return null;
  }
  
  console.log(`  ✓ Found: ${searchResult.title}`);
  console.log(`  📊 Fetching details...`);
  
  const details = await getRecipeInfo(searchResult.id, apiKey);
  
  // Extract nutrition
  const nutrition = {};
  if (details.nutrition?.nutrients) {
    for (const n of details.nutrition.nutrients) {
      switch (n.name.toLowerCase()) {
        case 'calories': nutrition.calories = Math.round(n.amount); break;
        case 'protein': nutrition.protein = Math.round(n.amount); break;
        case 'carbohydrates': nutrition.carbs = Math.round(n.amount); break;
        case 'fat': nutrition.fat = Math.round(n.amount); break;
        case 'fiber': nutrition.fiber = Math.round(n.amount); break;
        case 'sugar': nutrition.sugar = Math.round(n.amount); break;
        case 'sodium': nutrition.sodium = Math.round(n.amount); break;
      }
    }
  }
  
  // Extract dietary info
  const dietary = {
    vegetarian: details.vegetarian || false,
    vegan: details.vegan || false,
    glutenFree: details.glutenFree || false,
    dairyFree: details.dairyFree || false,
    veryHealthy: details.veryHealthy || false,
    cheap: details.cheap || false,
    sustainable: details.sustainable || false
  };
  
  // Extract time info
  const timeInfo = {
    prepTime: details.preparationMinutes,
    cookTime: details.cookingMinutes,
    totalTime: details.readyInMinutes,
    servings: details.servings
  };
  
  // Extract tags
  const tags = [];
  if (details.dishTypes) tags.push(...details.dishTypes);
  if (details.cuisines) tags.push(...details.cuisines);
  if (details.diets) tags.push(...details.diets);
  if (details.occasions) tags.push(...details.occasions);
  
  // Extract ingredients with amounts
  const enrichedIngredients = details.extendedIngredients?.map(ing => ({
    name: ing.name,
    amount: ing.amount,
    unit: ing.unit,
    original: ing.originalString,
    aisle: ing.aisle
  })) || [];
  
  // Wine pairing
  const winePairing = details.winePairing?.pairingText || null;
  
  return {
    apiId: details.id,
    title: details.title,
    sourceUrl: details.sourceUrl,
    image: details.image,
    nutrition,
    dietary,
    timeInfo,
    tags: [...new Set(tags)], // Remove duplicates
    enrichedIngredients,
    winePairing,
    spoonacularScore: details.spoonacularScore,
    healthScore: details.healthScore,
    pricePerServing: details.pricePerServing 
      ? (details.pricePerServing / 100).toFixed(2)
      : null
  };
}

/**
 * Load existing recipe database
 */
async function loadRecipeDatabase() {
  try {
    const data = await fs.readFile(RECIPE_DB_FILE, 'utf8');
    return JSON.parse(data);
  } catch {
    return { recipes: {} };
  }
}

/**
 * Save enriched database
 */
async function saveEnrichedDatabase(database) {
  await fs.writeFile(ENRICHED_DB_FILE, JSON.stringify(database, null, 2));
}

/**
 * Enrich entire database (respecting rate limits)
 */
async function enrichDatabase(apiKey, limit = 10) {
  const db = await loadRecipeDatabase();
  const enriched = { recipes: {} };
  
  const recipeNames = Object.keys(db.recipes).slice(0, limit);
  console.log(`📚 Enriching ${recipeNames.length} recipes...\n`);
  
  for (let i = 0; i < recipeNames.length; i++) {
    const name = recipeNames[i];
    console.log(`\n[${i + 1}/${recipeNames.length}] Processing: ${name}`);
    
    try {
      const enrichment = await enrichRecipe(name, apiKey);
      
      if (enrichment) {
        enriched.recipes[name] = {
          ...db.recipes[name],
          enriched: enrichment
        };
        console.log(`  ✓ Enriched with ${Object.keys(enrichment.nutrition).length} nutrition fields`);
      } else {
        enriched.recipes[name] = db.recipes[name];
      }
      
      // Rate limiting - max 1 request per second on free tier
      if (i < recipeNames.length - 1) {
        await new Promise(r => setTimeout(r, 1000));
      }
      
    } catch (error) {
      console.log(`  ❌ Error: ${error.message}`);
      enriched.recipes[name] = db.recipes[name];
    }
  }
  
  await saveEnrichedDatabase(enriched);
  console.log(`\n✅ Saved to ${ENRICHED_DB_FILE}`);
  
  return enriched;
}

/**
 * Display enriched recipe
 */
function displayEnriched(enrichment) {
  console.log('\n╔════════════════════════════════════════════════╗');
  console.log(`║  ${enrichment.title.slice(0, 46).padEnd(46)} ║`);
  console.log('╠════════════════════════════════════════════════╣');
  
  if (enrichment.timeInfo.totalTime) {
    console.log(`║  ⏱️  Ready in: ${enrichment.timeInfo.totalTime} min                    `.slice(0, 49) + '║');
  }
  if (enrichment.timeInfo.servings) {
    console.log(`║  🍽️  Servings: ${enrichment.timeInfo.servings}                        `.slice(0, 49) + '║');
  }
  if (enrichment.pricePerServing) {
    console.log(`║  💰 Est. cost/serving: $${enrichment.pricePerServing}              `.slice(0, 49) + '║');
  }
  
  console.log('╠════════════════════════════════════════════════╣');
  console.log('║  📊 Nutrition (per serving):                   ║');
  if (enrichment.nutrition.calories) {
    console.log(`║     Calories: ${enrichment.nutrition.calories} kcal                    `.slice(0, 49) + '║');
  }
  if (enrichment.nutrition.protein) {
    console.log(`║     Protein: ${enrichment.nutrition.protein}g                         `.slice(0, 49) + '║');
  }
  if (enrichment.nutrition.carbs) {
    console.log(`║     Carbs: ${enrichment.nutrition.carbs}g                           `.slice(0, 49) + '║');
  }
  if (enrichment.nutrition.fat) {
    console.log(`║     Fat: ${enrichment.nutrition.fat}g                             `.slice(0, 49) + '║');
  }
  
  console.log('╠════════════════════════════════════════════════╣');
  console.log('║  🏷️  Dietary:                                  ║');
  const dietary = Object.entries(enrichment.dietary)
    .filter(([_, v]) => v)
    .map(([k]) => k.replace(/([A-Z])/g, ' $1').toLowerCase());
  console.log(`║     ${dietary.slice(0, 5).join(', ').slice(0, 44).padEnd(44)} ║`);
  
  if (enrichment.winePairing) {
    console.log('╠════════════════════════════════════════════════╣');
    console.log('║  🍷 Wine Pairing:                              ║');
    console.log(`║  ${enrichment.winePairing.slice(0, 46).padEnd(46)} ║`);
  }
  
  console.log('╚════════════════════════════════════════════════╝\n');
}

/**
 * Generate cost report for meal planning
 */
async function generateCostReport(apiKey) {
  const db = await loadRecipeDatabase();
  const recipes = Object.keys(db.recipes);
  
  console.log('💰 Generating cost estimates...\n');
  
  const costs = [];
  for (const name of recipes.slice(0, 5)) { // Sample first 5
    try {
      const enrichment = await enrichRecipe(name, apiKey);
      if (enrichment?.pricePerServing) {
        costs.push({
          name,
          costPerServing: parseFloat(enrichment.pricePerServing),
          totalCost: parseFloat(enrichment.pricePerServing) * (enrichment.timeInfo.servings || 4)
        });
      }
      await new Promise(r => setTimeout(r, 1000));
    } catch (e) {
      console.log(`  Skipped ${name}: ${e.message}`);
    }
  }
  
  console.log('\n╔════════════════════════════════════════════════╗');
  console.log('║         Cost Estimate Report                   ║');
  console.log('╠════════════════════════════════════════════════╣');
  
  costs.sort((a, b) => a.costPerServing - b.costPerServing);
  
  let totalCost = 0;
  for (const c of costs) {
    console.log(`║  ${c.name.slice(0, 25).padEnd(25)} $${c.totalCost.toFixed(2).padStart(6)} (${c.costPerServing.toFixed(2)}/serving) ║`);
    totalCost += c.totalCost;
  }
  
  console.log('╠════════════════════════════════════════════════╣');
  console.log(`║  Total (sample): $${totalCost.toFixed(2).padStart(36)} ║`);
  console.log('╚════════════════════════════════════════════════╝\n');
  
  return costs;
}

/**
 * Main function
 */
async function main() {
  const args = process.argv.slice(2);
  const config = await loadConfig();
  
  if (!config?.apiKey) {
    console.error('❌ Spoonacular API key not found.');
    console.error('Create .secrets/spoonacular.json with: { "apiKey": "your-key" }');
    console.error('Get free key at: https://spoonacular.com/food-api');
    process.exit(1);
  }
  
  if (args.includes('--enrich-database')) {
    const limit = args.includes('--all') ? 1000 : 10;
    await enrichDatabase(config.apiKey, limit);
    
  } else if (args.includes('--estimate-costs')) {
    await generateCostReport(config.apiKey);
    
  } else if (args.length > 0 && !args[0].startsWith('--')) {
    // Single recipe
    const recipeName = args[0];
    const enrichment = await enrichRecipe(recipeName, config.apiKey);
    
    if (enrichment) {
      displayEnriched(enrichment);
    } else {
      console.log(`Recipe "${recipeName}" not found.`);
    }
    
  } else {
    console.log('Recipe Enrichment Prototype');
    console.log('');
    console.log('Usage:');
    console.log('  node recipe-api-integration.js "Recipe Name"       Enrich single recipe');
    console.log('  node recipe-api-integration.js --enrich-database Enrich all (limit 10)');
    console.log('  node recipe-api-integration.js --enrich-database --all  Enrich all recipes');
    console.log('  node recipe-api-integration.js --estimate-costs  Generate cost report');
    console.log('');
    console.log('API Points: 150/day free tier');
    console.log('  - Search: 1 point');
    console.log('  - Recipe info: 1 point');
    console.log('  - Ingredient parsing: 0.5 point/ingredient');
  }
}

main().catch(err => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});

// Export for use in other scripts
module.exports = { enrichRecipe, loadRecipeDatabase };
