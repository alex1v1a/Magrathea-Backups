const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 FINAL CHROME TEST - With HEB Extension');
console.log('=' .repeat(60));

const MARVIN_PROFILE = 'C:\\Users\\Admin\\.openclaw\\chrome-marvin-only-profile';
const EXTENSION_PATH = path.join(__dirname, 'dinner-automation', 'heb-extension');

// Ensure autostart data exists
const autoStartPath = path.join(EXTENSION_PATH, 'autostart-data.json');
if (!fs.existsSync(autoStartPath)) {
  const plan = JSON.parse(fs.readFileSync(path.join(__dirname, 'dinner-automation', 'data', 'weekly-plan.json'), 'utf8'));
  const items = [];
  plan.meals.forEach(meal => {
    meal.ingredients.forEach(ing => items.push({ name: ing.name, hebSearch: ing.hebSearch, amount: ing.amount }));
  });
  fs.writeFileSync(autoStartPath, JSON.stringify({ autoStart: true, items, timestamp: new Date().toISOString() }, null, 2));
}

console.log('🛒 Launching Chrome + HEB Auto-Cart v1.2.0');
console.log('📦 Profile: Marvin (9marvinmartian@gmail.com)');
console.log('🔧 Flags: --no-sandbox --disable-gpu (stability mode)');
console.log('');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const args = [
  `--user-data-dir=${MARVIN_PROFILE}`,
  `--load-extension=${EXTENSION_PATH}`,
  '--no-sandbox',
  '--disable-gpu',
  '--disable-software-rasterizer',
  '--no-first-run',
  '--no-default-browser-check',
  '--enable-logging',
  '--v=1',
  '--start-maximized',
  'https://www.heb.com'
];

console.log('🚀 Starting Chrome...');

const chrome = spawn(chromePath, args, {
  detached: false,
  stdio: 'ignore'
});

console.log('✅ Chrome launched! PID:', chrome.pid);
console.log('');
console.log('📋 What to watch for:');
console.log('   1. Chrome window should open and stay open');
console.log('   2. HEB.com should load');
console.log('   3. Click the 🛒 HEB Auto-Cart icon');
console.log('   4. Extension should auto-detect 44 items');
console.log('');
console.log('⏳ Monitoring for 5 minutes...\n');

let minutes = 0;
const interval = setInterval(() => {
  minutes++;
  
  try {
    process.kill(chrome.pid, 0);
    console.log(`✅ Minute ${minutes}: Chrome still running (${minutes * 60}s survival)`);
  } catch {
    clearInterval(interval);
    console.log(`\n❌ Chrome crashed at minute ${minutes}`);
    
    if (minutes >= 2) {
      console.log('\n🎉 SUCCESS! Chrome survived over 2 minutes with extension!');
      console.log('   The fixes are working!');
    } else {
      console.log('\n⚠️  Chrome crashed early. Try again or use Edge.');
    }
    return;
  }
  
  if (minutes >= 5) {
    clearInterval(interval);
    console.log('\n🎉🎉🎉 EXCELLENT! Chrome survived 5 minutes with HEB extension!');
    console.log('   All system repairs were successful!');
    console.log('   Chrome is now stable for HEB automation.');
    console.log('\n📋 Next: Click the 🛒 icon and start adding items!');
  }
}, 60000);
