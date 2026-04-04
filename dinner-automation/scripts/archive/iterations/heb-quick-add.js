/**
 * HEB Simple Add - Just add items, no login detection
 */

const { chromium } = require('playwright');

const items = [
  { name: 'White fish fillets', searchTerm: 'tilapia fillet' },
  { name: 'Corn tortillas', searchTerm: 'corn tortillas' },
  { name: 'Mango', searchTerm: 'mango' },
  { name: 'Red onion', searchTerm: 'red onion' },
  { name: 'Jalapeno', searchTerm: 'jalapeno' },
  { name: 'Cilantro', searchTerm: 'cilantro' },
  { name: 'Lime', searchTerm: 'lime' },
  { name: 'Avocado', searchTerm: 'avocado' },
  { name: 'Chicken thighs', searchTerm: 'chicken thighs' },
  { name: 'Coconut milk', searchTerm: 'coconut milk' },
  { name: 'Thai curry paste', searchTerm: 'thai curry paste' },
  { name: 'Bell peppers', searchTerm: 'bell peppers' },
  { name: 'Snow peas', searchTerm: 'snow peas' },
  { name: 'Rice', searchTerm: 'jasmine rice' },
  { name: 'Ground beef', searchTerm: 'ground beef' },
  { name: 'Tomato sauce', searchTerm: 'tomato sauce' },
  { name: 'Pasta', searchTerm: 'spaghetti' },
  { name: 'Parmesan cheese', searchTerm: 'parmesan cheese' },
  { name: 'Salmon fillet', searchTerm: 'salmon fillet' },
  { name: 'Asparagus', searchTerm: 'asparagus' },
  { name: 'Lemon', searchTerm: 'lemon' },
  { name: 'Dill', searchTerm: 'fresh dill' },
  { name: 'Gochujang', searchTerm: 'gochujang' },
  { name: 'Jasmine rice', searchTerm: 'jasmine rice' },
  { name: 'Sesame seeds', searchTerm: 'sesame seeds' }
];

async function addItems() {
  console.log('🛒 HEB Quick Add\n');
  
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  console.log('Opening HEB...');
  await page.goto('https://www.heb.com');
  
  console.log('\n⚠️  PLEASE LOGIN TO HEB NOW');
  console.log('Press Enter when logged in...\n');
  
  await new Promise(resolve => process.stdin.once('data', resolve));
  
  const results = { added: [], failed: [] };
  
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    console.log(`[${i+1}/${items.length}] ${item.name}...`);
    
    try {
      // Search
      await page.goto(`https://www.heb.com/search?q=${encodeURIComponent(item.searchTerm)}`);
      await page.waitForTimeout(3000);
      
      // Try to click add button
      const button = await page.locator('button[data-testid*="add-to-cart"]').first();
      if (await button.count() > 0) {
        await button.scrollIntoViewIfNeeded();
        await button.click({ force: true });
        await button.evaluate(el => el.style.outline = '4px solid lime');
        console.log('  ✅ Added!');
        results.added.push(item.name);
      } else {
        throw new Error('No button found');
      }
      
      await page.waitForTimeout(2000);
      
    } catch (err) {
      console.log(`  ❌ Failed: ${err.message}`);
      results.failed.push(item.name);
    }
  }
  
  console.log('\n✅ Done!');
  console.log(`Added: ${results.added.length}/${items.length}`);
  
  await browser.close();
}

addItems();
