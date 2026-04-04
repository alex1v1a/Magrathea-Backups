const { execSync } = require('child_process');

console.log('🔍 Chrome Status Check');
console.log('='.repeat(50));

try {
  // Check if chrome processes exist
  const result = execSync('wmic process where "name=\'chrome.exe\'" get ProcessId,CommandLine /format:csv 2> nul', { 
    encoding: 'utf8',
    timeout: 10000
  });
  
  const lines = result.trim().split('\n').filter(l => l.includes('chrome.exe'));
  
  console.log(`Chrome processes found: ${lines.length}\n`);
  
  // Check for Marvin profile in command lines
  let marvinProfileCount = 0;
  lines.forEach(line => {
    if (line.includes('chrome-marvin-only-profile')) {
      marvinProfileCount++;
    }
  });
  
  console.log(`Using Marvin profile: ${marvinProfileCount > 0 ? 'YES ✅' : 'NO ❌'}`);
  
  // Check for window
  const windowCheck = execSync('powershell -Command "Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.Application]::OpenForms.Count" 2> nul', {
    encoding: 'utf8'
  }).trim();
  console.log(`Open forms detected: ${windowCheck}`);
  
} catch (err) {
  console.log('Error checking Chrome:', err.message);
}

// Check if profile directory is being accessed
const fs = require('fs');
const profilePath = 'C:\\Users\\Admin\\.openclaw\\chrome-marvin-only-profile';

console.log(`\nProfile directory: ${fs.existsSync(profilePath) ? 'EXISTS ✅' : 'MISSING ❌'}`);

if (fs.existsSync(profilePath)) {
  const files = fs.readdirSync(profilePath);
  console.log(`Profile contents: ${files.join(', ')}`);
}
