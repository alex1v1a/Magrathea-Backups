/**
 * @fileoverview Comprehensive Health Monitoring Module
 * Provides reusable health checks for the automation system
 * @module lib/health-monitor
 */

const { execSync, exec } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const http = require('http');
const https = require('https');
const { promisify } = require('util');
const net = require('net');

// Configuration defaults
const DEFAULT_CONFIG = {
  ports: {
    chrome: 9222,      // Chrome CDP port for Facebook/HEB
    edge: 9222,        // Edge CDP port (same port, different process check)
    dashboard: 3001,   // Marvin Dashboard
    gateway: 18789     // OpenClaw Gateway
  },
  disk: {
    warningThreshold: 80,   // Percentage
    criticalThreshold: 90   // Percentage
  },
  memory: {
    warningThreshold: 85,   // Percentage
    criticalThreshold: 95   // Percentage
  },
  files: {
    recipeDatabase: 'dinner-automation/data/recipe-database.json',
    automationStatus: 'dinner-automation/data/automation-status.json',
    weeklyPlan: 'dinner-automation/data/weekly-plan.json',
    mealPlans: 'meal-plans',
    serviceStatus: 'marvin-dash/data/service-status.json',
    tasks: 'marvin-dash/data/tasks.json'
  },
  email: {
    smtpHost: 'smtp.mail.me.com',
    smtpPort: 587,
    imapHost: 'imap.mail.me.com',
    imapPort: 993,
    timeout: 10000
  },
  cron: {
    tasks: [
      'Marvin Auto Recovery',
      'Marvin Email Monitor',
      'Marvin Backup',
      'WSL-24x7-Monitor',
      'OpenClaw Gateway Auto-Recovery',
      'Kanban-AutoRefresh',
      'Marvin Dinner Automation',
      'Marvin Facebook Monitor'
    ]
  }
};

/**
 * Check result type definition
 * @typedef {Object} CheckResult
 * @property {string} name - Check name
 * @property {string} status - 'healthy', 'warning', 'critical', 'error'
 * @property {string} message - Human-readable message
 * @property {*} data - Optional detailed data
 * @property {number} timestamp - Unix timestamp
 * @property {number} duration - Check duration in ms
 */

class HealthMonitor {
  constructor(config = {}) {
    this.config = this.mergeConfig(DEFAULT_CONFIG, config);
    this.results = [];
    this.startTime = Date.now();
  }

  mergeConfig(defaults, custom) {
    return {
      ports: { ...defaults.ports, ...custom.ports },
      disk: { ...defaults.disk, ...custom.disk },
      memory: { ...defaults.memory, ...custom.memory },
      files: { ...defaults.files, ...custom.files },
      email: { ...defaults.email, ...custom.email },
      cron: { ...defaults.cron, ...custom.cron }
    };
  }

  /**
   * Run all health checks
   * @returns {Promise<Object>} Complete health report
   */
  async runAllChecks() {
    const startTime = Date.now();
    this.results = [];

    // Run all checks in parallel where possible
    const checks = await Promise.allSettled([
      this.checkBrowserStatus(),
      this.checkDiskSpace(),
      this.checkMemoryUsage(),
      this.checkCronJobs(),
      this.checkEmailConnectivity(),
      this.checkKeyFiles(),
      this.checkDashboardStatus(),
      this.checkGatewayStatus(),
      this.checkRecipeDatabase(),
      this.checkSystemProcesses()
    ]);

    const checkResults = checks.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        return {
          name: `check-${index}`,
          status: 'error',
          message: `Check failed: ${result.reason?.message || 'Unknown error'}`,
          data: { error: result.reason?.stack },
          timestamp: Date.now(),
          duration: 0
        };
      }
    });

    this.results = checkResults;

    // Calculate overall health score
    const healthScore = this.calculateHealthScore(checkResults);
    const criticalCount = checkResults.filter(r => r.status === 'critical').length;
    const warningCount = checkResults.filter(r => r.status === 'warning').length;

    return {
      timestamp: new Date().toISOString(),
      duration: Date.now() - startTime,
      overall: {
        status: criticalCount > 0 ? 'critical' : warningCount > 0 ? 'warning' : 'healthy',
        score: healthScore,
        checks: {
          total: checkResults.length,
          healthy: checkResults.filter(r => r.status === 'healthy').length,
          warning: warningCount,
          critical: criticalCount,
          error: checkResults.filter(r => r.status === 'error').length
        }
      },
      checks: checkResults
    };
  }

  /**
   * Check if Chrome and Edge browsers are running on correct ports
   */
  async checkBrowserStatus() {
    const startTime = Date.now();
    const results = {
      chrome: { running: false, port: this.config.ports.chrome, details: null },
      edge: { running: false, port: this.config.ports.edge, details: null }
    };

    try {
      // Check Chrome via CDP
      const chromeRunning = await this.isPortReachable(this.config.ports.chrome);
      results.chrome.running = chromeRunning;
      
      if (chromeRunning) {
        try {
          const version = await this.fetchCDPVersion(this.config.ports.chrome);
          results.chrome.details = { 
            version: version.Browser || 'unknown',
            protocolVersion: version['Protocol-Version']
          };
        } catch (e) {
          results.chrome.details = { error: 'CDP check failed' };
        }
      }

      // Check Edge - look for msedge.exe process
      try {
        const edgeProcesses = execSync('tasklist /FI "IMAGENAME eq msedge.exe" /FO CSV /NH', { 
          encoding: 'utf8',
          timeout: 5000
        });
        results.edge.running = edgeProcesses.includes('msedge.exe');
        if (results.edge.running) {
          const pidMatch = edgeProcesses.match(/"msedge.exe","(\d+)"/);
          if (pidMatch) {
            results.edge.details = { pid: parseInt(pidMatch[1]) };
          }
        }
      } catch {
        results.edge.running = false;
      }

      const status = results.chrome.running || results.edge.running ? 'healthy' : 'warning';
      
      return {
        name: 'browser-status',
        status,
        message: `Chrome: ${results.chrome.running ? 'running' : 'not running'}, Edge: ${results.edge.running ? 'running' : 'not running'}`,
        data: results,
        timestamp: Date.now(),
        duration: Date.now() - startTime
      };
    } catch (error) {
      return {
        name: 'browser-status',
        status: 'error',
        message: `Browser check failed: ${error.message}`,
        data: { error: error.message },
        timestamp: Date.now(),
        duration: Date.now() - startTime
      };
    }
  }

  /**
   * Check disk space usage
   */
  async checkDiskSpace() {
    const startTime = Date.now();
    
    try {
      // Windows: use PowerShell to get disk info (wmic is deprecated)
      const psCommand = `Get-CimInstance -ClassName Win32_LogicalDisk | Select-Object DeviceID, Size, FreeSpace | ConvertTo-Json`;
      const output = execSync(`powershell -Command "${psCommand}"`, {
        encoding: 'utf8',
        timeout: 10000
      });

      const diskData = JSON.parse(output);
      const disks = [];
      
      // Handle single disk or array
      const diskArray = Array.isArray(diskData) ? diskData : [diskData];
      
      for (const disk of diskArray) {
        if (disk.Size && disk.Size > 0) {
          const size = disk.Size;
          const freeSpace = disk.FreeSpace || 0;
          const usedPercent = ((size - freeSpace) / size) * 100;
          
          disks.push({
            drive: disk.DeviceID || 'Unknown',
            totalGB: parseFloat((size / (1024 ** 3)).toFixed(2)),
            freeGB: parseFloat((freeSpace / (1024 ** 3)).toFixed(2)),
            usedPercent: parseFloat(usedPercent.toFixed(2))
          });
        }
      }

      // Check for warnings/critical
      let maxUsedPercent = 0;
      let critical = false;
      let warning = false;

      for (const disk of disks) {
        if (disk.usedPercent > this.config.disk.criticalThreshold) {
          critical = true;
        } else if (disk.usedPercent > this.config.disk.warningThreshold) {
          warning = true;
        }
        maxUsedPercent = Math.max(maxUsedPercent, disk.usedPercent);
      }

      const status = critical ? 'critical' : warning ? 'warning' : 'healthy';
      const mainDisk = disks.find(d => d.drive.includes('C:')) || disks[0];

      return {
        name: 'disk-space',
        status,
        message: `Disk usage: ${mainDisk?.usedPercent.toFixed(1)}% (${mainDisk?.freeGB}GB free on ${mainDisk?.drive})`,
        data: { disks, maxUsedPercent },
        timestamp: Date.now(),
        duration: Date.now() - startTime
      };
    } catch (error) {
      return {
        name: 'disk-space',
        status: 'error',
        message: `Disk check failed: ${error.message}`,
        data: { error: error.message },
        timestamp: Date.now(),
        duration: Date.now() - startTime
      };
    }
  }

  /**
   * Check memory usage
   */
  async checkMemoryUsage() {
    const startTime = Date.now();
    
    try {
      // Windows: use PowerShell to get memory info (wmic is deprecated)
      // Use Get-CimInstance for reliable memory metrics
      // Values are in KB
      const psCommand = `Get-CimInstance -ClassName Win32_OperatingSystem | Select-Object TotalVisibleMemorySize, FreePhysicalMemory | ConvertTo-Json -Compress`;
      const output = execSync(`powershell -Command "${psCommand}"`, {
        encoding: 'utf8',
        timeout: 10000
      });

      const memData = JSON.parse(output.trim());
      const totalKB = memData.TotalVisibleMemorySize || 1;
      const freeKB = memData.FreePhysicalMemory || 0;
      const usedKB = totalKB - freeKB;
      
      // Convert KB to GB
      const totalGB = (totalKB / 1024 / 1024).toFixed(2);
      const freeGB = (freeKB / 1024 / 1024).toFixed(2);
      const usedPercent = (usedKB / totalKB) * 100;

      let status = 'healthy';
      if (usedPercent > this.config.memory.criticalThreshold) {
        status = 'critical';
      } else if (usedPercent > this.config.memory.warningThreshold) {
        status = 'warning';
      }

      return {
        name: 'memory-usage',
        status,
        message: `Memory: ${usedPercent.toFixed(1)}% used (${freeGB}GB free of ${totalGB}GB)`,
        data: {
          totalGB: parseFloat(totalGB),
          freeGB: parseFloat(freeGB),
          usedPercent: parseFloat(usedPercent.toFixed(2))
        },
        timestamp: Date.now(),
        duration: Date.now() - startTime
      };
    } catch (error) {
      return {
        name: 'memory-usage',
        status: 'error',
        message: `Memory check failed: ${error.message}`,
        data: { error: error.message },
        timestamp: Date.now(),
        duration: Date.now() - startTime
      };
    }
  }

  /**
   * Check cron job / scheduled task status
   */
  async checkCronJobs() {
    const startTime = Date.now();
    const results = [];

    for (const taskName of this.config.cron.tasks) {
      try {
        const output = execSync(`schtasks /Query /TN "${taskName}" /FO LIST /V 2>nul`, {
          encoding: 'utf8',
          timeout: 5000
        });

        const taskToRun = output.match(/Task To Run:\s+(.+)/)?.[1]?.trim();
        const lastRun = output.match(/Last Run Time:\s+(.+)/)?.[1]?.trim();
        const nextRun = output.match(/Next Run Time:\s+(.+)/)?.[1]?.trim();
        const status = output.match(/Task Status:\s+(.+)/)?.[1]?.trim();
        const lastResult = output.match(/Last Result:\s+(.+)/)?.[1]?.trim();

        // Parse last run time
        let lastRunTime = null;
        let hoursSinceLastRun = null;
        if (lastRun && lastRun !== 'N/A') {
          try {
            lastRunTime = new Date(lastRun);
            hoursSinceLastRun = (Date.now() - lastRunTime.getTime()) / (1000 * 60 * 60);
          } catch {}
        }

        // Determine health status
        let healthStatus = 'healthy';
        if (status === 'Disabled') {
          healthStatus = 'warning';
        } else if (lastResult && lastResult !== '0' && lastResult !== '267009') {
          healthStatus = 'warning';
        } else if (hoursSinceLastRun !== null && hoursSinceLastRun > 48) {
          healthStatus = 'warning';
        }

        results.push({
          name: taskName,
          status: healthStatus,
          enabled: status !== 'Disabled',
          lastRun: lastRun || 'N/A',
          nextRun: nextRun || 'N/A',
          lastResult: lastResult || 'N/A',
          hoursSinceLastRun: hoursSinceLastRun ? Math.round(hoursSinceLastRun) : null
        });
      } catch {
        results.push({
          name: taskName,
          status: 'error',
          enabled: false,
          error: 'Task not found'
        });
      }
    }

    const healthy = results.filter(r => r.status === 'healthy').length;
    const warning = results.filter(r => r.status === 'warning').length;
    const error = results.filter(r => r.status === 'error').length;

    return {
      name: 'cron-jobs',
      status: error > 0 ? 'warning' : warning > 0 ? 'warning' : 'healthy',
      message: `${healthy} healthy, ${warning} warning, ${error} error (of ${results.length} tasks)`,
      data: { tasks: results, summary: { healthy, warning, error, total: results.length } },
      timestamp: Date.now(),
      duration: Date.now() - startTime
    };
  }

  /**
   * Check email connectivity (SMTP/IMAP)
   */
  async checkEmailConnectivity() {
    const startTime = Date.now();
    const results = {
      smtp: { status: 'unknown', latency: null },
      imap: { status: 'unknown', latency: null }
    };

    // Check SMTP
    try {
      const smtpStart = Date.now();
      await this.checkTCPConnection(this.config.email.smtpHost, this.config.email.smtpPort);
      results.smtp = {
        status: 'reachable',
        latency: Date.now() - smtpStart
      };
    } catch (error) {
      results.smtp = { status: 'unreachable', error: error.message };
    }

    // Check IMAP
    try {
      const imapStart = Date.now();
      await this.checkTCPConnection(this.config.email.imapHost, this.config.email.imapPort);
      results.imap = {
        status: 'reachable',
        latency: Date.now() - imapStart
      };
    } catch (error) {
      results.imap = { status: 'unreachable', error: error.message };
    }

    const smtpOk = results.smtp.status === 'reachable';
    const imapOk = results.imap.status === 'reachable';

    let status = 'healthy';
    if (!smtpOk && !imapOk) status = 'critical';
    else if (!smtpOk || !imapOk) status = 'warning';

    return {
      name: 'email-connectivity',
      status,
      message: `SMTP: ${results.smtp.status}${results.smtp.latency ? ` (${results.smtp.latency}ms)` : ''}, IMAP: ${results.imap.status}${results.imap.latency ? ` (${results.imap.latency}ms)` : ''}`,
      data: results,
      timestamp: Date.now(),
      duration: Date.now() - startTime
    };
  }

  /**
   * Check key files exist and are valid
   */
  async checkKeyFiles() {
    const startTime = Date.now();
    const results = [];
    const workspaceRoot = process.cwd();

    for (const [name, relativePath] of Object.entries(this.config.files)) {
      const fullPath = path.join(workspaceRoot, relativePath);
      
      try {
        const stats = await fs.stat(fullPath);
        
        // Check if JSON is valid (for .json files)
        let jsonValid = null;
        if (fullPath.endsWith('.json')) {
          try {
            const content = await fs.readFile(fullPath, 'utf8');
            JSON.parse(content);
            jsonValid = true;
          } catch {
            jsonValid = false;
          }
        }

        results.push({
          name,
          path: relativePath,
          exists: true,
          size: stats.size,
          modified: stats.mtime.toISOString(),
          jsonValid,
          status: jsonValid === false ? 'warning' : 'healthy'
        });
      } catch {
        results.push({
          name,
          path: relativePath,
          exists: false,
          status: 'error'
        });
      }
    }

    const healthy = results.filter(r => r.status === 'healthy' || (r.exists && r.jsonValid !== false)).length;
    const warning = results.filter(r => r.status === 'warning' || r.jsonValid === false).length;
    const error = results.filter(r => r.status === 'error' || !r.exists).length;

    return {
      name: 'key-files',
      status: error > 0 ? 'critical' : warning > 0 ? 'warning' : 'healthy',
      message: `${healthy} OK, ${warning} warning, ${error} missing (of ${results.length} files)`,
      data: { files: results, summary: { healthy, warning, error, total: results.length } },
      timestamp: Date.now(),
      duration: Date.now() - startTime
    };
  }

  /**
   * Check dashboard server status
   */
  async checkDashboardStatus() {
    const startTime = Date.now();
    
    try {
      const response = await this.httpRequest(`http://localhost:${this.config.ports.dashboard}/api/health`);
      
      return {
        name: 'dashboard',
        status: response.status === 200 ? 'healthy' : 'warning',
        message: `Dashboard on port ${this.config.ports.dashboard}: ${response.status === 200 ? 'healthy' : 'unhealthy'}`,
        data: { 
          port: this.config.ports.dashboard,
          statusCode: response.status,
          response: response.data
        },
        timestamp: Date.now(),
        duration: Date.now() - startTime
      };
    } catch (error) {
      return {
        name: 'dashboard',
        status: 'critical',
        message: `Dashboard unreachable on port ${this.config.ports.dashboard}: ${error.message}`,
        data: { 
          port: this.config.ports.dashboard,
          error: error.message
        },
        timestamp: Date.now(),
        duration: Date.now() - startTime
      };
    }
  }

  /**
   * Check OpenClaw gateway status
   */
  async checkGatewayStatus() {
    const startTime = Date.now();
    
    try {
      // Try to connect to gateway webhook endpoint
      const response = await this.httpRequest(`http://localhost:${this.config.ports.gateway}/hooks/wake`, 'HEAD');
      
      return {
        name: 'gateway',
        status: 'healthy',
        message: `OpenClaw Gateway on port ${this.config.ports.gateway}: responding`,
        data: { 
          port: this.config.ports.gateway,
          statusCode: response.status
        },
        timestamp: Date.now(),
        duration: Date.now() - startTime
      };
    } catch (error) {
      return {
        name: 'gateway',
        status: 'warning',
        message: `OpenClaw Gateway check failed: ${error.message}`,
        data: { 
          port: this.config.ports.gateway,
          error: error.message
        },
        timestamp: Date.now(),
        duration: Date.now() - startTime
      };
    }
  }

  /**
   * Validate recipe database
   */
  async checkRecipeDatabase() {
    const startTime = Date.now();
    const dbPath = path.join(process.cwd(), this.config.files.recipeDatabase);
    
    try {
      const content = await fs.readFile(dbPath, 'utf8');
      const db = JSON.parse(content);
      
      const recipes = db.recipes || {};
      const recipeCount = Object.keys(recipes).length;
      
      // Validate recipe structure
      let validRecipes = 0;
      let invalidRecipes = 0;
      const issues = [];

      for (const [name, recipe] of Object.entries(recipes)) {
        const requiredFields = ['ingredients', 'instructions', 'prepTime', 'cookTime'];
        const missing = requiredFields.filter(f => !recipe[f]);
        
        if (missing.length === 0) {
          validRecipes++;
        } else {
          invalidRecipes++;
          issues.push({ recipe: name, missing });
        }
      }

      const status = invalidRecipes > 0 ? 'warning' : recipeCount > 0 ? 'healthy' : 'warning';

      return {
        name: 'recipe-database',
        status,
        message: `${recipeCount} recipes (${validRecipes} valid, ${invalidRecipes} invalid)`,
        data: {
          totalRecipes: recipeCount,
          validRecipes,
          invalidRecipes,
          issues: issues.slice(0, 5), // Limit issues in output
          fileSize: content.length
        },
        timestamp: Date.now(),
        duration: Date.now() - startTime
      };
    } catch (error) {
      return {
        name: 'recipe-database',
        status: 'critical',
        message: `Recipe database error: ${error.message}`,
        data: { error: error.message },
        timestamp: Date.now(),
        duration: Date.now() - startTime
      };
    }
  }

  /**
   * Check system processes
   */
  async checkSystemProcesses() {
    const startTime = Date.now();
    const processes = {
      node: { running: false, count: 0 },
      python: { running: false, count: 0 },
      chrome: { running: false, count: 0 },
      edge: { running: false, count: 0 }
    };

    try {
      const output = execSync('tasklist /FO CSV /NH', { encoding: 'utf8', timeout: 5000 });
      
      const lines = output.split('\n');
      for (const line of lines) {
        if (line.includes('node.exe')) processes.node.count++;
        if (line.includes('python.exe') || line.includes('python3.exe')) processes.python.count++;
        if (line.includes('chrome.exe')) processes.chrome.count++;
        if (line.includes('msedge.exe')) processes.edge.count++;
      }

      processes.node.running = processes.node.count > 0;
      processes.python.running = processes.python.count > 0;
      processes.chrome.running = processes.chrome.count > 0;
      processes.edge.running = processes.edge.count > 0;

      // High process counts might indicate issues
      const highChrome = processes.chrome.count > 10;
      const highNode = processes.node.count > 20;

      let status = 'healthy';
      if (highChrome || highNode) status = 'warning';

      return {
        name: 'system-processes',
        status,
        message: `Node: ${processes.node.count}, Chrome: ${processes.chrome.count}, Edge: ${processes.edge.count}, Python: ${processes.python.count}`,
        data: processes,
        timestamp: Date.now(),
        duration: Date.now() - startTime
      };
    } catch (error) {
      return {
        name: 'system-processes',
        status: 'error',
        message: `Process check failed: ${error.message}`,
        data: { error: error.message },
        timestamp: Date.now(),
        duration: Date.now() - startTime
      };
    }
  }

  // Helper methods

  async isPortReachable(port, host = 'localhost') {
    return new Promise((resolve) => {
      const socket = new net.Socket();
      socket.setTimeout(2000);
      
      socket.on('connect', () => {
        socket.destroy();
        resolve(true);
      });
      
      socket.on('timeout', () => {
        socket.destroy();
        resolve(false);
      });
      
      socket.on('error', () => {
        resolve(false);
      });
      
      socket.connect(port, host);
    });
  }

  async fetchCDPVersion(port) {
    return new Promise((resolve, reject) => {
      http.get(`http://localhost:${port}/json/version`, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(e);
          }
        });
      }).on('error', reject);
    });
  }

  async checkTCPConnection(host, port) {
    return new Promise((resolve, reject) => {
      const socket = new net.Socket();
      socket.setTimeout(this.config.email.timeout);
      
      socket.on('connect', () => {
        socket.destroy();
        resolve();
      });
      
      socket.on('timeout', () => {
        socket.destroy();
        reject(new Error('Connection timeout'));
      });
      
      socket.on('error', (err) => {
        reject(err);
      });
      
      socket.connect(port, host);
    });
  }

  httpRequest(url, method = 'GET') {
    return new Promise((resolve, reject) => {
      const client = url.startsWith('https') ? https : http;
      const req = client.request(url, { method, timeout: 5000 }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          resolve({ status: res.statusCode, data });
        });
      });
      
      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });
      
      req.end();
    });
  }

  calculateHealthScore(results) {
    const weights = {
      healthy: 100,
      warning: 50,
      error: 25,
      critical: 0
    };

    if (results.length === 0) return 0;

    const total = results.reduce((sum, r) => sum + (weights[r.status] || 0), 0);
    return Math.round(total / results.length);
  }

  /**
   * Get the most recent health check results
   */
  getResults() {
    return this.results;
  }
}

// Export both class and convenient factory function
module.exports = {
  HealthMonitor,
  
  /**
   * Quick health check function
   * @param {Object} config - Optional configuration
   * @returns {Promise<Object>} Health report
   */
  async checkHealth(config = {}) {
    const monitor = new HealthMonitor(config);
    return monitor.runAllChecks();
  },

  DEFAULT_CONFIG
};
