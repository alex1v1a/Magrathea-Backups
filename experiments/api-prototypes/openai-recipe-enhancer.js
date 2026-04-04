# OpenAI/Claude API Prototype for Recipe Enhancement

AI-powered recipe generation and enhancement for meal planning automation.

## Overview

This prototype demonstrates how to use OpenAI's GPT-4o or Anthropic's Claude API to:
- Generate recipe variations based on existing recipes
- Add nutritional information to recipes
- Suggest seasonal meal ideas
- Create ingredient substitutions
- Scale recipes for different serving sizes

## Setup

### OpenAI Setup
1. Sign up at https://platform.openai.com
2. Create an API key at https://platform.openai.com/api-keys
3. Set environment variable: `OPENAI_API_KEY`

### Anthropic Claude Setup
1. Sign up at https://console.anthropic.com
2. Get API key from https://console.anthropic.com/settings/keys
3. Set environment variable: `ANTHROPIC_API_KEY`

### Installation
```bash
npm install openai @anthropic-ai/sdk
```

## Pricing

### OpenAI GPT-4o (Recommended for recipes)
- Input: $2.50 per 1M tokens
- Output: $10.00 per 1M tokens
- Cached input: $1.25 per 1M tokens

### OpenAI GPT-4o-mini (Budget option)
- Input: $0.15 per 1M tokens
- Output: $0.60 per 1M tokens

### Anthropic Claude 3.5 Sonnet
- Input: $3.00 per 1M tokens
- Output: $15.00 per 1M tokens

### Cost Estimate for Recipe Use
- Single recipe enhancement: ~500-1000 tokens = $0.002-0.01
- Weekly meal plan generation (7 meals): ~3000-5000 tokens = $0.02-0.05
- Monthly cost for weekly use: ~$0.10-0.20

## Prototype Code

```javascript
const OpenAI = require('openai');
const Anthropic = require('@anthropic-ai/sdk');

class RecipeAIEnhancer {
  constructor(options = {}) {
    this.provider = options.provider || 'openai'; // 'openai' or 'anthropic'
    this.model = options.model || 'gpt-4o';
    
    if (this.provider === 'openai') {
      this.client = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY
      });
    } else {
      this.client = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY
      });
    }
  }

  /**
   * Generate recipe variations based on an existing recipe
   */
  async generateVariations(recipe, variationType, count = 3) {
    const prompt = `Given this recipe:

Name: ${recipe.name}
Ingredients: ${recipe.ingredients.join(', ')}
Instructions: ${recipe.instructions}

Generate ${count} variations with a "${variationType}" twist. For each variation:
1. Provide a new name
2. List ingredient changes (additions/removals)
3. Brief instructions for modifications
4. A short description of the flavor profile

Format as JSON:
{
  "variations": [
    {
      "name": "Variation Name",
      "changes": ["ingredient changes"],
      "modifications": "brief instructions",
      "flavorProfile": "description"
    }
  ]
}`;

    return await this._callAI(prompt, 'json');
  }

  /**
   * Add nutritional information to a recipe
   */
  async addNutritionalInfo(recipe) {
    const prompt = `Analyze this recipe and provide estimated nutritional information per serving:

Recipe: ${recipe.name}
Servings: ${recipe.servings || 4}
Ingredients:
${recipe.ingredients.map(i => `- ${i}`).join('\n')}

Provide JSON with:
- calories (kcal)
- protein (g)
- carbohydrates (g)
- fat (g)
- fiber (g)
- sodium (mg)
- allergens (array)
- dietaryTags (array: vegetarian, vegan, gluten-free, dairy-free, keto, etc.)

Format:
{
  "perServing": {
    "calories": 0,
    "protein": 0,
    "carbohydrates": 0,
    "fat": 0,
    "fiber": 0,
    "sodium": 0
  },
  "allergens": [],
  "dietaryTags": [],
  "notes": "brief notes about nutritional profile"
}`;

    return await this._callAI(prompt, 'json');
  }

  /**
   * Suggest seasonal meals based on current month/season
   */
  async suggestSeasonalMeals(season, preferences = {}, count = 5) {
    const dietaryRestrictions = preferences.dietary?.join(', ') || 'none';
    const cuisinePreferences = preferences.cuisines?.join(', ') || 'any';
    const maxPrepTime = preferences.maxPrepTime || 45;
    
    const prompt = `Suggest ${count} dinner recipes perfect for ${season}.

Requirements:
- Family-friendly (2 adults, 2 young children)
- Prep time under ${maxPrepTime} minutes
- Dietary considerations: ${dietaryRestrictions}
- Cuisine preferences: ${cuisinePreferences}
- Budget-conscious ($200/week grocery budget)
- Focus on seasonal ingredients available in ${season}

For each recipe provide:
1. Name
2. Brief description
3. Key seasonal ingredients (3-5 items)
4. Approximate cost category ($, $$, $$$)
5. Prep time estimate
6. Why it's good for this season

Format as JSON:
{
  "meals": [
    {
      "name": "",
      "description": "",
      "seasonalIngredients": [],
      "costCategory": "$",
      "prepTime": 0,
      "seasonalReason": ""
    }
  ]
}`;

    return await this._callAI(prompt, 'json');
  }

  /**
   * Create ingredient substitutions for dietary needs
   */
  async suggestSubstitutions(recipe, dietaryGoal) {
    const prompt = `Given this recipe and dietary goal, suggest ingredient substitutions:

Recipe: ${recipe.name}
Ingredients: ${recipe.ingredients.join(', ')}
Dietary Goal: ${dietaryGoal} (e.g., make it vegetarian, lower sodium, dairy-free)

For each substitution:
1. Original ingredient
2. Substitute ingredient(s)
3. Ratio/measurement adjustment
4. Impact on flavor/texture
5. Where to find the substitute (regular grocery, specialty store, etc.)

Format as JSON:
{
  "substitutions": [
    {
      "original": "",
      "substitute": "",
      "ratio": "",
      "impact": "",
      "availability": ""
    }
  ],
  "modifiedRecipeName": "suggested new name",
  "notes": "additional tips"
}`;

    return await this._callAI(prompt, 'json');
  }

  /**
   * Scale a recipe up or down
   */
  async scaleRecipe(recipe, targetServings) {
    const originalServings = recipe.servings || 4;
    const scaleFactor = targetServings / originalServings;
    
    const prompt = `Scale this recipe from ${originalServings} servings to ${targetServings} servings:

Recipe: ${recipe.name}
Original Ingredients:
${recipe.ingredients.map(i => `- ${i}`).join('\n')}

Scale factor: ${scaleFactor.toFixed(2)}x

Provide:
1. Scaled ingredient list with new measurements
2. Any cooking time/temperature adjustments needed
3. Equipment considerations (may need larger pans, etc.)
4. Storage notes if making extra

Format as JSON:
{
  "originalServings": ${originalServings},
  "targetServings": ${targetServings},
  "scaleFactor": ${scaleFactor},
  "scaledIngredients": [],
  "cookingAdjustments": "",
  "equipmentNotes": "",
  "storageNotes": ""
}`;

    return await this._callAI(prompt, 'json');
  }

  /**
   * Generate a complete weekly meal plan with AI enhancements
   */
  async generateEnhancedMealPlan(constraints = {}) {
    const budget = constraints.budget || 200;
    const familySize = constraints.familySize || 4;
    const preferences = constraints.preferences || [];
    const avoid = constraints.avoid || [];
    const season = constraints.season || this._getCurrentSeason();
    
    const prompt = `Create a weekly dinner meal plan for a family of ${familySize} with a $${budget} budget.

Context:
- Current season: ${season}
- Dietary preferences: ${preferences.join(', ') || 'none'}
- Foods to avoid: ${avoid.join(', ') || 'none'}
- Need 7 unique dinners (no repeats)
- Meals should be family-friendly (including young children)
- Mix of protein sources (chicken, beef, fish, vegetarian)
- Consider seasonal ingredients for ${season}

For each meal provide:
1. Name
2. Cuisine type
3. Protein source
4. Estimated cost ($, $$, $$$)
5. Prep + cook time
6. Brief description
7. 2-3 suggested variations for future weeks
8. Approximate nutritional highlights (high protein, low carb, etc.)

Also provide:
- Weekly shopping strategy tips
- Ingredient overlap suggestions to save money
- Meal prep opportunities

Format as JSON:
{
  "weekOf": "${new Date().toISOString().split('T')[0]}",
  "totalBudget": ${budget},
  "season": "${season}",
  "meals": [
    {
      "day": "Monday",
      "name": "",
      "cuisine": "",
      "protein": "",
      "cost": "$",
      "time": 0,
      "description": "",
      "variations": [],
      "nutritionHighlights": []
    }
  ],
  "shoppingStrategy": "",
  "ingredientOverlap": [],
  "mealPrepTips": ""
}`;

    return await this._callAI(prompt, 'json');
  }

  /**
   * Internal method to call AI provider
   */
  async _callAI(prompt, format = 'text') {
    try {
      if (this.provider === 'openai') {
        const response = await this.client.chat.completions.create({
          model: this.model,
          messages: [
            {
              role: 'system',
              content: 'You are a helpful culinary assistant specializing in meal planning, recipe development, and nutritional analysis. Provide accurate, practical advice for home cooking.'
            },
            { role: 'user', content: prompt }
          ],
          temperature: 0.7,
          response_format: format === 'json' ? { type: 'json_object' } : undefined
        });

        const content = response.choices[0].message.content;
        return format === 'json' ? JSON.parse(content) : content;

      } else {
        // Anthropic
        const response = await this.client.messages.create({
          model: this.model,
          max_tokens: 2000,
          system: 'You are a helpful culinary assistant specializing in meal planning, recipe development, and nutritional analysis. Provide accurate, practical advice for home cooking.',
          messages: [{ role: 'user', content: prompt }]
        });

        const content = response.content[0].text;
        return format === 'json' ? JSON.parse(content) : content;
      }
    } catch (error) {
      console.error('AI API Error:', error.message);
      throw error;
    }
  }

  /**
   * Get current season based on month
   */
  _getCurrentSeason() {
    const month = new Date().getMonth() + 1; // 1-12
    if (month >= 3 && month <= 5) return 'spring';
    if (month >= 6 && month <= 8) return 'summer';
    if (month >= 9 && month <= 11) return 'fall';
    return 'winter';
  }
}

// Example usage demonstrations
async function runExamples() {
  const enhancer = new RecipeAIEnhancer({ 
    provider: 'openai',
    model: 'gpt-4o'
  });

  console.log('=== Recipe AI Enhancer Examples ===\n');

  // Example 1: Generate seasonal meal suggestions
  console.log('1. Generating seasonal meal suggestions...');
  try {
    const seasonalMeals = await enhancer.suggestSeasonalMeals('spring', {
      dietary: [],
      cuisines: ['Italian', 'Mexican', 'American'],
      maxPrepTime: 45
    }, 3);
    console.log('Seasonal Meals:', JSON.stringify(seasonalMeals, null, 2));
  } catch (e) {
    console.error('Error:', e.message);
  }

  // Example 2: Nutritional analysis
  console.log('\n2. Analyzing recipe nutrition...');
  try {
    const nutrition = await enhancer.addNutritionalInfo({
      name: 'Grilled Chicken with Roasted Vegetables',
      servings: 4,
      ingredients: [
        '4 boneless chicken breasts (6oz each)',
        '2 cups broccoli florets',
        '1 red bell pepper, sliced',
        '2 tbsp olive oil',
        '1 tsp garlic powder',
        'Salt and pepper to taste'
      ]
    });
    console.log('Nutritional Info:', JSON.stringify(nutrition, null, 2));
  } catch (e) {
    console.error('Error:', e.message);
  }

  // Example 3: Generate recipe variations
  console.log('\n3. Generating recipe variations...');
  try {
    const variations = await enhancer.generateVariations({
      name: 'Classic Spaghetti Bolognese',
      ingredients: [
        '1 lb ground beef',
        '1 onion, diced',
        '2 cloves garlic, minced',
        '1 can crushed tomatoes',
        '1 lb spaghetti',
        'Parmesan cheese'
      ],
      instructions: 'Brown beef, add onions and garlic, simmer with tomatoes, serve over pasta.'
    }, 'Mediterranean', 3);
    console.log('Variations:', JSON.stringify(variations, null, 2));
  } catch (e) {
    console.error('Error:', e.message);
  }

  // Example 4: Generate enhanced weekly meal plan
  console.log('\n4. Generating enhanced weekly meal plan...');
  try {
    const mealPlan = await enhancer.generateEnhancedMealPlan({
      budget: 200,
      familySize: 4,
      preferences: ['high-protein', 'kid-friendly'],
      avoid: ['shellfish', 'excessive spice']
    });
    console.log('Meal Plan:', JSON.stringify(mealPlan, null, 2));
  } catch (e) {
    console.error('Error:', e.message);
  }
}

module.exports = { RecipeAIEnhancer };

// Run examples if called directly
if (require.main === module) {
  runExamples().catch(console.error);
}
```

## Environment Variables

```bash
# Required - choose one or both
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Optional - defaults shown
AI_PROVIDER=openai  # or 'anthropic'
AI_MODEL=gpt-4o     # or 'claude-3-5-sonnet-20241022'
```

## Use Cases Demonstrated

1. **Recipe Variations** - Transform existing recipes with new flavor profiles
2. **Nutritional Analysis** - Auto-generate nutrition facts for meal planning
3. **Seasonal Suggestions** - Get meal ideas based on current season
4. **Dietary Substitutions** - Adapt recipes for dietary restrictions
5. **Recipe Scaling** - Adjust recipes for different serving sizes
6. **Enhanced Meal Plans** - AI-generated weekly plans with variations

## Integration with Dinner Automation

```javascript
const { RecipeAIEnhancer } = require('./recipe-ai-enhancer');
const fs = require('fs');

async function enhanceWeeklyMealPlan() {
  const enhancer = new RecipeAIEnhancer();
  
  // Generate AI-enhanced meal plan
  const mealPlan = await enhancer.generateEnhancedMealPlan({
    budget: 200,
    familySize: 4,
    season: 'spring'
  });
  
  // Add nutritional info to each meal
  for (const meal of mealPlan.meals) {
    meal.nutrition = await enhancer.addNutritionalInfo({
      name: meal.name,
      ingredients: meal.ingredients || [], // You'll need to add ingredients
      servings: 4
    });
  }
  
  // Save enhanced plan
  fs.writeFileSync('meal-plan-enhanced.json', JSON.stringify(mealPlan, null, 2));
  
  return mealPlan;
}
```

## Rate Limiting & Best Practices

- OpenAI: 500 RPM (requests per minute) for Tier 1
- Anthropic: 50 RPM for new accounts
- Implement caching for repeated requests
- Batch similar requests when possible
- Use JSON mode for structured outputs
- Handle API errors gracefully

## Cost Optimization Tips

1. Use GPT-4o-mini for simple tasks ($0.60/1M tokens output vs $10)
2. Cache results for common requests (seasonal suggestions)
3. Batch nutritional analysis requests
4. Use prompt compression for long recipes
5. Consider using local models for simple tasks (LM Studio, Ollama)

## Next Steps

1. Get API keys for OpenAI and/or Anthropic
2. Test each function with sample recipes
3. Integrate with existing dinner automation
4. Add caching layer for common requests
5. Build UI for recipe enhancement in Marvin Dashboard

## Example Output

```json
{
  "meals": [
    {
      "day": "Monday",
      "name": "Spring Vegetable Risotto",
      "cuisine": "Italian",
      "protein": "Vegetarian (parmesan)",
      "cost": "$$",
      "time": 35,
      "description": "Creamy risotto with asparagus, peas, and fresh herbs",
      "variations": [
        "Add grilled chicken for protein",
        "Substitute farro for risotto rice",
        "Make it vegan with nutritional yeast"
      ],
      "nutritionHighlights": ["vegetarian", "high-calcium"]
    }
  ],
  "shoppingStrategy": "Buy asparagus and peas fresh at HEB...",
  "ingredientOverlap": ["Use leftover parmesan all week"],
  "mealPrepTips": "Wash and chop vegetables Sunday..."
}
```
