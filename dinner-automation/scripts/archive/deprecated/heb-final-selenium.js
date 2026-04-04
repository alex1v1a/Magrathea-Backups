const { Builder, By, until } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const fs = require('fs');
const path = require('path');

const ITEMS_TO_ADD = [
  { name: 'Catfish fillet', search: 'catfish fillet' },
  { name: 'Sriracha', search: 'sriracha' },
  { name: 'Bosc pear', search: 'bosc pear' }
];

async function addItem(driver, item) {
  console.log(`\n🔍 Searching: ${item.name}`);
  
  try {
    // Navigate to HEB search
    await driver.get(`https://www.heb.com/search?q=${encodeURIComponent(item.search)}`);
    await driver.sleep(5000);
    
    // Find and click add button
    const addButtons = await driver.findElements(By.xpath("//button[contains(text(), 'Add')]"));
    
    if (addButtons.length > 0) {
      await addButtons[0].click();
      await driver.sleep(3000);
      console.log('   ✅ Added');
      return true;
    } else {
      console.log('   ❌ Add button not found');
      return false;
    }
  } catch (error) {
    console.log(`   ❌ Error: ${error.message.substring(0, 50)}`);
    return false;
  }
}

async function main() {
  console.log('🛒 FINAL ATTEMPT - Selenium with Edge\n');
  console.log('Items to add:');
  ITEMS_TO_ADD.forEach((item, i) => console.log(`  ${i + 1}. ${item.name}`));
  console.log('\n');
  
  // Use Edge with existing profile
  const options = new chrome.Options();
  options.addArguments('--start-maximized');
  options.addArguments('--disable-blink-features=AutomationControlled');
  
  const driver = await new Builder()
    .forBrowser('chrome')
    .setChromeOptions(options)
    .build();
  
  const results = { added: [], failed: [] };
  
  try {
    for (const item of ITEMS_TO_ADD) {
      const success = await addItem(driver, item);
      if (success) results.added.push(item.name);
      else results.failed.push(item.name);
    }
    
    // Check cart
    console.log('\n🛒 Checking cart...');
    await driver.get('https://www.heb.com/cart');
    await driver.sleep(5000);
    
    console.log('\n' + '='.repeat(60));
    console.log('📊 RESULTS');
    console.log('='.repeat(60));
    console.log(`✅ Added: ${results.added.length}/${ITEMS_TO_ADD.length}`);
    results.added.forEach(i => console.log(`   • ${i}`));
    
    if (results.failed.length > 0) {
      console.log(`\n❌ Failed: ${results.failed.length}`);
      results.failed.forEach(i => console.log(`   • ${i}`));
    }
    console.log('='.repeat(60));
    
  } finally {
    await driver.quit();
  }
}

main().catch(console.error);
