#!/usr/bin/env node
/*
 * Facebook Marketplace Unified Automation (Edge)
 *
 * Features:
 * - Microsoft Edge (persistent profile)
 * - F-150 listing share to groups
 * - Marketplace message monitoring
 * - Robust retry/error handling
 * - Proxy + anti-detection options
 * - Configurable via config object / env / CLI
 * - Session persistence (no repeated logins)
 * - Comprehensive logging
 *
 * Usage:
 *   node fb-marketplace-unified.js --login
 *   node fb-marketplace-unified.js --monitor
 *   node fb-marketplace-unified.js --share
 *   node fb-marketplace-unified.js --help
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const DEFAULT_CONFIG = {
  mode: 'monitor',
  headless: false,
  dryRun: false,
  edgePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  // Use a dedicated persistent directory to avoid interfering with live Edge
  userDataDir: path.join(process.env.USERPROFILE || 'C:\\Users\\Admin', '.fb-edge-profile'),
  profileDirectory: 'Default',

  proxy: {
    server: process.env.FB_PROXY_SERVER || '',
    username: process.env.FB_PROXY_USER || '',
    password: process.env.FB_PROXY_PASS || ''
  },

  antiDetection: {
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0',
    locale: 'en-US',
    timezoneId: 'America/Chicago',
    viewport: { width: 1920, height: 1080 },
    disableAutomationSignals: true
  },

  credentials: {
    email: process.env.FB_EMAIL || '',
    password: process.env.FB_PASSWORD || ''
  },

  retries: {
    attempts: 3,
    delayMs: 1500,
    backoff: 1.8
  },

  session: {
    loginWaitMs: 120000,
    keepOpenOnShare: true
  },

  monitor: {
    url: 'https://www.facebook.com/marketplace/inbox/',
    maxThreads: 20,
    keywords: ['f-150', 'f150', 'truck', 'thule', 'box', 'cargo', 'rack', 'buy', 'interested', 'available', 'price', 'offer']
  },

  share: {
    // Provide a listing URL if you have it; otherwise the script will open selling page
    listingUrl: process.env.FB_LISTING_URL || '',
    sellingPageUrl: 'https://www.facebook.com/marketplace/you/selling',
    messageTemplate:
      '2018 Ford F-150 STX 2.7L EcoBoost - $26,500 OBO\n\nLocated in Buda, TX. Message me for details!',
    groups: [
      { name: 'HAYS COUNTY LIST & SELL', id: '123456' },
      { name: 'Buda/Kyle Buy, Sell & Rent', id: '789012' },
      { name: 'Ventas De Austin, Buda, Kyle', id: '345678' }
    ],
    delayBetweenGroupsMs: 5000
  },

  logging: {
    level: process.env.FB_LOG_LEVEL || 'info',
    file: path.join(DATA_DIR, 'fb-marketplace-unified.log')
  },

  stateFiles: {
    messageState: path.join(DATA_DIR, 'fb-unified-message-state.json'),
    alerts: path.join(DATA_DIR, 'fb-unified-alerts.json'),
    shareHistory: path.join(DATA_DIR, 'fb-unified-share-results.json')
  }
};

function parseArgs(argv) {
  const args = argv.slice(2);
  const parsed = { mode: null, overrides: {} };

  for (const arg of args) {
    if (['--monitor', '--share', '--login', '--help'].includes(arg)) {
      parsed.mode = arg.replace('--', '');
      continue;
    }
    if (arg === '--headless') parsed.overrides.headless = true;
    if (arg === '--headed') parsed.overrides.headless = false;
    if (arg === '--dry-run') parsed.overrides.dryRun = true;

    if (arg.startsWith('--listing-url=')) {
      parsed.overrides.share = { listingUrl: arg.split('=')[1] };
    }
    if (arg.startsWith('--user-data-dir=')) {
      parsed.overrides.userDataDir = arg.split('=')[1];
    }
    if (arg.startsWith('--profile=')) {
      parsed.overrides.profileDirectory = arg.split('=')[1];
    }
    if (arg.startsWith('--proxy=')) {
      parsed.overrides.proxy = { server: arg.split('=')[1] };
    }
    if (arg.startsWith('--proxy-user=')) {
      parsed.overrides.proxy = { ...(parsed.overrides.proxy || {}), username: arg.split('=')[1] };
    }
    if (arg.startsWith('--proxy-pass=')) {
      parsed.overrides.proxy = { ...(parsed.overrides.proxy || {}), password: arg.split('=')[1] };
    }
    if (arg.startsWith('--log-level=')) {
      parsed.overrides.logging = { level: arg.split('=')[1] };
    }
  }

  return parsed;
}

function deepMerge(base, override) {
  const out = { ...base };
  for (const key of Object.keys(override || {})) {
    if (override[key] && typeof override[key] === 'object' && !Array.isArray(override[key])) {
      out[key] = deepMerge(base[key] || {}, override[key]);
    } else if (override[key] !== undefined) {
      out[key] = override[key];
    }
  }
  return out;
}

function createLogger({ level, file }) {
  const levels = ['debug', 'info', 'warn', 'error'];
  const threshold = levels.indexOf(level);

  function write(line) {
    fs.appendFileSync(file, line + '\n');
  }

  function log(lvl, message, meta) {
    if (levels.indexOf(lvl) < threshold) return;
    const timestamp = new Date().toISOString();
    const metaStr = meta ? ` | ${JSON.stringify(meta)}` : '';
    const line = `[${timestamp}] [${lvl.toUpperCase()}] ${message}${metaStr}`;
    console.log(line);
    write(line);
  }

  return {
    debug: (m, meta) => log('debug', m, meta),
    info: (m, meta) => log('info', m, meta),
    warn: (m, meta) => log('warn', m, meta),
    error: (m, meta) => log('error', m, meta)
  };
}

async function withRetries(task, logger, config, label = 'task') {
  let attempt = 0;
  let delay = config.retries.delayMs;
  while (attempt < config.retries.attempts) {
    try {
      return await task();
    } catch (err) {
      attempt += 1;
      logger.warn(`Retry ${attempt}/${config.retries.attempts} failed for ${label}`, { error: err.message });
      if (attempt >= config.retries.attempts) throw err;
      await new Promise(res => setTimeout(res, delay));
      delay = Math.round(delay * config.retries.backoff);
    }
  }
}

function loadJson(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return fallback;
  }
}

function saveJson(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

async function launchContext(config, logger) {
  if (!fs.existsSync(config.edgePath)) {
    throw new Error(`Edge not found at ${config.edgePath}`);
  }

  const args = [
    '--start-maximized',
    `--profile-directory=${config.profileDirectory}`,
    '--disable-blink-features=AutomationControlled'
  ];

  const launchOptions = {
    headless: config.headless,
    executablePath: config.edgePath,
    args,
    viewport: config.antiDetection.viewport,
    userAgent: config.antiDetection.userAgent,
    locale: config.antiDetection.locale,
    timezoneId: config.antiDetection.timezoneId
  };

  if (config.proxy && config.proxy.server) {
    launchOptions.proxy = {
      server: config.proxy.server,
      username: config.proxy.username || undefined,
      password: config.proxy.password || undefined
    };
  }

  logger.info('Launching Edge persistent context', {
    headless: config.headless,
    userDataDir: config.userDataDir,
    proxy: config.proxy.server ? config.proxy.server : 'none'
  });

  const context = await chromium.launchPersistentContext(config.userDataDir, launchOptions);

  if (config.antiDetection.disableAutomationSignals) {
    await context.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
      Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
      Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
      window.chrome = { runtime: {} };
    });
  }

  const page = context.pages()[0] || (await context.newPage());
  return { context, page };
}

async function isLoggedIn(page) {
  const url = page.url();
  if (url.includes('login') || url.includes('checkpoint')) return false;

  // Heuristic check for login form
  const emailInput = await page.$('input[name="email"], #email').catch(() => null);
  if (emailInput) return false;

  return true;
}

async function ensureLoggedIn(page, config, logger) {
  await withRetries(
    () => page.goto('https://www.facebook.com', { waitUntil: 'domcontentloaded' }),
    logger,
    config,
    'goto-facebook'
  );
  await page.waitForTimeout(3000);

  if (await isLoggedIn(page)) return true;

  logger.warn('Not logged in to Facebook');
  return false;
}

async function loginFlow(page, config, logger) {
  logger.info('Login mode started');
  await page.goto('https://www.facebook.com/login', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);

  if (await isLoggedIn(page)) {
    logger.info('Already logged in; session persisted');
    return true;
  }

  if (config.credentials.email && config.credentials.password) {
    logger.info('Attempting automated login with provided credentials');
    await page.fill('#email', config.credentials.email);
    await page.fill('#pass', config.credentials.password);
    await page.click('button[name="login"], button[type="submit"]');
  } else {
    logger.info('No credentials provided; awaiting manual login');
  }

  const start = Date.now();
  while (Date.now() - start < config.session.loginWaitMs) {
    await page.waitForTimeout(3000);
    if (await isLoggedIn(page)) {
      logger.info('Login detected; session saved');
      return true;
    }
  }

  logger.warn('Login not detected within timeout');
  return false;
}

async function checkMessages(page, config, logger) {
  logger.info('Checking Marketplace messages');

  const state = loadJson(config.stateFiles.messageState, { lastCheck: null, seenMessages: [] });
  const actionable = [];

  await withRetries(
    () => page.goto(config.monitor.url, { waitUntil: 'domcontentloaded' }),
    logger,
    config,
    'goto-inbox'
  );
  await page.waitForTimeout(5000);

  const selectors = [
    'div[role="listitem"]',
    '[data-testid="messenger-list-item"]',
    'div[role="button"][tabindex="0"]'
  ];

  let conversations = [];
  for (const selector of selectors) {
    try {
      conversations = await page.$$(selector);
      if (conversations.length) break;
    } catch {}
  }

  logger.info(`Found ${conversations.length} conversation threads`);

  for (let i = 0; i < Math.min(conversations.length, config.monitor.maxThreads); i++) {
    const conv = conversations[i];
    const text = await conv.textContent().catch(() => '');
    if (!text) continue;

    const lowerText = text.toLowerCase();
    const matched = config.monitor.keywords.filter(k => lowerText.includes(k.toLowerCase()));
    if (!matched.length) continue;

    const lines = text.split('\n').filter(l => l.trim());
    const sender = lines[0]?.trim() || 'Unknown';
    const preview = lines.slice(1, 3).join(' ').trim() || text.slice(0, 120);
    const messageId = `${sender}-${preview.slice(0, 60)}`;

    if (!state.seenMessages.includes(messageId)) {
      state.seenMessages.push(messageId);
      if (state.seenMessages.length > 200) state.seenMessages = state.seenMessages.slice(-200);

      actionable.push({ sender, preview, keywords: matched, id: messageId });
      logger.info('Potential buyer detected', { sender, keywords: matched, preview: preview.slice(0, 120) });
    }
  }

  state.lastCheck = new Date().toISOString();
  saveJson(config.stateFiles.messageState, state);

  if (actionable.length) {
    const alerts = loadJson(config.stateFiles.alerts, { alerts: [] });
    actionable.forEach(msg => alerts.alerts.push({ ...msg, timestamp: new Date().toISOString() }));
    if (alerts.alerts.length > 200) alerts.alerts = alerts.alerts.slice(-200);
    saveJson(config.stateFiles.alerts, alerts);
  }

  return actionable;
}

async function openListing(page, config, logger) {
  if (config.share.listingUrl) {
    logger.info('Opening listing URL', { url: config.share.listingUrl });
    await withRetries(
      () => page.goto(config.share.listingUrl, { waitUntil: 'domcontentloaded' }),
      logger,
      config,
      'goto-listing-url'
    );
    await page.waitForTimeout(4000);
    return true;
  }

  logger.info('Opening selling page to locate listing');
  await withRetries(
    () => page.goto(config.share.sellingPageUrl, { waitUntil: 'domcontentloaded' }),
    logger,
    config,
    'goto-selling-page'
  );
  await page.waitForTimeout(5000);

  const listingLink = await page.$('a[href*="/marketplace/item/"]');
  if (listingLink) {
    await listingLink.click();
    await page.waitForTimeout(4000);
    return true;
  }

  logger.warn('No listing link found on selling page');
  return false;
}

async function openShareDialog(page, logger) {
  const shareSelectors = [
    'div[aria-label="Share"]',
    'div[role="button"][aria-label="Share"]',
    'span:has-text("Share")',
    'button:has-text("Share")'
  ];

  for (const selector of shareSelectors) {
    const btn = await page.$(selector).catch(() => null);
    if (btn) {
      await btn.click();
      await page.waitForTimeout(2000);
      return true;
    }
  }

  logger.warn('Share button not found');
  return false;
}

async function shareToGroup(page, group, config, logger) {
  logger.info(`Sharing to group: ${group.name}`);

  // Open share dialog
  const shareOpened = await openShareDialog(page, logger);
  if (!shareOpened) return false;

  // Click "Share to a group" option if available
  const groupOptionSelectors = [
    'span:has-text("Share to a group")',
    'div[role="menuitem"]:has-text("Group")'
  ];

  for (const selector of groupOptionSelectors) {
    const option = await page.$(selector).catch(() => null);
    if (option) {
      await option.click();
      await page.waitForTimeout(2000);
      break;
    }
  }

  // Search group
  const searchSelectors = [
    'input[placeholder="Search for groups"]',
    'input[aria-label="Search for groups"]'
  ];

  let searchInput = null;
  for (const selector of searchSelectors) {
    searchInput = await page.$(selector).catch(() => null);
    if (searchInput) break;
  }

  if (!searchInput) {
    logger.warn('Group search input not found; share may require manual action');
    return false;
  }

  await searchInput.fill(group.name);
  await page.waitForTimeout(1500);

  const groupResult = await page.$(`span:has-text("${group.name}")`).catch(() => null);
  if (groupResult) await groupResult.click();

  // Add optional message
  const messageBox = await page.$('div[contenteditable="true"]').catch(() => null);
  if (messageBox && config.share.messageTemplate) {
    await messageBox.fill(config.share.messageTemplate);
  }

  // Post
  const postBtn = await page.$('div[role="button"]:has-text("Post"), button:has-text("Post")').catch(() => null);
  if (postBtn) {
    if (!config.dryRun) {
      await postBtn.click();
      await page.waitForTimeout(3000);
    }
    logger.info(`Shared to ${group.name}`);
    return true;
  }

  logger.warn('Post button not found; share may require manual confirmation');
  return false;
}

async function shareListing(page, config, logger) {
  logger.info('Starting F-150 listing share');

  const opened = await openListing(page, config, logger);
  if (!opened) return { shared: 0, total: config.share.groups.length };

  const results = [];
  for (const group of config.share.groups) {
    try {
      const success = await withRetries(
        () => shareToGroup(page, group, config, logger),
        logger,
        config,
        `share-${group.name}`
      );
      results.push({ group: group.name, success });
    } catch (err) {
      results.push({ group: group.name, success: false, error: err.message });
      logger.error(`Failed sharing to ${group.name}`, { error: err.message });
    }

    await page.waitForTimeout(config.share.delayBetweenGroupsMs);
  }

  const summary = {
    timestamp: new Date().toISOString(),
    results
  };
  saveJson(config.stateFiles.shareHistory, summary);

  return {
    shared: results.filter(r => r.success).length,
    total: results.length
  };
}

function printHelp() {
  console.log(`
Facebook Marketplace Unified Automation (Edge)

Usage:
  node fb-marketplace-unified.js --login
  node fb-marketplace-unified.js --monitor
  node fb-marketplace-unified.js --share

Options:
  --headless            Run in headless mode
  --headed              Run with visible browser (default)
  --dry-run             Do not click Post; safe test run
  --listing-url=URL     Use a specific Marketplace listing URL
  --user-data-dir=PATH  Override persistent profile directory
  --profile=NAME        Profile directory name (Default, Profile 1, etc.)
  --proxy=SERVER        Proxy server (e.g., http://host:port)
  --proxy-user=USER     Proxy username
  --proxy-pass=PASS     Proxy password
  --log-level=LEVEL     debug|info|warn|error

Environment Variables:
  FB_EMAIL, FB_PASSWORD, FB_PROXY_SERVER, FB_PROXY_USER, FB_PROXY_PASS, FB_LISTING_URL
`);
}

async function main() {
  const { mode, overrides } = parseArgs(process.argv);
  const config = deepMerge(DEFAULT_CONFIG, overrides);
  if (mode) config.mode = mode;

  const logger = createLogger(config.logging);
  logger.info('FB Marketplace Unified automation starting', { mode: config.mode });

  if (config.mode === 'help') {
    printHelp();
    return;
  }

  if (config.dryRun) {
    logger.warn('Running in DRY-RUN mode (no posting)');
  }

  const { context, page } = await launchContext(config, logger);

  try {
    if (config.mode === 'login') {
      const loggedIn = await loginFlow(page, config, logger);
      logger.info('Login mode complete', { loggedIn });
      return;
    }

    const loggedIn = await ensureLoggedIn(page, config, logger);
    if (!loggedIn) {
      logger.error('Facebook session not logged in. Run with --login to refresh session.');
      return;
    }

    if (config.mode === 'monitor') {
      const actionable = await checkMessages(page, config, logger);
      logger.info('Monitor complete', { actionable: actionable.length });
    } else if (config.mode === 'share') {
      const result = await shareListing(page, config, logger);
      logger.info('Share complete', result);
    } else {
      printHelp();
    }

    if (config.mode === 'share' && config.session.keepOpenOnShare) {
      logger.info('Keeping browser open for manual follow-up');
      await new Promise(() => {});
    }
  } catch (err) {
    logger.error('Fatal error', { error: err.message, stack: err.stack });
  } finally {
    if (config.mode !== 'share' || !config.session.keepOpenOnShare) {
      await context.close().catch(() => null);
    }
  }
}

if (require.main === module) {
  main().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
}

module.exports = {
  DEFAULT_CONFIG,
  parseArgs,
  checkMessages,
  shareListing,
  loginFlow
};
