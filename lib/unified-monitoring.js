/**
 * Marvin Unified Monitoring System
 * Central health monitoring for all automation services
 * 
 * Features:
 * - Real-time health checks for all services
 * - Performance metrics aggregation
 * - Predictive failure detection
 * - Alert system for anomalies
 * - REST API for dashboard integration
 */

const fs = require('fs').promises;
const path = require('path');
const http = require('http');
const { EventEmitter } = require('events');

const WORKSPACE_DIR = path.join(__dirname, '..', '..');
const DATA_DIR = path.join(WORKSPACE_DIR, 'data');
const LOGS_DIR = path.join(WORKSPACE_DIR, 'logs');
const STATE_FILE = path.join(DATA_DIR, 'monitoring-state.json');

// ============================================================================
// SERVICE DEFINITIONS
// ============================================================================

const SERVICES = {
  'dinner-automation': {
    name: 'Dinner Automation',
    checks: {
      cron: { type: 'cron', jobName: 'dinner-plan-generator' },
      files: { type: 'file', path: 'dinner-automation/data/weekly-plan.json', maxAge: 24 * 60 * 60 * 1000 },
      logs: { type: 'log', path: 'logs/dinner-automation.log', pattern: 'error', maxErrors: 5 },
    },
  },
  'marvin-dashboard': {
    name: 'Marvin Dashboard',
    checks: {
      http: { type: 'http', url: 'http://localhost:3001/health', timeout: 5000 },
      process: { type: 'process', name: 'node', args: ['marvin-dash/server.js'] },
    },
  },
  'facebook-marketplace': {
    name: 'Facebook Marketplace',
    checks: {
      cron: { type: 'cron', jobName: 'facebook-marketplace-monitor' },
      files: { type: 'file', path: 'dinner-automation/data/fb-listing-state.json', maxAge: 7 * 24 * 60 * 60 * 1000 },
    },
  },
  'email-system': {
    name: 'Email System',
    checks: {
      smtp: { type: 'smtp', host: 'smtp.mail.me.com', port: 587 },
      imap: { type: 'imap', host: 'imap.mail.me.com', port: 993 },
    },
  },
  'chrome-bridge': {
    name: 'Chrome Bridge',
    checks: {
      port: { type: 'port', host: 'localhost', port: 9222 },
      process: { type: 'process', name: 'chrome' },
    },
  },
};

// ============================================================================
// HEALTH CHECKERS
// ============================================================================

class HealthCheckers {
  static async cron(jobName) {
    try {
      // Read cron state from file or check running processes
      const cronFile = path.join(DATA_DIR, 'cron-state.json');
      const data = await fs.readFile(cronFile, 'utf8').catch(() => '{}');
      const state = JSON.parse(data);
      
      return {
        healthy: state[jobName]?.lastRun > Date.now() - 24 * 60 * 60 * 1000,
        lastRun: state[jobName]?.lastRun,
        nextRun: state[jobName]?.nextRun,
      };
    } catch (e) {
      return { healthy: false, error: e.message };
    }
  }

  static async file(filePath, maxAge) {
    try {
      const fullPath = path.join(WORKSPACE_DIR, filePath);
      const stats = await fs.stat(fullPath);
      const age = Date.now() - stats.mtime.getTime();
      
      return {
        healthy: age < maxAge,
        age: Math.round(age / 1000 / 60), // minutes
        modified: stats.mtime.toISOString(),
      };
    } catch (e) {
      return { healthy: false, error: e.message };
    }
  }

  static async log(filePath, pattern, maxErrors) {
    try {
      const fullPath = path.join(WORKSPACE_DIR, filePath);
      const content = await fs.readFile(fullPath, 'utf8').catch(() => '');
      const lines = content.split('\n').slice(-100); // Last 100 lines
      
      const errors = lines.filter(line => 
        line.toLowerCase().includes(pattern.toLowerCase())
      );
      
      return {
        healthy: errors.length < maxErrors,
        errorCount: errors.length,
        recentErrors: errors.slice(-5),
      };
    } catch (e) {
      return { healthy: false, error: e.message };
    }
  }

  static async http(url, timeout) {
    return new Promise((resolve) => {
      const req = http.get(url, { timeout }, (res) => {
        resolve({
          healthy: res.statusCode < 400,
          statusCode: res.statusCode,
          responseTime: Date.now(), // Simplified
        });
      });
      
      req.on('error', (e) => {
        resolve({ healthy: false, error: e.message });
      });
      
      req.on('timeout', () => {
        req.destroy();
        resolve({ healthy: false, error: 'Timeout' });
      });
    });
  }

  static async process(name, args) {
    try {
      const { execSync } = require('child_process');
      const cmd = process.platform === 'win32'
        ? `tasklist /FI "IMAGENAME eq ${name}.exe" /FO CSV /NH`
        : `pgrep -f "${name}"`;
      
      const result = execSync(cmd, { encoding: 'utf8' });
      const running = result.toLowerCase().includes(name.toLowerCase());
      
      return {
        healthy: running,
        pid: running ? 'active' : null,
      };
    } catch (e) {
      return { healthy: false, error: e.message };
    }
  }

  static async port(host, port) {
    return new Promise((resolve) => {
      const socket = require('net').createConnection(port, host);
      
      socket.on('connect', () => {
        socket.end();
        resolve({ healthy: true, port, host });
      });
      
      socket.on('error', (e) => {
        resolve({ healthy: false, error: e.message });
      });
      
      socket.setTimeout(3000, () => {
        socket.destroy();
        resolve({ healthy: false, error: 'Connection timeout' });
      });
    });
  }

  static async smtp(host, port) {
    // Simplified check - just checks if port is open
    return this.port(host, port);
  }

  static async imap(host, port) {
    // Simplified check - just checks if port is open
    return this.port(host, port);
  }
}

// ============================================================================
// MONITORING ENGINE
// ============================================================================

class MonitoringEngine extends EventEmitter {
  constructor() {
    super();
    this.checks = [];
    this.history = [];
    this.maxHistory = 1000;
    this.state = {};
  }

  async loadState() {
    try {
      const data = await fs.readFile(STATE_FILE, 'utf8');
      this.state = JSON.parse(data);
    } catch (e) {
      this.state = {};
    }
  }

  async saveState() {
    try {
      await fs.mkdir(path.dirname(STATE_FILE), { recursive: true });
      await fs.writeFile(STATE_FILE, JSON.stringify(this.state, null, 2));
    } catch (e) {
      console.error('Failed to save state:', e.message);
    }
  }

  async checkService(serviceId, serviceConfig) {
    const results = {};
    let healthy = true;

    for (const [checkId, checkConfig] of Object.entries(serviceConfig.checks)) {
      const start = Date.now();
      
      try {
        const checker = HealthCheckers[checkConfig.type];
        if (!checker) {
          results[checkId] = { healthy: false, error: 'Unknown checker type' };
          healthy = false;
          continue;
        }

        const result = await checker(
          ...Object.values(checkConfig).slice(1)
        );
        
        results[checkId] = {
          ...result,
          responseTime: Date.now() - start,
        };
        
        if (!result.healthy) healthy = false;
      } catch (e) {
        results[checkId] = { healthy: false, error: e.message };
        healthy = false;
      }
    }

    const status = {
      id: serviceId,
      name: serviceConfig.name,
      healthy,
      timestamp: new Date().toISOString(),
      checks: results,
    };

    this.state[serviceId] = status;
    this.history.push(status);
    
    if (this.history.length > this.maxHistory) {
      this.history.shift();
    }

    // Emit events for critical changes
    const prevStatus = this.history.slice(-2)[0];
    if (prevStatus && prevStatus.healthy !== healthy && !healthy) {
      this.emit('serviceDown', status);
    }

    return status;
  }

  async runAllChecks() {
    const results = {};
    
    for (const [serviceId, config] of Object.entries(SERVICES)) {
      results[serviceId] = await this.checkService(serviceId, config);
    }

    await this.saveState();
    return results;
  }

  getOverallHealth() {
    const services = Object.values(this.state);
    const healthy = services.filter(s => s.healthy).length;
    
    return {
      timestamp: new Date().toISOString(),
      overall: healthy === services.length ? 'healthy' : 'degraded',
      servicesTotal: services.length,
      servicesHealthy: healthy,
      servicesUnhealthy: services.length - healthy,
      uptime: this._calculateUptime(),
    };
  }

  _calculateUptime() {
    // Simplified uptime calculation
    const lastDay = this.history.filter(h => 
      new Date(h.timestamp) > Date.now() - 24 * 60 * 60 * 1000
    );
    
    if (lastDay.length === 0) return 100;
    
    const healthyChecks = lastDay.filter(h => h.healthy).length;
    return (healthyChecks / lastDay.length * 100).toFixed(2);
  }

  getMetrics() {
    return {
      overall: this.getOverallHealth(),
      services: this.state,
      recentHistory: this.history.slice(-20),
    };
  }
}

// ============================================================================
// PREDICTIVE ANALYTICS
// ============================================================================

class PredictiveAnalytics {
  constructor(engine) {
    this.engine = engine;
    this.patterns = new Map();
  }

  analyzeTrends(serviceId, checkId) {
    const history = this.engine.history
      .filter(h => h.id === serviceId)
      .slice(-50);

    if (history.length < 10) return null;

    const checkHistory = history.map(h => ({
      healthy: h.checks[checkId]?.healthy,
      responseTime: h.checks[checkId]?.responseTime,
      timestamp: new Date(h.timestamp),
    }));

    // Calculate degradation trend
    const recent = checkHistory.slice(-10);
    const older = checkHistory.slice(-20, -10);

    const recentSuccessRate = recent.filter(h => h.healthy).length / recent.length;
    const olderSuccessRate = older.filter(h => h.healthy).length / older.length;

    const avgResponseTime = recent.reduce((a, h) => a + (h.responseTime || 0), 0) / recent.length;
    const responseTimeTrend = recent.slice(-5).reduce((a, h) => a + (h.responseTime || 0), 0) / 5 -
      recent.slice(0, 5).reduce((a, h) => a + (h.responseTime || 0), 0) / 5;

    return {
      serviceId,
      checkId,
      recentSuccessRate,
      olderSuccessRate,
      degrading: recentSuccessRate < olderSuccessRate,
      avgResponseTime: Math.round(avgResponseTime),
      responseTimeTrend: Math.round(responseTimeTrend),
      riskScore: this._calculateRiskScore(recentSuccessRate, avgResponseTime, responseTimeTrend),
    };
  }

  _calculateRiskScore(successRate, avgResponseTime, responseTrend) {
    let score = 0;
    if (successRate < 0.95) score += 30;
    if (successRate < 0.9) score += 30;
    if (avgResponseTime > 5000) score += 20;
    if (responseTrend > 1000) score += 20;
    return Math.min(100, score);
  }

  getPredictions() {
    const predictions = [];
    
    for (const serviceId of Object.keys(SERVICES)) {
      const service = SERVICES[serviceId];
      for (const checkId of Object.keys(service.checks)) {
        const trend = this.analyzeTrends(serviceId, checkId);
        if (trend && trend.riskScore > 30) {
          predictions.push(trend);
        }
      }
    }

    return predictions.sort((a, b) => b.riskScore - a.riskScore);
  }
}

// ============================================================================
// API SERVER
// ============================================================================

class MonitoringServer {
  constructor(engine, analytics) {
    this.engine = engine;
    this.analytics = analytics;
    this.port = process.env.MONITOR_PORT || 3456;
  }

  start() {
    const server = http.createServer((req, res) => {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Access-Control-Allow-Origin', '*');

      const url = new URL(req.url, `http://localhost:${this.port}`);

      switch (url.pathname) {
        case '/health':
          res.end(JSON.stringify(this.engine.getOverallHealth()));
          break;
        
        case '/metrics':
          res.end(JSON.stringify(this.engine.getMetrics()));
          break;
        
        case '/predictions':
          res.end(JSON.stringify(this.analytics.getPredictions()));
          break;
        
        case '/services':
          res.end(JSON.stringify(SERVICES));
          break;
        
        default:
          res.statusCode = 404;
          res.end(JSON.stringify({ error: 'Not found' }));
      }
    });

    server.listen(this.port, () => {
      console.log(`📊 Monitoring server running on port ${this.port}`);
    });

    return server;
  }
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  const engine = new MonitoringEngine();
  await engine.loadState();

  const analytics = new PredictiveAnalytics(engine);

  // Run initial checks
  console.log('🔍 Running initial health checks...');
  const results = await engine.runAllChecks();
  
  console.log('\n📊 SERVICE HEALTH');
  console.log('=================');
  for (const [id, result] of Object.entries(results)) {
    const icon = result.healthy ? '✅' : '❌';
    console.log(`${icon} ${result.name}: ${result.healthy ? 'Healthy' : 'Unhealthy'}`);
  }

  const overall = engine.getOverallHealth();
  console.log(`\n🎯 Overall: ${overall.overall.toUpperCase()}`);
  console.log(`📈 Uptime (24h): ${overall.uptime}%`);

  // Check predictions
  const predictions = analytics.getPredictions();
  if (predictions.length > 0) {
    console.log('\n⚠️  PREDICTIVE ALERTS');
    console.log('=====================');
    predictions.forEach(p => {
      console.log(`🔴 ${p.serviceId}.${p.checkId}: Risk ${p.riskScore}%`);
    });
  }

  // Start API server
  const server = new MonitoringServer(engine, analytics);
  server.start();

  // Schedule periodic checks
  setInterval(async () => {
    await engine.runAllChecks();
  }, 60000); // Every minute

  console.log('\n🤖 Monitoring active. Press Ctrl+C to stop.');
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { MonitoringEngine, PredictiveAnalytics, HealthCheckers };
