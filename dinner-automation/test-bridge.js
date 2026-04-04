// Quick test for HEB Bridge
// Run: node test-bridge.js

const http = require('http');

const API_BASE = 'http://localhost:8765';

async function request(path, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 8765,
      path,
      method,
      headers: {
        'Content-Type': 'application/json'
      }
    };
    
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          resolve(data);
        }
      });
    });
    
    req.on('error', reject);
    
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function runTests() {
  console.log('🧪 Testing HEB Bridge...\n');
  
  // Test 1: Health check
  console.log('1️⃣ Health check...');
  try {
    const health = await request('/health');
    console.log('   ✅ Bridge is running');
    console.log(`   Connected: ${health.connected}`);
    console.log(`   URL: ${health.url || 'N/A'}`);
  } catch (error) {
    console.error('   ❌ Bridge not responding');
    console.log('\n   Make sure to run: node heb-bridge.js');
    process.exit(1);
  }
  
  // Test 2: Page info
  console.log('\n2️⃣ Getting page info...');
  try {
    const info = await request('/api/page');
    console.log(`   URL: ${info.url}`);
    console.log(`   Logged in: ${info.isLoggedIn}`);
    console.log(`   Is cart page: ${info.isCartPage}`);
  } catch (error) {
    console.error('   ❌ Error:', error.message);
  }
  
  // Test 3: Send ping command
  console.log('\n3️⃣ Testing command API...');
  try {
    const result = await request('/api/command', 'POST', {
      command: 'ping',
      payload: {}
    });
    console.log('   ✅ Command API working');
    console.log(`   Response:`, result.result);
  } catch (error) {
    console.error('   ❌ Error:', error.message);
  }
  
  // Test 4: Get cart
  console.log('\n4️⃣ Getting cart...');
  try {
    const cart = await request('/api/cart');
    console.log(`   Items in cart: ${cart.itemCount || 0}`);
    if (cart.items?.length > 0) {
      cart.items.forEach(item => {
        console.log(`   - ${item.name} (${item.quantity})`);
      });
    }
  } catch (error) {
    console.error('   ❌ Error:', error.message);
  }
  
  console.log('\n✨ Tests complete!');
  console.log('\nTo add items:');
  console.log(`  curl -X POST ${API_BASE}/api/cart/add \\\\`);
  console.log(`    -H "Content-Type: application/json" \\\\`);
  console.log(`    -d '{"items": [{"searchTerm": "milk", "quantity": 1}]}'`);
}

runTests().catch(console.error);
