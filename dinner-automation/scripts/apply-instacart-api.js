#!/usr/bin/env node
/**
 * Apply for Instacart API Access
 * Generates the application form data for easy submission
 */

const applicationData = {
  company_name: "Personal - Home Automation",
  use_case: "Meal Planning & Grocery Automation",
  description: `
I am building a personal home automation system that generates weekly meal plans 
and automatically creates shopping lists. I want to integrate with Instacart to:

1. Search for products at my local HEB store
2. Create shopping lists from weekly meal plans
3. Generate checkout links for easy ordering

This is for personal use only - automating my family's grocery shopping 
based on meal plans I create each week.

Technical Details:
- Integration Type: Shopping List API
- Preferred Retailer: HEB (Buda, TX - 78610)
- Authentication: API Key
- Environment: Production (once tested)
- Expected Volume: ~1 shopping list per week (52/year)
  `,
  website: "https://vectarr.com", // Or personal domain
  contact_email: "alex@1v1a.com",
  technical_contact: "alex@1v1a.com",
  use_case_category: "Meal Planning & Personal Automation",
  data_handling: "Personal data only - no customer PII",
  integration_type: [
    "Product Search API",
    "Shopping List API", 
    "Checkout Session API"
  ],
  retailer_preferences: ["HEB"],
  expected_volume: "Low - personal use, ~52 shopping lists per year"
};

console.log(`
╔══════════════════════════════════════════════════════════════╗
║     INSTACART DEVELOPER PLATFORM - API APPLICATION           ║
╚══════════════════════════════════════════════════════════════╝

Apply for API access at:
https://www.instacart.com/company/api-developer-platform

════════════════════════════════════════════════════════════════
APPLICATION DATA (copy/paste into form):
════════════════════════════════════════════════════════════════

COMPANY/ORGANIZATION NAME:
${applicationData.company_name}

USE CASE SUMMARY:
${applicationData.use_case}

DETAILED DESCRIPTION:
${applicationData.description}

WEBSITE:
${applicationData.website}

CONTACT EMAIL:
${applicationData.contact_email}

EXPECTED API USAGE:
${applicationData.expected_volume}

INTEGRATION TYPES NEEDED:
${applicationData.integration_type.join('\n')}

PREFERRED RETAILER:
${applicationData.retailer_preferences.join(', ')}

════════════════════════════════════════════════════════════════

NEXT STEPS AFTER APPROVAL:
1. You will receive an email with Developer Dashboard access
2. Log in at: https://dashboard.instacart.com
3. Create a new API key (Production environment)
4. Copy the API key (format: keys.xxxxxxxxxxxxxxxx)
5. Save it to: .secrets/instacart-api.json

════════════════════════════════════════════════════════════════

The API key file should look like:

{
  "api_key": "keys.your_actual_api_key_here",
  "retailer_id": "heb",
  "postal_code": "78610",
  "country_code": "US"
}

════════════════════════════════════════════════════════════════
`);

// Save application data to file for reference
const fs = require('fs');
const path = require('path');

const outputPath = path.join(process.cwd(), 'docs/instacart-api-application.json');
fs.writeFileSync(outputPath, JSON.stringify(applicationData, null, 2));
console.log(`Application data saved to: ${outputPath}`);
console.log('');
console.log('🚀 Ready to apply! Visit the URL above to submit your application.');
