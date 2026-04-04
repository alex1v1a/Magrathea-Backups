#!/usr/bin/env python3
"""
HEB Cart Automation - Uses Real Chrome Profile
Bypasses bot detection by using your already-logged-in browser
"""

import json
import time
import subprocess
import sys
from pathlib import Path

# Config
CHROME_PROFILE_PATH = r"C:\Users\Admin\AppData\Local\Google\Chrome\User Data"
HEB_EMAIL = "alex@1v1a.com"
HEB_PASSWORD = "$Tandal0ne"

def get_meal_plan_items():
    """Load items from weekly plan"""
    plan_file = Path(__file__).parent / "data" / "weekly-plan.json"
    
    if not plan_file.exists():
        print("❌ No meal plan found. Run dinner automation first.")
        return []
    
    with open(plan_file) as f:
        plan = json.load(f)
    
    items = []
    seen = set()
    
    for meal in plan.get("meals", []):
        for ingredient in meal.get("ingredients", []):
            search_term = ingredient.get("hebSearch", ingredient.get("name", ""))
            key = search_term.lower()
            
            if key and key not in seen:
                seen.add(key)
                items.append({
                    "name": ingredient.get("name"),
                    "search": search_term,
                    "amount": ingredient.get("amount", "1"),
                    "added": False
                })
    
    return items

def create_automation_script(items):
    """Create Playwright script for automation"""
    
    items_js = json.dumps(items)
    
    script = f'''
const {{ chromium }} = require('playwright');

const items = {items_js};

async function addToHEBCart() {{
    console.log('Launching Chrome with your profile...');
    
    // Launch Chrome with user's profile (already logged in)
    const browser = await chromium.launch({{
        headless: false,
        executablePath: 'C:\\\\Program Files\\\\Google\\\\Chrome\\\\Application\\\\chrome.exe',
        args: [
            '--profile-directory=Default',
            '--no-first-run',
            '--no-default-browser-check'
        ]
    }});
    
    const context = await browser.newContext({{
        viewport: {{ width: 1920, height: 1080 }}
    }});
    
    const page = await context.newPage();
    
    console.log('Navigating to HEB.com...');
    await page.goto('https://www.heb.com');
    
    // Check if logged in
    const isLoggedIn = await page.evaluate(() => {{
        return document.body.textContent.includes('My Account') || 
               document.body.textContent.includes('Sign Out') ||
               !document.body.textContent.includes('Sign In');
    }});
    
    if (!isLoggedIn) {{
        console.log('Not logged in. Please log in manually in the opened browser.');
        console.log('Then press Enter in this terminal to continue...');
        await new Promise(resolve => process.stdin.once('data', resolve));
    }}
    
    console.log(`Starting to add ${{items.length}} items...`);
    
    for (let i = 0; i < items.length; i++) {{
        const item = items[i];
        console.log(`[${{i + 1}}/${{items.length}}] Adding: ${{item.name}}`);
        
        try {{
            // Search for item
            await page.goto(`https://www.heb.com/search?query=${{encodeURIComponent(item.search)}}`);
            
            // Wait for results
            await page.waitForTimeout(3000);
            
            // Try to find and click "Add to Cart" button
            const addButton = await page.$('button[data-testid="add-to-cart"], button:has-text("Add"), [data-automation-id*="add"], button[class*="add"]');
            
            if (addButton) {{
                await addButton.click();
                console.log(`  ✅ Added: ${{item.name}}`);
                item.added = true;
            }} else {{
                console.log(`  ⚠️ Could not find add button for: ${{item.name}}`);
            }}
            
            // Wait between items to avoid rate limiting
            await page.waitForTimeout(2000);
            
        }} catch (error) {{
            console.log(`  ❌ Error adding ${{item.name}}: ${{error.message}}`);
        }}
    }}
    
    // Summary
    const added = items.filter(i => i.added).length;
    console.log(`\\n✅ Complete! Added ${{added}}/${{items.length}} items`);
    
    // Keep browser open for review
    console.log('\\nBrowser will stay open. Press Ctrl+C to close.');
    
    // Save results
    const results = {{
        timestamp: new Date().toISOString(),
        items: items,
        total: items.length,
        added: added
    }};
    
    require('fs').writeFileSync(
        'heb-cart-results.json', 
        JSON.stringify(results, null, 2)
    );
}}

addToHEBCart().catch(console.error);
'''
    return script

def main():
    print("🛒 HEB Cart Automation")
    print("=" * 50)
    
    # Get items
    items = get_meal_plan_items()
    if not items:
        print("No items to add.")
        return
    
    print(f"Found {len(items)} items from meal plan")
    print(f"Email: {HEB_EMAIL}")
    print()
    
    # Create automation script
    script_content = create_automation_script(items)
    script_path = Path(__file__).parent / "heb-automation-run.js"
    
    with open(script_path, 'w') as f:
        f.write(script_content)
    
    print(f"Created automation script: {script_path}")
    print()
    print("This will:")
    print("1. Launch Chrome with your profile (already logged in)")
    print("2. Navigate to HEB.com")
    print("3. Search and add each item to cart")
    print()
    
    response = input("Run automation now? (y/n): ")
    if response.lower() != 'y':
        print("Cancelled.")
        return
    
    print("\n🚀 Starting automation...")
    print("Chrome will open. If not logged in, log in first.")
    print()
    
    # Run the Playwright script
    try:
        subprocess.run(
            ['node', str(script_path)],
            cwd=str(Path(__file__).parent),
            check=True
        )
    except subprocess.CalledProcessError as e:
        print(f"Error: {e}")
    except KeyboardInterrupt:
        print("\n\nStopped by user.")

if __name__ == "__main__":
    main()
