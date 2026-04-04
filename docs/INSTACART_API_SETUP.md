# Instacart Developer Platform API Integration for HEB

## Setup Instructions

### 1. Get API Access
Visit: https://www.instacart.com/company/api-developer-platform

Apply for API access with:
- **Use Case:** Personal meal planning and grocery automation
- **Retailer:** HEB (available in Austin/Buda, TX area)
- **Integration Type:** Shopping list generation

### 2. API Key Storage
Once approved, store credentials in `.secrets/instacart-api.json`:

```json
{
  "api_key": "your_api_key_here",
  "api_secret": "your_api_secret_here",
  "environment": "production",
  "retailer_id": "heb",
  "postal_code": "78610",
  "country_code": "US"
}
```

### 3. API Capabilities for HEB

#### Available Endpoints:
- **GET /v1/retailers** - Find nearby retailers
- **GET /v1/retailers/{id}/products/search** - Search HEB products
- **POST /v1/shopping_lists** - Create shopping lists
- **GET /v1/shopping_lists/{id}** - Get shopping list details
- **POST /v1/checkout_sessions** - Generate checkout URL

#### HEB-Specific Features:
- Real-time inventory checking
- Product substitutions
- Curbside pickup scheduling
- Delivery options

### 4. Integration Flow

```
Weekly Meal Plan
      ↓
Extract Ingredients
      ↓
Search Instacart API (HEB retailer)
      ↓
Match products to ingredients
      ↓
Create shopping list
      ↓
Generate HEB checkout URL
      ↓
Send notification with link
```

### 5. Rate Limits
- 100 requests/minute for product search
- 10 shopping lists/hour
- Check documentation for latest limits

### 6. Next Steps
1. Apply for API access
2. Test product search endpoint
3. Build ingredient-to-product matching
4. Create shopping list automation
5. Integrate with weekly meal plan generator
