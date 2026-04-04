const { execSync } = require('child_process');

console.log('🔍 Scheduled Task Analysis - CMD Window Popups');
console.log('='.repeat(70));

const tasksToCheck = [
  'Marvin Auto Recovery',
  'Marvin Email Monitor', 
  'Marvin Backup',
  'WSL-24x7-Monitor',
  'OpenClaw Gateway Auto-Recovery',
  'Kanban-AutoRefresh'
];

console.log('\n1. Checking scheduled tasks that show CMD windows:\n');

tasksToCheck.forEach(taskName => {
  try {
    const result = execSync(`schtasks /Query /TN "${taskName}" /FO LIST /V 2> nul`, { 
      encoding: 'utf8',
      timeout: 10000 
    });
    
    const taskToRun = result.match(/Task To Run:\s+(.+)/)?.[1]?.trim();
    const lastRun = result.match(/Last Run Time:\s+(.+)/)?.[1]?.trim();
    const nextRun = result.match(/Next Run Time:\s+(.+)/)?.[1]?.trim();
    
    console.log(`${taskName}:`);
    console.log(`  Command: ${taskToRun?.substring(0, 80)}...`);
    console.log(`  Last Run: ${lastRun}`);
    console.log(`  Next Run: ${nextRun}`);
    
    // Check if it shows a window
    const showsWindow = !taskToRun?.includes('Hidden') && 
                       (taskToRun?.includes('cmd.exe') || 
                        taskToRun?.includes('node') ||
                        taskToRun?.includes('.bat'));
    
    if (showsWindow) {
      console.log(`  ⚠️  SHOWS WINDOW - May interfere with Chrome`);
    } else {
      console.log(`  ✅ Hidden window`);
    }
    console.log('');
  } catch {
    console.log(`${taskName}: Not found or error\n`);
  }
});

console.log('='.repeat(70));
console.log('\n🔧 FIX: Disable tasks that show windows while testing Chrome\n');
console.log('Run these commands to temporarily disable:');
console.log('  schtasks /Change /TN "Marvin Auto Recovery" /DISABLE');
console.log('  schtasks /Change /TN "WSL-24x7-Monitor" /DISABLE');
console.log('  schtasks /Change /TN "Marvin Email Monitor" /DISABLE');
console.log('\nTo re-enable later:');
console.log('  schtasks /Change /TN "Marvin Auto Recovery" /ENABLE');
console.log('  schtasks /Change /TN "WSL-24x7-Monitor" /ENABLE');
console.log('  schtasks /Change /TN "Marvin Email Monitor" /ENABLE');
