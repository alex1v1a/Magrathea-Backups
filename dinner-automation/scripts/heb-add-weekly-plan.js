const { chromium } = require('playwright');
const fs = require('fs').promises;
const path = require('path');

const randomDelay = (min, max) => {
  const delay = Math.floor(Math.random() * (max - min + 1)) + min;
  return new Promise(r => setTimeout(r, delay));
};

async function loadWeeklyPlanItems() {
  const planPath = path.join(__dirname, '..', 'data', 'weekly-plan.json');
  const raw = await fs.readFile(planPath, 'utf8');
  const data = JSON.parse(raw);
  const items = [];
  for (const meal of data.meals || []) {
    for (const ing of meal.ingredients || []) {
      if (!ing || !ing.hebSearch) continue;
      items.push({
        name: ing.name,
        searchTerm: ing.hebSearch,
      });
    }
  }
  return items;
}

// FIX: Updated to use localStorage
async function getCartCount(page) {
  try {
    const storageCount = await page.evaluate(() => {
      try {
        const raw = localStorage.getItem('PurchaseCart');
        if (!raw) return 0;
        const cartData = JSON.parse(raw);
        if (cartData.ProductNames) {
          const items = cartData.ProductNames.split('<SEP>').filter(n => n.trim());
          return items.length;
        }
        if (cartData.Products && Array.isArray(cartData.Products)) {
          return cartData.Products.length;
        }
        return 0;
      } catch (e) {
        return 0;
      }
    });
    if (storageCount > 0) return storageCount;

    const count = await page.evaluate(() => {
      const cartLink = document.querySelector('a[data-testid="cart-link"], a[href*="/cart"]');
      if (cartLink) {
        const ariaLabel = cartLink.getAttribute('aria-label');
        if (ariaLabel) {
          const match = ariaLabel.match(/(\d+)\s+items?\s+in\s+your\s+cart/i);
          if (match) return parseInt(match[1]);
        }
      }
      const badgeSelectors = [
        '[data-testid="cart-badge"]',
        '[data-testid="cart-count"]',
        '[class*="cartBadge"]',
        '[class*="badge"]',
        '.CartLink_cartBadge',
        '.Badge_badge'
      ];
      for (const selector of badgeSelectors) {
        const badge = document.querySelector(selector);
        if (badge) {
          const text = badge.textContent?.trim();
          const num = parseInt(text);
          if (!isNaN(num)) return num;
        }
      }
      const cartLinks = document.querySelectorAll('a[href*="/cart"]');
      for (const link of cartLinks) {
        const text = link.textContent?.trim();
        if (/^\d+$/.test(text)) return parseInt(text);
      }
      return 0;
    });
    return count;
  } catch (e) {
    return -1;
  }
}

async function findAddToCartButton(page) {
  console.log('    🔍 Looking for add button...');
  try {
    await page.waitForFunction(() => {
      const skeletons = document.querySelectorAll('[data-testid*="skeleton"], [class*="skeleton"]');
      return skeletons.length === 0;
    }, { timeout: 8000 });
  } catch (e) {}

  const selectors = [
    'button[data-testid*="add-to-cart" i]',
    'button[data-qe-id="addToCart"]',
    'button[data-automation-id*="add" i]',
    'button[aria-label*="add to cart" i]'
  ];

  for (const selector of selectors) {
    const btns = await page.locator(selector).all();
    for (const btn of btns) {
      const isVisible = await btn.isVisible().catch(() => false);
      const isEnabled = await btn.isEnabled().catch(() => false);
      const isDisabled = await btn.evaluate(el => el.disabled || el.getAttribute('aria-disabled') === 'true').catch(() => true);
      if (isVisible && isEnabled && !isDisabled) {
        console.log(`    (found button with: ${selector})`);
        return btn;
      }
    }
  }

  const allBtns = await page.locator('button').all();
  for (const btn of allBtns) {
    const text = await btn.textContent().catch(() => '');
    const isVisible = await btn.isVisible().catch(() => false);
    const isDisabled = await btn.evaluate(el => el.disabled || el.getAttribute('aria-disabled') === 'true').catch(() => true);
    if (text.toLowerCase().includes('add to cart') && isVisible && !isDisabled) {
      console.log(`    (found button by text: "${text.trim()}")`);
      return btn;
    }
  }
  return null;
}

async function clickWithRetry(button, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await button.scrollIntoViewIfNeeded({ timeout: 5000 });
      await randomDelay(800, 1500);
      const isDisabled = await button.evaluate(el => el.disabled || el.getAttribute('aria-disabled') === 'true').catch(() => true);
      if (isDisabled) {
        console.log(`    ⏳ Button disabled on attempt ${attempt}, waiting...`);
        await randomDelay(2000, 3000);
        continue;
      }
      const clickDelay = Math.floor(Math.random() * 300) + 100;
      await button.click({ delay: clickDelay });
      return { success: true };
    } catch (err) {
      console.log(`    ⚠️  Click attempt ${attempt} failed: ${err.message}`);
      if (attempt < maxRetries) await randomDelay(2000, 3000);
    }
  }
  return { success: false, error: 'All attempts failed' };
}

function buildFallbackTerms(item) {
  const terms = [];
  if (item.searchTerm) terms.push(item.searchTerm);
  const base = item.searchTerm || item.name;
  if (base && !/\bH-E-B\b/i.test(base)) {
    terms.push(`H-E-B ${base}`);
  }
  if (item.name && !/\bH-E-B\b/i.test(item.name)) {
    terms.push(`H-E-B ${item.name}`);
  }
  // H-E-B Organics fallback
  if (item.name) terms.push(`H-E-B Organics ${item.name}`);
  // de-dup
  return Array.from(new Set(terms.map(t => t.trim()).filter(Boolean)));
}

async function addWeeklyPlanItems() {
  console.log('═══════════════════════════════════════════════');
  console.log('🛒  HEB Cart - Add Weekly Plan Items');
  console.log('═══════════════════════════════════════════════\n');

  const items = await loadWeeklyPlanItems();
  if (!items.length) {
    console.log('❌ No items found in weekly plan');
    process.exit(1);
  }

  console.log(`📋 Weekly plan items: ${items.length}`);

  console.log('🔌 Connecting to Microsoft Edge...');
  let browser;
  try {
    browser = await chromium.connectOverCDP('http://localhost:9222');
    console.log('✅ Connected to Edge\n');
  } catch (e) {
    console.log('❌ Could not connect to Microsoft Edge on port 9222');
    process.exit(1);
  }

  const context = browser.contexts()[0];
  let page = context.pages().find(p => p.url().includes('heb.com'));
  if (!page) {
    page = await context.newPage();
    await page.goto('https://www.heb.com', { waitUntil: 'networkidle' });
  }

  const currentCart = await getCartCount(page);
  console.log(`🛒 Current cart: ${currentCart} items\n`);

  const targetTotal = 42;
  if (currentCart >= targetTotal) {
    console.log('✅ Cart already at target.');
    await browser.close();
    return;
  }

  let addedCount = 0;
  const results = { added: [], failed: [] };

  for (let i = 0; i < items.length; i++) {
    const item = items[i];

    const cartBefore = await getCartCount(page);
    if (cartBefore >= targetTotal) break;

    console.log(`[${cartBefore + 1}/${targetTotal}] ${item.name} (${item.searchTerm})...`);
    console.log(`    📊 Cart before: ${cartBefore}`);

    let success = false;
    const terms = buildFallbackTerms(item);

    for (let t = 0; t < terms.length; t++) {
      const term = terms[t];
      try {
        await page.goto(`https://www.heb.com/search?q=${encodeURIComponent(term)}`, {
          waitUntil: 'domcontentloaded'
        });
        await randomDelay(6000, 9000);

        const btn = await findAddToCartButton(page);
        if (!btn) {
          console.log(`    ❌ No add button for term: ${term}`);
          continue;
        }

        const clickResult = await clickWithRetry(btn);
        if (!clickResult.success) {
          console.log(`    ❌ Click failed for term: ${term}`);
          continue;
        }

        // Verify cart increased
        let verified = false;
        for (let retry = 1; retry <= 5; retry++) {
          await randomDelay(4000, 6000);
          const countAfter = await getCartCount(page);
          console.log(`    📊 Check ${retry}/5: Cart = ${countAfter}`);
          if (countAfter > cartBefore) {
            console.log(`    ✅✅ VERIFIED: Cart ${cartBefore} → ${countAfter}`);
            results.added.push(item.name);
            addedCount++;
            verified = true;
            success = true;
            break;
          }
        }

        if (verified) break;
        console.log(`    ❌ Cart did not increase for term: ${term}`);
      } catch (err) {
        console.log(`    ❌ Error with term "${term}": ${err.message}`);
      }

      await randomDelay(2000, 3000);
    }

    if (!success) {
      results.failed.push({ name: item.name, error: 'All terms failed' });
    }

    if (addedCount > 0 && addedCount % 5 === 0) {
      const current = await getCartCount(page);
      console.log(`\n📈 PROGRESS: ${addedCount} items added this session`);
      console.log(`🛒 CART TOTAL: ${current} items\n`);
    }

    await randomDelay(5000, 8000);
  }

  const finalCart = await getCartCount(page);
  console.log('\n═══════════════════════════════════════════════');
  console.log('📊 FINAL RESULTS');
  console.log('═══════════════════════════════════════════════');
  console.log(`Added now: ${results.added.length} items`);
  console.log(`Failed: ${results.failed.length} items`);
  console.log(`Final cart: ${finalCart} items`);

  if (results.failed.length > 0) {
    console.log('\n❌ Failed items:');
    results.failed.forEach(f => console.log(`  - ${f.name}: ${f.error}`));
  }

  await browser.close();
  console.log('\n👋 Done!');
}

addWeeklyPlanItems().catch(err => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});
