/**
 * Optimized Facebook Marketplace Automation
 * Uses patterns library for better reliability and performance
 */

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs').promises;
const { getCredentials } = require('../patterns/credentials');
const { withRetry, sleep, batchProcess } = require('../patterns/retry-utils');
const { logger } = require('../patterns/logger');
const { 
  smartSelector, 
  smartClick, 
  smartType,
  checkLoginStatus,
  SessionManager,
  RateLimiter
} = require('../patterns/browser-patterns');

// Configuration
const CONFIG = {
  debugPort: 9224,
  stateFile: path.join(__dirname, 'fb-session-state.json'),
  screenshotDir: path.join(__dirname, 'screenshots'),
  rateLimit: { minDelay: 2000, maxDelay: 5000 },
  maxConversations: 20,
  keywords: [
    'f-150', 'f150', 'truck', 'thule', 'box', 'cargo', 
    'rack', 'buy', 'interested', 'available', 'price', 'offer', 'still', 'have'
  ]
};

// Target groups for sharing
const GROUPS = [
  'HAYS COUNTY LIST & SELL',
  'Buda/Kyle Buy, Sell & Rent',
  'Ventas De Austin, Buda, Kyle'
];

/**
 * Save session state
 */
async function saveSessionState(state) {
  try {
    await fs.writeFile(CONFIG.stateFile, JSON.stringify({
      ...state,
      savedAt: new Date().toISOString()
    }, null, 2));
  } catch (e) {
    logger.warn('Failed to save session state:', e.message);
  }
}

/**
 * Load session state
 */
async function loadSessionState() {
  try {
    const data = await fs.readFile(CONFIG.stateFile, 'utf8');
    return JSON.parse(data);
  } catch {
    return { lastGroupIndex: -1, lastShareTime: null };
  }
}

/**
 * Check if user is logged into Facebook
 */
async function verifyLogin(page) {
  logger.info('Checking Facebook login status...');
  
  await page.goto('https://www.facebook.com', { 
    waitUntil: 'networkidle', 
    timeout: 30000 
  });
  await sleep(2000);
  
  const isLoggedIn = await checkLoginStatus(page, {
    loginIndicators: [
      '[aria-label="Home"]',
      '[data-testid="left_nav_header"]',
      'div[role="navigation"]',
      '[href="/marketplace/"]'
    ],
    logoutIndicators: [
      'input[name="email"]',
      'button[name="login"]',
      '[data-testid="royal_login_button"]'
    ]
  });
  
  if (isLoggedIn) {
    logger.success('Facebook login verified');
  } else {
    logger.error('Not logged in to Facebook');
  }
  
  return isLoggedIn;
}

/**
 * Check Marketplace messages
 */
async function checkMessages(page) {
  logger.section('CHECKING MARKETPLACE MESSAGES');
  
  await page.goto('https://www.facebook.com/marketplace/inbox/', { 
    waitUntil: 'networkidle', 
    timeout: 60000 
  });
  await sleep(3000);
  
  // Take debug screenshot
  const session = new SessionManager();
  session.page = page;
  await session.screenshot('marketplace-inbox');
  
  // Find conversation threads
  const conversationSelectors = [
    '[role="listitem"]',
    '[data-testid="messenger-list-item"]',
    'div[role="button"][tabindex="0"]',
    '[data-pagelet="MWInboxList"] div[role="button"]'
  ];
  
  let conversations = [];
  for (const selector of conversationSelectors) {
    conversations = await page.$$(selector);
    if (conversations.length > 0) {
      logger.info(`Found ${conversations.length} conversations`);
      break;
    }
  }
  
  if (conversations.length === 0) {
    logger.warn('No conversations found');
    return [];
  }
  
  // Process conversations
  const actionableMessages = [];
  const rateLimiter = new RateLimiter(CONFIG.rateLimit);
  
  const processConversation = async (conv, index) => {
    await rateLimiter.wait();
    
    try {
      const text = await conv.textContent().catch(() => '');
      if (!text || text.length < 5) return null;
      
      // Skip UI text
      if (text.includes('Marketplace') && text.length < 50) return null;
      
      const lowerText = text.toLowerCase();
      const matchedKeywords = CONFIG.keywords.filter(kw => lowerText.includes(kw.toLowerCase()));
      
      const lines = text.split('\n').filter(l => l.trim());
      const sender = lines[0]?.trim() || 'Unknown';
      const preview = lines.slice(1, 4).join(' ').trim() || text.slice(0, 150);
      
      return {
        sender,
        preview: preview.slice(0, 200),
        keywords: matchedKeywords,
        hasKeywords: matchedKeywords.length > 0,
        fullText: text.slice(0, 500),
        index
      };
    } catch (e) {
      return null;
    }
  };
  
  // Process in parallel with concurrency limit
  const results = await batchProcess(
    conversations.slice(0, CONFIG.maxConversations),
    processConversation,
    { batchSize: 5, concurrency: 3 }
  );
  
  const validMessages = results
    .filter(r => r.success && r.result)
    .map(r => r.result);
  
  // Log results
  const actionable = validMessages.filter(m => m.hasKeywords);
  
  logger.info(`\n📊 Summary: ${validMessages.length} messages, ${actionable.length} actionable`);
  
  if (actionable.length > 0) {
    logger.section('🎯 ACTIONABLE MESSAGES');
    actionable.forEach(msg => {
      logger.info(`${msg.sender}: "${msg.preview.slice(0, 80)}..."`);
      logger.debug(`   Keywords: ${msg.keywords.join(', ')}`);
    });
  }
  
  return actionable;
}

/**
 * Share listing to a group
 */
async function shareToGroup(page, groupName, listingUrl) {
  logger.info(`Sharing to group: ${groupName}`);
  
  await page.goto(listingUrl, { waitUntil: 'networkidle', timeout: 30000 });
  await sleep(3000);
  
  // Click share button
  await smartClick(page, [
    'text=Share',
    '[aria-label*="Share" i]',
    '[role="button"]:has-text("Share")'
  ]);
  await sleep(2000);
  
  // Click "Share to a group"
  await smartClick(page, [
    'text=Share to a group',
    'text=Group',
    '[role="menuitem"]:has-text("Group")'
  ]);
  await sleep(2000);
  
  // Search for group
  const searchBox = await smartSelector(page, [
    '[placeholder*="Search"]',
    'input[type="text"]',
    '[role="combobox"]'
  ]);
  
  if (searchBox) {
    await searchBox.fill(groupName);
    await sleep(2000);
  }
  
  // Select group
  await page.click(`text=${groupName}`);
  await sleep(2000);
  
  // Click post
  await smartClick(page, [
    'text=Post',
    'button:has-text("Post")',
    '[aria-label*="Post" i]'
  ]);
  
  logger.success(`Successfully shared to ${groupName}`);
  return true;
}

/**
 * Rotate through groups and share
 */
async function shareToNextGroup(page) {
  logger.section('SHARING TO GROUPS');
  
  const state = await loadSessionState();
  const nextIndex = (state.lastGroupIndex + 1) % GROUPS.length;
  const group = GROUPS[nextIndex];
  
  try {
    const listingUrl = getCredentials('facebook', 'marketplace.listingUrl');
    await shareToGroup(page, group, listingUrl);
    
    // Update state
    await saveSessionState({
      lastGroupIndex: nextIndex,
      lastShareTime: new Date().toISOString()
    });
    
    return { success: true, group };
  } catch (error) {
    logger.error(`Failed to share to ${group}:`, error.message);
    return { success: false, group, error: error.message };
  }
}

/**
 * Main automation function
 */
async function runAutomation(options = {}) {
  const { 
    mode = 'monitor',  // 'monitor', 'share', or 'both'
    headless = false 
  } = options;
  
  logger.section('FACEBOOK MARKETPLACE AUTOMATION');
  logger.info(`Mode: ${mode}`);
  
  const session = new SessionManager({ debugPort: CONFIG.debugPort });
  
  try {
    await session.connect();
    const { page } = session;
    
    // Verify login
    const isLoggedIn = await verifyLogin(page);
    if (!isLoggedIn) {
      logger.error('Please login to Facebook first');
      return { success: false, error: 'Not logged in' };
    }
    
    const results = {
      messages: [],
      share: null,
      success: true
    };
    
    // Check messages
    if (mode === 'monitor' || mode === 'both') {
      results.messages = await checkMessages(page);
    }
    
    // Share to group
    if (mode === 'share' || mode === 'both') {
      results.share = await shareToNextGroup(page);
      results.success = results.share.success;
    }
    
    return results;
    
  } catch (error) {
    logger.error('Automation failed:', error.message);
    await session.screenshot('error');
    return { success: false, error: error.message };
  } finally {
    // Don't close if connected to existing Chrome
    if (!session.browser?.isConnected?.()) {
      await session.close();
    }
  }
}

// CLI entry point
if (require.main === module) {
  const args = process.argv.slice(2);
  const mode = args.includes('--share') ? 'share' : 
               args.includes('--both') ? 'both' : 'monitor';
  
  runAutomation({ mode })
    .then(results => {
      if (results.success) {
        logger.success('Automation completed');
        process.exit(0);
      } else {
        logger.failure('Automation failed');
        process.exit(1);
      }
    })
    .catch(error => {
      logger.failure('Fatal error:', error.message);
      process.exit(1);
    });
}

module.exports = { runAutomation, checkMessages, shareToNextGroup };
