/**
 * Marvin Auto-Recovery System
 * 
 * Self-healing automation with intelligent restart strategies
 */

const fs = require('fs').promises;
const path = require('path');
const { spawn, execSync } = require('child_process');
const { EventEmitter } = require('events');

const WORKSPACE = path.join(__dirname, '..', '..');
const STATE_FILE = path.join(WORKSPACE, 'data', 'recovery-state.json');

// Recovery strategies for different failure patterns
const RECOVERY_STRATEGIES = {
  'chrome-crashed': {
    steps: [
      { action: 'kill', process: 'chrome' },
      { action: 'wait', duration: 2000 },
      { action: 'cleanup', path: 'dinner-automation/tmp' },
      { action: 'restart', service: 'chrome-bridge' },
      { action: 'verify', check: 'port:9222', retries: 5 },
    ],
    maxAttempts: 3,
  },
  'heb-timeout': {
    steps: [
      { action: 'log', message: 'HEB automation timeout detected' },
      { action: 'wait', duration: 30000 },
      { action: 'run', script: 'dinner-automation/scripts/heb-add-missing.js' },
    ],
    maxAttempts: 2,
  },
  'email-failed': {
    steps: [
      { action: 'wait', duration: 60000 },
      { action: 'check', service: 'smtp:icloud' },
      { action: 'run', script: 'dinner-automation/scripts/send-email.js' },
    ],
    maxAttempts: 5,
    backoffMultiplier: 2,
  },
  'dashboard-down': {
    steps: [
      { action: 'kill', process: 'node', args: ['marvin-dash/server.js'] },
      { action: 'wait', duration: 1000 },
      { action: 'restart', service: 'marvin-dashboard' },
      { action: 'verify', check: 'http://localhost:3001', retries: 10 },
    ],
    maxAttempts: 3,
  },
  'wsl-disconnected': {
    steps: [
      { action: 'exec', command: 'wsl --shutdown' },
      { action: 'wait', duration: 5000 },
      { action: 'exec', command: 'wsl echo "connected"' },
    ],
    maxAttempts: 3,
  },
};

class AutoRecovery extends EventEmitter {
  constructor() {
    super();
    this.state = {};
    this.activeRecoveries = new Map();
  }

  async loadState() {
    try {
      const data = await fs.readFile(STATE_FILE, 'utf8');
      this.state = JSON.parse(data);
    } catch (e) {
      this.state = { recoveries: [], lastCheck: null };
    }
  }

  async saveState() {
    await fs.mkdir(path.dirname(STATE_FILE), { recursive: true });
    await fs.writeFile(STATE_FILE, JSON.stringify(this.state, null, 2));
  }

  async detectFailures() {
    const failures = [];

    // Check Chrome/CDP port
    try {
      execSync('netstat -an | findstr :9222', { stdio: 'pipe' });
    } catch (e) {
      failures.push({ type: 'chrome-crashed', severity: 'critical' });
    }

    // Check Dashboard
    try {
      execSync('curl -s http://localhost:3001/health', { stdio: 'pipe', timeout: 5000 });
    } catch (e) {
      failures.push({ type: 'dashboard-down', severity: 'high' });
    }

    // Check recent logs for patterns
    const logPatterns = [
      { pattern: /HEB.*timeout/i, type: 'heb-timeout' },
      { pattern: /email.*fail/i, type: 'email-failed' },
      { pattern: /ECONNREFUSED.*imap/i, type: 'email-failed' },
    ];

    for (const { pattern, type } of logPatterns) {
      const recent = await this._checkRecentLogs(pattern, 60); // Last hour
      if (recent) {
        failures.push({ type, severity: 'medium', evidence: recent });
      }
    }

    return failures;
  }

  async _checkRecentLogs(pattern, minutes) {
    try {
      const logFiles = [
        'logs/automation.log',
        'dinner-automation/logs/heb.log',
        'marvin-dash/logs/server.log',
      ];

      for (const logFile of logFiles) {
        const content = await fs.readFile(path.join(WORKSPACE, logFile), 'utf8').catch(() => '');
        const lines = content.split('\n');
        const recent = lines.slice(-100);
        
        const matches = recent.filter(line => pattern.test(line));
        if (matches.length > 0) {
          return { file: logFile, matches: matches.length };
        }
      }
      return null;
    } catch (e) {
      return null;
    }
  }

  async executeStep(step) {
    console.log(`  📋 Executing: ${step.action}`);

    switch (step.action) {
      case 'kill':
        return this._killProcess(step.process, step.args);
      
      case 'wait':
        await new Promise(r => setTimeout(r, step.duration));
        return { success: true };
      
      case 'cleanup':
        return this._cleanupFiles(step.path);
      
      case 'restart':
        return this._restartService(step.service);
      
      case 'run':
        return this._runScript(step.script, step.args);
      
      case 'check':
        return this._checkService(step.service);
      
      case 'verify':
        return this._verifyCheck(step.check, step.retries);
      
      case 'exec':
        return this._execCommand(step.command);
      
      case 'log':
        console.log(`  📝 ${step.message}`);
        return { success: true };
      
      default:
        return { success: false, error: 'Unknown action' };
    }
  }

  _killProcess(name, args) {
    try {
      if (process.platform === 'win32') {
        execSync(`taskkill /F /IM ${name}.exe 2> nul`, { stdio: 'ignore' });
      } else {
        execSync(`pkill -f "${name}"`, { stdio: 'ignore' });
      }
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  async _cleanupFiles(targetPath) {
    try {
      const fullPath = path.join(WORKSPACE, targetPath);
      const files = await fs.readdir(fullPath);
      
      for (const file of files) {
        if (file.endsWith('.tmp') || file.endsWith('.lock')) {
          await fs.unlink(path.join(fullPath, file)).catch(() => {});
        }
      }
      
      return { success: true, cleaned: files.length };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  _restartService(serviceName) {
    try {
      // Use Windows services or PM2 if available
      const services = {
        'marvin-dashboard': 'marvin-dash/server.js',
        'chrome-bridge': 'dinner-automation/scripts/launch-shared-chrome.js',
      };

      const script = services[serviceName];
      if (script) {
        spawn('node', [path.join(WORKSPACE, script)], {
          detached: true,
          stdio: 'ignore',
        }).unref();
      }

      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  _runScript(scriptPath, args = []) {
    return new Promise((resolve) => {
      const child = spawn('node', [path.join(WORKSPACE, scriptPath), ...args], {
        stdio: 'pipe',
      });

      let output = '';
      child.stdout.on('data', (d) => output += d);
      child.stderr.on('data', (d) => output += d);

      child.on('close', (code) => {
        resolve({
          success: code === 0,
          exitCode: code,
          output: output.slice(-500), // Last 500 chars
        });
      });

      setTimeout(() => {
        child.kill();
        resolve({ success: false, error: 'Timeout' });
      }, 60000);
    });
  }

  _checkService(service) {
    const [type, target] = service.split(':');
    
    try {
      if (type === 'smtp') {
        execSync(`telnet smtp.mail.me.com 587`, { stdio: 'ignore', timeout: 5000 });
      } else if (type === 'imap') {
        execSync(`telnet imap.mail.me.com 993`, { stdio: 'ignore', timeout: 5000 });
      }
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  async _verifyCheck(check, maxRetries) {
    for (let i = 0; i < maxRetries; i++) {
      try {
        if (check.startsWith('port:')) {
          const port = check.split(':')[1];
          execSync(`netstat -an | findstr :${port}`, { stdio: 'pipe' });
        } else if (check.startsWith('http')) {
          execSync(`curl -s ${check}`, { stdio: 'pipe', timeout: 5000 });
        }
        return { success: true, retries: i + 1 };
      } catch (e) {
        if (i < maxRetries - 1) {
          await new Promise(r => setTimeout(r, 1000));
        }
      }
    }
    return { success: false, error: 'Verification failed' };
  }

  _execCommand(command) {
    try {
      const output = execSync(command, { encoding: 'utf8', timeout: 30000 });
      return { success: true, output: output.slice(0, 200) };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  async recover(failureType) {
    if (this.activeRecoveries.has(failureType)) {
      console.log(`⏳ Recovery already in progress for ${failureType}`);
      return { status: 'in-progress' };
    }

    const strategy = RECOVERY_STRATEGIES[failureType];
    if (!strategy) {
      console.log(`❌ No recovery strategy for ${failureType}`);
      return { status: 'no-strategy' };
    }

    this.activeRecoveries.set(failureType, Date.now());
    
    console.log(`\n🔄 Starting recovery for: ${failureType}`);
    console.log('=' .repeat(50));

    const recovery = {
      type: failureType,
      started: new Date().toISOString(),
      steps: [],
      success: false,
    };

    try {
      for (const step of strategy.steps) {
        const result = await this.executeStep(step);
        recovery.steps.push({ step, result });
        
        if (!result.success && step.action !== 'log') {
          console.log(`  ⚠️  Step failed: ${step.action}`);
          if (step.critical) {
            throw new Error(`Critical step failed: ${step.action}`);
          }
        }
      }

      recovery.success = true;
      recovery.completed = new Date().toISOString();
      
      this.emit('recovered', recovery);
      console.log(`✅ Recovery complete for ${failureType}`);

    } catch (e) {
      recovery.error = e.message;
      recovery.failed = new Date().toISOString();
      
      this.emit('recoveryFailed', recovery);
      console.log(`❌ Recovery failed for ${failureType}: ${e.message}`);

    } finally {
      this.activeRecoveries.delete(failureType);
      this.state.recoveries.push(recovery);
      await this.saveState();
    }

    return recovery;
  }

  async runHealthCheck() {
    console.log('🔍 Running health check...');
    
    const failures = await this.detectFailures();
    
    if (failures.length === 0) {
      console.log('✅ All systems healthy');
      return { healthy: true };
    }

    console.log(`⚠️  Detected ${failures.length} failures:`);
    for (const f of failures) {
      console.log(`  - ${f.type} (${f.severity})`);
    }

    // Attempt recovery for each failure
    const results = [];
    for (const failure of failures) {
      const result = await this.recover(failure.type);
      results.push(result);
    }

    return {
      healthy: results.every(r => r.success),
      failures,
      recoveries: results,
    };
  }
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  const recovery = new AutoRecovery();
  await recovery.loadState();

  // Run health check
  const result = await recovery.runHealthCheck();

  // Schedule periodic checks
  const interval = setInterval(async () => {
    await recovery.runHealthCheck();
  }, 5 * 60 * 1000); // Every 5 minutes

  console.log('\n🤖 Auto-recovery active. Press Ctrl+C to stop.');

  // Handle graceful shutdown
  process.on('SIGINT', () => {
    clearInterval(interval);
    console.log('\n👋 Stopping auto-recovery...');
    process.exit(0);
  });
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { AutoRecovery, RECOVERY_STRATEGIES };
