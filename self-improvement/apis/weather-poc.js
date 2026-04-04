/**
 * Weather API Integration POC
 * Context-aware meal planning support
 * 
 * @module apis/weather-poc
 */

const https = require('https');

// Configuration
const CONFIG = {
  apiKey: process.env.OPENWEATHER_API_KEY,
  baseUrl: 'https://api.openweathermap.org/data/2.5',
  units: 'imperial' // Fahrenheit
};

/**
 * Get current weather
 */
async function getCurrentWeather(city, state = '') {
  const location = state ? `${city},${state},US` : `${city},US`;
  const url = `${CONFIG.baseUrl}/weather?q=${encodeURIComponent(location)}&units=${CONFIG.units}&appid=${CONFIG.apiKey}`;
  
  return makeRequest(url);
}

/**
 * Get 5-day forecast
 */
async function getForecast(city, state = '') {
  const location = state ? `${city},${state},US` : `${city},US`;
  const url = `${CONFIG.baseUrl}/forecast?q=${encodeURIComponent(location)}&units=${CONFIG.units}&appid=${CONFIG.apiKey}`;
  
  return makeRequest(url);
}

/**
 * Get weather by coordinates
 */
async function getWeatherByCoords(lat, lon) {
  const url = `${CONFIG.baseUrl}/weather?lat=${lat}&lon=${lon}&units=${CONFIG.units}&appid=${CONFIG.apiKey}`;
  return makeRequest(url);
}

/**
 * Get severe weather alerts
 */
async function getAlerts(stateCode) {
  // Note: One Call API 3.0 required for alerts
  const url = `https://api.openweathermap.org/data/3.0/onecall/alerts?lat=30.2672&lon=-97.7431&appid=${CONFIG.apiKey}`;
  return makeRequest(url);
}

/**
 * Make HTTPS request
 */
function makeRequest(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.cod && parsed.cod !== 200) {
            reject(new Error(parsed.message || 'API Error'));
          } else {
            resolve(parsed);
          }
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

/**
 * Get meal suggestions based on weather
 */
function getMealSuggestions(weather) {
  const temp = weather.main.temp;
  const conditions = weather.weather[0].main.toLowerCase();
  
  const suggestions = {
    hot: {
      temp: temp > 85,
      meals: ['Grilled chicken salad', 'Cold pasta salad', 'Fish tacos', 'Gazpacho', 'BBQ ribs'],
      reasons: ['No oven heating', 'Refreshing', 'Light meals']
    },
    cold: {
      temp: temp < 50,
      meals: ['Beef stew', 'Chicken pot pie', 'Chili', 'Pot roast', 'Soup and sandwich'],
      reasons: ['Warming', 'Comfort food', 'Slow cooker friendly']
    },
    rainy: {
      conditions: ['rain', 'drizzle', 'thunderstorm'],
      meals: ['Mac and cheese', 'Chicken noodle soup', 'Grilled cheese', 'Potato soup', 'Risotto'],
      reasons: ['Cozy indoor cooking', 'Comfort food', 'One-pot meals']
    },
    nice: {
      temp: temp >= 60 && temp <= 80,
      meals: ['Grilled salmon', 'Pasta primavera', 'Chicken stir-fry', 'Tacos', 'Pizza night'],
      reasons: ['Perfect grilling weather', 'Fresh ingredients', 'Quick cooking']
    }
  };
  
  const applicable = [];
  
  if (suggestions.hot.temp) applicable.push(suggestions.hot);
  if (suggestions.cold.temp) applicable.push(suggestions.cold);
  if (suggestions.rainy.conditions.some(c => conditions.includes(c))) {
    applicable.push(suggestions.rainy);
  }
  if (applicable.length === 0) applicable.push(suggestions.nice);
  
  return applicable;
}

/**
 * Generate meal plan based on weather forecast
 */
async function generateWeatherBasedMealPlan(city, state, days = 5) {
  console.log(`\n🌤️  Generating weather-based meal plan for ${city}, ${state}...\n`);
  
  try {
    const forecast = await getForecast(city, state);
    const dailyForecasts = aggregateDailyForecast(forecast.list);
    
    const mealPlan = [];
    
    for (let i = 0; i < Math.min(days, dailyForecasts.length); i++) {
      const day = dailyForecasts[i];
      const suggestions = getMealSuggestions(day);
      
      mealPlan.push({
        date: day.date,
        weather: {
          temp: Math.round(day.main.temp),
          condition: day.weather[0].main,
          description: day.weather[0].description
        },
        suggestions: suggestions.flatMap(s => s.meals).slice(0, 3),
        reasons: suggestions.flatMap(s => s.reasons)
      });
    }
    
    return mealPlan;
    
  } catch (error) {
    console.error('Failed to generate meal plan:', error.message);
    throw error;
  }
}

/**
 * Aggregate 3-hour forecast into daily forecasts
 */
function aggregateDailyForecast(list) {
  const daily = {};
  
  for (const item of list) {
    const date = new Date(item.dt * 1000).toDateString();
    if (!daily[date]) {
      daily[date] = { ...item, date };
    }
  }
  
  return Object.values(daily);
}

/**
 * Print meal plan
 */
function printMealPlan(mealPlan) {
  console.log('📅 Weather-Based Meal Plan\n');
  
  for (const day of mealPlan) {
    console.log(`${day.date}:`);
    console.log(`  🌡️  ${day.weather.temp}°F - ${day.weather.condition}`);
    console.log(`  🍽️  Suggestions: ${day.suggestions.join(', ')}`);
    console.log(`  💡 Why: ${day.reasons.join(', ')}`);
    console.log();
  }
}

// Demo
async function demo() {
  console.log('Weather API Integration POC');
  console.log('===========================\n');
  
  if (!CONFIG.apiKey) {
    console.log('⚠️  OPENWEATHER_API_KEY not set');
    console.log('   Get free API key at: https://openweathermap.org/api\n');
    console.log('Features available:');
    console.log('  - Current weather lookup');
    console.log('  - 5-day forecast');
    console.log('  - Weather-based meal suggestions');
    console.log('  - Severe weather alerts\n');
    return;
  }
  
  try {
    // Demo: Austin weather and meal plan
    const city = process.argv[2] || 'Austin';
    const state = process.argv[3] || 'TX';
    
    // Current weather
    console.log(`Getting current weather for ${city}...`);
    const current = await getCurrentWeather(city, state);
    console.log(`  🌡️  Temperature: ${Math.round(current.main.temp)}°F`);
    console.log(`  ☁️  Conditions: ${current.weather[0].description}`);
    console.log(`  💧 Humidity: ${current.main.humidity}%\n`);
    
    // Meal suggestions
    const suggestions = getMealSuggestions(current);
    console.log('🍽️  Meal Suggestions:');
    for (const s of suggestions) {
      console.log(`  • ${s.meals.slice(0, 3).join(', ')}`);
    }
    console.log();
    
    // Generate meal plan
    const mealPlan = await generateWeatherBasedMealPlan(city, state, 3);
    printMealPlan(mealPlan);
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

if (require.main === module) {
  demo();
}

module.exports = {
  getCurrentWeather,
  getForecast,
  getWeatherByCoords,
  getAlerts,
  getMealSuggestions,
  generateWeatherBasedMealPlan
};
