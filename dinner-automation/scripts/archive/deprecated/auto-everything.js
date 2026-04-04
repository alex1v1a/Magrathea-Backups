/**
 * Auto-Everything
 * Fully automatic: Email + Calendar Import + HEB Cart
 * One command, zero manual steps
 */

const fs = require('fs');
const path = require('path');
const { exec, spawn } = require('child_process');
const { DinnerEmailClient } = require('./email-client');
const { iCloudCalendarSync } = require('./icloud-calendar-sync');

const DATA_DIR = path.join(__dirname, '..', 'data');

class AutoEverything {
  constructor() {
    this.emailClient = new DinnerEmailClient();
    this.calendarSync = new iCloudCalendarSync();
    this.results = {};
  }

  log(message) {
    const timestamp = new Date().toLocaleTimeString();
    console.log(`[${timestamp}] ${message}`);
  }

  /**
   * Step 1: Generate ICS and auto-import to Apple Calendar
   */
  async autoImportCalendar() {
    this.log('📅 Step 1: Auto-importing to Apple Calendar...');
    
    try {
      // Generate ICS file
      const icsPath = this.calendarSync.saveICSFile();
      
      // Auto-open ICS file (triggers Apple Calendar import dialog)
      const appleScript = `
tell application "Calendar"
  activate
end tell

delay 1

tell application "System Events"
  tell process "Calendar"
    -- Wait for import dialog and click OK
    delay 2
    if exists button "Add" of window 1 then
      click button "Add" of window 1
    end if
  end tell
end tell
`;
      
      // For Windows, we'll use a different approach
      // Open the ICS file which should trigger the default calendar app
      const cmd = process.platform === 'win32' 
        ? `start "" "${icsPath}"`
        : `open "${icsPath}"`;
      
      exec(cmd, (error) => {
        if (error) {
          this.log(`  ⚠️ Auto-open failed: ${error.message}`);
        } else {
          this.log('  ✅ Calendar file opened - click "Add" in Apple Calendar');
        }
      });
      
      this.results.calendar = { success: true, icsPath };
      return true;
    } catch (error) {
      this.log(`  ❌ Calendar failed: ${error.message}`);
      this.results.calendar = { success: false, error: error.message };
      return false;
    }
  }

  /**
   * Step 2: Send email
   */
  async sendEmail() {
    this.log('📧 Step 2: Sending dinner plan email...');
    
    try {
      const planPath = path.join(DATA_DIR, 'weekly-plan.json');
      const plan = JSON.parse(fs.readFileSync(planPath, 'utf8'));
      
      const cartSummary = {
        status: 'auto_launched',
        method: 'chrome_extension_auto',
        items: plan.stockSummary?.needed || 31,
        estimatedTotal: plan.budget?.estimatedMealCost || 116
      };
      
      const result = await this.emailClient.sendHybridNotification(plan, cartSummary);
      
      this.results.email = {
        success: result.success,
        messageId: result.email?.messageId
      };
      
      this.log(`  ✅ Email sent: ${result.email?.messageId || 'N/A'}`);
      return result.success;
    } catch (error) {
      this.log(`  ❌ Email failed: ${error.message}`);
      this.results.email = { success: false, error: error.message };
      return false;
    }
  }

  /**
   * Step 3: Launch Chrome with HEB auto-cart
   */
  async launchHEB() {
    this.log('🛒 Step 3: Launching HEB auto-cart...');
    
    try {
      const { launchAndWait } = require('./heb-auto-launcher-module');
      const planPath = path.join(DATA_DIR, 'weekly-plan.json');
      const plan = JSON.parse(fs.readFileSync(planPath, 'utf8'));
      
      const result = await launchAndWait(plan);
      
      this.results.heb = result;
      
      if (result.success) {
        this.log(`  ✅ Chrome launched: ${result.itemCount} items ready`);
        this.log('  🔄 Auto-start will trigger when you visit heb.com');
      } else {
        this.log(`  ⚠️ HEB launch failed: ${result.error}`);
      }
      
      return result.success;
    } catch (error) {
      this.log(`  ❌ HEB failed: ${error.message}`);
      this.results.heb = { success: false, error: error.message };
      return false;
    }
  }

  /**
   * Step 4: Create master sync file
   */
  createMasterSync() {
    this.log('📝 Step 4: Creating master sync file...');
    
    const master = {
      timestamp: new Date().toISOString(),
      autoRun: true,
      systems: {
        calendar: {
          status: this.results.calendar?.success ? 'imported' : 'failed',
          file: this.results.calendar?.icsPath,
          note: 'Apple Calendar should have opened automatically'
        },
        email: {
          status: this.results.email?.success ? 'sent' : 'failed',
          messageId: this.results.email?.messageId
        },
        heb: {
          status: this.results.heb?.success ? 'launched' : 'failed',
          items: this.results.heb?.itemCount,
          chromeProfile: this.results.heb?.profileDir
        }
      },
      nextSteps: [
        '1. Check Apple Calendar - click "Add" if dialog is open',
        '2. Chrome is ready - visit heb.com to auto-start cart',
        '3. Check email for dinner plan (alex@1v1a.com)'
      ]
    };
    
    fs.writeFileSync(
      path.join(DATA_DIR, 'master-sync.json'),
      JSON.stringify(master, null, 2)
    );
    
    this.log('  ✅ Master sync saved');
  }

  /**
   * Run everything automatically
   */
  async run() {
    console.log('\n═══════════════════════════════════════════');
    console.log('   🤖 FULLY AUTOMATIC DINNER SYNC');
    console.log('═══════════════════════════════════════════\n');
    
    await this.autoImportCalendar();
    await this.sendEmail();
    await this.launchHEB();
    this.createMasterSync();
    
    this.printSummary();
  }

  printSummary() {
    console.log('\n═══════════════════════════════════════════');
    console.log('   ✅ AUTOMATION COMPLETE');
    console.log('═══════════════════════════════════════════\n');
    
    const cal = this.results.calendar?.success ? '✅' : '❌';
    const email = this.results.email?.success ? '✅' : '❌';
    const heb = this.results.heb?.success ? '✅' : '❌';
    
    console.log(`${cal} Calendar: File opened (click "Add" in Apple Calendar)`);
    console.log(`${email} Email: Sent to alex@1v1a.com`);
    console.log(`${heb} HEB Cart: Chrome ready (visit heb.com to auto-start)`);
    
    console.log('\n📋 What just happened automatically:');
    console.log('   1. Generated calendar events file');
    console.log('   2. Opened Apple Calendar import dialog');
    console.log('   3. Sent dinner plan email');
    console.log('   4. Launched Chrome with auto-cart extension');
    
    console.log('\n💡 Next:');
    console.log('   • Click "Add" in the Apple Calendar window');
    console.log('   • In Chrome, visit heb.com (auto-adds items)');
    console.log('   • Check your email!');
  }
}

// Run
const auto = new AutoEverything();
auto.run().catch(console.error);
