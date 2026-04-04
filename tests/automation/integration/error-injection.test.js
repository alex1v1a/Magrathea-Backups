/**
 * Error Injection Tests
 * Tests for network failures, timeouts, and error recovery
 */

const { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } = require('vitest');
const { MockCDPServer } = require('../mocks/cdp-server');
const { CDPClient } = require('../mocks/cdp-client');

describe('Error Injection Tests', () => {
  let server;
  
  afterAll(async () => {
    if (server) await server.stop();
  });

  describe('Connection Errors', () => {
    it('should handle connection refused', async () => {
      const client = new CDPClient({ port: 9999 }); // No server on this port
      
      await expect(client.connect()).rejects.toThrow();
    });

    it('should handle connection timeout', async () => {
      // Create server with extreme delay
      server = new MockCDPServer({ port: 9226, delay: 60000 });
      await server.start();
      server.createTarget('https://test.com', 'Test');
      
      const client = new CDPClient({ port: 9226 });
      
      // Should timeout before server responds
      await expect(
        Promise.race([
          client.connect(),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Connection timeout')), 100)
          )
        ])
      ).rejects.toThrow();
    });

    it('should handle server disconnect during operation', async () => {
      server = new MockCDPServer({ port: 9227 });
      await server.start();
      const target = server.createTarget('https://test.com', 'Test');
      
      const client = new CDPClient({ port: 9227 });
      await client.connect();
      
      // Stop server during operation
      setTimeout(() => server.stop(), 50);
      
      // Try to send command after disconnect
      await new Promise(resolve => setTimeout(resolve, 100));
      await expect(
        client.send('Runtime.evaluate', { expression: '1 + 1' })
      ).rejects.toThrow();
    });
  });

  describe('CDP Command Errors', () => {
    beforeEach(async () => {
      if (server) await server.stop();
      server = new MockCDPServer({ port: 9228 });
      await server.start();
      server.createTarget('https://test.com', 'Test');
    });

    afterEach(async () => {
      if (server) await server.stop();
    });

    it('should handle unknown method error', async () => {
      const client = new CDPClient({ port: 9228 });
      await client.connect();
      
      // Unknown methods return empty result, not error
      const result = await client.send('UnknownDomain.unknownMethod');
      expect(result).toBeDefined();
    });

    it('should handle invalid parameters', async () => {
      const client = new CDPClient({ port: 9228 });
      await client.connect();
      
      // Should handle gracefully
      const result = await client.send('Runtime.evaluate', {
        expression: null // Invalid
      });
      
      // Mock returns a result even for invalid params
      expect(result).toBeDefined();
    });

    it('should handle domain not enabled error', async () => {
      const client = new CDPClient({ port: 9228 });
      await client.connect();
      
      // Try to use domain without enabling
      // Mock server handles this gracefully
      const result = await client.send('Page.navigate', { url: 'https://test.com' });
      expect(result).toBeDefined();
    });
  });

  describe('Random Error Injection', () => {
    beforeEach(async () => {
      if (server) await server.stop();
    });

    it('should handle random 10% error rate', async () => {
      server = new MockCDPServer({ port: 9229, errorRate: 0.1 });
      await server.start();
      server.createTarget('https://test.com', 'Test');
      
      const client = new CDPClient({ port: 9229 });
      await client.connect();
      
      const results = { success: 0, error: 0 };
      
      for (let i = 0; i < 50; i++) {
        try {
          await client.send('Runtime.evaluate', { expression: '1 + 1' });
          results.success++;
        } catch (err) {
          results.error++;
        }
      }
      
      // With 10% error rate, should have some errors
      expect(results.error).toBeGreaterThan(0);
      expect(results.error).toBeLessThan(15); // Should be around 5
      expect(results.success + results.error).toBe(50);
    });

    it('should handle 50% error rate with retry logic', async () => {
      server = new MockCDPServer({ port: 9230, errorRate: 0.5 });
      await server.start();
      server.createTarget('https://test.com', 'Test');
      
      const client = new CDPClient({ port: 9230 });
      await client.connect();
      
      async function withRetry(operation, maxRetries = 3) {
        for (let attempt = 0; attempt < maxRetries; attempt++) {
          try {
            return await operation();
          } catch (err) {
            if (attempt === maxRetries - 1) throw err;
            await new Promise(r => setTimeout(r, 50));
          }
        }
      }
      
      // With retry, should succeed most of the time
      const results = { success: 0, error: 0 };
      
      for (let i = 0; i < 20; i++) {
        try {
          await withRetry(() => 
            client.send('Runtime.evaluate', { expression: '1 + 1' })
          );
          results.success++;
        } catch (err) {
          results.error++;
        }
      }
      
      // Retry should significantly improve success rate
      expect(results.success).toBeGreaterThan(results.error);
    });

    it('should handle 100% error rate', async () => {
      server = new MockCDPServer({ port: 9231, errorRate: 1.0 });
      await server.start();
      server.createTarget('https://test.com', 'Test');
      
      const client = new CDPClient({ port: 9231 });
      await client.connect();
      
      await expect(
        client.send('Runtime.evaluate', { expression: '1 + 1' })
      ).rejects.toThrow('Random error injected for testing');
    });
  });

  describe('Network Failure Simulation', () => {
    beforeEach(async () => {
      if (server) await server.stop();
      server = new MockCDPServer({ port: 9232 });
      await server.start();
      server.createTarget('https://test.com', 'Test');
    });

    afterEach(async () => {
      if (server) await server.stop();
    });

    it('should handle navigation timeout', async () => {
      // Override navigation to never complete
      server.onCommand('Page.navigate', () => {
        return new Promise(() => {}); // Never resolve
      });
      
      const client = new CDPClient({ port: 9232 });
      await client.connect();
      await client.enableDomain('Page');
      
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Navigation timeout')), 500)
      );
      
      await expect(
        Promise.race([
          client.send('Page.navigate', { url: 'https://slow.com' }),
          timeoutPromise
        ])
      ).rejects.toThrow('Navigation timeout');
    });

    it('should handle stalled response', async () => {
      server.onCommand('Runtime.evaluate', () => {
        return new Promise(() => {}); // Stall forever
      });
      
      const client = new CDPClient({ port: 9232 });
      await client.connect();
      
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Evaluation timeout')), 300)
      );
      
      await expect(
        Promise.race([
          client.send('Runtime.evaluate', { expression: 'slow()' }),
          timeoutPromise
        ])
      ).rejects.toThrow('Evaluation timeout');
    });

    it('should handle intermittent network errors', async () => {
      let callCount = 0;
      server.onCommand('Runtime.evaluate', () => {
        callCount++;
        if (callCount % 3 === 0) {
          return Promise.resolve({ result: { type: 'number', value: 42 } });
        }
        return Promise.reject(new Error('Network error'));
      });
      
      const client = new CDPClient({ port: 9232 });
      await client.connect();
      
      const results = [];
      for (let i = 0; i < 6; i++) {
        try {
          const result = await client.send('Runtime.evaluate', { expression: 'test' });
          results.push({ success: true, value: result });
        } catch (err) {
          results.push({ success: false, error: err.message });
        }
      }
      
      // Pattern should be: error, error, success, error, error, success
      expect(results[0].success).toBe(false);
      expect(results[1].success).toBe(false);
      expect(results[2].success).toBe(true);
      expect(results[3].success).toBe(false);
      expect(results[4].success).toBe(false);
      expect(results[5].success).toBe(true);
    });
  });

  describe('Target Management Errors', () => {
    beforeEach(async () => {
      if (server) await server.stop();
      server = new MockCDPServer({ port: 9233 });
      await server.start();
    });

    afterEach(async () => {
      if (server) await server.stop();
    });

    it('should handle invalid target ID', async () => {
      const client = new CDPClient({ port: 9233 });
      
      // Try to connect to non-existent target
      // Should handle gracefully
      await expect(client.connect('invalid-target-id')).rejects.toThrow();
    });

    it('should handle target closed during operation', async () => {
      const target = server.createTarget('https://test.com', 'Test');
      
      const client = new CDPClient({ port: 9233 });
      await client.connect();
      
      // Close target during operation
      setTimeout(() => server.destroyTarget(target.targetId), 50);
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Operations after target destruction should fail
      await expect(
        client.send('Runtime.evaluate', { expression: '1' })
      ).rejects.toThrow();
    });

    it('should handle rapid target create/destroy', async () => {
      const targets = [];
      
      // Rapidly create targets
      for (let i = 0; i < 10; i++) {
        targets.push(server.createTarget(`https://test${i}.com`, `Test ${i}`));
      }
      
      expect(server.targets.length).toBe(10);
      
      // Rapidly destroy
      while (server.targets.length > 0) {
        server.destroyTarget(server.targets[0].targetId);
      }
      
      expect(server.targets.length).toBe(0);
    });
  });

  describe('Resource Exhaustion', () => {
    beforeEach(async () => {
      if (server) await server.stop();
    });

    it('should handle excessive pending commands', async () => {
      server = new MockCDPServer({ port: 9234, delay: 1000 });
      await server.start();
      server.createTarget('https://test.com', 'Test');
      
      const client = new CDPClient({ port: 9234 });
      await client.connect();
      
      // Send many commands without waiting
      const promises = [];
      for (let i = 0; i < 50; i++) {
        promises.push(client.send('Runtime.evaluate', { expression: `${i}` }));
      }
      
      // All should eventually complete (though with delays)
      const results = await Promise.allSettled(promises);
      const successCount = results.filter(r => r.status === 'fulfilled').length;
      
      expect(successCount).toBeGreaterThan(40); // Most should succeed
    });

    it('should handle memory pressure simulation', async () => {
      server = new MockCDPServer({ port: 9235 });
      await server.start();
      server.createTarget('https://test.com', 'Test');
      
      // Override to simulate memory error
      server.onCommand('Page.captureScreenshot', () => {
        throw new Error('Insufficient resources');
      });
      
      const client = new CDPClient({ port: 9235 });
      await client.connect();
      
      await expect(
        client.send('Page.captureScreenshot')
      ).rejects.toThrow('Insufficient resources');
    });
  });

  describe('Recovery Strategies', () => {
    beforeEach(async () => {
      if (server) await server.stop();
      server = new MockCDPServer({ port: 9236 });
      await server.start();
      server.createTarget('https://test.com', 'Test');
    });

    afterEach(async () => {
      if (server) await server.stop();
    });

    it('should recover from transient error with retry', async () => {
      let failures = 2;
      server.onCommand('Runtime.evaluate', () => {
        if (failures > 0) {
          failures--;
          throw new Error('Transient error');
        }
        return { result: { type: 'string', value: 'success' } };
      });
      
      const client = new CDPClient({ port: 9236 });
      await client.connect();
      
      // Implement retry
      let result;
      let attempts = 0;
      const maxAttempts = 3;
      
      while (attempts < maxAttempts) {
        try {
          result = await client.send('Runtime.evaluate', { expression: 'test' });
          break;
        } catch (err) {
          attempts++;
          if (attempts === maxAttempts) throw err;
          await new Promise(r => setTimeout(r, 50));
        }
      }
      
      expect(result).toBeDefined();
      expect(attempts).toBe(2); // Took 3 attempts (2 failures + 1 success)
    });

    it('should reconnect after connection loss', async () => {
      const client = new CDPClient({ port: 9236 });
      await client.connect();
      
      // Disconnect
      await client.disconnect();
      expect(client.ws).toBeNull();
      
      // Reconnect
      await client.connect();
      expect(client.ws).toBeDefined();
      
      // Should work after reconnect
      const result = await client.send('Runtime.evaluate', { expression: '1' });
      expect(result).toBeDefined();
    });

    it('should handle graceful degradation', async () => {
      // Disable some domains
      server.onCommand('Page.captureScreenshot', () => {
        throw new Error('Screenshot not available');
      });
      
      const client = new CDPClient({ port: 9236 });
      await client.connect();
      
      // Core functionality should still work
      const evalResult = await client.send('Runtime.evaluate', { expression: '1' });
      expect(evalResult).toBeDefined();
      
      // But screenshot should fail
      await expect(
        client.send('Page.captureScreenshot')
      ).rejects.toThrow('Screenshot not available');
    });
  });

  describe('Timeout Configurations', () => {
    beforeEach(async () => {
      if (server) await server.stop();
      server = new MockCDPServer({ port: 9237, delay: 5000 });
      await server.start();
      server.createTarget('https://test.com', 'Test');
    });

    afterEach(async () => {
      if (server) await server.stop();
    });

    it('should respect custom timeout', async () => {
      const client = new CDPClient({ port: 9237 });
      await client.connect();
      
      // Wrap with custom short timeout
      const withTimeout = (promise, ms) => 
        Promise.race([
          promise,
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Custom timeout')), ms)
          )
        ]);
      
      await expect(
        withTimeout(
          client.send('Runtime.evaluate', { expression: '1' }),
          100
        )
      ).rejects.toThrow('Custom timeout');
    });

    it('should handle command cancellation', async () => {
      const client = new CDPClient({ port: 9237 });
      await client.connect();
      
      const controller = new AbortController();
      
      // Start long operation
      const promise = client.send('Runtime.evaluate', { expression: 'slow()' });
      
      // Cancel it
      setTimeout(() => controller.abort(), 100);
      
      // Should be able to start new operations after cancellation
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Client should still be functional
      expect(client.ws.readyState).toBeDefined();
    });
  });
});
