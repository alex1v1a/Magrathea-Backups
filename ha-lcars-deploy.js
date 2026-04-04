#!/usr/bin/env node
/**
 * HA LCARS Deployment Helper
 * Handles SSH deployment to 10.0.1.90 with retry logic
 * 
 * Usage: node ha-lcars-deploy.js --check | --deploy
 */

const { execSync } = require('child_process');
const fs = require('fs').promises;

const HA_CONFIG = {
  host: '10.0.1.90',
  user: 'admin',
  paths: {
    config: '/opt/homeassistant/config/',
    themes: '/opt/homeassistant/config/themes/',
    www: '/opt/homeassistant/config/www/',
    dashboards: '/opt/homeassistant/config/dashboards/'
  }
};

async function checkSSH() {
  console.log('🔍 Checking SSH connectivity to Home Assistant...\n');
  console.log(`Target: ${HA_CONFIG.user}@${HA_CONFIG.host}`);
  console.log('═══════════════════════════════════════════════════\n');
  
  try {
    // Test basic connectivity
    execSync(`ssh -o ConnectTimeout=5 -o StrictHostKeyChecking=no ${HA_CONFIG.user}@${HA_CONFIG.host} "echo 'SSH_OK'"`, {
      encoding: 'utf8',
      stdio: 'pipe'
    });
    console.log('✅ SSH connection successful\n');
    return true;
  } catch (err) {
    console.log('❌ SSH connection failed\n');
    console.log('Possible causes:');
    console.log('  • SSH service not running on target');
    console.log('  • Firewall blocking port 22');
    console.log('  • Wrong username (try: homeassistant, root, or pi)');
    console.log('  • SSH key not authorized\n');
    console.log('Troubleshooting:');
    console.log('  1. Verify HA is running: ping 10.0.1.90');
    console.log('  2. Check SSH service: ssh -v 10.0.1.90');
    console.log('  3. Try alternative users: ssh pi@10.0.1.90');
    console.log('  4. Check SSH keys: cat ~/.ssh/authorized_keys\n');
    return false;
  }
}

async function generateDeployCommands() {
  console.log('📋 Manual Deployment Commands\n');
  console.log('═══════════════════════════════════════════════════\n');
  
  console.log('If SSH is working, run these commands:\n');
  
  console.log('# 1. Copy theme files');
  console.log(`scp -r star-trek-ha/themes/* ${HA_CONFIG.user}@${HA_CONFIG.host}:${HA_CONFIG.paths.themes}`);
  console.log('');
  
  console.log('# 2. Copy dashboard files');
  console.log(`scp -r star-trek-ha/dashboards/* ${HA_CONFIG.user}@${HA_CONFIG.host}:${HA_CONFIG.paths.dashboards}`);
  console.log('');
  
  console.log('# 3. Copy www resources');
  console.log(`scp -r star-trek-ha/www/* ${HA_CONFIG.user}@${HA_CONFIG.host}:${HA_CONFIG.paths.www}`);
  console.log('');
  
  console.log('# 4. Update configuration.yaml (backup first)');
  console.log(`ssh ${HA_CONFIG.user}@${HA_CONFIG.host} "cp ${HA_CONFIG.paths.config}configuration.yaml ${HA_CONFIG.paths.config}configuration.yaml.backup"`);
  console.log(`scp configuration_updated.yaml ${HA_CONFIG.user}@${HA_CONFIG.host}:${HA_CONFIG.paths.config}configuration.yaml`);
  console.log('');
  
  console.log('# 5. Restart Home Assistant');
  console.log(`ssh ${HA_CONFIG.user}@${HA_CONFIG.host} "docker restart homeassistant || sudo systemctl restart homeassistant"`);
  console.log('');
  
  console.log('═══════════════════════════════════════════════════\n');
}

async function generateAltMethods() {
  console.log('🔄 Alternative Deployment Methods\n');
  console.log('═══════════════════════════════════════════════════\n');
  
  console.log('Method 1: Samba Share (if enabled)');
  console.log('  1. Open: \\\\10.0.1.90\\config');
  console.log('  2. Copy files to themes/, dashboards/, www/');
  console.log('  3. Restart HA via UI: Settings → System → Restart\n');
  
  console.log('Method 2: Home Assistant File Editor');
  console.log('  1. Install File Editor add-on');
  console.log('  2. Upload files via web interface');
  console.log('  3. Restart HA\n');
  
  console.log('Method 3: Direct WSL (if HA runs locally)');
  console.log('  1. Copy to WSL: wsl cp -r star-trek-ha/* /opt/homeassistant/config/');
  console.log('  2. Restart: wsl docker restart homeassistant\n');
  
  console.log('Method 4: Git Clone (if HA has git)');
  console.log('  1. SSH to HA');
  console.log('  2. cd /opt/homeassistant/config');
  console.log('  3. git clone <repo> temp/ && cp -r temp/* .\n');
  
  console.log('═══════════════════════════════════════════════════\n');
}

const args = process.argv.slice(2);

if (args.includes('--check')) {
  checkSSH();
} else if (args.includes('--alt')) {
  generateAltMethods();
} else {
  checkSSH().then(connected => {
    if (!connected) {
      generateAltMethods();
    }
    generateDeployCommands();
  });
}
