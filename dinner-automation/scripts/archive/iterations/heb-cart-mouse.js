const { chromium } = require('playwright');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

const EDGE_USER_DATA = 'C:\\Users\\Admin\\AppData\\Local\\Microsoft\\Edge\\User Data';
const DATA_DIR = path.join(__dirname, '..', 'data');

function loadItems() {
  try {
    return JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'heb-extension-items.json'), 'utf8')).items || [];
  } catch (e) { return []; }
}

async function clickWithPowerShell(x, y) {
  return new Promise((resolve) => {
    const psCommand = `
Add-Type @'
using System;
using System.Runtime.InteropServices;
public class MouseClicker {
    [DllImport("user32.dll")] static extern bool SetCursorPos(int x, int y);
    [DllImport("user32.dll")] static extern void mouse_event(int flags, int dx, int dy, int data, int info);
    const int LEFTDown = 0x02, LEFTUp = 0x04;
    public static void Click(int x, int y) {
        SetCursorPos(x, y); System.Threading.Thread.Sleep(100);
        mouse_event(LEFTDown, 0, 0, 0, 0); System.Threading.Thread.Sleep(100);
        mouse_event(LEFTUp, 0, 0, 0, 0);
    }
}'@
[MouseClicker]::Click(${x}, ${y})
    `;
    
    exec(`powershell -Command "${psCommand}"`, () => resolve());
  });
}

async function main() {
  const items = loadItems();
  console.log('🛒 HEB Cart - With Mouse Automation\n');
  console.log(`📋 ${items.length} items\n`);
  
  const context = await chromium.launchPersistentContext(EDGE_USER_DATA, {
    headless: false,
    executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    args: ['--start-maximized', '--window-position=0,0'],
    viewport: { width: 1920, height: 1080 }
  });
  
  const page = context.pages()[0] || await context.newPage();
  await page.goto('https://www.heb.com');
  await page.waitForTimeout(5000);
  
  console.log('✅ HEB loaded');
  console.log('🖱️  Moving mouse to extension icon (top-right)...');
  
  // Move mouse to extension icon area (top-right of screen at 1920x1080)
  await clickWithPowerShell(1850, 80);
  await new Promise(r => setTimeout(r, 1000));
  
  console.log('✅ Clicked extension icon');
  console.log('⏳ Waiting for popup...');
  await new Promise(r => setTimeout(r, 2000));
  
  console.log('🖱️  Clicking "Add All Items" button...');
  // Popup appears below icon, click in that area
  await clickWithPowerShell(1700, 200);
  await new Promise(r => setTimeout(r, 1000));
  
  console.log('✅ Clicked Add All Items');
  console.log('⏳ Waiting for items to add...');
  await new Promise(r => setTimeout(r, 30000));
  
  console.log('\n🛒 Checking cart...');
  await page.goto('https://www.heb.com/cart');
  await new Promise(r => setTimeout(r, 5000));
  
  console.log('✅ Done!');
}

main().catch(console.error);
