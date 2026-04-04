/**
 * Full Integration Test - Email + Calendar + HEB Cart
 * All systems sync together
 */

const fs = require('fs');
const path = require('path');
const { DinnerEmailClient } = require('./email-client');
const { CalendarSync } = require('./calendar-sync');
const { launch: launchHEB } = require('./heb-auto-launcher-module');

const DATA_DIR = path.join(__dirname, '..', 'data');

class FullIntegration {
  constructor() {
    this.emailClient = new DinnerEmailClient();
    this.calendar = new CalendarSync();
    this.results = {
      timestamp: new Date().toISOString(),
      email: null,
      calendar: null,
      heb: null,
      sync: null
    };
  }

  log(message) {
    const timestamp = new Date().toLocaleTimeString();
    console.log(`[${timestamp}] ${message}`);
  }

  /**
   * Step 1: Sync calendar with current meal plan
   */
  async syncCalendar() {
    this.log('📅 STEP 1: Syncing calendar...');
    
    try {
      const result = await this.calendar.syncToCalendar();
      this.results.calendar = { success: true, ...result };
      this.log('✅ Calendar synced');
      return result;
    } catch (error) {
      this.results.calendar = { success: false, error: error.message };
      this.log(`❌ Calendar failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Step 2: Send email with meal plan
   */
  async sendEmail() {
    this.log('📧 STEP 2: Sending dinner plan email...');
    
    try {
      // Load weekly plan
      const planPath = path.join(DATA_DIR, 'weekly-plan.json');
      const plan = JSON.parse(fs.readFileSync(planPath, 'utf8'));
      
      // Build cart summary for email
      const cartSummary = {
        status: 'ready',
        method: 'chrome_extension_auto',
        items: plan.stockSummary?.needed || 30,
        estimatedTotal: plan.budget?.estimatedMealCost || 116
      };
      
      // Send hybrid notification
      const result = await this.emailClient.sendHybridNotification(plan, cartSummary);
      
      this.results.email = {
        success: result.success,
        messageId: result.email?.messageId,
        recipients: ['alex@1v1a.com', 'sferrazzaa96@gmail.com']
      };
      
      this.log(`✅ Email sent: ${result.email?.messageId || 'N/A'}`);
      return result;
    } catch (error) {
      this.results.email = { success: false, error: error.message };
      this.log(`❌ Email failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Step 3: Launch HEB cart automation
   */
  async launchHEBCart() {
    this.log('🛒 STEP 3: Launching HEB cart automation...');
    
    try {
      const planPath = path.join(DATA_DIR, 'weekly-plan.json');
      const plan = JSON.parse(fs.readFileSync(planPath, 'utf8'));
      
      const result = await launchHEB(plan);
      
      this.results.heb = result;
      
      if (result.success) {
        this.log(`✅ HEB Chrome launched: ${result.itemCount} items ready`);
        this.log('   Chrome will auto-start when HEB.com loads');
      } else {
        this.log(`⚠️ HEB launch failed: ${result.error}`);
      }
      
      return result;
    } catch (error) {
      this.results.heb = { success: false, error: error.message };
      this.log(`❌ HEB failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Step 4: Create sync manifest for cross-system tracking
   */
  async createSyncManifest() {
    this.log('🔄 STEP 4: Creating sync manifest...');
    
    const manifest = {
      version: '1.0',
      createdAt: new Date().toISOString(),
      weekOf: this.getWeekOf(),
      systems: {
        email: {
          status: this.results.email?.success ? 'sent' : 'failed',
          messageId: this.results.email?.messageId,
          recipients: this.results.email?.recipients
        },
        calendar: {
          status: this.results.calendar?.success ? 'synced' : 'failed',
          events: this.results.calendar?.events || 0,
          file: 'calendar-events.json'
        },
        heb: {
          status: this.results.heb?.success ? 'launched' : 'failed',
          items: this.results.heb?.itemCount || 0,
          method: 'chrome_extension_auto'
        }
      },
      // This enables other systems to check status
      syncStatus: {
        allComplete: this.results.email?.success && 
                     this.results.calendar?.success && 
                     this.results.heb?.success,
        readyForUser: this.results.heb?.success,
        awaitingReplies: true
      }
    };
    
    const manifestPath = path.join(DATA_DIR, 'sync-manifest.json');
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
    
    this.results.sync = manifest;
    this.log('✅ Sync manifest created');
    
    return manifest;
  }

  /**
   * Get current week start date
   */
  getWeekOf() {
    const planPath = path.join(DATA_DIR, 'weekly-plan.json');
    if (fs.existsSync(planPath)) {
      const plan = JSON.parse(fs.readFileSync(planPath, 'utf8'));
      return plan.weekOf;
    }
    return new Date().toISOString().split('T')[0];
  }

  /**
   * Run full integration
   */
  async run() {
    console.log('\n═══════════════════════════════════════════');
    console.log('   🎯 FULL INTEGRATION TEST');
    console.log('   Email + Calendar + HEB Cart');
    console.log('═══════════════════════════════════════════\n');
    
    try {
      // Run all three systems
      await this.syncCalendar();
      await this.sendEmail();
      await this.launchHEBCart();
      await this.createSyncManifest();
      
      // Print summary
      this.printSummary();
      
      return { success: true, results: this.results };
    } catch (error) {
      console.log('\n❌ Integration failed:', error.message);
      this.printSummary();
      return { success: false, error: error.message, results: this.results };
    }
  }

  /**
   * Print summary table
   */
  printSummary() {
    console.log('\n═══════════════════════════════════════════');
    console.log('   📊 INTEGRATION SUMMARY');
    console.log('═══════════════════════════════════════════');
    console.log(`
┌─────────────┬──────────┬──────────────────────────────┐
│ System      │ Status   │ Details                      │
├─────────────┼──────────┼──────────────────────────────┤
│ 📅 Calendar │ ${this.results.calendar?.success ? '✅ SYNCED ' : '❌ FAILED '} │ ${this.results.calendar?.events || 0} events created            │
│ 📧 Email    │ ${this.results.email?.success ? '✅ SENT   ' : '❌ FAILED '} │ ${this.results.email?.recipients?.length || 0} recipients        │
│ 🛒 HEB Cart │ ${this.results.heb?.success ? '✅ LAUNCHED' : '❌ FAILED '} │ ${this.results.heb?.itemCount || 0} items ready               │
└─────────────┴──────────┴──────────────────────────────┘
`);

    const allSuccess = this.results.calendar?.success && 
                       this.results.email?.success && 
                       this.results.heb?.success;
    
    if (allSuccess) {
      console.log('✅ All systems in sync!');
      console.log('\n📋 Next steps:');
      console.log('   1. Chrome is open with HEB cart ready');
      console.log('   2. Calendar has 5 dinner events');
      console.log('   3. Email sent to alex@1v1a.com & sferrazzaa96@gmail.com');
      console.log('   4. Reply to email with exclusions to trigger updates');
    }
    
    console.log('\n📁 Sync manifest: data/sync-manifest.json');
  }
}

module.exports = { FullIntegration };

// CLI usage
if (require.main === module) {
  const integration = new FullIntegration();
  integration.run().then(result => {
    process.exit(result.success ? 0 : 1);
  });
}
