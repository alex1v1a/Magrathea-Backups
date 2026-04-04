const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const DATA_DIR = path.join(__dirname, '..', 'data');
const PORT = 8765;

function loadItems() {
  try {
    return JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'heb-extension-items.json'), 'utf8')).items || [];
  } catch (e) { return []; }
}

// Create local extension mimic
function createExtensionPage(items) {
  return `
<!DOCTYPE html>
<html>
<head>
  <title>HEB Auto-Cart</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 20px; background: #f5f5f5; }
    h1 { color: #dc2626; }
    .item { background: white; padding: 10px; margin: 5px 0; border-radius: 5px; }
    button { 
      background: #dc2626; color: white; padding: 15px 30px; 
      font-size: 18px; border: none; border-radius: 8px; cursor: pointer;
    }
    button:hover { background: #b91c1c; }
    #status { margin-top: 20px; font-weight: bold; }
  </style>
</head>
<body>
  <h1>🛒 HEB Auto-Cart</h1>
  <p>${items.length} items ready</p>
  <button id="addAll">Add All Items to HEB Cart</button>
  <div id="status"></div>
  <h3>Items:</h3>
  ${items.map((item, i) => `
    <div class="item">${i + 1}. ${item.name} (${item.amount})</div>
  `).join('')}
  
  <script>
    const items = ${JSON.stringify(items)};
    let current = 0;
    
    document.getElementById('addAll').addEventListener('click', async () => {
      const status = document.getElementById('status');
      status.textContent = 'Adding items...';
      
      // Open HEB in new window
      window.open('https://www.heb.com', 'heb_window');
      
      status.textContent = 'HEB opened! Please use the extension in the HEB window.';
    });
    
    // Auto-click after 2 seconds
    setTimeout(() => {
      document.getElementById('addAll').click();
    }, 2000);
  </script>
</body>
</html>
  `;
}

async function main() {
  const items = loadItems();
  console.log('🛒 HEB Cart - Local Extension Server\n');
  console.log(`📋 ${items.length} items\n`);
  
  // Start local server
  const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(createExtensionPage(items));
  });
  
  server.listen(PORT, () => {
    console.log(`✅ Extension server running on http://localhost:${PORT}`);
  });
  
  // Open browser
  const EDGE_USER_DATA = 'C:\\Users\\Admin\\AppData\\Local\\Microsoft\\Edge\\User Data';
  const context = await chromium.launchPersistentContext(EDGE_USER_DATA, {
    headless: false,
    executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    args: ['--start-maximized'],
    viewport: { width: 1920, height: 1080 }
  });
  
  // Open HEB
  const hebPage = context.pages()[0] || await context.newPage();
  await hebPage.goto('https://www.heb.com');
  console.log('✅ HEB.com opened');
  
  // Open extension page
  const extPage = await context.newPage();
  await extPage.goto(`http://localhost:${PORT}`);
  console.log('✅ Extension control panel opened\n');
  
  console.log('🤖 Auto-adding will start in 2 seconds...');
  console.log('   (You can also click the "Add All Items" button)\n');
  
  // Keep running
  await new Promise(() => {});
}

main().catch(console.error);
