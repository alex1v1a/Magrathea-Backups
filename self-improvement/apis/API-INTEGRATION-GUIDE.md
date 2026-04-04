# API Integration Guide
## Comprehensive Guide for External Service Integrations

---

## Table of Contents
1. [WhatsApp Business API](#whatsapp-business-api)
2. [Weather API](#weather-api)
3. [Notion API](#notion-api)
4. [Calendar APIs](#calendar-apis)
5. [Best Practices](#best-practices)

---

## WhatsApp Business API

### Overview
Send notifications, alerts, and updates via WhatsApp. Cost-effective alternative to SMS with rich media support.

### Pricing
- **Free tier**: 1,000 conversations/month
- **Paid**: ~$0.005 per conversation (24-hour window)
- Much cheaper than SMS ($0.01-$0.05 per message)

### Setup
1. Create Meta Developer account
2. Set up WhatsApp Business account
3. Verify phone number
4. Get API key and Phone Number ID

### Environment Variables
```bash
WHATSAPP_API_KEY=your_api_key
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id
WHATSAPP_BUSINESS_ACCOUNT_ID=your_business_account_id
```

### Use Cases
- Order confirmations
- Delivery slot alerts
- Substitution notifications
- Appointment reminders

### Code Example
```javascript
const { sendOrderConfirmation } = require('./apis/whatsapp-poc');

await sendOrderConfirmation('+1234567890', {
  orderNumber: 'HEB-12345',
  store: 'H-E-B Mueller',
  pickupTime: 'Today 6:00 PM',
  itemCount: 12,
  total: '87.43'
});
```

---

## Weather API

### Overview
OpenWeatherMap API for weather-based meal planning and contextual suggestions.

### Pricing
- **Free tier**: 1,000 calls/day
- **Paid**: Starting at $0.0013 per call
- Sufficient for personal use

### Setup
1. Sign up at openweathermap.org
2. Get free API key
3. No credit card required for free tier

### Environment Variables
```bash
OPENWEATHER_API_KEY=your_api_key
```

### Use Cases
- Weather-based meal suggestions
- Outdoor cooking recommendations
- Seasonal ingredient suggestions
- Event planning

### Code Example
```javascript
const { generateWeatherBasedMealPlan } = require('./apis/weather-poc');

const mealPlan = await generateWeatherBasedMealPlan('Austin', 'TX', 5);
// Returns array of daily suggestions based on forecast
```

---

## Notion API

### Overview
Document and track meal plans, recipes, and shopping history in Notion databases.

### Pricing
- **Free tier**: Unlimited for personal use
- **Paid**: $8/month for teams

### Setup
1. Go to notion.so/my-integrations
2. Create new integration
3. Copy Internal Integration Token
4. Share databases with integration

### Environment Variables
```bash
NOTION_API_KEY=secret_xxx
NOTION_DATABASE_ID=your_database_id
```

### Use Cases
- Meal history tracking
- Recipe database
- Shopping list export
- Nutrition tracking

### Code Example
```javascript
const { addMealToDatabase } = require('./apis/notion-poc');

await addMealToDatabase({
  name: 'Grilled Salmon',
  date: new Date(),
  ingredients: ['salmon', 'asparagus', 'lemon'],
  rating: 5,
  notes: 'Family favorite!'
});
```

---

## Calendar APIs

### Google Calendar

#### Setup
1. Go to Google Cloud Console
2. Enable Google Calendar API
3. Create OAuth 2.0 credentials
4. Download client_secret.json

#### Scopes Required
- `https://www.googleapis.com/auth/calendar.events`
- `https://www.googleapis.com/auth/calendar.readonly`

#### Use Cases
- Dinner event creation
- Grocery pickup reminders
- Meal prep scheduling

### Microsoft Graph (Outlook)

#### Setup
1. Go to Azure Portal
2. Register new application
3. Add Calendar.ReadWrite permission
4. Get client ID and secret

#### Use Cases
- Cross-platform calendar sync
- Teams meeting creation
- Work calendar integration

---

## Best Practices

### 1. Rate Limiting
Always implement rate limiting to avoid API bans:

```javascript
const { IntelligentRetry } = require('../lib/intelligent-retry');
const retry = new IntelligentRetry({
  maxRetries: 3,
  baseDelay: 1000
});

await retry.execute(async () => {
  return await apiCall();
}, { endpoint: 'api-name' });
```

### 2. Caching
Cache API responses to reduce costs:

```javascript
const { getOrCompute, TTL } = require('../lib/intelligent-cache');

const weather = await getOrCompute(
  `weather:${city}`,
  () => getWeather(city),
  { ttl: TTL.MEDIUM } // 1 hour
);
```

### 3. Error Handling
Always handle errors gracefully:

```javascript
try {
  const result = await apiCall();
} catch (error) {
  if (error.code === 'RATE_LIMITED') {
    // Back off and retry later
  } else if (error.code === 'UNAUTHORIZED') {
    // Refresh credentials
  } else {
    // Log and notify
  }
}
```

### 4. Environment Configuration
Never hardcode API keys:

```javascript
const config = {
  apiKey: process.env.API_KEY,
  timeout: process.env.API_TIMEOUT || 30000
};
```

### 5. Monitoring
Track API usage and costs:

```javascript
const stats = {
  calls: 0,
  errors: 0,
  cost: 0
};

// After each call
stats.calls++;
stats.cost += costPerCall;
```

---

## Cost Comparison

| Service | Free Tier | Paid Cost | Best For |
|---------|-----------|-----------|----------|
| WhatsApp | 1,000 convo/month | $0.005/convo | Notifications |
| Weather | 1,000 calls/day | $0.0013/call | Meal planning |
| Notion | Unlimited | $8/month (teams) | Documentation |
| Google Calendar | 1M calls/day | $0 (personal) | Scheduling |
| Twilio SMS | None | $0.0075/message | Fallback SMS |

---

## Integration Checklist

- [ ] API key obtained and secured
- [ ] Environment variables configured
- [ ] Rate limiting implemented
- [ ] Caching layer added
- [ ] Error handling in place
- [ ] Monitoring enabled
- [ ] Documentation updated
- [ ] Tests written

---

## Troubleshooting

### Common Issues

**Rate Limiting (429 errors)**
- Implement exponential backoff
- Reduce request frequency
- Use caching

**Authentication Errors (401/403)**
- Check API key validity
- Verify scopes/permissions
- Check token expiration

**Timeout Errors**
- Increase timeout values
- Implement circuit breaker
- Check network connectivity

---

*Last updated: February 26, 2026*
