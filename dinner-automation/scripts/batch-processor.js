#!/usr/bin/env node
/**
 * Batch Task Processor
 * Executes automation tasks in optimized batches
 * Supports parallelization where safe
 * 
 * Usage:
 *   node batch-processor.js --task=calendar
 *   node batch-processor.js --task=heb --parallel=2
 *   node batch-processor.js --all
 */

const { Worker } = require('worker_threads');
const path = require('path');
const fs = require('fs').promises;
const os = require('os');

const MAX_WORKERS = Math.min(os.cpus().length - 1, 4);

class BatchProcessor {
  constructor(options = {}) {
    this.maxWorkers = options.maxWorkers || MAX_WORKERS;
    this.taskQueue = [];
    this.results = [];
    this.workers = [];
  }

  /**
   * Add task to queue
   */
  addTask(name, fn, priority = 0) {
    this.taskQueue.push({ name, fn, priority });
    // Sort by priority (higher first)
    this.taskQueue.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Execute tasks with worker pool
   */
  async execute() {
    console.log(`🔄 Batch Processor: ${this.taskQueue.length} tasks, ${this.maxWorkers} workers`);
    
    const executing = [];
    const pool = new Set();
    
    for (const task of this.taskQueue) {
      // Wait for available worker slot
      while (pool.size >= this.maxWorkers) {
        await Promise.race(executing);
      }
      
      const promise = this.executeTask(task).finally(() => {
        pool.delete(promise);
        executing.splice(executing.indexOf(promise), 1);
      });
      
      pool.add(promise);
      executing.push(promise);
    }
    
    // Wait for all to complete
    await Promise.all(executing);
    
    return this.results;
  }

  /**
   * Execute single task
   */
  async executeTask(task) {
    const startTime = Date.now();
    console.log(`   ▶️  Starting: ${task.name}`);
    
    try {
      const result = await task.fn();
      const duration = Date.now() - startTime;
      
      this.results.push({
        name: task.name,
        success: true,
        duration,
        result
      });
      
      console.log(`   ✅ Completed: ${task.name} (${duration}ms)`);
    } catch (error) {
      const duration = Date.now() - startTime;
      
      this.results.push({
        name: task.name,
        success: false,
        duration,
        error: error.message
      });
      
      console.log(`   ❌ Failed: ${task.name} (${duration}ms) - ${error.message}`);
    }
  }

  /**
   * Generate execution report
   */
  generateReport() {
    const total = this.results.length;
    const successful = this.results.filter(r => r.success).length;
    const failed = total - successful;
    const totalDuration = this.results.reduce((a, r) => a + r.duration, 0);
    
    console.log('\n📊 Batch Execution Report');
    console.log('=' .repeat(50));
    console.log(`Total tasks: ${total}`);
    console.log(`Successful: ${successful} ✅`);
    console.log(`Failed: ${failed} ${failed > 0 ? '❌' : ''}`);
    console.log(`Total time: ${totalDuration}ms`);
    console.log(`Average time: ${Math.round(totalDuration / total)}ms`);
    
    if (failed > 0) {
      console.log('\n❌ Failed tasks:');
      this.results.filter(r => !r.success).forEach(r => {
        console.log(`   • ${r.name}: ${r.error}`);
      });
    }
    
    return {
      total,
      successful,
      failed,
      totalDuration,
      results: this.results
    };
  }
}

/**
 * Predefined task definitions
 */
const TASKS = {
  calendar: {
    name: 'Calendar Sync',
    fn: async () => {
      const { syncDinnerToiCloud } = require('./sync-dinner-to-icloud');
      return await syncDinnerToiCloud();
    },
    priority: 10
  },
  
  emailSend: {
    name: 'Send Dinner Email',
    fn: async () => {
      const { sendDinnerPlanEmail } = require('./dinner-email-system');
      return await sendDinnerPlanEmail();
    },
    priority: 9
  },
  
  emailCheck: {
    name: 'Check Email Replies',
    fn: async () => {
      const { checkEmailReplies } = require('./dinner-email-system');
      return await checkEmailReplies();
    },
    priority: 8
  },
  
  hebCart: {
    name: 'HEB Cart Update',
    fn: async () => {
      const { runAutomation } = require('./heb-cart-v3');
      return await runAutomation({ resume: true });
    },
    priority: 5
  },
  
  youtubeCache: {
    name: 'Rebuild YouTube Cache',
    fn: async () => {
      return new Promise((resolve, reject) => {
        const { spawn } = require('child_process');
        const proc = spawn('node', ['build-youtube-cache.js'], {
          cwd: __dirname,
          timeout: 300000,
          windowsHide: true,
          stdio: ['ignore', 'pipe', 'pipe']
        });
        let stdout = '';
        proc.stdout.on('data', (data) => { stdout += data; });
        proc.on('close', (code) => {
          if (code !== 0) reject(new Error(`Exit code: ${code}`));
          else resolve({ output: stdout });
        });
      });
    },
    priority: 3
  },
  
  cleanCache: {
    name: 'Clean Old Cache Files',
    fn: async () => {
      const cacheDir = path.join(__dirname, '..', 'data', 'cache');
      const files = await fs.readdir(cacheDir).catch(() => []);
      let cleaned = 0;
      
      const oneWeekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
      
      for (const file of files) {
        const filePath = path.join(cacheDir, file);
        const stats = await fs.stat(filePath);
        
        if (stats.mtimeMs < oneWeekAgo) {
          await fs.unlink(filePath);
          cleaned++;
        }
      }
      
      return { cleanedFiles: cleaned };
    },
    priority: 1
  }
};

/**
 * Main execution
 */
async function main() {
  const args = process.argv.slice(2);
  const processor = new BatchProcessor();
  
  // Parse arguments
  const parallelArg = args.find(a => a.startsWith('--parallel='));
  if (parallelArg) {
    processor.maxWorkers = parseInt(parallelArg.split('=')[1]) || MAX_WORKERS;
  }
  
  const selectedTasks = [];
  
  if (args.includes('--all')) {
    selectedTasks.push('calendar', 'emailCheck', 'hebCart', 'cleanCache');
  } else {
    if (args.includes('--calendar')) selectedTasks.push('calendar');
    if (args.includes('--email')) selectedTasks.push('emailSend');
    if (args.includes('--email-check')) selectedTasks.push('emailCheck');
    if (args.includes('--heb')) selectedTasks.push('hebCart');
    if (args.includes('--youtube')) selectedTasks.push('youtubeCache');
    if (args.includes('--clean')) selectedTasks.push('cleanCache');
  }
  
  if (selectedTasks.length === 0) {
    console.log('Batch Task Processor\n');
    console.log('Usage:');
    console.log('  node batch-processor.js --all           Run all tasks');
    console.log('  node batch-processor.js --calendar      Sync calendar only');
    console.log('  node batch-processor.js --email         Send dinner email');
    console.log('  node batch-processor.js --email-check   Check for replies');
    console.log('  node batch-processor.js --heb           Update HEB cart');
    console.log('  node batch-processor.js --youtube       Rebuild YouTube cache');
    console.log('  node batch-processor.js --clean         Clean old cache files');
    console.log('  node batch-processor.js --parallel=2    Use 2 workers (default: auto)');
    console.log('\nAvailable tasks:');
    Object.entries(TASKS).forEach(([key, task]) => {
      console.log(`  ${key}: ${task.name} (priority: ${task.priority})`);
    });
    return;
  }
  
  // Add selected tasks
  for (const taskKey of selectedTasks) {
    const task = TASKS[taskKey];
    if (task) {
      processor.addTask(task.name, task.fn, task.priority);
    }
  }
  
  // Execute
  const startTime = Date.now();
  await processor.execute();
  const report = processor.generateReport();
  
  // Save report
  const reportFile = path.join(__dirname, '..', 'data', 'batch-report.json');
  await fs.writeFile(reportFile, JSON.stringify({
    ...report,
    timestamp: new Date().toISOString(),
    totalWallTime: Date.now() - startTime
  }, null, 2));
  
  console.log(`\n📝 Report saved to: ${reportFile}`);
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { BatchProcessor, TASKS };
