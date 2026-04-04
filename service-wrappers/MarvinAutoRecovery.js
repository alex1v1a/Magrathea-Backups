// Service wrapper for Marvin Auto Recovery
// Auto-generated - do not edit manually

const { spawn } = require('child_process');
const path = require('path');

const WORKSPACE = 'C:\Users\Admin\.openclaw\workspace';
const SCRIPT = path.join(WORKSPACE, 'marvin-dash/scripts/auto-recovery.js');
const ARGS = '--auto'.split(' ').filter(a => a);

console.log('Marvin Auto Recovery started');
console.log('Interval: 300 seconds');

function runService() {
  console.log('\n[' + new Date().toISOString() + '] Running MarvinAutoRecovery...');
  
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
    console.log('MarvinAutoRecovery completed with code:', code);
  });
}

// Run immediately
runService();

// Then run on interval
setInterval(runService, 300 * 1000);
