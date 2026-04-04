/**
 * HEB Shopping List Generator
 * Creates a shareable HTML shopping list with direct HEB product search links
 * Bypasses bot detection by using HEB's own search URLs
 * 
 * Usage:
 *   node heb-list-generator.js [weekly-plan.json]
 * 
 * Output:
 *   - HTML shopping list (heb-shopping-list-YYYY-MM-DD.html)
 *   - Markdown list for email (heb-shopping-list-YYYY-MM-DD.md)
 *   - JSON data for automation (heb-shopping-data-YYYY-MM-DD.json)
 */

const fs = require('fs').promises;
const path = require('path');

const HEB_BASE_URL = 'https://www.heb.com';

class HEBListGenerator {
  constructor() {
    this.weeklyPlan = null;
    this.shoppingList = null;
  }

  /**
   * Load weekly meal plan
   */
  async loadWeeklyPlan(filePath) {
    console.log('📋 Loading weekly meal plan...');
    const data = await fs.readFile(filePath, 'utf-8');
    this.weeklyPlan = JSON.parse(data);
    console.log(`✓ Loaded plan for week of ${this.weeklyPlan.weekOf}`);
    return this.weeklyPlan;
  }

  /**
   * Generate organized shopping list from meal plan
   */
  generateShoppingList() {
    console.log('\n🛒 Generating shopping list...');
    
    const items = [];
    const byCategory = {};
    const byMeal = {};

    // Process each meal
    for (const meal of this.weeklyPlan.meals) {
      byMeal[meal.day] = {
        name: meal.name,
        category: meal.category,
        difficulty: meal.difficulty,
        prepTime: meal.prepTime,
        ingredients: []
      };

      for (const ingredient of meal.ingredients) {
        const item = {
          id: `item-${items.length}`,
          name: ingredient.name,
          searchTerm: ingredient.hebSearch,
          amount: ingredient.amount,
          meal: meal.name,
          day: meal.day,
          category: this.categorizeIngredient(ingredient.hebSearch),
          hebUrl: this.generateHEBSearchUrl(ingredient.hebSearch),
          estimatedPrice: this.getEstimatedPrice(ingredient.hebSearch)
        };

        items.push(item);
        byMeal[meal.day].ingredients.push(item);

        // Group by category
        if (!byCategory[item.category]) {
          byCategory[item.category] = [];
        }
        byCategory[item.category].push(item);
      }
    }

    this.shoppingList = {
      metadata: {
        generatedAt: new Date().toISOString(),
        weekOf: this.weeklyPlan.weekOf,
        store: 'HEB.com',
        totalItems: items.length,
        estimatedTotal: items.reduce((sum, item) => sum + item.estimatedPrice, 0)
      },
      items,
      byCategory,
      byMeal,
      budget: this.weeklyPlan.budget
    };

    console.log(`✓ Generated list with ${items.length} items`);
    return this.shoppingList;
  }

  /**
   * Categorize ingredient for better shopping organization
   */
  categorizeIngredient(searchTerm) {
    const term = searchTerm.toLowerCase();
    
    // Proteins
    if (/chicken|beef|pork|fish|salmon|tilapia|cod|steak|shrimp|meat|turkey|lamb/.test(term)) {
      return 'Proteins & Meat';
    }
    // Seafood
    if (/salmon|tilapia|cod|shrimp|fish|seafood/.test(term)) {
      return 'Seafood';
    }
    // Produce
    if (/mango|onion|jalapeno|lemon|zucchini|cucumber|tomato|pear|beans|parsley|thyme|garlic|cilantro|asparagus|broccoli|spinach|lettuce|cabbage|avocado|lime|potato/.test(term)) {
      return 'Produce';
    }
    // Dairy
    if (/butter|cheese|yogurt|cream|milk|feta|parmesan/.test(term)) {
      return 'Dairy & Eggs';
    }
    // Pantry
    if (/tortillas|rice|couscous|quinoa|pasta|sauce|oil|vinegar|sesame|capers|gochujang|kimchi|hummus|mayo/.test(term)) {
      return 'Pantry & Dry Goods';
    }
    // Beverages
    if (/wine|beer|water|juice|soda/.test(term)) {
      return 'Beverages';
    }
    // Herbs & Spices
    if (/oregano|thyme|parsley|cilantro|basil|spice|seasoning/.test(term)) {
      return 'Herbs & Spices';
    }
    // Bakery
    if (/bread|bun|roll|tortilla|naan|pita/.test(term)) {
      return 'Bakery';
    }
    
    return 'Other';
  }

  /**
   * Generate HEB search URL for an ingredient
   */
  generateHEBSearchUrl(searchTerm) {
    const encoded = encodeURIComponent(searchTerm);
    return `${HEB_BASE_URL}/search?q=${encoded}`;
  }

  /**
   * Get estimated price for an ingredient
   */
  getEstimatedPrice(searchTerm) {
    const priceDatabase = {
      // Seafood
      'tilapia fillet': 7.99,
      'cod fillet fresh': 12.99,
      'shrimp large raw': 14.99,
      'salmon fillet fresh': 15.99,
      
      // Proteins
      'chicken thighs bone-in': 2.49,
      'chicken breast boneless': 4.99,
      'ribeye steak thin': 14.99,
      'flank steak': 12.99,
      'pork tenderloin': 5.99,
      'ground beef': 5.99,
      
      // Produce
      'mango': 1.25,
      'red onion': 0.89,
      'jalapeno': 0.15,
      'lemon': 0.50,
      'zucchini': 1.29,
      'cucumber': 0.79,
      'tomatoes cherry': 3.49,
      'asian pear': 2.49,
      'green beans fresh': 2.99,
      'avocado': 1.29,
      'lime': 0.33,
      'broccoli': 2.49,
      'asparagus': 3.99,
      'brussels sprouts': 3.49,
      'sweet potatoes': 1.29,
      'spinach fresh': 3.49,
      
      // Herbs
      'parsley fresh': 1.99,
      'thyme fresh': 2.49,
      'oregano dried': 3.99,
      'rosemary fresh': 2.49,
      'cilantro fresh': 1.99,
      'garlic': 0.99,
      'ginger': 1.99,
      
      // Pantry
      'corn tortillas': 2.99,
      'coleslaw mix': 2.49,
      'chipotle mayo': 3.99,
      'capers': 3.49,
      'white wine cooking': 4.99,
      'couscous': 3.99,
      'gochujang': 5.99,
      'jasmine rice': 4.99,
      'sesame seeds': 3.99,
      'kimchi': 6.99,
      'feta cheese': 5.99,
      'quinoa': 6.99,
      'hummus': 3.99,
      'basmati rice': 5.99,
      'pasta': 1.99,
      'olive oil extra virgin': 8.99,
      'soy sauce low sodium': 3.49,
      'sesame oil': 5.99,
      'tortillas flour': 3.49,
      
      // Dairy
      'butter unsalted': 4.99,
      'heavy cream': 4.99,
      'greek yogurt plain': 4.99,
      'parmesan cheese': 5.99,
      'eggs': 4.99,
      
      // Default
      'default': 4.99
    };

    return priceDatabase[searchTerm.toLowerCase()] || priceDatabase['default'];
  }

  /**
   * Generate HTML shopping list with clickable links
   */
  generateHTML() {
    const { metadata, byCategory, byMeal, budget } = this.shoppingList;
    
    const categoryOrder = [
      'Produce',
      'Proteins & Meat',
      'Seafood',
      'Dairy & Eggs',
      'Pantry & Dry Goods',
      'Bakery',
      'Herbs & Spices',
      'Beverages',
      'Other'
    ];

    let html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>HEB Shopping List - Week of ${metadata.weekOf}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
      background: #f5f5f5;
      color: #333;
      line-height: 1.6;
      padding: 20px;
    }
    .container {
      max-width: 800px;
      margin: 0 auto;
      background: white;
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      overflow: hidden;
    }
    .header {
      background: linear-gradient(135deg, #d32f2f 0%, #b71c1c 100%);
      color: white;
      padding: 30px;
      text-align: center;
    }
    .header h1 { font-size: 28px; margin-bottom: 8px; }
    .header .subtitle { opacity: 0.9; font-size: 16px; }
    .budget-bar {
      background: #fff3e0;
      padding: 15px 30px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid #e0e0e0;
    }
    .budget-item { text-align: center; }
    .budget-item .label { font-size: 12px; color: #666; text-transform: uppercase; }
    .budget-item .value { font-size: 20px; font-weight: bold; color: #d32f2f; }
    .budget-item .value.success { color: #2e7d32; }
    .content { padding: 20px; }
    .category {
      margin-bottom: 30px;
      background: #fafafa;
      border-radius: 8px;
      overflow: hidden;
    }
    .category-header {
      background: #e3f2fd;
      padding: 12px 20px;
      font-weight: 600;
      color: #1565c0;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .category-header .count {
      background: #1565c0;
      color: white;
      padding: 2px 10px;
      border-radius: 12px;
      font-size: 12px;
    }
    .item-list { padding: 10px 20px; }
    .item {
      display: flex;
      align-items: center;
      padding: 12px 0;
      border-bottom: 1px solid #e0e0e0;
    }
    .item:last-child { border-bottom: none; }
    .item-checkbox {
      width: 24px;
      height: 24px;
      margin-right: 15px;
      cursor: pointer;
      accent-color: #d32f2f;
    }
    .item-content { flex: 1; }
    .item-name {
      font-weight: 500;
      margin-bottom: 4px;
    }
    .item-details {
      font-size: 13px;
      color: #666;
    }
    .item-amount {
      background: #e8f5e9;
      color: #2e7d32;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 12px;
      margin-right: 8px;
    }
    .item-meal {
      color: #888;
    }
    .item-actions {
      display: flex;
      gap: 10px;
      align-items: center;
    }
    .item-price {
      font-weight: 600;
      color: #d32f2f;
      font-size: 14px;
    }
    .heb-link {
      background: #d32f2f;
      color: white;
      text-decoration: none;
      padding: 6px 14px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 500;
      transition: background 0.2s;
    }
    .heb-link:hover { background: #b71c1c; }
    .meal-section {
      margin-top: 30px;
      padding-top: 30px;
      border-top: 2px solid #e0e0e0;
    }
    .meal-section h2 {
      color: #d32f2f;
      margin-bottom: 20px;
      font-size: 22px;
    }
    .meal-card {
      background: #fff8e1;
      border-radius: 8px;
      padding: 15px 20px;
      margin-bottom: 15px;
    }
    .meal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 10px;
    }
    .meal-name {
      font-weight: 600;
      font-size: 16px;
      color: #e65100;
    }
    .meal-meta {
      font-size: 12px;
      color: #888;
    }
    .meal-ingredients {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
    .meal-ingredient {
      background: white;
      padding: 4px 10px;
      border-radius: 12px;
      font-size: 12px;
      color: #555;
    }
    .footer {
      background: #f5f5f5;
      padding: 20px;
      text-align: center;
      color: #666;
      font-size: 13px;
    }
    .quick-actions {
      position: sticky;
      bottom: 0;
      background: white;
      padding: 15px;
      border-top: 1px solid #e0e0e0;
      display: flex;
      gap: 10px;
      justify-content: center;
    }
    .btn {
      padding: 10px 20px;
      border-radius: 8px;
      border: none;
      cursor: pointer;
      font-weight: 500;
      font-size: 14px;
      transition: all 0.2s;
    }
    .btn-primary {
      background: #d32f2f;
      color: white;
    }
    .btn-primary:hover { background: #b71c1c; }
    .btn-secondary {
      background: #e0e0e0;
      color: #333;
    }
    .btn-secondary:hover { background: #d0d0d0; }
    @media print {
      .heb-link, .quick-actions { display: none; }
      .item { break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🛒 HEB Shopping List</h1>
      <div class="subtitle">Week of ${metadata.weekOf} | ${metadata.totalItems} items</div>
    </div>
    
    <div class="budget-bar">
      <div class="budget-item">
        <div class="label">Budget</div>
        <div class="value">$${budget.allocated}</div>
      </div>
      <div class="budget-item">
        <div class="label">Estimated</div>
        <div class="value">$${metadata.estimatedTotal.toFixed(2)}</div>
      </div>
      <div class="budget-item">
        <div class="label">Remaining</div>
        <div class="value ${budget.allocated - metadata.estimatedTotal >= 0 ? 'success' : ''}">
          $${(budget.allocated - metadata.estimatedTotal).toFixed(2)}
        </div>
      </div>
    </div>

    <div class="content">
      <h2 style="margin-bottom: 20px; color: #333;">Shop by Category</h2>
      <p style="margin-bottom: 20px; color: #666; font-size: 14px;">
        Click the "View on HEB" button to search for each item. Check the box when added to your cart.
      </p>
`;

    // Add items by category
    for (const category of categoryOrder) {
      const items = byCategory[category];
      if (!items || items.length === 0) continue;

      html += `
      <div class="category">
        <div class="category-header">
          <span>${category}</span>
          <span class="count">${items.length}</span>
        </div>
        <div class="item-list">
`;

      for (const item of items) {
        html += `
          <div class="item">
            <input type="checkbox" class="item-checkbox" id="${item.id}">
            <div class="item-content">
              <div class="item-name">${item.name}</div>
              <div class="item-details">
                <span class="item-amount">${item.amount}</span>
                <span class="item-meal">for ${item.meal}</span>
              </div>
            </div>
            <div class="item-actions">
              <span class="item-price">~$${item.estimatedPrice.toFixed(2)}</span>
              <a href="${item.hebUrl}" target="_blank" class="heb-link">View on HEB →</a>
            </div>
          </div>
`;
      }

      html += `
        </div>
      </div>
`;
    }

    // Add meal breakdown section
    html += `
      <div class="meal-section">
        <h2>🍽️ Meals This Week</h2>
`;

    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    for (const day of days) {
      const meal = byMeal[day];
      if (!meal) continue;

      html += `
        <div class="meal-card">
          <div class="meal-header">
            <div>
              <span class="meal-name">${day}: ${meal.name}</span>
            </div>
            <span class="meal-meta">${meal.prepTime} | ${meal.difficulty}</span>
          </div>
          <div class="meal-ingredients">
${meal.ingredients.map(ing => `<span class="meal-ingredient">${ing.name}</span>`).join('\n            ')}
          </div>
        </div>
`;
    }

    html += `
      </div>
    </div>

    <div class="quick-actions">
      <button class="btn btn-secondary" onclick="window.print()">🖨️ Print List</button>
      <button class="btn btn-primary" onclick="openAllHEB()">🔗 Open All Items on HEB</button>
    </div>

    <div class="footer">
      <p>Generated on ${new Date(metadata.generatedAt).toLocaleString()}</p>
      <p style="margin-top: 5px; color: #999;">Prices are estimates. Actual prices may vary.</p>
    </div>
  </div>

  <script>
    // Save checkbox state to localStorage
    document.querySelectorAll('.item-checkbox').forEach(checkbox => {
      checkbox.addEventListener('change', function() {
        localStorage.setItem(this.id, this.checked);
      });
      // Restore state
      const saved = localStorage.getItem(checkbox.id);
      if (saved === 'true') checkbox.checked = true;
    });

    // Open all HEB links (with confirmation)
    function openAllHEB() {
      if (confirm('This will open ${metadata.totalItems} tabs. Continue?')) {
        const links = document.querySelectorAll('.heb-link');
        links.forEach((link, i) => {
          setTimeout(() => window.open(link.href, '_blank'), i * 500);
        });
      }
    }
  </script>
</body>
</html>`;

    return html;
  }

  /**
   * Generate Markdown version for email
   */
  generateMarkdown() {
    const { metadata, byCategory, budget } = this.shoppingList;
    
    let md = `# 🛒 HEB Shopping List - Week of ${metadata.weekOf}\n\n`;
    
    md += `## 💰 Budget Summary\n\n`;
    md += `- **Budget Allocated:** $${budget.allocated}\n`;
    md += `- **Estimated Total:** $${metadata.estimatedTotal.toFixed(2)}\n`;
    md += `- **Remaining:** $${(budget.allocated - metadata.estimatedTotal).toFixed(2)}\n`;
    md += `- **Items:** ${metadata.totalItems}\n\n`;
    
    md += `---\n\n`;
    md += `## 📝 Shopping List by Category\n\n`;
    
    const categoryOrder = [
      'Produce', 'Proteins & Meat', 'Seafood', 'Dairy & Eggs',
      'Pantry & Dry Goods', 'Bakery', 'Herbs & Spices', 'Beverages', 'Other'
    ];

    for (const category of categoryOrder) {
      const items = byCategory[category];
      if (!items || items.length === 0) continue;
      
      md += `### ${category}\n\n`;
      for (const item of items) {
        md += `- [ ] **${item.name}** (${item.amount}) - ~$${item.estimatedPrice.toFixed(2)}\n`;
        md += `  - For: ${item.meal}\n`;
        md += `  - [Search on HEB](${item.hebUrl})\n\n`;
      }
    }
    
    md += `---\n\n`;
    md += `## 🍽️ Meal Plan\n\n`;
    
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    for (const day of days) {
      const meal = this.shoppingList.byMeal[day];
      if (!meal) continue;
      
      md += `### ${day}: ${meal.name}\n`;
      md += `- Difficulty: ${meal.difficulty}\n`;
      md += `- Prep Time: ${meal.prepTime}\n`;
      md += `- Ingredients: ${meal.ingredients.map(i => i.name).join(', ')}\n\n`;
    }
    
    md += `---\n\n`;
    md += `*Generated on ${new Date(metadata.generatedAt).toLocaleString()}*\n`;
    
    return md;
  }

  /**
   * Save all output files
   */
  async saveOutputs(outputDir) {
    const date = this.weeklyPlan.weekOf;
    
    // Ensure output directory exists
    await fs.mkdir(outputDir, { recursive: true });
    
    // Save HTML
    const htmlPath = path.join(outputDir, `heb-shopping-list-${date}.html`);
    const html = this.generateHTML();
    await fs.writeFile(htmlPath, html);
    console.log(`✓ HTML list saved: ${htmlPath}`);
    
    // Save Markdown
    const mdPath = path.join(outputDir, `heb-shopping-list-${date}.md`);
    const md = this.generateMarkdown();
    await fs.writeFile(mdPath, md);
    console.log(`✓ Markdown list saved: ${mdPath}`);
    
    // Save JSON data
    const jsonPath = path.join(outputDir, `heb-shopping-data-${date}.json`);
    await fs.writeFile(jsonPath, JSON.stringify(this.shoppingList, null, 2));
    console.log(`✓ JSON data saved: ${jsonPath}`);
    
    return {
      html: htmlPath,
      markdown: mdPath,
      json: jsonPath
    };
  }

  /**
   * Main execution
   */
  async run(weeklyPlanPath, outputDir) {
    console.log('=====================================');
    console.log('🛒 HEB Shopping List Generator');
    console.log('=====================================\n');
    
    try {
      // Load plan
      await this.loadWeeklyPlan(weeklyPlanPath);
      
      // Generate list
      this.generateShoppingList();
      
      // Save outputs
      const paths = await this.saveOutputs(outputDir);
      
      console.log('\n=====================================');
      console.log('✅ Shopping list generated successfully!');
      console.log('=====================================');
      console.log(`\n📁 Output files:`);
      console.log(`  HTML: ${paths.html}`);
      console.log(`  Markdown: ${paths.markdown}`);
      console.log(`  JSON: ${paths.json}`);
      console.log(`\n💡 Open the HTML file in your browser to use the interactive list.`);
      console.log(`   Click "View on HEB" buttons to quickly find each item.`);
      
      return {
        success: true,
        paths,
        shoppingList: this.shoppingList
      };
      
    } catch (error) {
      console.error('\n❌ Error:', error.message);
      throw error;
    }
  }
}

// CLI
async function main() {
  const args = process.argv.slice(2);
  const weeklyPlanPath = args[0] || path.join(__dirname, '..', 'data', 'weekly-plan.json');
  const outputDir = path.join(__dirname, '..', 'data');
  
  const generator = new HEBListGenerator();
  await generator.run(weeklyPlanPath, outputDir);
}

module.exports = { HEBListGenerator };

if (require.main === module) {
  main().catch(err => {
    console.error(err);
    process.exit(1);
  });
}
