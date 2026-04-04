const { Service } = require('node-windows');
const path = require('path');

// Service definitions
const services = [
  {
    name: 'MarvinAutoRecovery',
    description: 'Marvin Auto Recovery - Monitors and repairs critical services',
    script: path.join(__dirname, 'marvin-dash', 'scripts', 'auto-recovery.js'),
    args: ['--auto']
  },
  {
    name: 'MarvinEmailMonitor', 
    description: 'Marvin Email Monitor - Checks email accounts for important messages',
    script: path.join(__dirname, 'scripts', 'email-monitor.js')
  },
  {
    name: 'MarvinBackup',
    description: 'Marvin Backup - Automated backup system',
    script: path.join(__dirname, 'marvin-dash', 'scripts', 'backup.js'),
    args: ['--auto']
  },
  {
    name: 'MarvinWSLMonitor',
    description: 'Marvin WSL Monitor - Monitors WSL Ubuntu status',
    script: path.join(__dirname, 'marvin-dash', 'scripts', 'wsl-monitor.js')
  }
];

console.log('🔧 Marvin Windows Services Installer');
console.log('=' .repeat(60));

services.forEach(svc => {
  console.log(`\nInstalling: ${svc.name}`);
  console.log(`  Script: ${svc.script}`);
  
  const service = new Service({
    name: svc.name,
    description: svc.description,
    script: svc.script,
    args: svc.args || [],
    wait: 2,
    grow: 0.5,
    maxRetries: 3,
    abortOnError: false,
    logOnAs: {
      domain: '',
      account: 'Admin',
      password: ''  // Will prompt or use current user
    }
  });
  
  service.on('install', () => {
    console.log(`  ✅ ${svc.name} installed`);
    service.start();
  });
  
  service.on('alreadyinstalled', () => {
    console.log(`  ℹ️  ${svc.name} already installed`);
  });
  
  service.on('invalidinstallation', () => {
    console.log(`  ❌ ${svc.name} invalid installation`);
  });
  
  service.on('error', (err) => {
    console.log(`  ❌ ${svc.name} error: ${err}`);
  });
  
  service.install();
});

console.log('\n' + '='.repeat(60));
console.log('Service installation complete');
console.log('Run as Administrator if installation failed');
