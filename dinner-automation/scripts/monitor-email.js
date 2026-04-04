#!/usr/bin/env node
/**
 * Email Reply Monitor
 * Runs every 15 minutes from 8am-10pm to check for email replies
 * Uses iCloud IMAP to check for replies from dinner plan recipients
 */

const fs = require('fs');
const path = require('path');
const { DinnerEmailClient } = require('./email-client');

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
        pendingActions: []
      };
    }
    return JSON.parse(fs.readFileSync(this.stateFile, 'utf8'));
  }

  saveState(state) {
    fs.writeFileSync(this.stateFile, JSON.stringify(state, null, 2));
  }

  /**
   * Check if current time is within monitoring hours (8am-10pm)
   */
  isWithinMonitoringHours() {
    const hour = new Date().getHours();
    return hour >= 8 && hour <= 22; // 8am to 10pm
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
      
      for (const reply of replies) {
        this.log(`Processing reply from: ${reply.fromEmail}`);
        this.log(`  Subject: ${reply.subject}`);
        this.log(`  Actions detected: ${reply.parsed.actions.map(a => a.type).join(', ') || 'none'}`);
        this.log(`  Sentiment: ${reply.parsed.sentiment}`);
        
        processedReplies.push({
          messageId: reply.messageId,
          from: reply.fromEmail,
          date: reply.date,
          subject: reply.subject,
          actions: reply.parsed.actions,
          sentiment: reply.parsed.sentiment,
          processedAt: new Date().toISOString()
        });
        
        // Add actions to pending queue
        for (const action of reply.parsed.actions) {
          pendingActions.push({
            id: `action-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            type: action.type,
            confidence: action.confidence,
            source: reply.fromEmail,
            details: action.details || action.items || null,
            status: 'pending',
            createdAt: new Date().toISOString()
          });
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
      }
      
      // Update state
      state.lastCheck = now.toISOString();
      state.processedReplies = [...(state.processedReplies || []), ...processedReplies].slice(-100); // Keep last 100
      state.pendingActions = [...(state.pendingActions || []), ...pendingActions];
      this.saveState(state);
      
      // Save detailed check result
      const checkResult = {
        timestamp: now.toISOString(),
        repliesFound: replies.length,
        processedReplies,
        newActions: pendingActions.length,
        summary: this.generateSummary(replies)
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
      
      this.log('========================================');
      this.log('EMAIL REPLY MONITOR COMPLETED');
      this.log(`Replies found: ${replies.length}`);
      this.log(`New actions: ${pendingActions.length}`);
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
  generateSummary(replies) {
    const summary = {
      approvals: 0,
      rejections: 0,
      adjustments: 0,
      addToCart: 0,
      other: 0,
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
      this.log(`Outside monitoring hours (${hour}:00). Skipping check. (Monitor runs 8am-10pm)`);
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
      }
      process.exit(0);
    })
    .catch(err => {
      console.error('Monitor failed:', err);
      process.exit(1);
    });
}

module.exports = EmailReplyMonitor;
