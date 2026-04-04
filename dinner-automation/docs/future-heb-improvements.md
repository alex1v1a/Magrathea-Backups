# Future HEB Automation - Stock Check Integration

## Problem Identified
Current workflow:
1. Generate recipes → 2. Create shopping list → 3. Try to add to HEB cart
**Issue:** Items out of stock discovered too late

## Improved Workflow
1. Generate recipes
2. **CHECK HEB STOCK** (new step)
3. Substitute out-of-stock items
4. Update recipes with substitutions
5. Create final shopping list
6. Add to HEB cart
7. Sync calendar with changes

## Implementation Plan

### Phase 1: Stock Checker Script
```javascript
// heb-stock-checker.js
// Before finalizing recipes, check availability
```

### Phase 2: Pre-Cart Validation
- Search each item on HEB.com first
- Mark unavailable items
- Suggest substitutions
- Update recipes BEFORE cart building

### Phase 3: Recipe-Aware Substitutions
- If protein unavailable → suggest similar protein
- If vegetable unavailable → suggest seasonal alternative  
- If condiment unavailable → suggest common substitute
- If critical item unavailable → flag for recipe change

### Phase 4: Calendar Integration
- Auto-update dinner events with substitutions
- Email notification of changes
- Weekly meal plan stays intact

## Substitution Rules

### Proteins (Always substitute with similar)
- Tilapia → Catfish, Swai, Cod
- Chicken breast → Chicken thighs, Turkey breast
- Ribeye → Sirloin, NY Strip

### Produce (Seasonal alternatives)
- Asian pear → Bosc pear, Apple
- Fresh herbs → Dried herbs (1/3 amount)
- Out of season → Frozen alternative

### Pantry (Flexible substitutes)
- Gochujang → Sriracha + soy sauce
- Specialty items → Common alternatives
- Garnishes → Omit if not critical

### Critical Items (Cannot substitute)
- Main proteins (require recipe change)
- Staple grains (rice, couscous, quinoa)
- Recipe-defining ingredients

## Future Automation Flow

```
Saturday 8:00 AM - Recipe Generation
  ↓
Saturday 8:15 AM - Stock Check (HEB.com)
  ↓
Saturday 8:30 AM - Apply Substitutions
  ↓
Saturday 8:45 AM - Update Recipes + Calendar
  ↓
Saturday 9:00 AM - Build HEB Cart
  ↓
Saturday 9:15 AM - Email Notification
  ↓
Saturday 9:30 AM - DONE (100% in-stock items)
```

## Success Metrics

| Metric | Before | After |
|--------|--------|-------|
| Cart Completion | 87% (27/31) | 100% (substitutions) |
| Recipe Changes | Reactive | Proactive |
| User Intervention | Required | Minimal |
| Meal Plan Integrity | Compromised | Maintained |

---

**Status:** Documentation complete
**Next Step:** Implement stock checker for next week's automation
