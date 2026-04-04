#!/usr/bin/env node
/**
 * Progress Tracking Utility for Marvin Dashboard
 * Used by all long-running tasks to report progress
 */

const fs = require('fs').promises;
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const PROGRESS_FILE = path.join(DATA_DIR, 'progress-tracker.json');

// Task status constants
const STATUS = {
  NOT_STARTED: 'not-started',
  IN_PROGRESS: 'in-progress',
  BLOCKED: 'blocked',
  COMPLETE: 'complete',
  FAILED: 'failed',
  CANCELLED: 'cancelled'
};

// Ensure progress tracker exists
async function ensureProgressFile() {
  try {
    await fs.access(PROGRESS_FILE);
  } catch {
    const defaultProgress = {
      version: '1.0.0',
      lastUpdated: new Date().toISOString(),
      activeTasks: [],
      completedTasks: [],
      taskDefinitions: {},
      stats: {
        totalTasksCompleted: 0,
        totalTasksFailed: 0,
        averageCompletionTime: 0,
        last24Hours: { completed: 0, failed: 0 }
      }
    };
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(PROGRESS_FILE, JSON.stringify(defaultProgress, null, 2));
  }
}

// Load progress tracker data
async function loadProgress() {
  await ensureProgressFile();
  const data = await fs.readFile(PROGRESS_FILE, 'utf8');
  return JSON.parse(data);
}

// Save progress tracker data
async function saveProgress(progress) {
  progress.lastUpdated = new Date().toISOString();
  await fs.writeFile(PROGRESS_FILE, JSON.stringify(progress, null, 2));
}

// Clean up old completed tasks (keep last 100)
async function cleanupCompletedTasks(progress) {
  const MAX_COMPLETED = 100;
  if (progress.completedTasks.length > MAX_COMPLETED) {
    progress.completedTasks = progress.completedTasks
      .sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt))
      .slice(0, MAX_COMPLETED);
  }
}

// Update 24-hour stats
function update24HourStats(progress) {
  const now = new Date();
  const last24h = new Date(now - 24 * 60 * 60 * 1000);
  
  const recentCompleted = progress.completedTasks.filter(
    t => new Date(t.completedAt) > last24h && t.status === STATUS.COMPLETE
  ).length;
  
  const recentFailed = progress.completedTasks.filter(
    t => new Date(t.completedAt) > last24h && t.status === STATUS.FAILED
  ).length;
  
  progress.stats.last24Hours = {
    completed: recentCompleted,
    failed: recentFailed
  };
}

/**
 * Start tracking a new task or update an existing one
 * @param {string} taskId - Unique task identifier
 * @param {string} name - Human-readable task name
 * @param {Object} options - Additional options
 * @returns {Promise<Object>} - The task object
 */
async function startTask(taskId, name, options = {}) {
  const progress = await loadProgress();
  const now = new Date().toISOString();
  
  // Remove existing active task with same ID
  progress.activeTasks = progress.activeTasks.filter(t => t.id !== taskId);
  
  const task = {
    id: taskId,
    name: name || taskId,
    description: options.description || '',
    category: options.category || 'general',
    status: STATUS.IN_PROGRESS,
    percentComplete: 0,
    currentStep: options.currentStep || 'Initializing...',
    steps: options.steps || [],
    currentStepIndex: 0,
    startedAt: now,
    lastUpdated: now,
    eta: options.eta || null,
    estimatedDuration: options.estimatedDuration || null,
    metadata: options.metadata || {},
    logs: []
  };
  
  progress.activeTasks.push(task);
  await saveProgress(progress);
  
  return task;
}

/**
 * Update task progress
 * @param {string} taskId - Task identifier
 * @param {number} percent - Percentage complete (0-100)
 * @param {string} currentStep - Current step description
 * @param {Object} options - Additional options
 * @returns {Promise<Object>} - Updated task
 */
async function updateProgress(taskId, percent, currentStep, options = {}) {
  const progress = await loadProgress();
  const task = progress.activeTasks.find(t => t.id === taskId);
  
  if (!task) {
    throw new Error(`Task ${taskId} not found. Call startTask() first.`);
  }
  
  task.percentComplete = Math.min(100, Math.max(0, percent));
  task.currentStep = currentStep || task.currentStep;
  task.lastUpdated = new Date().toISOString();
  
  if (options.stepIndex !== undefined) {
    task.currentStepIndex = options.stepIndex;
  }
  
  if (options.eta) {
    task.eta = options.eta;
  }
  
  if (options.metadata) {
    task.metadata = { ...task.metadata, ...options.metadata };
  }
  
  if (options.log) {
    task.logs.push({
      timestamp: new Date().toISOString(),
      message: options.log,
      level: options.logLevel || 'info'
    });
    // Keep only last 50 logs
    if (task.logs.length > 50) {
      task.logs = task.logs.slice(-50);
    }
  }
  
  await saveProgress(progress);
  return task;
}

/**
 * Mark a task as blocked (waiting for something)
 * @param {string} taskId - Task identifier
 * @param {string} reason - Why it's blocked
 * @param {Object} options - Additional options
 */
async function blockTask(taskId, reason, options = {}) {
  const progress = await loadProgress();
  const task = progress.activeTasks.find(t => t.id === taskId);
  
  if (!task) return null;
  
  task.status = STATUS.BLOCKED;
  task.blockedReason = reason;
  task.blockedAt = new Date().toISOString();
  task.lastUpdated = new Date().toISOString();
  
  if (options.log) {
    task.logs.push({
      timestamp: new Date().toISOString(),
      message: `BLOCKED: ${reason}`,
      level: 'warning'
    });
  }
  
  await saveProgress(progress);
  return task;
}

/**
 * Unblock a task and resume progress
 * @param {string} taskId - Task identifier
 * @param {string} reason - Why it's unblocked
 */
async function unblockTask(taskId, reason) {
  const progress = await loadProgress();
  const task = progress.activeTasks.find(t => t.id === taskId);
  
  if (!task) return null;
  
  task.status = STATUS.IN_PROGRESS;
  task.blockedReason = null;
  task.unblockedAt = new Date().toISOString();
  task.lastUpdated = new Date().toISOString();
  
  task.logs.push({
    timestamp: new Date().toISOString(),
    message: `UNBLOCKED: ${reason || 'Resuming'}`,
    level: 'info'
  });
  
  await saveProgress(progress);
  return task;
}

/**
 * Complete a task
 * @param {string} taskId - Task identifier
 * @param {Object} options - Additional options
 * @returns {Promise<Object>} - Completed task
 */
async function completeTask(taskId, options = {}) {
  const progress = await loadProgress();
  const taskIndex = progress.activeTasks.findIndex(t => t.id === taskId);
  
  if (taskIndex === -1) {
    throw new Error(`Task ${taskId} not found in active tasks`);
  }
  
  const task = progress.activeTasks[taskIndex];
  const now = new Date().toISOString();
  
  task.status = options.failed ? STATUS.FAILED : STATUS.COMPLETE;
  task.percentComplete = options.failed ? task.percentComplete : 100;
  task.completedAt = now;
  task.lastUpdated = now;
  
  if (options.result) {
    task.result = options.result;
  }
  
  if (options.error) {
    task.error = options.error;
    task.logs.push({
      timestamp: now,
      message: `ERROR: ${options.error}`,
      level: 'error'
    });
  }
  
  if (options.log) {
    task.logs.push({
      timestamp: now,
      message: options.log,
      level: options.failed ? 'error' : 'info'
    });
  }
  
  // Calculate duration
  const startedAt = new Date(task.startedAt);
  const completedAt = new Date(now);
  task.duration = completedAt - startedAt;
  
  // Move to completed tasks
  progress.activeTasks.splice(taskIndex, 1);
  progress.completedTasks.unshift(task);
  
  // Update stats
  if (options.failed) {
    progress.stats.totalTasksFailed++;
  } else {
    progress.stats.totalTasksCompleted++;
  }
  
  // Update average completion time
  const completedTasks = progress.completedTasks.filter(t => t.duration && t.status === STATUS.COMPLETE);
  if (completedTasks.length > 0) {
    const totalDuration = completedTasks.reduce((sum, t) => sum + t.duration, 0);
    progress.stats.averageCompletionTime = Math.round(totalDuration / completedTasks.length);
  }
  
  // Cleanup and update stats
  await cleanupCompletedTasks(progress);
  update24HourStats(progress);
  
  await saveProgress(progress);
  return task;
}

/**
 * Cancel a task
 * @param {string} taskId - Task identifier
 * @param {string} reason - Cancellation reason
 */
async function cancelTask(taskId, reason) {
  return completeTask(taskId, { failed: true, error: reason || 'Cancelled by user' });
}

/**
 * Get current progress for all tasks
 * @returns {Promise<Object>} - Progress tracker data
 */
async function getProgress() {
  return await loadProgress();
}

/**
 * Get a specific task's progress
 * @param {string} taskId - Task identifier
 * @returns {Promise<Object|null>} - Task or null if not found
 */
async function getTask(taskId) {
  const progress = await loadProgress();
  const activeTask = progress.activeTasks.find(t => t.id === taskId);
  if (activeTask) return activeTask;
  
  const completedTask = progress.completedTasks.find(t => t.id === taskId);
  return completedTask || null;
}

/**
 * Get all active tasks
 * @returns {Promise<Array>} - Array of active tasks
 */
async function getActiveTasks() {
  const progress = await loadProgress();
  return progress.activeTasks;
}

/**
 * Get all completed tasks
 * @param {number} limit - Maximum number of tasks to return
 * @returns {Promise<Array>} - Array of completed tasks
 */
async function getCompletedTasks(limit = 50) {
  const progress = await loadProgress();
  return progress.completedTasks.slice(0, limit);
}

/**
 * Get tasks by category
 * @param {string} category - Task category
 * @returns {Promise<Array>} - Array of tasks in category
 */
async function getTasksByCategory(category) {
  const progress = await loadProgress();
  const active = progress.activeTasks.filter(t => t.category === category);
  const completed = progress.completedTasks.filter(t => t.category === category);
  return [...active, ...completed];
}

/**
 * Get tasks by status
 * @param {string} status - Task status
 * @returns {Promise<Array>} - Array of tasks with status
 */
async function getTasksByStatus(status) {
  const progress = await loadProgress();
  if (['in-progress', 'blocked'].includes(status)) {
    return progress.activeTasks.filter(t => t.status === status);
  }
  return progress.completedTasks.filter(t => t.status === status);
}

/**
 * Add a log entry to a task
 * @param {string} taskId - Task identifier
 * @param {string} message - Log message
 * @param {string} level - Log level (info, warning, error)
 */
async function logTask(taskId, message, level = 'info') {
  const progress = await loadProgress();
  const task = progress.activeTasks.find(t => t.id === taskId);
  
  if (!task) return null;
  
  task.logs.push({
    timestamp: new Date().toISOString(),
    message,
    level
  });
  
  task.lastUpdated = new Date().toISOString();
  
  // Keep only last 50 logs
  if (task.logs.length > 50) {
    task.logs = task.logs.slice(-50);
  }
  
  await saveProgress(progress);
  return task;
}

/**
 * Format duration in human-readable format
 * @param {number} ms - Duration in milliseconds
 * @returns {string} - Formatted duration
 */
function formatDuration(ms) {
  if (!ms) return '0s';
  
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  }
  return `${seconds}s`;
}

/**
 * Calculate ETA based on progress
 * @param {Object} task - Task object
 * @returns {string|null} - Formatted ETA or null
 */
function calculateETA(task) {
  if (!task.startedAt || task.percentComplete <= 0) {
    return null;
  }
  
  const started = new Date(task.startedAt);
  const elapsed = Date.now() - started;
  const remainingPercent = 100 - task.percentComplete;
  const estimatedTotal = (elapsed / task.percentComplete) * 100;
  const remaining = estimatedTotal * (remainingPercent / 100);
  
  const eta = new Date(Date.now() + remaining);
  return eta.toISOString();
}

/**
 * Get progress summary for dashboard display
 * @returns {Promise<Object>} - Summary object
 */
async function getProgressSummary() {
  const progress = await loadProgress();
  
  const activeCount = progress.activeTasks.length;
  const blockedCount = progress.activeTasks.filter(t => t.status === STATUS.BLOCKED).length;
  const completed24h = progress.stats.last24Hours.completed;
  const failed24h = progress.stats.last24Hours.failed;
  
  // Calculate overall progress if there are active tasks
  let overallProgress = 0;
  if (activeCount > 0) {
    overallProgress = progress.activeTasks.reduce((sum, t) => sum + t.percentComplete, 0) / activeCount;
  }
  
  return {
    lastUpdated: progress.lastUpdated,
    activeTasks: activeCount,
    blockedTasks: blockedCount,
    completed24h,
    failed24h,
    overallProgress: Math.round(overallProgress),
    recentTasks: progress.completedTasks.slice(0, 5).map(t => ({
      id: t.id,
      name: t.name,
      status: t.status,
      duration: t.duration,
      completedAt: t.completedAt
    })),
    runningTasks: progress.activeTasks.map(t => ({
      id: t.id,
      name: t.name,
      status: t.status,
      percentComplete: t.percentComplete,
      currentStep: t.currentStep,
      startedAt: t.startedAt,
      eta: t.eta
    }))
  };
}

module.exports = {
  STATUS,
  startTask,
  updateProgress,
  completeTask,
  cancelTask,
  blockTask,
  unblockTask,
  getProgress,
  getTask,
  getActiveTasks,
  getCompletedTasks,
  getTasksByCategory,
  getTasksByStatus,
  logTask,
  formatDuration,
  calculateETA,
  getProgressSummary
};

// CLI usage for testing
if (require.main === module) {
  async function test() {
    console.log('Testing progress tracker...\n');
    
    // Start a test task
    const task = await startTask('test-task', 'Test Task', {
      description: 'Testing the progress tracking system',
      category: 'test',
      steps: ['Step 1', 'Step 2', 'Step 3']
    });
    console.log('Started task:', task.name);
    
    // Update progress
    await updateProgress('test-task', 33, 'Working on step 1', { log: 'Initialized' });
    console.log('Updated to 33%');
    
    await updateProgress('test-task', 66, 'Working on step 2', { log: 'Halfway done' });
    console.log('Updated to 66%');
    
    // Block the task
    await blockTask('test-task', 'Waiting for API response');
    console.log('Task blocked');
    
    // Unblock
    await unblockTask('test-task', 'API responded');
    console.log('Task unblocked');
    
    // Complete
    await completeTask('test-task', { result: { success: true } });
    console.log('Task completed');
    
    // Get summary
    const summary = await getProgressSummary();
    console.log('\nProgress Summary:');
    console.log(JSON.stringify(summary, null, 2));
  }
  
  test().catch(console.error);
}
