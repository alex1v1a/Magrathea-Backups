# API Integration Research Report

**Date:** February 19, 2026  
**Researcher:** Marvin (Self-Improvement Mode)  
**Objective:** Identify valuable APIs to enhance dinner automation capabilities

---

## Executive Summary

Researched 12 APIs across 3 categories. Recommended for implementation:
1. **OpenWeatherMap** (Weather) - Free tier sufficient
2. **Spoonacular** (Recipe) - Rich data, reasonable pricing
3. **Price comparison** - Manual approach most viable

---

## 1. Weather API Integration

### Use Case
Suggest appropriate meals based on weather:
- Cold/rainy → Soups, stews, comfort food
- Hot/sunny → Grilling, salads, cold dishes
- Stormy → Indoor cooking, longer prep times

### API Options

| Provider | Free Tier | Paid | Pros | Cons |
|----------|-----------|------|------|------|
| **OpenWeatherMap** ✅ | 1000 calls/day | $180/mo | Reliable, comprehensive | Slight learning curve |
| WeatherAPI.com | 1M calls/month | $5/mo | Generous free tier | Less accurate for hyperlocal |
| National Weather Service | Unlimited | Free | Official US data | US-only, complex API |
| Weatherbit | 500 calls/day | $5/mo | Good historical data | Limited free tier |

### Recommendation: OpenWeatherMap

**Why:**
- 1000 calls/day exceeds needs (3-4 calls/day max)
- Supports forecast (5-day) for meal planning
- Includes "feels like" temperature
- UV index, precipitation probability

**Integration Pattern:**
```javascript
// Daily weather check with dinner suggestion
const suggestion = await getWeatherMealSuggestion('Buda,TX');
// Returns: { temp: 45, condition: 'rain', suggestedTags: ['soup', 'comfort', 'warm'] }
```

---

## 2. Recipe Enrichment API

### Use Case
Auto-populate recipe database with:
- Nutritional information (calories, macros)
- Cooking times, difficulty ratings
- Ingredient substitutes
- Wine pairings
- Dietary tags (keto, vegan, etc.)

### API Options

| Provider | Free Tier | Paid | Pros | Cons |
|----------|-----------|------|------|------|
| **Spoonacular** ✅ | 150 points/day | $29/mo | Most comprehensive | Complex points system |
| Edamam | 10k calls/month | $99/mo | Excellent nutrition | Limited recipe data |
| Tasty API | 50 calls/day | Custom | Great for discovery | No nutritional data |
| TheMealDB | Unlimited | Free | Completely free | Limited dataset (~300 meals) |

### Recommendation: Spoonacular

**Why:**
- 150 points/day = ~75 recipe lookups/day
- Rich data: nutrition, instructions, ingredients, equipment
- Ingredient substitute API
- Recipe scaling (adjust for family size)

**Cost Analysis:**
- Current need: ~30 recipes/week enrichment = ~15 points/day
- Free tier sufficient for current scale
- $29/mo if scale to 500+ recipes

**Integration Pattern:**
```javascript
// Enrich recipe with API data
const enriched = await enrichRecipe('Chicken Tikka Masala');
// Adds: calories, protein, carbs, fat, readyInMinutes, dairyFree, etc.
```

---

## 3. Price Comparison API

### Use Case
Find best deals on ingredients across stores:
- HEB vs Walmart vs Target vs Costco
- Weekly price tracking
- Alert when staples are on sale

### Research Findings

**Bad News:** No reliable grocery price APIs exist.

**Why:**
- Grocery prices change daily/hourly
- Store APIs are private/undocumented
- Legal restrictions on price scraping
- Kroger has developer API but restricted access
- Walmart has API but no grocery prices

### Alternative Approaches

#### Option A: Community Data (Recommended)
- Open-source price database
- Users contribute prices
- Aggregate averages
- Similar to GasBuddy for groceries

#### Option B: Weekly Manual Capture
- Script opens each store's site
- Screenshots/parses price for specific items
- Logs to database
- Manual but reliable

#### Option C: Instacart/DoorDash APIs (Unofficial)
- Higher prices than in-store
- Rate limited
- Terms of service issues

### Recommendation: Hybrid Approach

1. **Start with manual entry** for staples (olive oil, chicken, etc.)
2. **Build price tracking** over time
3. **Crowdsource** from Vectarr users if applicable
4. **Monitor** for official APIs (retailers opening up)

---

## 4. Bonus APIs Researched

### Nutrition API: Nutritionix
- **Use:** Detailed nutrition for any food
- **Free:** 200 calls/day
- **Value:** High for health tracking
- **Verdict:** Nice-to-have, not essential

### SMS Backup: Vonage (instead of Twilio)
- **Use:** Fallback if Twilio fails
- **Free:** Trial credits
- **Value:** Redundancy
- **Verdict:** Skip - Twilio is reliable

### Calendar API: Nylas
- **Use:** Better iCloud calendar integration
- **Cost:** $0.005/call
- **Value:** Easier than CalDAV
- **Verdict:** Overkill - current CalDAV works

---

## Implementation Priority

### Phase 1 (This Week)
1. OpenWeatherMap integration
   - Daily weather fetch
   - Meal suggestion engine
   - Display in email/dash

### Phase 2 (Next Week)
2. Spoonacular integration
   - Recipe enrichment job
   - Nutrition data population
   - Dietary tag auto-assignment

### Phase 3 (Future)
3. Price tracking system
   - Manual entry interface
   - Price history charts
   - Sale alert system

---

## API Keys Needed

| Service | Key Location | Status |
|---------|--------------|--------|
| OpenWeatherMap | `.secrets/openweather.json` | Need to create |
| Spoonacular | `.secrets/spoonacular.json` | Need to create |

---

## Security Notes

- All API keys stored in `.secrets/` (gitignored)
- Rate limit tracking to avoid overages
- No PII sent to APIs
- Cache responses to minimize calls

---

*Report generated by Marvin in self-improvement mode*  
*Next update: After Phase 1 implementation*
