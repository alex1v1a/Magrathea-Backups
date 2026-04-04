#!/usr/bin/env node
/**
 * Rebuild Meal Plan
 * 
 * Handles rebuilding the meal plan when exclusions are received:
 * 1. Parse exclusion requests from email replies
 * 2. Rebuild meal plan with substitutions
 * 3. Generate new shopping list
 * 4. Trigger cart update
 * 5. Send update email
 * 
 * Usage:
 *   node scripts/rebuild-meal-plan.js
 *   node scripts/rebuild-meal-plan.js --exclusions "chicken,beef"
 *   node scripts/rebuild-meal-plan.js --process-pending
 */

const fs = require('fs');
const path = require('path');
const ExcludeManager = require('./exclude-manager');
const SubstitutionEngine = require('./substitution-engine');
const { DinnerEmailClient } = require('./email-client');
const { HEBAutoCart } = require('./auto-heb-cart');

const DATA_DIR = path.join(__dirname, '..', 'data');
const TEMPLATES_DIR = path.join(__dirname, '..', 'templates');
const LOGS_DIR = path.join(__dirname, '..', 'logs');

class MealPlanRebuilder {
  constructor(options = {}) {
    this.options = options;
    this.excludeManager = new ExcludeManager();
    this.substitutionEngine = new SubstitutionEngine();
    this.emailClient = new DinnerEmailClient();
    
    // Ensure directories exist
    [DATA_DIR, TEMPLATES_DIR, LOGS_DIR].forEach(dir => {
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    });
    
    this.logFile = path.join(LOGS_DIR, `rebuild-${new Date().toISOString().split('T')[0]}.log`);
  }

  log(message, level = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = level === 'error' ? '❌' : level === 'success' ? '✅' : level === 'warn' ? '⚠️' : 'ℹ️';
    const logEntry = `[${timestamp}] ${prefix} ${message}`;
    console.log(logEntry);
    fs.appendFileSync(this.logFile, logEntry + '\n');
  }

  /**
   * Load current weekly plan
   */
  loadWeeklyPlan() {
    const planPath = path.join(DATA_DIR, 'weekly-plan.json');
    if (!fs.existsSync(planPath)) {
      throw new Error('No weekly plan found. Generate a meal plan first.');
    }
    return JSON.parse(fs.readFileSync(planPath, 'utf8'));
  }

  /**
   * Save weekly plan
   */
  saveWeeklyPlan(plan) {
    const planPath = path.join(DATA_DIR, 'weekly-plan.json');
    fs.writeFileSync(planPath, JSON.stringify(plan, null, 2));
  }

  /**
   * Load meal templates
   */
  loadMealTemplates() {
    const templatesFile = path.join(TEMPLATES_DIR, 'meals.json');
    if (!fs.existsSync(templatesFile)) {
      throw new Error('No meal templates found.');
    }
    return JSON.parse(fs.readFileSync(templatesFile, 'utf8')).meals;
  }

  /**
   * Load meal history
   */
  loadMealHistory() {
    const historyFile = path.join(DATA_DIR, 'meal-history.json');
    if (!fs.existsSync(historyFile)) {
      return { meals: [], lastUpdated: null };
    }
    return JSON.parse(fs.readFileSync(historyFile, 'utf8'));
  }

  /**
   * Save meal history
   */
  saveMealHistory(history) {
    const historyFile = path.join(DATA_DIR, 'meal-history.json');
    fs.writeFileSync(historyFile, JSON.stringify(history, null, 2));
  }

  /**
   * Parse exclusion requests from various sources
   */
  parseExclusionRequests(input) {
    const exclusions = [];
    
    if (typeof input === 'string') {
      // Parse comma-separated list
      const items = input.split(',').map(s => s.trim()).filter(Boolean);
      for (const item of items) {
        exclusions.push({
          ingredient: item,
          reason: 'preference',
          source: 'manual'
        });
      }
    } else if (Array.isArray(input)) {
      // Array of exclusion objects
      exclusions.push(...input);
    }
    
    return exclusions;
  }

  /**
   * Apply exclusions and find substitutes
   */
  applyExclusions(exclusions) {
    const applied = [];
    
    for (const exclusion of exclusions) {
      this.log(`Processing exclusion: ${exclusion.ingredient}`);
      
      // Add to exclusion manager
      const exclusionData = this.excludeManager.addExclusionFromEmail(
        exclusion.ingredient,
        exclusion.reason || 'preference',
        exclusion.sourceEmail || 'manual'
      );
      
      // Find substitute if not already set
      if (!exclusionData.substitute) {
        const substitute = this.substitutionEngine.getBestSubstitute(exclusion.ingredient);
        if (substitute) {
          this.excludeManager.updateSubstitute(exclusion.ingredient, substitute);
          exclusionData.substitute = substitute;
          this.log(`  → Auto-assigned substitute: ${substitute}`);
        }
      }
      
      applied.push({
        ingredient: exclusion.ingredient,
        reason: exclusion.reason,
        substitute: exclusionData.substitute
      });
    }
    
    return applied;
  }

  /**
   * Check which meals need replacement based on exclusions
   */
  identifyMealsToReplace(weeklyPlan, exclusions) {
    const mealsToReplace = [];
    const exclusionIngredients = exclusions.map(e => e.ingredient.toLowerCase());
    
    for (const meal of weeklyPlan.meals) {
      const checkResult = this.excludeManager.checkMealForExcludedIngredients(meal);
      
      if (checkResult.hasExcluded) {
        // Check if any excluded ingredients don't have substitutes
        const needsReplacement = checkResult.excludedIngredients.some(excluded => 
          !excluded.substitute || exclusionIngredients.includes(excluded.ingredient.toLowerCase())
        );
        
        if (needsReplacement) {
          mealsToReplace.push({
            day: meal.day,
            name: meal.name,
            excludedIngredients: checkResult.excludedIngredients
          });
        }
      }
    }
    
    return mealsToReplace;
  }

  /**
   * Find a replacement meal that doesn't contain excluded ingredients
   */
  findReplacementMeal(mealsToAvoid, budgetRemaining) {
    const templates = this.loadMealTemplates();
    const avoidNames = new Set(mealsToAvoid.map(m => m.name.toLowerCase()));
    
    // Filter out meals with excluded ingredients or already used
    const availableMeals = templates.filter(meal => {
      // Skip if already used
      if (avoidNames.has(meal.name.toLowerCase())) return false;
      
      // Skip if contains excluded ingredients
      const checkResult = this.excludeManager.checkMealForExcludedIngredients(meal);
      if (checkResult.hasExcluded) return false;
      
      // Skip if over budget
      if (meal.estimatedCost > budgetRemaining) return false;
      
      return true;
    });
    
    if (availableMeals.length === 0) {
      return null;
    }
    
    // Pick a random meal from available options
    return availableMeals[Math.floor(Math.random() * availableMeals.length)];
  }

  /**
   * Rebuild the meal plan with substitutions
   */
  rebuildMealPlan(exclusions) {
    this.log('Starting meal plan rebuild...');
    
    const weeklyPlan = this.loadWeeklyPlan();
    const originalPlan = JSON.parse(JSON.stringify(weeklyPlan)); // Deep copy
    
    // Apply exclusions and get substitutes
    const appliedExclusions = this.applyExclusions(exclusions);
    
    // Identify meals that need replacement
    const mealsToReplace = this.identifyMealsToReplace(weeklyPlan, appliedExclusions);
    this.log(`Found ${mealsToReplace.length} meals needing replacement`);
    
    // Track substitutions made
    const substitutions = [];
    
    // Replace meals
    for (const mealToReplace of mealsToReplace) {
      this.log(`Replacing ${mealToReplace.day}: ${mealToReplace.name}`);
      
      const budgetRemaining = weeklyPlan.budget.remaining + 
        (weeklyPlan.meals.find(m => m.day === mealToReplace.day)?.estimatedCost || 0);
      
      const replacement = this.findReplacementMeal(weeklyPlan.meals, budgetRemaining);
      
      if (replacement) {
        const mealIndex = weeklyPlan.meals.findIndex(m => m.day === mealToReplace.day);
        const oldMeal = weeklyPlan.meals[mealIndex];
        
        weeklyPlan.meals[mealIndex] = {
          day: mealToReplace.day,
          ...replacement,
          status: 'planned'
        };
        
        substitutions.push({
          day: mealToReplace.day,
          oldMeal: oldMeal.name,
          newMeal: replacement.name,
          reason: mealToReplace.excludedIngredients.map(e => 
            `${e.ingredient} excluded${e.substitute ? ` (substituted with ${e.substitute})` : ''}`
          ).join(', ')
        });
        
        this.log(`  → Replaced with: ${replacement.name}`);
      } else {
        this.log(`  ⚠️ No suitable replacement found for ${mealToReplace.day}`, 'warn');
        substitutions.push({
          day: mealToReplace.day,
          oldMeal: mealToReplace.name,
          newMeal: null,
          reason: 'No suitable replacement found'
        });
      }
    }
    
    // Recalculate budget
    const newEstimatedCost = weeklyPlan.meals.reduce((sum, m) => sum + m.estimatedCost, 0);
    const buffer = newEstimatedCost * 0.10;
    weeklyPlan.budget.estimatedMealCost = newEstimatedCost;
    weeklyPlan.budget.buffer = buffer;
    weeklyPlan.budget.totalWithBuffer = newEstimatedCost + buffer;
    weeklyPlan.budget.remaining = weeklyPlan.budget.allocated - (newEstimatedCost + buffer);
    
    // Update metadata
    weeklyPlan.metadata.rebuiltAt = new Date().toISOString();
    weeklyPlan.metadata.rebuildReason = 'exclusion_request';
    weeklyPlan.metadata.originalPlan = originalPlan;
    
    // Save rebuilt plan
    this.saveWeeklyPlan(weeklyPlan);
    
    // Update history
    const history = this.loadMealHistory();
    history.rebuilds = history.rebuilds || [];
    history.rebuilds.push({
      date: new Date().toISOString(),
      exclusions: appliedExclusions,
      substitutions: substitutions,
      budgetChange: {
        old: originalPlan.budget.estimatedMealCost,
        new: newEstimatedCost
      }
    });
    this.saveMealHistory(history);
    
    this.log('Meal plan rebuild complete', 'success');
    
    return {
      weeklyPlan,
      originalPlan,
      appliedExclusions,
      substitutions,
      budgetChange: {
        old: originalPlan.budget.estimatedMealCost,
        new: newEstimatedCost
      }
    };
  }

  /**
   * Clear existing HEB cart
   */
  async clearHEBCart() {
    this.log('Attempting to clear HEB cart...');
    
    try {
      const autoCart = new HEBAutoCart({ headless: true });
      
      // Launch browser
      await autoCart.launchBrowser();
      
      // Navigate to HEB and verify login
      await autoCart.navigateToHEB();
      
      // Navigate to cart page
      await autoCart.hebPage.goto('https://www.heb.com/cart', {
        waitUntil: 'networkidle',
        timeout: 30000
      });
      
      this.log('Loaded cart page');
      
      // Look for "Remove All" or "Clear Cart" button
      const clearCartSelectors = [
        'button:has-text("Remove All")',
        'button:has-text("Clear Cart")',
        'button:has-text("Empty Cart")',
        '[data-testid*="remove-all"]',
        '[data-testid*="clear-cart"]'
      ];
      
      let cleared = false;
      for (const selector of clearCartSelectors) {
        const button = await autoCart.hebPage.$(selector);
        if (button) {
          await button.click();
          await autoCart.hebPage.waitForTimeout(2000);
          cleared = true;
          this.log('Clicked clear cart button');
          break;
        }
      }
      
      // If no clear all button, remove items one by one
      if (!cleared) {
        this.log('No clear all button found, removing items individually...');
        
        let removedCount = 0;
        while (true) {
          const removeSelectors = [
            'button:has-text("Remove")',
            '[data-testid*="remove"]',
            'button[aria-label*="Remove"]'
          ];
          
          let removed = false;
          for (const selector of removeSelectors) {
            const button = await autoCart.hebPage.$(selector);
            if (button) {
              await button.click();
              await autoCart.hebPage.waitForTimeout(1000);
              removed = true;
              removedCount++;
              break;
            }
          }
          
          if (!removed) break;
        }
        
        this.log(`Removed ${removedCount} items from cart`);
        cleared = removedCount > 0;
      }
      
      // Close browser
      await autoCart.browser.close();
      
      this.log('HEB cart cleared successfully', 'success');
      return { success: true, cleared };
      
    } catch (error) {
      this.log(`Failed to clear cart: ${error.message}`, 'warn');
      return { success: false, error: error.message };
    }
  }

  /**
   * Update HEB cart with new items
   */
  async updateHEBCart(weeklyPlan) {
    this.log('Updating HEB cart with new items...');
    
    try {
      const autoCart = new HEBAutoCart({ headless: true });
      const results = await autoCart.run();
      
      return {
        success: results.success,
        itemsAdded: results.itemsAdded,
        itemsFailed: results.itemsFailed,
        errors: results.errors
      };
      
    } catch (error) {
      this.log(`Failed to update cart: ${error.message}`, 'error');
      return {
        success: false,
        error: error.message,
        itemsAdded: 0,
        itemsFailed: []
      };
    }
  }

  /**
   * Generate fallback shopping list if cart automation fails
   */
  generateShoppingList(weeklyPlan) {
    this.log('Generating fallback shopping list...');
    
    const items = [];
    const seen = new Set();
    
    for (const meal of weeklyPlan.meals) {
      if (!meal.ingredients) continue;
      
      for (const ingredient of meal.ingredients) {
        const searchTerm = ingredient.hebSearch || ingredient.name;
        const key = searchTerm.toLowerCase();
        
        if (!seen.has(key)) {
          seen.add(key);
          items.push({
            name: ingredient.name,
            searchTerm: searchTerm,
            amount: ingredient.amount || '1',
            hebUrl: `https://www.heb.com/search?q=${encodeURIComponent(searchTerm)}`
          });
        }
      }
    }
    
    return {
      items,
      totalItems: items.length,
      note: 'Cart automation unavailable. Please use these links to add items manually.'
    };
  }

  /**
   * Send update email with rebuild summary
   */
  async sendUpdateEmail(rebuildResult, cartUpdateResult) {
    this.log('Sending update email...');
    
    try {
      await this.emailClient.initSMTP();
      
      const fromEmail = process.env.ICLOUD_EMAIL || 'MarvinMartian9@icloud.com';
      const { weeklyPlan, appliedExclusions, substitutions, originalPlan } = rebuildResult;
      
      const subject = `🔄 UPDATED: Weekly Dinner Plan - Week of ${weeklyPlan.weekOf}`;
      
      // Build email content
      const textBody = this.formatUpdateEmailText(rebuildResult, cartUpdateResult);
      const htmlBody = this.formatUpdateEmailHTML(rebuildResult, cartUpdateResult);
      
      const recipients = ['alex@1v1a.com', 'sferrazzaa96@gmail.com'];
      
      const mailOptions = {
        from: { name: 'Marvin Dinner Bot', address: fromEmail },
        to: recipients,
        subject: subject,
        text: textBody,
        html: htmlBody,
        replyTo: fromEmail
      };
      
      const result = await this.emailClient.transporter.sendMail(mailOptions);
      
      this.log(`Update email sent to: ${recipients.join(', ')}`, 'success');
      
      return {
        success: true,
        messageId: result.messageId,
        recipients: recipients,
        subject: subject
      };
      
    } catch (error) {
      this.log(`Failed to send update email: ${error.message}`, 'error');
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Format update email as plain text
   */
  formatUpdateEmailText(rebuildResult, cartUpdateResult) {
    const { weeklyPlan, appliedExclusions, substitutions, originalPlan, budgetChange } = rebuildResult;
    
    let body = `╔════════════════════════════════════════════════════════════╗\n`;
    body += `║     🔄 UPDATED WEEKLY DINNER PLAN - ACTION REQUIRED       ║\n`;
    body += `╚════════════════════════════════════════════════════════════╝\n\n`;
    
    body += `This is an UPDATE to your previously sent dinner plan.\n`;
    body += `Changes have been made based on your exclusion requests.\n\n`;
    
    body += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    body += `📋 WHAT WAS EXCLUDED\n`;
    body += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    
    appliedExclusions.forEach((exclusion, i) => {
      body += `${i + 1}. ${exclusion.ingredient}\n`;
      body += `   Reason: ${exclusion.reason}\n`;
      if (exclusion.substitute) {
        body += `   Substitute: ${exclusion.substitute}\n`;
      }
      body += `\n`;
    });
    
    body += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    body += `🔄 MEAL SUBSTITUTIONS\n`;
    body += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    
    substitutions.forEach(sub => {
      body += `${sub.day}:\n`;
      body += `  ❌ Removed: ${sub.oldMeal}\n`;
      if (sub.newMeal) {
        body += `  ✅ Added: ${sub.newMeal}\n`;
      } else {
        body += `  ⚠️ No replacement found\n`;
      }
      body += `  Reason: ${sub.reason}\n\n`;
    });
    
    body += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    body += `💰 BUDGET UPDATE\n`;
    body += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    
    body += `Previous estimate: $${budgetChange.old.toFixed(2)}\n`;
    body += `New estimate: $${budgetChange.new.toFixed(2)}\n`;
    body += `Change: ${budgetChange.new > budgetChange.old ? '+' : ''}$${(budgetChange.new - budgetChange.old).toFixed(2)}\n\n`;
    
    body += `Allocated: $${weeklyPlan.budget.allocated.toFixed(2)}\n`;
    body += `Estimated: $${weeklyPlan.budget.estimatedMealCost.toFixed(2)}\n`;
    body += `Buffer (10%): $${weeklyPlan.budget.buffer.toFixed(2)}\n`;
    body += `Total with buffer: $${weeklyPlan.budget.totalWithBuffer.toFixed(2)}\n`;
    body += `Remaining: $${weeklyPlan.budget.remaining.toFixed(2)}\n\n`;
    
    body += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    body += `🛒 CART STATUS\n`;
    body += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    
    if (cartUpdateResult.success) {
      body += `✅ Cart updated successfully!\n`;
      body += `Items added: ${cartUpdateResult.itemsAdded}\n`;
      if (cartUpdateResult.itemsFailed?.length > 0) {
        body += `Items failed: ${cartUpdateResult.itemsFailed.length}\n`;
        cartUpdateResult.itemsFailed.forEach(item => {
          body += `  - ${item.item}: ${item.error}\n`;
        });
      }
    } else {
      body += `⚠️ Cart automation unavailable.\n`;
      body += `Please add items manually using the shopping list below.\n`;
      body += `\n💡 Tip: Use the Chrome extension at dinner-automation/heb-extension\n`;
    }
    
    body += `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    body += `📅 UPDATED MEAL PLAN\n`;
    body += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    
    weeklyPlan.meals.forEach((meal, i) => {
      body += `${i + 1}. ${meal.day}: ${meal.name}\n`;
      body += `   Category: ${meal.category} | Prep: ${meal.prepTime} | Est: $${meal.estimatedCost}\n`;
      body += `   Ingredients:\n`;
      meal.ingredients.forEach(ing => {
        const isNew = substitutions.some(s => s.day === meal.day);
        const marker = isNew ? '🆕 ' : '   ';
        body += `   ${marker}- ${ing.name} (${ing.amount})\n`;
      });
      body += `\n`;
    });
    
    body += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    body += `REPLY INSTRUCTIONS:\n`;
    body += `  Reply to this email to make additional changes:\n`;
    body += `  - "approve" - Confirm the updated plan\n`;
    body += `  - "exclude [ingredient]" - Exclude another ingredient\n`;
    body += `  - "adjust [meal name]" - Request changes to a meal\n`;
    body += `\n`;
    
    body += `---\n`;
    body += `Marvin 🤖\n`;
    body += `Dinner Automation System\n`;
    body += `Updated: ${new Date().toLocaleString()}\n`;
    
    return body;
  }

  /**
   * Format update email as HTML
   */
  formatUpdateEmailHTML(rebuildResult, cartUpdateResult) {
    const { weeklyPlan, appliedExclusions, substitutions, budgetChange } = rebuildResult;
    
    const exclusionsHtml = appliedExclusions.map((ex, i) => `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #ddd;">${i + 1}. ${ex.ingredient}</td>
        <td style="padding: 10px; border-bottom: 1px solid #ddd;">${ex.reason}</td>
        <td style="padding: 10px; border-bottom: 1px solid #ddd;">${ex.substitute || '<em>None</em>'}</td>
      </tr>
    `).join('');
    
    const substitutionsHtml = substitutions.map(sub => `
      <div style="margin: 15px 0; padding: 15px; background: #f5f5f5; border-left: 4px solid #ff9800; border-radius: 4px;">
        <strong>${sub.day}</strong><br>
        <span style="color: #f44336;">❌ ${sub.oldMeal}</span> → 
        ${sub.newMeal ? `<span style="color: #4CAF50;">✅ ${sub.newMeal}</span>` : '<span style="color: #ff9800;">⚠️ No replacement</span>'}<br>
        <small style="color: #666;">Reason: ${sub.reason}</small>
      </div>
    `).join('');
    
    const mealsHtml = weeklyPlan.meals.map((meal, i) => {
      const isNew = substitutions.some(s => s.day === meal.day && s.newMeal);
      return `
      <div style="margin: 20px 0; padding: 15px; background: ${isNew ? '#e8f5e9' : '#f5f5f5'}; border-radius: 8px;">
        <h3 style="margin-top: 0; color: ${isNew ? '#4CAF50' : '#333'};">
          ${isNew ? '🆕 ' : ''}${i + 1}. ${meal.day}: ${meal.name}
        </h3>
        <p style="color: #666; margin: 5px 0;">
          <span style="background: #e3f2fd; padding: 3px 8px; border-radius: 4px; font-size: 12px;">${meal.category}</span>
          <span style="margin: 0 10px;">|</span> Prep: ${meal.prepTime}
          <span style="margin: 0 10px;">|</span> $${meal.estimatedCost}
        </p>
        <ul style="margin: 10px 0;">
          ${meal.ingredients.map(ing => `<li>${ing.name} (${ing.amount})</li>`).join('')}
        </ul>
      </div>
    `}).join('');
    
    const budgetDiff = budgetChange.new - budgetChange.old;
    const budgetDiffColor = budgetDiff > 0 ? '#f44336' : budgetDiff < 0 ? '#4CAF50' : '#666';
    
    return `
      <html>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: #ff9800; color: white; padding: 20px; text-align: center; border-radius: 8px; margin-bottom: 20px;">
            <h1 style="margin: 0;">🔄 UPDATED DINNER PLAN</h1>
            <p style="margin: 10px 0 0 0;">Changes made based on your requests</p>
          </div>
          
          <div style="background: #fff3e0; padding: 15px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #ff9800;">
            <strong>⚠️ This is an UPDATE to your previous plan</strong><br>
            <small>Week of: ${weeklyPlan.weekOf} | Updated: ${new Date().toLocaleString()}</small>
          </div>
          
          <h2 style="color: #333; border-bottom: 2px solid #ff9800; padding-bottom: 10px;">📋 What Was Excluded</h2>
          <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <thead>
              <tr style="background: #f5f5f5;">
                <th style="padding: 10px; text-align: left; border-bottom: 2px solid #ddd;">Ingredient</th>
                <th style="padding: 10px; text-align: left; border-bottom: 2px solid #ddd;">Reason</th>
                <th style="padding: 10px; text-align: left; border-bottom: 2px solid #ddd;">Substitute</th>
              </tr>
            </thead>
            <tbody>
              ${exclusionsHtml}
            </tbody>
          </table>
          
          <h2 style="color: #333; border-bottom: 2px solid #ff9800; padding-bottom: 10px;">🔄 Meal Substitutions</h2>
          ${substitutionsHtml}
          
          <h2 style="color: #333; border-bottom: 2px solid #ff9800; padding-bottom: 10px;">💰 Budget Update</h2>
          <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <table style="width: 100%;">
              <tr>
                <td>Previous estimate:</td>
                <td><strong>$${budgetChange.old.toFixed(2)}</strong></td>
              </tr>
              <tr>
                <td>New estimate:</td>
                <td><strong>$${budgetChange.new.toFixed(2)}</strong></td>
              </tr>
              <tr style="color: ${budgetDiffColor};">
                <td>Change:</td>
                <td><strong>${budgetDiff > 0 ? '+' : ''}$${budgetDiff.toFixed(2)}</strong></td>
              </tr>
            </table>
            <hr style="margin: 15px 0; border: none; border-top: 1px solid #ddd;">
            <table style="width: 100%;">
              <tr><td>Allocated:</td><td><strong>$${weeklyPlan.budget.allocated.toFixed(2)}</strong></td></tr>
              <tr><td>Total with buffer:</td><td><strong style="color: #4CAF50;">$${weeklyPlan.budget.totalWithBuffer.toFixed(2)}</strong></td></tr>
              <tr><td>Remaining:</td><td style="color: ${weeklyPlan.budget.remaining >= 0 ? '#4CAF50' : '#f44336'};"><strong>$${weeklyPlan.budget.remaining.toFixed(2)}</strong></td></tr>
            </table>
          </div>
          
          <h2 style="color: #333; border-bottom: 2px solid #ff9800; padding-bottom: 10px;">🛒 Cart Status</h2>
          <div style="background: ${cartUpdateResult.success ? '#e8f5e9' : '#fff3e0'}; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid ${cartUpdateResult.success ? '#4CAF50' : '#ff9800'};">
            ${cartUpdateResult.success 
              ? `<strong>✅ Cart updated successfully!</strong><br>
                 Items added: ${cartUpdateResult.itemsAdded}<br>
                 ${cartUpdateResult.itemsFailed?.length > 0 
                   ? `<small style="color: #f44336;">Failed items: ${cartUpdateResult.itemsFailed.length}</small>` 
                   : ''}`
              : `<strong>⚠️ Cart automation unavailable</strong><br>
                 <small>Please add items manually using the shopping list below, or use the Chrome extension.</small>`
            }
          </div>
          
          <h2 style="color: #333; border-bottom: 2px solid #ff9800; padding-bottom: 10px;">📅 Updated Meal Plan</h2>
          ${mealsHtml}
          
          <div style="background: #fff3e0; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ff9800;">
            <h3 style="margin-top: 0;">Reply Instructions</h3>
            <p>Reply to this email to make additional changes:</p>
            <ul>
              <li><strong>"approve"</strong> - Confirm the updated plan</li>
              <li><strong>"exclude [ingredient]"</strong> - Exclude another ingredient</li>
              <li><strong>"adjust [meal name]"</strong> - Request changes to a meal</li>
            </ul>
          </div>
          
          <hr style="margin: 30px 0;">
          <p style="color: #666; font-size: 14px;">
            <em>Marvin 🤖 - Dinner Automation System</em><br>
            <small>Updated: ${new Date().toLocaleString()}</small>
          </p>
        </body>
      </html>
    `;
  }

  /**
   * Main rebuild workflow
   */
  async run(exclusions) {
    this.log('========================================');
    this.log('MEAL PLAN REBUILD WORKFLOW STARTED');
    this.log('========================================');
    
    try {
      // Step 1: Rebuild meal plan
      const rebuildResult = this.rebuildMealPlan(exclusions);
      
      // Step 2: Clear existing cart (best effort)
      await this.clearHEBCart();
      
      // Step 3: Update HEB cart with new items
      let cartUpdateResult = await this.updateHEBCart(rebuildResult.weeklyPlan);
      
      // If cart automation failed, generate fallback list
      if (!cartUpdateResult.success) {
        const fallbackList = this.generateShoppingList(rebuildResult.weeklyPlan);
        cartUpdateResult.fallbackList = fallbackList;
      }
      
      // Step 4: Send update email
      const emailResult = await this.sendUpdateEmail(rebuildResult, cartUpdateResult);
      
      // Save rebuild summary
      const summary = {
        timestamp: new Date().toISOString(),
        exclusions: exclusions,
        rebuildResult,
        cartUpdateResult,
        emailResult,
        status: 'completed'
      };
      
      fs.writeFileSync(
        path.join(DATA_DIR, 'last-rebuild.json'),
        JSON.stringify(summary, null, 2)
      );
      
      this.log('========================================');
      this.log('MEAL PLAN REBUILD WORKFLOW COMPLETED');
      this.log('========================================');
      
      return summary;
      
    } catch (error) {
      this.log(`Workflow failed: ${error.message}`, 'error');
      this.log(error.stack);
      
      fs.writeFileSync(
        path.join(DATA_DIR, 'rebuild-error.json'),
        JSON.stringify({
          timestamp: new Date().toISOString(),
          error: error.message,
          stack: error.stack
        }, null, 2)
      );
      
      throw error;
    } finally {
      await this.emailClient.close();
    }
  }

  /**
   * Process pending exclusion actions from email monitor
   */
  async processPendingActions() {
    const stateFile = path.join(DATA_DIR, 'email-monitor-state.json');
    
    if (!fs.existsSync(stateFile)) {
      this.log('No pending actions found');
      return { processed: 0 };
    }
    
    const state = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
    const pendingActions = state.pendingActions?.filter(a => a.status === 'pending') || [];
    
    if (pendingActions.length === 0) {
      this.log('No pending actions to process');
      return { processed: 0 };
    }
    
    this.log(`Found ${pendingActions.length} pending actions`);
    
    // Filter for exclusion-related actions
    const exclusionActions = pendingActions.filter(a => 
      a.type === 'adjust' || a.type === 'remove_from_cart' || 
      (a.type === 'add_to_cart' && a.details)
    );
    
    if (exclusionActions.length === 0) {
      this.log('No exclusion-related actions found');
      return { processed: 0 };
    }
    
    // Extract exclusions from actions
    const exclusions = [];
    
    for (const action of exclusionActions) {
      if (action.type === 'add_to_cart' && action.items) {
        // Skip add actions for now (not exclusions)
        continue;
      }
      
      // Try to extract ingredient from details
      if (action.details) {
        if (Array.isArray(action.details)) {
          for (const detail of action.details) {
            if (detail.ingredient || detail.suggestedChange) {
              exclusions.push({
                ingredient: detail.ingredient || detail.suggestedChange,
                reason: 'exclusion_request',
                sourceEmail: action.source
              });
            }
          }
        }
      }
      
      // Mark action as processed
      action.status = 'processing';
    }
    
    if (exclusions.length === 0) {
      this.log('No exclusions extracted from actions');
      return { processed: 0 };
    }
    
    // Run rebuild workflow
    const result = await this.run(exclusions);
    
    // Mark actions as completed
    for (const action of exclusionActions) {
      if (action.status === 'processing') {
        action.status = 'completed';
        action.completedAt = new Date().toISOString();
      }
    }
    
    // Save updated state
    fs.writeFileSync(stateFile, JSON.stringify(state, null, 2));
    
    return {
      processed: exclusions.length,
      exclusions,
      result
    };
  }
}

// CLI usage
if (require.main === module) {
  const rebuilder = new MealPlanRebuilder();
  const args = process.argv.slice(2);
  
  if (args.includes('--process-pending')) {
    // Process pending actions from email monitor
    rebuilder.processPendingActions()
      .then(result => {
        console.log('\nProcessed pending actions:', result);
        process.exit(0);
      })
      .catch(err => {
        console.error('Failed to process pending actions:', err);
        process.exit(1);
      });
  } else if (args.includes('--exclusions')) {
    // Process specific exclusions
    const exclusionIndex = args.indexOf('--exclusions');
    const exclusionArg = args[exclusionIndex + 1];
    
    if (!exclusionArg) {
      console.error('Usage: node rebuild-meal-plan.js --exclusions "ingredient1,ingredient2"');
      process.exit(1);
    }
    
    const exclusions = rebuilder.parseExclusionRequests(exclusionArg);
    
    rebuilder.run(exclusions)
      .then(result => {
        console.log('\nRebuild complete!');
        console.log(`Exclusions: ${result.exclusions.length}`);
        console.log(`Substitutions: ${result.rebuildResult.substitutions.length}`);
        console.log(`Cart updated: ${result.cartUpdateResult.success}`);
        console.log(`Email sent: ${result.emailResult.success}`);
        process.exit(0);
      })
      .catch(err => {
        console.error('Rebuild failed:', err);
        process.exit(1);
      });
  } else {
    console.log('Meal Plan Rebuilder');
    console.log('');
    console.log('Usage:');
    console.log('  node rebuild-meal-plan.js --process-pending');
    console.log('  node rebuild-meal-plan.js --exclusions "chicken,beef"');
    console.log('');
    console.log('Options:');
    console.log('  --process-pending    Process pending exclusion actions from email replies');
    console.log('  --exclusions <list>  Process comma-separated list of exclusions');
  }
}

module.exports = { MealPlanRebuilder };
