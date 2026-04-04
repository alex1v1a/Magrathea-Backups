// Service wrapper for Marvin Email Monitor
// Auto-generated - do not edit manually

const { spawn } = require('child_process');
const path = require('path');

const WORKSPACE = 'C:\Users\Admin\.openclaw\workspace';
const SCRIPT = path.join(WORKSPACE, 'scripts/email-monitor.js');
const ARGS = ''.split(' ').filter(a => a);

console.log('Marvin Email Monitor started');
console.log('Interval: 900 seconds');

function runService() {
  console.log('\n[' + new Date().toISOString() + '] Running MarvinEmailMonitor...');
  
  const child = spawn('node', [SCRIPT, ...ARGS], {
    cwd: WORKSPACE,
    stdio: 'pipe'
  });
  
  child.stdout.on('data', (data) => {
    console.log(data.toString().trim());
  });
  
  child.stderr.on('data', (data) => {
    console.error(data.toString().trim());
  });
  
  child.on('close', (code) => {
    console.log('MarvinEmailMonitor completed with code:', code);
  });
}

// Run immediately
runService();

// Then run on interval
setInterval(runService, 900 * 1000);
