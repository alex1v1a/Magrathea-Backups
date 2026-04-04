/**
 * Visual Regression Tests
 * Tests for page state detection using snapshots
 */

const { describe, it, expect, beforeAll, afterAll } = require('vitest');
const { MockCDPServer } = require('../mocks/cdp-server');
const { CDPClient } = require('../mocks/cdp-client');
const {
  hebHomepage,
  hebSearchResults,
  hebCartPage,
  captchaPage,
  errorPage
} = require('../fixtures/page-snapshots');

describe('Visual Regression - Page State Detection', () => {
  let server;
  let client;
  let target;
  
  beforeAll(async () => {
    server = new MockCDPServer({ port: 9250 });
    await server.start();
    target = server.createTarget('https://www.heb.com', 'HEB Test');
  });
  
  afterAll(async () => {
    if (client) await client.disconnect();
    if (server) await server.stop();
  });

  describe('Page Load Detection', () => {
    it('should detect homepage loaded', async () => {
      client = new CDPClient({ port: 9250 });
      await client.connect();
      
      server.setPageContent(hebHomepage);
      
      const result = await client.evaluate(`
        document.querySelector('[data-testid="search-input"]') !== null
      `);
      
      expect(result.value).toBe(true);
    });

    it('should detect search results page', async () => {
      server.setPageContent(hebSearchResults);
      
      const result = await client.evaluate(`
        document.querySelector('.results h2')?.textContent?.includes('Results')
      `);
      
      expect(result.value).toBe(true);
    });

    it('should detect cart page', async () => {
      server.setPageContent(hebCartPage);
      
      const result = await client.evaluate(`
        document.querySelector('.cart-container h2')?.textContent?.includes('Cart')
      `);
      
      expect(result.value).toBe(true);
    });
  });

  describe('Element Visibility Detection', () => {
    beforeEach(async () => {
      if (!client) {
        client = new CDPClient({ port: 9250 });
        await client.connect();
      }
    });

    it('should detect search box visible', async () => {
      server.setPageContent(hebHomepage);
      
      const result = await client.evaluate(`
        (() => {
          const el = document.querySelector('[data-testid="search-input"]');
          if (!el) return false;
          const rect = el.getBoundingClientRect();
          return rect.width > 0 && rect.height > 0;
        })()
      `);
      
      expect(result.value).toBe(true);
    });

    it('should detect add buttons visible', async () => {
      server.setPageContent(hebHomepage);
      
      const result = await client.evaluate(`
        document.querySelectorAll('[data-testid="add-to-cart"]').length
      `);
      
      expect(result.value).toBeGreaterThanOrEqual(3);
    });

    it('should detect out of stock items', async () => {
      server.setPageContent(hebSearchResults);
      
      const result = await client.evaluate(`
        document.querySelector('.out-of-stock') !== null
      `);
      
      expect(result.value).toBe(true);
    });
  });

  describe('State Change Detection', () => {
    beforeEach(async () => {
      if (!client) {
        client = new CDPClient({ port: 9250 });
        await client.connect();
      }
    });

    it('should detect cart count change', async () => {
      server.setPageContent(hebHomepage);
      
      // Get initial count
      const initial = await client.evaluate(`
        document.querySelector('[data-testid="cart-count"]')?.textContent
      `);
      
      // Simulate adding item
      await client.evaluate(`
        document.querySelector('[data-testid="cart-count"]').textContent = '1'
      `);
      
      // Get updated count
      const updated = await client.evaluate(`
        document.querySelector('[data-testid="cart-count"]')?.textContent
      `);
      
      expect(initial.value).toBe('0');
      expect(updated.value).toBe('1');
    });

    it('should detect button state change', async () => {
      server.setPageContent(hebHomepage);
      
      // Change button text
      await client.evaluate(`
        const btn = document.querySelector('[data-testid="add-to-cart"]');
        btn.textContent = 'Added';
        btn.disabled = true;
      `);
      
      const result = await client.evaluate(`
        const btn = document.querySelector('[data-testid="add-to-cart"]');
        return { text: btn.textContent, disabled: btn.disabled }
      `);
      
      expect(result.value.text).toBe('Added');
      expect(result.value.disabled).toBe(true);
    });
  });

  describe('Error State Detection', () => {
    beforeEach(async () => {
      if (!client) {
        client = new CDPClient({ port: 9250 });
        await client.connect();
      }
    });

    it('should detect CAPTCHA page', async () => {
      server.setPageContent(captchaPage);
      
      const result = await client.evaluate(`
        document.querySelector('#captcha') !== null ||
        document.body.textContent.includes('CAPTCHA') ||
        document.body.textContent.includes('Security Check')
      `);
      
      expect(result.value).toBe(true);
    });

    it('should detect error page', async () => {
      server.setPageContent(errorPage);
      
      const result = await client.evaluate(`
        document.querySelector('.error-container') !== null ||
        document.body.textContent.includes('Something went wrong')
      `);
      
      expect(result.value).toBe(true);
    });

    it('should detect loading state', async () => {
      const loadingHtml = `
        <html><body>
          <div class="loading-spinner">Loading...</div>
        </body></html>
      `;
      server.setPageContent(loadingHtml);
      
      const result = await client.evaluate(`
        document.querySelector('.loading-spinner') !== null ||
        document.body.textContent.includes('Loading')
      `);
      
      expect(result.value).toBe(true);
    });
  });

  describe('Layout Change Detection', () => {
    beforeEach(async () => {
      if (!client) {
        client = new CDPClient({ port: 9250 });
        await client.connect();
      }
    });

    it('should detect product grid layout', async () => {
      server.setPageContent(hebHomepage);
      
      const result = await client.evaluate(`
        (() => {
          const grid = document.querySelector('.product-grid');
          if (!grid) return null;
          const cards = grid.querySelectorAll('.product-card');
          return {
            hasGrid: true,
            cardCount: cards.length
          };
        })()
      `);
      
      expect(result.value.hasGrid).toBe(true);
      expect(result.value.cardCount).toBeGreaterThan(0);
    });

    it('should detect list layout', async () => {
      server.setPageContent(hebSearchResults);
      
      const result = await client.evaluate(`
        (() => {
          const list = document.querySelector('.product-list');
          const items = document.querySelectorAll('.product-item');
          return {
            hasList: !!list,
            itemCount: items.length
          };
        })()
      `);
      
      expect(result.value.hasList).toBe(true);
      expect(result.value.itemCount).toBeGreaterThan(0);
    });

    it('should detect responsive layout changes', async () => {
      server.setPageContent(hebHomepage);
      
      // Simulate viewport change
      await client.send('Emulation.setDeviceMetricsOverride', {
        width: 375,
        height: 667,
        deviceScaleFactor: 2,
        mobile: true
      });
      
      const result = await client.evaluate(`
        window.innerWidth < 768
      `);
      
      expect(result.value).toBe(true);
    });
  });

  describe('Screenshot Comparison', () => {
    beforeEach(async () => {
      if (!client) {
        client = new CDPClient({ port: 9250 });
        await client.connect();
        await client.enableDomain('Page');
      }
    });

    it('should capture screenshot for visual comparison', async () => {
      server.setPageContent(hebHomepage);
      
      const screenshot = await client.screenshot();
      
      expect(screenshot).toBeInstanceOf(Buffer);
      expect(screenshot.length).toBeGreaterThan(0);
    });

    it('should capture element screenshot', async () => {
      server.setPageContent(hebHomepage);
      
      // Get element position and capture
      const box = await client.send('DOM.getBoxModel', { nodeId: 1 });
      
      const screenshot = await client.screenshot({
        clip: {
          x: 0,
          y: 0,
          width: 800,
          height: 600
        }
      });
      
      expect(screenshot).toBeInstanceOf(Buffer);
    });

    it('should detect visual changes between snapshots', async () => {
      // First snapshot
      server.setPageContent(hebHomepage);
      const screenshot1 = await client.screenshot();
      
      // Modified page
      server.setPageContent(hebSearchResults);
      const screenshot2 = await client.screenshot();
      
      // Screenshots should be different
      expect(screenshot1.toString('base64')).not.toBe(screenshot2.toString('base64'));
    });
  });

  describe('DOM Mutation Detection', () => {
    beforeEach(async () => {
      if (!client) {
        client = new CDPClient({ port: 9250 });
        await client.connect();
        await client.enableDomain('DOM');
      }
    });

    it('should detect new elements added', async () => {
      server.setPageContent(hebHomepage);
      
      const initialCount = await client.evaluate(`
        document.querySelectorAll('.product-card').length
      `);
      
      // Simulate adding new product
      await client.evaluate(`
        const grid = document.querySelector('.product-grid');
        const newCard = document.createElement('div');
        newCard.className = 'product-card';
        newCard.innerHTML = '<h3>New Product</h3>';
        grid.appendChild(newCard);
      `);
      
      const newCount = await client.evaluate(`
        document.querySelectorAll('.product-card').length
      `);
      
      expect(newCount.value).toBe(initialCount.value + 1);
    });

    it('should detect element removal', async () => {
      server.setPageContent(hebHomepage);
      
      const initialCount = await client.evaluate(`
        document.querySelectorAll('.product-card').length
      `);
      
      // Remove first product
      await client.evaluate(`
        const firstCard = document.querySelector('.product-card');
        if (firstCard) firstCard.remove();
      `);
      
      const newCount = await client.evaluate(`
        document.querySelectorAll('.product-card').length
      `);
      
      expect(newCount.value).toBe(initialCount.value - 1);
    });

    it('should detect attribute changes', async () => {
      server.setPageContent(hebHomepage);
      
      await client.evaluate(`
        const btn = document.querySelector('[data-testid="add-to-cart"]');
        btn.setAttribute('data-state', 'loading');
      `);
      
      const result = await client.evaluate(`
        document.querySelector('[data-testid="add-to-cart"]')?.getAttribute('data-state')
      `);
      
      expect(result.value).toBe('loading');
    });
  });

  describe('Accessibility State Detection', () => {
    beforeEach(async () => {
      if (!client) {
        client = new CDPClient({ port: 9250 });
        await client.connect();
      }
    });

    it('should detect focus state', async () => {
      server.setPageContent(hebHomepage);
      
      await client.evaluate(`
        document.querySelector('[data-testid="search-input"]').focus();
      `);
      
      const result = await client.evaluate(`
        document.activeElement?.getAttribute('data-testid')
      `);
      
      expect(result.value).toBe('search-input');
    });

    it('should detect disabled state', async () => {
      server.setPageContent(hebHomepage);
      
      await client.evaluate(`
        const btn = document.querySelector('[data-testid="add-to-cart"]');
        btn.disabled = true;
      `);
      
      const result = await client.evaluate(`
        document.querySelector('[data-testid="add-to-cart"]')?.disabled
      `);
      
      expect(result.value).toBe(true);
    });

    it('should detect ARIA states', async () => {
      const ariaHtml = `
        <html><body>
          <button aria-expanded="false" aria-controls="menu">Menu</button>
          <div id="menu" hidden>Menu Content</div>
        </body></html>
      `;
      server.setPageContent(ariaHtml);
      
      const result = await client.evaluate(`
        document.querySelector('button')?.getAttribute('aria-expanded')
      `);
      
      expect(result.value).toBe('false');
    });
  });
});

// Helper function for beforeEach
describe = require('vitest').describe;
const beforeEach = require('vitest').beforeEach;
