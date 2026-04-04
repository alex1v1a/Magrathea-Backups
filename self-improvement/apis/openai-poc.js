/**
 * OpenAI API Proof of Concept
 * Demonstrates structured outputs, function calling, and batch processing
 * 
 * Setup:
 * 1. npm install openai zod
 * 2. Set env var: OPENAI_API_KEY
 */

const OpenAI = require('openai');
const { z } = require('zod');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * USE CASE 1: Structured Outputs for Data Extraction
 * Parse unstructured text into typed data
 */
async function extractMealPlanData(text) {
  const MealPlanSchema = z.object({
    meals: z.array(z.object({
      name: z.string().describe('Name of the meal'),
      cuisine: z.string().describe('Type of cuisine (e.g., Italian, Mexican)'),
      prepTime: z.number().describe('Preparation time in minutes'),
      cookTime: z.number().describe('Cooking time in minutes'),
      ingredients: z.array(z.object({
        name: z.string(),
        quantity: z.string(),
        category: z.enum(['protein', 'vegetable', 'grain', 'dairy', 'spice', 'other']),
      })),
      dietaryTags: z.array(z.enum(['vegetarian', 'vegan', 'gluten-free', 'dairy-free', 'keto', 'paleo'])),
      difficulty: z.enum(['easy', 'medium', 'hard']),
    })),
    totalPrepTime: z.number().describe('Total prep time for all meals'),
    shoppingList: z.array(z.string()).describe('Consolidated shopping list'),
  });

  const response = await openai.responses.parse({
    model: 'gpt-4o-2024-08-06',
    input: [
      {
        role: 'system',
        content: 'Extract structured meal plan data from the user\'s text. If information is missing, infer reasonable defaults.',
      },
      { role: 'user', content: text },
    ],
    text_format: MealPlanSchema,
  });

  return response.output_parsed;
}

/**
 * USE CASE 2: Function Calling for Tool Integration
 * Let the AI decide when to call external tools
 */
async function handleDinnerAssistantQuery(userQuery) {
  const tools = [
    {
      type: 'function',
      name: 'search_recipes',
      description: 'Search for recipes based on ingredients or cuisine type',
      parameters: {
        type: 'object',
        properties: {
          ingredients: {
            type: 'array',
            items: { type: 'string' },
            description: 'Ingredients to search for',
          },
          cuisine: {
            type: 'string',
            description: 'Cuisine type filter',
          },
          maxTime: {
            type: 'number',
            description: 'Maximum cooking time in minutes',
          },
        },
        required: ['ingredients'],
        additionalProperties: false,
      },
      strict: true,
    },
    {
      type: 'function',
      name: 'check_heb_inventory',
      description: 'Check if ingredients are available at HEB',
      parameters: {
        type: 'object',
        properties: {
          items: {
            type: 'array',
            items: { type: 'string' },
            description: 'Item names to check',
          },
        },
        required: ['items'],
        additionalProperties: false,
      },
      strict: true,
    },
    {
      type: 'function',
      name: 'schedule_pickup',
      description: 'Schedule a dinner pickup time',
      parameters: {
        type: 'object',
        properties: {
          time: {
            type: 'string',
            description: 'Pickup time in ISO 8601 format',
          },
          location: {
            type: 'string',
            description: 'HEB location identifier',
          },
        },
        required: ['time', 'location'],
        additionalProperties: false,
      },
      strict: true,
    },
  ];

  // First call - get tool calls
  const response = await openai.responses.create({
    model: 'gpt-5',
    input: [{ role: 'user', content: userQuery }],
    tools,
    tool_choice: 'auto',
  });

  // Check if model made tool calls
  const toolCalls = response.output.filter(item => item.type === 'function_call');
  
  if (toolCalls.length === 0) {
    return { response: response.output_text, actions: [] };
  }

  // Execute tool calls (mock implementations)
  const toolResults = [];
  const inputMessages = [...response.output];

  for (const call of toolCalls) {
    const args = JSON.parse(call.arguments);
    let result;

    switch (call.name) {
      case 'search_recipes':
        result = await mockSearchRecipes(args);
        break;
      case 'check_heb_inventory':
        result = await mockCheckHEBInventory(args);
        break;
      case 'schedule_pickup':
        result = await mockSchedulePickup(args);
        break;
    }

    toolResults.push({
      type: 'function_call_output',
      call_id: call.call_id,
      output: JSON.stringify(result),
    });
  }

  // Second call - get final response with tool results
  const finalResponse = await openai.responses.create({
    model: 'gpt-5',
    input: [
      { role: 'user', content: userQuery },
      ...inputMessages,
      ...toolResults,
    ],
  });

  return {
    response: finalResponse.output_text,
    actions: toolCalls.map(t => ({ name: t.name, args: JSON.parse(t.arguments) })),
  };
}

/**
 * USE CASE 3: Batch API for Bulk Processing
 * Process multiple requests efficiently
 */
async function batchProcessMealPlans(mealRequests) {
  const batchFile = mealRequests.map((req, index) => ({
    custom_id: `meal-${index}`,
    method: 'POST',
    url: '/v1/responses',
    body: {
      model: 'gpt-4o-mini',
      input: [
        {
          role: 'system',
          content: 'Generate a meal plan summary including ingredients and cooking instructions.',
        },
        { role: 'user', content: req },
      ],
    },
  }));

  // Write batch file
  const fs = require('fs').promises;
  const batchFilePath = '/tmp/batch_meals.jsonl';
  await fs.writeFile(
    batchFilePath,
    batchFile.map(line => JSON.stringify(line)).join('\n')
  );

  // Upload batch file
  const file = await openai.files.create({
    file: fs.createReadStream(batchFilePath),
    purpose: 'batch',
  });

  // Create batch
  const batch = await openai.batches.create({
    input_file_id: file.id,
    endpoint: '/v1/responses',
    completion_window: '24h',
  });

  console.log('Batch created:', batch.id);
  return batch.id;
}

/**
 * USE CASE 4: Chain of Thought for Complex Reasoning
 * Step-by-step meal planning with reasoning
 */
async function planWeeklyMealsWithReasoning(preferences) {
  const ReasoningSchema = z.object({
    thinking_steps: z.array(z.object({
      step: z.number(),
      consideration: z.string().describe('What is being considered'),
      decision: z.string().describe('Decision made at this step'),
    })),
    weekly_plan: z.object({
      monday: z.object({ meal: z.string(), reasoning: z.string() }),
      tuesday: z.object({ meal: z.string(), reasoning: z.string() }),
      wednesday: z.object({ meal: z.string(), reasoning: z.string() }),
      thursday: z.object({ meal: z.string(), reasoning: z.string() }),
      friday: z.object({ meal: z.string(), reasoning: z.string() }),
      saturday: z.object({ meal: z.string(), reasoning: z.string() }),
      sunday: z.object({ meal: z.string(), reasoning: z.string() }),
    }),
    shopping_strategy: z.string().describe('How to optimize grocery shopping'),
  });

  const response = await openai.responses.parse({
    model: 'gpt-5',
    input: [
      {
        role: 'system',
        content: 'You are a meal planning assistant. Think step-by-step about dietary balance, ingredient reuse, and cooking complexity.',
      },
      {
        role: 'user',
        content: `Plan a week of dinners for: ${JSON.stringify(preferences)}`,
      },
    ],
    text_format: ReasoningSchema,
  });

  return response.output_parsed;
}

/**
 * USE CASE 5: Streaming with Structured Outputs
 * Real-time parsing of partial responses
 */
async function streamMealSuggestions(ingredients) {
  const SuggestionSchema = z.object({
    suggestions: z.array(z.object({
      dish: z.string(),
      confidence: z.number().min(0).max(1),
      missing_ingredients: z.array(z.string()),
    })),
  });

  const stream = await openai.responses.stream({
    model: 'gpt-4o-2024-08-06',
    input: [
      {
        role: 'system',
        content: 'Suggest meals based on available ingredients.',
      },
      {
        role: 'user',
        content: `I have these ingredients: ${ingredients.join(', ')}`,
      },
    ],
    text_format: SuggestionSchema,
  });

  for await (const event of stream) {
    if (event.type === 'response.output_text.delta') {
      process.stdout.write(event.delta);
    } else if (event.type === 'response.completed') {
      console.log('\n\nFinal parsed response:', event.response.output_parsed);
    }
  }
}

// Mock tool implementations
async function mockSearchRecipes({ ingredients, cuisine, maxTime }) {
  return {
    recipes: [
      { name: 'Quick Stir Fry', time: 20, match: 0.95 },
      { name: 'Sheet Pan Chicken', time: 35, match: 0.88 },
    ],
  };
}

async function mockCheckHEBInventory({ items }) {
  return {
    available: items.filter((_, i) => i % 2 === 0),
    unavailable: items.filter((_, i) => i % 2 === 1),
    alternatives: { 'quinoa': 'brown rice', 'tofu': 'chicken breast' },
  };
}

async function mockSchedulePickup({ time, location }) {
  return {
    scheduled: true,
    confirmation: 'PKP-' + Math.random().toString(36).substr(2, 8).toUpperCase(),
    location,
    time,
  };
}

// Demo runner
async function demo() {
  console.log('=== OpenAI API Integration Demo ===\n');

  // Demo 1: Structured extraction
  console.log('Demo 1: Structured Meal Plan Extraction');
  const mealText = `
    This week I want to make:
    1. Spaghetti Carbonara - Italian pasta with eggs, bacon, and cheese. Takes about 30 mins total.
    2. Chicken Tikka Masala - Indian curry with chicken, yogurt, tomatoes. About 45 mins.
    Both are family favorites and relatively easy to make.
  `;
  
  try {
    const structured = await extractMealPlanData(mealText);
    console.log('Extracted:', JSON.stringify(structured, null, 2));
  } catch (e) {
    console.log('Skipping (no API key):', e.message);
  }

  // Demo 2: Function calling
  console.log('\nDemo 2: Function Calling');
  const query = "I want to make something with chicken and rice for dinner tonight. Can you check if HEB has them and schedule pickup for 6pm?";
  
  try {
    const result = await handleDinnerAssistantQuery(query);
    console.log('Assistant response:', result.response);
    console.log('Actions taken:', result.actions);
  } catch (e) {
    console.log('Skipping (no API key):', e.message);
  }

  // Demo 3: Chain of thought
  console.log('\nDemo 3: Chain of Thought Planning');
  const preferences = {
    dietary: ['low-carb', 'high-protein'],
    avoid: ['shellfish', 'pork'],
    maxCookTime: 45,
    familySize: 4,
  };
  
  try {
    const plan = await planWeeklyMealsWithReasoning(preferences);
    console.log('Weekly plan:', JSON.stringify(plan.weekly_plan, null, 2));
    console.log('Shopping strategy:', plan.shopping_strategy);
  } catch (e) {
    console.log('Skipping (no API key):', e.message);
  }

  console.log('\nDemo complete!');
}

module.exports = {
  extractMealPlanData,
  handleDinnerAssistantQuery,
  batchProcessMealPlans,
  planWeeklyMealsWithReasoning,
  streamMealSuggestions,
};

if (require.main === module) {
  demo();
}
