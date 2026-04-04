/**
 * Fast Selectors - Parallel element finding engine
 * 
 * Instead of trying selectors sequentially, try them in parallel
 * and return the first successful match. Significantly faster for
 * pages with dynamic content.
 */

const { sleep } = require('../utils/retry');

/**
 * Try multiple selectors in parallel, return first match
 * @param {Page} page - Playwright page
 * @param {string[]} selectors - Array of selectors to try
 * @param {Object} options - Options
 * @returns {Promise<ElementHandle|null>}
 */
async function fastSelector(page, selectors, options = {}) {
  const { 
    visible = true, 
    timeout = 5000,
    pollInterval = 50 
  } = options;
  
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    // Try all selectors in parallel
    const results = await Promise.allSettled(
      selectors.map(async (selector) => {
        try {
          const element = await page.$(selector);
          if (!element) return null;
          
          if (visible) {
            const isVisible = await element.isVisible().catch(() => false);
            return isVisible ? { selector, element } : null;
          }
          
          return { selector, element };
        } catch (e) {
          return null;
        }
      })
    );
    
    // Find first successful result
    for (const result of results) {
      if (result.status === 'fulfilled' && result.value) {
        return result.value.element;
      }
    }
    
    // Wait before next poll
    await sleep(pollInterval);
  }
  
  return null;
}

/**
 * Fast selector that returns all matching elements from any selector
 * @param {Page} page - Playwright page
 * @param {string[]} selectors - Array of selectors
 * @param {Object} options - Options
 * @returns {Promise<ElementHandle[]>}
 */
async function fastSelectorAll(page, selectors, options = {}) {
  const { visible = true, timeout = 5000 } = options;
  
  const results = await Promise.allSettled(
    selectors.map(async (selector) => {
      try {
        let elements = await page.$$(selector);
        
        if (visible) {
          elements = await filterVisible(elements);
        }
        
        return elements.length > 0 ? { selector, elements } : null;
      } catch (e) {
        return null;
      }
    })
  );
  
  // Return elements from first successful selector
  for (const result of results) {
    if (result.status === 'fulfilled' && result.value) {
      return result.value.elements;
    }
  }
  
  return [];
}

/**
 * Wait for any of multiple selectors to appear
 * @param {Page} page - Playwright page
 * @param {string[]} selectors - Selectors to wait for
 * @param {Object} options - Options
 * @returns {Promise<{name: string, element: ElementHandle}>}
 */
async function waitForAny(page, conditions, options = {}) {
  const { timeout = 10000, pollInterval = 100 } = options;
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    for (const condition of conditions) {
      try {
        let result;
        
        if (condition.selector) {
          // Selector-based condition
          const element = await page.$(condition.selector);
          if (element) {
            const visible = await element.isVisible().catch(() => false);
            if (visible) {
              result = { name: condition.name, element };
            }
          }
        } else if (condition.fn) {
          // Function-based condition
          const fnResult = await Promise.race([
            condition.fn(page),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('timeout')), 1000)
            )
          ]);
          if (fnResult) {
            result = { name: condition.name, value: fnResult };
          }
        }
        
        if (result) {
          return result;
        }
      } catch (e) {
        // Continue to next condition
      }
    }
    
    await sleep(pollInterval);
  }
  
  throw new Error(`None of the expected conditions were met within ${timeout}ms`);
}

/**
 * Smart click with multiple fallback selectors
 * Uses fastSelector for better performance
 */
async function smartClick(page, selectors, options = {}) {
  const { timeout = 10000, waitForNavigation = false } = options;
  
  const element = await fastSelector(page, selectors, { timeout });
  
  if (!element) {
    throw new Error(`Could not find element with any selector: ${selectors.join(', ')}`);
  }
  
  // Add human-like delay
  await sleep(100 + Math.random() * 200);
  
  if (waitForNavigation) {
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle', timeout }),
      element.click()
    ]);
  } else {
    await element.click();
  }
}

/**
 * Smart type with human-like behavior
 */
async function smartType(page, selector, text, options = {}) {
  const { clearFirst = true, humanize = true, timeout = 5000 } = options;
  
  const element = await fastSelector(page, [selector], { timeout });
  
  if (!element) {
    throw new Error(`Could not find input element: ${selector}`);
  }
  
  if (clearFirst) {
    await element.fill('');
    await sleep(50);
  }
  
  if (humanize) {
    // Type with variable delay between keystrokes
    for (const char of text) {
      await element.type(char, { delay: 20 + Math.random() * 80 });
    }
  } else {
    await element.fill(text);
  }
}

/**
 * Filter elements to only visible ones
 */
async function filterVisible(elements) {
  const visibilityChecks = await Promise.all(
    elements.map(async (el) => {
      try {
        return await el.isVisible();
      } catch (e) {
        return false;
      }
    })
  );
  
  return elements.filter((_, i) => visibilityChecks[i]);
}

/**
 * Find element by text content (case insensitive)
 */
async function findByText(page, text, options = {}) {
  const { 
    tag = '*', 
    exact = false,
    timeout = 5000 
  } = options;
  
  const selector = exact 
    ? `${tag}:has-text("${text}")`
    : `${tag}:text-matches("${text}", "i")`;
  
  return fastSelector(page, [selector], { timeout });
}

/**
 * Wait for element to disappear
 */
async function waitForDisappear(page, selector, options = {}) {
  const { timeout = 10000, pollInterval = 100 } = options;
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    const element = await page.$(selector);
    if (!element) return true;
    
    const visible = await element.isVisible().catch(() => false);
    if (!visible) return true;
    
    await sleep(pollInterval);
  }
  
  return false;
}

module.exports = {
  fastSelector,
  fastSelectorAll,
  waitForAny,
  smartClick,
  smartType,
  findByText,
  waitForDisappear
};
