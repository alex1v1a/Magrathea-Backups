const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔧 Marvin Services - NSSM Wrapper Setup');
console.log('=' .repeat(60));
console.log('\nThis will create Windows services using NSSM (Non-Sucking Service Manager)');
console.log('Services will run in background without CMD windows.\n');

const services = [
  {
    name: 'MarvinAutoRecovery',
    displayName: 'Marvin Auto Recovery',
    description: 'Monitors and repairs critical Marvin services',
    script: 'marvin-dash/scripts/auto-recovery.js',
    args: '--auto',
    interval: 300 // Run every 5 minutes
  },
  {
    name: 'MarvinEmailMonitor',
    displayName: 'Marvin Email Monitor',
    description: 'Checks email accounts for important messages',
    script: 'scripts/email-monitor.js',
    args: '',
    interval: 900 // Run every 15 minutes
  },
  {
    name: 'MarvinBackup',
    displayName: 'Marvin Backup Service',
    description: 'Automated backup system',
    script: 'marvin-dash/scripts/backup.js',
    args: '--auto',
    interval: 900 // Run every 15 minutes
  }
];

// Create wrapper scripts for each service
const wrapperDir = path.join(__dirname, 'service-wrappers');
if (!fs.existsSync(wrapperDir)) {
  fs.mkdirSync(wrapperDir, { recursive: true });
}

console.log('Creating service wrapper scripts...\n');

services.forEach(svc => {
  const wrapperPath = path.join(wrapperDir, `${svc.name}.js`);
  
  const wrapperCode = `// Service wrapper for ${svc.displayName}
// Auto-generated - do not edit manually

const { spawn } = require('child_process');
const path = require('path');

const WORKSPACE = 'C:\\Users\\Admin\\.openclaw\\workspace';
const SCRIPT = path.join(WORKSPACE, '${svc.script}');
const ARGS = '${svc.args}'.split(' ').filter(a => a);

console.log('${svc.displayName} started');
console.log('Interval: ${svc.interval} seconds');

function runService() {
  console.log('\\n[' + new Date().toISOString() + '] Running ${svc.name}...');
  
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
    console.log('${svc.name} completed with code:', code);
  });
}

// Run immediately
runService();

// Then run on interval
setInterval(runService, ${svc.interval} * 1000);
`;
  
  fs.writeFileSync(wrapperPath, wrapperCode);
  console.log(`✅ Created: ${path.basename(wrapperPath)}`);
});

// Create installation batch file
const installBat = `@echo off
echo ==========================================
echo    Install Marvin Windows Services
echo ==========================================
echo.
echo This requires NSSM (Non-Sucking Service Manager)
echo Download from: https://nssm.cc/download
echo.
echo Press any key to install services...
pause > nul

cd /d "%~dp0"

${services.map(svc => `
echo Installing ${svc.displayName}...
nssm install ${svc.name} "C:\\Program Files\\nodejs\\node.exe"
nssm set ${svc.name} AppDirectory "C:\\Users\\Admin\\.openclaw\\workspace"
nssm set ${svc.name} AppParameters "service-wrappers\\${svc.name}.js"
nssm set ${svc.name} DisplayName "${svc.displayName}"
nssm set ${svc.name} Description "${svc.description}"
nssm set ${svc.name} Start SERVICE_AUTO_START
nssm start ${svc.name}
`).join('\n')}

echo.
echo ==========================================
echo Services installed!
echo ==========================================
echo.
echo To check status:
echo   sc query MarvinAutoRecovery
echo.
pause
`;

fs.writeFileSync(path.join(__dirname, 'install-nssm-services.bat'), installBat);
console.log(`✅ Created: install-nssm-services.bat`);

// Create uninstall batch
const uninstallBat = `@echo off
echo Uninstalling Marvin Services...

${services.map(svc => `
nssm stop ${svc.name}
nssm remove ${svc.name} confirm
`).join('\n')}

echo Done!
pause
`;

fs.writeFileSync(path.join(__dirname, 'uninstall-nssm-services.bat'), uninstallBat);
console.log(`✅ Created: uninstall-nssm-services.bat`);

console.log('\n' + '=' .repeat(60));
console.log('Setup complete!');
console.log('=' .repeat(60));
console.log('\nTo install services:');
console.log('1. Download NSSM from https://nssm.cc/download');
console.log('2. Extract nssm.exe to this directory');
console.log('3. Run install-nssm-services.bat as Administrator');
console.log('\nServices will run in background without CMD windows.');
