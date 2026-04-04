/**
 * Claude API Proof of Concept
 * Demonstrates Anthropic's structured outputs and tool use
 * 
 * Setup:
 * 1. npm install @anthropic-ai/sdk
 * 2. Set env var: ANTHROPIC_API_KEY
 */

const Anthropic = require('@anthropic-ai/sdk');

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

/**
 * USE CASE 1: Structured Data Extraction with XML
 * Claude's preferred method for structured outputs
 */
async function extractRecipeData(text) {
  const response = await anthropic.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 4096,
    system: `You extract recipe information into structured XML format.
Always respond with valid XML inside <recipe_data> tags.

Schema:
<recipe_data>
  <name>Recipe name</name>
  <cuisine>Type of cuisine</cuisine>
  <prep_time_minutes>number</prep_time_minutes>
  <cook_time_minutes>number</cook_time_minutes>
  <servings>number</servings>
  <ingredients>
    <ingredient>
      <name>ingredient name</name>
      <quantity>amount</quantity>
      <unit>unit</unit>
    </ingredient>
  </ingredients>
  <instructions>
    <step>instruction text</step>
  </instructions>
  <dietary_tags>
    <tag>vegetarian/vegan/gluten-free/etc</tag>
  </dietary_tags>
</recipe_data>`,
    messages: [
      {
        role: 'user',
        content: `Extract recipe data from this text:\n\n${text}`,
      },
    ],
  });

  // Parse XML response
  const xmlText = response.content[0].text;
  const parsed = parseSimpleXML(xmlText);
  return parsed;
}

/**
 * USE CASE 2: Tool Use (Function Calling)
 * Claude's native tool use capability
 */
async function dinnerAssistantWithTools(userQuery) {
  const tools = [
    {
      name: 'find_recipes',
      description: 'Find recipes matching criteria',
      input_schema: {
        type: 'object',
        properties: {
          main_ingredient: { type: 'string' },
          cuisine: { type: 'string' },
          max_time: { type: 'number', description: 'Maximum cook time in minutes' },
          dietary_restrictions: { type: 'array', items: { type: 'string' } },
        },
        required: ['main_ingredient'],
      },
    },
    {
      name: 'get_nutrition_info',
      description: 'Get nutritional information for a dish',
      input_schema: {
        type: 'object',
        properties: {
          dish_name: { type: 'string' },
          serving_size: { type: 'number' },
        },
        required: ['dish_name'],
      },
    },
    {
      name: 'convert_units',
      description: 'Convert between cooking units',
      input_schema: {
        type: 'object',
        properties: {
          amount: { type: 'number' },
          from_unit: { type: 'string' },
          to_unit: { type: 'string' },
        },
        required: ['amount', 'from_unit', 'to_unit'],
      },
    },
  ];

  const response = await anthropic.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 4096,
    tools,
    messages: [
      {
        role: 'user',
        content: userQuery,
      },
    ],
  });

  // Check for tool use
  const toolUses = response.content.filter(c => c.type === 'tool_use');
  
  if (toolUses.length === 0) {
    return { response: response.content[0].text, toolCalls: [] };
  }

  // Execute tools
  const toolResults = [];
  for (const toolUse of toolUses) {
    const result = await executeTool(toolUse.name, toolUse.input);
    toolResults.push({
      type: 'tool_result',
      tool_use_id: toolUse.id,
      content: JSON.stringify(result),
    });
  }

  // Continue conversation with tool results
  const finalResponse = await anthropic.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 4096,
    tools,
    messages: [
      { role: 'user', content: userQuery },
      { role: 'assistant', content: response.content },
      { role: 'user', content: toolResults },
    ],
  });

  return {
    response: finalResponse.content[0].text,
    toolCalls: toolUses.map(t => ({ name: t.name, input: t.input })),
  };
}

/**
 * USE CASE 3: Long Context Document Analysis
 * Claude excels at long context - analyze entire meal plan documents
 */
async function analyzeMealPlanHistory(docs) {
  const systemPrompt = `You are a meal planning analyst. Analyze the provided meal history and provide insights.

Respond in this format:
<summary>Brief summary of eating patterns</summary>
<insights>
  <insight>Key observation about preferences</insight>
  ...
</insights>
<recommendations>
  <recommendation>Specific suggestion for improvement</recommendation>
  ...
</recommendations>
<nutritional_analysis>
  <protein>Adequate/Inadequate + details</protein>
  <vegetables>Adequate/Inadequate + details</vegetables>
  <variety>Good/Needs improvement + details</variety>
</nutritional_analysis>`;

  const combinedDocs = docs.map(d => `=== ${d.date} ===\n${d.content}`).join('\n\n');

  const response = await anthropic.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 4096,
    system: systemPrompt,
    messages: [
      {
        role: 'user',
        content: `Analyze this meal plan history:\n\n${combinedDocs}`,
      },
    ],
  });

  return parseSimpleXML(response.content[0].text);
}

/**
 * USE CASE 4: Multi-Turn Conversations with Context
 * Build interactive dinner planning conversations
 */
class DinnerPlanningConversation {
  constructor() {
    this.messages = [];
    this.systemPrompt = `You are a helpful dinner planning assistant. 
Help users plan meals, find recipes, and coordinate pickup times.
Be concise but friendly. Ask clarifying questions when needed.

Current context:
- Default pickup location: HEB Mueller
- Default pickup time: 6:00 PM
- Family size: Assume 4 unless specified

Always confirm before making changes to scheduled meals.`;
  }

  async sendMessage(userMessage) {
    this.messages.push({ role: 'user', content: userMessage });

    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 4096,
      system: this.systemPrompt,
      messages: this.messages,
    });

    const assistantMessage = response.content[0].text;
    this.messages.push({ role: 'assistant', content: assistantMessage });

    return assistantMessage;
  }

  async planMealInteractively() {
    const responses = [];
    
    // Step 1: Get cuisine preference
    responses.push(await this.sendMessage("What cuisine are you in the mood for tonight?"));
    
    // Step 2: Get dietary restrictions
    responses.push(await this.sendMessage("Any dietary restrictions or preferences I should know about?"));
    
    // Step 3: Get time constraint
    responses.push(await this.sendMessage("How much time do you have for cooking?"));
    
    // Step 4: Generate recommendation
    const recommendation = await this.sendMessage(
      "Based on your preferences, I recommend: Mediterranean Chicken Bowl (30 min, healthy, delicious). " +
      "Shall I add this to your meal plan?"
    );
    
    return { conversation: this.messages, recommendation };
  }

  getContext() {
    return this.messages;
  }

  clear() {
    this.messages = [];
  }
}

/**
 * USE CASE 5: Computer Use (Beta)
 * Claude can interact with computer interfaces
 * Note: This is a preview feature requiring special access
 */
async function generateMealPlanWithComputerUse(preferences) {
  // This is a conceptual example - Computer Use requires specific setup
  const response = await anthropic.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 4096,
    tools: [
      {
        type: 'computer_20241022',
        name: 'computer',
        display_width_px: 1024,
        display_height_px: 768,
      },
    ],
    messages: [
      {
        role: 'user',
        content: `Search for recipes matching these preferences on a recipe website: ${JSON.stringify(preferences)}`,
      },
    ],
  });

  return response;
}

// Helper functions
function parseSimpleXML(xml) {
  // Simple XML parser for demo purposes
  // In production, use a proper XML parser like fast-xml-parser
  const result = {};
  const tagRegex = /<(\w+)>([^<]*)<\/\w+>/g;
  let match;
  while ((match = tagRegex.exec(xml)) !== null) {
    result[match[1]] = match[2].trim();
  }
  return result;
}

async function executeTool(name, input) {
  const tools = {
    find_recipes: async (params) => ({
      recipes: [
        { name: 'Quick Chicken Stir Fry', time: 25, difficulty: 'easy' },
        { name: 'Sheet Pan Salmon', time: 30, difficulty: 'medium' },
      ],
    }),
    get_nutrition_info: async (params) => ({
      calories: 450,
      protein: '32g',
      carbs: '45g',
      fat: '18g',
    }),
    convert_units: async (params) => ({
      result: params.amount * (params.from_unit === 'cups' ? 240 : 1),
      unit: params.to_unit,
    }),
  };

  return tools[name] ? await tools[name](input) : { error: 'Unknown tool' };
}

// Demo runner
async function demo() {
  console.log('=== Claude API Integration Demo ===\n');

  // Demo 1: XML extraction
  console.log('Demo 1: Structured XML Extraction');
  const recipeText = `
    Grandma's Chicken Soup
    This classic recipe takes about 15 minutes to prep and 45 minutes to cook.
    Serves 6 people.
    
    Ingredients:
    - 1 whole chicken
    - 3 carrots, chopped
    - 2 celery stalks
    - 1 onion
    - Salt and pepper to taste
    
    Instructions:
    1. Boil the chicken in water
    2. Add vegetables
    3. Simmer for 45 minutes
  `;
  
  try {
    const parsed = await extractRecipeData(recipeText);
    console.log('Parsed recipe:', JSON.stringify(parsed, null, 2));
  } catch (e) {
    console.log('Skipping (no API key):', e.message);
  }

  // Demo 2: Tool use
  console.log('\nDemo 2: Tool Use');
  try {
    const result = await dinnerAssistantWithTools(
      "I want to make something with chicken that takes less than 30 minutes and is gluten-free. What are my options?"
    );
    console.log('Response:', result.response);
    console.log('Tools called:', result.toolCalls);
  } catch (e) {
    console.log('Skipping (no API key):', e.message);
  }

  // Demo 3: Long context analysis
  console.log('\nDemo 3: Meal History Analysis');
  const mealHistory = [
    { date: '2024-01-01', content: 'Breakfast: cereal. Lunch: sandwich. Dinner: pasta with meatballs.' },
    { date: '2024-01-02', content: 'Breakfast: eggs. Lunch: salad. Dinner: grilled chicken and vegetables.' },
    { date: '2024-01-03', content: 'Breakfast: toast. Lunch: soup. Dinner: pizza.' },
    { date: '2024-01-04', content: 'Breakfast: yogurt. Lunch: wrap. Dinner: salmon and rice.' },
    { date: '2024-01-05', content: 'Breakfast: oatmeal. Lunch: leftovers. Dinner: tacos.' },
  ];
  
  try {
    const analysis = await analyzeMealPlanHistory(mealHistory);
    console.log('Analysis:', JSON.stringify(analysis, null, 2));
  } catch (e) {
    console.log('Skipping (no API key):', e.message);
  }

  console.log('\nDemo complete!');
}

module.exports = {
  extractRecipeData,
  dinnerAssistantWithTools,
  analyzeMealPlanHistory,
  DinnerPlanningConversation,
};

if (require.main === module) {
  demo();
}
