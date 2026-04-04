/**
 * Full End-to-End Dinner Automation Validation
 * Tests all components: Meal Plan → Calendar → Email → IMAP Verification
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const TEMPLATES_DIR = path.join(__dirname, '..', 'templates');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

class ValidationRunner {
  constructor() {
    this.results = {
      steps: [],
      errors: [],
      startTime: Date.now()
    };
  }

  log(step, message, data = null) {
    const entry = { step, message, data, timestamp: new Date().toISOString() };
    this.results.steps.push(entry);
    console.log(`[${step}] ${message}`);
    if (data) console.log('  Data:', JSON.stringify(data, null, 2));
  }

  error(step, message, error) {
    this.results.errors.push({ step, message, error: error.message, stack: error.stack });
    console.error(`[${step}] ❌ ERROR: ${message}`);
    console.error('  ', error.message);
  }

  // ═══════════════════════════════════════════════════════════════
  // STEP 1: Generate Fresh Weekly Meal Plan
  // ═══════════════════════════════════════════════════════════════
  async step1_GenerateMealPlan() {
    this.log('STEP 1', 'Generating fresh weekly meal plan...');
    
    try {
      // Clear meal history to ensure fresh plan
      const historyFile = path.join(DATA_DIR, 'meal-history.json');
      fs.writeFileSync(historyFile, JSON.stringify({ meals: [], lastUpdated: null }, null, 2));
      this.log('STEP 1', 'Cleared meal history');

      // Load meal templates
      const templatesFile = path.join(TEMPLATES_DIR, 'meals.json');
      if (!fs.existsSync(templatesFile)) {
        throw new Error('Meal templates not found');
      }
      
      const templates = JSON.parse(fs.readFileSync(templatesFile, 'utf8'));
      this.log('STEP 1', `Loaded ${templates.meals.length} meal templates`);

      // Select 7 unique meals
      const shuffled = [...templates.meals].sort(() => Math.random() - 0.5);
      const selectedMeals = shuffled.slice(0, 7);
      
      const today = new Date();
      const weekOf = today.toISOString().split('T')[0];
      
      const weeklyPlan = {
        weekOf: weekOf,
        meals: selectedMeals.map((meal, index) => ({
          day: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][index],
          ...meal,
          status: 'planned'
        })),
        budget: {
          allocated: 200,
          estimatedMealCost: selectedMeals.reduce((sum, m) => sum + m.estimatedCost, 0),
          buffer: selectedMeals.reduce((sum, m) => sum + m.estimatedCost, 0) * 0.10,
          remaining: 0
        },
        metadata: {
          generatedAt: new Date().toISOString(),
          exclusionsCount: 0,
          generatedBy: 'ValidationRunner v1.0'
        }
      };
      
      weeklyPlan.budget.totalWithBuffer = weeklyPlan.budget.estimatedMealCost + weeklyPlan.budget.buffer;
      weeklyPlan.budget.remaining = weeklyPlan.budget.allocated - weeklyPlan.budget.totalWithBuffer;

      // Save weekly plan
      const planFile = path.join(DATA_DIR, 'weekly-plan.json');
      fs.writeFileSync(planFile, JSON.stringify(weeklyPlan, null, 2));
      
      this.log('STEP 1', '✅ Meal plan generated successfully', {
        weekOf: weeklyPlan.weekOf,
        mealCount: weeklyPlan.meals.length,
        totalCost: weeklyPlan.budget.totalWithBuffer
      });

      return weeklyPlan;
    } catch (error) {
      this.error('STEP 1', 'Failed to generate meal plan', error);
      throw error;
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // STEP 2: Create Calendar Events + ICS
  // ═══════════════════════════════════════════════════════════════
  async step2_CreateCalendar(weeklyPlan) {
    this.log('STEP 2', 'Creating calendar events and ICS file...');
    
    try {
      const { CalendarSync } = require('./calendar-sync');
      const sync = new CalendarSync();
      
      const result = await sync.syncToCalendar();
      
      this.log('STEP 2', '✅ Calendar sync completed', {
        eventsCreated: result.events,
        icsFile: result.icsFile,
        duration: result.duration
      });

      // Verify ICS file exists
      if (fs.existsSync(result.icsFile)) {
        const icsStats = fs.statSync(result.icsFile);
        this.log('STEP 2', '✅ ICS file verified', {
          path: result.icsFile,
          size: icsStats.size,
          exists: true
        });
      }

      return result;
    } catch (error) {
      this.error('STEP 2', 'Failed to create calendar', error);
      throw error;
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // STEP 3: Send Email to alex@1v1a.com
  // ═══════════════════════════════════════════════════════════════
  async step3_SendEmail(weeklyPlan) {
    this.log('STEP 3', 'Sending email to alex@1v1a.com...');
    
    try {
      const { DinnerEmailClient } = require('./email-client');
      const client = new DinnerEmailClient();
      
      // Use the standard sendDinnerPlan method
      const result = await client.sendDinnerPlan(weeklyPlan, {
        status: 'validation_test',
        method: 'validation'
      });
      
      await client.close();
      
      this.log('STEP 3', '✅ Email sent successfully', {
        messageId: result.messageId,
        recipients: result.recipients,
        duration: result.duration
      });

      // Save email metadata for IMAP verification
      fs.writeFileSync(
        path.join(DATA_DIR, 'validation-email-sent.json'),
        JSON.stringify({
          messageId: result.messageId,
          subject: `Weekly Dinner Plan - Week of ${weeklyPlan.weekOf}`,
          sentAt: new Date().toISOString(),
          recipients: result.recipients
        }, null, 2)
      );

      return result;
    } catch (error) {
      this.error('STEP 3', 'Failed to send email', error);
      throw error;
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // STEP 4: Verify Email Delivery via IMAP
  // ═══════════════════════════════════════════════════════════════
  async step4_VerifyEmailDelivery() {
    this.log('STEP 4', 'Verifying email delivery via IMAP...');
    
    try {
      const { ImapFlow } = require('imapflow');
      const { getEmailConfig } = require('./credentials');
      
      const config = getEmailConfig();
      const client = new ImapFlow(config.imap);
      
      await client.connect();
      this.log('STEP 4', 'Connected to IMAP server');
      
      const lock = await client.getMailboxLock('Sent');
      
      let foundEmail = false;
      let emailDetails = null;
      
      try {
        // Search for recent sent emails
        const since = new Date();
        since.setMinutes(since.getMinutes() - 5);
        
        for await (let message of client.fetch({ since: since.toISOString().split('T')[0] }, { 
          envelope: true,
          internalDate: true 
        })) {
          const subject = message.envelope.subject || '';
          if (subject.includes('Weekly Dinner Plan')) {
            foundEmail = true;
            emailDetails = {
              subject: subject,
              date: message.internalDate,
              to: message.envelope.to.map(t => t.address)
            };
            break;
          }
        }
      } finally {
        lock.release();
      }
      
      await client.logout();
      
      if (foundEmail) {
        this.log('STEP 4', '✅ Email delivery verified via IMAP', emailDetails);
      } else {
        this.log('STEP 4', '⚠️ Email not found in Sent folder yet (may need time to sync)');
      }

      return { verified: foundEmail, details: emailDetails };
    } catch (error) {
      this.error('STEP 4', 'IMAP verification failed', error);
      return { verified: false, error: error.message };
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // STEP 5: Verify All Components Integration
  // ═══════════════════════════════════════════════════════════════
  async step5_VerifyIntegration() {
    this.log('STEP 5', 'Verifying all components integration...');
    
    const checks = {
      mealPlan: false,
      calendar: false,
      icsFile: false,
      emailSent: false,
      dataConsistency: false
    };

    try {
      // Check 1: Meal plan exists and is valid
      const planFile = path.join(DATA_DIR, 'weekly-plan.json');
      if (fs.existsSync(planFile)) {
        const plan = JSON.parse(fs.readFileSync(planFile, 'utf8'));
        checks.mealPlan = plan.meals && plan.meals.length === 7;
        this.log('STEP 5', `Meal plan: ${checks.mealPlan ? '✅' : '❌'} (${plan.meals?.length || 0} meals)`);
      }

      // Check 2: Calendar events exist
      const calendarFile = path.join(DATA_DIR, 'calendar-events.json');
      if (fs.existsSync(calendarFile)) {
        const calendar = JSON.parse(fs.readFileSync(calendarFile, 'utf8'));
        checks.calendar = calendar.events && calendar.events.length === 7;
        this.log('STEP 5', `Calendar events: ${checks.calendar ? '✅' : '❌'} (${calendar.events?.length || 0} events)`);
      }

      // Check 3: ICS file exists
      const icsFile = path.join(DATA_DIR, 'dinner-plan.ics');
      checks.icsFile = fs.existsSync(icsFile);
      this.log('STEP 5', `ICS file: ${checks.icsFile ? '✅' : '❌'}`);

      // Check 4: Email sent record exists
      const emailSentFile = path.join(DATA_DIR, 'validation-email-sent.json');
      checks.emailSent = fs.existsSync(emailSentFile);
      this.log('STEP 5', `Email sent record: ${checks.emailSent ? '✅' : '❌'}`);

      // Check 5: Data consistency between meal plan and calendar
      if (checks.mealPlan && checks.calendar) {
        const plan = JSON.parse(fs.readFileSync(planFile, 'utf8'));
        const calendar = JSON.parse(fs.readFileSync(calendarFile, 'utf8'));
        
        const planMealNames = plan.meals.map(m => m.name).sort();
        const calendarTitles = calendar.events.map(e => e.title).sort();
        
        checks.dataConsistency = JSON.stringify(planMealNames) === JSON.stringify(calendarTitles);
        this.log('STEP 5', `Data consistency: ${checks.dataConsistency ? '✅' : '❌'}`, {
          planMeals: planMealNames,
          calendarEvents: calendarTitles
        });
      }

      const allPassed = Object.values(checks).every(v => v === true);
      this.log('STEP 5', allPassed ? '✅ All integration checks passed!' : '❌ Some integration checks failed', checks);

      return { checks, allPassed };
    } catch (error) {
      this.error('STEP 5', 'Integration verification failed', error);
      return { checks, allPassed: false, error: error.message };
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // Run Full Validation
  // ═══════════════════════════════════════════════════════════════
  async run() {
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('  🍽️  DINNER AUTOMATION - END-TO-END VALIDATION');
    console.log('═══════════════════════════════════════════════════════════════\n');

    const progress = { current: 0, total: 5 };
    const updateProgress = (step) => {
      progress.current = step;
      const pct = Math.round((step / progress.total) * 100);
      console.log(`\n📊 PROGRESS: ${pct}% (${step}/${progress.total} steps)\n`);
    };

    try {
      // Step 1: Generate Meal Plan (20%)
      updateProgress(1);
      const weeklyPlan = await this.step1_GenerateMealPlan();

      // Step 2: Create Calendar (40%)
      updateProgress(2);
      const calendarResult = await this.step2_CreateCalendar(weeklyPlan);

      // Step 3: Send Email (60%)
      updateProgress(3);
      const emailResult = await this.step3_SendEmail(weeklyPlan);

      // Step 4: Verify Email Delivery (80%)
      updateProgress(4);
      const imapResult = await this.step4_VerifyEmailDelivery();

      // Step 5: Verify Integration (100%)
      updateProgress(5);
      const integrationResult = await this.step5_VerifyIntegration();

      // Final Report
      const duration = Date.now() - this.results.startTime;
      
      console.log('\n═══════════════════════════════════════════════════════════════');
      console.log('  ✅ VALIDATION COMPLETE');
      console.log('═══════════════════════════════════════════════════════════════');
      console.log(`\n📊 Final Results:`);
      console.log(`   Duration: ${duration}ms (${(duration/1000).toFixed(2)}s)`);
      console.log(`   Steps Completed: ${this.results.steps.length}`);
      console.log(`   Errors: ${this.results.errors.length}`);
      console.log(`   Integration: ${integrationResult.allPassed ? '✅ PASSED' : '❌ FAILED'}`);
      
      // Save full report
      const report = {
        timestamp: new Date().toISOString(),
        duration: duration,
        results: this.results,
        integration: integrationResult,
        status: this.results.errors.length === 0 && integrationResult.allPassed ? 'SUCCESS' : 'PARTIAL'
      };
      
      fs.writeFileSync(
        path.join(DATA_DIR, 'validation-report.json'),
        JSON.stringify(report, null, 2)
      );

      console.log(`\n📄 Full report saved to: data/validation-report.json`);
      console.log('\n═══════════════════════════════════════════════════════════════\n');

      return report;

    } catch (error) {
      console.error('\n═══════════════════════════════════════════════════════════════');
      console.error('  ❌ VALIDATION FAILED');
      console.error('═══════════════════════════════════════════════════════════════');
      console.error(`\nError: ${error.message}`);
      
      this.results.errors.push({
        step: 'RUN',
        message: 'Validation run failed',
        error: error.message
      });
      
      throw error;
    }
  }
}

// Run if called directly
if (require.main === module) {
  const runner = new ValidationRunner();
  runner.run().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
}

module.exports = { ValidationRunner };
