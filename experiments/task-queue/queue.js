/**
 * Task Queue System
 * Experiment 2: JSON-based task queue with worker processing
 */

const fs = require('fs');
const path = require('path');

class TaskQueue {
  constructor(options = {}) {
    this.queueDir = options.queueDir || path.join(__dirname, 'queue');
    this.ensureDirectories();
    
    this.maxRetries = options.maxRetries || 3;
    this.retryDelays = options.retryDelays || [5000, 15000, 30000]; // Exponential-ish
    this.maxConcurrent = options.maxConcurrent || 2;
    this.pollInterval = options.pollInterval || 5000; // 5 seconds
    
    this.running = false;
    this.activeTasks = new Map();
    this.handlers = new Map();
  }

  ensureDirectories() {
    ['pending', 'active', 'completed', 'failed'].forEach(dir => {
      const fullPath = path.join(this.queueDir, dir);
      if (!fs.existsSync(fullPath)) {
        fs.mkdirSync(fullPath, { recursive: true });
      }
    });
  }

  // Register a handler for a task type
  register(type, handler) {
    this.handlers.set(type, handler);
    console.log(`[Queue] Registered handler for: ${type}`);
  }

  // Add a task to the queue
  async enqueue(type, payload, options = {}) {
    const task = {
      id: this.generateId(),
      type,
      payload,
      priority: options.priority || 'normal', // urgent, normal, background
      scheduledAt: options.scheduledAt || Date.now(),
      maxRetries: options.maxRetries || this.maxRetries,
      createdAt: Date.now(),
      attempts: 0,
      status: 'pending'
    };

    const filePath = path.join(this.queueDir, 'pending', `${task.id}.json`);
    
    // Atomic write (write temp, then rename)
    const tempPath = `${filePath}.tmp`;
    fs.writeFileSync(tempPath, JSON.stringify(task, null, 2));
    fs.renameSync(tempPath, filePath);

    console.log(`[Queue] Enqueued: ${type} (${task.id})`);
    return task.id;
  }

  // Get next pending task (respects priority and schedule time)
  getNextTask() {
    const pendingDir = path.join(this.queueDir, 'pending');
    const files = fs.readdirSync(pendingDir).filter(f => f.endsWith('.json'));
    
    if (files.length === 0) return null;

    const tasks = files.map(f => {
      const content = fs.readFileSync(path.join(pendingDir, f), 'utf8');
      return JSON.parse(content);
    }).filter(t => t.scheduledAt <= Date.now()); // Only due tasks

    if (tasks.length === 0) return null;

    // Sort by priority, then by scheduled time
    const priorityOrder = { urgent: 0, normal: 1, background: 2 };
    tasks.sort((a, b) => {
      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return a.scheduledAt - b.scheduledAt;
    });

    return tasks[0];
  }

  // Claim a task (move from pending to active)
  claimTask(taskId) {
    const pendingPath = path.join(this.queueDir, 'pending', `${taskId}.json`);
    const activePath = path.join(this.queueDir, 'active', `${taskId}.json`);

    if (!fs.existsSync(pendingPath)) return null;

    try {
      const task = JSON.parse(fs.readFileSync(pendingPath, 'utf8'));
      task.status = 'active';
      task.startedAt = Date.now();

      fs.writeFileSync(activePath, JSON.stringify(task, null, 2));
      fs.unlinkSync(pendingPath);

      return task;
    } catch (e) {
      console.error(`[Queue] Failed to claim task ${taskId}:`, e.message);
      return null;
    }
  }

  // Complete a task
  completeTask(taskId, result) {
    const activePath = path.join(this.queueDir, 'active', `${taskId}.json`);
    const completedPath = path.join(this.queueDir, 'completed', `${taskId}.json`);

    if (!fs.existsSync(activePath)) return;

    const task = JSON.parse(fs.readFileSync(activePath, 'utf8'));
    task.status = 'completed';
    task.completedAt = Date.now();
    task.result = result;
    task.duration = task.completedAt - task.startedAt;

    fs.writeFileSync(completedPath, JSON.stringify(task, null, 2));
    fs.unlinkSync(activePath);

    console.log(`[Queue] Completed: ${task.type} (${taskId}) in ${task.duration}ms`);
  }

  // Fail a task (retry or permanent fail)
  failTask(taskId, error) {
    const activePath = path.join(this.queueDir, 'active', `${taskId}.json`);
    
    if (!fs.existsSync(activePath)) return;

    const task = JSON.parse(fs.readFileSync(activePath, 'utf8'));
    task.attempts++;
    task.lastError = error.message || error;

    if (task.attempts >= task.maxRetries) {
      // Permanent fail
      const failedPath = path.join(this.queueDir, 'failed', `${taskId}.json`);
      task.status = 'failed';
      task.failedAt = Date.now();
      fs.writeFileSync(failedPath, JSON.stringify(task, null, 2));
      fs.unlinkSync(activePath);
      console.log(`[Queue] Failed permanently: ${task.type} (${taskId}) after ${task.attempts} attempts`);
    } else {
      // Retry with delay
      const pendingPath = path.join(this.queueDir, 'pending', `${taskId}.json`);
      task.status = 'pending';
      const delay = this.retryDelays[Math.min(task.attempts - 1, this.retryDelays.length - 1)];
      task.scheduledAt = Date.now() + delay;
      fs.writeFileSync(pendingPath, JSON.stringify(task, null, 2));
      fs.unlinkSync(activePath);
      console.log(`[Queue] Retry scheduled: ${task.type} (${taskId}) in ${delay}ms (attempt ${task.attempts})`);
    }
  }

  // Execute a single task
  async executeTask(task) {
    const handler = this.handlers.get(task.type);
    if (!handler) {
      throw new Error(`No handler registered for task type: ${task.type}`);
    }

    console.log(`[Queue] Executing: ${task.type} (${task.id})`);
    return await handler(task.payload);
  }

  // Process one task
  async processOne() {
    if (this.activeTasks.size >= this.maxConcurrent) return false;

    const nextTask = this.getNextTask();
    if (!nextTask) return false;

    const task = this.claimTask(nextTask.id);
    if (!task) return false;

    this.activeTasks.set(task.id, task);

    // Execute async
    (async () => {
      try {
        const result = await this.executeTask(task);
        this.completeTask(task.id, result);
      } catch (error) {
        console.error(`[Queue] Task ${task.id} failed:`, error.message);
        this.failTask(task.id, error);
      } finally {
        this.activeTasks.delete(task.id);
      }
    })();

    return true;
  }

  // Start the worker loop
  start() {
    if (this.running) return;
    this.running = true;
    console.log('[Queue] Worker started');

    const loop = async () => {
      while (this.running) {
        try {
          await this.processOne();
        } catch (e) {
          console.error('[Queue] Error in processing loop:', e);
        }
        await new Promise(r => setTimeout(r, this.pollInterval));
      }
    };

    loop();
  }

  // Stop the worker
  stop() {
    this.running = false;
    console.log('[Queue] Worker stopped');
  }

  // Get queue statistics
  getStats() {
    const dirs = ['pending', 'active', 'completed', 'failed'];
    const stats = {};
    
    for (const dir of dirs) {
      const files = fs.readdirSync(path.join(this.queueDir, dir));
      stats[dir] = files.filter(f => f.endsWith('.json')).length;
    }

    stats.activeTasks = this.activeTasks.size;
    stats.running = this.running;
    
    return stats;
  }

  generateId() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

module.exports = { TaskQueue };
