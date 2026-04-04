const screenshot = require('screenshot-desktop');
const Jimp = require('jimp').default || require('jimp');
const { exec } = require('child_process');
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const EDGE_USER_DATA = 'C:\\Users\\Admin\\AppData\\Local\\Microsoft\\Edge\\User Data';

async function takeScreenshot(filename) {
  await screenshot({ filename });
  console.log(`📸 Screenshot saved: ${filename}`);
}

async function findExtensionIcon() {
  // Take screenshot
  await takeScreenshot('screen-1.png');
  
  // Load image
  const image = await Jimp.read('screen-1.png');
  const width = image.getWidth();
  const height = image.getHeight();
  
  console.log(`📺 Screen size: ${width}x${height}`);
  
  // Search top-right area where extension icons are (typically x=1700-1880, y=40-100)
  // Look for HEB red color (#dc2626 or similar)
  const searchArea = {
    x1: Math.floor(width * 0.88),
    y1: 40,
    x2: width - 10,
    y2: 120
  };
  
  console.log(`🔍 Searching area: ${searchArea.x1},${searchArea.y1} to ${searchArea.x2},${searchArea.y2}`);
  
  // Sample pixels to find red/orange colors (HEB brand colors)
  let bestMatch = null;
  let bestScore = 0;
  
  for (let y = searchArea.y1; y < searchArea.y2; y += 5) {
    for (let x = searchArea.x1; x < searchArea.x2; x += 5) {
      const color = Jimp.intToRGBA(image.getPixelColor(x, y));
      
      // Look for red-ish colors (HEB is red)
      const redness = color.r - (color.g + color.b) / 2;
      if (redness > 60 && color.r > 150) {
        const score = redness;
        if (score > bestScore) {
          bestScore = score;
          bestMatch = { x, y, color };
        }
      }
    }
  }
  
  if (bestMatch) {
    console.log(`✅ Found potential icon at: ${bestMatch.x}, ${bestMatch.y}`);
    console.log(`   Color: R=${bestMatch.color.r}, G=${bestMatch.color.g}, B=${bestMatch.color.b}`);
    return bestMatch;
  }
  
  // Default to estimated position
  console.log('⚠️  Icon not found, using default position');
  return { x: width - 80, y: 70 };
}

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
        System.Threading.Thread.Sleep(150);
        mouse_event(DOWN, 0, 0, 0, 0);
        System.Threading.Thread.Sleep(150);
        mouse_event(UP, 0, 0, 0, 0);
    }
}'@
[Mouse]::Click(${x}, ${y})
    `;
    exec(`powershell -Command "${psCommand}"`, () => resolve());
  });
}

async function main() {
  console.log('🛒 HEB Cart - Image Recognition Method\n');
  
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
  console.log('📸 Taking screenshot to find extension...\n');
  
  // Find extension icon
  const iconPos = await findExtensionIcon();
  
  console.log(`\n🖱️  Clicking extension icon at ${iconPos.x}, ${iconPos.y}...`);
  await clickMouse(iconPos.x, iconPos.y);
  await new Promise(r => setTimeout(r, 2000));
  
  // Take another screenshot to find the popup
  console.log('📸 Looking for popup...');
  await takeScreenshot('screen-2.png');
  
  // Click where "Add All Items" button should be (below icon)
  const buttonX = iconPos.x - 100;
  const buttonY = iconPos.y + 100;
  
  console.log(`🖱️  Clicking "Add All Items" at ${buttonX}, ${buttonY}...`);
  await clickMouse(buttonX, buttonY);
  await new Promise(r => setTimeout(r, 2000));
  
  // Click again in case first missed
  await clickMouse(buttonX, buttonY + 30);
  await new Promise(r => setTimeout(r, 30000));
  
  // Check cart
  console.log('\n🛒 Checking cart...');
  await page.goto('https://www.heb.com/cart');
  await new Promise(r => setTimeout(r, 5000));
  
  const cartCount = await page.locator('.cart-item').count().catch(() => 0);
  console.log(`📦 Items in cart: ${cartCount}`);
  
  console.log('\n✅ Done!');
}

main().catch(console.error);
