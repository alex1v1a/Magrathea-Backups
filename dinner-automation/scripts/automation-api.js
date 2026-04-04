#!/usr/bin/env node
/**
 * Automation API Gateway
 * Provides a unified REST API for all automation tasks
 * Enables external integrations and monitoring
 * 
 * Endpoints:
 *   GET  /health          - System health check
 *   GET  /status          - Automation status
 *   POST /heb/cart        - Trigger HEB cart update
 *   POST /calendar/sync   - Trigger calendar sync
 *   POST /email/send      - Send dinner plan email
 *   GET  /pool/stats      - Browser pool statistics
 * 
 * Usage:
 *   node automation-api.js
 *   node automation-api.js --port 3456
 */

const http = require('http');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const API_PORT = process.env.AUTOMATION_API_PORT || 3456;
const SCRIPTS_DIR = __dirname;
const LOG_FILE = path.join(__dirname, '..', 'data', 'api-requests.log');

// Active job tracking
const activeJobs = new Map();
let jobCounter = 0;

function log(message, level = 'info') {
  const timestamp = new Date().toISOString();
  const prefix = { error: '❌', warn: '⚠️', success: '✅', info: 'ℹ️' }[level] || 'ℹ️';
  const line = `[${timestamp}] ${prefix} ${message}`;
  console.log(line);
  try {
    fs.appendFileSync(LOG_FILE, line + '\n');
  } catch {}
}

/**
 * Execute script with timeout and capture output
 */
function runScript(scriptName, args = [], timeout = 120000) {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(SCRIPTS_DIR, scriptName);
    
    if (!fs.existsSync(scriptPath)) {
      reject(new Error(`Script not found: ${scriptName}`));
      return;
    }
    
    const output = [];
    const errors = [];
    
    const process = spawn('node', [scriptPath, ...args], {
      cwd: SCRIPTS_DIR,
      timeout,
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe']
    });
    
    process.stdout.on('data', (data) => {
      output.push(data.toString());
    });
    
    process.stderr.on('data', (data) => {
      errors.push(data.toString());
    });
    
    process.on('close', (code) => {
      const result = {
        exitCode: code,
        output: output.join(''),
        errors: errors.join(''),
        success: code === 0
      };
      
      if (code === 0) {
        resolve(result);
      } else {
        reject(result);
      }
    });
    
    process.on('error', (err) => {
      reject({ error: err.message, output: output.join(''), errors: errors.join('') });
    });
  });
}

/**
 * Get automation status
 */
async function getAutomationStatus() {
  try {
    // Check Chrome status
    const http = require('http');
    const chromeRunning = await new Promise((resolve) => {
      const req = http.get('http://localhost:9222/json/version', { timeout: 2000 }, (res) => {
        resolve(res.statusCode === 200);
      });
      req.on('error', () => resolve(false));
    });
    
    // Load latest plan info
    let planInfo = null;
    try {
      const planData = fs.readFileSync(
        path.join(SCRIPTS_DIR, '..', 'data', 'weekly-plan.json'),
        'utf8'
      );
      planInfo = JSON.parse(planData);
    } catch (e) {}
    
    // Check email state
    let emailState = null;
    try {
      const emailData = fs.readFileSync(
        path.join(SCRIPTS_DIR, '..', 'data', 'dinner-email-state.json'),
        'utf8'
      );
      emailState = JSON.parse(emailData);
    } catch (e) {}
    
    return {
      chromeRunning,
      planWeek: planInfo?.weekOf || null,
      mealsCount: planInfo?.meals?.length || 0,
      pendingConfirmation: emailState?.pendingConfirmation || false,
      lastEmailSent: emailState?.lastSent || null,
      activeJobs: activeJobs.size,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    return { error: error.message };
  }
}

/**
 * Get pool stats from connector
 */
async function getPoolStats() {
  try {
    const { getPoolStats } = require('./shared-chrome-connector-v2');
    return getPoolStats();
  } catch (e) {
    return { error: 'Connector not available' };
  }
}

/**
 * HTTP Request Handler
 */
async function handleRequest(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }
  
  const url = new URL(req.url, `http://localhost:${API_PORT}`);
  const pathname = url.pathname;
  
  log(`${req.method} ${pathname}`);
  
  try {
    // Health check
    if (pathname === '/health' && req.method === 'GET') {
      const status = await getAutomationStatus();
      sendJSON(res, 200, {
        status: 'healthy',
        ...status
      });
      return;
    }
    
    // Status endpoint
    if (pathname === '/status' && req.method === 'GET') {
      const status = await getAutomationStatus();
      sendJSON(res, 200, status);
      return;
    }
    
    // Pool stats
    if (pathname === '/pool/stats' && req.method === 'GET') {
      const stats = await getPoolStats();
      sendJSON(res, 200, stats);
      return;
    }
    
    // Trigger HEB cart
    if (pathname === '/heb/cart' && req.method === 'POST') {
      const jobId = ++jobCounter;
      
      // Run async
      runScript('heb-cart-v3.js', ['--resume'])
        .then(result => {
          activeJobs.delete(jobId);
          log(`Job ${jobId} completed`);
        })
        .catch(error => {
          activeJobs.delete(jobId);
          log(`Job ${jobId} failed: ${error.message}`, 'error');
        });
      
      activeJobs.set(jobId, { type: 'heb', started: Date.now() });
      
      sendJSON(res, 202, {
        message: 'HEB cart update started',
        jobId,
        checkStatus: `/jobs/${jobId}`
      });
      return;
    }
    
    // Trigger calendar sync
    if (pathname === '/calendar/sync' && req.method === 'POST') {
      const result = await runScript('sync-dinner-to-icloud.js', [], 60000);
      
      sendJSON(res, 200, {
        message: 'Calendar sync completed',
        result: {
          success: result.success,
          output: result.output.substring(0, 500)
        }
      });
      return;
    }
    
    // Send email
    if (pathname === '/email/send' && req.method === 'POST') {
      const result = await runScript('dinner-email-system.js', ['--send-test'], 60000);
      
      sendJSON(res, 200, {
        message: 'Email sent',
        result: {
          success: result.success,
          output: result.output.substring(0, 500)
        }
      });
      return;
    }
    
    // Get recipe database
    if (pathname === '/recipes' && req.method === 'GET') {
      try {
        const recipeData = fs.readFileSync(
          path.join(SCRIPTS_DIR, '..', 'data', 'recipe-database.json'),
          'utf8'
        );
        const recipes = JSON.parse(recipeData);
        sendJSON(res, 200, recipes);
      } catch (e) {
        sendJSON(res, 500, { error: 'Could not load recipes' });
      }
      return;
    }
    
    // Get weekly plan
    if (pathname === '/plan' && req.method === 'GET') {
      try {
        const planData = fs.readFileSync(
          path.join(SCRIPTS_DIR, '..', 'data', 'weekly-plan.json'),
          'utf8'
        );
        const plan = JSON.parse(planData);
        sendJSON(res, 200, plan);
      } catch (e) {
        sendJSON(res, 500, { error: 'Could not load plan' });
      }
      return;
    }
    
    // 404
    sendJSON(res, 404, { error: 'Not found', path: pathname });
    
  } catch (error) {
    log(`Error handling ${pathname}: ${error.message}`, 'error');
    sendJSON(res, 500, { error: error.message });
  }
}

function sendJSON(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data, null, 2));
}

/**
 * Start API server
 */
function startServer() {
  const server = http.createServer(handleRequest);
  
  server.listen(API_PORT, () => {
    console.log(`
🚀 Automation API Gateway running
═══════════════════════════════════
Port: ${API_PORT}
Endpoints:
  GET  /health         - Health check
  GET  /status         - Full status
  GET  /pool/stats     - Browser pool stats
  GET  /plan           - Current dinner plan
  GET  /recipes        - Recipe database
  POST /heb/cart       - Trigger HEB update
  POST /calendar/sync  - Trigger calendar sync
  POST /email/send     - Send dinner email

Press Ctrl+C to stop
    `);
    
    log('API Gateway started on port ' + API_PORT);
  });
  
  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`❌ Port ${API_PORT} is already in use`);
      process.exit(1);
    }
    log(`Server error: ${err.message}`, 'error');
  });
  
  return server;
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Shutting down API Gateway...');
  process.exit(0);
});

// CLI
if (require.main === module) {
  const args = process.argv.slice(2);
  const portArg = args.find(a => a.startsWith('--port='));
  if (portArg) {
    process.env.AUTOMATION_API_PORT = portArg.split('=')[1];
  }
  
  startServer();
}

module.exports = { startServer, runScript, getAutomationStatus };
