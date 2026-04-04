/**
 * HEB Integration Module for Dinner Automation
 * 
 * This module provides a working alternative to browser automation
 * which is blocked by HEB.com's bot detection (Incapsula).
 * 
 * Instead, it generates:
 * 1. Interactive HTML shopping lists with direct HEB search links
 * 2. Markdown lists for email distribution
 * 3. JSON data for further automation
 * 
 * The user can then click through the HTML list to quickly add items
 * to their HEB cart manually, or use the list for in-store shopping.
 */

const fs = require('fs').promises;
const path = require('path');
const { HEBListGenerator } = require('./heb-list-generator');

class HEBIntegration {
  constructor(options = {}) {
    this.dataDir = options.dataDir || path.join(__dirname, '..', 'data');
    this.outputDir = options.outputDir || path.join(__dirname, '..', 'data');
    this.generator = new HEBListGenerator();
  }

  /**
   * Generate complete HEB shopping package from weekly plan
   * @param {string} weeklyPlanPath - Path to weekly plan JSON
   * @returns {Promise<Object>} Generated files and metadata
   */
  async generateShoppingPackage(weeklyPlanPath) {
    console.log('\n📦 Generating HEB Shopping Package...\n');
    
    // Generate all list formats
    const result = await this.generator.run(weeklyPlanPath, this.outputDir);
    
    // Create a summary with file URLs/paths
    const weeklyPlan = JSON.parse(await fs.readFile(weeklyPlanPath, 'utf-8'));
    const date = weeklyPlan.weekOf;
    
    const packageSummary = {
      metadata: {
        generatedAt: new Date().toISOString(),
        weekOf: date,
        method: 'heb-list-generator',
        note: 'Browser automation blocked by Incapsula. Using shareable list workaround.'
      },
      files: {
        html: {
          path: result.paths.html,
          filename: `heb-shopping-list-${date}.html`,
          description: 'Interactive HTML list with clickable HEB links',
          useCase: 'Open in browser to shop online or print for store'
        },
        markdown: {
          path: result.paths.markdown,
          filename: `heb-shopping-list-${date}.md`,
          description: 'Markdown format for email or documentation',
          useCase: 'Include in emails or Discord messages'
        },
        json: {
          path: result.paths.json,
          filename: `heb-shopping-data-${date}.json`,
          description: 'Structured data for automation',
          useCase: 'Feed into other tools or scripts'
        }
      },
      shoppingList: result.shoppingList,
      quickLinks: this.generateQuickLinks(result.shoppingList),
      instructions: this.generateInstructions()
    };
    
    // Save package summary
    const summaryPath = path.join(this.outputDir, `heb-package-${date}.json`);
    await fs.writeFile(summaryPath, JSON.stringify(packageSummary, null, 2));
    
    console.log(`\n📋 Package summary saved: ${summaryPath}`);
    
    return packageSummary;
  }

  /**
   * Generate quick access links for common actions
   */
  generateQuickLinks(shoppingList) {
    const items = shoppingList.items;
    
    // Top 5 most expensive items (prioritize adding these first)
    const topItems = [...items]
      .sort((a, b) => b.estimatedPrice - a.estimatedPrice)
      .slice(0, 5);
    
    // Generate HEB cart URL (note: HEB doesn't have true shareable cart URLs,
    // but we can link to their shop page)
    return {
      hebShopUrl: 'https://www.heb.com/shop/categories',
      hebCartUrl: 'https://www.heb.com/cart',
      hebCurbsideUrl: 'https://www.heb.com/shop/curbside',
      topPriorityItems: topItems.map(item => ({
        name: item.name,
        searchUrl: item.hebUrl,
        estimatedPrice: item.estimatedPrice
      })),
      categoryUrls: this.generateCategoryUrls(shoppingList.byCategory)
    };
  }

  /**
   * Generate URLs for each category
   */
  generateCategoryUrls(byCategory) {
    const urls = {};
    for (const [category, items] of Object.entries(byCategory)) {
      // Use the first item's search as the category link
      if (items.length > 0) {
        urls[category] = items[0].hebUrl;
      }
    }
    return urls;
  }

  /**
   * Generate user instructions
   */
  generateInstructions() {
    return {
      onlineShopping: [
        'Open the HTML shopping list in your browser',
        'Click "View on HEB" for each item to search on HEB.com',
        'Add items to your cart as you go',
        'Use the checkboxes to track what\'s been added',
        'Proceed to checkout on HEB.com when done'
      ],
      inStoreShopping: [
        'Print the HTML list or open on your phone',
        'Items are organized by store section (category)',
        'Check off items as you add them to your cart',
        'Estimated prices help you stay on budget'
      ],
      tips: [
        'HEB sometimes has substitutes - the search links will show all options',
        'Prices are estimates based on typical HEB pricing',
        'Curbside pickup available at heb.com/shop/curbside',
        'Same-day delivery available in most areas'
      ]
    };
  }

  /**
   * Get the latest generated package for a given week
   */
  async getLatestPackage(weekOf = null) {
    const date = weekOf || new Date().toISOString().split('T')[0];
    const packagePath = path.join(this.dataDir, `heb-package-${date}.json`);
    
    try {
      const data = await fs.readFile(packagePath, 'utf-8');
      return JSON.parse(data);
    } catch (e) {
      return null;
    }
  }

  /**
   * Generate email-friendly summary
   */
  async generateEmailSummary(weeklyPlanPath) {
    const pkg = await this.generateShoppingPackage(weeklyPlanPath);
    const { shoppingList } = pkg;
    
    const summary = {
      subject: `🍽️ Weekly Dinner Plan + HEB Shopping List - Week of ${shoppingList.metadata.weekOf}`,
      htmlContent: await this.generateEmailHTML(pkg),
      markdownContent: await this.generateEmailMarkdown(pkg),
      attachments: [
        pkg.files.html.path,
        pkg.files.markdown.path
      ]
    };
    
    return summary;
  }

  /**
   * Generate HTML content for email
   */
  async generateEmailHTML(pkg) {
    const { shoppingList, files, quickLinks } = pkg;
    const { metadata, budget } = shoppingList;
    
    return `<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; }
    .header { background: #d32f2f; color: white; padding: 20px; text-align: center; }
    .content { padding: 20px; }
    .stats { background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0; }
    .stat { display: inline-block; margin-right: 20px; }
    .stat-value { font-size: 24px; font-weight: bold; color: #d32f2f; }
    .stat-label { font-size: 12px; color: #666; }
    .button { display: inline-block; background: #d32f2f; color: white; padding: 12px 24px; 
              text-decoration: none; border-radius: 4px; margin: 10px 0; }
    .file-list { background: #fafafa; padding: 15px; border-radius: 8px; }
    .file-item { margin: 10px 0; padding: 10px; background: white; border-radius: 4px; }
    .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>🍽️ Weekly Dinner Plan</h1>
    <p>Week of ${metadata.weekOf}</p>
  </div>
  
  <div class="content">
    <div class="stats">
      <div class="stat">
        <div class="stat-value">${metadata.totalItems}</div>
        <div class="stat-label">ITEMS</div>
      </div>
      <div class="stat">
        <div class="stat-value">$${metadata.estimatedTotal.toFixed(0)}</div>
        <div class="stat-label">ESTIMATED</div>
      </div>
      <div class="stat">
        <div class="stat-value">$${(budget.allocated - metadata.estimatedTotal).toFixed(0)}</div>
        <div class="stat-label">REMAINING</div>
      </div>
    </div>
    
    <p>Your HEB shopping list is ready! Click below to view the interactive list:</p>
    
    <a href="${quickLinks.hebShopUrl}" class="button">🛒 Shop on HEB.com</a>
    
    <h3>📎 Attached Files:</h3>
    <div class="file-list">
      <div class="file-item">
        <strong>${files.html.filename}</strong><br>
        Interactive shopping list with clickable HEB links
      </div>
      <div class="file-item">
        <strong>${files.markdown.filename}</strong><br>
        Text version for quick reference
      </div>
    </div>
    
    <h3>📝 How to Use:</h3>
    <ol>
      <li>Open the HTML file in your browser</li>
      <li>Click "View on HEB" for each item</li>
      <li>Add to cart and check the box</li>
      <li>Checkout on HEB.com when done</li>
    </ol>
  </div>
  
  <div class="footer">
    <p>Generated by Dinner Automation System</p>
    <p>Prices are estimates. Actual prices may vary.</p>
  </div>
</body>
</html>`;
  }

  /**
   * Generate Markdown content for email/Discord
   */
  async generateEmailMarkdown(pkg) {
    const { shoppingList, files } = pkg;
    const { metadata, budget } = shoppingList;
    
    return `## 🍽️ Weekly Dinner Plan - Week of ${metadata.weekOf}

### 💰 Budget Summary
- **Items:** ${metadata.totalItems}
- **Estimated Total:** $${metadata.estimatedTotal.toFixed(2)}
- **Budget:** $${budget.allocated}
- **Remaining:** $${(budget.allocated - metadata.estimatedTotal).toFixed(2)}

### 🛒 Shopping List
Your interactive shopping list is attached! It includes:
- ✅ Clickable links to HEB.com for each item
- ✅ Organized by store category
- ✅ Estimated prices
- ✅ Checkboxes to track progress

### 📎 Files Attached
1. **${files.html.filename}** - Interactive HTML list (open in browser)
2. **${files.markdown.filename}** - Text version

### 🚀 Quick Start
1. Download the HTML file
2. Open in your browser
3. Click "View on HEB" for each item
4. Add to cart as you go

---
*Generated on ${new Date(metadata.generatedAt).toLocaleString()}*
`;
  }
}

module.exports = { HEBIntegration };

// CLI for testing
async function main() {
  const integration = new HEBIntegration();
  const weeklyPlanPath = process.argv[2] || path.join(__dirname, '..', 'data', 'weekly-plan.json');
  
  const pkg = await integration.generateShoppingPackage(weeklyPlanPath);
  
  console.log('\n=== Package Generated ===');
  console.log(`Week: ${pkg.metadata.weekOf}`);
  console.log(`Items: ${pkg.shoppingList.metadata.totalItems}`);
  console.log(`Estimated: $${pkg.shoppingList.metadata.estimatedTotal.toFixed(2)}`);
  console.log('\nFiles:');
  console.log(`  HTML: ${pkg.files.html.path}`);
  console.log(`  MD: ${pkg.files.markdown.path}`);
}

if (require.main === module) {
  main().catch(console.error);
}
