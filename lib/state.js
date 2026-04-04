/**
 * State Management Module
 * Simple file-based state machine for tracking workflow progress
 * 
 * Usage: 
 *   const state = require('../lib/state');
 *   await state.init('dinner-plan');
 *   await state.transition('pending', 'sent');
 *   const current = await state.get();
 */

const fs = require('fs').promises;
const path = require('path');
const { readJson, writeJson, ensureDir } = require('./utils');

const STATE_DIR = path.join(process.cwd(), 'data', 'state');

// ============================================================================
// STATE MACHINE CLASS
// ============================================================================

class StateMachine {
  constructor(name) {
    this.name = name;
    this.stateFile = path.join(STATE_DIR, `${name}-state.json`);
    this.historyFile = path.join(STATE_DIR, `${name}-history.json`);
    this.data = null;
    this.transitions = new Map();
  }
  
  /**
   * Define allowed state transitions
   * @param {Object} transitions - Map of from state -> allowed to states
   */
  defineTransitions(transitions) {
    for (const [from, toStates] of Object.entries(transitions)) {
      this.transitions.set(from, Array.isArray(toStates) ? toStates : [toStates]);
    }
    return this;
  }
  
  /**
   * Initialize state machine
   * @param {string} initialState - Initial state
   * @param {Object} initialData - Initial data
   */
  async init(initialState = 'pending', initialData = {}) {
    await ensureDir(STATE_DIR);
    
    this.data = await readJson(this.stateFile, null);
    
    if (!this.data) {
      this.data = {
        state: initialState,
        data: initialData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        version: 1,
      };
      await this._save();
      await this._addToHistory('init', initialState, initialData);
    }
    
    return this.data;
  }
  
  /**
   * Get current state
   * @returns {Promise<Object>} Current state data
   */
  async get() {
    if (!this.data) {
      await this.init();
    }
    return this.data;
  }
  
  /**
   * Get just the state string
   * @returns {Promise<string>} Current state
   */
  async getState() {
    const data = await this.get();
    return data.state;
  }
  
  /**
   * Transition to new state
   * @param {string} fromState - Expected current state (for validation)
   * @param {string} toState - New state
   * @param {Object} updateData - Data to merge
   * @returns {Promise<boolean>} Success
   */
  async transition(fromState, toState, updateData = {}) {
    const current = await this.get();
    
    // Validate from state
    if (current.state !== fromState) {
      throw new Error(
        `Invalid transition: expected state '${fromState}' but current state is '${current.state}'`
      );
    }
    
    // Validate transition is allowed
    const allowed = this.transitions.get(fromState);
    if (allowed && !allowed.includes(toState)) {
      throw new Error(
        `Invalid transition: cannot transition from '${fromState}' to '${toState}'. ` +
        `Allowed: ${allowed.join(', ')}`
      );
    }
    
    // Perform transition
    const oldState = current.state;
    current.state = toState;
    current.data = { ...current.data, ...updateData };
    current.updatedAt = new Date().toISOString();
    current.version = (current.version || 0) + 1;
    
    await this._save();
    await this._addToHistory('transition', toState, { from: oldState, ...updateData });
    
    return true;
  }
  
  /**
   * Update data without changing state
   * @param {Object} updateData - Data to merge
   */
  async update(updateData) {
    const current = await this.get();
    current.data = { ...current.data, ...updateData };
    current.updatedAt = new Date().toISOString();
    await this._save();
    await this._addToHistory('update', current.state, updateData);
  }
  
  /**
   * Reset to initial state
   * @param {string} initialState - State to reset to
   * @param {Object} initialData - Data to reset with
   */
  async reset(initialState = 'pending', initialData = {}) {
    this.data = {
      state: initialState,
      data: initialData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: 1,
    };
    await this._save();
    await this._addToHistory('reset', initialState, initialData);
  }
  
  /**
   * Get transition history
   * @param {number} limit - Max entries to return
   * @returns {Promise<Array>} History entries
   */
  async getHistory(limit = 100) {
    const history = await readJson(this.historyFile, []);
    return history.slice(-limit);
  }
  
  /**
   * Check if in specific state
   * @param {string} state - State to check
   * @returns {Promise<boolean>}
   */
  async is(state) {
    const current = await this.get();
    return current.state === state;
  }
  
  /**
   * Check if state is one of allowed states
   * @param {string[]} states - Allowed states
   * @returns {Promise<boolean>}
   */
  async isOneOf(states) {
    const current = await this.get();
    return states.includes(current.state);
  }
  
  /**
   * Get time since last update
   * @returns {Promise<number>} Milliseconds
   */
  async getElapsedTime() {
    const current = await this.get();
    const updated = new Date(current.updatedAt);
    return Date.now() - updated.getTime();
  }
  
  // Private methods
  async _save() {
    await writeJson(this.stateFile, this.data);
  }
  
  async _addToHistory(action, state, data) {
    const history = await readJson(this.historyFile, []);
    history.push({
      timestamp: new Date().toISOString(),
      action,
      state,
      data,
    });
    // Keep last 1000 entries
    if (history.length > 1000) {
      history.splice(0, history.length - 1000);
    }
    await writeJson(this.historyFile, history);
  }
}

// ============================================================================
// STATE MACHINE FACTORY
// ============================================================================

const machines = new Map();

/**
 * Get or create state machine instance
 * @param {string} name - State machine name
 * @returns {StateMachine}
 */
function getMachine(name) {
  if (!machines.has(name)) {
    machines.set(name, new StateMachine(name));
  }
  return machines.get(name);
}

/**
 * Remove state machine instance
 * @param {string} name - State machine name
 */
function removeMachine(name) {
  machines.delete(name);
}

// ============================================================================
// COMMON STATE MACHINES
// ============================================================================

/**
 * Create dinner plan state machine with predefined transitions
 * @returns {StateMachine}
 */
function createDinnerPlanMachine() {
  return getMachine('dinner-plan')
    .defineTransitions({
      'pending': ['generating'],
      'generating': ['sent', 'failed'],
      'sent': ['opened', 'replied', 'confirmed', 'expired'],
      'opened': ['replied', 'confirmed', 'expired'],
      'replied': ['confirmed', 'updating'],
      'updating': ['confirmed', 'failed'],
      'confirmed': ['syncing'],
      'syncing': ['completed', 'failed'],
      'completed': [],
      'failed': ['retrying'],
      'retrying': ['generating', 'failed'],
      'expired': ['sms-sent'],
      'sms-sent': ['replied', 'expired'],
    });
}

/**
 * Create HEB cart state machine
 * @returns {StateMachine}
 */
function createCartMachine() {
  return getMachine('heb-cart')
    .defineTransitions({
      'idle': ['loading'],
      'loading': ['ready', 'failed'],
      'ready': ['adding'],
      'adding': ['verifying', 'failed'],
      'verifying': ['confirmed', 'retrying'],
      'retrying': ['adding', 'failed'],
      'confirmed': ['adding', 'completed'],
      'completed': [],
      'failed': ['retrying', 'abandoned'],
    });
}

// ============================================================================
// MODULE EXPORTS
// ============================================================================

module.exports = {
  StateMachine,
  getMachine,
  removeMachine,
  createDinnerPlanMachine,
  createCartMachine,
};
