# Stock Management System

## Overview

The dinner automation system uses **two separate lists** to manage items that shouldn't appear in your weekly shopping:

1. **Weekly Exclusions** - Temporary items (reset weekly)
2. **Long-Term Stock** - Permanent pantry staples

---

## 📋 Weekly Exclusions

### What is it?
Items you want to exclude from **THIS WEEK'S** meal plan shopping list.

### When to use:
- You just bought something and don't need more this week
- You have plenty of something for the current week only
- Temporary stock fluctuations

### Examples:
```
✅ "Bought olive oil yesterday, skip this week"
✅ "Have 3 bulbs of garlic, don't need more"
✅ "Just restocked soy sauce, skip this week"
```

### Key characteristics:
- ⏰ **Resets every Saturday at 9:00 AM** with new meal plan
- 📝 **Temporary** - items expire weekly
- 🔄 **Automatic** - new exclusions needed each week

### Commands:

```bash
# Add item to weekly exclusions
cd dinner-automation/scripts
node stock-manager.js --weekly-add "Olive oil" "Just bought large bottle"

# Remove item from weekly exclusions
node stock-manager.js --weekly-remove "Garlic"

# Clear all weekly exclusions
node stock-manager.js --weekly-clear

# List all weekly exclusions
node stock-manager.js --list
```

---

## 🏠 Long-Term Stock

### What is it?
Pantry staples and ingredients that are **ALWAYS** kept on hand.

### When to use:
- Items you always keep stocked
- Pantry staples you buy in bulk
- Ingredients you never want to appear in meal plans

### Examples:
```
✅ "We always keep olive oil on hand" (buy in bulk)
✅ "Always have garlic, onions, salt"
✅ "Keep soy sauce stocked for Asian cooking"
✅ "Always have eggs and butter"
```

### Key characteristics:
- 🏠 **Permanent** - persists across all meal plans
- 📦 **Pantry staples** - things you always keep
- 🚫 **Never appears** in weekly shopping lists
- 📝 **Manual updates** - you manage this list

### Commands:

```bash
# Add item to long-term stock
node stock-manager.js --stock-add "Soy sauce" condiments_and_sauces "Low sodium"

# Remove item from long-term stock
node stock-manager.js --stock-remove "Ketchup"

# List all stock (shows both lists)
node stock-manager.js --list
```

### Categories:

| Category | Description | Examples |
|----------|-------------|----------|
| `oils_and_vinegars` | Cooking oils and vinegars | Olive oil, sesame oil, balsamic |
| `condiments_and_sauces` | Sauces and condiments | Soy sauce, mustard, mayo |
| `spices_and_seasonings` | Spices and herbs | Salt, pepper, cumin, paprika |
| `pantry_staples` | Dry goods and cans | Flour, rice, pasta, canned tomatoes |
| `fresh_produce_always` | Always-have produce | Garlic, onions, lemons |
| `dairy` | Dairy products | Butter, eggs, milk |

---

## 🔍 Quick Comparison

| Feature | Weekly Exclusions | Long-Term Stock |
|---------|------------------|-----------------|
| **Duration** | 1 week (resets Saturday) | Permanent |
| **Use case** | "Just bought this" | "Always keep this" |
| **Management** | Automatic reset | Manual updates |
| **Examples** | Recent purchases | Pantry staples |
| **Affects** | Current week only | All future weeks |

---

## 📊 Decision Tree

```
Don't want an ingredient in this week's shopping?
│
├─ Did you JUST buy it?
│  ├─ YES → Use WEEKLY EXCLUSIONS
│  └─ NO → Continue...
│
├─ Do you ALWAYS keep it stocked?
│  ├─ YES → Use LONG-TERM STOCK
│  └─ NO → Continue...
│
└─ Is it a pantry staple?
   ├─ YES → Use LONG-TERM STOCK
   └─ NO → Let it appear in shopping list
```

---

## 🎯 Common Scenarios

### Scenario 1: Just bought olive oil
```bash
# CORRECT: Weekly exclusion (temporary)
node stock-manager.js --weekly-add "Olive oil" "Just bought large bottle"
```
Why? You'll need olive oil again in future weeks, just not this week.

### Scenario 2: Always keep garlic on hand
```bash
# CORRECT: Long-term stock (permanent)
node stock-manager.js --stock-add "Garlic" fresh_produce_always "Always keep bulb on hand"
```
Why? You always buy garlic and keep it stocked.

### Scenario 3: Bought a special ingredient for one recipe
```bash
# CORRECT: Weekly exclusion (temporary)
node stock-manager.js --weekly-add "Gochujang" "Bought for this week's recipe"
```
Why? You might not always keep this on hand.

### Scenario 4: Always have basmati rice for Indian cooking
```bash
# CORRECT: Long-term stock (permanent)
node stock-manager.js --stock-add "Basmati rice" pantry_staples "For Indian recipes"
```
Why? You always keep this rice stocked.

---

## 📝 File Locations

| File | Purpose | Location |
|------|---------|----------|
| `weekly-exclusions.json` | Temporary exclusions | `dinner-automation/data/` |
| `long-term-stock.json` | Permanent stock | `dinner-automation/data/` |
| `stock-manager.js` | Management script | `dinner-automation/scripts/` |

---

## 🔄 How It Works with Meal Plans

### Weekly Meal Plan Generation:
1. System generates 7 meals based on preferences
2. Collects all required ingredients
3. **Removes** items from Long-Term Stock (always excluded)
4. **Removes** items from Weekly Exclusions (temporarily excluded)
5. Creates final shopping list

### Example:
**Raw ingredients needed:**
- Olive oil, Garlic, Salmon, Lemon, Soy sauce

**After Long-Term Stock removal:**
- ~~Olive oil~~ (always stocked)
- ~~Garlic~~ (always stocked)
- Salmon, Lemon, ~~Soy sauce~~ (always stocked)

**After Weekly Exclusions removal:**
- ~~Salmon~~ (bought yesterday - weekly exclusion)
- Lemon (appears in shopping list)

**Final shopping list:**
- Lemon ✓

---

## 🚀 Quick Start

1. **List current stock:**
   ```bash
   node stock-manager.js --list
   ```

2. **Add weekly exclusion:**
   ```bash
   node stock-manager.js --weekly-add "Olive oil" "Just bought"
   ```

3. **Add to long-term stock:**
   ```bash
   node stock-manager.js --stock-add "Garlic" fresh_produce_always
   ```

4. **Verify in next meal plan** - items should be excluded

---

## 💡 Tips

- **Weekly exclusions** are perfect for "I just bought this" situations
- **Long-term stock** is for things you buy in bulk or always keep
- When in doubt, use **weekly exclusions** - you can always add to long-term later
- Review long-term stock monthly to keep it current
- Weekly exclusions auto-clear, so no maintenance needed

---

**Questions?** The stock manager script has built-in help:
```bash
node stock-manager.js
```
