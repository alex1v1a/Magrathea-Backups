/**
 * Fully Automatic HEB Cart
 * Launches Chrome, brings to foreground, auto-navigates, auto-starts
 * Zero user interaction required
 */

const fs = require('fs');
const path = require('path');
const { spawn, exec } = require('child_process');

const DATA_DIR = path.join(__dirname, '..', 'data');
const USER_DATA_DIR = 'C:\\Users\\Admin\\.openclaw\\chrome-marvin-only-profile';

async function autoHEB() {
  console.log('🛒 FULLY AUTOMATIC HEB CART');
  console.log('═══════════════════════════════════════════\n');
  
  // 1. Prepare items
  const planPath = path.join(DATA_DIR, 'weekly-plan.json');
  const plan = JSON.parse(fs.readFileSync(planPath, 'utf8'));
  
  const items = [];
  const seen = new Set();
  for (const meal of plan.meals || []) {
    for (const ing of meal.ingredients || []) {
      const key = (ing.name || ing).toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        items.push({
          name: ing.name || ing,
          searchTerm: ing.hebSearch || ing.name || ing,
          amount: ing.amount || '1',
          status: 'pending'
        });
      }
    }
  }
  
  // 2. Save to extension
  const extDir = path.join(__dirname, '..', 'heb-extension');
  fs.writeFileSync(
    path.join(extDir, 'autostart-data.json'),
    JSON.stringify({ items, autoStart: true, timestamp: Date.now() }, null, 2)
  );
  
  console.log(`✅ Prepared ${items.length} items`);
  
  // 3. Find Chrome
  const chromePaths = [
    `${process.env.LOCALAPPDATA}\\Google\\Chrome\\Application\\chrome.exe`,
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe'
  ];
  
  let chromePath = chromePaths.find(p => fs.existsSync(p));
  if (!chromePath) {
    console.error('❌ Chrome not found');
    return;
  }
  
  // 4. Ensure profile dir exists
  if (!fs.existsSync(USER_DATA_DIR)) {
    fs.mkdirSync(USER_DATA_DIR, { recursive: true });
  }
  
  // 5. Launch Chrome with extension and HEB.com
  const args = [
    `--user-data-dir="${USER_DATA_DIR}"`,
    `--load-extension="${path.resolve(extDir)}"`,
    '--no-first-run',
    '--no-default-browser-check',
    '--start-maximized',
    '--activate-on-launch',
    'https://www.heb.com'
  ];
  
  console.log('🚀 Launching Chrome with HEB.com...');
  
  const chrome = spawn(chromePath, args, {
    detached: false,  // Keep attached so we can bring to front
    stdio: 'ignore'
  });
  
  console.log(`✅ Chrome launched (PID: ${chrome.pid})`);
  
  // 6. Bring Chrome to foreground (Windows)
  await sleep(3000);
  
  console.log('🔲 Bringing Chrome to foreground...');
  
  // Use PowerShell to activate Chrome window
  const psCmd = `
    Add-Type @"
      using System;
      using System.Runtime.InteropServices;
      public class WinAPI {
        [DllImport("user32.dll")]
        public static extern bool SetForegroundWindow(IntPtr hWnd);
        [DllImport("user32.dll")]
        public static extern bool ShowWindowAsync(IntPtr hWnd, int nCmdShow);
        [DllImport("user32.dll")]
        public static extern bool IsIconic(IntPtr hWnd);
      }
"@
    
    $procs = Get-Process chrome -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowTitle -ne '' }
    if ($procs) {
      $hwnd = $procs[0].MainWindowHandle
      if ([WinAPI]::IsIconic($hwnd)) {
        [WinAPI]::ShowWindowAsync($hwnd, 9) | Out-Null  # SW_RESTORE
      }
      [WinAPI]::SetForegroundWindow($hwnd) | Out-Null
      Write-Host "Chrome brought to foreground"
    }
  `;
  
  exec(`powershell -Command "${psCmd}"`, (err) => {
    if (err) console.log('  ⚠️ Could not bring to front (non-critical)');
    else console.log('  ✅ Chrome is now active');
  });
  
  // 7. Auto-inject script to ensure HEB loads
  await sleep(2000);
  
  console.log('\n📋 What happens next (automatic):');
  console.log('  1. Chrome window opens to HEB.com');
  console.log('  2. Extension detects HEB.com');
  console.log('  3. Extension auto-starts adding items');
  console.log('  4. Items added one-by-one with delays');
  console.log('\n⚠️  IMPORTANT: You must be logged into HEB.com!');
  console.log('   If not logged in, the automation will fail.\n');
  
  // Save status
  fs.writeFileSync(
    path.join(DATA_DIR, 'heb-auto-status.json'),
    JSON.stringify({
      pid: chrome.pid,
      launchedAt: new Date().toISOString(),
      items: items.length,
      note: 'Chrome launched - extension will auto-start'
    }, null, 2)
  );
  
  // Keep alive for a bit
  await sleep(10000);
  console.log('✅ HEB auto-launcher complete');
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

autoHEB().catch(console.error);
