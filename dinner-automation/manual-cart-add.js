const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

// Load credentials
require('dotenv').config({ path: './dinner-automation/.env' });

const HEB_EMAIL = process.env.HEB_EMAIL || 'alex@1v1a.com';
const HEB_PASSWORD = process.env.HEB_PASSWORD;

// Items to add
const items = JSON.parse(fs.readFileSync('./data/heb-cart-pending.json', 'utf8')).items;

async function addItemsToCart() {
    console.log('Launching Chrome with user profile...');
    
    const userDataDir = 'C:\\Users\\Admin\\AppData\\Local\\Google\\Chrome\\User Data';
    
    const context = await chromium.launchPersistentContext(userDataDir, {
        headless: false,
        executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        args: [
            '--profile-directory=Default',
            '--no-first-run',
            '--no-default-browser-check'
        ]
    });
    
    const page = await context.newPage();
    
    console.log('Navigating to HEB cart...');
    await page.goto('https://www.heb.com/cart', { waitUntil: 'networkidle', timeout: 60000 });
    
    // Check if we're logged in
    const pageTitle = await page.title();
    const pageContent = await page.content();
    
    console.log('Page title:', pageTitle);
    
    if (pageContent.includes('login') || pageContent.includes('Log in') || pageContent.includes('Sign in')) {
        console.log('Need to log in. Please log in manually in the browser window.');
        console.log('Then press Enter here to continue...');
        
        // Wait for user input
        process.stdin.once('data', async () => {
            await startAddingItems(page, items, context);
        });
    } else {
        console.log('Already logged in!');
        await startAddingItems(page, items, browser);
    }
}

async function startAddingItems(page, items, context) {
    console.log(`Adding ${items.length} items to cart...`);
    
    const results = {
        added: [],
        failed: [],
        timestamp: new Date().toISOString()
    };
    
    for (let i = 0; i < items.length; i++) {
        const item = items[i];
        console.log(`\n[${i + 1}/${items.length}] Adding: ${item.name} (search: ${item.hebSearch})`);
        
        try {
            // Search for item
            const searchUrl = `https://www.heb.com/search?query=${encodeURIComponent(item.hebSearch)}`;
            await page.goto(searchUrl, { waitUntil: 'networkidle', timeout: 30000 });
            
            // Wait for results
            await page.waitForTimeout(3000);
            
            // Try to find and click "Add to Cart" button
            const addButton = await page.$('button[data-testid="add-to-cart"], button:has-text("Add to cart"), button:has-text("Add")');
            
            if (addButton) {
                await addButton.click();
                await page.waitForTimeout(2000);
                console.log(`  ✅ Added: ${item.name}`);
                results.added.push(item.name);
            } else {
                console.log(`  ⚠️ Could not find add button for: ${item.name}`);
                results.failed.push({ item: item.name, reason: 'No add button found' });
            }
            
        } catch (error) {
            console.log(`  ❌ Error adding ${item.name}: ${error.message}`);
            results.failed.push({ item: item.name, reason: error.message });
        }
        
        // Wait between items
        await page.waitForTimeout(2000);
    }
    
    // Save results
    fs.writeFileSync('./data/heb-cart-results.json', JSON.stringify(results, null, 2));
    
    console.log('\n========================================');
    console.log(`✅ COMPLETED: Added ${results.added.length}/${items.length} items`);
    console.log(`❌ Failed: ${results.failed.length} items`);
    console.log('========================================');
    
    // Take screenshot of cart
    await page.goto('https://www.heb.com/cart', { waitUntil: 'networkidle' });
    await page.screenshot({ path: './data/heb-cart-screenshot.png', fullPage: true });
    console.log('Cart screenshot saved to: heb-cart-screenshot.png');
    
    console.log('\nBrowser will stay open. Press Ctrl+C to close.');
}

addItemsToCart().catch(err => {
    console.error('Error:', err);
    process.exit(1);
});
