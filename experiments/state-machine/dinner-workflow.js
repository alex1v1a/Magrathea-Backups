/**
 * Dinner Workflow using State Machine
 * Integration example
 */

const { DinnerStateMachine, STATES } = require('./state-machine');

class DinnerWorkflow {
  constructor(options = {}) {
    this.sm = new DinnerStateMachine(options);
    this.setupHandlers();
  }

  setupHandlers() {
    // Handle state entry events
    this.sm.on('enter:planning', () => this.onPlanning());
    this.sm.on('enter:sending', () => this.onSending());
    this.sm.on('enter:sent', () => this.onSent());
    this.sm.on('enter:rebuilding', () => this.onRebuilding());
    this.sm.on('enter:confirmed', () => this.onConfirmed());
    this.sm.on('enter:failed', (data) => this.onFailed(data));
  }

  async onPlanning() {
    console.log('[Workflow] Generating meal plan...');
    // Simulate work
    await this.sleep(500);
    
    const plan = {
      meals: ['Salmon', 'Chicken Tikka', 'Beef Stir Fry'],
      estimatedCost: 185
    };
    
    this.sm.transition(STATES.SENDING, { plan });
  }

  async onSending() {
    console.log('[Workflow] Sending email...');
    await this.sleep(300);
    
    this.sm.transition(STATES.SENT, { 
      messageId: `msg-${Date.now()}`,
      sentAt: Date.now()
    });
  }

  async onSent() {
    console.log('[Workflow] Email sent, monitoring for opens/replies...');
    // In real implementation, would start monitoring
    
    // For demo, simulate reply after 2 seconds
    setTimeout(() => {
      if (this.sm.is(STATES.SENT) || this.sm.is(STATES.OPENED)) {
        this.sm.transition(STATES.REPLIED, { 
          replyContent: 'Can we skip the salmon?',
          exclusions: ['salmon']
        });
      }
    }, 2000);
  }

  async onRebuilding() {
    console.log('[Workflow] Rebuilding plan with exclusions...');
    await this.sleep(600);
    
    // Rebuild with substitutions
    this.sm.transition(STATES.SENDING, { 
      rebuilt: true,
      exclusions: this.sm.state.data.exclusions
    });
  }

  async onConfirmed() {
    console.log('[Workflow] Dinner plan confirmed for the week!');
  }

  async onFailed(data) {
    console.log('[Workflow] Failed:', this.sm.state.error);
    
    if (this.sm.state.attempts < 3) {
      console.log('[Workflow] Will retry automatically...');
    } else {
      console.log('[Workflow] Max retries reached. Manual intervention required.');
    }
  }

  // Start the workflow
  async start(weekOf) {
    this.sm.reset(weekOf);
    this.sm.transition(STATES.PLANNING, { weekOf });
  }

  // Simulate receiving a reply
  simulateReply(content, exclusions = []) {
    if (this.sm.is(STATES.SENT) || this.sm.is(STATES.OPENED)) {
      this.sm.transition(STATES.REPLIED, { replyContent: content, exclusions });
    }
  }

  // Simulate confirming the plan
  confirm() {
    if (this.sm.is(STATES.SENT) || this.sm.is(STATES.REPLIED)) {
      this.sm.transition(STATES.CONFIRMED);
    }
  }

  sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
  }
}

module.exports = { DinnerWorkflow };
