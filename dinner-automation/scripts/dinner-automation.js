#!/usr/bin/env node
/**
 * Dinner Plans Weekly Automation System
 * Runs every Sunday at 9:00 AM CST
 * 
 * Tasks:
 * 1. Generate weekly meal plan ($200 budget, 7 unique dinners)
 * 2. Build HEB.com cart with ingredients
 * 3. Send email summary via iCloud SMTP
 * 4. Set up monitoring schedules
 */

const fs = require('fs');
const path = require('path');
const { DinnerEmailClient } = require('./email-client');
const { HEBIntegration } = require('./heb-integration');
const { addItemsToHEBCart, hasHEBCredentials, generateShoppingList } = require('./heb-cart-automation');
const { StockManager } = require('./stock-manager');
const { MealPlanRebuilder } = require('./rebuild-meal-plan');
const EmailReplyMonitor = require('./monitor-email');

const DATA_DIR = path.join(__dirname, '..', 'data');
const TEMPLATES_DIR = path.join(__dirname, '..', 'templates');
const LOGS_DIR = path.join(__dirname, '..', 'logs');

// Ensure directories exist
[DATA_DIR, TEMPLATES_DIR, LOGS_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

class DinnerAutomation {
  constructor() {
    this.budget = 200;
    this.mealsPerWeek = 7;
    this.historyFile = path.join(DATA_DIR, 'meal-history.json');
    this.weeklyPlanFile = path.join(DATA_DIR, 'weekly-plan.json');
    this.logFile = path.join(LOGS_DIR, `dinner-${new Date().toISOString().split('T')[0]}.log`);
    
    this.recipients = [
      'alex@1v1a.com',
      'sferrazzaa96@gmail.com'
    ];
    
    this.emailClient = new DinnerEmailClient();
    this.stockManager = new StockManager();
  }

  log(message) {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${message}\n`;
    console.log(message);
    fs.appendFileSync(this.logFile, logEntry);
  }

  loadMealHistory() {
    if (!fs.existsSync(this.historyFile)) {
      return { meals: [], lastUpdated: null };
    }
    return JSON.parse(fs.readFileSync(this.historyFile, 'utf8'));
  }

  saveMealHistory(history) {
    fs.writeFileSync(this.historyFile, JSON.stringify(history, null, 2));
  }

  generateWeeklyMealPlan() {
    this.log('Generating weekly meal plan...');
    
    const history = this.loadMealHistory();
    const recentMeals = history.meals.slice(-100); // Last 100 meals
    const recentMealNames = new Set(recentMeals.map(m => m.name.toLowerCase()));
    
    // Load meal templates
    const mealTemplates = this.loadMealTemplates();
    
    // Filter out recent meals
    const availableMeals = mealTemplates.filter(m => 
      !recentMealNames.has(m.name.toLowerCase())
    );
    
    // Select 7 unique meals
    const selectedMeals = [];
    const usedCategories = new Set();
    
    // Shuffle available meals
    const shuffled = [...availableMeals].sort(() => Math.random() - 0.5);
    
    for (const meal of shuffled) {
      if (selectedMeals.length >= this.mealsPerWeek) break;
      
      // Try to get variety in categories
      if (!usedCategories.has(meal.category) || usedCategories.size >= 4) {
        selectedMeals.push(meal);
        usedCategories.add(meal.category);
      }
    }
    
    // If we don't have enough, fill with any available
    if (selectedMeals.length < this.mealsPerWeek) {
      for (const meal of shuffled) {
        if (selectedMeals.length >= this.mealsPerWeek) break;
        if (!selectedMeals.find(m => m.name === meal.name)) {
          selectedMeals.push(meal);
        }
      }
    }
    
    // Calculate costs
    const estimatedCost = selectedMeals.reduce((sum, m) => sum + m.estimatedCost, 0);
    const buffer = estimatedCost * 0.10; // 10% buffer
    const totalWithBuffer = estimatedCost + buffer;
    
    const weeklyPlan = {
      weekOf: new Date().toISOString().split('T')[0],
      meals: selectedMeals.map((meal, index) => ({
        day: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][index],
        ...meal,
        status: 'planned'
      })),
      budget: {
        allocated: this.budget,
        estimatedMealCost: estimatedCost,
        buffer: buffer,
        totalWithBuffer: totalWithBuffer,
        remaining: this.budget - totalWithBuffer
      },
      metadata: {
        generatedAt: new Date().toISOString(),
        exclusionsCount: recentMeals.length,
        generatedBy: 'DinnerAutomation v2.0'
      }
    };
    
    // Mark stock status on ingredients (none at start of week, but sets up the structure)
    const markedPlan = this.stockManager.markStockStatus(weeklyPlan);
    
    // Save weekly plan
    fs.writeFileSync(this.weeklyPlanFile, JSON.stringify(markedPlan, null, 2));
    
    // Update history
    history.meals.push(...selectedMeals.map(m => ({
      name: m.name,
      date: new Date().toISOString(),
      category: m.category
    })));
    history.lastUpdated = new Date().toISOString();
    this.saveMealHistory(history);
    
    this.log(`Generated meal plan with ${selectedMeals.length} meals`);
    this.log(`Estimated cost: $${estimatedCost.toFixed(2)} + $${buffer.toFixed(2)} buffer = $${totalWithBuffer.toFixed(2)}`);
    
    return weeklyPlan;
  }

  loadMealTemplates() {
    const templatesFile = path.join(TEMPLATES_DIR, 'meals.json');
    if (!fs.existsSync(templatesFile)) {
      this.log('Warning: No meal templates found. Creating default template.');
      this.createDefaultMealTemplates();
    }
    return JSON.parse(fs.readFileSync(templatesFile, 'utf8')).meals;
  }

  createDefaultMealTemplates() {
    const defaultMeals = {
      meals: [
        {
          name: "Grilled Salmon with Asparagus",
          category: "seafood",
          estimatedCost: 28,
          prepTime: "25 min",
          difficulty: "medium",
          healthy: true,
          ingredients: [
            { name: "Atlantic salmon fillets", amount: "1.5 lbs", hebSearch: "salmon fillet fresh" },
            { name: "Fresh asparagus", amount: "1 bunch", hebSearch: "asparagus fresh" },
            { name: "Lemon", amount: "2", hebSearch: "lemon" },
            { name: "Olive oil", amount: "1 bottle", hebSearch: "olive oil extra virgin" },
            { name: "Garlic", amount: "1 bulb", hebSearch: "garlic" }
          ]
        },
        {
          name: "Chicken Tikka Masala",
          category: "indian",
          estimatedCost: 22,
          prepTime: "45 min",
          difficulty: "medium",
          healthy: true,
          ingredients: [
            { name: "Chicken thighs", amount: "2 lbs", hebSearch: "chicken thighs boneless" },
            { name: "Greek yogurt", amount: "16 oz", hebSearch: "greek yogurt plain" },
            { name: "Heavy cream", amount: "1 pint", hebSearch: "heavy cream" },
            { name: "Basmati rice", amount: "2 lbs", hebSearch: "basmati rice" },
            { name: "Tikka masala sauce", amount: "1 jar", hebSearch: "tikka masala sauce" }
          ]
        },
        {
          name: "Beef Stir-Fry with Vegetables",
          category: "asian",
          estimatedCost: 24,
          prepTime: "20 min",
          difficulty: "easy",
          healthy: true,
          ingredients: [
            { name: "Flank steak", amount: "1.5 lbs", hebSearch: "flank steak" },
            { name: "Broccoli florets", amount: "2 heads", hebSearch: "broccoli" },
            { name: "Bell peppers", amount: "3", hebSearch: "bell peppers" },
            { name: "Soy sauce", amount: "1 bottle", hebSearch: "soy sauce low sodium" },
            { name: "Sesame oil", amount: "1 bottle", hebSearch: "sesame oil" }
          ]
        },
        {
          name: "Mediterranean Chicken Bowl",
          category: "mediterranean",
          estimatedCost: 26,
          prepTime: "30 min",
          difficulty: "easy",
          healthy: true,
          ingredients: [
            { name: "Chicken breast", amount: "2 lbs", hebSearch: "chicken breast boneless" },
            { name: "Cucumber", amount: "2", hebSearch: "cucumber" },
            { name: "Cherry tomatoes", amount: "1 pint", hebSearch: "tomatoes cherry" },
            { name: "Feta cheese", amount: "8 oz", hebSearch: "feta cheese" },
            { name: "Quinoa", amount: "2 lbs", hebSearch: "quinoa" },
            { name: "Hummus", amount: "10 oz", hebSearch: "hummus" }
          ]
        },
        {
          name: "Shrimp Tacos with Cabbage Slaw",
          category: "mexican",
          estimatedCost: 25,
          prepTime: "25 min",
          difficulty: "easy",
          healthy: true,
          ingredients: [
            { name: "Large shrimp", amount: "1.5 lbs", hebSearch: "shrimp large raw" },
            { name: "Corn tortillas", amount: "1 pack", hebSearch: "corn tortillas" },
            { name: "Red cabbage", amount: "1 head", hebSearch: "cabbage red" },
            { name: "Avocado", amount: "3", hebSearch: "avocado" },
            { name: "Lime", amount: "4", hebSearch: "lime" },
            { name: "Cilantro", amount: "1 bunch", hebSearch: "cilantro fresh" }
          ]
        },
        {
          name: "Pork Tenderloin with Roasted Vegetables",
          category: "american",
          estimatedCost: 23,
          prepTime: "45 min",
          difficulty: "medium",
          healthy: true,
          ingredients: [
            { name: "Pork tenderloin", amount: "1.5 lbs", hebSearch: "pork tenderloin" },
            { name: "Brussels sprouts", amount: "1.5 lbs", hebSearch: "brussels sprouts" },
            { name: "Sweet potatoes", amount: "2 lbs", hebSearch: "sweet potatoes" },
            { name: "Dijon mustard", amount: "1 jar", hebSearch: "dijon mustard" },
            { name: "Fresh rosemary", amount: "1 bunch", hebSearch: "rosemary fresh" }
          ]
        },
        {
          name: "Vegetable Curry with Chickpeas",
          category: "vegetarian",
          estimatedCost: 18,
          prepTime: "35 min",
          difficulty: "easy",
          healthy: true,
          ingredients: [
            { name: "Chickpeas", amount: "2 cans", hebSearch: "chickpeas" },
            { name: "Coconut milk", amount: "2 cans", hebSearch: "coconut milk" },
            { name: "Spinach", amount: "10 oz", hebSearch: "spinach fresh" },
            { name: "Curry paste", amount: "1 jar", hebSearch: "curry paste" },
            { name: "Naan bread", amount: "1 pack", hebSearch: "naan bread" }
          ]
        }
      ]
    };
    
    fs.writeFileSync(path.join(TEMPLATES_DIR, 'meals.json'), JSON.stringify(defaultMeals, null, 2));
    this.log('Created default meal templates');
  }

  async buildHEBCart(weeklyPlan) {
    this.log('Building HEB cart...');

    // Check if browser automation is available
    const canAutomate = hasHEBCredentials();

    if (canAutomate) {
      this.log('HEB credentials found, attempting browser automation...');

      try {
        // Try browser automation
        const automationResult = await addItemsToHEBCart(weeklyPlan, {
          headless: true,
          screenshotOnError: true
        });

        if (automationResult.success) {
          this.log(`✓ Browser automation successful! Added ${automationResult.itemsAdded} items`);

          return {
            status: 'completed',
            method: 'browser_automation',
            store: 'HEB Buda',
            itemsAdded: automationResult.itemsAdded,
            itemsFailed: automationResult.itemsFailed,
            estimatedTotal: weeklyPlan.budget?.estimatedMealCost || 0,
            duration: automationResult.duration,
            screenshots: automationResult.screenshots || [],
            createdAt: new Date().toISOString()
          };
        } else {
          this.log(`⚠ Browser automation partially failed: ${automationResult.itemsAdded} added, ${automationResult.itemsFailed.length} failed`);
          this.log('Falling back to shareable list...');
        }
      } catch (error) {
        this.log(`⚠ Browser automation error: ${error.message}`);
        this.log('Falling back to shareable list...');
      }
    } else {
      this.log('HEB credentials not found, using shareable list approach');
      this.log('To enable automatic cart population, set HEB_PASSWORD environment variable');
    }

    // Fallback to shareable list approach
    const hebIntegration = new HEBIntegration({
      dataDir: DATA_DIR,
      outputDir: DATA_DIR
    });

    const pkg = await hebIntegration.generateShoppingPackage(this.weeklyPlanFile);

    this.log(`✓ Generated HEB shopping package with ${pkg.shoppingList.metadata.totalItems} items`);
    this.log(`  HTML: ${pkg.files.html.filename}`);
    this.log(`  Markdown: ${pkg.files.markdown.filename}`);

    return {
      status: 'generated',
      method: 'shareable_list',
      store: 'HEB Buda',
      items: pkg.shoppingList.items,
      estimatedTotal: pkg.shoppingList.metadata.estimatedTotal,
      files: pkg.files,
      quickLinks: pkg.quickLinks,
      instructions: pkg.instructions,
      createdAt: new Date().toISOString()
    };
  }

  async sendEmailSummary(weeklyPlan, cartSummary) {
    this.log('Sending dinner plan notifications (Email + Discord backup)...');
    
    try {
      // Use hybrid notification - both email and Discord for redundancy
      const result = await this.emailClient.sendHybridNotification(weeklyPlan, cartSummary);
      
      // Log results
      if (result.email?.success) {
        this.log(`✓ Email notification sent to: ${this.recipients.join(', ')}`);
        this.log(`  Message ID: ${result.email.messageId}`);
        this.log(`  Note: Email accepted by SMTP, but may be filtered by iCloud/Gmail`);
      } else {
        this.log(`⚠ Email notification failed: ${result.email?.error || 'Unknown error'}`);
      }
      
      if (result.discord?.success) {
        this.log(`✓ Discord backup notification sent successfully`);
      } else if (!result.discord?.skipped) {
        this.log(`⚠ Discord notification failed: ${result.discord?.error || 'Unknown error'}`);
      }
      
      // Save notification data for reference
      const emailData = {
        from: 'MarvinMartian9@icloud.com',
        to: this.recipients,
        subject: `Weekly Dinner Plan - Week of ${weeklyPlan.weekOf}`,
        messageId: result.email?.messageId || null,
        sentAt: result.timestamp,
        status: result.success ? 'sent' : 'failed',
        emailSuccess: result.email?.success || false,
        discordSuccess: result.discord?.success || false,
        discordConfigured: !result.discord?.skipped,
        warning: 'Email may be filtered to spam. Discord used as backup.'
      };
      
      fs.writeFileSync(
        path.join(DATA_DIR, 'email-sent.json'),
        JSON.stringify(emailData, null, 2)
      );
      
      if (!result.success) {
        throw new Error('Both email and Discord notifications failed');
      }
      
      return emailData;
      
    } catch (error) {
      this.log(`✗ Failed to send notifications: ${error.message}`);
      
      // Save failed notification for retry
      const emailData = {
        from: 'MarvinMartian9@icloud.com',
        to: this.recipients,
        subject: `Weekly Dinner Plan - Week of ${weeklyPlan.weekOf}`,
        status: 'failed',
        error: error.message,
        failedAt: new Date().toISOString()
      };
      
      fs.writeFileSync(
        path.join(DATA_DIR, 'email-failed.json'),
        JSON.stringify(emailData, null, 2)
      );
      
      throw error;
    }
  }

  setupMonitoring() {
    this.log('Setting up monitoring schedules...');
    
    const monitoringConfig = {
      emailReplyMonitoring: {
        enabled: true,
        schedule: '0 13-21 * * *', // Every hour from 1pm-9pm
        description: 'Check for email replies to dinner plan via IMAP'
      },
      purchaseConfirmation: {
        enabled: true,
        schedule: '45 20 * * *', // Daily at 8:45pm
        description: 'Check for HEB purchase confirmation'
      },
      hebCartCheck: {
        enabled: true,
        schedule: '0 21 * * *', // Daily at 9:00pm
        description: 'Verify HEB cart status'
      },
      calendarUpdate: {
        enabled: true,
        schedule: '0 17 * * *', // Daily at 5:00pm
        description: 'Update iCloud Dinner calendar'
      },
      createdAt: new Date().toISOString()
    };
    
    fs.writeFileSync(
      path.join(DATA_DIR, 'monitoring-config.json'),
      JSON.stringify(monitoringConfig, null, 2)
    );
    
    this.log('Monitoring schedules configured:');
    this.log('  - Email reply check: hourly 1pm-9pm (IMAP)');
    this.log('  - Purchase confirmation: daily 8:45pm');
    this.log('  - HEB cart check: daily 9:00pm');
    this.log('  - Calendar update: daily 5:00pm');
    
    return monitoringConfig;
  }

  /**
   * Check for email replies and process exclusion requests
   * This is called by the email monitor cron job
   */
  async checkEmailReplies() {
    this.log('Checking for email replies...');
    
    const monitor = new EmailReplyMonitor();
    
    try {
      const result = await monitor.checkForReplies();
      
      if (result.repliesFound > 0) {
        this.log(`Found ${result.repliesFound} replies with ${result.newActions} actions`);
        
        // Check if there are exclusion-related actions
        const hasExclusions = result.processedReplies.some(reply => 
          reply.actions.some(action => 
            action.type === 'adjust' || 
            action.type === 'remove_from_cart' ||
            action.type === 'reject'
          )
        );
        
        if (hasExclusions) {
          this.log('Exclusion requests detected, triggering rebuild workflow...');
          return await this.processRebuildWorkflow();
        }
      }
      
      return { checked: true, repliesFound: result.repliesFound, triggeredRebuild: false };
      
    } catch (error) {
      this.log(`Email check failed: ${error.message}`, 'error');
      return { checked: false, error: error.message };
    } finally {
      await monitor.emailClient.close();
    }
  }

  /**
   * Process the rebuild workflow:
   * 1. Parse exclusion requests
   * 2. Rebuild meal plan with substitutions
   * 3. Clear existing HEB cart
   * 4. Add new items to HEB cart
   * 5. Send update email
   */
  async processRebuildWorkflow(exclusions = null) {
    this.log('========================================');
    this.log('REBUILD WORKFLOW STARTED');
    this.log('========================================');
    
    const rebuilder = new MealPlanRebuilder();
    
    try {
      // If no exclusions provided, process pending actions from email monitor
      if (!exclusions) {
        this.log('Processing pending exclusion actions...');
        const pendingResult = await rebuilder.processPendingActions();
        
        if (pendingResult.processed === 0) {
          this.log('No pending exclusions to process');
          return { processed: false, reason: 'no_pending_exclusions' };
        }
        
        return pendingResult;
      }
      
      // Otherwise, run with provided exclusions
      return await rebuilder.run(exclusions);
      
    } catch (error) {
      this.log(`Rebuild workflow failed: ${error.message}`, 'error');
      throw error;
    }
  }

  /**
   * Rebuild meal plan from specific exclusions
   * CLI entry point for manual rebuilds
   */
  async rebuildFromExclusions(exclusionList) {
    this.log(`Rebuilding from exclusions: ${exclusionList.join(', ')}`);
    
    const exclusions = exclusionList.map(ingredient => ({
      ingredient,
      reason: 'manual_request',
      source: 'cli'
    }));
    
    return await this.processRebuildWorkflow(exclusions);
  }

  async run() {
    this.log('========================================');
    this.log('DINNER AUTOMATION STARTED');
    this.log('========================================');
    
    // Clear stock list at start of new week
    const stockClearResult = this.stockManager.clearStock();
    this.log(stockClearResult.message);
    
    try {
      // Step 1: Generate meal plan
      const weeklyPlan = this.generateWeeklyMealPlan();
      
      // Step 2: Build HEB cart (placeholder)
      const cartSummary = await this.buildHEBCart(weeklyPlan);
      
      // Step 3: Send email summary via SMTP
      const emailData = await this.sendEmailSummary(weeklyPlan, cartSummary);
      
      // Step 4: Setup monitoring
      const monitoringConfig = this.setupMonitoring();
      
      // Save run summary
      const runSummary = {
        timestamp: new Date().toISOString(),
        weeklyPlan,
        cartSummary,
        emailData,
        monitoringConfig,
        stockCleared: stockClearResult.cleared,
        status: 'completed'
      };
      
      fs.writeFileSync(
        path.join(DATA_DIR, 'last-run.json'),
        JSON.stringify(runSummary, null, 2)
      );
      
      this.log('========================================');
      this.log('DINNER AUTOMATION COMPLETED SUCCESSFULLY');
      this.log('========================================');
      
      return runSummary;
      
    } catch (error) {
      this.log(`ERROR: ${error.message}`);
      this.log(error.stack);
      
      fs.writeFileSync(
        path.join(DATA_DIR, 'last-error.json'),
        JSON.stringify({
          timestamp: new Date().toISOString(),
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
}

// Run if called directly
if (require.main === module) {
  const automation = new DinnerAutomation();
  automation.run().catch(err => {
    console.error('Automation failed:', err);
    process.exit(1);
  });
}

module.exports = DinnerAutomation;
