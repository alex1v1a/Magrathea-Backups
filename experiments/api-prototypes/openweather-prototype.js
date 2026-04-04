# OpenWeatherMap API Prototype

Weather API integration for daily briefings and alerts.

## Setup

1. Sign up at https://openweathermap.org/api
2. Get API key from dashboard
3. Set as environment variable

## Free Tier Limits

- One Call 3.0: 1,000 calls/day FREE
- Current Weather: 600 calls/min on Startup plan

## Installation

```bash
npm install node-fetch@2  # CommonJS compatible
```

## Prototype Code

```javascript
const fetch = require('node-fetch');

class WeatherService {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseUrl = 'https://api.openweathermap.org/data/3.0';
    this.geoUrl = 'https://api.openweathermap.org/geo/1.0';
  }

  /**
   * Get coordinates for a city name
   */
  async getCoordinates(city, stateCode = '', countryCode = 'US') {
    const query = stateCode 
      ? `${city},${stateCode},${countryCode}`
      : `${city},${countryCode}`;
    
    const url = `${this.geoUrl}/direct?q=${encodeURIComponent(query)}&limit=1&appid=${this.apiKey}`;
    
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      const data = await response.json();
      if (data.length === 0) throw new Error('City not found');
      
      return {
        lat: data[0].lat,
        lon: data[0].lon,
        name: data[0].name,
        country: data[0].country,
        state: data[0].state
      };
    } catch (error) {
      console.error('Geocoding error:', error.message);
      throw error;
    }
  }

  /**
   * Get comprehensive weather data (One Call API 3.0)
   * Requires subscription but has 1000 free calls/day
   */
  async getOneCallWeather(lat, lon, exclude = []) {
    const excludeParam = exclude.join(',');
    const url = `${this.baseUrl}/onecall?lat=${lat}&lon=${lon}&exclude=${excludeParam}&units=imperial&appid=${this.apiKey}`;
    
    try {
      const response = await fetch(url);
      if (!response.ok) {
        const error = await response.text();
        throw new Error(`One Call API error: ${error}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('One Call API error:', error.message);
      throw error;
    }
  }

  /**
   * Get current weather (free tier)
   */
  async getCurrentWeather(lat, lon) {
    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=imperial&appid=${this.apiKey}`;
    
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      const data = await response.json();
      
      return {
        city: data.name,
        temperature: Math.round(data.main.temp),
        feelsLike: Math.round(data.main.feels_like),
        humidity: data.main.humidity,
        description: data.weather[0].description,
        icon: data.weather[0].icon,
        windSpeed: data.wind.speed,
        visibility: data.visibility,
        sunrise: new Date(data.sys.sunrise * 1000).toLocaleTimeString(),
        sunset: new Date(data.sys.sunset * 1000).toLocaleTimeString(),
        timestamp: new Date(data.dt * 1000)
      };
    } catch (error) {
      console.error('Current weather error:', error.message);
      throw error;
    }
  }

  /**
   * Get 5-day forecast (free tier)
   */
  async getForecast(lat, lon) {
    const url = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=imperial&appid=${this.apiKey}`;
    
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      const data = await response.json();
      
      // Group by day
      const dailyForecasts = {};
      
      data.list.forEach(item => {
        const date = item.dt_txt.split(' ')[0];
        if (!dailyForecasts[date]) {
          dailyForecasts[date] = [];
        }
        dailyForecasts[date].push({
          time: item.dt_txt.split(' ')[1],
          temp: Math.round(item.main.temp),
          description: item.weather[0].description,
          icon: item.weather[0].icon,
          precipitation: item.pop // probability of precipitation
        });
      });
      
      return Object.entries(dailyForecasts).slice(0, 5).map(([date, readings]) => ({
        date,
        readings: readings.slice(0, 4), // First 4 readings of the day
        highTemp: Math.max(...readings.map(r => r.temp)),
        lowTemp: Math.min(...readings.map(r => r.temp)),
        description: readings[0].description,
        rainChance: Math.max(...readings.map(r => r.precipitation || 0))
      }));
    } catch (error) {
      console.error('Forecast error:', error.message);
      throw error;
    }
  }

  /**
   * Get air quality index
   */
  async getAirQuality(lat, lon) {
    const url = `https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${this.apiKey}`;
    
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      const data = await response.json();
      const aqi = data.list[0].main.aqi;
      
      const aqiLabels = {
        1: 'Good',
        2: 'Fair',
        3: 'Moderate',
        4: 'Poor',
        5: 'Very Poor'
      };
      
      return {
        aqi,
        label: aqiLabels[aqi],
        components: data.list[0].components
      };
    } catch (error) {
      console.error('Air quality error:', error.message);
      throw error;
    }
  }

  /**
   * Generate formatted weather briefing
   */
  async getWeatherBriefing(location = 'Austin, TX') {
    try {
      // Parse location
      const [city, state] = location.split(',').map(s => s.trim());
      const coords = await this.getCoordinates(city, state);
      
      // Fetch all data in parallel
      const [current, forecast, airQuality] = await Promise.all([
        this.getCurrentWeather(coords.lat, coords.lon),
        this.getForecast(coords.lat, coords.lon),
        this.getAirQuality(coords.lat, coords.lon)
      ]);
      
      // Format the briefing
      const iconMap = {
        '01d': '☀️', '01n': '🌙',
        '02d': '⛅', '02n': '☁️',
        '03d': '☁️', '03n': '☁️',
        '04d': '☁️', '04n': '☁️',
        '09d': '🌧️', '09n': '🌧️',
        '10d': '🌦️', '10n': '🌧️',
        '11d': '⛈️', '11n': '⛈️',
        '13d': '❄️', '13n': '❄️',
        '50d': '🌫️', '50n': '🌫️'
      };
      
      const icon = iconMap[current.icon] || '🌡️';
      
      let briefing = `## ${icon} Weather Briefing for ${current.city}\n\n`;
      briefing += `**Current:** ${current.temperature}°F (feels like ${current.feelsLike}°F)\n`;
      briefing += `**Conditions:** ${current.description}\n`;
      briefing += `**Humidity:** ${current.humidity}% | **Wind:** ${current.windSpeed} mph\n`;
      briefing += `**Air Quality:** ${airQuality.label} (AQI: ${airQuality.aqi})\n`;
      briefing += `**Sun:** 🌅 ${current.sunrise} | 🌇 ${current.sunset}\n\n`;
      
      briefing += `**5-Day Forecast:**\n`;
      forecast.forEach(day => {
        const rainIcon = day.rainChance > 0.3 ? '🌧️' : '';
        briefing += `• ${day.date}: ${day.highTemp}°/${day.lowTemp}°F ${rainIcon} ${day.description}\n`;
      });
      
      // Weather alerts
      const alerts = this._generateAlerts(current, forecast[0], airQuality);
      if (alerts.length > 0) {
        briefing += `\n**⚠️ Alerts:**\n`;
        alerts.forEach(alert => briefing += `• ${alert}\n`);
      }
      
      return {
        formatted: briefing,
        data: { current, forecast, airQuality, coords }
      };
    } catch (error) {
      console.error('Briefing generation error:', error.message);
      throw error;
    }
  }

  /**
   * Generate weather alerts based on conditions
   */
  _generateAlerts(current, todayForecast, airQuality) {
    const alerts = [];
    
    // Temperature alerts
    if (current.temperature > 95) {
      alerts.push('🔥 Extreme heat warning - stay hydrated');
    } else if (current.temperature < 32) {
      alerts.push('❄️ Freezing temperatures - dress warmly');
    }
    
    // Air quality alert
    if (airQuality.aqi >= 4) {
      alerts.push('😷 Poor air quality - limit outdoor activities');
    }
    
    // Rain alert
    if (todayForecast.rainChance > 0.7) {
      alerts.push('☔ High chance of rain today - bring an umbrella');
    }
    
    // Wind alert
    if (current.windSpeed > 20) {
      alerts.push('💨 Strong winds - secure loose outdoor items');
    }
    
    return alerts;
  }

  /**
   * Check if weather warrants a notification
   */
  shouldNotify(current, previous, threshold = {}) {
    const tempChange = Math.abs(current.temperature - (previous?.temperature || current.temperature));
    
    return {
      significantTempChange: tempChange > (threshold.temp || 15),
      rainStarting: !previous?.description?.includes('rain') && current.description.includes('rain'),
      severeWeather: ['thunderstorm', 'tornado', 'hurricane', 'snow'].some(w => 
        current.description.toLowerCase().includes(w)
      ),
      highHeat: current.temperature > (threshold.heat || 100),
      freezing: current.temperature < (threshold.freeze || 32)
    };
  }
}

// Example usage
async function main() {
  const weather = new WeatherService(process.env.OPENWEATHER_API_KEY);
  
  try {
    // Get weather briefing for Austin, TX
    const briefing = await weather.getWeatherBriefing('Austin, TX');
    console.log(briefing.formatted);
    
    // Example: Check specific coordinates
    // const current = await weather.getCurrentWeather(30.2672, -97.7431);
    // console.log('Current:', current);
    
    // Example: Get air quality
    // const aqi = await weather.getAirQuality(30.2672, -97.7431);
    // console.log('Air Quality:', aqi);
    
  } catch (error) {
    console.error('Weather service error:', error.message);
  }
}

module.exports = { WeatherService };

// Run if called directly
if (require.main === module) {
  main();
}
```

## Environment Variables

```bash
OPENWEATHER_API_KEY=your_api_key_here
```

## Use Cases Demonstrated

1. **Daily Weather Briefing** - Formatted weather report with forecast
2. **Air Quality Monitoring** - AQI data for health recommendations
3. **Weather Alerts** - Automated alerts for significant changes
4. **Multi-location Support** - Geocoding for any city

## Rate Limiting

- Track API calls to stay under 1,000/day (One Call) or 600/min (current)
- Cache results for 10-15 minutes to reduce calls
- Use free tier endpoints for basic needs

## Next Steps

1. Sign up for API key
2. Test with your location
3. Schedule daily briefings via Discord/Telegram
4. Add weather-based automation (e.g., "Bring umbrella" reminders)

## Example Output

```
## ☀️ Weather Briefing for Austin

**Current:** 75°F (feels like 73°F)
**Conditions:** clear sky
**Humidity:** 45% | **Wind:** 8 mph
**Air Quality:** Good (AQI: 1)
**Sun:** 🌅 7:12 AM | 🌇 6:15 PM

**5-Day Forecast:**
• 2026-02-13: 78°/52°F clear sky
• 2026-02-14: 80°/55°F few clouds
• 2026-02-15: 75°/60°F 🌧️ light rain
...

**⚠️ Alerts:**
• ☔ High chance of rain Monday - bring an umbrella
```
