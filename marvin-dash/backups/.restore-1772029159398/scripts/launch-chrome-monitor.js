#!/usr/bin/env node
/**
 * Marvin Chrome Monitor Launcher
 * Ensures only one instance of the monitor is running
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const PID_FILE = path.join(__dirname, '..', 'data', 'chrome-monitor.pid');
const SCRIPT_PATH = path.join(__dirname, 'marvin-chrome-monitor.js');

function isRunning(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function getExistingPid() {
  try {
    if (fs.existsSync(PID_FILE)) {
      return parseInt(fs.readFileSync(PID_FILE, 'utf8'), 10);
    }
  } catch {}
  return null;
}

function savePid(pid) {
  try {
    fs.writeFileSync(PID_FILE, String(pid));
  } catch {}
}

function launchMonitor() {
  console.log('🚀 Launching Marvin Chrome Monitor...');
  
  const child = spawn('node', [SCRIPT_PATH], {
    detached: true,
    stdio: 'ignore',
    windowsHide: true
  });
  
  child.unref();
  savePid(child.pid);
  
  console.log(`✅ Monitor started (PID: ${child.pid})`);
  console.log('   Chrome will be kept running 24/7');
  console.log('   OpenClaw extension will be monitored');
}

// Check if already running
const existingPid = getExistingPid();

if (existingPid && isRunning(existingPid)) {
  console.log(`ℹ️  Monitor already running (PID: ${existingPid})`);
  process.exit(0);
}

// Start new instance
launchMonitor();
