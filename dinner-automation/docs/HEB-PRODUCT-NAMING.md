# HEB Product Naming Convention

**Lesson Learned (Feb 15, 2026):**

Generic search terms consistently fail or timeout. Use HEB-branded product names.

## ❌ DON'T Use (Causes Timeouts)
- `basmati rice` → Times out after 30s
- `naan bread` → Times out after 30s
- `organic chicken` → Returns too many results

## ✅ DO Use (Instant Success)
- `H-E-B Basmati Rice` → Found immediately
- `Stonefire Naan` → Found immediately  
- `H-E-B Organics Chicken Breast` → Specific match

## Implementation

All future meal plans must use:
1. **H-E-B branded names** for store-brand items
2. **Manufacturer brand names** for national brands
3. **Specific size/variant** when multiple exist

## Updated Items in Current Plan

| Ingredient | Old Search | New Search | Status |
|------------|-----------|-----------|---------|
| Basmati rice | `basmati rice` | `H-E-B Basmati Rice` | ✅ Fixed |
| Naan bread | `naan bread` | `Stonefire Naan` | ✅ Fixed |

## Future Prevention

Weekly meal plan generator will:
1. Validate all `hebSearch` terms against HEB's search
2. Use branded product names from HEB catalog
3. Test search terms before generating final plan
