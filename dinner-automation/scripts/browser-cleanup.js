#!/usr/bin/env node
/**
 * Browser Cleanup Utility
 * Kills zombie browser processes and closes excess tabs
 * Run before/after automation to prevent memory buildup
 */

const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

async function cleanupBrowsers() {
  console.log('🧹 Browser Cleanup Utility\n');
  
  const processes = [
    { name: 'Microsoft Edge', exe: 'msedge.exe' },
    { name: 'Google Chrome', exe: 'chrome.exe' },
    { name: 'Playwright Chrome', exe: 'chrome-win\\chrome.exe' }
  ];
  
  let killed = 0;
  
  for (const proc of processes) {
    try {
      // Count processes
      const { stdout: countOutput } = await execPromise(
        `tasklist /FI "IMAGENAME eq ${proc.exe}" /NH 2>&1 | find /C /V ""`
      );
      const count = parseInt(countOutput.trim()) || 0;
      
      if (count > 0) {
        console.log(`  Found ${count} ${proc.name} process(es)`);
        
        // Kill all instances (forcefully if needed)
        try {
          await execPromise(`taskkill /F /IM ${proc.exe} /T 2>&1`);
          console.log(`  ✅ Killed ${proc.name} processes`);
          killed += count;
        } catch (e) {
          console.log(`  ⚠️  Could not kill ${proc.name}: ${e.message}`);
        }
      }
    } catch (e) {
      // No processes found
    }
  }
  
  // Also check for orphan node processes that might be controlling browsers
  try {
    const { stdout: nodeOutput } = await execPromise(
      'tasklist /FI "IMAGENAME eq node.exe" /NH /FO CSV 2>&1'
    );
    const nodeLines = nodeOutput.split('\n').filter(l => l.includes('node.exe'));
    
    // Count high-memory node processes (likely browser controllers)
    const highMemProcesses = [];
    for (const line of nodeLines) {
      const parts = line.split(',');
      if (parts.length > 4) {
        const memStr = parts[4].replace(/"/g, '').replace(' K', '').replace(',', '');
        const memUsage = parseInt(memStr) || 0;
        if (memUsage > 100000) { // > 100MB
          highMemProcesses.push({ pid: parts[1].replace(/"/g, ''), mem: memUsage });
        }
      }
    }
    
    if (highMemProcesses.length > 0) {
      console.log(`  Found ${highMemProcesses.length} high-memory node process(es)`);
      for (const proc of highMemProcesses) {
        try {
          await execPromise(`taskkill /F /PID ${proc.pid} /T 2>&1`);
          console.log(`  ✅ Killed node process ${proc.pid} (${Math.round(proc.mem/1024)}MB)`);
          killed++;
        } catch (e) {
          // Ignore
        }
      }
    }
  } catch (e) {
    // Ignore
  }
  
  console.log(`\n${killed > 0 ? `✅ Cleaned up ${killed} process(es)` : '✨ No cleanup needed'}`);
  return killed;
}

// Run if called directly
if (require.main === module) {
  cleanupBrowsers().then(killed => {
    process.exit(killed > 0 ? 0 : 0);
  }).catch(err => {
    console.error('Cleanup failed:', err);
    process.exit(1);
  });
}

module.exports = { cleanupBrowsers };
