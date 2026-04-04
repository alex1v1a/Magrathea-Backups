/**
 * Job Queue - Queue-based job processing for automation tasks
 * 
 * Features:
 * - FIFO/LIFO queue support
 * - Priority queues
 * - Job retry with backoff
 * - Concurrent job limiting
 * - Job persistence
 * - Event-driven architecture
 */

const EventEmitter = require('events');
const fs = require('fs');
const path = require('path');

/**
 * Job status constants
 */
const JobStatus = {
  PENDING: 'pending',
  RUNNING: 'running',
  COMPLETED: 'completed',
  FAILED: 'failed',
  RETRYING: 'retrying',
  CANCELLED: 'cancelled'
};

/**
 * Job priority levels
 */
const JobPriority = {
  CRITICAL: 0,
  HIGH: 1,
  NORMAL: 2,
  LOW: 3
};

/**
 * Individual job representation
 */
class Job {
  constructor(data) {
    this.id = data.id || `job-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    this.type = data.type || 'default';
    this.payload = data.payload || {};
    this.priority = data.priority ?? JobPriority.NORMAL;
    this.status = JobStatus.PENDING;
    this.attempts = 0;
    this.maxAttempts = data.maxAttempts || 3;
    this.createdAt = Date.now();
    this.startedAt = null;
    this.completedAt = null;
    this.error = null;
    this.result = null;
    this.metadata = data.metadata || {};
  }

  /**
   * Mark job as running
   */
  start() {
    this.status = JobStatus.RUNNING;
    this.startedAt = Date.now();
    this.attempts++;
  }

  /**
   * Mark job as completed
   */
  complete(result) {
    this.status = JobStatus.COMPLETED;
    this.completedAt = Date.now();
    this.result = result;
  }

  /**
   * Mark job as failed
   */
  fail(error) {
    this.error = error.message || error.toString();
    
    if (this.attempts < this.maxAttempts) {
      this.status = JobStatus.RETRYING;
    } else {
      this.status = JobStatus.FAILED;
      this.completedAt = Date.now();
    }
  }

  /**
   * Mark job for retry
   */
  retry() {
    this.status = JobStatus.PENDING;
  }

  /**
   * Cancel job
   */
  cancel() {
    this.status = JobStatus.CANCELLED;
    this.completedAt = Date.now();
  }

  /**
   * Get job duration
   */
  getDuration() {
    if (!this.startedAt) return 0;
    const end = this.completedAt || Date.now();
    return end - this.startedAt;
  }

  /**
   * Serialize job to JSON
   */
  toJSON() {
    return {
      id: this.id,
      type: this.type,
      payload: this.payload,
      priority: this.priority,
      status: this.status,
      attempts: this.attempts,
      maxAttempts: this.maxAttempts,
      createdAt: this.createdAt,
      startedAt: this.startedAt,
      completedAt: this.completedAt,
      error: this.error,
      result: this.result,
      metadata: this.metadata
    };
  }

  /**
   * Create job from JSON
   */
  static fromJSON(data) {
    const job = new Job(data);
    job.status = data.status;
    job.attempts = data.attempts;
    job.startedAt = data.startedAt;
    job.completedAt = data.completedAt;
    job.error = data.error;
    job.result = data.result;
    return job;
  }
}

/**
 * Job Queue
 */
class JobQueue extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.name = options.name || 'default';
    this.concurrency = options.concurrency || 1;
    this.retryDelay = options.retryDelay || 5000;
    this.maxRetries = options.maxRetries || 3;
    this.persistPath = options.persistPath || null;
    
    this.queue = [];
    this.running = new Map();
    this.completed = [];
    this.handlers = new Map();
    this.isRunning = false;
    this.processInterval = null;
  }

  /**
   * Add job to queue
   */
  add(data) {
    const job = new Job({
      maxAttempts: this.maxRetries,
      ...data
    });
    
    // Insert based on priority
    const insertIndex = this.queue.findIndex(j => j.priority > job.priority);
    if (insertIndex === -1) {
      this.queue.push(job);
    } else {
      this.queue.splice(insertIndex, 0, job);
    }
    
    this.emit('job:added', job);
    this.save();
    
    return job;
  }

  /**
   * Add multiple jobs
   */
  addBatch(jobsData) {
    return jobsData.map(data => this.add(data));
  }

  /**
   * Register handler for job type
   */
  registerHandler(type, handler) {
    this.handlers.set(type, handler);
  }

  /**
   * Get next pending job
   */
  getNextJob() {
    return this.queue.find(j => j.status === JobStatus.PENDING);
  }

  /**
   * Process single job
   */
  async processJob(job) {
    const handler = this.handlers.get(job.type);
    
    if (!handler) {
      job.fail(new Error(`No handler registered for job type: ${job.type}`));
      this.emit('job:error', job);
      return;
    }
    
    job.start();
    this.running.set(job.id, job);
    this.emit('job:started', job);
    
    try {
      const result = await handler(job.payload, job);
      job.complete(result);
      this.running.delete(job.id);
      this.completed.push(job);
      this.emit('job:completed', job);
    } catch (error) {
      job.fail(error);
      this.running.delete(job.id);
      
      if (job.status === JobStatus.RETRYING) {
        this.emit('job:retry', job);
        setTimeout(() => {
          job.retry();
          this.emit('job:retrying', job);
        }, this.retryDelay * job.attempts);
      } else {
        this.completed.push(job);
        this.emit('job:failed', job);
      }
    }
    
    this.save();
  }

  /**
   * Process queue
   */
  async process() {
    if (this.running.size >= this.concurrency) return;
    
    const job = this.getNextJob();
    if (!job) return;
    
    this.processJob(job);
  }

  /**
   * Start processing queue
   */
  start() {
    if (this.isRunning) return;
    
    this.isRunning = true;
    this.processInterval = setInterval(() => this.process(), 100);
    this.emit('started');
  }

  /**
   * Stop processing queue
   */
  stop() {
    this.isRunning = false;
    if (this.processInterval) {
      clearInterval(this.processInterval);
      this.processInterval = null;
    }
    this.emit('stopped');
  }

  /**
   * Pause (wait for running jobs to complete)
   */
  async pause() {
    this.stop();
    
    // Wait for running jobs
    while (this.running.size > 0) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    this.emit('paused');
  }

  /**
   * Cancel job by ID
   */
  cancel(jobId) {
    // Cancel if pending
    const pendingIndex = this.queue.findIndex(j => j.id === jobId);
    if (pendingIndex >= 0) {
      this.queue[pendingIndex].cancel();
      this.emit('job:cancelled', this.queue[pendingIndex]);
      return true;
    }
    
    // Cannot cancel running jobs
    return false;
  }

  /**
   * Get job by ID
   */
  getJob(jobId) {
    return (
      this.queue.find(j => j.id === jobId) ||
      this.running.get(jobId) ||
      this.completed.find(j => j.id === jobId)
    );
  }

  /**
   * Get queue statistics
   */
  getStats() {
    const pending = this.queue.filter(j => j.status === JobStatus.PENDING).length;
    const retrying = this.queue.filter(j => j.status === JobStatus.RETRYING).length;
    
    return {
      pending,
      retrying,
      running: this.running.size,
      completed: this.completed.filter(j => j.status === JobStatus.COMPLETED).length,
      failed: this.completed.filter(j => j.status === JobStatus.FAILED).length,
      cancelled: this.completed.filter(j => j.status === JobStatus.CANCELLED).length,
      total: this.queue.length + this.running.size + this.completed.length
    };
  }

  /**
   * Clear completed jobs
   */
  clearCompleted() {
    this.completed = [];
    this.save();
  }

  /**
   * Save queue state to disk
   */
  save() {
    if (!this.persistPath) return;
    
    try {
      const data = {
        queue: this.queue.map(j => j.toJSON()),
        completed: this.completed.slice(-100).map(j => j.toJSON())
      };
      
      fs.writeFileSync(this.persistPath, JSON.stringify(data, null, 2));
    } catch (error) {
      this.emit('save:error', error);
    }
  }

  /**
   * Load queue state from disk
   */
  load() {
    if (!this.persistPath || !fs.existsSync(this.persistPath)) return;
    
    try {
      const data = JSON.parse(fs.readFileSync(this.persistPath, 'utf8'));
      
      this.queue = data.queue
        .filter(j => j.status === JobStatus.PENDING || j.status === JobStatus.RETRYING)
        .map(j => Job.fromJSON(j));
      
      this.completed = (data.completed || [])
        .map(j => Job.fromJSON(j));
      
      this.emit('loaded');
    } catch (error) {
      this.emit('load:error', error);
    }
  }

  /**
   * Get all jobs as JSON
   */
  toJSON() {
    return {
      name: this.name,
      stats: this.getStats(),
      queue: this.queue.map(j => j.toJSON()),
      running: Array.from(this.running.values()).map(j => j.toJSON()),
      completed: this.completed.map(j => j.toJSON())
    };
  }
}

module.exports = {
  JobQueue,
  Job,
  JobStatus,
  JobPriority
};
