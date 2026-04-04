/**
 * Weather Integration Prototype
 * 
 * Fetches weather for Buda, TX and suggests meals based on conditions
 * Uses OpenWeatherMap API (free tier: 1000 calls/day)
 * 
 * Usage:
 *   node prototypes/weather-integration.js
 *   node prototypes/weather-integration.js --suggest
 *   node prototypes/weather-integration.js --forecast
 */

const https = require('https');
const fs = require('fs').promises;
const path = require('path');

const CONFIG_FILE = path.join(__dirname, '..', '.secrets', 'openweather.json');
const CACHE_FILE = path.join(__dirname, '..', 'dinner-automation', 'data', 'weather-cache.json');

// Weather-based meal suggestions
const MEAL_SUGGESTIONS = {
  cold: {
    tempThreshold: 50,
    tags: ['soup', 'stew', 'comfort', 'warm', 'hearty', 'pasta', 'casserole'],
    descriptions: [
      'Perfect weather for something warm and comforting',
      'Cold day calls for hearty flavors',
      'Warm up with a cozy dish'
    ]
  },
  hot: {
    tempThreshold: 85,
    tags: ['salad', 'grilling', 'cold', 'fresh', 'light', 'no-cook', 'seafood'],
    descriptions: [
      'Keep it light and fresh today',
      'Perfect grilling weather!',
      'Something refreshing for the heat'
    ]
  },
  rainy: {
    conditions: ['Rain', 'Drizzle', 'Thunderstorm'],
    tags: ['soup', 'comfort', 'pasta', 'indoor', 'slow-cook', 'curry'],
    descriptions: [
      'Rainy day comfort food',
      'Perfect for staying in and cooking',
      'Warm up from the wet weather'
    ]
  },
  nice: {
    tempMin: 65,
    tempMax: 80,
    conditions: ['Clear', 'Clouds'],
    tags: ['grilling', 'fresh', 'outdoor', 'salad', 'light', 'seafood'],
    descriptions: [
      'Beautiful day for outdoor dining',
      'Fresh flavors for a lovely day',
      'Great grilling weather!'
    ]
  }
};

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
 * Load cached weather data
 */
async function loadCache() {
  try {
    const data = await fs.readFile(CACHE_FILE, 'utf8');
    return JSON.parse(data);
  } catch {
    return null;
  }
}

/**
 * Save weather cache
 */
async function saveCache(data) {
  const cache = {
    ...data,
    cachedAt: new Date().toISOString()
  };
  await fs.writeFile(CACHE_FILE, JSON.stringify(cache, null, 2));
}

/**
 * Check if cache is still valid (30 minutes)
 */
function isCacheValid(cache) {
  if (!cache?.cachedAt) return false;
  const age = Date.now() - new Date(cache.cachedAt).getTime();
  return age < 30 * 60 * 1000; // 30 minutes
}

/**
 * Make HTTP request to OpenWeatherMap
 */
function makeRequest(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.cod && json.cod !== 200) {
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
 * Fetch current weather for Buda, TX
 */
async function fetchCurrentWeather(apiKey) {
  // Buda, TX coordinates
  const lat = 30.0813;
  const lon = -97.8281;
  
  const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=imperial`;
  
  return makeRequest(url);
}

/**
 * Fetch 5-day forecast
 */
async function fetchForecast(apiKey) {
  const lat = 30.0813;
  const lon = -97.8281;
  
  const url = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${apiKey}&units=imperial`;
  
  return makeRequest(url);
}

/**
 * Get weather condition and suggestion
 */
function analyzeWeather(weather) {
  const temp = weather.main.temp;
  const condition = weather.weather[0].main;
  const description = weather.weather[0].description;
  const humidity = weather.main.humidity;
  const windSpeed = weather.wind.speed;
  
  let suggestion = null;
  
  // Check conditions in priority order
  if (MEAL_SUGGESTIONS.rainy.conditions.includes(condition)) {
    suggestion = MEAL_SUGGESTIONS.rainy;
  } else if (temp < MEAL_SUGGESTIONS.cold.tempThreshold) {
    suggestion = MEAL_SUGGESTIONS.cold;
  } else if (temp > MEAL_SUGGESTIONS.hot.tempThreshold) {
    suggestion = MEAL_SUGGESTIONS.hot;
  } else if (temp >= MEAL_SUGGESTIONS.nice.tempMin && 
             temp <= MEAL_SUGGESTIONS.nice.tempMax &&
             MEAL_SUGGESTIONS.nice.conditions.includes(condition)) {
    suggestion = MEAL_SUGGESTIONS.nice;
  } else {
    // Default - moderate weather
    suggestion = {
      tags: ['balanced', 'versatile', 'family-friendly'],
      descriptions: ['Great day for any meal!']
    };
  }
  
  return {
    temp: Math.round(temp),
    condition,
    description,
    humidity,
    windSpeed,
    suggestion: {
      tags: suggestion.tags,
      description: suggestion.descriptions[Math.floor(Math.random() * suggestion.descriptions.length)]
    }
  };
}

/**
 * Get current weather with caching
 */
async function getCurrentWeather(useCache = true) {
  // Check cache first
  if (useCache) {
    const cache = await loadCache();
    if (isCacheValid(cache)) {
      console.log('📦 Using cached weather data');
      return cache;
    }
  }
  
  // Fetch fresh data
  const config = await loadConfig();
  if (!config?.apiKey) {
    throw new Error('OpenWeatherMap API key not found. Create .secrets/openweather.json');
  }
  
  console.log('🌤️  Fetching weather data...');
  const weather = await fetchCurrentWeather(config.apiKey);
  const analyzed = analyzeWeather(weather);
  
  // Save to cache
  await saveCache(analyzed);
  
  return analyzed;
}

/**
 * Suggest meals from recipe database based on weather
 */
async function suggestMeals(weather) {
  const recipeDb = await fs.readFile(
    path.join(__dirname, '..', 'dinner-automation', 'data', 'recipe-database.json'),
    'utf8'
  );
  const recipes = JSON.parse(recipeDb).recipes || {};
  
  const suggestedTags = weather.suggestion.tags;
  const suggestions = [];
  
  for (const [name, recipe] of Object.entries(recipes)) {
    // Match by cuisine and tags
    const cuisine = (recipe.cuisine || '').toLowerCase();
    const tags = recipe.tags || [];
    const difficulty = recipe.difficulty || 'Medium';
    
    // Score based on tag matches
    let score = 0;
    for (const tag of suggestedTags) {
      if (cuisine.includes(tag) || tags.some(t => t.toLowerCase().includes(tag))) {
        score += 1;
      }
    }
    
    // Prefer easy meals on weeknights
    if (difficulty === 'Easy') score += 0.5;
    
    if (score > 0) {
      suggestions.push({ name, score, recipe });
    }
  }
  
  // Sort by score and return top 5
  suggestions.sort((a, b) => b.score - a.score);
  return suggestions.slice(0, 5);
}

/**
 * Display weather in nice format
 */
function displayWeather(weather) {
  console.log('\n╔════════════════════════════════════════════════╗');
  console.log('║          Weather in Buda, TX                   ║');
  console.log('╠════════════════════════════════════════════════╣');
  console.log(`║  🌡️  Temperature: ${weather.temp}°F                              ║`.slice(0, 49) + '║');
  console.log(`║  ☁️  Condition: ${weather.description}                        `.slice(0, 47) + '║');
  console.log(`║  💧 Humidity: ${weather.humidity}%                              `.slice(0, 47) + '║');
  console.log(`║  💨 Wind: ${Math.round(weather.windSpeed)} mph                             `.slice(0, 47) + '║');
  console.log('╠════════════════════════════════════════════════╣');
  console.log('║  🍽️  Meal Suggestion                            ║');
  console.log(`║     ${weather.suggestion.description}                    `.slice(0, 49) + '║');
  console.log(`║     Tags: ${weather.suggestion.tags.slice(0, 3).join(', ')}          `.slice(0, 49) + '║');
  console.log('╚════════════════════════════════════════════════╝\n');
}

/**
 * Main function
 */
async function main() {
  const args = process.argv.slice(2);
  
  try {
    if (args.includes('--forecast')) {
      const config = await loadConfig();
      if (!config?.apiKey) {
        console.error('❌ API key not found. Create .secrets/openweather.json with: { "apiKey": "your-key" }');
        process.exit(1);
      }
      
      console.log('📅 Fetching 5-day forecast...\n');
      const forecast = await fetchForecast(config.apiKey);
      
      // Group by day
      const daily = {};
      for (const item of forecast.list) {
        const date = item.dt_txt.split(' ')[0];
        if (!daily[date]) daily[date] = [];
        daily[date].push(item);
      }
      
      console.log('5-Day Forecast:');
      for (const [date, items] of Object.entries(daily)) {
        const midday = items.find(i => i.dt_txt.includes('12:00')) || items[0];
        const analysis = analyzeWeather(midday);
        const dayName = new Date(date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
        
        console.log(`\n${dayName}:`);
        console.log(`  ${analysis.temp}°F, ${analysis.description}`);
        console.log(`  → ${analysis.suggestion.description}`);
      }
      
    } else {
      // Current weather
      const weather = await getCurrentWeather(!args.includes('--fresh'));
      displayWeather(weather);
      
      if (args.includes('--suggest')) {
        console.log('🔍 Finding matching meals...\n');
        const suggestions = await suggestMeals(weather);
        
        if (suggestions.length > 0) {
          console.log('Top Suggestions:');
          suggestions.forEach((s, i) => {
            console.log(`${i + 1}. ${s.name} (score: ${s.score.toFixed(1)})`);
          });
        } else {
          console.log('No matching meals found in database.');
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main();

// Export for use in other scripts
module.exports = { getCurrentWeather, suggestMeals, analyzeWeather };
