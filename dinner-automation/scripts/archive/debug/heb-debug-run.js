const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

// Enable debug logging
const DEBUG = true;
function log(msg, type = 'info') {
  const timestamp = new Date().toISOString();
  const icons = { info: 'ℹ️', success: '✅', error: '❌', warn: '⚠️', debug: '🔍' };
  const icon = icons[type] || icons.info;
  const line = `[${timestamp}] ${icon} ${msg}`;
  console.log(line);
  
  // Also write to log file
  const logFile = path.join(__dirname, '..', 'data', 'heb-debug.log');
  fs.appendFileSync(logFile, line + '\n');
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function runWithLogging() {
  log('Starting HEB automation with extensive logging', 'info');
  
  let browser = null;
  let context = null;
  let page = null;
  
  try {
    // Check if Chrome is running
    log('Checking Chrome status on port 9222...', 'debug');
    
    // Connect to shared Chrome
    log('Connecting to Chrome...', 'info');
    browser = await chromium.connectOverCDP('http://localhost:9222');
    log(`Browser connected. Type: ${typeof browser}`, 'success');
    log(`Browser contexts: ${browser.contexts?.length || 0}`, 'debug');
    
    // Get context
    context = browser.contexts()[0];
    if (!context) {
      log('No existing context, creating new one...', 'warn');
      context = await browser.newContext();
    }
    log(`Context obtained. Pages: ${context.pages?.length || 0}`, 'debug');
    
    // Get or create page
    page = context.pages().find(p => p.url().includes('heb.com'));
    if (!page) {
      log('No HEB page found, creating new page...', 'warn');
      page = await context.newPage();
    } else {
      log(`Using existing HEB page: ${page.url()}`, 'success');
    }
    
    // Listen for page events
    page.on('crash', () => log('PAGE CRASHED!', 'error'));
    page.on('close', () => log('PAGE CLOSED!', 'error'));
    page.on('error', err => log(`PAGE ERROR: ${err.message}`, 'error'));
    
    context.on('close', () => log('CONTEXT CLOSED!', 'error'));
    browser.on('disconnected', () => log('BROWSER DISCONNECTED!', 'error'));
    
    // Check login
    log('Checking login status...', 'info');
    const isLoggedIn = await page.evaluate(() => {
      return !!document.querySelector('[data-testid="account-menu"]') && 
             !document.querySelector('a[href*="/login"]');
    }).catch(err => {
      log(`Login check failed: ${err.message}`, 'error');
      return false;
    });
    
    log(`Login status: ${isLoggedIn ? 'LOGGED IN' : 'NOT LOGGED IN'}`, isLoggedIn ? 'success' : 'warn');
    
    if (!isLoggedIn) {
      log('Waiting for login (2 minutes max)...', 'warn');
      let attempts = 0;
      while (attempts < 24) {
        await sleep(5000);
        attempts++;
        
        const nowLoggedIn = await page.evaluate(() => {
          return !!document.querySelector('[data-testid="account-menu"]') && 
                 !document.querySelector('a[href*="/login"]');
        }).catch(() => false);
        
        if (nowLoggedIn) {
          log('Login detected!', 'success');
          break;
        }
        
        if (attempts % 6 === 0) {
          log(`Still waiting for login... (${attempts * 5}s)`, 'info');
        }
      }
      
      if (attempts >= 24) {
        log('Timeout waiting for login', 'error');
        return;
      }
    }
    
    // Load items
    const itemsFile = path.join(__dirname, '..', 'data', 'heb-extension-items.json');
    let items = [];
    try {
      const data = JSON.parse(fs.readFileSync(itemsFile, 'utf8'));
      items = data.items || [];
      log(`Loaded ${items.length} items`, 'success');
    } catch (err) {
      log(`Failed to load items: ${err.message}`, 'error');
      return;
    }
    
    // Add items with extensive logging
    let added = 0;
    let failed = 0;
    
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      log(`\n[${i + 1}/${items.length}] Adding: ${item.name}`, 'info');
      
      try {
        // Navigate to search
        const searchUrl = `https://www.heb.com/search?q=${encodeURIComponent(item.searchTerm || item.name)}`;
        log(`Navigating to: ${searchUrl}`, 'debug');
        
        await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
        log('Page navigated, waiting 3s...', 'debug');
        await sleep(3000);
        
        // Check if page is still valid
        if (page.isClosed()) {
          log('PAGE IS CLOSED after navigation!', 'error');
          failed++;
          continue;
        }
        
        log(`Current URL: ${page.url()}`, 'debug');
        
        // Find add button
        log('Looking for add button...', 'debug');
        const button = await page.locator('button[data-testid*="add-to-cart"]').first();
        
        const buttonCount = await button.count().catch(err => {
          log(`Error counting buttons: ${err.message}`, 'error');
          return 0;
        });
        
        log(`Found ${buttonCount} buttons`, 'debug');
        
        if (buttonCount > 0) {
          log('Clicking button...', 'debug');
          await button.click({ force: true });
          log('Button clicked, waiting 2s...', 'debug');
          await sleep(2000);
          
          // Visual feedback
          await button.evaluate(el => {
            el.style.outline = '4px solid lime';
            setTimeout(() => el.style.outline = '', 2000);
          }).catch(err => {
            log(`Visual feedback failed: ${err.message}`, 'warn');
          });
          
          log('✅ Added!', 'success');
          added++;
        } else {
          log('❌ No button found', 'error');
          failed++;
        }
        
      } catch (err) {
        log(`❌ Error adding item: ${err.message}`, 'error');
        log(`Error stack: ${err.stack}`, 'debug');
        failed++;
      }
    }
    
    log(`\n📊 Results: ${added} added, ${failed} failed`, 'success');
    
  } catch (err) {
    log(`Fatal error: ${err.message}`, 'error');
    log(`Stack: ${err.stack}`, 'debug');
  } finally {
    log('Cleanup started...', 'info');
    
    if (page && !page.isClosed()) {
      log('Page is still open', 'debug');
    } else {
      log('Page is closed', 'warn');
    }
    
    if (browser) {
      log('Disconnecting from browser...', 'info');
      try {
        if (browser.disconnect) {
          await browser.disconnect();
          log('Disconnected successfully', 'success');
        } else {
          log('Browser has no disconnect method', 'warn');
        }
      } catch (e) {
        log(`Disconnect error: ${e.message}`, 'error');
      }
    }
    
    log('Cleanup complete', 'info');
  }
}

// Clear old log
const logFile = path.join(__dirname, '..', 'data', 'heb-debug.log');
fs.writeFileSync(logFile, `HEB Debug Log - ${new Date().toISOString()}\n${'='.repeat(50)}\n\n`);

runWithLogging();
