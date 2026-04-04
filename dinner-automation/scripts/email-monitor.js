#!/usr/bin/env node
/**
 * Email Reply Monitor with Ingredient Exclusion Support
 * Runs hourly from 1pm-9pm to check for email replies
 * Uses iCloud IMAP to check for replies from dinner plan recipients
 * Handles ingredient exclusions and triggers meal plan rebuilds
 */

const fs = require('fs');
const path = require('path');
const { DinnerEmailClient } = require('./email-client');
const { ExcludeManager } = require('./exclude-manager');
const { SubstitutionEngine } = require('./substitution-engine');
const { MealPlanRebuilder } = require('./rebuild-meal-plan');
const { StockManager } = require('./stock-manager');
const { EmailReplyParser } = require('./email-reply-parser');

const DATA_DIR = path.join(__dirname, '..', 'data');
const LOGS_DIR = path.join(__dirname, '..', 'logs');

// Ensure directories exist
[DATA_DIR, LOGS_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

class EmailReplyMonitor {
  constructor() {
    this.logFile = path.join(LOGS_DIR, 'email-monitor.log');
    this.stateFile = path.join(DATA_DIR, 'email-monitor-state.json');
    this.emailClient = new DinnerEmailClient();
    this.excludeManager = new ExcludeManager();
    this.substitutionEngine = new SubstitutionEngine();
    this.mealPlanRebuilder = new MealPlanRebuilder();
    this.stockManager = new StockManager();
    this.recipients = ['alex@1v1a.com', 'sferrazzaa96@gmail.com'];
  }

  log(message) {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${message}\n`;
    console.log(message);
    fs.appendFileSync(this.logFile, logEntry);
  }

  loadState() {
    if (!fs.existsSync(this.stateFile)) {
      return {
        lastCheck: null,
        processedReplies: [],
        pendingActions: [],
        exclusionsAdded: []
      };
    }
    return JSON.parse(fs.readFileSync(this.stateFile, 'utf8'));
  }

  saveState(state) {
    fs.writeFileSync(this.stateFile, JSON.stringify(state, null, 2));
  }

  /**
   * Check if current time is within monitoring hours (1pm-9pm)
   */
  isWithinMonitoringHours() {
    const hour = new Date().getHours();
    return hour >= 13 && hour <= 21; // 1pm to 9pm
  }

  /**
   * Process stock items from email (already have / don't need)
   * @param {Object} reply - The parsed reply object
   * @param {string} fromEmail - The sender's email
   * @returns {Object} Processing result
   */
  async processStockItems(reply, fromEmail) {
    this.log(`Processing potential stock items from ${fromEmail}`);
    
    const results = {
      stockItemsAdded: [],
      alreadyInStock: [],
      totalInStock: 0
    };

    // Extract stock items from email text
    const stockItems = this.stockManager.extractStockItemsFromEmail(reply.text);
    
    if (stockItems.length === 0) {
      this.log('  No stock items detected in email');
      return results;
    }

    this.log(`  Detected ${stockItems.length} stock item(s): ${stockItems.map(s => s.ingredient).join(', ')}`);

    // Add each stock item
    for (const item of stockItems) {
      this.log(`  Adding to stock: ${item.ingredient} (${item.confidence} confidence)`);
      
      const addResult = this.stockManager.addToStock(item.ingredient);
      
      if (addResult.added) {
        results.stockItemsAdded.push(item.ingredient);
      } else {
        results.alreadyInStock.push(item.ingredient);
      }
    }

    results.totalInStock = this.stockManager.getStockList().length;
    
    this.log(`  Stock items added: ${results.stockItemsAdded.length}`);
    this.log(`  Total items in stock: ${results.totalInStock}`);

    return results;
  }

  /**
   * Process ingredient exclusion action
   * @param {Object} action - The exclusion action from email parsing
   * @param {string} fromEmail - The sender's email
   * @returns {Object} Processing result
   */
  async processIngredientExclusions(action, fromEmail) {
    this.log(`Processing ${action.exclusions.length} ingredient exclusion(s) from ${fromEmail}`);
    
    const results = {
      exclusionsAdded: [],
      substitutesFound: [],
      rebuildNeeded: false,
      rebuildResult: null
    };

    // Add each exclusion
    for (const exclusion of action.exclusions) {
      this.log(`  Adding exclusion: ${exclusion.ingredient} (${exclusion.reason})`);
      
      // Add to exclusion list
      const added = this.excludeManager.addExclusionFromEmail(
        exclusion.ingredient,
        exclusion.reason,
        fromEmail
      );
      
      results.exclusionsAdded.push({
        ingredient: exclusion.ingredient,
        reason: exclusion.reason,
        addedAt: added.addedAt
      });

      // Find and assign substitute
      const substitute = this.substitutionEngine.getBestSubstitute(exclusion.ingredient);
      if (substitute) {
        this.excludeManager.updateSubstitute(exclusion.ingredient, substitute);
        results.substitutesFound.push({
          ingredient: exclusion.ingredient,
          substitute: substitute
        });
        this.log(`    Auto-assigned substitute: ${substitute}`);
      } else {
        this.log(`    No substitute found in database`);
      }
    }

    // Check if rebuild is needed
    const weeklyPlanPath = path.join(DATA_DIR, 'weekly-plan.json');
    if (fs.existsSync(weeklyPlanPath)) {
      const weeklyPlan = JSON.parse(fs.readFileSync(weeklyPlanPath, 'utf8'));
      
      // Check if any current meals are affected
      let affectedMeals = 0;
      for (const meal of weeklyPlan.meals) {
        const checkResult = this.excludeManager.checkMealForExcludedIngredients(meal);
        if (checkResult.hasExcluded) {
          affectedMeals++;
          this.log(`  Affected meal: ${meal.name}`);
        }
      }

      if (affectedMeals > 0) {
        this.log(`  ${affectedMeals} meal(s) affected - triggering rebuild...`);
        results.rebuildNeeded = true;
        
        try {
          results.rebuildResult = await this.mealPlanRebuilder.run({
            strategy: 'mixed',
            forceRegenerate: true
          });
          
          if (results.rebuildResult.success) {
            this.log(`  Rebuild successful! ${results.rebuildResult.rebuild.changesCount} changes made.`);
            
            // Send notification about the changes
            await this.sendExclusionNotification(fromEmail, results);
          } else {
            this.log(`  Rebuild failed: ${results.rebuildResult.error}`, 'error');
          }
        } catch (error) {
          this.log(`  Rebuild error: ${error.message}`, 'error');
          results.rebuildError = error.message;
        }
      } else {
        this.log(`  No current meals affected by these exclusions`);
      }
    }

    return results;
  }

  /**
   * Send notification about exclusions and rebuild
   */
  async sendExclusionNotification(sourceEmail, results) {
    try {
      const { DinnerEmailClient } = require('./email-client');
      const client = new DinnerEmailClient();
      
      const exclusionsList = results.exclusionsAdded
        .map(e => {
          const sub = results.substitutesFound.find(s => s.ingredient === e.ingredient);
          return `• ${e.ingredient}${sub ? ` (substitute: ${sub.substitute})` : ''}`;
        })
        .join('\n');

      let changesText = '';
      if (results.rebuildResult?.rebuild?.changes?.length > 0) {
        changesText = '\n\n**Meal Plan Changes:**\n';
        changesText += results.rebuildResult.rebuild.changes.map(c => 
          `• ${c.day}: ${c.type === 'replaced' ? `${c.original} → ${c.replacement}` : `Modified ${c.original}`}`
        ).join('\n');
      }

      const subject = 'Ingredient Exclusions Applied - Meal Plan Updated';
      const textBody = `Your ingredient exclusion requests have been processed.

**Exclusions Added:**
${exclusionsList}

These ingredients will be avoided in all future meal plans.${changesText}

---
Dinner Automation System`;

      const htmlBody = `
        <html>
          <body style="font-family: Arial, sans-serif; max-width: 600px;">
            <h2 style="color: #4CAF50;">🚫 Ingredient Exclusions Applied</h2>
            <p>Your ingredient exclusion requests have been processed.</p>
            
            <div style="background: #ffebee; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0;">Excluded Ingredients:</h3>
              <ul>
                ${results.exclusionsAdded.map(e => {
                  const sub = results.substitutesFound.find(s => s.ingredient === e.ingredient);
                  return `<li><strong>${e.ingredient}</strong>${sub ? ` → using <em>${sub.substitute}</em>` : ''} <span style="color: #666;">(${e.reason})</span></li>`;
                }).join('')}
              </ul>
            </div>
            
            <p>These ingredients will be avoided in all future meal plans.</p>
            
            ${results.rebuildResult?.rebuild?.changes?.length > 0 ? `
            <div style="background: #e3f2fd; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0;">🔄 Meal Plan Updated</h3>
              <p>The following changes were made to this week's meal plan:</p>
              <ul>
                ${results.rebuildResult.rebuild.changes.map(c => `
                  <li><strong>${c.day}:</strong> ${c.type === 'replaced' ? 
                    `"${c.original}" replaced with "${c.replacement}"` : 
                    `Modified "${c.original}" with ingredient substitutions`}
                  </li>
                `).join('')}
              </ul>
              <p>A new shopping list has been generated.</p>
            </div>
            ` : ''}
            
            <hr>
            <p style="color: #666; font-size: 14px;">
              <em>Dinner Automation System</em>
            </p>
          </body>
        </html>
      `;

      // Send to both recipients
      for (const recipient of this.recipients) {
        try {
          await client.emailClient.initSMTP();
          await client.emailClient.transporter.sendMail({
            from: {
              name: 'Marvin Dinner Bot',
              address: 'MarvinMartian9@icloud.com'
            },
            to: recipient,
            subject: subject,
            text: textBody,
            html: htmlBody
          });
          this.log(`  Notification sent to ${recipient}`);
        } catch (err) {
          this.log(`  Failed to notify ${recipient}: ${err.message}`);
        }
      }
      
      await client.close();
    } catch (error) {
      this.log(`  Failed to send notification: ${error.message}`);
    }
  }

  /**
   * Check for email replies and process them
   */
  async checkForReplies() {
    this.log('========================================');
    this.log('EMAIL REPLY MONITOR STARTED');
    this.log('========================================');
    
    const state = this.loadState();
    const now = new Date();
    
    // Calculate 'since' date (last check or 24 hours ago)
    const since = state.lastCheck 
      ? new Date(state.lastCheck) 
      : new Date(now.getTime() - 24 * 60 * 60 * 1000);
    
    this.log(`Checking for replies since: ${since.toLocaleString()}`);
    
    try {
      // Connect to IMAP and fetch replies
      const replies = await this.emailClient.checkForReplies(since);
      
      this.log(`Found ${replies.length} new replies`);
      
      const processedReplies = [];
      const pendingActions = [];
      const exclusionResults = [];
      const stockResults = [];
      
      for (const reply of replies) {
        this.log(`Processing reply from: ${reply.fromEmail}`);
        this.log(`  Subject: ${reply.subject}`);
        this.log(`  Actions detected: ${reply.parsed.actions.map(a => a.type).join(', ') || 'none'}`);
        this.log(`  Sentiment: ${reply.parsed.sentiment}`);
        
        // Process stock items from this reply (even if not in actions)
        const stockResult = await this.processStockItems(reply, reply.fromEmail);
        if (stockResult.stockItemsAdded.length > 0 || stockResult.alreadyInStock.length > 0) {
          stockResults.push(stockResult);
        }
        
        processedReplies.push({
          messageId: reply.messageId,
          from: reply.fromEmail,
          date: reply.date,
          subject: reply.subject,
          actions: reply.parsed.actions,
          sentiment: reply.parsed.sentiment,
          processedAt: new Date().toISOString()
        });
        
        // Process each action
        for (const action of reply.parsed.actions) {
          pendingActions.push({
            id: `action-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            type: action.type,
            confidence: action.confidence,
            source: reply.fromEmail,
            details: action.details || action.items || action.exclusions || null,
            status: 'pending',
            createdAt: new Date().toISOString()
          });

          // Handle ingredient exclusions specially
          if (action.type === 'exclude_ingredient' && action.exclusions?.length > 0) {
            this.log(`  Processing ${action.exclusions.length} exclusion(s)...`);
            const result = await this.processIngredientExclusions(action, reply.fromEmail);
            exclusionResults.push(result);
          }
        }
        
        // Log adjustment details if present
        if (reply.parsed.actions.some(a => a.type === 'adjust' && a.details)) {
          const adjustAction = reply.parsed.actions.find(a => a.type === 'adjust');
          this.log(`  Adjustment details: ${JSON.stringify(adjustAction.details)}`);
        }
        
        // Log items to add if present
        if (reply.parsed.actions.some(a => a.type === 'add_to_cart' && a.items)) {
          const addAction = reply.parsed.actions.find(a => a.type === 'add_to_cart');
          this.log(`  Items to add: ${addAction.items.join(', ')}`);
        }

        // Log exclusions if present
        if (reply.parsed.actions.some(a => a.type === 'exclude_ingredient')) {
          const excludeAction = reply.parsed.actions.find(a => a.type === 'exclude_ingredient');
          this.log(`  Exclusions: ${excludeAction.exclusions.map(e => e.ingredient).join(', ')}`);
        }
      }
      
      // Update state
      state.lastCheck = now.toISOString();
      state.processedReplies = [...(state.processedReplies || []), ...processedReplies].slice(-100);
      state.pendingActions = [...(state.pendingActions || []), ...pendingActions];
      
      // Track exclusions added
      if (exclusionResults.length > 0) {
        state.exclusionsAdded = [...(state.exclusionsAdded || []), ...exclusionResults.map(r => ({
          timestamp: now.toISOString(),
          exclusions: r.exclusionsAdded,
          rebuildPerformed: r.rebuildNeeded
        }))].slice(-50);
      }
      
      this.saveState(state);
      
      // Save detailed check result
      const checkResult = {
        timestamp: now.toISOString(),
        repliesFound: replies.length,
        processedReplies,
        newActions: pendingActions.length,
        exclusionResults: exclusionResults,
        stockResults: stockResults,
        summary: this.generateSummary(replies, exclusionResults, stockResults)
      };
      
      fs.writeFileSync(
        path.join(DATA_DIR, 'last-email-check.json'),
        JSON.stringify(checkResult, null, 2)
      );
      
      // Save pending actions
      if (pendingActions.length > 0) {
        fs.writeFileSync(
          path.join(DATA_DIR, 'pending-actions.json'),
          JSON.stringify(state.pendingActions, null, 2)
        );
        this.log(`Saved ${pendingActions.length} pending actions`);
      }

      // Save exclusion results
      if (exclusionResults.length > 0) {
        fs.writeFileSync(
          path.join(DATA_DIR, 'last-exclusion-results.json'),
          JSON.stringify(exclusionResults, null, 2)
        );
      }

      // Save stock results
      if (stockResults.length > 0) {
        fs.writeFileSync(
          path.join(DATA_DIR, 'last-stock-results.json'),
          JSON.stringify(stockResults, null, 2)
        );
      }
      
      this.log('========================================');
      this.log('EMAIL REPLY MONITOR COMPLETED');
      this.log(`Replies found: ${replies.length}`);
      this.log(`New actions: ${pendingActions.length}`);
      this.log(`Exclusion requests: ${exclusionResults.length}`);
      this.log(`Stock items added: ${stockResults.reduce((sum, r) => sum + r.stockItemsAdded.length, 0)}`);
      this.log('========================================');
      
      return checkResult;
      
    } catch (error) {
      this.log(`ERROR: ${error.message}`);
      this.log(error.stack);
      
      // Save error state
      fs.writeFileSync(
        path.join(DATA_DIR, 'email-monitor-error.json'),
        JSON.stringify({
          timestamp: now.toISOString(),
          error: error.message,
          stack: error.stack
        }, null, 2)
      );
      
      throw error;
    } finally {
      // Close email client connection
      await this.emailClient.close();
    }
  }

  /**
   * Generate a summary of the check
   */
  generateSummary(replies, exclusionResults, stockResults) {
    const summary = {
      approvals: 0,
      rejections: 0,
      adjustments: 0,
      addToCart: 0,
      exclusions: 0,
      other: 0,
      exclusionsAdded: exclusionResults.reduce((sum, r) => sum + r.exclusionsAdded.length, 0),
      mealsRebuilt: exclusionResults.filter(r => r.rebuildNeeded).length,
      stockItemsAdded: stockResults.reduce((sum, r) => sum + r.stockItemsAdded.length, 0),
      bySender: {}
    };
    
    for (const reply of replies) {
      const sender = reply.fromEmail;
      if (!summary.bySender[sender]) {
        summary.bySender[sender] = { count: 0, actions: [] };
      }
      summary.bySender[sender].count++;
      
      for (const action of reply.parsed.actions) {
        summary.bySender[sender].actions.push(action.type);
        
        switch (action.type) {
          case 'approve':
            summary.approvals++;
            break;
          case 'reject':
            summary.rejections++;
            break;
          case 'adjust':
            summary.adjustments++;
            break;
          case 'add_to_cart':
            summary.addToCart++;
            break;
          case 'exclude_ingredient':
            summary.exclusions++;
            break;
          default:
            summary.other++;
        }
      }
    }
    
    return summary;
  }

  /**
   * Get pending actions that need to be processed
   */
  getPendingActions() {
    const state = this.loadState();
    return state.pendingActions || [];
  }

  /**
   * Mark an action as completed
   */
  completeAction(actionId) {
    const state = this.loadState();
    const actionIndex = state.pendingActions.findIndex(a => a.id === actionId);
    
    if (actionIndex !== -1) {
      state.pendingActions[actionIndex].status = 'completed';
      state.pendingActions[actionIndex].completedAt = new Date().toISOString();
      this.saveState(state);
      return true;
    }
    return false;
  }

  /**
   * Main run method
   */
  async run() {
    // Check if within monitoring hours
    if (!this.isWithinMonitoringHours()) {
      const hour = new Date().getHours();
      this.log(`Outside monitoring hours (${hour}:00). Skipping check. (Monitor runs 1pm-9pm)`);
      return { skipped: true, reason: 'outside_hours' };
    }
    
    return await this.checkForReplies();
  }
}

// Run if called directly
if (require.main === module) {
  const monitor = new EmailReplyMonitor();
  monitor.run()
    .then(result => {
      if (!result.skipped) {
        console.log('\nMonitor completed successfully');
        console.log(`Replies found: ${result.repliesFound}`);
        console.log(`New actions: ${result.newActions}`);
        if (result.exclusionResults?.length > 0) {
          console.log(`Exclusion requests processed: ${result.exclusionResults.length}`);
        }
        if (result.stockResults?.length > 0) {
          const stockCount = result.stockResults.reduce((sum, r) => sum + r.stockItemsAdded.length, 0);
          console.log(`Stock items added: ${stockCount}`);
        }
      }
      process.exit(0);
    })
    .catch(err => {
      console.error('Monitor failed:', err);
      process.exit(1);
    });
}

module.exports = EmailReplyMonitor;