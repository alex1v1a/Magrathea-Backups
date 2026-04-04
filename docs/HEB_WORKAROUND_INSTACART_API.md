# HEB Cart Automation Workaround Research

## Date: February 16, 2026
## Status: Research Complete - Potential Solution Identified

---

## Problem
HEB.com blocks browser automation through:
- Bot detection on product search pages
- Rate limiting on add-to-cart actions
- Session validation that flags automated browsers

---

## Solution: Instacart Developer Platform API

### Overview
Instacart launched a **public Developer Platform API** in March 2024 that allows third-party integrations. HEB is available through Instacart's marketplace.

### Key Capabilities
- ✅ **Product Search API** - Search HEB inventory via Instacart
- ✅ **Shopping List Generation** - Create carts programmatically
- ✅ **Recipe Integration** - Match ingredients to products
- ✅ **Real-time Inventory** - Check product availability
- ✅ **Retailer APIs** - Find nearby HEB stores

### API Endpoints Available
1. **Shopping APIs**
   - Product discovery and cart creation
   - Recipe pages with ingredient matching
   - Smart shopping lists

2. **Retailer APIs**
   - Store and location management
   - Service area checking
   - Availability by postal code

### Implementation Path

```javascript
// Example: Create shopping list from meal plan
const instacartAPI = {
  baseURL: 'https://api.instacart.com/v1',
  headers: {
    'Authorization': 'Bearer {API_KEY}',
    'Content-Type': 'application/json'
  }
};

// 1. Find nearby HEB
GET /retailers?postal_code=78610&country_code=US

// 2. Search for products
POST /products/search
{
  "retailer_id": "heb_123",
  "query": "H-E-B Basmati Rice",
  "limit": 5
}

// 3. Create shopping list
POST /shopping_lists
{
  "items": [...],
  "retailer_id": "heb_123"
}

// 4. Generate checkout URL
POST /checkout/session
{
  "shopping_list_id": "...",
  "redirect_url": "..."
}
```

### Advantages Over HEB Direct Automation
- ✅ Official, supported API
- ✅ No bot detection issues
- ✅ Reliable service
- ✅ HEB inventory available
- ✅ Can integrate with meal planning

### Next Steps to Implement
1. **Sign up** for Instacart Developer Platform API key
2. **Test** product search for HEB items
3. **Build** integration layer between weekly meal plan and Instacart API
4. **Create** shopping list generation script
5. **Automate** weekly cart creation via Instacart

### API Documentation
- **Portal:** https://docs.instacart.com/developer_platform_api/
- **Getting Started:** https://docs.instacart.com/developer_platform_api/get_started/api-keys
- **Recipe Integration:** https://docs.instacart.com/developer_platform_api/api/products/create_recipe_page
- **Shopping Lists:** https://docs.instacart.com/developer_platform_api/api/products/create_shopping_list_page

### Alternative Options (Lower Priority)
1. **HEB Go App** - Mobile app automation (more complex)
2. **Curbside Pickup API** - If available for business partners
3. **Manual Cart Template** - Generate shareable list for manual entry
4. **Third-party grocery APIs** - Shipt, etc.

---

## Recommendation
**Proceed with Instacart Developer Platform API.** This is the most reliable, official path to automate HEB grocery shopping without bot detection issues.

Estimated implementation time: 2-3 days for MVP
