# HEB.com Browser Automation

Automates grocery shopping on HEB.com based on weekly meal plans from the Dinner Plans system.

## Features

- ✅ Automatic login to HEB.com
- 🔍 Ingredient search with fallback alternatives
- 🛒 Add to cart with 110% quantity buffer
- ⚠️ Graceful handling of out-of-stock items
- 💾 Cart summary saved for budget tracking
- 📊 Detailed results with items, quantities, and total cost

## Installation

```bash
npm install playwright
```

## Usage

### As a Module

```javascript
const { runHEBAutomation } = require('./heb-automation');

const ingredients = [
  { name: 'ground beef', quantity: 2, unit: 'lb', alternatives: ['ground chuck'] },
  { name: 'chicken breast', quantity: 1.5, unit: 'lb', alternatives: ['chicken thighs'] }
];

const result = await runHEBAutomation(ingredients, {
  headless: false,  // Show browser window
  slowMo: 100       // Slow down operations for visibility
});

console.log(result.cart.total);
```

### CLI Usage

```bash
# Run with sample ingredients
node heb-automation.js

# Run with specific meal plan file
node heb-automation.js ./data/weekly-meal-plan.json

# Run headless (no browser window)
node heb-automation.js ./data/weekly-meal-plan.json --headless

# Run faster (less delay between actions)
node heb-automation.js ./data/weekly-meal-plan.json --fast
```

## Additional Automation Scripts

- **heb-cart-fully-automated.js** — Fully automated cart builder using a saved Chrome session.
  - Uses dynamic waits (selectors + network idle) to reduce hard sleeps.
- **heb-cart-stable.js** — Ultra-stable cart automation with a dedicated profile.
  - Waits for login/search readiness instead of fixed delays.

## Ingredient Format

```json
{
  "name": "ground beef",
  "quantity": 2,
  "unit": "lb",
  "category": "meat",
  "alternatives": ["ground chuck", "ground turkey"],
  "recipe": "Taco Tuesday"
}
```

## Output

The script saves a cart summary JSON file to `../data/cart-summary-YYYY-MM-DD.json`:

```json
{
  "metadata": {
    "generatedAt": "2026-02-05T12:00:00.000Z",
    "store": "HEB.com",
    "account": "alex@1v1a.com"
  },
  "summary": {
    "itemCount": 15,
    "total": 127.45,
    "totalFormatted": "$127.45",
    "items": [...],
    "outOfStock": [...],
    "timestamp": "2026-02-05T12:00:00.000Z"
  }
}
```

## Credentials

Credentials are configured in the script. In production, use environment variables:

```javascript
const CREDENTIALS = {
  email: process.env.HEB_EMAIL || 'alex@1v1a.com',
  password: process.env.HEB_PASSWORD || '$Tandal0ne'
};
```

## Selectors

HEB.com selectors are defined in `CONFIG.SELECTORS`. These may need updating if the site structure changes.

## Error Handling

The script handles:
- Login failures
- Search timeouts
- Out-of-stock items
- Missing products
- Cart loading issues

Failed items are tracked in the `outOfStock` array with reasons.

## Testing

Test with sample data:

```bash
cd dinner-automation/scripts
node heb-automation.js
```

## Gateway Integration

Once Gateway stability is resolved, this script can be invoked via:

```javascript
// Gateway automation call
const result = await sessions.spawn({
  task: 'heb-grocery-shopping',
  data: { ingredients: mealPlan.ingredients }
});
```
