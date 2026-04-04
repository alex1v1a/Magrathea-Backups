/**
 * Browser Pool Manager
 * Experiment 1: Maintain persistent browser pool vs per-task connections
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const http = require('http');
const { spawn } = require('child_process');

class BrowserPool {
  constructor(options = {}) {
    this.poolSize = options.poolSize || 3;
    this.debugPortStart = options.debugPortStart || 9222;
    this.chromePath = options.chromePath || this.getDefaultChromePath();
    this.userDataDir = options.userDataDir || this.getDefaultUserDataDir();
    this.browsers = new Map(); // port -> { browser, status, lastUsed, health }
    this.healthCheckInterval = options.healthCheckInterval || 30000; // 30s
    this.recycleTimeout = options.recycleTimeout || 300000; // 5 min
    
    this.setupHealthChecks();
  }

  getDefaultChromePath() {
    if (process.platform === 'win32') {
      return 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
    }
    return '/usr/bin/google-chrome';
  }

  getDefaultUserDataDir() {
    if (process.platform === 'win32') {
      return path.join(process.env.LOCALAPPDATA || '', 'Microsoft', 'Edge', 'User Data');
    }
    return path.join(process.env.HOME || '', '.config', 'google-chrome');
  }

  setupHealthChecks() {
    setInterval(() => this.runHealthChecks(), this.healthCheckInterval);
  }

  async runHealthChecks() {
    for (const [port, entry] of this.browsers) {
      if (entry.status === 'active') continue; // Skip active browsers
      
      const isHealthy = await this.checkBrowserHealth(port);
      if (!isHealthy) {
        console.log(`[Pool] Browser on port ${port} unhealthy, recycling...`);
        await this.recycleBrowser(port);
      }
    }
  }

  async checkBrowserHealth(port) {
    return new Promise((resolve) => {
      const req = http.get(`http://localhost:${port}/json/version`, { timeout: 3000 }, (res) => {
        resolve(res.statusCode === 200);
      });
      req.on('error', () => resolve(false));
      req.on('timeout', () => { req.destroy(); resolve(false); });
    });
  }

  async acquire(profile = 'default') {
    const startTime = Date.now();
    
    // First, try to find an idle browser
    for (const [port, entry] of this.browsers) {
      if (entry.status === 'idle' && entry.profile === profile) {
        entry.status = 'active';
        entry.lastUsed = Date.now();
        const acquireTime = Date.now() - startTime;
        console.log(`[Pool] Acquired browser on port ${port} (${acquireTime}ms)`);
        return { port, browser: entry.browser, page: await this.getPage(entry.browser) };
      }
    }

    // If pool not full, create new browser
    if (this.browsers.size < this.poolSize) {
      const port = this.debugPortStart + this.browsers.size;
      const browser = await this.createBrowser(port, profile);
      this.browsers.set(port, {
        browser,
        status: 'active',
        lastUsed: Date.now(),
        profile,
        createdAt: Date.now()
      });
      const acquireTime = Date.now() - startTime;
      console.log(`[Pool] Created new browser on port ${port} (${acquireTime}ms)`);
      return { port, browser, page: await this.getPage(browser) };
    }

    // Pool full - wait for one to become available
    console.log('[Pool] Pool full, waiting for available browser...');
    return this.waitForAvailableBrowser(profile);
  }

  async createBrowser(port, profile) {
    const isRunning = await this.checkBrowserHealth(port);
    
    if (!isRunning) {
      await this.launchBrowser(port, profile);
      // Wait for startup
      let attempts = 0;
      while (attempts < 20) {
        await new Promise(r => setTimeout(r, 500));
        if (await this.checkBrowserHealth(port)) break;
        attempts++;
      }
    }

    return await chromium.connectOverCDP(`http://localhost:${port}`);
  }

  async launchBrowser(port, profile) {
    const profileDir = profile === 'default' ? 'Marvin' : profile;
    
    const args = [
      `"${this.chromePath}"`,
      `--remote-debugging-port=${port}`,
      `--user-data-dir="${this.userDataDir}"`,
      `--profile-directory=${profileDir}`,
      '--restore-last-session',
      '--no-first-run',
      '--no-default-browser-check'
    ].join(' ');

    const batContent = `@echo off
start "" ${args}
`;
    const batPath = path.join(__dirname, `launch-pool-${port}.bat`);
    fs.writeFileSync(batPath, batContent);

    const cmd = spawn('cmd.exe', ['/c', batPath], {
      detached: true,
      stdio: 'ignore',
      windowsHide: true
    });
    cmd.unref();
  }

  async getPage(browser) {
    const contexts = browser.contexts();
    let context = contexts[0];
    if (!context) context = await browser.newContext();
    
    let page = context.pages()[0];
    if (!page) page = await context.newPage();
    
    return page;
  }

  async waitForAvailableBrowser(profile, timeout = 30000) {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      for (const [port, entry] of this.browsers) {
        if (entry.status === 'idle' && entry.profile === profile) {
          entry.status = 'active';
          entry.lastUsed = Date.now();
          return { port, browser: entry.browser, page: await this.getPage(entry.browser) };
        }
      }
      await new Promise(r => setTimeout(r, 100));
    }
    
    throw new Error('Timeout waiting for available browser');
  }

  async release(port) {
    const entry = this.browsers.get(port);
    if (!entry) return;

    // Check if browser needs recycling (old or high memory)
    const age = Date.now() - entry.createdAt;
    const idleTime = Date.now() - entry.lastUsed;
    
    if (age > this.recycleTimeout || idleTime > 60000) {
      await this.recycleBrowser(port);
    } else {
      entry.status = 'idle';
      console.log(`[Pool] Released browser on port ${port} (now idle)`);
    }
  }

  async recycleBrowser(port) {
    const entry = this.browsers.get(port);
    if (!entry) return;

    try {
      if (entry.browser) {
        await entry.browser.disconnect();
      }
    } catch (e) {
      // Ignore disconnect errors
    }

    this.browsers.delete(port);
    console.log(`[Pool] Recycled browser on port ${port}`);
  }

  async closeAll() {
    for (const [port, entry] of this.browsers) {
      try {
        await entry.browser.disconnect();
      } catch (e) {}
    }
    this.browsers.clear();
    console.log('[Pool] All browsers closed');
  }

  getStats() {
    const stats = {
      poolSize: this.poolSize,
      active: 0,
      idle: 0,
      browsers: []
    };

    for (const [port, entry] of this.browsers) {
      stats.browsers.push({
        port,
        status: entry.status,
        profile: entry.profile,
        age: Date.now() - entry.createdAt,
        lastUsed: Date.now() - entry.lastUsed
      });
      if (entry.status === 'active') stats.active++;
      else stats.idle++;
    }

    return stats;
  }
}

module.exports = { BrowserPool };
