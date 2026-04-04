/**
 * Service Health Monitor
 * Real-time monitoring with automatic recovery
 * 
 * Usage:
 *   node scripts/service-health.js [--watch]
 */

const fs = require('fs').promises;
const path = require('path');
const http = require('http');
const { exec } = require('child_process');
const util = require('util');

const execPromise = util.promisify(exec);

// Configuration
const CONFIG = {
  checkInterval: 30000, // 30 seconds
  services: {
    'gateway': {
      name: 'OpenClaw Gateway',
      port: 18789,
      fallbackPorts: [18790, 18791, 18792],
      checkPath: '/',
      expectedResponse: 'openclaw',
      autoRecover: true
    },
    'dashboard': {
      name: 'Dashboard Server',
      port: 3001,
      checkPath: '/api/health',
      expectedStatus: 200,
      autoRecover: true
    },
    'edge-browser': {
      name: 'Edge Browser',
      port: 9222,
      checkPath: '/json/version',
      expectedKey: 'Browser',
      autoRecover: false // Manual restart required
    }
  },
  notification: {
    discord: true,
    logFile: true
  }
};

// State tracking
const state = {
  services: new Map(),
  startTime: Date.now(),
  checksPerformed: 0,
  recoveriesPerformed: 0
};

// Initialize service states
for (const [id, config] of Object.entries(CONFIG.services)) {
  state.services.set(id, {
    id,
    ...config,
    status: 'unknown',
    lastCheck: null,
    lastHealthy: null,
    consecutiveFailures: 0,
    totalFailures: 0,
    history: []
  });
}

// ============================================================================
// HEALTH CHECK FUNCTIONS
// ============================================================================

async function checkHttpService(service) {
  return new Promise((resolve) => {
    const options = {
      hostname: 'localhost',
      port: service.port,
      path: service.checkPath || '/',
      method: 'GET',
      timeout: 5000
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        const checks = [];
        
        // Status code check
        if (service.expectedStatus) {
          checks.push(res.statusCode === service.expectedStatus);
        }
        
        // Response content check
        if (service.expectedResponse) {
          checks.push(data.toLowerCase().includes(service.expectedResponse.toLowerCase()));
        }
        
        // JSON key check
        if (service.expectedKey) {
          try {
            const json = JSON.parse(data);
            checks.push(json[service.expectedKey] !== undefined);
          } catch {
            checks.push(false);
          }
        }
        
        const healthy = checks.length === 0 || checks.every(c => c);
        resolve({ healthy, statusCode: res.statusCode, data: data.substring(0, 200) });
      });
    });
    
    req.on('error', () => resolve({ healthy: false, error: 'Connection failed' }));
    req.on('timeout', () => {
      req.destroy();
      resolve({ healthy: false, error: 'Timeout' });
    });
    req.end();
  });
}

async function checkService(serviceId) {
  const service = state.services.get(serviceId);
  const startTime = Date.now();
  
  let result;
  try {
    result = await checkHttpService(service);
  } catch (error) {
    result = { healthy: false, error: error.message };
  }
  
  const responseTime = Date.now() - startTime;
  
  // Update state
  service.lastCheck = new Date().toISOString();
  service.responseTime = responseTime;
  
  if (result.healthy) {
    service.status = 'healthy';
    service.lastHealthy = service.lastCheck;
    service.consecutiveFailures = 0;
  } else {
    service.status = 'unhealthy';
    service.consecutiveFailures++;
    service.totalFailures++;
  }
  
  // Keep history (last 10)
  service.history.push({
    timestamp: service.lastCheck,
    healthy: result.healthy,
    responseTime
  });
  if (service.history.length > 10) {
    service.history.shift();
  }
  
  return { ...result, responseTime };
}

// ============================================================================
// RECOVERY FUNCTIONS
// ============================================================================

async function recoverService(serviceId) {
  const service = state.services.get(serviceId);
  console.log(`🔄 Attempting recovery for ${service.name}...`);
  
  switch (serviceId) {
    case 'gateway':
      return await recoverGateway(service);
    case 'dashboard':
      return await recoverDashboard(service);
    default:
      console.log(`⚠️ No recovery procedure for ${serviceId}`);
      return false;
  }
}

async function recoverGateway(service) {
  try {
    // Try graceful restart
    console.log('  Stopping gateway...');
    await execPromise('openclaw gateway stop', { timeout: 15000 });
    await sleep(3000);
    
    console.log('  Starting gateway...');
    await execPromise('openclaw gateway start', { timeout: 30000 });
    await sleep(5000);
    
    // Verify recovery
    const check = await checkHttpService(service);
    if (check.healthy) {
      console.log('  ✅ Gateway recovered successfully');
      state.recoveriesPerformed++;
      return true;
    }
    
    // Try fallback port
    console.log('  Primary port failed, trying fallback...');
    for (const port of service.fallbackPorts || []) {
      console.log(`  Trying port ${port}...`);
      // Would need to update config here
      // For now, just log
    }
    
    return false;
  } catch (error) {
    console.log(`  ❌ Recovery failed: ${error.message}`);
    return false;
  }
}

async function recoverDashboard(service) {
  try {
    console.log('  Restarting dashboard server...');
    // Kill any existing process on port
    try {
      await execPromise(`npx kill-port ${service.port}`, { timeout: 10000 });
    } catch {
      // Port might not be in use
    }
    
    await sleep(2000);
    
    // Start server
    const { spawn } = require('child_process');
    const child = spawn('node', ['server.js'], {
      cwd: path.join(__dirname, '..', 'marvin-dash'),
      detached: true,
      stdio: 'ignore'
    });
    child.unref();
    
    await sleep(5000);
    
    // Verify
    const check = await checkHttpService(service);
    if (check.healthy) {
      console.log('  ✅ Dashboard recovered successfully');
      state.recoveriesPerformed++;
      return true;
    }
    
    return false;
  } catch (error) {
    console.log(`  ❌ Recovery failed: ${error.message}`);
    return false;
  }
}

// ============================================================================
// REPORTING FUNCTIONS
// ============================================================================

function formatDuration(ms) {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
}

function getUptimePercent(service) {
  if (service.history.length === 0) return 100;
  const healthy = service.history.filter(h => h.healthy).length;
  return Math.round((healthy / service.history.length) * 100);
}

function printStatus() {
  console.clear();
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║           🔍 MARVIN SERVICE HEALTH MONITOR               ║');
  console.log('╠══════════════════════════════════════════════════════════╣');
  console.log(`║  Uptime: ${formatDuration(Date.now() - state.startTime).padEnd(15)} Checks: ${state.checksPerformed.toString().padEnd(8)} ║`);
  console.log(`║  Recoveries: ${state.recoveriesPerformed.toString().padEnd(11)}                                    ║`);
  console.log('╠══════════════════════════════════════════════════════════╣');
  console.log('║  Service              Status    Response  Uptime  Fails  ║');
  console.log('╠══════════════════════════════════════════════════════════╣');
  
  for (const service of state.services.values()) {
    const statusIcon = service.status === 'healthy' ? '✅' : 
                       service.status === 'unhealthy' ? '❌' : '⏳';
    const statusText = service.status.padEnd(7);
    const responseTime = service.responseTime ? `${service.responseTime}ms` : 'N/A';
    const uptime = `${getUptimePercent(service)}%`;
    const fails = service.totalFailures.toString();
    
    console.log(`║  ${service.name.padEnd(20)} ${statusText} ${responseTime.padEnd(9)} ${uptime.padEnd(7)} ${fails.padEnd(6)} ║`);
  }
  
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log(`\nLast updated: ${new Date().toLocaleTimeString()}`);
  console.log('Press Ctrl+C to exit\n');
}

async function saveStatusReport() {
  const reportPath = path.join(__dirname, '..', 'data', 'service-health-report.json');
  
  const report = {
    timestamp: new Date().toISOString(),
    uptime: Date.now() - state.startTime,
    checksPerformed: state.checksPerformed,
    recoveriesPerformed: state.recoveriesPerformed,
    services: Array.from(state.services.values()).map(s => ({
      id: s.id,
      name: s.name,
      status: s.status,
      lastHealthy: s.lastHealthy,
      consecutiveFailures: s.consecutiveFailures,
      totalFailures: s.totalFailures,
      uptime: getUptimePercent(s)
    }))
  };
  
  try {
    await fs.mkdir(path.dirname(reportPath), { recursive: true });
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
  } catch (error) {
    console.error('Failed to save report:', error.message);
  }
}

// ============================================================================
// MAIN LOOP
// ============================================================================

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runCheck() {
  state.checksPerformed++;
  
  for (const serviceId of state.services.keys()) {
    const result = await checkService(serviceId);
    const service = state.services.get(serviceId);
    
    // Auto-recovery for unhealthy services
    if (!result.healthy && service.autoRecover && service.consecutiveFailures >= 3) {
      console.log(`\n⚠️ ${service.name} failed ${service.consecutiveFailures} consecutive checks`);
      await recoverService(serviceId);
    }
  }
  
  await saveStatusReport();
}

async function main() {
  const args = process.argv.slice(2);
  const watchMode = args.includes('--watch');
  
  console.log('🔍 Marvin Service Health Monitor');
  console.log('================================\n');
  
  // Initial check
  await runCheck();
  
  if (watchMode) {
    console.log('\n👀 Watch mode enabled - monitoring every 30 seconds\n');
    
    // Set up interval
    const interval = setInterval(async () => {
      await runCheck();
      printStatus();
    }, CONFIG.checkInterval);
    
    // Handle graceful shutdown
    process.on('SIGINT', () => {
      console.log('\n\n👋 Shutting down...');
      clearInterval(interval);
      process.exit(0);
    });
    
    // Initial status print
    printStatus();
  } else {
    // Single check mode - print results
    console.log('\n📊 Current Status:');
    for (const service of state.services.values()) {
      const icon = service.status === 'healthy' ? '✅' : '❌';
      console.log(`  ${icon} ${service.name}: ${service.status}`);
    }
    
    const allHealthy = Array.from(state.services.values())
      .every(s => s.status === 'healthy');
    
    process.exit(allHealthy ? 0 : 1);
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
}

module.exports = { checkService, recoverService, state };
