#!/usr/bin/env node
/**
 * Facebook Marketplace Automation - Marvin Chrome Profile
 * Works even when Chrome is open
 * Uses persistent Marvin profile for login session
 * 
 * Modes:
 *   --monitor     : Check for new messages about F-150/Thule (default for cron)
 *   --share       : Share listing to Facebook groups
 *   --login-only  : Open Facebook for manual login (save session for automation)
 * 
 * Usage:
 *   1. First time / session expired: node facebook-marketplace-automation.js --login-only
 *   2. Monitor mode (cron):        node facebook-marketplace-automation.js --monitor
 *   3. Share to groups:             node facebook-marketplace-automation.js --share
 * 
 * Credentials: alex@xspqr.com / section9
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

// Config
const PROFILE_NAME = 'Marvin';  // Use Marvin profile for Facebook login
const DEBUG_PORT = '9224'; // Different port for Facebook (separate from HEB)
const CHROME_USER_DATA = path.join(process.env.LOCALAPPDATA, 'Google', 'Chrome', 'User Data');

// Parse arguments
const args = process.argv.slice(2);
const IS_MONITOR_MODE = args.includes('--monitor');
const IS_SHARE_MODE = args.includes('--share');
const IS_LOGIN_ONLY = args.includes('--login-only');

// Default to monitor mode for cron jobs
let MODE = 'monitor';
if (IS_SHARE_MODE) MODE = 'share';
if (IS_LOGIN_ONLY) MODE = 'login';

// Facebook Marketplace Groups (from MEMORY.md)
const GROUPS = [
  { name: 'HAYS COUNTY LIST & SELL', id: '123456' },
  { name: 'Buda/Kyle Buy, Sell & Rent', id: '789012' },
  { name: 'Ventas De Austin, Buda, Kyle', id: '345678' }
];

// F-150 Listing Data
const LISTING = {
  title: '2018 Ford F-150 STX 2.7L EcoBoost - $26,500 OBO',
  description: `2018 Ford F-150 STX SuperCab
• 2.7L EcoBoost V6 Engine  
• 110,584 miles
• Automatic transmission
• Black on black
• Clean title
• Well-maintained
• Located in Buda, TX

Message me for details!`,
  price: '26500',
  location: 'Buda, TX'
};

// Keywords to monitor for
const MONITOR_KEYWORDS = ['f-150', 'f150', 'truck', 'thule', 'box', 'cargo', 'rack', 'buy', 'interested', 'available', 'price', 'offer'];

// Data directory
const DATA_DIR = path.join(__dirname, '..', 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

// Load previous message state
function loadMessageState() {
  const stateFile = path.join(DATA_DIR, 'fb-message-state.json');
  if (fs.existsSync(stateFile)) {
    return JSON.parse(fs.readFileSync(stateFile, 'utf8'));
  }
  return { lastCheck: null, seenMessages: [] };
}

// Save message state
function saveMessageState(state) {
  const stateFile = path.join(DATA_DIR, 'fb-message-state.json');
  fs.writeFileSync(stateFile, JSON.stringify(state, null, 2));
}

// Load alert log
function loadAlertLog() {
  const logFile = path.join(DATA_DIR, 'fb-message-alerts.json');
  if (fs.existsSync(logFile)) {
    return JSON.parse(fs.readFileSync(logFile, 'utf8'));
  }
  return { alerts: [] };
}

// Save alert
function saveAlert(alert) {
  const log = loadAlertLog();
  log.alerts.push({ ...alert, timestamp: new Date().toISOString() });
  // Keep only last 100 alerts
  if (log.alerts.length > 100) log.alerts = log.alerts.slice(-100);
  const logFile = path.join(DATA_DIR, 'fb-message-alerts.json');
  fs.writeFileSync(logFile, JSON.stringify(log, null, 2));
}

async function checkMarketplaceMessages(page) {
  console.log('📨 Checking Marketplace Messages...');
  console.log('====================================');
  
  const state = loadMessageState();
  const actionableMessages = [];
  
  try {
    // Navigate to Facebook Marketplace messages
    await page.goto('https://www.facebook.com/marketplace/inbox/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(5000);
    
    // Look for conversation threads
    const conversationSelectors = [
      '[role="listitem"]',
      '[data-testid="messenger-list-item"]',
      'div[role="button"][tabindex="0"]'
    ];
    
    let conversations = [];
    for (const selector of conversationSelectors) {
      try {
        conversations = await page.$$(selector);
        if (conversations.length > 0) break;
      } catch (e) {}
    }
    
    console.log(`Found ${conversations.length} conversation threads`);
    
    for (let i = 0; i < Math.min(conversations.length, 10); i++) {
      try {
        const conv = conversations[i];
        const text = await conv.textContent().catch(() => '');
        
        if (!text) continue;
        
        // Check if message contains relevant keywords
        const lowerText = text.toLowerCase();
        const matchedKeywords = MONITOR_KEYWORDS.filter(kw => lowerText.includes(kw.toLowerCase()));
        
        if (matchedKeywords.length > 0) {
          // Extract sender name (usually first line or before the message preview)
          const lines = text.split('\n').filter(l => l.trim());
          const sender = lines[0]?.trim() || 'Unknown';
          const preview = lines.slice(1, 3).join(' ').trim() || text.slice(0, 100);
          
          // Create unique ID for this message
          const messageId = `${sender}-${preview.slice(0, 50)}`;
          
          // Check if we've seen this before
          if (!state.seenMessages.includes(messageId)) {
            state.seenMessages.push(messageId);
            // Keep only last 100 seen messages
            if (state.seenMessages.length > 100) {
              state.seenMessages = state.seenMessages.slice(-100);
            }
            
            actionableMessages.push({
              sender,
              preview: preview.slice(0, 200),
              keywords: matchedKeywords,
              id: messageId
            });
            
            console.log(`\n🎯 POTENTIAL BUYER: ${sender}`);
            console.log(`   Keywords: ${matchedKeywords.join(', ')}`);
            console.log(`   Preview: "${preview.slice(0, 100)}..."`);
          }
        }
      } catch (e) {
        // Skip problematic conversations
      }
    }
    
    state.lastCheck = new Date().toISOString();
    saveMessageState(state);
    
  } catch (error) {
    console.log(`  ❌ Error checking messages: ${error.message}`);
  }
  
  return actionableMessages;
}

async function shareToFacebookGroup(page, groupName) {
  console.log(`Sharing to: ${groupName}`);
  
  try {
    // Search for the group
    await page.goto('https://www.facebook.com/groups/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);
    
    // Click "Write something..." in group
    const postBoxSelectors = [
      '[role="button"]:has-text("Write something")',
      '[role="button"]:has-text("Create post")',
      'div[contenteditable="true"]'
    ];
    
    let postBox = null;
    for (const selector of postBoxSelectors) {
      try {
        postBox = await page.$(selector);
        if (postBox) {
          await postBox.click();
          break;
        }
      } catch (e) {}
    }
    
    if (!postBox) {
      console.log(`  ⚠️ Could not find post box for ${groupName}`);
      return false;
    }
    
    await page.waitForTimeout(2000);
    
    // Type post content
    const editable = await page.$('div[contenteditable="true"]');
    if (editable) {
      await editable.fill(LISTING.description);
    }
    
    await page.waitForTimeout(1000);
    
    // Click Post button
    const postBtn = await page.$('[role="button"]:has-text("Post")');
    if (postBtn) {
      await postBtn.click();
      console.log(`  ✅ Shared to ${groupName}`);
      await page.waitForTimeout(3000);
      return true;
    }
    
    console.log(`  ⚠️ Could not find post button for ${groupName}`);
    return false;
    
  } catch (error) {
    console.log(`  ❌ Error sharing to ${groupName}: ${error.message}`);
    return false;
  }
}

async function runFacebookAutomation() {
  console.log('🚗 Facebook Marketplace Automation - Marvin Profile');
  console.log('==================================================');
  console.log(`Using Chrome Profile: ${PROFILE_NAME}`);
  console.log(`Debug Port: ${DEBUG_PORT}`);
  console.log(`Mode: ${MODE.toUpperCase()}`);
  console.log();
  
  // Find Chrome executable
  const chromePaths = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    path.join(process.env.LOCALAPPDATA, 'Google\\Chrome\\Application\\chrome.exe')
  ];
  
  const chromePath = chromePaths.find(p => fs.existsSync(p));
  
  if (!chromePath) {
    console.error('❌ Chrome not found. Please install Chrome.');
    process.exit(1);
  }
  
  let browser;
  let page;
  
  // Strategy: Try to connect to Marvin profile on port 9224
  try {
    console.log(`🔍 Checking for existing Marvin Chrome on port ${DEBUG_PORT}...`);
    browser = await chromium.connectOverCDP(`http://localhost:${DEBUG_PORT}`);
    console.log('✅ Connected to existing Marvin Chrome instance');
    
    const context = browser.contexts()[0];
    page = context.pages()[0];
    if (!page) {
      page = await context.newPage();
    }
  } catch (error) {
    console.log(`ℹ️  Marvin Chrome not running on port ${DEBUG_PORT}`);
    console.log('🚀 Launching new Chrome with Marvin profile...');
    console.log('   (This won\'t interfere with your main Chrome)');
    console.log();
    
    try {
      // Use launchPersistentContext for user data dir (Playwright requirement)
      const profilePath = path.join(CHROME_USER_DATA, PROFILE_NAME);
      const context = await chromium.launchPersistentContext(profilePath, {
        headless: false,
        executablePath: chromePath,
        args: [
          '--no-first-run',
          '--no-default-browser-check',
          '--start-maximized',
          `--remote-debugging-port=${DEBUG_PORT}`
        ]
      });

      browser = context;
      page = context.pages()[0] || await context.newPage();
      if (!page) {
        page = await context.newPage();
      }
      console.log(`✅ Launched Chrome with ${PROFILE_NAME} profile`);
    } catch (launchError) {
      // Fallback: Launch with different user data dir
      const marvinDataDir = path.join(process.env.USERPROFILE, '.marvin-chrome-fb');
      const context = await chromium.launchPersistentContext(marvinDataDir, {
        headless: false,
        executablePath: chromePath,
        args: [
          '--no-first-run',
          '--no-default-browser-check',
          '--start-maximized',
          `--remote-debugging-port=${DEBUG_PORT}`
        ]
      });
      browser = context;
      page = context.pages()[0] || await context.newPage();
      console.log('✅ Launched Chrome with separate data directory');
    }
  }
  
  console.log();
  console.log('Checking Facebook login...');
  await page.goto('https://www.facebook.com', { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);
  
  // Check if logged in
  const pageContent = await page.content();
  const isLoggedIn = pageContent.includes('Log Out') || 
                     pageContent.includes('Create post') ||
                     pageContent.includes('News Feed');
  
  if (MODE === 'login') {
    // LOGIN-ONLY MODE
    console.log();
    console.log('🔐 LOGIN MODE - Facebook Session Setup');
    console.log('====================================');
    
    if (isLoggedIn) {
      console.log('✅ Already logged in to Facebook!');
      console.log('   Session is active and will persist for automation.');
      console.log();
      console.log('You can now run:');
      console.log('  node facebook-marketplace-automation.js --monitor');
      console.log('  node facebook-marketplace-automation.js --share');
      console.log();
    } else {
      console.log('⚠️  Not logged in to Facebook.');
      console.log();
      console.log('📋 Login Instructions:');
      console.log('   1. A Chrome window is now open');
      console.log('   2. Go to https://www.facebook.com/login');
      console.log('   3. Log in with: alex@xspqr.com');
      console.log('   4. Complete any 2FA/security checks');
      console.log('   5. DO NOT CLOSE this Chrome window!');
      console.log('   6. The session will be saved automatically');
      console.log();
      console.log('   Press Enter here when login is complete...');
      
      await new Promise(resolve => {
        process.stdin.once('data', () => resolve());
      });
      
      // Verify login
      await page.reload({ waitUntil: 'networkidle' });
      await page.waitForTimeout(3000);
      const newContent = await page.content();
      const nowLoggedIn = newContent.includes('Log Out') || 
                          newContent.includes('Create post') ||
                          newContent.includes('News Feed');
      
      if (nowLoggedIn) {
        console.log();
        console.log('✅ Login verified! Session saved.');
        console.log('   You can now run monitor/share commands.');
      } else {
        console.log();
        console.log('⚠️  Login not detected. Please try again.');
      }
    }
    
    console.log();
    console.log('Closing browser...');
    await browser.close();
    process.exit(0);
  }
  
  if (!isLoggedIn) {
    console.log('⚠️  Not logged in to Facebook.');
    console.log('   Run: node facebook-marketplace-automation.js --login-only');
    console.log('   Then retry your command.');
    await browser.close();
    process.exit(1);
  } else {
    console.log('✅ Logged in to Facebook!');
  }
  
  if (MODE === 'share') {
    // SHARE MODE
    console.log();
    console.log('Sharing F-150 listing to groups...');
    console.log('====================================');
    
    const results = [];
    for (const group of GROUPS) {
      const success = await shareToFacebookGroup(page, group.name);
      results.push({ group: group.name, success });
      await page.waitForTimeout(5000);
    }
    
    // Summary
    const successful = results.filter(r => r.success).length;
    console.log();
    console.log('====================================');
    console.log(`✅ Shared to ${successful}/${results.length} groups`);
    console.log('====================================');
    
    // Update MEMORY.md with sharing history
    const memoryUpdate = {
      timestamp: new Date().toISOString(),
      listing: LISTING.title,
      results: results
    };
    
    fs.writeFileSync(
      path.join(__dirname, '..', 'data', 'facebook-share-results.json'),
      JSON.stringify(memoryUpdate, null, 2)
    );
    
    console.log();
    console.log('Browser will stay open.');
    console.log('Close Chrome when done.');
    
    // Keep browser open
    await new Promise(() => {});
  } else {
    // MONITOR MODE
    console.log();
    const actionableMessages = await checkMarketplaceMessages(page);
    
    console.log();
    console.log('====================================');
    console.log(`📊 Monitor Results: ${actionableMessages.length} new actionable message(s)`);
    console.log('====================================');
    
    if (actionableMessages.length > 0) {
      for (const msg of actionableMessages) {
        const alert = {
          type: 'buyer_interest',
          sender: msg.sender,
          preview: msg.preview,
          keywords: msg.keywords,
          urgency: 'medium'
        };
        saveAlert(alert);
        
        // Output for webhook/cron notification
        console.log(`\n🚨 ACTIONABLE: ${msg.sender}`);
        console.log(`   Message: "${msg.preview}"`);
        console.log(`   Matched: ${msg.keywords.join(', ')}`);
      }
      
      // Summary for cron notification
      console.log(`\n🎯 TOTAL: ${actionableMessages.length} buyer(s) showing interest`);
      console.log('   Check Facebook Marketplace inbox to respond!');
    } else {
      console.log('No new actionable messages found.');
    }
    
    console.log();
    console.log('Monitor check complete.');
    
    // Close browser in monitor mode
    await browser.close();
    process.exit(0);
  }
}

// Run
runFacebookAutomation().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
