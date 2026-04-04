const fs = require('fs');
const path = require('path');

// Check extension status
const extPath = path.join(__dirname, '..', 'heb-extension');
const autoStartFile = path.join(extPath, 'autostart-data.json');

console.log('🔍 HEB Extension Status Check\n');

// Check if autostart data exists
if (fs.existsSync(autoStartFile)) {
  const data = JSON.parse(fs.readFileSync(autoStartFile, 'utf8'));
  console.log('✅ Autostart data found');
  console.log(`   Items: ${data.items?.length || 0}`);
  console.log(`   AutoStart: ${data.autoStart}`);
  console.log(`   Timestamp: ${data.timestamp}\n`);
} else {
  console.log('❌ No autostart data found\n');
}

// Check Chrome processes
const { execSync } = require('child_process');
try {
  const chromeCount = execSync('Get-Process chrome -ErrorAction SilentlyContinue | Measure-Object | Select-Object -ExpandProperty Count', { 
    shell: 'powershell.exe',
    encoding: 'utf8' 
  }).trim();
  console.log(`🌐 Chrome processes: ${chromeCount}`);
} catch {
  console.log('🌐 Chrome: Not running');
}

console.log('\n📋 Next Steps:');
console.log('1. Check Chrome window for HEB.com');
console.log('2. Look for blue notification: "🚀 Starting: 44 items"');
console.log('3. If not started, click 🛒 icon in Chrome toolbar');
