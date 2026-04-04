const screenshot = require('screenshot-desktop');
const { exec } = require('child_process');
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const EDGE_USER_DATA = 'C:\\Users\\Admin\\AppData\\Local\\Microsoft\\Edge\\User Data';

async function clickMouse(x, y) {
  return new Promise((resolve) => {
    const psCommand = `
Add-Type @'
using System;
using System.Runtime.InteropServices;
public class Mouse {
    [DllImport("user32.dll")] static extern bool SetCursorPos(int x, int y);
    [DllImport("user32.dll")] static extern void mouse_event(int f, int dx, int dy, int d, int i);
    const int DOWN = 0x02, UP = 0x04;
    public static void Click(int x, int y) {
        SetCursorPos(x, y);
        System.Threading.Thread.Sleep(200);
        mouse_event(DOWN, 0, 0, 0, 0);
        System.Threading.Thread.Sleep(200);
        mouse_event(UP, 0, 0, 0, 0);
    }
}'@
[Mouse]::Click(${x}, ${y})
    `;
    exec(`powershell -Command "${psCommand}"`, () => resolve());
  });
}

async function main() {
  console.log('🛒 HEB Cart - Grid Search Method\n');
  
  const context = await chromium.launchPersistentContext(EDGE_USER_DATA, {
    headless: false,
    executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    args: ['--start-maximized'],
    viewport: { width: 1920, height: 1080 }
  });
  
  const page = context.pages()[0] || await context.newPage();
  await page.goto('https://www.heb.com');
  await new Promise(r => setTimeout(r, 3000));
  
  console.log('✅ HEB loaded');
  console.log('🖱️  Searching for extension icon...\n');
  
  // Grid search - try multiple positions in top-right toolbar area
  const positions = [
    { x: 1800, y: 60 },  // Far right
    { x: 1760, y: 60 },  // Slightly left
    { x: 1720, y: 60 },  // More left
    { x: 1680, y: 60 },  // Even more left
    { x: 1840, y: 60 },  // Far far right
    { x: 1800, y: 80 },  // Lower
    { x: 1760, y: 80 },  // Lower left
    { x: 1850, y: 50 },  // Higher right
  ];
  
  for (let i = 0; i < positions.length; i++) {
    const pos = positions[i];
    console.log(`[${i + 1}/${positions.length}] Clicking ${pos.x}, ${pos.y}...`);
    
    await clickMouse(pos.x, pos.y);
    await new Promise(r => setTimeout(r, 1500));
    
    // Take screenshot to check if popup appeared
    await screenshot({ filename: `search-${i}.png` });
    console.log(`   📸 Saved: search-${i}.png`);
    
    // Click at potential "Add All" location
    await clickMouse(pos.x - 50, pos.y + 120);
    await new Promise(r => setTimeout(r, 1000));
    
    await clickMouse(pos.x - 50, pos.y + 150);
    await new Promise(r => setTimeout(r, 2000));
  }
  
  console.log('\n🛒 Checking cart...');
  await page.goto('https://www.heb.com/cart');
  await new Promise(r => setTimeout(r, 5000));
  
  console.log('✅ Done!');
}

main().catch(console.error);
