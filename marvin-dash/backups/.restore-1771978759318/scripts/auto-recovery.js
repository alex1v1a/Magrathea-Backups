#!/usr/bin/env node
/**
 * Marvin Auto-Recovery System v2.0
 * Monitors and repairs critical services automatically
 * Enhanced with port conflict detection and dynamic port fallback
 * Run via: node scripts/auto-recovery.js [--auto] [--manual]
 */

const fs = require('fs').promises;
const path = require('path');
const { exec, spawn } = require('child_process');
const util = require('util');
const http = require('http');

const execPromise = util.promisify(exec);

const WORKSPACE_DIR = path.join(__dirname, '..');
const DATA_DIR = path.join(WORKSPACE_DIR, 'data');
const LOG_FILE = path.join(DATA_DIR, 'recovery.log');
const STATE_FILE = path.join(DATA_DIR, 'recovery-state.json');
const CONFIG_FILE = path.join(process.env.USERPROFILE || 'C:\\Users\\Admin', '.openclaw', 'openclaw.json');

// Fallback ports for gateway if primary is blocked
const GATEWAY_FALLBACK_PORTS = [18790, 18791, 18792, 18800];

// Import progress tracker
let progress;
try {
  progress = require('./progress-tracker.js');
} catch {
  progress = {
    startTask: async () => {},
    updateProgress: async () => {},
    logTask: async () => {},
    completeTask: async () => {}
  };
}
const TASK_ID = 'auto-recovery';

// Import backup functions
let backup;
try {
  backup = require('./backup.js');
} catch {
  backup = {
    createBackup: async () => ({ success: true, filename: 'mock' }),
    restoreBackup: async () => true
  };
}
const { createBackup, restoreBackup } = backup;

// Service definitions
const SERVICES = {
  'dashboard-server': {
    name: 'Dashboard Server',
    port: 3001,
    startCmd: 'node C:\\Users\\Admin\\.openclaw\\workspace\\marvin-dash\\server.js',
    cwd: 'C:\\Users\\Admin\\.openclaw\\workspace\\marvin-dash',
    healthUrl: 'http://localhost:3001/api/health',
    recoveryActions: ['kill-port', 'restart-service'],
    autoStart: true
  },
  'openclaw-gateway': {
    name: 'OpenClaw Gateway',
    port: 18789,
    fallbackPorts: GATEWAY_FALLBACK_PORTS,
    checkCmd: 'openclaw gateway status',
    startCmd: 'openclaw gateway start',
    recoveryActions: ['detect-port-conflict', 'kill-port', 'restart-gateway', 'fallback-port'],
    autoStart: true
  },
  'wsl-ubuntu': {
    name: 'WSL Ubuntu',
    checkCmd: 'wsl echo "ping"',
    recoveryActions: ['restart-wsl'],
    autoStart: false
  }
};

// Recovery state - will be loaded from file or initialized
let recoveryState = null;

// ANSI colors
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
};

function log(message, color = 'reset', toFile = true) {
  const timestamp = new Date().toISOString();
  const consoleMsg = `${colors[color]}${message}${colors.reset}`;
  const fileMsg = `[${timestamp}] ${message}`;
  
  console.log(consoleMsg);
  
  if (toFile) {
    fs.appendFile(LOG_FILE, fileMsg + '\n').catch(() => {});
  }
}

function logSection(title) {
  console.log('');
  log(`═══ ${title} ═══`, 'bright');
}

function spawnDetached(command, cwd) {
  try {
    const child = spawn(command, {
      shell: true,
      cwd: cwd || undefined,
      detached: true,
      stdio: 'ignore',
      windowsHide: true
    });
    child.unref();
    return child;
  } catch (error) {
    log(`Failed to spawn command: ${command} (${error.message})`, 'yellow');
    return null;
  }
}

async function waitForServiceHealthy(service, timeoutMs = 15000, intervalMs = 2000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    if (service.port) {
      const ok = await isGatewayHealthy(service.port);
      if (ok) return true;
    } else if (service.checkCmd) {
      try {
        await execPromise(service.checkCmd, { timeout: 10000 });
        return true;
      } catch {
        // keep waiting
      }
    } else {
      return true; // no health check configured
    }
    await new Promise(r => setTimeout(r, intervalMs));
  }
  return false;
}

// Load recovery state
async function loadState() {
  try {
    const data = await fs.readFile(STATE_FILE, 'utf8');
    recoveryState = JSON.parse(data);
  } catch {
    recoveryState = null;
  }
  
  // Ensure all required fields exist
  recoveryState = recoveryState || {};
  recoveryState.lastRun = recoveryState.lastRun || null;
  recoveryState.lastBackup = recoveryState.lastBackup || null;
  recoveryState.totalRecoveries = recoveryState.totalRecoveries || 0;
  recoveryState.serviceStates = recoveryState.serviceStates || {};
  recoveryState.consecutiveFailures = recoveryState.consecutiveFailures || {};
  recoveryState.lastRollback = recoveryState.lastRollback || null;
  recoveryState.portConflicts = recoveryState.portConflicts || {};
}

// Save recovery state
async function saveState() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(STATE_FILE, JSON.stringify(recoveryState, null, 2));
  } catch (error) {
    log(`Failed to save state: ${error.message}`, 'yellow', false);
  }
}

// Enhanced health check - verifies it's actually the OpenClaw gateway
async function isGatewayHealthy(port) {
  return new Promise((resolve) => {
    const options = {
      hostname: 'localhost',
      port: port,
      path: '/',
      method: 'GET',
      timeout: 3000
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        // Check if response contains OpenClaw gateway indicators
        const isOpenClaw = data.includes('openclaw') || 
                          data.includes('OpenClaw') || 
                          data.includes('__openclaw__') ||
                          res.headers['server']?.includes('openclaw');
        
        // Also check if it's websocket upgrade capable
        const hasWebSocket = res.headers['upgrade'] === 'websocket' ||
                            data.includes('websocket') ||
                            data.includes('ws://');
        
        resolve(isOpenClaw || hasWebSocket);
      });
    });
    
    req.on('error', () => resolve(false));
    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });
    req.end();
  });
}

// Legacy simple port check for non-gateway services
async function isPortInUse(port) {
  return new Promise((resolve) => {
    const req = http.get(`http://localhost:${port}/api/health`, (res) => {
      resolve(res.statusCode === 200);
    });
    req.on('error', () => resolve(false));
    req.setTimeout(3000, () => {
      req.destroy();
      resolve(false);
    });
  });
}

// Detect port conflicts and identify what's using the port
async function detectPortConflict(port) {
  log(`  Detecting port conflicts on ${port}...`, 'dim');
  
  try {
    // Get netstat output for the port
    const { stdout } = await execPromise(`netstat -ano | findstr :${port}`);
    const lines = stdout.split('\n').filter(l => l.trim() && (l.includes('LISTENING') || l.includes('ESTABLISHED')));
    
    const conflicts = [];
    
    for (const line of lines) {
      const parts = line.trim().split(/\s+/);
      const localAddress = parts[1] || '';
      const state = parts[3] || '';
      const pid = parts[parts.length - 1];
      
      if (pid && !isNaN(parseInt(pid))) {
        try {
          // Get process name
          const { stdout: tasklistOutput } = await execPromise(`tasklist /FI "PID eq ${pid}" /FO CSV /NH`);
          const processName = tasklistOutput.split(',')[0]?.replace(/"/g, '') || 'unknown';
          
          conflicts.push({ 
            pid: parseInt(pid), 
            name: processName,
            localAddress,
            state
          });
        } catch {
          conflicts.push({ pid: parseInt(pid), name: 'unknown', localAddress, state });
        }
      }
    }
    
    // Analyze conflicts
    const tailscale = conflicts.find(c => c.name.toLowerCase().includes('tailscale'));
    const nodeProcesses = conflicts.filter(c => c.name.toLowerCase().includes('node'));
    const systemProcesses = conflicts.filter(c => 
      ['svchost', 'system', 'services', 'lsass'].includes(c.name.toLowerCase())
    );
    
    if (tailscale) {
      return {
        type: 'tailscale',
        severity: 'high',
        message: `Tailscale VPN using port ${port} (PID ${tailscale.pid})`,
        conflicts,
        canKill: false,
        recommendation: 'Use fallback port or disable Tailscale web client'
      };
    }
    
    if (systemProcesses.length > 0) {
      return {
        type: 'system',
        severity: 'critical',
        message: `System process using port ${port}: ${systemProcesses.map(c => c.name).join(', ')}`,
        conflicts,
        canKill: false,
        recommendation: 'Use fallback port - cannot kill system processes'
      };
    }
    
    if (nodeProcesses.length > 0) {
      return {
        type: 'node',
        severity: 'medium',
        message: `Node.js process using port ${port} (likely zombie gateway)`,
        conflicts,
        canKill: true,
        recommendation: 'Kill zombie process and restart gateway'
      };
    }
    
    if (conflicts.length > 0) {
      return {
        type: 'unknown',
        severity: 'medium',
        message: `Unknown process using port ${port}: ${conflicts.map(c => `${c.name}(${c.pid})`).join(', ')}`,
        conflicts,
        canKill: true,
        recommendation: 'Kill process and restart gateway'
      };
    }
    
    return { type: 'none', severity: 'none', message: 'No port conflicts detected', conflicts: [] };
    
  } catch (error) {
    return { type: 'error', severity: 'low', message: `Detection failed: ${error.message}`, conflicts: [] };
  }
}

// Find available fallback port
async function findAvailablePort(fallbackPorts) {
  for (const port of fallbackPorts) {
    const conflict = await detectPortConflict(port);
    if (conflict.type === 'none') {
      return port;
    }
    log(`    Port ${port} unavailable: ${conflict.message}`, 'dim');
  }
  return null;
}

// Update OpenClaw config with new port
async function updateGatewayPort(newPort) {
  try {
    log(`  Updating gateway port to ${newPort}...`, 'cyan');
    
    // Try using openclaw CLI first
    try {
      await execPromise(`openclaw config set gateway.port ${newPort}`, { timeout: 10000 });
      log(`    Port updated via CLI`, 'green');
      return true;
    } catch (cliError) {
      log(`    CLI update failed, trying manual config...`, 'yellow');
    }
    
    // Manual config update
    let config = {};
    try {
      const configData = await fs.readFile(CONFIG_FILE, 'utf8');
      config = JSON.parse(configData);
    } catch {
      config = {};
    }
    
    config.gateway = config.gateway || {};
    config.gateway.port = newPort;
    
    await fs.mkdir(path.dirname(CONFIG_FILE), { recursive: true });
    await fs.writeFile(CONFIG_FILE, JSON.stringify(config, null, 2));
    
    log(`    Port updated to ${newPort}`, 'green');
    return true;
  } catch (error) {
    log(`    Failed to update port: ${error.message}`, 'red');
    return false;
  }
}

// Check service health with enhanced gateway detection
async function checkService(serviceId, service) {
  log(`Checking ${service.name}...`, 'dim');
  
  let status = 'unknown';
  let details = '';
  let portConflict = null;
  
  try {
    if (serviceId === 'openclaw-gateway') {
      // Enhanced check for gateway
      const isHealthy = await isGatewayHealthy(service.port);
      
      if (isHealthy) {
        status = 'healthy';
        details = `Gateway responding on port ${service.port}`;
        // Clear any previous port conflict
        if (recoveryState.portConflicts[serviceId]) {
          delete recoveryState.portConflicts[serviceId];
        }
      } else {
        // Port responds but not with gateway - check for conflicts
        const conflict = await detectPortConflict(service.port);
        
        if (conflict.type !== 'none') {
          status = 'port-conflict';
          details = conflict.message;
          portConflict = conflict;
          recoveryState.portConflicts[serviceId] = conflict;
        } else {
          status = 'down';
          details = `Port ${service.port} not responding as OpenClaw gateway`;
        }
      }
    } else if (service.port) {
      const isRunning = await isPortInUse(service.port);
      if (isRunning) {
        status = 'healthy';
        details = `Port ${service.port} responding`;
      } else {
        status = 'down';
        details = `Port ${service.port} not responding`;
      }
    }
    
    if (service.checkCmd && status !== 'healthy' && status !== 'port-conflict') {
      try {
        await execPromise(service.checkCmd, { timeout: 10000 });
        status = 'healthy';
        details = 'Check command passed';
      } catch (error) {
        if (status === 'unknown') {
          status = 'down';
          details = `Check command failed: ${error.message}`;
        }
      }
    }
  } catch (error) {
    status = 'error';
    details = error.message;
  }
  
  recoveryState.serviceStates[serviceId] = {
    status,
    details,
    lastCheck: new Date().toISOString(),
    portConflict: portConflict ? { type: portConflict.type, message: portConflict.message } : null
  };
  
  let color = 'yellow';
  if (status === 'healthy') color = 'green';
  else if (status === 'down') color = 'red';
  else if (status === 'port-conflict') color = 'magenta';
  
  log(`  ${service.name}: ${status} - ${details}`, color);
  
  return { serviceId, status, details, portConflict };
}

// Kill process on port (Windows) - with safety checks
async function killPort(port, conflictInfo = null) {
  log(`  Killing process on port ${port}...`, 'yellow');
  
  // Don't kill system processes or Tailscale
  if (conflictInfo) {
    if (!conflictInfo.canKill) {
      log(`    Cannot kill ${conflictInfo.type} process - using fallback port`, 'yellow');
      return false;
    }
  }
  
  try {
    // Find PID using the port
    const { stdout } = await execPromise(`netstat -ano | findstr :${port}`);
    const lines = stdout.split('\n').filter(l => l.includes('LISTENING'));
    
    let killed = false;
    for (const line of lines) {
      const parts = line.trim().split(/\s+/);
      const pid = parts[parts.length - 1];
      if (pid && !isNaN(parseInt(pid))) {
        try {
          await execPromise(`taskkill /F /PID ${pid}`);
          log(`    Killed process ${pid}`, 'green');
          killed = true;
        } catch (e) {
          log(`    Failed to kill ${pid}: ${e.message}`, 'yellow');
        }
      }
    }
    return killed;
  } catch (error) {
    log(`    No process found on port ${port}`, 'dim');
    return false;
  }
}

// Start a service
async function startService(serviceId, service) {
  log(`  Starting ${service.name}...`, 'cyan');
  
  try {
    if (service.startCmd) {
      // Spawn in background without blocking
      const child = spawnDetached(service.startCmd, service.cwd);
      if (!child) return false;
      
      // Wait for service to start
      const healthy = await waitForServiceHealthy(service, 20000, 2000);
      if (healthy) {
        log(`    ${service.name} started successfully`, 'green');
        return true;
      }
      log(`    ${service.name} did not become healthy within timeout`, 'red');
      return false;
    }
  } catch (error) {
    log(`    Error starting ${service.name}: ${error.message}`, 'red');
    return false;
  }
}

// Recover a service with enhanced port conflict handling
async function recoverService(serviceId, service) {
  log(`Recovering ${service.name}...`, 'cyan');
  
  let recovered = false;
  let usedFallbackPort = false;
  
  for (const action of service.recoveryActions) {
    if (recovered) break;
    
    switch (action) {
      case 'detect-port-conflict':
        if (serviceId === 'openclaw-gateway') {
          const conflict = await detectPortConflict(service.port);
          if (conflict.type !== 'none') {
            log(`    Port conflict detected: ${conflict.message}`, 'magenta');
            recoveryState.portConflicts[serviceId] = conflict;
          }
        }
        break;
        
      case 'kill-port':
        if (service.port) {
          const conflict = recoveryState.portConflicts[serviceId];
          await killPort(service.port, conflict);
          await new Promise(r => setTimeout(r, 2000));
        }
        break;
        
      case 'restart-service':
        recovered = await startService(serviceId, service);
        break;
        
      case 'restart-gateway':
        try {
          // First try to stop properly
          try {
            await execPromise('openclaw gateway stop', { timeout: 15000 });
            await new Promise(r => setTimeout(r, 3000));
          } catch {
            // May already be stopped
          }
          
          // Start gateway
          await execPromise('openclaw gateway start', { timeout: 30000 });
          await new Promise(r => setTimeout(r, 5000));
          
          // Check if it's actually healthy
          const healthy = await isGatewayHealthy(service.port);
          recovered = healthy;
          
          if (recovered) {
            log('    Gateway restarted and healthy', 'green');
          } else {
            log('    Gateway started but not responding correctly', 'yellow');
          }
        } catch (e) {
          log(`    Gateway restart failed: ${e.message}`, 'red');
        }
        break;
        
      case 'fallback-port':
        if (service.fallbackPorts && !recovered) {
          log('    Attempting fallback port...', 'cyan');
          const fallbackPort = await findAvailablePort(service.fallbackPorts);
          
          if (fallbackPort) {
            log(`    Found available port: ${fallbackPort}`, 'green');
            
            // Update config
            const updated = await updateGatewayPort(fallbackPort);
            if (updated) {
              // Update service definition temporarily
              service.port = fallbackPort;
              usedFallbackPort = true;
              
              // Try starting again
              try {
                await execPromise('openclaw gateway restart', { timeout: 30000 });
                await new Promise(r => setTimeout(r, 5000));
                
                const healthy = await isGatewayHealthy(fallbackPort);
                recovered = healthy;
                
                if (recovered) {
                  log(`    Gateway running on fallback port ${fallbackPort}`, 'green');
                }
              } catch (e) {
                log(`    Fallback port start failed: ${e.message}`, 'red');
              }
            }
          } else {
            log('    No fallback ports available', 'red');
          }
        }
        break;
        
      case 'restart-wsl':
        try {
          await execPromise('wsl --shutdown', { timeout: 30000 });
          await new Promise(r => setTimeout(r, 5000));
          await execPromise('wsl echo "ping"', { timeout: 10000 });
          recovered = true;
          log('    WSL restarted', 'green');
        } catch (e) {
          log(`    WSL restart failed: ${e.message}`, 'red');
        }
        break;
    }
  }
  
  if (recovered) {
    recoveryState.totalRecoveries++;
    recoveryState.consecutiveFailures[serviceId] = 0;
    log(`  ${service.name} recovered successfully${usedFallbackPort ? ' (using fallback port)' : ''}`, 'green');
  } else {
    recoveryState.consecutiveFailures[serviceId] = (recoveryState.consecutiveFailures[serviceId] || 0) + 1;
    log(`  ${service.name} recovery failed`, 'red');
  }
  
  return recovered;
}

// Main recovery function
async function runRecovery(options = {}) {
  const isAuto = options.auto || false;
  const isManual = options.manual || !isAuto;
  
  // Start progress tracking
  await progress.startTask(TASK_ID, 'Auto Recovery System', {
    description: 'Monitors and repairs critical services automatically',
    category: 'system',
    steps: ['Load state', 'Check services', 'Run backup if needed', 'Recover failed services', 'Update dashboard']
  });
  
  console.log('');
  log('════════════════════════════════════════', 'bright', false);
  log('   🔧 MARVIN AUTO-RECOVERY v2.0', 'bright', false);
  log('   ' + new Date().toLocaleString(), 'dim', false);
  if (isAuto) log('   Mode: Automatic', 'dim', false);
  if (isManual) log('   Mode: Manual', 'dim', false);
  log('════════════════════════════════════════', 'bright', false);
  
  await loadState();
  await progress.updateProgress(TASK_ID, 10, 'Loaded recovery state', { stepIndex: 0 });
  
  logSection('SYSTEM CHECK');
  await progress.updateProgress(TASK_ID, 25, 'Checking service health...', { stepIndex: 1 });
  
  const results = [];
  let needsRecovery = false;
  
  for (const [serviceId, service] of Object.entries(SERVICES)) {
    await progress.logTask(TASK_ID, `Checking ${service.name}...`);
    const result = await checkService(serviceId, service);
    results.push(result);
    
    if (result.status !== 'healthy' && service.autoStart) {
      needsRecovery = true;
      await progress.logTask(TASK_ID, `${service.name} needs recovery: ${result.status}`, 'warning');
    }
  }
  
  const healthyCount = results.filter(r => r.status === 'healthy').length;
  const portConflictCount = results.filter(r => r.status === 'port-conflict').length;
  const totalCount = results.length;
  
  logSection('CHECK SUMMARY');
  log(`${healthyCount}/${totalCount} services healthy`, healthyCount === totalCount ? 'green' : 'yellow');
  if (portConflictCount > 0) {
    log(`${portConflictCount} service(s) have port conflicts`, 'magenta');
  }
  await progress.updateProgress(TASK_ID, 40, `Service check complete: ${healthyCount}/${totalCount} healthy`, { stepIndex: 2 });
  
  // Backup phase (every 15 minutes)
  await progress.updateProgress(TASK_ID, 50, 'Running backup if needed...');
  await checkAndRunBackup();
  
  // Recovery phase
  let recoveryFailed = false;
  if (needsRecovery) {
    logSection('RECOVERY PHASE');
    await progress.updateProgress(TASK_ID, 60, 'Recovering failed services...', { stepIndex: 3 });
    
    for (const result of results) {
      if (result.status !== 'healthy' && SERVICES[result.serviceId].autoStart) {
        await progress.logTask(TASK_ID, `Recovering ${SERVICES[result.serviceId].name}...`);
        const recovered = await recoverService(result.serviceId, SERVICES[result.serviceId]);
        if (!recovered) {
          recoveryFailed = true;
          await progress.logTask(TASK_ID, `Failed to recover ${SERVICES[result.serviceId].name}`, 'error');
        } else {
          await progress.logTask(TASK_ID, `${SERVICES[result.serviceId].name} recovered successfully`);
        }
      }
    }
    
    // Re-check after recovery
    logSection('POST-RECOVERY CHECK');
    for (const [serviceId, service] of Object.entries(SERVICES)) {
      await checkService(serviceId, service);
    }
    
    const newHealthyCount = Object.values(recoveryState.serviceStates).filter(s => s.status === 'healthy').length;
    log(`\n${newHealthyCount}/${totalCount} services now healthy`, newHealthyCount === totalCount ? 'green' : 'yellow');
    
    // If recovery failed, attempt rollback
    if (recoveryFailed && newHealthyCount < totalCount) {
      const rolledBack = await rollbackToLastKnownGood();
      if (rolledBack) {
        recoveryFailed = false; // Rollback succeeded
      }
    }
  } else if (healthyCount === totalCount) {
    log('All services healthy - no recovery needed', 'green');
  }
  
  // Update state
  recoveryState.lastRun = new Date().toISOString();
  await saveState();
  
  // Update service status for dashboard
  await updateDashboardStatus();
  await progress.updateProgress(TASK_ID, 90, 'Updating dashboard status...');
  
  logSection('RECOVERY COMPLETE');
  
  // Complete progress tracking
  if (recoveryFailed) {
    await progress.completeTask(TASK_ID, { 
      failed: true, 
      error: 'One or more services could not be recovered',
      result: { healthyCount, totalCount, recoveryFailed }
    });
  } else {
    await progress.completeTask(TASK_ID, {
      result: { healthyCount, totalCount, recoveryFailed, totalRecoveries: recoveryState.totalRecoveries }
    });
  }
  
  log(`Total recoveries to date: ${recoveryState.totalRecoveries}`, 'cyan');
  if (recoveryState.lastBackup) {
    log(`Last backup: ${new Date(recoveryState.lastBackup).toLocaleString()}`, 'dim');
  }
  if (recoveryState.lastRollback) {
    log(`Last rollback: ${new Date(recoveryState.lastRollback).toLocaleString()}`, 'yellow');
  }
  
  // Show port conflict summary if any
  const activeConflicts = Object.entries(recoveryState.portConflicts || {});
  if (activeConflicts.length > 0) {
    log('\n⚠️ Active Port Conflicts:', 'magenta');
    for (const [svc, conflict] of activeConflicts) {
      log(`  - ${SERVICES[svc]?.name || svc}: ${conflict.message}`, 'yellow');
    }
  }
  
  log('Next check: 5 minutes (auto) or manual trigger', 'dim');
  console.log('');
  
  return !recoveryFailed;
}

// Check if backup is needed (every 15 minutes)
async function checkAndRunBackup() {
  const now = Date.now();
  const lastBackup = recoveryState.lastBackup ? new Date(recoveryState.lastBackup).getTime() : 0;
  const fifteenMinutes = 15 * 60 * 1000;
  
  if (now - lastBackup >= fifteenMinutes) {
    logSection('BACKUP PHASE');
    log('Running scheduled backup (every 15 min)...', 'cyan');
    await progress.logTask(TASK_ID, 'Starting scheduled backup');
    
    const result = await createBackup();
    
    if (result.success) {
      recoveryState.lastBackup = new Date().toISOString();
      await progress.logTask(TASK_ID, `Backup completed: ${result.filename}`);
      log('Backup completed successfully', 'green');
      return true;
    } else {
      await progress.logTask(TASK_ID, `Backup failed: ${result.error}`, 'error');
      log('Backup failed', 'red');
      return false;
    }
  }
  
  await progress.logTask(TASK_ID, 'Backup not needed (done recently)');
  return true; // No backup needed (already done recently)
}

// Rollback to last known good state
async function rollbackToLastKnownGood() {
  logSection('ROLLBACK PHASE');
  log('Recovery failed - attempting rollback to last known good state...', 'yellow');
  
  try {
    const restored = await restoreBackup();
    
    if (restored) {
      recoveryState.lastRollback = new Date().toISOString();
      log('Rollback completed successfully', 'green');
      
      // Re-check services after rollback
      log('Re-checking services after rollback...', 'cyan');
      for (const [serviceId, service] of Object.entries(SERVICES)) {
        await checkService(serviceId, service);
      }
      
      return true;
    } else {
      log('Rollback failed - manual intervention required', 'red');
      return false;
    }
  } catch (error) {
    log(`Rollback error: ${error.message}`, 'red');
    return false;
  }
}

// Update dashboard service status
async function updateDashboardStatus() {
  try {
    const SERVICE_STATUS_FILE = path.join(DATA_DIR, 'service-status.json');
    let serviceStatus = { services: [] };
    
    try {
      const data = await fs.readFile(SERVICE_STATUS_FILE, 'utf8');
      serviceStatus = JSON.parse(data);
    } catch {
      // File doesn't exist, use default
    }
    
    // Add or update auto-recovery service
    const recoveryService = serviceStatus.services.find(s => s.id === 'auto-recovery');
    if (recoveryService) {
      recoveryService.status = 'online';
      recoveryService.lastRecovery = new Date().toISOString();
      recoveryService.uptimeStarted = recoveryService.uptimeStarted || new Date().toISOString();
    } else {
      serviceStatus.services.push({
        id: 'auto-recovery',
        name: 'Auto Recovery',
        displayName: 'Auto Recovery',
        type: 'daemon',
        status: 'online',
        lastRecovery: new Date().toISOString(),
        uptimeStarted: new Date().toISOString(),
        checkInterval: '5m',
        description: 'Automatic service monitoring and recovery'
      });
    }
    
    serviceStatus.lastUpdated = new Date().toISOString();
    await fs.writeFile(SERVICE_STATUS_FILE, JSON.stringify(serviceStatus, null, 2));
  } catch (error) {
    // Silently fail
  }
}

// Main entry point
async function main() {
  const args = process.argv.slice(2);
  const isAuto = args.includes('--auto');
  const isManual = args.includes('--manual');
  
  try {
    await runRecovery({ auto: isAuto, manual: isManual });
  } catch (error) {
    log(`Recovery failed: ${error.message}`, 'red');
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { runRecovery };
