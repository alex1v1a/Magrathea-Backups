/**
 * Automation Health Check & Diagnostics
 * 
 * Comprehensive diagnostics for the automation stack:
 * - Browser connectivity
 * - Extension status
 * - API endpoint health
 * - Performance baseline
 * - Error pattern analysis
 * 
 * @module lib/health-diagnostics
 */

const http = require('http');
const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

class HealthDiagnostics {
  constructor(options = {}) {
    this.debugPort = options.debugPort || 9222;
    this.checkTimeout = options.checkTimeout || 5000;
    this.results = [];
  }

  /**
   * Run full diagnostic suite
   */
  async runFullDiagnostics() {
    console.log('🔍 Running Automation Health Diagnostics...\n');
    
    const checks = [
      { name: 'Browser Connectivity', fn: () => this.checkBrowser() },
      { name: 'CDP Endpoint', fn: () => this.checkCDPEndpoint() },
      { name: 'Extension Status', fn: () => this.checkExtension() },
      { name: 'Disk Space', fn: () => this.checkDiskSpace() },
      { name: 'Memory Usage', fn: () => this.checkMemory() },
      { name: 'Network Connectivity', fn: () => this.checkNetwork() },
      { name: 'Log Files', fn: () => this.checkLogFiles() },
      { name: 'Configuration', fn: () => this.checkConfiguration() }
    ];
    
    for (const check of checks) {
      try {
        const startTime = Date.now();
        const result = await Promise.race([
          check.fn(),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Timeout')), this.checkTimeout)
          )
        ]);
        
        this.results.push({
          name: check.name,
          status: result.status || 'unknown',
          duration: Date.now() - startTime,
          details: result.details || {},
          error: result.error || null
        });
      } catch (error) {
        this.results.push({
          name: check.name,
          status: 'error',
          duration: this.checkTimeout,
          error: error.message
        });
      }
    }
    
    return this.generateReport();
  }

  /**
   * Check browser is running and responding
   */
  async checkBrowser() {
    try {
      // Check if Edge process is running
      const { stdout } = await execAsync(
        'tasklist /FI "IMAGENAME eq msedge.exe" /FO CSV /NH',
        { timeout: 3000 }
      );
      
      const processes = stdout.split('\n').filter(line => line.includes('msedge.exe'));
      
      if (processes.length === 0) {
        return {
          status: 'warning',
          details: { message: 'Edge not running (may be expected)' }
        };
      }
      
      return {
        status: 'healthy',
        details: { 
          processes: processes.length,
          message: 'Edge is running'
        }
      };
    } catch (error) {
      return { status: 'error', error: error.message };
    }
  }

  /**
   * Check CDP endpoint availability
   */
  async checkCDPEndpoint() {
    return new Promise((resolve) => {
      const req = http.get(
        `http://localhost:${this.debugPort}/json/version`,
        { timeout: 3000 },
        (res) => {
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => {
            try {
              const version = JSON.parse(data);
              resolve({
                status: 'healthy',
                details: {
                  browser: version.Browser,
                  version: version['Browser-Version'],
                  protocol: version['Protocol-Version']
                }
              });
            } catch {
              resolve({ status: 'warning', details: { message: 'Invalid CDP response' } });
            }
          });
        }
      );
      
      req.on('error', () => {
        resolve({
          status: 'unhealthy',
          details: { message: `Cannot connect to port ${this.debugPort}` }
        });
      });
      
      req.on('timeout', () => {
        req.destroy();
        resolve({
          status: 'unhealthy',
          details: { message: 'Connection timeout' }
        });
      });
    });
  }

  /**
   * Check extension status
   */
  async checkExtension() {
    const extensionPath = path.join(__dirname, '..', 'heb-extension');
    
    try {
      const files = await fs.readdir(extensionPath);
      const hasManifest = files.includes('manifest.json');
      const hasContentScript = files.includes('content.js');
      
      return {
        status: hasManifest && hasContentScript ? 'healthy' : 'warning',
        details: {
          files: files.length,
          hasManifest,
          hasContentScript,
          path: extensionPath
        }
      };
    } catch (error) {
      return {
        status: 'error',
        error: `Cannot read extension directory: ${error.message}`
      };
    }
  }

  /**
   * Check available disk space
   */
  async checkDiskSpace() {
    try {
      const { stdout } = await execAsync('wmic logicaldisk get size,freespace,caption', {
        timeout: 5000
      });
      
      const lines = stdout.split('\n').slice(1).filter(line => line.trim());
      const drives = lines.map(line => {
        const parts = line.trim().split(/\s+/);
        if (parts.length >= 3) {
          const free = parseInt(parts[0]) / (1024 ** 3); // GB
          const total = parseInt(parts[1]) / (1024 ** 3); // GB
          return {
            drive: parts[2],
            freeGB: Math.round(free * 100) / 100,
            totalGB: Math.round(total * 100) / 100,
            percentFree: Math.round((free / total) * 100)
          };
        }
        return null;
      }).filter(Boolean);
      
      const lowSpace = drives.filter(d => d.percentFree < 10);
      
      return {
        status: lowSpace.length > 0 ? 'warning' : 'healthy',
        details: { drives, lowSpaceWarning: lowSpace.length > 0 }
      };
    } catch (error) {
      return { status: 'unknown', error: error.message };
    }
  }

  /**
   * Check memory usage
   */
  async checkMemory() {
    try {
      const { stdout } = await execAsync('wmic os get TotalVisibleMemorySize,FreePhysicalMemory /VALUE', {
        timeout: 3000
      });
      
      const lines = stdout.split('\n');
      const total = parseInt(lines.find(l => l.includes('TotalVisibleMemorySize'))?.split('=')[1] || 0);
      const free = parseInt(lines.find(l => l.includes('FreePhysicalMemory'))?.split('=')[1] || 0);
      
      const totalGB = total / (1024 ** 2);
      const freeGB = free / (1024 ** 2);
      const usedPercent = Math.round(((total - free) / total) * 100);
      
      return {
        status: usedPercent > 90 ? 'warning' : 'healthy',
        details: {
          totalGB: Math.round(totalGB * 100) / 100,
          freeGB: Math.round(freeGB * 100) / 100,
          usedPercent
        }
      };
    } catch (error) {
      return { status: 'unknown', error: error.message };
    }
  }

  /**
   * Check network connectivity
   */
  async checkNetwork() {
    const endpoints = [
      { name: 'HEB', url: 'www.heb.com' },
      { name: 'Facebook', url: 'www.facebook.com' },
      { name: 'Google', url: 'www.google.com' }
    ];
    
    const results = await Promise.all(
      endpoints.map(async (ep) => {
        try {
          await execAsync(`ping -n 1 -w 2000 ${ep.url}`, { timeout: 3000 });
          return { name: ep.name, status: 'reachable' };
        } catch {
          return { name: ep.name, status: 'unreachable' };
        }
      })
    );
    
    const unreachable = results.filter(r => r.status === 'unreachable');
    
    return {
      status: unreachable.length > 0 ? 'warning' : 'healthy',
      details: { endpoints: results }
    };
  }

  /**
   * Check log files for errors
   */
  async checkLogFiles() {
    const logDir = path.join(__dirname, '..', 'logs');
    
    try {
      const files = await fs.readdir(logDir);
      const logFiles = files.filter(f => f.endsWith('.log'));
      
      let errorCount = 0;
      let recentErrors = [];
      
      for (const file of logFiles.slice(-3)) { // Check last 3 log files
        try {
          const content = await fs.readFile(path.join(logDir, file), 'utf8');
          const errors = content.split('\n').filter(line => 
            line.includes('ERROR') || line.includes('❌')
          );
          errorCount += errors.length;
          recentErrors.push(...errors.slice(-5));
        } catch {
          // Skip unreadable files
        }
      }
      
      return {
        status: errorCount > 10 ? 'warning' : 'healthy',
        details: {
          logFiles: logFiles.length,
          recentErrors: errorCount,
          errorSamples: recentErrors.slice(-3)
        }
      };
    } catch (error) {
      return { status: 'unknown', details: { message: 'No log directory' } };
    }
  }

  /**
   * Check configuration files
   */
  async checkConfiguration() {
    const configFiles = [
      'data/weekly-dinner-plan.json',
      'data/fb-marketplace-state.json',
      'lib/config.js'
    ];
    
    const results = await Promise.all(
      configFiles.map(async (file) => {
        try {
          await fs.access(path.join(__dirname, '..', file));
          return { file, exists: true };
        } catch {
          return { file, exists: false };
        }
      })
    );
    
    const missing = results.filter(r => !r.exists);
    
    return {
      status: missing.length > 0 ? 'warning' : 'healthy',
      details: { files: results, missing: missing.map(m => m.file) }
    };
  }

  /**
   * Generate diagnostic report
   */
  generateReport() {
    const healthy = this.results.filter(r => r.status === 'healthy').length;
    const warnings = this.results.filter(r => r.status === 'warning').length;
    const errors = this.results.filter(r => r.status === 'error' || r.status === 'unhealthy').length;
    
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        total: this.results.length,
        healthy,
        warnings,
        errors,
        overall: errors > 0 ? 'unhealthy' : warnings > 0 ? 'degraded' : 'healthy'
      },
      checks: this.results,
      recommendations: this.generateRecommendations()
    };
    
    return report;
  }

  generateRecommendations() {
    const recommendations = [];
    
    for (const result of this.results) {
      if (result.status === 'error' || result.status === 'unhealthy') {
        switch (result.name) {
          case 'Browser Connectivity':
            recommendations.push('Start Edge with: node scripts/launch-shared-chrome.js');
            break;
          case 'CDP Endpoint':
            recommendations.push('Check if Edge is running with --remote-debugging-port=9222');
            break;
          case 'Disk Space':
            recommendations.push('Free up disk space - automation may fail with low storage');
            break;
          case 'Memory Usage':
            recommendations.push('Close unnecessary applications to free memory');
            break;
          case 'Network Connectivity':
            recommendations.push('Check internet connection - required for HEB/Facebook automation');
            break;
        }
      }
    }
    
    return recommendations;
  }

  /**
   * Print formatted report to console
   */
  printReport(report = null) {
    const r = report || this.generateReport();
    
    console.log('\n' + '='.repeat(60));
    console.log('AUTOMATION HEALTH REPORT');
    console.log('='.repeat(60));
    console.log(`Overall Status: ${r.summary.overall.toUpperCase()}`);
    console.log(`Healthy: ${r.summary.healthy} | Warnings: ${r.summary.warnings} | Errors: ${r.summary.errors}`);
    console.log('-'.repeat(60));
    
    for (const check of r.checks) {
      const icon = check.status === 'healthy' ? '✅' : 
                   check.status === 'warning' ? '⚠️' : '❌';
      console.log(`${icon} ${check.name}: ${check.status} (${check.duration}ms)`);
      
      if (check.error) {
        console.log(`   Error: ${check.error}`);
      }
    }
    
    if (r.recommendations.length > 0) {
      console.log('-'.repeat(60));
      console.log('RECOMMENDATIONS:');
      r.recommendations.forEach((rec, i) => console.log(`${i + 1}. ${rec}`));
    }
    
    console.log('='.repeat(60) + '\n');
  }
}

// CLI usage
if (require.main === module) {
  const diagnostics = new HealthDiagnostics();
  diagnostics.runFullDiagnostics()
    .then(report => {
      diagnostics.printReport(report);
      process.exit(report.summary.errors > 0 ? 1 : 0);
    })
    .catch(error => {
      console.error('Diagnostics failed:', error);
      process.exit(1);
    });
}

module.exports = { HealthDiagnostics };
