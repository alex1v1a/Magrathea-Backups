#!/usr/bin/env node
/**
 * Unified Monitoring & Alerting System
 * Monitors automation health, performance, alerts, and recovery actions.
 * Run via: node scripts/unified-monitor.js [--auto]
 */

const fs = require('fs').promises;
const path = require('path');
const util = require('util');
const { exec } = require('child_process');
const nodemailer = require('nodemailer');
const http = require('http');
const https = require('https');

const execPromise = util.promisify(exec);

const WORKSPACE_DIR = path.join(__dirname, '..');
const DATA_DIR = path.join(WORKSPACE_DIR, 'data');
const CONFIG_PATH = path.join(__dirname, 'unified-monitor.config.json');

const progress = require('./progress-tracker.js');

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset', toFile = true, logFile) {
  const timestamp = new Date().toISOString();
  const consoleMsg = `${colors[color]}${message}${colors.reset}`;
  const fileMsg = `[${timestamp}] ${message}`;

  console.log(consoleMsg);

  if (toFile && logFile) {
    fs.appendFile(logFile, fileMsg + '\n').catch(() => {});
  }
}

function logSection(title) {
  console.log('');
  log(`═══ ${title} ═══`, 'bright', false);
}

function resolvePath(relativePath) {
  if (!relativePath) return null;
  if (path.isAbsolute(relativePath)) return relativePath;
  return path.join(WORKSPACE_DIR, relativePath);
}

async function loadConfig() {
  const data = await fs.readFile(CONFIG_PATH, 'utf8');
  return JSON.parse(data);
}

async function loadState(stateFile) {
  try {
    const data = await fs.readFile(stateFile, 'utf8');
    return JSON.parse(data);
  } catch {
    return {
      lastRun: null,
      lastDigestSent: null,
      consecutiveFailures: {},
      lastAlerts: {},
      lastRecoveries: {}
    };
  }
}

async function saveState(stateFile, state) {
  await fs.mkdir(path.dirname(stateFile), { recursive: true });
  await fs.writeFile(stateFile, JSON.stringify(state, null, 2));
}

async function fetchWithTimeout(url, options = {}, timeoutMs = 5000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    return response;
  } finally {
    clearTimeout(timeout);
  }
}

async function httpPing(url, timeoutMs = 5000) {
  try {
    const response = await fetchWithTimeout(url, {}, timeoutMs);
    return response.ok;
  } catch {
    return false;
  }
}

async function checkService(service) {
  let status = 'unknown';
  let details = '';

  if (service.healthUrl) {
    const ok = await httpPing(service.healthUrl, 5000);
    if (ok) {
      status = 'healthy';
      details = 'Health endpoint OK';
    } else {
      status = 'down';
      details = 'Health endpoint not responding';
    }
  } else if (service.checkCmd) {
    try {
      await execPromise(service.checkCmd, { timeout: 15000 });
      status = 'healthy';
      details = 'Check command OK';
    } catch (error) {
      status = 'down';
      details = `Check command failed: ${error.message}`;
    }
  } else if (service.port) {
    const ok = await httpPing(`http://localhost:${service.port}/api/health`, 5000);
    status = ok ? 'healthy' : 'down';
    details = ok ? 'Port responding' : 'Port not responding';
  }

  return { ...service, status, details, checkedAt: new Date().toISOString() };
}

async function checkWSL(config) {
  if (!config) return { status: 'unknown', details: 'WSL check not configured' };
  try {
    await execPromise(config.checkCmd, { timeout: 10000 });
    return { status: 'healthy', details: 'WSL ping OK' };
  } catch (error) {
    return { status: 'down', details: `WSL ping failed: ${error.message}` };
  }
}

async function getFileTimestamp(filePath) {
  try {
    const stats = await fs.stat(filePath);
    return stats.mtime;
  } catch {
    return null;
  }
}

function getLastCompletedTask(progressData, taskId) {
  if (!progressData?.completedTasks) return null;
  return progressData.completedTasks.find(task => task.id === taskId) || null;
}

function getActiveTask(progressData, taskId) {
  if (!progressData?.activeTasks) return null;
  return progressData.activeTasks.find(task => task.id === taskId) || null;
}

async function checkCronJobs(cronJobs, progressData) {
  const now = Date.now();
  const results = [];

  for (const job of cronJobs) {
    let lastRun = null;

    if (job.statusFile) {
      const filePath = resolvePath(job.statusFile);
      lastRun = await getFileTimestamp(filePath);
    }

    if (!lastRun) {
      const lastTask = getLastCompletedTask(progressData, job.id);
      lastRun = lastTask ? new Date(lastTask.completedAt || lastTask.lastUpdated) : null;
    }

    const ageMinutes = lastRun ? (now - lastRun.getTime()) / 60000 : null;
    const grace = job.graceMinutes ?? 10;
    const expected = job.expectedIntervalMinutes ?? 30;

    let status = 'unknown';
    let details = 'No recent runs detected';

    if (lastRun) {
      if (ageMinutes <= expected + grace) {
        status = 'healthy';
        details = `Last run ${Math.round(ageMinutes)}m ago`;
      } else {
        status = 'overdue';
        details = `Last run ${Math.round(ageMinutes)}m ago`;
      }
    }

    const alertAfter = job.alertAfterMinutes ?? expected + grace;
    const critical = lastRun ? ageMinutes > alertAfter : true;

    results.push({
      ...job,
      status,
      details,
      lastRun: lastRun ? lastRun.toISOString() : null,
      ageMinutes,
      critical
    });
  }

  return results;
}

async function getDiskFreeGB(targetPath) {
  try {
    const ps = `$drive=(Get-Item -Path '${targetPath}').PSDrive.Name; $d=Get-PSDrive -Name $drive; $free=[math]::Round($d.Free/1GB,2); $total=[math]::Round(($d.Used+$d.Free)/1GB,2); Write-Output \"$free,$total\"`;
    const { stdout } = await execPromise(`powershell -Command "${ps}"`, { timeout: 10000 });
    const [freeStr, totalStr] = stdout.trim().split(',');
    const free = parseFloat(freeStr);
    const total = parseFloat(totalStr);
    if (Number.isNaN(free) || Number.isNaN(total)) throw new Error('parse error');
    return { free, total };
  } catch {
    return null;
  }
}

async function checkDiskSpace(config) {
  const results = [];
  for (const relativePath of config.paths || []) {
    const fullPath = resolvePath(relativePath);
    const usage = await getDiskFreeGB(fullPath);
    if (!usage) {
      results.push({
        path: relativePath,
        status: 'unknown',
        details: 'Unable to determine disk usage'
      });
      continue;
    }

    const status = usage.free < config.minFreeGB ? 'low' : 'healthy';
    const details = `${usage.free} GB free of ${usage.total} GB`;
    results.push({
      path: relativePath,
      status,
      details,
      freeGB: usage.free,
      totalGB: usage.total
    });
  }
  return results;
}

function computePerformance(metricsConfig, jobs, progressData, state) {
  const windowDays = metricsConfig.windowDays || 7;
  const since = Date.now() - windowDays * 24 * 60 * 60 * 1000;
  const defaultFailureRateThreshold = metricsConfig.failureRateThreshold || 0.2;
  const defaultMaxConsecutiveFailures = metricsConfig.maxConsecutiveFailures || 3;

  const results = [];
  for (const job of jobs) {
    const history = (progressData.completedTasks || []).filter(task => task.id === job.id && new Date(task.completedAt || task.lastUpdated).getTime() >= since);
    const total = history.length;
    const failures = history.filter(task => task.status === 'failed').length;
    const successes = history.filter(task => task.status === 'complete').length;
    const failureRate = total > 0 ? failures / total : 0;
    const durations = history.filter(task => typeof task.duration === 'number').map(task => task.duration);
    const avgDuration = durations.length ? Math.round(durations.reduce((sum, d) => sum + d, 0) / durations.length) : null;
    const lastRun = history[0] || getLastCompletedTask(progressData, job.id);
    const lastStatus = lastRun ? lastRun.status : 'unknown';

    if (lastRun && lastStatus === 'failed') {
      state.consecutiveFailures[job.id] = (state.consecutiveFailures[job.id] || 0) + 1;
    } else if (lastRun && lastStatus === 'complete') {
      state.consecutiveFailures[job.id] = 0;
    }

    const consecutive = state.consecutiveFailures[job.id] || 0;
    const failureRateThreshold = job.failureRateThreshold ?? defaultFailureRateThreshold;
    const maxConsecutiveFailures = job.maxConsecutiveFailures ?? defaultMaxConsecutiveFailures;
    const failingFrequently = failureRate >= failureRateThreshold || consecutive >= maxConsecutiveFailures;

    results.push({
      id: job.id,
      name: job.name,
      totalRuns: total,
      successes,
      failures,
      failureRate,
      avgDurationMs: avgDuration,
      lastStatus,
      lastRun: lastRun ? lastRun.completedAt || lastRun.lastUpdated : null,
      consecutiveFailures: consecutive,
      failingFrequently
    });
  }

  return results;
}

function buildIndicator(statuses) {
  if (statuses.some(s => ['critical', 'down', 'low', 'overdue', 'red'].includes(s))) return 'red';
  if (statuses.some(s => ['warning', 'yellow'].includes(s))) return 'yellow';
  return 'green';
}

async function killPort(port) {
  try {
    const { stdout } = await execPromise(`netstat -ano | findstr :${port}`);
    const lines = stdout.split('\n').filter(line => line.includes('LISTENING'));
    for (const line of lines) {
      const parts = line.trim().split(/\s+/);
      const pid = parts[parts.length - 1];
      if (pid && !isNaN(parseInt(pid, 10))) {
        await execPromise(`taskkill /F /PID ${pid}`);
      }
    }
    return true;
  } catch {
    return false;
  }
}

async function startService(service) {
  if (!service.startCmd) return false;
  const commandParts = service.startCmd.split(' ');
  const filePath = commandParts[0];
  const args = commandParts.slice(1).join(' ');
  const psCmd = `Start-Process -FilePath '${filePath}' -ArgumentList '${args}' -WindowStyle Hidden${service.cwd ? ` -WorkingDirectory '${service.cwd}'` : ''}`;
  await execPromise(`powershell -Command "${psCmd}"`, { timeout: 15000 });
  await new Promise(r => setTimeout(r, 3000));
  return true;
}

async function recoverService(service, logFile) {
  let recovered = false;
  for (const action of service.recoveryActions || []) {
    if (recovered) break;
    switch (action) {
      case 'kill-port':
        if (service.port) {
          await killPort(service.port);
          await new Promise(r => setTimeout(r, 2000));
        }
        break;
      case 'restart-service':
        recovered = await startService(service);
        break;
      case 'restart-gateway':
        try {
          await execPromise('openclaw gateway restart', { timeout: 30000 });
          await new Promise(r => setTimeout(r, 5000));
          recovered = true;
        } catch (error) {
          log(`Gateway restart failed: ${error.message}`, 'red', true, logFile);
        }
        break;
      case 'restart-wsl':
        try {
          await execPromise('wsl --shutdown', { timeout: 30000 });
          await new Promise(r => setTimeout(r, 5000));
          await execPromise('wsl echo "ping"', { timeout: 10000 });
          recovered = true;
        } catch (error) {
          log(`WSL restart failed: ${error.message}`, 'red', true, logFile);
        }
        break;
    }
  }
  return recovered;
}

async function cleanOldLogs(config, logFile) {
  if (!config?.enabled) return { cleaned: 0, freedMB: 0 };

  const maxAgeMs = (config.maxAgeDays || 14) * 24 * 60 * 60 * 1000;
  const extensions = (config.extensions || []).map(ext => ext.toLowerCase());
  const now = Date.now();
  const files = [];

  async function collectFiles(dir) {
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          await collectFiles(fullPath);
        } else {
          const ext = path.extname(entry.name).toLowerCase();
          if (extensions.length && !extensions.includes(ext)) continue;
          const stats = await fs.stat(fullPath);
          files.push({ path: fullPath, size: stats.size, mtime: stats.mtime.getTime() });
        }
      }
    } catch {
      // Ignore missing paths
    }
  }

  for (const relativePath of config.paths || []) {
    await collectFiles(resolvePath(relativePath));
  }

  files.sort((a, b) => a.mtime - b.mtime);

  let cleaned = 0;
  let freedBytes = 0;

  for (const file of files) {
    const age = now - file.mtime;
    if (age > maxAgeMs) {
      try {
        await fs.unlink(file.path);
        cleaned++;
        freedBytes += file.size;
      } catch (error) {
        log(`Failed to delete ${file.path}: ${error.message}`, 'yellow', true, logFile);
      }
    }
  }

  const maxTotalBytes = (config.maxTotalMB || 1024) * 1024 * 1024;
  const remaining = files.filter(f => now - f.mtime <= maxAgeMs);
  let totalBytes = remaining.reduce((sum, f) => sum + f.size, 0);

  if (totalBytes > maxTotalBytes) {
    for (const file of remaining) {
      if (totalBytes <= maxTotalBytes) break;
      try {
        await fs.unlink(file.path);
        cleaned++;
        freedBytes += file.size;
        totalBytes -= file.size;
      } catch (error) {
        log(`Failed to delete ${file.path}: ${error.message}`, 'yellow', true, logFile);
      }
    }
  }

  return { cleaned, freedMB: Math.round(freedBytes / (1024 * 1024)) };
}

async function resetStuckProcesses(config, progressData, logFile) {
  const results = [];
  for (const entry of config || []) {
    const task = getActiveTask(progressData, entry.taskId);
    if (!task) continue;

    const startedAt = new Date(task.startedAt).getTime();
    const runtimeMinutes = (Date.now() - startedAt) / 60000;

    if (runtimeMinutes > entry.maxRuntimeMinutes) {
      let actionTaken = false;
      if (entry.killCmd) {
        try {
          await execPromise(entry.killCmd, { timeout: 15000 });
          actionTaken = true;
        } catch (error) {
          log(`Failed to run killCmd for ${entry.taskId}: ${error.message}`, 'yellow', true, logFile);
        }
      } else if (entry.processName) {
        try {
          await execPromise(`taskkill /F /IM ${entry.processName}`, { timeout: 15000 });
          actionTaken = true;
        } catch (error) {
          log(`Failed to kill ${entry.processName}: ${error.message}`, 'yellow', true, logFile);
        }
      }

      if (actionTaken) {
        await progress.blockTask(entry.taskId, 'Stopped due to exceeding runtime', { log: true });
      }

      results.push({
        taskId: entry.taskId,
        runtimeMinutes: Math.round(runtimeMinutes),
        actionTaken
      });
    }
  }
  return results;
}

function shouldAlert(state, key, cooldownMinutes) {
  const last = state.lastAlerts?.[key];
  if (!last) return true;
  const elapsed = (Date.now() - new Date(last).getTime()) / 60000;
  return elapsed >= cooldownMinutes;
}

async function sendDiscordAlert(webhookUrl, message) {
  if (!webhookUrl) return false;

  const payload = JSON.stringify({ content: message });
  const url = new URL(webhookUrl);
  const client = url.protocol === 'https:' ? https : http;

  return new Promise(resolve => {
    const req = client.request(
      {
        method: 'POST',
        hostname: url.hostname,
        port: url.port || (url.protocol === 'https:' ? 443 : 80),
        path: url.pathname + url.search,
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload)
        }
      },
      res => {
        resolve(res.statusCode >= 200 && res.statusCode < 300);
      }
    );
    req.on('error', () => resolve(false));
    req.write(payload);
    req.end();
  });
}

async function sendEmailAlert(config, subject, text) {
  if (!config?.enabled) return false;
  if (!config.to || config.to.length === 0) return false;
  const smtp = config.smtp || {};
  const user = process.env[smtp.authUserEnv];
  const pass = process.env[smtp.authPassEnv];
  const from = process.env[config.fromEnv] || user;

  if (!user || !pass || !from) return false;

  const transporter = nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port,
    secure: smtp.secure,
    auth: { user, pass }
  });

  await transporter.sendMail({
    from,
    to: config.to.join(','),
    subject,
    text
  });

  return true;
}

function formatHealthSummary({ services, cronJobs, wsl, disk, performance }) {
  const serviceDown = services.filter(s => s.status !== 'healthy');
  const overdueJobs = cronJobs.filter(j => j.status !== 'healthy');
  const failingScripts = performance.filter(p => p.failingFrequently);
  const lowDisk = disk.filter(d => d.status !== 'healthy');

  const lines = [];
  lines.push(`Services: ${services.length - serviceDown.length}/${services.length} healthy`);
  if (serviceDown.length) lines.push(`- Down: ${serviceDown.map(s => s.name).join(', ')}`);
  lines.push(`Cron Jobs: ${cronJobs.length - overdueJobs.length}/${cronJobs.length} healthy`);
  if (overdueJobs.length) lines.push(`- Overdue: ${overdueJobs.map(j => j.name).join(', ')}`);
  lines.push(`WSL: ${wsl.status}`);
  if (lowDisk.length) lines.push(`Disk: ${lowDisk.map(d => `${d.path} (${d.details})`).join(', ')}`);
  if (failingScripts.length) lines.push(`Failing scripts: ${failingScripts.map(s => s.name).join(', ')}`);
  return lines.join('\n');
}

async function updateDashboardStatus(statusFile, data) {
  await fs.mkdir(path.dirname(statusFile), { recursive: true });
  await fs.writeFile(statusFile, JSON.stringify(data, null, 2));
}

async function updateServiceStatus() {
  const SERVICE_STATUS_FILE = path.join(DATA_DIR, 'service-status.json');
  try {
    const data = await fs.readFile(SERVICE_STATUS_FILE, 'utf8');
    const serviceStatus = JSON.parse(data);

    const existing = serviceStatus.services.find(s => s.id === 'unified-monitor');
    if (existing) {
      existing.status = 'online';
      existing.lastRecovery = new Date().toISOString();
      existing.uptimeStarted = existing.uptimeStarted || new Date().toISOString();
    } else {
      serviceStatus.services.push({
        id: 'unified-monitor',
        name: 'Unified Monitor',
        displayName: 'Unified Monitor',
        type: 'daemon',
        status: 'online',
        lastRecovery: new Date().toISOString(),
        uptimeStarted: new Date().toISOString(),
        checkInterval: '5m',
        description: 'Unified health monitoring and alerting'
      });
    }

    serviceStatus.lastUpdated = new Date().toISOString();
    await fs.writeFile(SERVICE_STATUS_FILE, JSON.stringify(serviceStatus, null, 2));
  } catch {
    // ignore
  }
}

async function runMonitor(options = {}) {
  const config = await loadConfig();
  const stateFile = resolvePath(config.monitor?.stateFile || 'data/unified-monitor-state.json');
  const statusFile = resolvePath(config.monitor?.statusFile || 'data/unified-monitor-status.json');
  const performanceFile = resolvePath(config.monitor?.performanceFile || 'data/unified-monitor-performance.json');
  const logFile = path.join(DATA_DIR, 'unified-monitor.log');

  const taskId = config.monitor?.taskId || 'unified-monitor';
  await progress.startTask(taskId, 'Unified Monitor', {
    description: 'Unified monitoring for Marvin automation scripts',
    category: 'system',
    steps: ['Load state', 'Health checks', 'Performance analysis', 'Recovery', 'Alerts', 'Dashboard update']
  });

  const state = await loadState(stateFile);
  await progress.updateProgress(taskId, 10, 'Loaded state', { stepIndex: 0 });

  const progressData = await progress.getProgress();

  logSection('HEALTH CHECKS');
  const services = [];
  for (const service of config.services || []) {
    const result = await checkService(service);
    services.push(result);
    log(`${service.name}: ${result.status} - ${result.details}`, result.status === 'healthy' ? 'green' : 'red', true, logFile);
  }

  const wsl = await checkWSL(config.wsl);
  log(`${config.wsl?.name || 'WSL'}: ${wsl.status} - ${wsl.details}`, wsl.status === 'healthy' ? 'green' : 'red', true, logFile);

  const cronJobs = await checkCronJobs(config.cronJobs || [], progressData);
  for (const job of cronJobs) {
    const color = job.status === 'healthy' ? 'green' : 'yellow';
    log(`${job.name}: ${job.status} - ${job.details}`, color, true, logFile);
  }

  const disk = await checkDiskSpace(config.disk || { paths: [] });
  for (const entry of disk) {
    const color = entry.status === 'healthy' ? 'green' : 'yellow';
    log(`Disk ${entry.path}: ${entry.status} - ${entry.details}`, color, true, logFile);
  }

  await progress.updateProgress(taskId, 35, 'Health checks complete', { stepIndex: 1 });

  logSection('PERFORMANCE');
  const performanceTargets = [...(config.cronJobs || []), ...(config.scripts || [])];
  const performance = computePerformance(config.performance || {}, performanceTargets, progressData, state);
  await fs.writeFile(performanceFile, JSON.stringify({
    lastUpdated: new Date().toISOString(),
    windowDays: config.performance?.windowDays || 7,
    scripts: performance
  }, null, 2));

  const frequentFailures = performance.filter(p => p.failingFrequently);
  if (frequentFailures.length) {
    log(`Failing frequently: ${frequentFailures.map(p => p.name).join(', ')}`, 'yellow', true, logFile);
  } else {
    log('No frequent failures detected', 'green', true, logFile);
  }

  await progress.updateProgress(taskId, 55, 'Performance analysis complete', { stepIndex: 2 });

  logSection('RECOVERY');
  const recoveryResults = [];
  for (const service of services) {
    if (service.status !== 'healthy' && service.autoRestart) {
      log(`Recovering ${service.name}...`, 'cyan', true, logFile);
      const recovered = await recoverService(service, logFile);
      recoveryResults.push({ id: service.id, recovered });
      log(`${service.name} recovery ${recovered ? 'succeeded' : 'failed'}`, recovered ? 'green' : 'red', true, logFile);
      if (recovered) {
        state.lastRecoveries[service.id] = new Date().toISOString();
      }
    }
  }

  if (wsl.status !== 'healthy' && config.wsl?.autoRestart) {
    log('Attempting WSL restart...', 'cyan', true, logFile);
    try {
      await execPromise(config.wsl.restartCmd, { timeout: 30000 });
      await execPromise(config.wsl.checkCmd, { timeout: 10000 });
      recoveryResults.push({ id: config.wsl.id || 'wsl', recovered: true });
      state.lastRecoveries[config.wsl.id || 'wsl'] = new Date().toISOString();
      log('WSL restart succeeded', 'green', true, logFile);
    } catch (error) {
      recoveryResults.push({ id: config.wsl.id || 'wsl', recovered: false });
      log(`WSL restart failed: ${error.message}`, 'red', true, logFile);
    }
  }

  for (const job of cronJobs) {
    if (job.status !== 'healthy' && job.autoRecover && job.recoveryCommand) {
      try {
        log(`Running recovery for ${job.name}...`, 'cyan', true, logFile);
        await execPromise(job.recoveryCommand, { timeout: 60000, cwd: WORKSPACE_DIR });
        recoveryResults.push({ id: job.id, recovered: true });
      } catch (error) {
        recoveryResults.push({ id: job.id, recovered: false });
        log(`Cron recovery failed for ${job.name}: ${error.message}`, 'red', true, logFile);
      }
    }
  }

  const logCleanupResult = await cleanOldLogs(config.logCleanup, logFile);
  if (logCleanupResult.cleaned > 0) {
    log(`Log cleanup removed ${logCleanupResult.cleaned} files (${logCleanupResult.freedMB} MB)`, 'green', true, logFile);
  }

  const stuckResults = await resetStuckProcesses(config.stuckProcesses || [], progressData, logFile);
  if (stuckResults.length) {
    log(`Reset ${stuckResults.length} stuck processes`, 'yellow', true, logFile);
  }

  await progress.updateProgress(taskId, 75, 'Recovery actions complete', { stepIndex: 3 });

  logSection('ALERTS');
  const alertItems = [];

  for (const service of services) {
    if (service.status !== 'healthy') {
      alertItems.push({ key: `service:${service.id}`, severity: 'critical', message: `${service.name} is down` });
    }
  }

  for (const job of cronJobs) {
    if (job.status !== 'healthy') {
      alertItems.push({ key: `cron:${job.id}`, severity: job.critical ? 'critical' : 'warning', message: `${job.name} is overdue` });
    }
  }

  if (wsl.status !== 'healthy') {
    alertItems.push({ key: 'wsl', severity: 'critical', message: 'WSL connectivity failure' });
  }

  for (const entry of disk) {
    if (entry.status !== 'healthy') {
      alertItems.push({ key: `disk:${entry.path}`, severity: 'critical', message: `Low disk space on ${entry.path}` });
    }
  }

  for (const perf of frequentFailures) {
    alertItems.push({ key: `perf:${perf.id}`, severity: 'warning', message: `${perf.name} failing frequently` });
  }

  const webhook = process.env[config.alerts?.discordWebhookEnv || ''] || null;
  const cooldown = config.alerts?.cooldownMinutes || 30;

  for (const alert of alertItems) {
    if (alert.severity === 'warning' && !config.alerts?.notifyOnWarning) continue;
    if (!shouldAlert(state, alert.key, cooldown)) continue;

    const msg = `🚨 ${alert.message}`;
    const sentDiscord = await sendDiscordAlert(webhook, msg);
    if (sentDiscord) log(`Discord alert sent: ${alert.message}`, 'green', true, logFile);

    const sentEmail = await sendEmailAlert(config.alerts?.email, 'Marvin Alert', msg);
    if (sentEmail) log(`Email alert sent: ${alert.message}`, 'green', true, logFile);

    state.lastAlerts[alert.key] = new Date().toISOString();
  }

  await progress.updateProgress(taskId, 90, 'Alerts sent', { stepIndex: 4 });

  logSection('DASHBOARD UPDATE');

  const healthSummary = {
    lastUpdated: new Date().toISOString(),
    services,
    cronJobs,
    wsl,
    disk,
    performance,
    indicators: {
      services: buildIndicator(services.map(s => (s.status === 'healthy' ? 'healthy' : 'critical'))),
      cronJobs: buildIndicator(cronJobs.map(j => (j.status === 'healthy' ? 'healthy' : j.critical ? 'critical' : 'warning'))),
      wsl: buildIndicator([wsl.status === 'healthy' ? 'healthy' : 'critical']),
      disk: buildIndicator(disk.map(d => (d.status === 'healthy' ? 'healthy' : 'critical')))
    }
  };

  const overallIndicator = buildIndicator([
    healthSummary.indicators.services,
    healthSummary.indicators.cronJobs,
    healthSummary.indicators.wsl,
    healthSummary.indicators.disk
  ]);

  healthSummary.indicators.overall = overallIndicator;

  await updateDashboardStatus(statusFile, healthSummary);
  await updateServiceStatus();

  await progress.updateProgress(taskId, 98, 'Dashboard updated', { stepIndex: 5 });

  // Daily digest
  const digestConfig = config.alerts?.dailyDigest || {};
  if (digestConfig.enabled) {
    const [hour, minute] = (digestConfig.time || '08:00').split(':').map(Number);
    const now = new Date();
    const todayKey = now.toISOString().slice(0, 10);
    const lastDigestDate = state.lastDigestSent ? state.lastDigestSent.slice(0, 10) : null;

    if (now.getHours() >= hour && now.getMinutes() >= minute && lastDigestDate !== todayKey) {
      const summaryText = formatHealthSummary(healthSummary);
      const digestMessage = `🧾 Daily Automation Digest (${todayKey})\n${summaryText}`;

      if (digestConfig.channels?.includes('discord')) {
        await sendDiscordAlert(webhook, digestMessage);
      }
      if (digestConfig.channels?.includes('email')) {
        await sendEmailAlert(config.alerts?.email, `Marvin Daily Digest (${todayKey})`, summaryText);
      }

      state.lastDigestSent = new Date().toISOString();
    }
  }

  state.lastRun = new Date().toISOString();
  await saveState(stateFile, state);

  await progress.completeTask(taskId, {
    result: {
      overallIndicator,
      services: services.length,
      cronJobs: cronJobs.length,
      alerts: alertItems.length,
      recoveries: recoveryResults.length
    }
  });

  return healthSummary;
}

async function main() {
  try {
    await runMonitor();
  } catch (error) {
    console.error(`Unified monitor failed: ${error.message}`);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { runMonitor };
