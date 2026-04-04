# API Prototypes Index

This directory contains working prototypes for API integrations to enhance Alexander's automation systems.

**Last Updated:** February 16, 2026  
**Research Task:** 3/5 - API Integration Research & Prototype

---

## 📋 Quick Reference

| Prototype | Status | Cost | Priority | File |
|-----------|--------|------|----------|------|
| OpenAI Recipe Enhancer | ✅ NEW | ~$0.25/mo | **HIGH** | `openai-recipe-enhancer.js` |
| Twilio SMS Service | ✅ NEW | ~$2/mo | **HIGH** | `twilio-sms-service.js` |
| OpenWeatherMap | ✅ Existing | FREE | Medium | `openweather-prototype.js` |
| Notion API | ✅ Existing | FREE | Medium | `notion-api-prototype.js` |
| Telegram Bot | ✅ Existing | FREE | Medium | `telegram-bot-prototype.js` |

---

## 🆕 NEW: Priority 1 - OpenAI Recipe Enhancer

**File:** `openai-recipe-enhancer.js`

AI-powered recipe generation and enhancement for meal planning automation.

### Key Features
- Generate recipe variations (Mediterranean, kid-friendly, etc.)
- Add nutritional information to recipes
- Suggest seasonal meal ideas
- Create ingredient substitutions for dietary needs
- Scale recipes for different serving sizes
- Generate complete AI-enhanced weekly meal plans

### Setup
1. Get API key: https://platform.openai.com/api-keys
2. Set `OPENAI_API_KEY` environment variable
3. `npm install openai`

### Quick Start
```javascript
const { RecipeAIEnhancer } = require('./openai-recipe-enhancer');
const ai = new RecipeAIEnhancer({ provider: 'openai', model: 'gpt-4o' });

// Generate seasonal meals
const meals = await ai.suggestSeasonalMeals('spring', {
  cuisines: ['Italian', 'Mexican'],
  maxPrepTime: 45
}, 5);

// Add nutrition info
const nutrition = await ai.addNutritionalInfo({
  name: 'Grilled Chicken',
  servings: 4,
  ingredients: ['4 chicken breasts', '2 cups broccoli', '2 tbsp olive oil']
});

// Generate weekly meal plan
const plan = await ai.generateEnhancedMealPlan({
  budget: 200,
  familySize: 4,
  preferences: ['high-protein', 'kid-friendly']
});
```

### Cost Estimate
- Single recipe: ~$0.005-0.01
- Weekly plan: ~$0.02-0.05
- **Monthly: ~$0.25** (extremely affordable)

---

## 🆕 NEW: Priority 2 - Twilio SMS Service

**File:** `twilio-sms-service.js`

Enhanced SMS capabilities for automation notifications.

### Key Features
- Dinner confirmation SMS (faster than email)
- Weekly meal plan summaries via SMS
- Priority alerts (weather, urgent notifications)
- Grocery pickup reminders
- Two-way SMS handling (YES/NO/DONE replies)
- Message scheduling
- Delivery tracking
- Bulk family notifications

### Setup
1. Sign up: https://www.twilio.com
2. Get Account SID and Auth Token
3. Buy a phone number
4. Set environment variables
5. `npm install twilio`

### Quick Start
```javascript
const { TwilioSMSService } = require('./twilio-sms-service');
const sms = new TwilioSMSService();

// Send dinner confirmation
await sms.sendDinnerConfirmation('808-381-8835', {
  mealName: 'Grilled Salmon with Asparagus',
  time: '6:30 PM',
  ingredients: ['Salmon', 'Asparagus', 'Lemon']
});

// Send weekly plan
await sms.sendWeeklyMealPlan('808-381-8835', {
  weekOf: 'Feb 16-22',
  meals: [...],
  totalBudget: 200
});

// Handle incoming replies
await sms.handleIncomingMessage(from, body, messageSid);
```

### Environment Variables
```bash
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_PHONE_NUMBER=+1xxxxxxxxxx
```

### Cost Estimate
- SMS: $0.0075/message
- Phone number: $1.15/month
- **Monthly: ~$2.00** (very affordable)

---

## Existing Prototypes

### 3. Notion API Integration

**File:** `notion-api-prototype.js`

Centralized task and knowledge management.

```javascript
const { NotionWorkflowIntegration } = require('./notion-api-prototype');
const notion = new NotionWorkflowIntegration(process.env.NOTION_API_KEY);

const tasks = await notion.queryDatabase('DB_ID', { status: 'In Progress' });
await notion.createTask('DB_ID', { title: 'Review docs', priority: 'High' });
```

**Cost:** FREE

---

### 4. OpenWeatherMap Integration

**File:** `openweather-prototype.js`

Weather data for daily briefings and meal planning.

```javascript
const { WeatherService } = require('./openweather-prototype');
const weather = new WeatherService(process.env.OPENWEATHER_API_KEY);

const briefing = await weather.getWeatherBriefing('Austin, TX');
console.log(briefing.formatted);
```

**Cost:** FREE (1,000 calls/day)

---

### 5. Telegram Bot

**File:** `telegram-bot-prototype.js`

Mobile notifications and command interface.

```javascript
const { TelegramBotService } = require('./telegram-bot-prototype');
const bot = new TelegramBotService(process.env.TELEGRAM_BOT_TOKEN);

await bot.notify(chatId, 'Deployment complete!', 'normal');
bot.startPolling();
```

**Cost:** FREE

---

## 📊 Research Findings

See `API_RESEARCH_FINDINGS.md` for complete research documentation including:
- Detailed API availability and pricing
- Use case analysis
- Cost breakdowns
- Implementation recommendations

**Key Finding:** Costco has no official API available - skip this integration.

---

## 🗺️ Implementation Roadmap

See `INTEGRATION_ROADMAP.md` for full implementation plan.

### Phase 1A: Immediate (This Week)
1. ✅ OpenAI Recipe Enhancement - Prototype ready
2. ✅ Twilio SMS Expansion - Prototype ready

### Phase 1B: Existing (Next Week)
3. ⏳ OpenWeatherMap Integration - Use existing prototype
4. ⏳ Notion Integration - Use existing prototype

### Phase 2: Enhancement
5. ⏳ Google Calendar API
6. ⏳ GitHub Actions

### Skip
7. ❌ Costco API - Not available

---

## 🔧 Environment Variables Summary

```bash
# NEW - OpenAI (Required for recipe enhancement)
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
# Optional: ANTHROPIC_API_KEY for Claude alternative

# NEW - Twilio (Required for SMS)
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_PHONE_NUMBER=+1xxxxxxxxxx

# EXISTING - Other APIs
NOTION_API_KEY=secret_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
OPENWEATHER_API_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TELEGRAM_BOT_TOKEN=123456789:ABCdefGHIjklMNOpqrsTUVwxyz
TELEGRAM_CHAT_ID=123456789

# Optional
NOTION_TASKS_DB_ID=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

---

## 🚀 Running the Prototypes

```bash
# Install all dependencies
cd experiments/api-prototypes
npm install openai @anthropic-ai/sdk twilio @notionhq/client node-fetch@2

# Set up environment
cp .env.example .env
# Edit .env with your API keys

# Run individual prototypes
node openai-recipe-enhancer.js
node twilio-sms-service.js
node notion-api-prototype.js
node openweather-prototype.js
node telegram-bot-prototype.js
```

---

## 💰 Cost Summary

| API | Monthly Cost | Annual Cost |
|-----|--------------|-------------|
| OpenAI (GPT-4o-mini) | $0.25 | $3.00 |
| Twilio SMS | $2.00 | $24.00 |
| OpenWeatherMap | $0 | $0 |
| Notion | $0 | $0 |
| Telegram | $0 | $0 |
| **TOTAL** | **~$2.25** | **~$27** |

**Extremely affordable for the automation value provided.**

---

## ✅ Next Steps

### Immediate Actions
- [ ] Get OpenAI API key
- [ ] Get Twilio credentials
- [ ] Test prototypes with real API keys
- [ ] Integrate with dinner automation system

### This Week
- [ ] Add AI recipe enhancement to weekly meal plans
- [ ] Add SMS confirmation alongside email
- [ ] Implement weather-based seasonal suggestions
- [ ] Document all commands and usage

### Next Week
- [ ] Begin Google Calendar OAuth setup
- [ ] Monitor API costs and usage
- [ ] Create Marvin Dashboard widgets for monitoring

---

## 📁 Files in This Directory

```
api-prototypes/
├── API_RESEARCH_FINDINGS.md      # Complete research documentation
├── INTEGRATION_ROADMAP.md         # Implementation roadmap
├── README.md                      # This file
├── notion-api-prototype.js        # Task management (existing)
├── openai-recipe-enhancer.js      # AI recipe generation (NEW)
├── openweather-prototype.js       # Weather integration (existing)
├── telegram-bot-prototype.js      # Mobile notifications (existing)
└── twilio-sms-service.js          # SMS service (NEW)
```

---

*Generated by OpenClaw API Research Subagent*  
*Research Task 3/5 Complete - February 16, 2026*
