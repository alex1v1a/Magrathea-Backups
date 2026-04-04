const { exec, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

/**
 * Chrome Crash Monitor
 * Tracks CMD windows and Chrome crashes to identify the culprit
 */

const LOG_FILE = path.join(__dirname, 'chrome-crash-monitor.log');
const seenProcesses = new Set();

function log(message, level = 'info') {
  const timestamp = new Date().toISOString();
  const prefix = { error: '❌', warn: '⚠️', info: 'ℹ️', alert: '🚨' }[level] || 'ℹ️';
  const line = `[${timestamp}] ${prefix} ${message}`;
  
  console.log(line);
  fs.appendFileSync(LOG_FILE, line + '\n');
}

function getProcessCommandLine(pid) {
  return new Promise((resolve) => {
    exec(`wmic process where "ProcessId=${pid}" get CommandLine /value`, (err, stdout) => {
      if (err) return resolve(null);
      const match = stdout.match(/CommandLine=(.+)/);
      resolve(match ? match[1].trim() : null);
    });
  });
}

function getParentProcess(pid) {
  return new Promise((resolve) => {
    exec(`wmic process where "ProcessId=${pid}" get ParentProcessId /value`, (err, stdout) => {
      if (err) return resolve(null);
      const match = stdout.match(/ParentProcessId=(\d+)/);
      resolve(match ? parseInt(match[1]) : null);
    });
  });
}

async function checkChromeStatus() {
  return new Promise((resolve) => {
    exec('tasklist /FI "IMAGENAME eq chrome.exe" /NH', (err, stdout) => {
      const running = stdout && stdout.includes('chrome.exe');
      const count = running ? stdout.trim().split('\n').filter(l => l.includes('chrome.exe')).length : 0;
      resolve({ running, count });
    });
  });
}

async function checkCmdProcesses() {
  return new Promise((resolve) => {
    exec('tasklist /FI "IMAGENAME eq cmd.exe" /NH /FO CSV', async (err, stdout) => {
      if (err || !stdout) return resolve([]);
      
      const lines = stdout.trim().split('\n');
      const newCmds = [];
      
      for (const line of lines) {
        const parts = line.split(',');
        if (parts.length < 2) continue;
        
        const pid = parseInt(parts[1].replace(/"/g, ''));
        if (seenProcesses.has(`cmd_${pid}`)) continue;
        
        seenProcesses.add(`cmd_${pid}`);
        
        const cmdLine = await getProcessCommandLine(pid);
        const parentPid = await getParentProcess(pid);
        const parentCmd = parentPid ? await getProcessCommandLine(parentPid) : null;
        
        newCmds.push({
          pid,
          cmdLine,
          parentPid,
          parentCmd,
          timestamp: new Date().toISOString()
        });
      }
      
      resolve(newCmds);
    });
  });
}

async function checkNodeProcesses() {
  return new Promise((resolve) => {
    exec('tasklist /FI "IMAGENAME eq node.exe" /NH /FO CSV', async (err, stdout) => {
      if (err || !stdout) return resolve([]);
      
      const lines = stdout.trim().split('\n');
      const chromeRelated = [];
      
      for (const line of lines) {
        const parts = line.split(',');
        if (parts.length < 2) continue;
        
        const pid = parseInt(parts[1].replace(/"/g, ''));
        const cmdLine = await getProcessCommandLine(pid);
        
        if (cmdLine && (cmdLine.includes('chrome') || cmdLine.includes('heb') || cmdLine.includes('facebook'))) {
          if (!seenProcesses.has(`node_${pid}`)) {
            seenProcesses.add(`node_${pid}`);
            chromeRelated.push({ pid, cmdLine });
          }
        }
      }
      
      resolve(chromeRelated);
    });
  });
}

async function monitor() {
  log('========================================');
  log('Chrome Crash Monitor Starting');
  log('========================================');
  log('Monitoring for CMD windows that crash Chrome...');
  log(`Log file: ${LOG_FILE}`);
  log('Press Ctrl+C to stop\n');
  
  let chromeWasRunning = false;
  let lastChromeCheck = await checkChromeStatus();
  
  while (true) {
    try {
      // Check Chrome status
      const chromeStatus = await checkChromeStatus();
      
      // Detect Chrome crash
      if (chromeWasRunning && !chromeStatus.running) {
        log('⚠️  CHROME CRASH DETECTED!', 'alert');
        log(`Chrome went from running to crashed`, 'alert');
        
        // Log what was happening just before crash
        const recentCmds = Array.from(seenProcesses).filter(p => p.startsWith('cmd_'));
        if (recentCmds.length > 0) {
          log(`Recent CMD processes: ${recentCmds.slice(-5).join(', ')}`, 'warn');
        }
      }
      
      chromeWasRunning = chromeStatus.running;
      
      // Check for new CMD windows
      const newCmds = await checkCmdProcesses();
      for (const cmd of newCmds) {
        log(`NEW CMD WINDOW DETECTED:`);
        log(`  PID: ${cmd.pid}`);
        log(`  Command: ${cmd.cmdLine || 'N/A'}`);
        log(`  Parent PID: ${cmd.parentPid || 'N/A'}`);
        log(`  Parent Command: ${cmd.parentCmd || 'N/A'}`);
        
        // Check if Chrome crashes after this CMD appears
        await new Promise(r => setTimeout(r, 500));
        const chromeNow = await checkChromeStatus();
        if (!chromeNow.running && chromeStatus.running) {
          log(`🚨 ALERT: Chrome crashed after CMD window (PID: ${cmd.pid}) appeared!`, 'alert');
        }
      }
      
      // Check for Node processes related to Chrome
      const nodeProcs = await checkNodeProcesses();
      for (const node of nodeProcs) {
        log(`Node process managing Chrome: PID=${node.pid}`);
        log(`  Command: ${node.cmdLine.substring(0, 200)}...`);
      }
      
    } catch (error) {
      log(`Monitor error: ${error.message}`, 'error');
    }
    
    await new Promise(r => setTimeout(r, 500)); // Check every 500ms
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  log('\n========================================');
  log('Monitor stopped by user');
  log('========================================');
  process.exit(0);
});

process.on('SIGTERM', () => {
  log('\nMonitor stopped');
  process.exit(0);
});

// Start monitoring
monitor().catch(err => {
  log(`Fatal error: ${err.message}`, 'error');
  process.exit(1);
});
