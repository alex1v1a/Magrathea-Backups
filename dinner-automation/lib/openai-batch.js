/**
 * OpenAI Batch API Client
 * 
 * Implements batch processing for OpenAI API calls with 50% cost savings.
 * Queues requests and submits them as batches for non-real-time processing.
 * 
 * @module lib/openai-batch
 * @see https://developers.openai.com/api/docs/guides/batch/
 */

const fs = require('fs').promises;
const path = require('path');
const { logger } = require('./logger');

// Batch API configuration
const BATCH_CONFIG = {
  // OpenAI Batch API endpoint
  apiUrl: 'https://api.openai.com/v1/batches',
  // File upload endpoint for batch input
  filesUrl: 'https://api.openai.com/v1/files',
  // Maximum requests per batch (OpenAI limit)
  maxBatchSize: 50000,
  // Default model for batch requests
  defaultModel: 'gpt-4o-mini',
  // Queue file path
  queuePath: path.join(process.cwd(), 'data', 'openai-batch-queue.jsonl'),
  // Process queue every N minutes
  processIntervalMinutes: 60,
  // Results retention (days)
  resultsRetentionDays: 7
};

/**
 * Batch Queue Manager
 * Handles queuing and processing of OpenAI API requests
 */
class OpenAIBatchQueue {
  constructor(options = {}) {
    this.config = { ...BATCH_CONFIG, ...options };
    this.apiKey = process.env.OPENAI_API_KEY;
    this.queue = [];
    this.processing = false;
    this.intervalId = null;
    
    if (!this.apiKey) {
      logger.warn('OpenAI API key not found. Batch API will not function.');
    }
  }

  /**
   * Add a request to the batch queue
   * @param {Object} request - OpenAI API request
   * @param {string} request.model - Model to use
   * @param {Array} request.messages - Messages array
   * @param {Object} request.metadata - Optional metadata for callback
   * @returns {Promise<string>} Request ID
   */
  async enqueue(request) {
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const batchRequest = {
      custom_id: requestId,
      method: 'POST',
      url: '/v1/chat/completions',
      body: {
        model: request.model || this.config.defaultModel,
        messages: request.messages,
        max_tokens: request.max_tokens || 4096,
        temperature: request.temperature ?? 0.7,
        ...request.additionalParams
      }
    };

    // Add to memory queue
    this.queue.push({
      ...batchRequest,
      metadata: request.metadata || {},
      enqueuedAt: new Date().toISOString()
    });

    // Persist to disk
    await this.persistQueue();
    
    logger.debug(`Enqueued request ${requestId}`, { 
      model: batchRequest.body.model,
      queueLength: this.queue.length 
    });

    return requestId;
  }

  /**
   * Add multiple requests to queue
   * @param {Array<Object>} requests - Array of requests
   * @returns {Promise<string[]>} Request IDs
   */
  async enqueueMany(requests) {
    const ids = [];
    for (const request of requests) {
      const id = await this.enqueue(request);
      ids.push(id);
    }
    return ids;
  }

  /**
   * Persist queue to disk
   */
  async persistQueue() {
    try {
      const dataDir = path.dirname(this.config.queuePath);
      await fs.mkdir(dataDir, { recursive: true });
      
      // Write as JSONL (one JSON object per line)
      const lines = this.queue.map(item => JSON.stringify(item)).join('\n');
      await fs.writeFile(this.config.queuePath, lines + '\n', 'utf8');
    } catch (error) {
      logger.error('Failed to persist queue:', error.message);
    }
  }

  /**
   * Load queue from disk
   */
  async loadQueue() {
    try {
      const content = await fs.readFile(this.config.queuePath, 'utf8');
      const lines = content.trim().split('\n').filter(Boolean);
      this.queue = lines.map(line => JSON.parse(line));
      logger.info(`Loaded ${this.queue.length} requests from queue`);
    } catch (error) {
      if (error.code !== 'ENOENT') {
        logger.error('Failed to load queue:', error.message);
      }
      this.queue = [];
    }
  }

  /**
   * Process the queue by creating a batch job
   * @returns {Promise<Object|null>} Batch job info
   */
  async processQueue() {
    if (this.processing) {
      logger.debug('Queue already processing');
      return null;
    }

    if (this.queue.length === 0) {
      logger.debug('Queue is empty');
      return null;
    }

    this.processing = true;
    
    try {
      // Take up to maxBatchSize requests
      const batch = this.queue.slice(0, this.config.maxBatchSize);
      
      logger.info(`Processing batch of ${batch.length} requests`);

      // Create batch input file
      const batchFilePath = await this.createBatchFile(batch);
      
      // Upload file to OpenAI
      const fileId = await this.uploadBatchFile(batchFilePath);
      
      // Create batch job
      const batchJob = await this.createBatchJob(fileId);
      
      // Remove processed items from queue
      this.queue = this.queue.slice(batch.length);
      await this.persistQueue();
      
      // Clean up temp file
      await fs.unlink(batchFilePath).catch(() => {});
      
      logger.success(`Batch job created: ${batchJob.id}`);
      
      return batchJob;
      
    } catch (error) {
      logger.error('Failed to process queue:', error.message);
      return null;
    } finally {
      this.processing = false;
    }
  }

  /**
   * Create batch input file in JSONL format
   * @param {Array} requests - Requests to include
   * @returns {Promise<string>} Path to batch file
   */
  async createBatchFile(requests) {
    const tempPath = path.join(process.cwd(), 'data', `batch-input-${Date.now()}.jsonl`);
    
    // Format for OpenAI Batch API
    const lines = requests.map(req => ({
      custom_id: req.custom_id,
      method: req.method,
      url: req.url,
      body: req.body
    }));
    
    const content = lines.map(obj => JSON.stringify(obj)).join('\n');
    await fs.writeFile(tempPath, content, 'utf8');
    
    return tempPath;
  }

  /**
   * Upload batch file to OpenAI
   * @param {string} filePath - Path to batch file
   * @returns {Promise<string>} File ID
   */
  async uploadBatchFile(filePath) {
    const FormData = require('form-data');
    const form = new FormData();
    
    form.append('purpose', 'batch');
    form.append('file', await fs.readFile(filePath), {
      filename: path.basename(filePath),
      contentType: 'application/jsonl'
    });

    const response = await fetch(this.config.filesUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        ...form.getHeaders()
      },
      body: form
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`File upload failed: ${error}`);
    }

    const data = await response.json();
    return data.id;
  }

  /**
   * Create batch job
   * @param {string} fileId - Uploaded file ID
   * @returns {Promise<Object>} Batch job info
   */
  async createBatchJob(fileId) {
    const response = await fetch(this.config.apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        input_file_id: fileId,
        endpoint: '/v1/chat/completions',
        completion_window: '24h'
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Batch creation failed: ${error}`);
    }

    return await response.json();
  }

  /**
   * Check batch job status
   * @param {string} batchId - Batch job ID
   * @returns {Promise<Object>} Batch status
   */
  async getBatchStatus(batchId) {
    const response = await fetch(`${this.config.apiUrl}/${batchId}`, {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to get batch status: ${await response.text()}`);
    }

    return await response.json();
  }

  /**
   * Retrieve batch results
   * @param {string} outputFileId - Output file ID from completed batch
   * @returns {Promise<Array>} Results
   */
  async getBatchResults(outputFileId) {
    const response = await fetch(`${this.config.filesUrl}/${outputFileId}/content`, {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to get batch results: ${await response.text()}`);
    }

    const text = await response.text();
    return text.trim().split('\n').map(line => JSON.parse(line));
  }

  /**
   * Start automatic queue processing
   */
  startAutoProcess() {
    if (this.intervalId) return;
    
    logger.info(`Starting auto-process (every ${this.config.processIntervalMinutes} minutes)`);
    
    this.intervalId = setInterval(() => {
      this.processQueue().catch(err => {
        logger.error('Auto-process error:', err.message);
      });
    }, this.config.processIntervalMinutes * 60 * 1000);
  }

  /**
   * Stop automatic queue processing
   */
  stopAutoProcess() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      logger.info('Stopped auto-process');
    }
  }

  /**
   * Get queue statistics
   * @returns {Object} Queue stats
   */
  getStats() {
    return {
      queued: this.queue.length,
      processing: this.processing,
      autoProcess: !!this.intervalId,
      intervalMinutes: this.config.processIntervalMinutes
    };
  }
}

/**
 * Quick enqueue helper
 * @param {Object} request - Request to enqueue
 * @returns {Promise<string>} Request ID
 */
async function enqueueOpenAIRequest(request) {
  const queue = new OpenAIBatchQueue();
  await queue.loadQueue();
  return queue.enqueue(request);
}

/**
 * Process queue immediately
 * @returns {Promise<Object|null>} Batch job info
 */
async function processOpenAIQueue() {
  const queue = new OpenAIBatchQueue();
  await queue.loadQueue();
  return queue.processQueue();
}

module.exports = {
  OpenAIBatchQueue,
  BATCH_CONFIG,
  enqueueOpenAIRequest,
  processOpenAIQueue
};
