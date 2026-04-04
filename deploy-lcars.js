const { execSync } = require('child_process');
const path = require('path');

const configPath = '/opt/homeassistant/config/configuration.yaml';
const dashboardPath = '/opt/homeassistant/config/dashboards/lcars-bridge.yaml';
const localConfig = 'C:\\Users\\Admin\\.openclaw\\workspace\\configuration_updated.yaml';
const localDashboard = 'C:\\Users\\Admin\\.openclaw\\workspace\\star-trek-ha\\dashboards\\lcars-bridge.yaml';

// Copy files using wsl with proper escaping
const wslConfig = localConfig.replace(/\\/g, '/').replace('C:', '/mnt/c');
const wslDashboard = localDashboard.replace(/\\/g, '/').replace('C:', '/mnt/c');

console.log('🚀 Deploying LCARS fix to Home Assistant...\n');

try {
  // Copy configuration.yaml
  console.log('📄 Copying configuration.yaml...');
  execSync(`wsl -d Ubuntu cp "${wslConfig}" "${configPath}"`, { stdio: 'inherit' });
  console.log('✅ Configuration updated\n');
  
  // Copy dashboard
  console.log('📊 Copying lcars-bridge.yaml...');
  execSync(`wsl -d Ubuntu cp "${wslDashboard}" "${dashboardPath}"`, { stdio: 'inherit' });
  console.log('✅ Dashboard updated\n');
  
  // Restart HA
  console.log('🔄 Restarting Home Assistant...');
  execSync('wsl -d Ubuntu docker restart homeassistant', { stdio: 'inherit' });
  console.log('✅ Home Assistant restarted\n');
  
  console.log('═══════════════════════════════════════════');
  console.log('🎉 LCARS Dashboard Deployed Successfully!');
  console.log('═══════════════════════════════════════════');
  console.log('\nNext steps:');
  console.log('1. Wait ~2 minutes for HA to fully restart');
  console.log('2. Navigate to: http://localhost:8123/lcars-bridge');
  console.log('3. Press Ctrl+F5 to clear cache');
  console.log('4. Check that buttons are lozenge-shaped and orange');
  
} catch (err) {
  console.error('❌ Deployment failed:', err.message);
  process.exit(1);
}
