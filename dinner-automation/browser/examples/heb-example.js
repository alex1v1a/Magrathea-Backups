/**
 * HEB Automation Example
 * Demonstrates cart building and search functionality
 */

require('dotenv').config();
const { HEBAutomation } = require('../index');

async function main() {
  console.log('========================================');
  console.log('  HEB Automation Example');
  console.log('========================================\n');
  
  const heb = new HEBAutomation({
    profile: 'heb-example',
    headless: false,  // Set to true for headless mode
    slowMo: 100
  });
  
  try {
    // Initialize
    console.log('Initializing HEB automation...');
    await heb.initialize();
    
    // Optional: Set credentials if not already saved
    // heb.credentials.setCredentials('heb', 'your@email.com', 'yourpassword');
    
    // Search for a product
    console.log('\nSearching for "organic milk"...');
    const products = await heb.searchProduct('organic milk');
    console.log(`Found ${products.length} products:`);
    products.slice(0, 3).forEach((p, i) => {
      console.log(`  ${i + 1}. ${p.name} - ${p.price || 'Price not shown'}`);
    });
    
    // Build a cart with multiple items
    console.log('\nBuilding cart with items...');
    const cartItems = [
      { name: 'whole milk 1 gallon', quantity: 1 },
      { name: 'sourdough bread', quantity: 2 },
      { name: 'organic eggs dozen', quantity: 1 }
    ];
    
    const results = await heb.buildCart(cartItems);
    
    console.log('\nCart Results:');
    results.results.forEach((result, i) => {
      const status = result.success ? '✓' : '✗';
      console.log(`  ${status} ${result.item.name} (qty: ${result.item.quantity})`);
    });
    
    // View final cart
    console.log('\nFinal cart contents:');
    const cart = await heb.viewCart();
    console.log(`  Items: ${cart.count}`);
    console.log(`  Total: ${cart.total || 'N/A'}`);
    
    // Take final screenshot
    const screenshot = await heb.screenshot('final-cart');
    console.log(`\nScreenshot saved: ${screenshot}`);
    
    console.log('\n✓ Example completed successfully!');
    
  } catch (error) {
    console.error('\n✗ Error:', error.message);
    await heb.screenshot('error');
  } finally {
    await heb.shutdown();
    console.log('\nBrowser closed.');
  }
}

main();
