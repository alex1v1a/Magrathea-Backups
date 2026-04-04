/**
 * Email Reply Handler - Updates All Systems
 * When email reply received:
 * 1. Parse exclusions/stock items
 * 2. Rebuild meal plan
 * 3. Update calendar
 * 4. Regenerate HEB cart data
 * 5. Send updated email
 */

const fs = require('fs');
const path = require('path');
const { DinnerEmailClient } = require('./email-client');
const { CalendarSync } = require('./calendar-sync');
const { launch: launchHEB } = require('./heb-auto-launcher-module');

const DATA_DIR = path.join(__dirname, '..', 'data');

class ReplySyncHandler {
  constructor() {
    this.emailClient = new DinnerEmailClient();
    this.calendar = new CalendarSync();
  }

  log(message) {
    const timestamp = new Date().toLocaleTimeString();
    console.log(`[${timestamp}] ${message}`);
  }

  /**
   * Process email reply and sync all systems
   */
  async processReply(replyData) {
    console.log('\n═══════════════════════════════════════════');
    console.log('   🔄 REPLY SYNC - Updating All Systems');
    console.log('═══════════════════════════════════════════\n');
    
    this.log(`📩 Processing reply from: ${replyData.from}`);
    
    // Load current plan
    const planPath = path.join(DATA_DIR, 'weekly-plan.json');
    const plan = JSON.parse(fs.readFileSync(planPath, 'utf8'));
    
    // Parse exclusions from reply
    const exclusions = this.parseExclusions(replyData.body);
    const stockItems = this.parseStockItems(replyData.body);
    
    this.log(`📝 Exclusions: ${exclusions.length > 0 ? exclusions.join(', ') : 'None'}`);
    this.log(`📦 Stock items: ${stockItems.length > 0 ? stockItems.join(', ') : 'None'}`);
    
    // Apply exclusions to plan
    const updatedPlan = await this.applyExclusions(plan, exclusions);
    
    // Apply stock items
    await this.applyStockItems(stockItems);
    
    // Save updated plan
    fs.writeFileSync(planPath, JSON.stringify(updatedPlan, null, 2));
    this.log('✅ Updated plan saved');
    
    // Sync all systems with new plan
    await this.syncAllSystems(updatedPlan, exclusions, stockItems);
    
    return { success: true, exclusions, stockItems };
  }

  /**
   * Parse exclusions from email body
   */
  parseExclusions(body) {
    const exclusions = [];
    
    // Look for "Exclude:" or "Remove:" patterns
    const lines = body.split('\n');
    
    for (const line of lines) {
      const lower = line.toLowerCase().trim();
      
      if (lower.startsWith('exclude:') || lower.startsWith('remove:') || lower.startsWith('no ')) {
        const item = line.split(':').slice(1).join(':').trim() || line.replace(/^(exclude|remove|no)\s*:?\s*/i, '').trim();
        if (item && item.length > 2) {
          exclusions.push(item);
        }
      }
    }
    
    return exclusions;
  }

  /**
   * Parse stock items from email body
   */
  parseStockItems(body) {
    const stockItems = [];
    const lines = body.split('\n');
    
    for (const line of lines) {
      const lower = line.toLowerCase().trim();
      
      if (lower.startsWith('have:') || lower.startsWith('stock:') || lower.startsWith('already have:')) {
        const item = line.split(':').slice(1).join(':').trim() || line.replace(/^(have|stock|already have)\s*:?\s*/i, '').trim();
        if (item && item.length > 2) {
          stockItems.push(item);
        }
      }
    }
    
    return stockItems;
  }

  /**
   * Apply exclusions to meal plan (rebuild with substitutions)
   */
  async applyExclusions(plan, exclusions) {
    if (exclusions.length === 0) return plan;
    
    this.log('🔄 Rebuilding plan with substitutions...');
    
    // Track changes
    const changes = [];
    
    for (const meal of plan.meals) {
      const originalIngredients = [...meal.ingredients];
      
      for (const exclusion of exclusions) {
        const excludedIndex = meal.ingredients.findIndex(ing =>
          ing && ing.name && ing.name.toLowerCase().includes(exclusion.toLowerCase()) ||
          ing && ing.hebSearch && ing.hebSearch.toLowerCase().includes(exclusion.toLowerCase())
        );
        
        if (excludedIndex !== -1) {
          const excluded = meal.ingredients[excludedIndex];
          
          // Find substitution
          const substitution = this.findSubstitution(excluded, meal.category);
          
          if (substitution) {
            meal.ingredients[excludedIndex] = substitution;
            changes.push({
              meal: meal.day,
              excluded: excluded.name,
              substituted: substitution.name
            });
          } else {
            // Remove ingredient if no substitution
            meal.ingredients.splice(excludedIndex, 1);
            changes.push({
              meal: meal.day,
              excluded: excluded.name,
              substituted: 'removed'
            });
          }
        }
      }
      
      // Mark if changed
      if (meal.ingredients.length !== originalIngredients.length ||
          changes.some(c => c.meal === meal.day)) {
        meal.updatedAt = new Date().toISOString();
        meal.hasSubstitutions = true;
      }
    }
    
    // Log changes
    for (const change of changes) {
      this.log(`  ${change.meal}: ${change.excluded} → ${change.substituted}`);
    }
    
    return plan;
  }

  /**
   * Find substitution for excluded ingredient
   */
  findSubstitution(ingredient, category) {
    // Simple substitution map
    const substitutions = {
      'broccoli': { name: 'Green beans', amount: '1 lb', hebSearch: 'green beans' },
      'bell peppers': { name: 'Zucchini', amount: '3', hebSearch: 'zucchini' },
      'flank steak': { name: 'Chicken breast', amount: '1.5 lbs', hebSearch: 'chicken breast' },
      'shrimp': { name: 'Chicken thighs', amount: '1.5 lbs', hebSearch: 'chicken thighs' },
      'quinoa': { name: 'Brown rice', amount: '1 lb', hebSearch: 'brown rice' },
      'tilapia': { name: 'Chicken breast', amount: '1.5 lbs', hebSearch: 'chicken breast' },
      'cilantro': { name: 'Parsley', amount: '1 bunch', hebSearch: 'parsley fresh' },
      'sesame oil': { name: 'Olive oil', amount: '1 bottle', hebSearch: 'olive oil', inStock: true }
    };
    
    // Find matching substitution
    for (const [key, sub] of Object.entries(substitutions)) {
      if ((ingredient.name && ingredient.name.toLowerCase().includes(key)) || 
          (ingredient.hebSearch && ingredient.hebSearch.toLowerCase().includes(key))) {
        return { ...sub, inStock: sub.inStock || false };
      }
    }
    
    return null;
  }

  /**
   * Apply stock items
   */
  async applyStockItems(stockItems) {
    if (stockItems.length === 0) return;
    
    this.log('📦 Saving stock items...');
    
    const stockPath = path.join(DATA_DIR, 'stock-list.json');
    const existing = fs.existsSync(stockPath) ? JSON.parse(fs.readFileSync(stockPath, 'utf8')) : { items: [] };
    
    for (const item of stockItems) {
      if (!existing.items) existing.items = [];
      if (!existing.items.includes(item)) {
        existing.items.push(item);
      }
    }
    
    existing.updatedAt = new Date().toISOString();
    fs.writeFileSync(stockPath, JSON.stringify(existing, null, 2));
    
    this.log(`✅ ${stockItems.length} items added to stock list`);
  }

  /**
   * Sync all systems with updated plan
   */
  async syncAllSystems(plan, exclusions, stockItems) {
    this.log('🔄 Syncing all systems with updates...');
    
    // 1. Update calendar
    this.log('  📅 Updating calendar...');
    await this.calendar.syncToCalendar();
    
    // 2. Regenerate HEB auto-start data
    this.log('  🛒 Regenerating HEB cart data...');
    await launchHEB(plan);
    
    // 3. Send updated email
    this.log('  📧 Sending updated email...');
    const cartSummary = {
      status: 'updated',
      method: 'chrome_extension_auto',
      items: plan.stockSummary?.needed || 30,
      estimatedTotal: plan.budget?.estimatedMealCost || 116,
      exclusions: exclusions,
      stockItems: stockItems
    };
    
    await this.emailClient.sendHybridNotification(plan, cartSummary);
    
    // 4. Update sync manifest
    const manifestPath = path.join(DATA_DIR, 'sync-manifest.json');
    const manifest = fs.existsSync(manifestPath) ? JSON.parse(fs.readFileSync(manifestPath, 'utf8')) : {};
    
    manifest.lastReply = {
      receivedAt: new Date().toISOString(),
      exclusions: exclusions,
      stockItems: stockItems,
      systemsUpdated: ['calendar', 'heb', 'email']
    };
    
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
    
    this.log('✅ All systems updated!');
  }
}

module.exports = { ReplySyncHandler };

// Test with simulated reply
if (require.main === module) {
  const handler = new ReplySyncHandler();
  
  // Simulate a reply
  const testReply = {
    from: 'alex@1v1a.com',
    body: `
Exclude: broccoli
Exclude: sesame oil
Already have: soy sauce

Looks great!
    `.trim()
  };
  
  handler.processReply(testReply).then(result => {
    console.log('\n✅ Reply processing complete!');
    process.exit(0);
  }).catch(error => {
    console.error('❌ Failed:', error.message);
    process.exit(1);
  });
}
