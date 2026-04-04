/**
 * Facebook Marketplace Automation Example
 * Demonstrates search and browsing functionality
 */

require('dotenv').config();
const { FacebookAutomation } = require('../index');

async function main() {
  console.log('========================================');
  console.log('  Facebook Marketplace Example');
  console.log('========================================\n');
  
  const fb = new FacebookAutomation({
    profile: 'facebook-example',
    headless: false,  // Set to true for headless mode
    slowMo: 150
  });
  
  try {
    // Initialize
    console.log('Initializing Facebook automation...');
    await fb.initialize();
    
    // Optional: Set credentials if not already saved
    // fb.credentials.setCredentials('facebook', 'your@email.com', 'yourpassword');
    
    // Search Marketplace
    console.log('\nSearching Marketplace for "vintage furniture"...');
    const listings = await fb.searchMarketplace('vintage furniture');
    
    console.log(`\nFound ${listings.length} listings`);
    listings.slice(0, 5).forEach((item, i) => {
      console.log(`  ${i + 1}. ${item.title}`);
      console.log(`     Price: ${item.price || 'Not specified'}`);
      console.log(`     Location: ${item.location || 'Not specified'}`);
      console.log('');
    });
    
    // Apply price filter
    console.log('Applying price filter ($50-$200)...');
    const filtered = await fb.setPriceFilter(50, 200);
    console.log(`  ${filtered.listingsCount} listings in price range`);
    
    // View first listing
    if (listings.length > 0) {
      console.log('\nViewing first listing...');
      const details = await fb.viewListing(listings[0].url);
      console.log('  Title:', details.title || 'N/A');
      console.log('  Price:', details.price || 'N/A');
      console.log('  Seller:', details.seller || 'N/A');
      
      // Get seller info
      const sellerInfo = await fb.getSellerInfo();
      console.log('  Seller Rating:', sellerInfo.rating || 'N/A');
    }
    
    // Browse a category
    console.log('\nBrowsing Electronics category...');
    const category = await fb.browseCategory('electronics');
    console.log(`  Found ${category.listingsCount} items in Electronics`);
    
    // Load more listings
    console.log('\nLoading more listings...');
    const more = await fb.loadMoreListings(2);
    console.log(`  Total listings now: ${more.totalListings}`);
    
    // Take screenshot
    const screenshot = await fb.screenshot('marketplace-results');
    console.log(`\nScreenshot saved: ${screenshot}`);
    
    console.log('\n✓ Example completed successfully!');
    
  } catch (error) {
    console.error('\n✗ Error:', error.message);
    await fb.screenshot('error');
  } finally {
    await fb.shutdown();
    console.log('\nBrowser closed.');
  }
}

main();
