/**
 * State Machine Pattern
 * Experiment 3: Dinner plan workflow with proper state transitions
 */

const fs = require('fs');
const path = require('path');
const EventEmitter = require('events');

// State definitions for dinner automation workflow
const STATES = {
  IDLE: 'idle',
  PLANNING: 'planning',       // Generating meal plan
  SENDING: 'sending',         // Email in progress
  SENT: 'sent',               // Email sent, monitoring
  OPENED: 'opened',           // Email opened by recipient
  REPLIED: 'replied',         // Reply received
  REBUILDING: 'rebuilding',   // Processing exclusions
  CONFIRMED: 'confirmed',     // Week finalized
  FAILED: 'failed'            // Needs manual intervention
};

// Valid state transitions
const TRANSITIONS = {
  [STATES.IDLE]: [STATES.PLANNING, STATES.FAILED],
  [STATES.PLANNING]: [STATES.SENDING, STATES.FAILED],
  [STATES.SENDING]: [STATES.SENT, STATES.FAILED],
  [STATES.SENT]: [STATES.OPENED, STATES.REPLIED, STATES.FAILED],
  [STATES.OPENED]: [STATES.REPLIED, STATES.CONFIRMED, STATES.FAILED],
  [STATES.REPLIED]: [STATES.REBUILDING, STATES.CONFIRMED, STATES.FAILED],
  [STATES.REBUILDING]: [STATES.SENDING, STATES.CONFIRMED, STATES.FAILED],
  [STATES.CONFIRMED]: [STATES.IDLE], // Ready for next week
  [STATES.FAILED]: [STATES.IDLE, STATES.PLANNING] // Can retry
};

class DinnerStateMachine extends EventEmitter {
  constructor(options = {}) {
    super();
    this.stateFile = options.stateFile || path.join(__dirname, 'dinner-state.json');
    this.historyFile = options.historyFile || path.join(__dirname, 'state-history.json');
    this.maxRetries = options.maxRetries || 3;
    
    this.state = this.loadState();
    this.ensureHistoryFile();
  }

  loadState() {
    if (fs.existsSync(this.stateFile)) {
      return JSON.parse(fs.readFileSync(this.stateFile, 'utf8'));
    }
    return this.getInitialState();
  }

  getInitialState() {
    return {
      current: STATES.IDLE,
      previous: null,
      enteredAt: Date.now(),
      attempts: 0,
      data: {},
      error: null,
      weekOf: null
    };
  }

  ensureHistoryFile() {
    if (!fs.existsSync(this.historyFile)) {
      fs.writeFileSync(this.historyFile, JSON.stringify({ transitions: [] }, null, 2));
    }
  }

  // Check if transition is valid
  canTransition(toState) {
    const validTransitions = TRANSITIONS[this.state.current] || [];
    return validTransitions.includes(toState);
  }

  // Perform state transition
  transition(toState, data = {}, error = null) {
    if (!this.canTransition(toState)) {
      const message = `Invalid transition: ${this.state.current} -> ${toState}`;
      this.emit('error', new Error(message));
      return false;
    }

    const previousState = this.state.current;
    
    // Update state
    this.state.previous = previousState;
    this.state.current = toState;
    this.state.enteredAt = Date.now();
    this.state.data = { ...this.state.data, ...data };
    this.state.error = error;

    if (toState === STATES.FAILED) {
      this.state.attempts++;
    }

    // Save to disk
    this.saveState();
    this.logTransition(previousState, toState, data);

    // Emit event
    this.emit('transition', { from: previousState, to: toState, data });
    this.emit(`enter:${toState}`, data);
    this.emit(`exit:${previousState}`, data);

    console.log(`[State] ${previousState} -> ${toState}`);
    return true;
  }

  saveState() {
    const tempFile = `${this.stateFile}.tmp`;
    fs.writeFileSync(tempFile, JSON.stringify(this.state, null, 2));
    fs.renameSync(tempFile, this.stateFile);
  }

  logTransition(from, to, data) {
    const history = JSON.parse(fs.readFileSync(this.historyFile, 'utf8'));
    history.transitions.push({
      from,
      to,
      timestamp: Date.now(),
      data: Object.keys(data)
    });
    
    // Keep only last 100 transitions
    if (history.transitions.length > 100) {
      history.transitions = history.transitions.slice(-100);
    }
    
    fs.writeFileSync(this.historyFile, JSON.stringify(history, null, 2));
  }

  // Get current state info
  getState() {
    return { ...this.state };
  }

  // Check if in a specific state
  is(state) {
    return this.state.current === state;
  }

  // Get time spent in current state
  getTimeInState() {
    return Date.now() - this.state.enteredAt;
  }

  // Reset to idle (new week)
  reset(weekOf = null) {
    this.state = this.getInitialState();
    if (weekOf) this.state.weekOf = weekOf;
    this.saveState();
    console.log(`[State] Reset to IDLE for week of ${weekOf || 'unknown'}`);
    this.emit('reset', { weekOf });
  }

  // Recovery: determine what to do after crash
  getRecoveryAction() {
    const timeInState = this.getTimeInState();
    const maxTimeInState = 600000; // 10 minutes

    // If stuck in a state too long, something went wrong
    if (timeInState > maxTimeInState && this.state.current !== STATES.IDLE) {
      return {
        action: 'retry',
        fromState: this.state.current,
        reason: 'timeout',
        canAutoRecover: this.canAutoRecover()
      };
    }

    // If failed and can retry
    if (this.state.current === STATES.FAILED && this.state.attempts < this.maxRetries) {
      return {
        action: 'retry',
        fromState: this.state.previous || STATES.IDLE,
        attempts: this.state.attempts,
        canAutoRecover: true
      };
    }

    // Continue from current state
    return {
      action: 'continue',
      currentState: this.state.current
    };
  }

  canAutoRecover() {
    // States we can safely retry automatically
    const autoRecoverable = [
      STATES.PLANNING,
      STATES.SENDING,
      STATES.REBUILDING
    ];
    return autoRecoverable.includes(this.state.current) || 
           (this.state.current === STATES.FAILED && this.state.attempts < this.maxRetries);
  }

  // Simulate recovery from current state
  async recover(handlers = {}) {
    const recovery = this.getRecoveryAction();
    console.log(`[State] Recovery: ${JSON.stringify(recovery)}`);

    if (recovery.action === 'retry' && recovery.canAutoRecover) {
      const handler = handlers[recovery.fromState];
      if (handler) {
        try {
          this.transition(recovery.fromState, { recovery: true });
          await handler(this.state.data);
          return { success: true, recovered: true };
        } catch (error) {
          this.transition(STATES.FAILED, {}, error.message);
          return { success: false, error };
        }
      }
    }

    return { success: false, recovery, message: 'Manual intervention required' };
  }

  // Generate Mermaid diagram of state machine
  generateDiagram() {
    let mermaid = 'stateDiagram-v2\n';
    
    for (const [from, toStates] of Object.entries(TRANSITIONS)) {
      for (const to of toStates) {
        mermaid += `    ${from} --> ${to}\n`;
      }
    }
    
    return mermaid;
  }
}

module.exports = { DinnerStateMachine, STATES, TRANSITIONS };
