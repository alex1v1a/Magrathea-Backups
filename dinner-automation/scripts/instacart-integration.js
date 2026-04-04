/**
 * Instacart Developer Platform Integration
 * 
 * This module integrates with Instacart's public API to create
 * shopping list links that pre-populate carts on Instacart.
 * 
 * Note: This creates Instacart carts (not HEB.com carts), but
 * users can select HEB as their retailer on Instacart.
 * 
 * Prerequisites:
 * 1. Apply for Instacart Developer Platform access:
 *    https://www.instacart.com/company/business/developers
 * 2. Obtain API key after approval
 * 3. Set INSTACART_API_KEY environment variable
 * 
 * @version 1.0.0
 */

const https = require('https');

class InstacartIntegration {
  constructor(apiKey) {
    if (!apiKey) {
      throw new Error('Instacart API key is required. Apply at: https://www.instacart.com/company/business/developers');
    }
    this.apiKey = apiKey;
    this.baseUrl = 'connect.instacart.com';
  }

  /**
   * Create a shopping list link from a weekly meal plan
   * 
   * @param {Object} mealPlan - The weekly meal plan object
   * @param {string} mealPlan.weekOf - ISO date string for the week
   * @param {Array} mealPlan.meals - Array of meal objects
   * @returns {Promise<Object>} Shopping list link data
   */
  async createShoppingListFromMealPlan(mealPlan) {
    console.log('🛒 Creating Instacart shopping list...');
    
    const lineItems = this._extractLineItems(mealPlan);
    console.log(`   Extracted ${lineItems.length} items from meal plan`);

    const payload = {
      title: `Weekly Dinner Plan - ${mealPlan.weekOf}`,
      link_type: 'shopping_list',
      expires_in: 604800, // 7 days in seconds
      instructions: [
        'Review items and select your preferred products',
        'Choose HEB as your retailer',
        'Add any additional items you need',
        'Proceed to checkout'
      ],
      line_items: lineItems,
      landing_page_configuration: {
        partner_linkback_url: 'https://your-dinner-app.com',
        enable_pantry_items: true
      }
    };

    try {
      const result = await this._makeRequest('/idp/v1/products/products_link', payload);
      console.log('✅ Instacart shopping list created!');
      console.log(`   Link: ${result.url}`);
      console.log(`   Expires: ${new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString()}`);
      return {
        success: true,
        url: result.url,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        itemCount: lineItems.length,
        retailer: 'HEB via Instacart',
        notes: 'User must select HEB as retailer on the Instacart page'
      };
    } catch (error) {
      console.error('❌ Failed to create Instacart shopping list:', error.message);
      throw error;
    }
  }

  /**
   * Extract line items from meal plan ingredients
   * @private
   */
  _extractLineItems(mealPlan) {
    const items = [];
    const seen = new Set();

    for (const meal of mealPlan.meals) {
      for (const ingredient of meal.ingredients) {
        // Use hebSearch or name for matching
        const searchTerm = ingredient.hebSearch || ingredient.name;
        
        // Skip duplicates (like red onion appearing in multiple meals)
        if (seen.has(searchTerm.toLowerCase())) {
          continue;
        }
        seen.add(searchTerm.toLowerCase());

        const { quantity, unit } = this._parseAmount(ingredient.amount);

        items.push({
          name: searchTerm,
          quantity: quantity,
          unit: unit,
          display_text: `${ingredient.amount} ${ingredient.name}`,
          // Optional: help Instacart match to right products
          filters: {
            brand_filters: [],
            health_filters: []
          }
        });
      }
    }

    return items;
  }

  /**
   * Parse amount string into quantity and unit
   * @private
   */
  _parseAmount(amount) {
    if (!amount) return { quantity: 1, unit: 'unit' };

    // Try to extract numeric value
    const numMatch = amount.match(/^([\d.]+)/);
    const quantity = numMatch ? parseFloat(numMatch[1]) : 1;

    // Try to extract unit
    const unitMap = {
      'lb': 'lb', 'lbs': 'lb', 'pound': 'lb', 'pounds': 'lb',
      'oz': 'oz', 'ounce': 'oz', 'ounces': 'oz',
      'g': 'g', 'gram': 'g', 'grams': 'g',
      'kg': 'kg', 'kilogram': 'kg', 'kilograms': 'kg',
      'cup': 'cup', 'cups': 'cup',
      'tbsp': 'tbsp', 'tablespoon': 'tbsp', 'tablespoons': 'tbsp',
      'tsp': 'tsp', 'teaspoon': 'tsp', 'teaspoons': 'tsp',
      'bunch': 'bunch', 'bunches': 'bunch',
      'pack': 'pack', 'packs': 'pack', 'package': 'pack',
      'bottle': 'bottle', 'bottles': 'bottle',
      'jar': 'jar', 'jars': 'jar',
      'container': 'container', 'containers': 'container',
      'bag': 'bag', 'bags': 'bag',
      'pint': 'pint', 'pints': 'pint',
      'quart': 'quart', 'quarts': 'quart',
      'gallon': 'gallon', 'gallons': 'gallon'
    };

    let unit = 'unit';
    const lowerAmount = amount.toLowerCase();
    
    for (const [key, value] of Object.entries(unitMap)) {
      if (lowerAmount.includes(key)) {
        unit = value;
        break;
      }
    }

    return { quantity, unit };
  }

  /**
   * Make HTTPS request to Instacart API
   * @private
   */
  _makeRequest(path, payload) {
    return new Promise((resolve, reject) => {
      const data = JSON.stringify(payload);

      const options = {
        hostname: this.baseUrl,
        path: path,
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Content-Length': Buffer.byteLength(data)
        }
      };

      const req = https.request(options, (res) => {
        let responseData = '';

        res.on('data', (chunk) => {
          responseData += chunk;
        });

        res.on('end', () => {
          try {
            const parsed = JSON.parse(responseData);
            if (res.statusCode >= 200 && res.statusCode < 300) {
              resolve(parsed);
            } else {
              reject(new Error(`Instacart API error ${res.statusCode}: ${parsed.message || responseData}`));
            }
          } catch (e) {
            reject(new Error(`Invalid JSON response: ${responseData}`));
          }
        });
      });

      req.on('error', (error) => {
        reject(error);
      });

      req.write(data);
      req.end();
    });
  }

  /**
   * Get nearby retailers (to check if HEB is available in user's area)
   * @param {string} postalCode - User's zip code
   * @param {string} countryCode - 'US' or 'CA'
   */
  async getNearbyRetailers(postalCode, countryCode = 'US') {
    return new Promise((resolve, reject) => {
      const options = {
        hostname: this.baseUrl,
        path: `/idp/v1/retailers?postal_code=${encodeURIComponent(postalCode)}&country_code=${countryCode}`,
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Accept': 'application/json'
        }
      };

      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            if (res.statusCode === 200) {
              // Check if HEB is available
              const heb = parsed.retailers?.find(r => 
                r.name.toLowerCase().includes('heb') || 
                r.name.toLowerCase().includes('h-e-b')
              );
              resolve({
                retailers: parsed.retailers,
                hebAvailable: !!heb,
                hebRetailer: heb
              });
            } else {
              reject(new Error(`API error ${res.statusCode}: ${data}`));
            }
          } catch (e) {
            reject(e);
          }
        });
      });

      req.on('error', reject);
      req.end();
    });
  }
}

/**
 * Example usage with the weekly meal plan
 */
async function exampleUsage() {
  // Load the weekly meal plan
  const fs = require('fs');
  const mealPlan = JSON.parse(fs.readFileSync('./data/weekly-plan.json', 'utf8'));

  // Initialize with API key (from environment)
  const instacart = new InstacartIntegration(process.env.INSTACART_API_KEY);

  try {
    // Check if HEB is available in user's area (optional)
    // const availability = await instacart.getNearbyRetailers('78610'); // Buda, TX zip
    // console.log('HEB Available:', availability.hebAvailable);

    // Create shopping list
    const result = await instacart.createShoppingListFromMealPlan(mealPlan);
    
    console.log('\n📋 Summary:');
    console.log('==========');
    console.log(`Items: ${result.itemCount}`);
    console.log(`Link: ${result.url}`);
    console.log(`Expires: ${result.expiresAt}`);
    console.log(`\n📝 Instructions for user:`);
    console.log('1. Click the link above');
    console.log('2. Select H-E-B as your retailer');
    console.log('3. Review and adjust quantities/brands');
    console.log('4. Proceed to checkout on Instacart');

    // Save result to file
    fs.writeFileSync(
      './data/instacart-link.json',
      JSON.stringify(result, null, 2)
    );
    console.log('\n💾 Result saved to data/instacart-link.json');

  } catch (error) {
    console.error('Failed:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  exampleUsage();
}

module.exports = { InstacartIntegration };
