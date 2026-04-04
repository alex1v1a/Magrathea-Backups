# API Integration Research for Alexander's Workflow

*Research Date: February 16, 2026*

This document outlines potential API integrations to enhance Alexander's personal workflow, including project management, meal planning, and development tasks.

---

## 1. Notion API - Project & Task Management

### Use Case for Alexander's Workflow
- **Centralized Project Hub**: Sync tasks, notes, and project status between OpenClaw and Notion
- **Meal Planning Database**: Create a shared meal planning database with grocery lists linked to HEB automation
- **Daily Journal/Log**: Auto-create daily notes with weather, calendar events, and task summaries
- **Project Tracking**: Manage coding projects, dinner automation improvements, and personal goals in one place
- **Knowledge Base**: Store recipes, API documentation, and system configurations

### Authentication Approach
- **Method**: OAuth 2.0 flow OR Internal Integration Token
- **Recommended**: Internal Integration Token for personal use
- **Steps**:
  1. Go to https://www.notion.so/my-integrations
  2. Create new integration
  3. Copy the Internal Integration Token
  4. Share specific pages/databases with the integration
- **Security**: Store token in environment variable `NOTION_TOKEN`

### Sample API Call
```javascript
// Create a new page in a database
const { Client } = require('@notionhq/client');

const notion = new Client({ auth: process.env.NOTION_TOKEN });

async function addMealPlan(date, meal, ingredients) {
  const response = await notion.pages.create({
    parent: { database_id: 'your-database-id' },
    properties: {
      'Date': { date: { start: date } },
      'Meal': { title: [{ text: { content: meal } }] },
      'Ingredients': { multi_select: ingredients.map(i => ({ name: i })) },
      'Status': { select: { name: 'Planned' } }
    }
  });
  return response;
}

// Query a database
async function getTodaysMeals() {
  const response = await notion.databases.query({
    database_id: 'your-database-id',
    filter: {
      property: 'Date',
      date: { equals: new Date().toISOString().split('T')[0] }
    }
  });
  return response.results;
}
```

### Implementation Complexity: **MEDIUM**
- RESTful API with good SDK support
- Rate limits: ~3 requests per second
- Need to understand Notion's block-based content model
- Good documentation and community support

---

## 2. OpenAI/Anthropic API - Structured Outputs & Function Calling

### Use Case for Alexander's Workflow
- **Structured Meal Parsing**: Parse recipe ingredients into structured data (quantity, unit, item)
- **Smart Recipe Suggestions**: Generate recipes based on dietary preferences, weather, and available ingredients
- **Grocery List Optimization**: Categorize and consolidate grocery items by store section
- **Automated Documentation**: Generate structured project documentation from notes
- **Intent Classification**: Route natural language commands to appropriate automation scripts

### Authentication Approach
- **Method**: API Key authentication
- **OpenAI**: https://platform.openai.com/api-keys
- **Anthropic**: https://console.anthropic.com/settings/keys
- **Security**: Store keys in environment variables (`OPENAI_API_KEY`, `ANTHROPIC_API_KEY`)
- **Cost Management**: Set usage limits in console dashboards

### Sample API Call - OpenAI Structured Outputs
```javascript
// OpenAI - Structured JSON output for recipe parsing
const OpenAI = require('openai');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function parseRecipe(text) {
  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: 'Parse recipes into structured JSON with ingredients, quantities, and instructions.'
      },
      { role: 'user', content: text }
    ],
    response_format: {
      type: 'json_schema',
      json_schema: {
        name: 'recipe',
        strict: true,
        schema: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            ingredients: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  item: { type: 'string' },
                  quantity: { type: 'number' },
                  unit: { type: 'string' }
                },
                required: ['item', 'quantity', 'unit']
              }
            },
            cook_time_minutes: { type: 'integer' },
            difficulty: { enum: ['easy', 'medium', 'hard'] }
          },
          required: ['title', 'ingredients', 'cook_time_minutes', 'difficulty']
        }
      }
    }
  });
  
  return JSON.parse(response.choices[0].message.content);
}
```

### Sample API Call - Anthropic Tool Use
```javascript
// Anthropic - Function calling for weather-based meal suggestions
const Anthropic = require('@anthropic-ai/sdk');

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

async function suggestMeal(weatherCondition, availableIngredients) {
  const message = await anthropic.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 1024,
    tools: [
      {
        name: 'suggest_recipe',
        description: 'Suggest a recipe based on weather and ingredients',
        input_schema: {
          type: 'object',
          properties: {
            recipe_name: { type: 'string' },
            reason: { type: 'string' },
            ingredients_needed: {
              type: 'array',
              items: { type: 'string' }
            },
            is_comfort_food: { type: 'boolean' }
          },
          required: ['recipe_name', 'reason', 'ingredients_needed']
        }
      }
    ],
    messages: [
      {
        role: 'user',
        content: `Weather: ${weatherCondition}. Available ingredients: ${availableIngredients.join(', ')}`
      }
    ]
  });
  
  // Check if tool was called
  if (message.stop_reason === 'tool_use') {
    const toolUse = message.content.find(c => c.type === 'tool_use');
    return toolUse.input;
  }
  
  return message.content[0].text;
}
```

### Implementation Complexity: **LOW**
- Simple HTTP API with excellent SDKs
- JSON Schema validation for structured outputs
- Built-in error handling and retry logic
- Usage-based pricing (pay-as-you-go)

---

## 3. Weather API - Dinner Planning Context

### Use Case for Alexander's Workflow
- **Contextual Meal Suggestions**: Comfort food on rainy/cold days, grilling on nice days
- **Weekly Planning**: Adjust meal prep based on 7-day forecast
- **Outdoor Cooking Alerts**: Notify when weather is good for grilling/smoking
- **Seasonal Recipe Rotation**: Suggest seasonal ingredients based on local weather patterns

### Authentication Approach
- **Provider**: OpenWeatherMap (free tier available)
- **Sign Up**: https://home.openweathermap.org/users/sign_up
- **API Key**: Generated after account creation
- **Free Tier**: 1,000 calls/day (sufficient for personal use)
- **Security**: Store as `OPENWEATHER_API_KEY`

### Sample API Call
```javascript
// Get current weather and 5-day forecast
const axios = require('axios');

const API_KEY = process.env.OPENWEATHER_API_KEY;
const LAT = '30.2672';  // Austin, TX latitude
const LON = '-97.7431'; // Austin, TX longitude

async function getWeatherForMealPlanning() {
  try {
    // Current weather
    const current = await axios.get(
      `https://api.openweathermap.org/data/2.5/weather?lat=${LAT}&lon=${LON}&appid=${API_KEY}&units=imperial`
    );
    
    // 5-day forecast (3-hour intervals)
    const forecast = await axios.get(
      `https://api.openweathermap.org/data/2.5/forecast?lat=${LAT}&lon=${LON}&appid=${API_KEY}&units=imperial`
    );
    
    return {
      current: {
        temp: current.data.main.temp,
        feels_like: current.data.main.feels_like,
        description: current.data.weather[0].description,
        is_rainy: current.data.weather[0].main === 'Rain',
        is_hot: current.data.main.temp > 85
      },
      forecast: forecast.data.list.map(f => ({
        datetime: f.dt_txt,
        temp: f.main.temp,
        description: f.weather[0].description,
        good_for_grilling: f.main.temp > 60 && f.weather[0].main === 'Clear'
      }))
    };
  } catch (error) {
    console.error('Weather API error:', error.message);
    return null;
  }
}

// Use weather to suggest meal type
function suggestMealType(weather) {
  if (weather.is_rainy || weather.feels_like < 50) {
    return { type: 'comfort_food', reason: 'Cold/rainy weather - perfect for soup or stew' };
  }
  if (weather.is_hot) {
    return { type: 'light', reason: 'Hot day - salad or cold dishes' };
  }
  if (weather.feels_like > 65 && weather.feels_like < 80) {
    return { type: 'grilling', reason: 'Perfect weather for outdoor cooking' };
  }
  return { type: 'regular', reason: 'Standard meal options' };
}
```

### Implementation Complexity: **LOW**
- Simple REST API with clear documentation
- Free tier adequate for personal automation
- No OAuth required (API key only)
- Rate limits generous for daily checks

---

## 4. Nutrition API - Healthier Meal Planning

### Use Case for Alexander's Workflow
- **Nutritional Analysis**: Calculate macros (protein, carbs, fat) for meal plans
- **Health Goals**: Track daily calorie and nutrient targets
- **Recipe Modification**: Suggest healthier substitutions
- **Dietary Compliance**: Check recipes against dietary restrictions (low-carb, keto, etc.)
- **Shopping Optimization**: Prioritize nutrient-dense ingredients

### Authentication Approach
- **Primary Provider**: Edamam (https://developer.edamam.com/)
- **Free Tier**: 10,000 calls/month for Nutrition Analysis
- **Auth**: App ID + App Key pair
- **Alternative**: Spoonacular (150 free calls/day)
- **Security**: Store as `EDAMAM_APP_ID` and `EDAMAM_APP_KEY`

### Sample API Call - Edamam
```javascript
// Analyze nutrition of recipe ingredients
const axios = require('axios');

const APP_ID = process.env.EDAMAM_APP_ID;
const APP_KEY = process.env.EDAMAM_APP_KEY;

async function analyzeRecipeNutrition(ingredients) {
  try {
    const response = await axios.post(
      'https://api.edamam.com/api/nutrition-details',
      {
        title: 'Dinner Recipe',
        ingr: ingredients,
        yield: 4  // Number of servings
      },
      {
        params: {
          app_id: APP_ID,
          app_key: APP_KEY
        },
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
    
    const nutrition = response.data;
    return {
      calories: nutrition.calories,
      protein: nutrition.totalNutrients.PROCNT.quantity,
      carbs: nutrition.totalNutrients.CHOCDF.quantity,
      fat: nutrition.totalNutrients.FAT.quantity,
      fiber: nutrition.totalNutrients.FIBTG?.quantity || 0,
      healthLabels: nutrition.healthLabels,
      dietLabels: nutrition.dietLabels,
      cautions: nutrition.cautions
    };
  } catch (error) {
    console.error('Nutrition API error:', error.message);
    return null;
  }
}

// Check if recipe fits dietary goals
function checkDietaryFit(nutrition, goals) {
  const issues = [];
  
  if (goals.maxCalories && nutrition.calories > goals.maxCalories) {
    issues.push(`High calories: ${Math.round(nutrition.calories)} vs goal ${goals.maxCalories}`);
  }
  if (goals.minProtein && nutrition.protein < goals.minProtein) {
    issues.push(`Low protein: ${Math.round(nutrition.protein)}g vs goal ${goals.minProtein}g`);
  }
  if (goals.lowCarb && nutrition.carbs > 30) {
    issues.push(`High carbs: ${Math.round(nutrition.carbs)}g (low-carb target)`);
  }
  
  return {
    fitsGoals: issues.length === 0,
    issues: issues,
    score: calculateHealthScore(nutrition, goals)
  };
}

function calculateHealthScore(nutrition, goals) {
  let score = 100;
  
  // Penalty for excessive calories
  if (nutrition.calories > 800) score -= 20;
  
  // Bonus for protein content
  if (nutrition.protein > 30) score += 10;
  
  // Penalty for low fiber
  if (nutrition.fiber < 5) score -= 10;
  
  return Math.max(0, Math.min(100, score));
}
```

### Sample API Call - Spoonacular (Alternative)
```javascript
// Parse ingredients and get nutrition info
const axios = require('axios');

const API_KEY = process.env.SPOONACULAR_API_KEY;

async function parseIngredients(ingredientList) {
  const response = await axios.post(
    'https://api.spoonacular.com/recipes/parseIngredients',
    ingredientList.join('\n'),
    {
      params: {
        apiKey: API_KEY,
        includeNutrition: true
      },
      headers: { 'Content-Type': 'text/plain' }
    }
  );
  
  return response.data.map(ing => ({
    name: ing.name,
    amount: ing.amount,
    unit: ing.unit,
    nutrition: ing.nutrition?.nutrients || []
  }));
}
```

### Implementation Complexity: **MEDIUM**
- Edamam has stricter rate limits but better free tier
- Need to handle ingredient parsing/formatting
- Multiple API providers with different data structures
- Some recipes may need manual ingredient entry

---

## 5. GitHub API - Code & Project Management

### Use Case for Alexander's Workflow
- **Backup Automation**: Auto-commit dinner automation scripts and configs
- **Issue Tracking**: Create GitHub issues from TODOs in code comments
- **Project Dashboard**: Track progress on multiple personal projects
- **Release Management**: Tag and document releases of automation tools
- **Collaboration**: Share code snippets and get feedback on implementations
- **Documentation**: Sync README files with project documentation

### Authentication Approach
- **Method**: Personal Access Token (classic) or Fine-grained PAT
- **Create Token**: https://github.com/settings/tokens
- **Recommended Scopes**: `repo`, `workflow`, `read:user`
- **Fine-grained PAT**: More secure, repo-specific permissions
- **Security**: Store as `GITHUB_TOKEN`

### Sample API Call
```javascript
// GitHub API with Octokit SDK
const { Octokit } = require('@octokit/rest');

const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

async function createProjectIssue(repo, title, body, labels = []) {
  const [owner, repoName] = repo.split('/');
  
  const response = await octokit.rest.issues.create({
    owner,
    repo: repoName,
    title,
    body,
    labels
  });
  
  return response.data;
}

// Get repository information
async function getRepoInfo(repo) {
  const [owner, repoName] = repo.split('/');
  
  const { data } = await octokit.rest.repos.get({
    owner,
    repo: repoName
  });
  
  return {
    name: data.name,
    description: data.description,
    stars: data.stargazers_count,
    openIssues: data.open_issues_count,
    lastPush: data.pushed_at,
    defaultBranch: data.default_branch
  };
}

// List open issues for a project
async function listOpenIssues(repo, labels = []) {
  const [owner, repoName] = repo.split('/');
  
  const { data } = await octokit.rest.issues.listForRepo({
    owner,
    repo: repoName,
    state: 'open',
    labels: labels.join(','),
    per_page: 100
  });
  
  return data.map(issue => ({
    number: issue.number,
    title: issue.title,
    labels: issue.labels.map(l => l.name),
    createdAt: issue.created_at,
    url: issue.html_url
  }));
}

// Create a file or update existing
async function commitFile(repo, path, content, message, branch = 'main') {
  const [owner, repoName] = repo.split('/');
  
  // Get current file SHA if it exists
  let sha;
  try {
    const { data } = await octokit.rest.repos.getContent({
      owner,
      repo: repoName,
      path,
      ref: branch
    });
    sha = data.sha;
  } catch (e) {
    // File doesn't exist yet
  }
  
  // Create or update file
  const { data } = await octokit.rest.repos.createOrUpdateFileContents({
    owner,
    repo: repoName,
    path,
    message,
    content: Buffer.from(content).toString('base64'),
    sha,
    branch
  });
  
  return data;
}

// Example: Sync project status to GitHub
async function syncProjectStatus(projectName, status) {
  const content = `# ${projectName} Status

Last updated: ${new Date().toISOString()}

## Current Status
${status.summary}

## TODOs
${status.todos.map(t => `- [${t.done ? 'x' : ' '}] ${t.text}`).join('\n')}

## Recent Commits
${status.recentCommits.map(c => `- ${c.message} (${c.date})`).join('\n')}
`;
  
  await commitFile(
    'alexander/my-projects',
    `${projectName}/STATUS.md`,
    content,
    `Update ${projectName} status - ${new Date().toLocaleDateString()}`
  );
}
```

### Implementation Complexity: **LOW**
- Excellent Octokit SDK for JavaScript
- Well-documented REST and GraphQL APIs
- Rate limits generous for personal use (5,000/hour with token)
- Webhook support for real-time updates

---

## Summary Comparison Table

| API | Complexity | Cost | Primary Use | Auth Method |
|-----|------------|------|-------------|-------------|
| **Notion** | Medium | Free personal | Project/Task Management | OAuth 2.0 / Token |
| **OpenAI** | Low | Pay-per-use | Structured Data, NLP | API Key |
| **Anthropic** | Low | Pay-per-use | Function Calling, Reasoning | API Key |
| **OpenWeather** | Low | Free tier | Weather Context | API Key |
| **Edamam** | Medium | Free tier | Nutrition Analysis | App ID + Key |
| **GitHub** | Low | Free | Code Management | PAT / Token |

---

## Recommended Implementation Priority

1. **GitHub API** - Start here for backing up and organizing existing automation code
2. **Weather API** - Quick win for contextual meal suggestions
3. **OpenAI API** - Enhance existing dinner automation with structured outputs
4. **Notion API** - Create centralized project hub (requires more setup)
5. **Nutrition API** - Add after meal planning workflow is solid

---

## Security Best Practices

- Store all API keys in environment variables
- Never commit `.env` files to GitHub
- Use fine-grained permissions where available
- Rotate tokens periodically
- Monitor API usage for unexpected spikes
- Consider using a secrets manager for production deployments

---

## Next Steps

1. Generate API keys for priority integrations
2. Create a `.env.example` file with required variables
3. Build small proof-of-concept scripts for each API
4. Integrate into existing dinner automation workflow
5. Document any additional findings in this file
