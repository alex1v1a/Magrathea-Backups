/**
 * Weather Service Integration
 * Uses Open-Meteo API (free, no key required)
 * 
 * Features:
 * - Current conditions and 7-day forecast
 * - Clothing recommendations
 * - Outdoor activity suitability
 * - Tesla preconditioning triggers
 */

const axios = require('axios');

// Austin, TX coordinates
const DEFAULT_LATITUDE = 30.2672;
const DEFAULT_LONGITUDE = -97.7431;

// WMO Weather codes
const WEATHER_CODES = {
  0: { label: 'Clear sky', icon: '☀️' },
  1: { label: 'Mainly clear', icon: '🌤️' },
  2: { label: 'Partly cloudy', icon: '⛅' },
  3: { label: 'Overcast', icon: '☁️' },
  45: { label: 'Foggy', icon: '🌫️' },
  48: { label: 'Depositing rime fog', icon: '🌫️' },
  51: { label: 'Light drizzle', icon: '🌦️' },
  53: { label: 'Moderate drizzle', icon: '🌦️' },
  55: { label: 'Dense drizzle', icon: '🌧️' },
  61: { label: 'Slight rain', icon: '🌧️' },
  63: { label: 'Moderate rain', icon: '🌧️' },
  65: { label: 'Heavy rain', icon: '⛈️' },
  71: { label: 'Slight snow', icon: '🌨️' },
  73: { label: 'Moderate snow', icon: '🌨️' },
  75: { label: 'Heavy snow', icon: '❄️' },
  95: { label: 'Thunderstorm', icon: '⛈️' }
};

class WeatherService {
  constructor(options = {}) {
    this.latitude = options.latitude || DEFAULT_LATITUDE;
    this.longitude = options.longitude || DEFAULT_LONGITUDE;
    this.baseUrl = 'https://api.open-meteo.com/v1';
    this.cache = null;
    this.cacheTime = null;
    this.cacheDuration = 10 * 60 * 1000; // 10 minutes
  }

  /**
   * Get current weather and forecast
   */
  async getForecast() {
    // Check cache
    if (this.cache && Date.now() - this.cacheTime < this.cacheDuration) {
      return this.cache;
    }

    try {
      const response = await axios.get(`${this.baseUrl}/forecast`, {
        params: {
          latitude: this.latitude,
          longitude: this.longitude,
          current: 'temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m,uv_index',
          hourly: 'temperature_2m,precipitation_probability,weather_code',
          daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,uv_index_max',
          temperature_unit: 'fahrenheit',
          wind_speed_unit: 'mph',
          precipitation_unit: 'inch',
          timezone: 'America/Chicago',
          forecast_days: 7
        },
        timeout: 10000
      });

      const data = this._formatWeatherData(response.data);
      
      // Update cache
      this.cache = data;
      this.cacheTime = Date.now();
      
      return data;
    } catch (error) {
      console.error('Weather API Error:', error.message);
      throw error;
    }
  }

  /**
   * Get clothing recommendation based on weather
   */
  getClothingRecommendation(current) {
    const temp = current.temperature;
    const feelsLike = current.feelsLike;
    const weatherCode = current.weatherCode;
    const windSpeed = current.windSpeed;
    const uvIndex = current.uvIndex || 0;

    const recommendation = {
      jacket: temp < 60 || feelsLike < 60,
      heavyJacket: temp < 45,
      shorts: temp > 75 && feelsLike > 75,
      umbrella: [51, 53, 55, 61, 63, 65, 80, 81, 82, 95].includes(weatherCode),
      sunscreen: uvIndex > 5 || temp > 85,
      layers: (temp >= 60 && temp <= 75) || Math.abs(temp - feelsLike) > 5,
      windbreaker: windSpeed > 15,
      hat: temp > 85 || uvIndex > 7
    };

    // Generate human-readable advice
    const advice = [];
    if (recommendation.heavyJacket) advice.push('Wear a heavy jacket or coat');
    else if (recommendation.jacket) advice.push('Bring a light jacket');
    else if (recommendation.shorts) advice.push('Shorts weather!');
    
    if (recommendation.umbrella) advice.push('Bring an umbrella');
    if (recommendation.sunscreen) advice.push('Apply sunscreen');
    if (recommendation.layers) advice.push('Dress in layers');
    if (recommendation.hat) advice.push('Wear a hat');

    return {
      ...recommendation,
      advice,
      summary: advice.join(', ') || 'Comfortable weather!'
    };
  }

  /**
   * Check if conditions are good for outdoor activities
   */
  isGoodForOutdoors(current, daily) {
    const goodWeatherCodes = [0, 1, 2, 3]; // Clear to partly cloudy
    const temp = current.temperature;
    const weatherCode = current.weatherCode;
    const windSpeed = current.windSpeed;
    const uvMax = daily?.uvIndexMax?.[0] || 0;

    const issues = [];
    
    if (!goodWeatherCodes.includes(weatherCode)) {
      issues.push('Precipitation expected');
    }
    if (temp < 50) {
      issues.push('Too cold');
    }
    if (temp > 95) {
      issues.push('Too hot');
    }
    if (windSpeed > 20) {
      issues.push('Too windy');
    }
    if (uvMax > 10) {
      issues.push('Extreme UV');
    }

    return {
      suitable: issues.length === 0,
      temperature: temp,
      windSpeed: windSpeed,
      uvIndex: uvMax,
      issues: issues,
      reason: issues.length > 0 ? issues.join(', ') : 'Great conditions!'
    };
  }

  /**
   * Get Tesla preconditioning recommendation
   */
  getTeslaRecommendation(current, daily) {
    const temp = current.temperature;
    const maxTemp = daily?.temperatureMax?.[0] || temp;
    const minTemp = daily?.temperatureMin?.[0] || temp;

    const recommendation = {
      shouldPrecondition: false,
      heat: false,
      cool: false,
      minutes: 0,
      reason: ''
    };

    if (temp < 45 || minTemp < 40) {
      recommendation.shouldPrecondition = true;
      recommendation.heat = true;
      recommendation.minutes = temp < 32 ? 15 : 10;
      recommendation.reason = `Cold weather (${temp}°F) - preheat cabin and battery`;
    } else if (temp > 85 || maxTemp > 90) {
      recommendation.shouldPrecondition = true;
      recommendation.cool = true;
      recommendation.minutes = temp > 95 ? 15 : 10;
      recommendation.reason = `Hot weather (${temp}°F) - precool cabin`;
    }

    return recommendation;
  }

  /**
   * Get morning briefing summary
   */
  async getMorningBriefing() {
    const forecast = await this.getForecast();
    const current = forecast.current;
    const daily = forecast.daily;

    const clothing = this.getClothingRecommendation(current);
    const outdoors = this.isGoodForOutdoors(current, daily);
    const tesla = this.getTeslaRecommendation(current, daily);

    return {
      timestamp: new Date().toISOString(),
      current: {
        temperature: current.temperature,
        feelsLike: current.feelsLike,
        condition: current.condition,
        icon: current.icon,
        humidity: current.humidity,
        windSpeed: current.windSpeed
      },
      today: {
        high: daily.temperatureMax[0],
        low: daily.temperatureMin[0],
        precipitation: daily.precipitationSum[0],
        uvIndex: daily.uvIndexMax[0]
      },
      recommendations: {
        clothing: clothing.summary,
        clothingDetails: clothing,
        outdoors: outdoors.suitable ? 'Good for outdoor activities' : outdoors.reason,
        outdoorsDetails: outdoors,
        tesla: tesla.shouldPrecondition ? tesla.reason : 'No preconditioning needed'
      }
    };
  }

  /**
   * Format raw API response
   */
  _formatWeatherData(data) {
    const current = data.current;
    const daily = data.daily;
    const weatherCode = current.weather_code;
    const weatherInfo = WEATHER_CODES[weatherCode] || { label: 'Unknown', icon: '❓' };

    return {
      current: {
        temperature: current.temperature_2m,
        feelsLike: current.apparent_temperature,
        humidity: current.relative_humidity_2m,
        precipitation: current.precipitation,
        windSpeed: current.wind_speed_10m,
        uvIndex: current.uv_index,
        weatherCode: weatherCode,
        condition: weatherInfo.label,
        icon: weatherInfo.icon
      },
      daily: {
        dates: daily.time,
        weatherCodes: daily.weather_code,
        temperatureMax: daily.temperature_2m_max,
        temperatureMin: daily.temperature_2m_min,
        precipitationSum: daily.precipitation_sum,
        uvIndexMax: daily.uv_index_max
      },
      hourly: data.hourly
    };
  }
}

// CLI usage
if (require.main === module) {
  const weather = new WeatherService();
  
  weather.getMorningBriefing()
    .then(briefing => {
      console.log('\n🌤️  Morning Weather Briefing\n');
      console.log(`Current: ${briefing.current.temperature}°F (feels like ${briefing.current.feelsLike}°F)`);
      console.log(`Condition: ${briefing.current.icon} ${briefing.current.condition}`);
      console.log(`\nToday's Range: ${briefing.today.low}°F - ${briefing.today.high}°F`);
      console.log(`\n👕 Clothing: ${briefing.recommendations.clothing}`);
      console.log(`🚶 Outdoors: ${briefing.recommendations.outdoors}`);
      console.log(`🚗 Tesla: ${briefing.recommendations.tesla}`);
      console.log();
    })
    .catch(console.error);
}

module.exports = { WeatherService, WEATHER_CODES };
