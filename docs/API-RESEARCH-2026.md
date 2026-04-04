# API Research 2026 - Household Automation Integrations

**Research Date:** February 2026  
**Prepared for:** Alexander's Household Automation System  
**Location:** Texas, USA (Austin area)

---

## Table of Contents

1. [Weather API - Open-Meteo](#1-weather-api---open-meteo)
2. [Traffic/Commute API - Google Routes API](#2-trafficcommute-api---google-routes-api)
3. [Grocery Price Comparison - RapidAPI/Alternative Approach](#3-grocery-price-comparison---rapidapi-alternative-approach)
4. [Home Energy Monitoring - Tesla Powerwall Local API](#4-home-energy-monitoring---tesla-powerwall-local-api)
5. [Package Delivery Tracking - Shippo API](#5-package-delivery-tracking---shippo-api)

---

## 1. Weather API - Open-Meteo

### Overview
Open-Meteo is an open-source weather API that provides high-resolution weather forecasts without requiring an API key for non-commercial use. It's ideal for household automation due to its generous free tier and comprehensive data.

### Why Open-Meteo for Alexander's Household
- ✅ **100% Free** - No API key required for non-commercial use
- ✅ **No Rate Limits** - Up to 10,000 calls/day on free tier
- ✅ **High Resolution** - 1-11 km resolution using national weather services
- ✅ **No Registration** - Start using immediately
- ✅ **Comprehensive Data** - Temperature, precipitation, UV index, air quality

### Authentication
**NONE REQUIRED** for non-commercial use under 10,000 calls/day.

For commercial use or higher limits:
- Sign up at https://open-meteo.com/en/pricing
- API Key authentication via query parameter or header

### Node.js Code Example

```javascript
/**
 * Open-Meteo Weather API Integration
 * Free weather forecasts for household automation
 */

const axios = require('axios');

// Austin, TX coordinates (update for your location)
const LATITUDE = 30.2672;
const LONGITUDE = -97.7431;

class WeatherService {
  constructor() {
    this.baseUrl = 'https://api.open-meteo.com/v1';
  }

  /**
   * Get current weather and 7-day forecast
   */
  async getForecast() {
    try {
      const response = await axios.get(`${this.baseUrl}/forecast`, {
        params: {
          latitude: LATITUDE,
          longitude: LONGITUDE,
          current: 'temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m',
          hourly: 'temperature_2m,precipitation_probability,weather_code',
          daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,uv_index_max',
          temperature_unit: 'fahrenheit',
          wind_speed_unit: 'mph',
          precipitation_unit: 'inch',
          timezone: 'America/Chicago',
          forecast_days: 7
        }
      });

      return this.formatWeatherData(response.data);
    } catch (error) {
      console.error('Weather API Error:', error.message);
      throw error;
    }
  }

  /**
   * Get clothing recommendation based on weather
   */
  getClothingRecommendation(current) {
    const temp = current.temperature_2m;
    const weatherCode = current.weather_code;
    
    let recommendation = {
      jacket: temp < 60,
      shorts: temp > 75,
      umbrella: [51, 53, 55, 61, 63, 65, 80, 81, 82].includes(weatherCode),
      sunscreen: temp > 80 || current.uv_index_max > 6,
      layers: temp >= 60 && temp <= 70
    };

    return recommendation;
  }

  /**
   * Check if conditions are good for outdoor activities
   */
  isGoodForOutdoors(data) {
    const current = data.current;
    const goodWeatherCodes = [0, 1, 2, 3]; // Clear to partly cloudy
    
    return {
      suitable: goodWeatherCodes.includes(current.weather_code) && 
                current.temperature_2m > 55 && 
                current.temperature_2m < 95,
      temperature: current.temperature_2m,
      windSpeed: current.wind_speed_10m,
      reason: this.getOutdoorReason(current)
    };
  }

  getOutdoorReason(current) {
    if (current.precipitation > 0) return 'Rain expected';
    if (current.temperature_2m < 50) return 'Too cold';
    if (current.temperature_2m > 95) return 'Too hot';
    if (current.wind_speed_10m > 20) return 'Too windy';
    return 'Great conditions!';
  }

  formatWeatherData(data) {
    return {
      current: {
        temperature: data.current.temperature_2m,
        feelsLike: data.current.apparent_temperature,
        humidity: data.current.relative_humidity_2m,
        precipitation: data.current.precipitation,
        windSpeed: data.current.wind_speed_10m,
        weatherCode: data.current.weather_code
      },
      daily: data.daily,
      clothing: this.getClothingRecommendation(data.current),
      outdoor: this.isGoodForOutdoors(data)
    };
  }
}

// Usage Example
const weather = new WeatherService();

async function main() {
  const forecast = await weather.getForecast();
  
  console.log(`Current: ${forecast.current.temperature}°F (feels like ${forecast.current.feelsLike}°F)`);
  console.log(`Clothing: ${JSON.stringify(forecast.clothing, null, 2)}`);
  console.log(`Outdoor activities: ${JSON.stringify(forecast.outdoor, null, 2)}`);
}

module.exports = WeatherService;
```

### Use Cases for Alexander's Household

| Use Case | Implementation |
|----------|---------------|
| **Morning Clothing Reminder** | Daily automation checking temp/feels-like to suggest jacket, shorts, umbrella |
| **Outdoor Activity Planner** | Weekend notifications when weather is good for hiking, biking, or park visits |
| **Tesla Preconditioning** | Trigger HVAC pre-cooling/heating based on forecast before commute |
| **Smart Home Adjustments** | Adjust thermostat schedules based on upcoming temperature changes |
| **Rain Alerts** | Notify to close windows or bring in patio furniture before precipitation |
| **UV Protection Reminders** | Alert when UV index is high to apply sunscreen before outdoor activities |

### WMO Weather Codes Reference
```javascript
const WEATHER_CODES = {
  0: 'Clear sky',
  1: 'Mainly clear',
  2: 'Partly cloudy',
  3: 'Overcast',
  45: 'Foggy',
  51: 'Light drizzle',
  61: 'Slight rain',
  71: 'Slight snow',
  95: 'Thunderstorm'
};
```

---

## 2. Traffic/Commute API - Google Routes API

### Overview
Google Routes API (newer than Directions API) provides real-time traffic data, route optimization, and EV-specific routing - perfect for Tesla commute optimization.

### Why Google Routes API for Alexander's Household
- ✅ **Real-time Traffic** - Live traffic conditions for accurate ETAs
- ✅ **Eco-friendly Routes** - Optimize for electric vehicles (Tesla)
- ✅ **Free Tier** - $200 monthly credit (approximately 10,000 requests/month)
- ✅ **Tesla Integration** - Can sync with Tesla API for preconditioning
- ✅ **Multiple Waypoints** - Optimize errands on the way home

### Authentication

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable the **Routes API**
4. Create an API Key (restrict to Routes API only)
5. Billing must be enabled (free tier covers most household use)

### Node.js Code Example

```javascript
/**
 * Google Routes API Integration
 * Traffic-aware routing for Tesla commute optimization
 */

const axios = require('axios');

// Configuration
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY; // Store in environment variable
const HOME_ADDRESS = '1600 Amphitheatre Parkway, Mountain View, CA'; // Update to your address
const WORK_ADDRESS = '1 Infinite Loop, Cupertino, CA'; // Update to work address

class CommuteOptimizer {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseUrl = 'https://routes.googleapis.com/directions/v2:computeRoutes';
  }

  /**
   * Get optimal route with traffic conditions
   */
  async getRoute(origin, destination, options = {}) {
    const {
      departureTime = new Date().toISOString(),
      optimizeFor = 'TRAFFIC_AWARE', // or 'FUEL_EFFICIENT' for Tesla
      avoidTolls = false,
      avoidHighways = false
    } = options;

    try {
      const response = await axios.post(
        this.baseUrl,
        {
          origin: { address: origin },
          destination: { address: destination },
          travelMode: 'DRIVE',
          routingPreference: optimizeFor,
          departureTime: departureTime,
          computeAlternativeRoutes: true,
          routeModifiers: {
            avoidTolls: avoidTolls,
            avoidHighways: avoidHighways,
            avoidFerries: false
          },
          languageCode: 'en-US',
          units: 'IMPERIAL'
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': this.apiKey,
            'X-Goog-FieldMask': 'routes.duration,routes.distanceMeters,routes.travelAdvisory,routes.legs.steps.navigationInstruction'
          }
        }
      );

      return this.formatRouteResponse(response.data);
    } catch (error) {
      console.error('Routes API Error:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Check morning commute conditions
   */
  async checkMorningCommute() {
    const route = await this.getRoute(HOME_ADDRESS, WORK_ADDRESS, {
      departureTime: this.getTodayAt(8, 0), // 8:00 AM departure
      optimizeFor: 'TRAFFIC_AWARE'
    });

    return {
      duration: route.duration,
      distance: route.distance,
      trafficDelay: route.trafficDelay,
      recommendation: this.getCommuteRecommendation(route)
    };
  }

  /**
   * Check evening commute conditions
   */
  async checkEveningCommute() {
    const route = await this.getRoute(WORK_ADDRESS, HOME_ADDRESS, {
      departureTime: new Date().toISOString(),
      optimizeFor: 'TRAFFIC_AWARE'
    });

    // Check if errands can be added
    const errandsRoute = await this.getRouteWithWaypoints(
      WORK_ADDRESS,
      HOME_ADDRESS,
      ['HEB, Austin, TX'] // Example errand stop
    );

    return {
      directRoute: route,
      withErrands: errandsRoute,
      bestOption: route.duration < errandsRoute.duration + 600 
        ? 'Direct' 
        : 'With errands'
    };
  }

  /**
   * Get route with waypoints (for errands)
   */
  async getRouteWithWaypoints(origin, destination, waypoints) {
    try {
      const response = await axios.post(
        this.baseUrl,
        {
          origin: { address: origin },
          destination: { address: destination },
          intermediates: waypoints.map(wp => ({ address: wp })),
          travelMode: 'DRIVE',
          optimizeWaypointOrder: true, // Google optimizes the order
          routingPreference: 'TRAFFIC_AWARE'
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': this.apiKey,
            'X-Goog-FieldMask': 'routes.duration,routes.distanceMeters,routes.optimizedIntermediateWaypointIndex'
          }
        }
      );

      return this.formatRouteResponse(response.data);
    } catch (error) {
      console.error('Waypoints Route Error:', error.message);
      throw error;
    }
  }

  /**
   * Get eco-friendly route for Tesla
   */
  async getEcoRoute(origin, destination) {
    // Note: This requires additional fields for EV routing
    const response = await axios.post(
      this.baseUrl,
      {
        origin: { address: origin },
        destination: { address: destination },
        travelMode: 'DRIVE',
        routingPreference: 'TRAFFIC_AWARE',
        extraComputations: ['FUEL_CONSUMPTION']
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': this.apiKey,
          'X-Goog-FieldMask': 'routes.duration,routes.distanceMeters,routes.routeLabels'
        }
      }
    );

    return response.data;
  }

  getCommuteRecommendation(route) {
    const durationMinutes = parseInt(route.duration) / 60;
    const normalDuration = 25; // Baseline normal commute in minutes
    
    if (durationMinutes > normalDuration * 1.5) {
      return {
        severity: 'high',
        message: `Heavy traffic! ${durationMinutes} min commute. Consider alternative route or delay departure.`,
        shouldPrecondition: true,
        preconditionMinutes: 15
      };
    } else if (durationMinutes > normalDuration * 1.2) {
      return {
        severity: 'medium',
        message: `Moderate traffic. ${durationMinutes} min commute.`,
        shouldPrecondition: true,
        preconditionMinutes: 10
      };
    }
    
    return {
      severity: 'low',
      message: `Clear roads! ${durationMinutes} min commute.`,
      shouldPrecondition: false
    };
  }

  formatRouteResponse(data) {
    if (!data.routes || data.routes.length === 0) {
      throw new Error('No routes found');
    }

    const route = data.routes[0];
    return {
      duration: route.duration, // in seconds
      distance: route.distanceMeters,
      trafficDelay: route.travelAdvisory?.speedReadingIntervals || [],
      legs: route.legs || []
    };
  }

  getTodayAt(hour, minute) {
    const date = new Date();
    date.setHours(hour, minute, 0, 0);
    return date.toISOString();
  }
}

// Tesla Integration Helper
class TeslaCommuteIntegration {
  constructor(commuteOptimizer, teslaApi) {
    this.commute = commuteOptimizer;
    this.tesla = teslaApi;
  }

  async prepareForCommute() {
    const commuteInfo = await this.commute.checkMorningCommute();
    
    if (commuteInfo.recommendation.shouldPrecondition) {
      // Trigger Tesla climate preconditioning
      await this.tesla.startClimateControl(
        commuteInfo.recommendation.preconditionMinutes
      );
      
      console.log(`Preconditioning Tesla for ${commuteInfo.recommendation.preconditionMinutes} minutes`);
    }

    return commuteInfo;
  }
}

// Usage Example
async function main() {
  const optimizer = new CommuteOptimizer(process.env.GOOGLE_API_KEY);
  
  // Check morning commute
  const morningCommute = await optimizer.checkMorningCommute();
  console.log('Morning Commute:', morningCommute);

  // Check evening with potential errands
  const eveningOptions = await optimizer.checkEveningCommute();
  console.log('Evening Options:', eveningOptions);
}

module.exports = { CommuteOptimizer, TeslaCommuteIntegration };
```

### Use Cases for Alexander's Household

| Use Case | Implementation |
|----------|---------------|
| **Morning Commute Alert** | Check traffic at 7:30 AM, notify if delays exceed 15 minutes |
| **Tesla Preconditioning** | Auto-start climate control based on commute severity |
| **Errand Optimization** | Suggest HEB stops on way home when traffic is light |
| **Departure Time Recommendation** | "Leave now to arrive by 9 AM, or leave in 20 min and arrive at same time" |
| **Weekend Trip Planning** | Check routes to common destinations (Costco, hiking trails) |
| **Traffic Pattern Learning** | Log daily commute times to predict best departure windows |

### Cost Estimate
- **Free Tier**: $200/month credit
- **Compute Routes**: ~$5 per 1000 requests
- **Household Usage**: ~50 requests/day = $7.50/month (well within free tier)

---

## 3. Grocery Price Comparison - Alternative Approach

### Overview
Unfortunately, **HEB does not offer a public API** for grocery pricing. Most major grocery chains (HEB, Costco, Walmart) keep their pricing data private. However, we can build a hybrid solution.

### Recommended Approach: Hybrid Solution

#### Option A: Instacart Affiliate API (Limited)
Instacart offers limited API access for partners, but requires business partnership approval.

#### Option B: Build a Price Tracker (Recommended)
Create a personal price tracking system using:
1. **Receipt Parser** - Scan and parse HEB/Costco receipts
2. **Manual Entry Helper** - Quick mobile interface for price logging
3. **Price Comparison Engine** - Compare tracked prices over time

#### Option C: RapidAPI Product Data (Limited Grocery Coverage)
Some RapidAPI providers offer limited grocery price data, but coverage is spotty.

### Alternative Solution: Personal Price Tracker

```javascript
/**
 * Personal Grocery Price Tracker
 * Track and compare HEB, Costco, and other store prices manually
 * with receipt scanning helpers
 */

const fs = require('fs').promises;
const path = require('path');

class GroceryPriceTracker {
  constructor(dataDir = './data') {
    this.dataDir = dataDir;
    this.priceFile = path.join(dataDir, 'grocery-prices.json');
    this.shoppingListFile = path.join(dataDir, 'shopping-lists.json');
  }

  async init() {
    try {
      await fs.mkdir(this.dataDir, { recursive: true });
    } catch (e) {
      // Directory exists
    }
  }

  /**
   * Record a price observation
   */
  async recordPrice(item) {
    const {
      name,
      store, // 'HEB', 'Costco', 'Walmart', etc.
      price,
      unit, // 'ea', 'lb', 'oz', 'gal'
      quantity = 1,
      brand = 'generic',
      location = '', // store location
      notes = ''
    } = item;

    const observation = {
      id: `${store}-${name}-${Date.now()}`,
      name: name.toLowerCase().trim(),
      store,
      price: parseFloat(price),
      unit,
      quantity: parseFloat(quantity),
      unitPrice: parseFloat(price) / parseFloat(quantity),
      brand: brand.toLowerCase(),
      location,
      notes,
      date: new Date().toISOString()
    };

    const prices = await this.loadPrices();
    prices.push(observation);
    await this.savePrices(prices);

    return observation;
  }

  /**
   * Get price comparison for an item
   */
  async comparePrices(itemName) {
    const prices = await this.loadPrices();
    const normalizedName = itemName.toLowerCase().trim();
    
    // Find similar items (exact match or fuzzy)
    const matches = prices.filter(p => 
      p.name === normalizedName || 
      p.name.includes(normalizedName) ||
      normalizedName.includes(p.name)
    );

    // Group by store and get latest price
    const storePrices = {};
    matches.forEach(p => {
      if (!storePrices[p.store] || new Date(p.date) > new Date(storePrices[p.store].date)) {
        storePrices[p.store] = p;
      }
    });

    // Calculate best deal
    const comparisons = Object.values(storePrices).map(p => ({
      store: p.store,
      price: p.price,
      unit: p.unit,
      unitPrice: p.unitPrice,
      date: p.date,
      location: p.location
    }));

    comparisons.sort((a, b) => a.unitPrice - b.unitPrice);

    return {
      item: itemName,
      comparisons,
      bestDeal: comparisons[0] || null,
      savings: comparisons.length > 1 
        ? ((comparisons[comparisons.length - 1].unitPrice - comparisons[0].unitPrice) / 
           comparisons[comparisons.length - 1].unitPrice * 100).toFixed(1)
        : 0
    };
  }

  /**
   * Parse HEB receipt text (from photo OCR)
   */
  async parseHEBReceipt(ocrText) {
    const lines = ocrText.split('\n');
    const items = [];
    let currentItem = null;

    for (const line of lines) {
      // HEB receipt pattern: ITEM NAME
      //                     PRICE
      // Look for price patterns like $2.99 or 2.99
      const priceMatch = line.match(/\$?(\d+\.\d{2})$/);
      
      if (priceMatch && currentItem) {
        currentItem.price = parseFloat(priceMatch[1]);
        items.push(currentItem);
        currentItem = null;
      } else if (!line.startsWith('TOTAL') && !line.startsWith('TAX') && line.length > 3) {
        currentItem = {
          name: line.trim(),
          store: 'HEB',
          unit: 'ea',
          quantity: 1
        };
      }
    }

    // Bulk record all items
    for (const item of items) {
      await this.recordPrice(item);
    }

    return items;
  }

  /**
   * Get shopping recommendations based on tracked prices
   */
  async getShoppingRecommendations(neededItems) {
    const recommendations = [];

    for (const item of neededItems) {
      const comparison = await this.comparePrices(item);
      
      if (comparison.bestDeal) {
        recommendations.push({
          item,
          buyAt: comparison.bestDeal.store,
          price: comparison.bestDeal.price,
          estimatedSavings: comparison.savings,
          alternative: comparison.comparisons[1] || null
        });
      } else {
        recommendations.push({
          item,
          buyAt: 'HEB', // Default assumption
          note: 'No price history - track this item!'
        });
      }
    }

    return recommendations;
  }

  /**
   * Get bulk shopping trip optimizer
   * Groups items by store for efficient shopping
   */
  async optimizeShoppingTrip(items) {
    const storeAssignments = {};

    for (const item of items) {
      const comparison = await this.comparePrices(item);
      
      if (comparison.bestDeal) {
        const store = comparison.bestDeal.store;
        if (!storeAssignments[store]) {
          storeAssignments[store] = [];
        }
        storeAssignments[store].push({
          item,
          price: comparison.bestDeal.price,
          savings: comparison.savings
        });
      }
    }

    // Calculate if multi-store trip is worth it
    const hebItems = storeAssignments['HEB']?.length || 0;
    const costcoItems = storeAssignments['Costco']?.length || 0;
    
    return {
      stores: storeAssignments,
      recommendation: hebItems > costcoItems 
        ? 'HEB only' 
        : costcoItems > 5 
          ? 'Costco + HEB' 
          : 'HEB only (not enough Costco items)',
      estimatedSavings: this.calculateTotalSavings(storeAssignments)
    };
  }

  calculateTotalSavings(assignments) {
    let total = 0;
    Object.values(assignments).forEach(storeItems => {
      storeItems.forEach(item => {
        total += parseFloat(item.savings) || 0;
      });
    });
    return total.toFixed(2);
  }

  async loadPrices() {
    try {
      const data = await fs.readFile(this.priceFile, 'utf8');
      return JSON.parse(data);
    } catch (e) {
      return [];
    }
  }

  async savePrices(prices) {
    await fs.writeFile(this.priceFile, JSON.stringify(prices, null, 2));
  }
}

// Receipt Scanner Helper (uses OCR)
class ReceiptScanner {
  /**
   * This would integrate with a service like:
   * - Google Vision API
   * - AWS Textract
   * - Veryfi API
   * - Or a local OCR library like Tesseract.js
   */
  
  async scanReceipt(imagePath) {
    // Placeholder for OCR integration
    // In practice, integrate with Google Vision API or similar
    console.log(`Scanning receipt: ${imagePath}`);
    return {
      rawText: 'HEB receipt text...',
      items: []
    };
  }
}

// Usage Example
async function main() {
  const tracker = new GroceryPriceTracker();
  await tracker.init();

  // Record some prices
  await tracker.recordPrice({
    name: 'Organic Eggs',
    store: 'HEB',
    price: 5.99,
    unit: 'dozen',
    quantity: 1,
    brand: 'HEB Organics'
  });

  await tracker.recordPrice({
    name: 'Organic Eggs',
    store: 'Costco',
    price: 8.99,
    unit: '2 dozen',
    quantity: 2,
    brand: 'Kirkland'
  });

  // Compare
  const comparison = await tracker.comparePrices('Organic Eggs');
  console.log('Price Comparison:', JSON.stringify(comparison, null, 2));

  // Get recommendations for shopping list
  const shoppingList = ['Organic Eggs', 'Milk', 'Bread'];
  const recommendations = await tracker.getShoppingRecommendations(shoppingList);
  console.log('Recommendations:', recommendations);
}

module.exports = { GroceryPriceTracker, ReceiptScanner };
```

### Use Cases for Alexander's Household

| Use Case | Implementation |
|----------|---------------|
| **Receipt Tracking** | Snap photo of HEB/Costco receipts, OCR extracts items and prices |
| **Price History** | Track milk, eggs, meat prices over time to identify inflation/cycles |
| **Store Optimization** | "You buy milk at Costco 30% cheaper - worth the trip this week" |
| **Shopping List Optimizer** | Group items by store for efficient multi-stop trips |
| **Sale Detection** | Alert when tracked items drop below historical average |
| **HEB vs Costco Analysis** | Monthly report on which store is better for your specific items |

### Recommended Implementation Path
1. **Phase 1**: Manual price entry via simple web form or Discord bot
2. **Phase 2**: Add receipt photo upload with Google Vision API OCR ($1.50 per 1000 images)
3. **Phase 3**: Build price alert system for tracked items
4. **Phase 4**: Integrate with dinner automation to suggest stores based on meal plan ingredients

---

## 4. Home Energy Monitoring - Tesla Powerwall Local API

### Overview
Tesla Powerwall includes a local API accessible on your home network that provides real-time energy data without cloud dependency. Perfect for home automation integration.

### Why Powerwall Local API for Alexander's Household
- ✅ **No Cloud Required** - Direct LAN connection
- ✅ **Real-time Data** - 1-second updates on energy flow
- ✅ **Free** - No subscription or API fees
- ✅ **Comprehensive** - Solar, battery, grid, home consumption
- ✅ **Control Capability** - Can change operation modes

### Prerequisites
- Tesla Powerwall 2 or Powerwall+
- Powerwall Gateway connected to local network
- Gateway IP address (find in Tesla app under Settings > My Home Info)
- Authentication: Last 5 digits of Gateway serial number

### Authentication

The Powerwall uses cookie-based authentication:

1. **Initial Login**: POST to `/api/login/Basic` with password (last 5 digits of serial)
2. **Auth Token**: Response includes Bearer token
3. **Subsequent Requests**: Include `Authorization: Bearer <token>` header
4. **Certificate**: Powerwall uses self-signed SSL certificate

### Node.js Code Example

```javascript
/**
 * Tesla Powerwall Local API Integration
 * Monitor and control home energy in real-time
 */

const axios = require('axios');
const https = require('https');

// Configuration
const POWERWALL_IP = process.env.POWERWALL_IP || '192.168.1.100';
const POWERWALL_PASSWORD = process.env.POWERWALL_PASSWORD; // Last 5 digits of serial

class PowerwallClient {
  constructor(ip, password) {
    this.baseUrl = `https://${ip}`;
    this.password = password;
    this.authToken = null;
    
    // Allow self-signed certificate
    this.httpsAgent = new https.Agent({
      rejectUnauthorized: false
    });
  }

  /**
   * Authenticate with Powerwall
   */
  async authenticate() {
    try {
      const response = await axios.post(
        `${this.baseUrl}/api/login/Basic`,
        {
          username: 'customer',
          password: this.password,
          email: ''
        },
        {
          httpsAgent: this.httpsAgent,
          headers: { 'Content-Type': 'application/json' }
        }
      );

      this.authToken = response.data.token;
      console.log('Powerwall authenticated successfully');
      return this.authToken;
    } catch (error) {
      console.error('Powerwall authentication failed:', error.message);
      throw error;
    }
  }

  /**
   * Get current energy readings (aggregate meters)
   */
  async getEnergyData() {
    this.ensureAuthenticated();

    const response = await axios.get(
      `${this.baseUrl}/api/meters/aggregates`,
      {
        httpsAgent: this.httpsAgent,
        headers: { 'Authorization': `Bearer ${this.authToken}` }
      }
    );

    return this.formatEnergyData(response.data);
  }

  /**
   * Get battery state of charge
   */
  async getBatteryLevel() {
    this.ensureAuthenticated();

    const response = await axios.get(
      `${this.baseUrl}/api/system_status/soe`,
      {
        httpsAgent: this.httpsAgent,
        headers: { 'Authorization': `Bearer ${this.authToken}` }
      }
    );

    return {
      percentage: response.data.percentage,
      level: this.getBatteryLevelDescription(response.data.percentage)
    };
  }

  /**
   * Get grid connection status
   */
  async getGridStatus() {
    this.ensureAuthenticated();

    const response = await axios.get(
      `${this.baseUrl}/api/system_status/grid_status`,
      {
        httpsAgent: this.httpsAgent,
        headers: { 'Authorization': `Bearer ${this.authToken}` }
      }
    );

    const statusMap = {
      'SystemGridConnected': 'Connected',
      'SystemIslandedActive': 'Off-grid (power outage)',
      'SystemTransitionToGrid': 'Reconnecting'
    };

    return {
      raw: response.data.grid_status,
      status: statusMap[response.data.grid_status] || response.data.grid_status,
      isOffGrid: response.data.grid_status === 'SystemIslandedActive'
    };
  }

  /**
   * Get current operation mode
   */
  async getOperationMode() {
    this.ensureAuthenticated();

    const response = await axios.get(
      `${this.baseUrl}/api/operation`,
      {
        httpsAgent: this.httpsAgent,
        headers: { 'Authorization': `Bearer ${this.authToken}` }
      }
    );

    const modeDescriptions = {
      'self_consumption': 'Self-Powered (use solar first)',
      'backup': 'Backup Only (save battery for outages)',
      'autonomous': 'Time-Based Control (peak shaving)'
    };

    return {
      mode: response.data.mode,
      description: modeDescriptions[response.data.mode] || response.data.mode,
      backupReservePercent: response.data.backup_reserve_percent
    };
  }

  /**
   * Set operation mode
   */
  async setOperationMode(mode, backupReservePercent = 20) {
    this.ensureAuthenticated();
    
    // Convert app percentage to API value
    // Formula: API = (19/20) * app + 5
    const apiReserve = ((19/20) * backupReservePercent + 5);

    const response = await axios.post(
      `${this.baseUrl}/api/operation`,
      {
        mode: mode,
        backup_reserve_percent: apiReserve
      },
      {
        httpsAgent: this.httpsAgent,
        headers: { 
          'Authorization': `Bearer ${this.authToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    // Commit the configuration change
    await axios.get(
      `${this.baseUrl}/api/config/completed`,
      {
        httpsAgent: this.httpsAgent,
        headers: { 'Authorization': `Bearer ${this.authToken}` }
      }
    );

    return response.data;
  }

  /**
   * Get complete system status
   */
  async getCompleteStatus() {
    const [energy, battery, grid, operation] = await Promise.all([
      this.getEnergyData(),
      this.getBatteryLevel(),
      this.getGridStatus(),
      this.getOperationMode()
    ]);

    return {
      timestamp: new Date().toISOString(),
      energy,
      battery,
      grid,
      operation
    };
  }

  /**
   * Start Powerwall (if stopped)
   */
  async startPowerwall() {
    this.ensureAuthenticated();

    await axios.get(
      `${this.baseUrl}/api/sitemaster/run`,
      {
        httpsAgent: this.httpsAgent,
        headers: { 'Authorization': `Bearer ${this.authToken}` }
      }
    );

    return { started: true };
  }

  /**
   * Stop Powerwall (emergency use)
   */
  async stopPowerwall() {
    this.ensureAuthenticated();

    await axios.get(
      `${this.baseUrl}/api/sitemaster/stop`,
      {
        httpsAgent: this.httpsAgent,
        headers: { 'Authorization': `Bearer ${this.authToken}` }
      }
    );

    return { stopped: true };
  }

  formatEnergyData(data) {
    // site = grid, load = home, battery = Powerwall, solar = solar
    return {
      solar: {
        power: data.solar?.instant_power || 0, // Watts (positive = producing)
        energyToday: data.solar?.energy_imported || 0,
        isProducing: (data.solar?.instant_power || 0) > 100
      },
      battery: {
        power: data.battery?.instant_power || 0, // Watts (positive = discharging, negative = charging)
        isCharging: (data.battery?.instant_power || 0) < 0,
        isDischarging: (data.battery?.instant_power || 0) > 0
      },
      grid: {
        power: data.site?.instant_power || 0, // Watts (positive = drawing from grid, negative = exporting)
        isImporting: (data.site?.instant_power || 0) > 0,
        isExporting: (data.site?.instant_power || 0) < 0
      },
      home: {
        power: data.load?.instant_power || 0, // Watts (always positive, home consumption)
      }
    };
  }

  getBatteryLevelDescription(percentage) {
    if (percentage >= 90) return 'Full';
    if (percentage >= 70) return 'High';
    if (percentage >= 40) return 'Medium';
    if (percentage >= 20) return 'Low';
    return 'Critical';
  }

  ensureAuthenticated() {
    if (!this.authToken) {
      throw new Error('Not authenticated. Call authenticate() first.');
    }
  }
}

// Energy Automation Helper
class EnergyAutomation {
  constructor(powerwallClient) {
    this.powerwall = powerwallClient;
    this.history = [];
  }

  async monitorAndOptimize() {
    const status = await this.powerwall.getCompleteStatus();
    this.history.push(status);
    
    // Keep last 24 hours
    if (this.history.length > 1440) { // 1 reading per minute
      this.history.shift();
    }

    const recommendations = [];

    // Scenario 1: High solar production, low battery - charge battery
    if (status.energy.solar.isProducing && 
        status.energy.solar.power > 3000 && 
        status.battery.percentage < 50) {
      recommendations.push({
        action: 'self_consumption',
        reason: 'High solar production - maximizing self-consumption'
      });
    }

    // Scenario 2: Peak hour approaching, battery full - switch to backup to save battery
    const hour = new Date().getHours();
    if ((hour >= 14 && hour <= 20) && // Peak hours (2-8 PM typical)
        status.battery.percentage > 80) {
      recommendations.push({
        action: 'autonomous',
        reason: 'Peak hours approaching - prepare for Time-of-Use optimization'
      });
    }

    // Scenario 3: Grid outage detected
    if (status.grid.isOffGrid) {
      recommendations.push({
        action: 'emergency',
        reason: 'GRID OUTAGE DETECTED - Running on battery backup',
        alert: true
      });
    }

    // Scenario 4: Low battery warning
    if (status.battery.percentage < 20 && !status.energy.solar.isProducing) {
      recommendations.push({
        action: 'warning',
        reason: 'Battery critically low - conserve energy',
        alert: true
      });
    }

    return {
      status,
      recommendations
    };
  }

  async getDailyEnergySummary() {
    // Calculate energy metrics from history
    const solarProduction = this.history.reduce((sum, h) => 
      sum + (h.energy.solar.power > 0 ? h.energy.solar.power : 0), 0) / 60000; // Wh to kWh approx
    
    const homeConsumption = this.history.reduce((sum, h) => 
      sum + h.energy.home.power, 0) / 60000;

    const gridImport = this.history.reduce((sum, h) => 
      sum + (h.energy.grid.isImporting ? h.energy.grid.power : 0), 0) / 60000;

    return {
      solarProductionKwh: solarProduction.toFixed(2),
      homeConsumptionKwh: homeConsumption.toFixed(2),
      gridImportKwh: gridImport.toFixed(2),
      selfSufficiency: ((1 - gridImport / homeConsumption) * 100).toFixed(1)
    };
  }
}

// Usage Example
async function main() {
  const powerwall = new PowerwallClient(POWERWALL_IP, POWERWALL_PASSWORD);
  
  // Authenticate
  await powerwall.authenticate();

  // Get complete status
  const status = await powerwall.getCompleteStatus();
  console.log('Powerwall Status:', JSON.stringify(status, null, 2));

  // Energy automation
  const automation = new EnergyAutomation(powerwall);
  const optimization = await automation.monitorAndOptimize();
  console.log('Recommendations:', optimization.recommendations);

  // Change mode example (uncomment to use)
  // await powerwall.setOperationMode('self_consumption', 20);
}

module.exports = { PowerwallClient, EnergyAutomation };
```

### Use Cases for Alexander's Household

| Use Case | Implementation |
|----------|---------------|
| **Real-time Energy Display** | Dashboard showing solar production, battery level, grid import/export |
| **Smart Mode Switching** | Auto-switch to backup mode before peak hours, self-consumption during day |
| **Outage Alerts** | Immediate notification when grid goes down and Powerwall takes over |
| **Tesla Charging Optimization** | Delay EV charging until battery is full or solar is excess |
| **Daily Energy Reports** | Morning summary: "Yesterday you produced 45kWh, exported 12kWh to grid" |
| **Peak Hour Warnings** | "Peak rates starting in 30 min - 85% battery ready" |
| **Solar Production Alerts** | "High solar production - good time to run dishwasher/charge devices" |
| **Battery Health Tracking** | Log full pack energy over time to track degradation |

### Important API Endpoints Summary

| Endpoint | Description | Auth Required |
|----------|-------------|---------------|
| `POST /api/login/Basic` | Authenticate | No |
| `GET /api/meters/aggregates` | Real-time power readings | Yes |
| `GET /api/system_status/soe` | Battery percentage | Yes |
| `GET /api/system_status/grid_status` | Grid connection status | Yes |
| `GET /api/operation` | Current mode settings | Yes |
| `POST /api/operation` | Change mode | Yes |
| `GET /api/sitemaster/run` | Start Powerwall | Yes |
| `GET /api/sitemaster/stop` | Stop Powerwall | Yes |

---

## 5. Package Delivery Tracking - Shippo API

### Overview
Shippo provides a unified API for tracking packages across all major carriers (USPS, UPS, FedEx, DHL, and 100+ others) with normalized data and webhook notifications.

### Why Shippo for Alexander's Household
- ✅ **Multi-Carrier** - One API for USPS, UPS, FedEx, and more
- ✅ **Free Tier** - Up to 200 tracking requests/month free
- ✅ **Webhooks** - Real-time delivery notifications
- ✅ **Normalized Data** - Consistent format across all carriers
- ✅ **No Carrier Accounts Needed** - Use Shippo's default accounts

### Authentication

1. Sign up at [https://goshippo.com/](https://goshippo.com/)
2. Get API token from Dashboard > API > Tokens
3. Two tokens: Test token (starts with `shippo_test_`) and Live token (starts with `shippo_live_`)

### Node.js Code Example

```javascript
/**
 * Shippo Package Tracking API Integration
 * Track all deliveries in one place
 */

const axios = require('axios');

// Configuration
const SHIPPO_API_TOKEN = process.env.SHIPPO_API_TOKEN;
const SHIPPO_BASE_URL = 'https://api.goshippo.com';

class PackageTracker {
  constructor(apiToken) {
    this.apiToken = apiToken;
    this.headers = {
      'Authorization': `ShippoToken ${apiToken}`,
      'Content-Type': 'application/json'
    };
  }

  /**
   * Track a package by carrier and tracking number
   */
  async trackPackage(trackingNumber, carrier) {
    try {
      // Register tracking for webhook updates (optional but recommended)
      await this.registerTracking(trackingNumber, carrier);

      // Get current tracking status
      const response = await axios.get(
        `${SHIPPO_BASE_URL}/tracks/${carrier}/${trackingNumber}`,
        { headers: this.headers }
      );

      return this.formatTrackingResponse(response.data);
    } catch (error) {
      console.error('Tracking Error:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Register tracking for webhook updates
   */
  async registerTracking(trackingNumber, carrier, metadata = '') {
    try {
      const response = await axios.post(
        `${SHIPPO_BASE_URL}/tracks/`,
        {
          carrier: carrier,
          tracking_number: trackingNumber,
          metadata: metadata
        },
        { headers: this.headers }
      );

      return response.data;
    } catch (error) {
      // May already be registered, that's ok
      console.log('Registration result:', error.response?.data?.detail || 'Registered');
    }
  }

  /**
   * Track multiple packages
   */
  async trackMultiple(packages) {
    const results = await Promise.allSettled(
      packages.map(pkg => this.trackPackage(pkg.trackingNumber, pkg.carrier))
    );

    return packages.map((pkg, index) => ({
      trackingNumber: pkg.trackingNumber,
      carrier: pkg.carrier,
      status: results[index].status,
      data: results[index].value || results[index].reason
    }));
  }

  /**
   * Get active deliveries (not yet delivered)
   */
  async getActiveDeliveries(trackedPackages) {
    const allPackages = await this.trackMultiple(trackedPackages);
    
    return allPackages.filter(pkg => 
      pkg.status === 'fulfilled' && 
      pkg.data?.trackingStatus !== 'DELIVERED' &&
      pkg.data?.trackingStatus !== 'RETURNED' &&
      pkg.data?.trackingStatus !== 'FAILURE'
    );
  }

  /**
   * Check for delivered packages today
   */
  async getTodayDeliveries(trackedPackages) {
    const allPackages = await this.trackMultiple(trackedPackages);
    const today = new Date().toDateString();

    return allPackages.filter(pkg => {
      if (pkg.status !== 'fulfilled') return false;
      
      const delivered = pkg.data?.trackingHistory?.find(
        h => h.status === 'DELIVERED'
      );
      
      if (delivered) {
        const deliveryDate = new Date(delivered.status_date).toDateString();
        return deliveryDate === today;
      }
      
      return false;
    });
  }

  /**
   * Get delivery forecast for upcoming packages
   */
  async getDeliveryForecast(trackedPackages) {
    const active = await this.getActiveDeliveries(trackedPackages);
    
    return active.map(pkg => {
      const eta = pkg.data?.estimatedDelivery;
      const daysUntil = eta 
        ? Math.ceil((new Date(eta) - new Date()) / (1000 * 60 * 60 * 24))
        : null;

      return {
        trackingNumber: pkg.trackingNumber,
        carrier: pkg.carrier,
        status: pkg.data?.trackingStatus,
        estimatedDelivery: eta,
        daysUntil,
        urgency: daysUntil === 0 ? 'today' : daysUntil === 1 ? 'tomorrow' : 'upcoming'
      };
    }).sort((a, b) => (a.daysUntil || 999) - (b.daysUntil || 999));
  }

  /**
   * Webhook handler for tracking updates
   */
  handleWebhook(payload) {
    const event = {
      trackingNumber: payload.tracking_number,
      carrier: payload.carrier,
      status: payload.tracking_status?.status,
      substatus: payload.tracking_status?.substatus,
      statusDetails: payload.tracking_status?.status_details,
      location: payload.tracking_status?.location,
      timestamp: payload.tracking_status?.status_date,
      history: payload.tracking_history
    };

    // Determine if action is needed
    event.actionRequired = this.isActionRequired(event);
    event.notifications = this.generateNotifications(event);

    return event;
  }

  isActionRequired(event) {
    const actionRequiredStatuses = [
      'delivery_attempted',
      'contact_carrier',
      'address_issue',
      'reschedule_delivery',
      'package_held',
      'pickup_available'
    ];

    return actionRequiredStatuses.includes(event.substatus);
  }

  generateNotifications(event) {
    const notifications = [];

    switch (event.status) {
      case 'DELIVERED':
        notifications.push({
          type: 'success',
          message: `Package delivered! ${event.trackingNumber}`,
          priority: 'normal'
        });
        break;
      case 'OUT_FOR_DELIVERY':
        notifications.push({
          type: 'info',
          message: `Package out for delivery today - ${event.trackingNumber}`,
          priority: 'high'
        });
        break;
      case 'FAILURE':
        notifications.push({
          type: 'error',
          message: `Delivery issue with ${event.trackingNumber}: ${event.statusDetails}`,
          priority: 'urgent'
        });
        break;
    }

    if (event.actionRequired) {
      notifications.push({
        type: 'warning',
        message: `Action required for ${event.trackingNumber}: ${event.statusDetails}`,
        priority: 'urgent'
      });
    }

    return notifications;
  }

  formatTrackingResponse(data) {
    const statusMap = {
      'PRE_TRANSIT': 'Label created',
      'TRANSIT': 'In transit',
      'DELIVERED': 'Delivered',
      'RETURNED': 'Returned',
      'FAILURE': 'Exception',
      'UNKNOWN': 'Unknown'
    };

    return {
      trackingNumber: data.tracking_number,
      carrier: data.carrier,
      trackingStatus: data.tracking_status?.status,
      statusDescription: statusMap[data.tracking_status?.status] || data.tracking_status?.status,
      statusDetails: data.tracking_status?.status_details,
      estimatedDelivery: data.eta,
      originalEta: data.original_eta,
      serviceLevel: data.servicelevel?.name,
      from: data.address_from,
      to: data.address_to,
      trackingHistory: data.tracking_history?.map(h => ({
        status: h.status,
        details: h.status_details,
        date: h.status_date,
        location: h.location
      })) || [],
      carrierUrl: data.tracking_url_provider
    };
  }
}

// Carrier detection helper
class CarrierDetector {
  static detectCarrier(trackingNumber) {
    const patterns = {
      'usps': /^[\d]{20,22}$|^[A-Z]{2}[\d]{9}[A-Z]{2}$/i,
      'ups': /^1Z[\w]{16}$/i,
      'fedex': /^[\d]{12,14,15}$/,
      'dhl_express': /^[\d]{10,11}$/,
      'ontrac': /^[C|D][\d]{14}$/i,
      'lasership': /^1LS[\d]{12}$/i
    };

    for (const [carrier, pattern] of Object.entries(patterns)) {
      if (pattern.test(trackingNumber)) {
        return carrier;
      }
    }

    return null; // Unknown carrier
  }
}

// Household Package Manager
class HouseholdPackageManager {
  constructor(tracker) {
    this.tracker = tracker;
    this.packagesFile = './data/packages.json';
  }

  async addPackage(trackingNumber, carrier, description = '') {
    // Auto-detect carrier if not provided
    const detectedCarrier = carrier || CarrierDetector.detectCarrier(trackingNumber);
    
    if (!detectedCarrier) {
      throw new Error('Could not detect carrier. Please specify manually.');
    }

    const pkg = {
      trackingNumber,
      carrier: detectedCarrier,
      description,
      addedDate: new Date().toISOString(),
      active: true
    };

    await this.savePackage(pkg);
    return pkg;
  }

  async getMorningBriefing() {
    const packages = await this.loadPackages();
    const activePackages = packages.filter(p => p.active);

    const forecast = await this.tracker.getDeliveryForecast(activePackages);
    const todayDeliveries = await this.tracker.getTodayDeliveries(activePackages);

    return {
      today: {
        count: todayDeliveries.length,
        packages: todayDeliveries
      },
      upcoming: forecast.filter(p => p.daysUntil > 0),
      summary: this.generateSummary(forecast, todayDeliveries)
    };
  }

  generateSummary(forecast, today) {
    if (today.length > 0) {
      return `📦 ${today.length} package${today.length > 1 ? 's' : ''} arriving today!`;
    }

    if (forecast.length === 0) {
      return '📭 No active packages tracked.';
    }

    const tomorrow = forecast.filter(p => p.daysUntil === 1);
    if (tomorrow.length > 0) {
      return `📦 ${tomorrow.length} package${tomorrow.length > 1 ? 's' : ''} arriving tomorrow.`;
    }

    return `📦 ${forecast.length} package${forecast.length > 1 ? 's' : ''} in transit.`;
  }

  async savePackage(pkg) {
    const fs = require('fs').promises;
    const path = require('path');
    
    await fs.mkdir(path.dirname(this.packagesFile), { recursive: true });
    
    let packages = [];
    try {
      const data = await fs.readFile(this.packagesFile, 'utf8');
      packages = JSON.parse(data);
    } catch (e) {
      // File doesn't exist yet
    }

    packages.push(pkg);
    await fs.writeFile(this.packagesFile, JSON.stringify(packages, null, 2));
  }

  async loadPackages() {
    const fs = require('fs').promises;
    try {
      const data = await fs.readFile(this.packagesFile, 'utf8');
      return JSON.parse(data);
    } catch (e) {
      return [];
    }
  }
}

// Usage Example
async function main() {
  const tracker = new PackageTracker(SHIPPO_API_TOKEN);
  const manager = new HouseholdPackageManager(tracker);

  // Add packages
  await manager.addPackage('1Z9999999999999999', 'ups', 'New laptop');
  await manager.addPackage('9400111899223456789012', 'usps', 'Birthday gift');

  // Get morning briefing
  const briefing = await manager.getMorningBriefing();
  console.log('Package Briefing:', JSON.stringify(briefing, null, 2));

  // Track specific package
  const status = await tracker.trackPackage('1Z9999999999999999', 'ups');
  console.log('Package Status:', status);
}

module.exports = { 
  PackageTracker, 
  CarrierDetector, 
  HouseholdPackageManager 
};
```

### Webhook Setup

To receive real-time updates, set up a webhook endpoint:

```javascript
const express = require('express');
const app = express();

app.post('/webhooks/shippo', express.json(), (req, res) => {
  const tracker = new PackageTracker(SHIPPO_API_TOKEN);
  const event = tracker.handleWebhook(req.body);
  
  // Send notifications
  event.notifications.forEach(n => {
    console.log(`[${n.priority.toUpperCase()}] ${n.message}`);
    // Send to Discord, email, etc.
  });
  
  res.sendStatus(200);
});

app.listen(3000);
```

### Use Cases for Alexander's Household

| Use Case | Implementation |
|----------|---------------|
| **Morning Delivery Briefing** | Daily summary: "2 packages arriving today, 1 tomorrow" |
| **Real-time Alerts** | Webhook notifications for out-for-delivery, delivered, exceptions |
| **Porch Pirate Protection** | Alert when package is delivered so you can bring it inside |
| **Delivery Attempt Alerts** | "Delivery attempted - action required to reschedule" |
| **Package Dashboard** | View all active deliveries in one place with ETAs |
| **Auto-Carrier Detection** | Paste any tracking number, automatically detects USPS/UPS/FedEx |
| **Smart Home Integration** | Flash lights or play announcement when package is delivered |

### Supported Carriers

| Carrier | Token | Notes |
|---------|-------|-------|
| USPS | `usps` | Full support |
| UPS | `ups` | Full support |
| FedEx | `fedex` | Full support |
| DHL Express | `dhl_express` | Full support |
| OnTrac | `ontrac` | Full support |
| LaserShip | `lasership` | Full support |
| Amazon Logistics | N/A | Not supported (use Amazon's own tracking) |

### Pricing

| Tier | Price | Tracking Requests |
|------|-------|-------------------|
| Free | $0 | 200/month |
| Starter | $10/month | 1,000/month |
| Professional | $25/month | 5,000/month |

---

## Quick Reference Summary

| API | Free Tier | Best For | Auth Method |
|-----|-----------|----------|-------------|
| **Open-Meteo** | 10,000/day | Weather, clothing recs | None required |
| **Google Routes** | $200 credit/month | Traffic, Tesla commute | API Key |
| **Grocery Tracker** | Self-hosted | Price comparison | None (custom) |
| **Powerwall** | Unlimited | Energy monitoring | Local auth token |
| **Shippo** | 200/month | Package tracking | API Token |

---

## Implementation Priority

### Phase 1 (Immediate Value)
1. **Open-Meteo Weather** - Daily clothing reminders, outdoor activity alerts
2. **Powerwall API** - Energy dashboard, outage alerts

### Phase 2 (Integration)
3. **Google Routes** - Commute alerts, Tesla preconditioning
4. **Shippo Tracking** - Package delivery notifications

### Phase 3 (Advanced)
5. **Grocery Tracker** - Build receipt parser, price history tracking

---

## Environment Variables Template

Create a `.env` file:

```bash
# Weather (Open-Meteo requires no key for free tier)

# Google Routes API
GOOGLE_API_KEY=your_google_api_key

# Tesla Powerwall
POWERWALL_IP=192.168.1.xxx
POWERWALL_PASSWORD=xxxxx  # Last 5 digits of Gateway serial

# Shippo Package Tracking
SHIPPO_API_TOKEN=shippo_live_xxxxxxxx

# Home Location (for commute optimization)
HOME_ADDRESS="Your Home Address"
WORK_ADDRESS="Your Work Address"
```

---

*Document compiled: February 2026*  
*For questions or updates, check individual API documentation links*
