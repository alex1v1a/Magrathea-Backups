/**
 * Unit Tests - Utility Functions
 * Tests for lib/utils.js
 */

const path = require('path');
const fs = require('fs').promises;

// Load the module under test
const utils = require(path.join(__dirname, '..', '..', 'lib', 'utils'));

describe('Utility Functions', () => {
  describe('Delay & Timing', () => {
    describe('sleep()', () => {
      it('should delay for specified milliseconds', async () => {
        const start = Date.now();
        await utils.sleep(50);
        const elapsed = Date.now() - start;
        expect(elapsed).toBeGreaterThan(45);
        expect(elapsed).toBeLessThan(100);
      });

      it('should handle zero delay', async () => {
        const start = Date.now();
        await utils.sleep(0);
        const elapsed = Date.now() - start;
        expect(elapsed).toBeLessThan(10);
      });
    });

    describe('randomDelay()', () => {
      it('should delay within specified range', async () => {
        const start = Date.now();
        await utils.randomDelay(50, 100);
        const elapsed = Date.now() - start;
        expect(elapsed).toBeGreaterThan(45);
        expect(elapsed).toBeLessThan(150);
      });

      it('should handle equal min and max', async () => {
        const start = Date.now();
        await utils.randomDelay(50, 50);
        const elapsed = Date.now() - start;
        expect(elapsed).toBeGreaterThan(45);
        expect(elapsed).toBeLessThan(100);
      });
    });

    describe('exponentialBackoff()', () => {
      it('should calculate correct delays', () => {
        expect(utils.exponentialBackoff(0, 1000)).toBeGreaterThan(1000);
        expect(utils.exponentialBackoff(1, 1000)).toBeGreaterThan(2000);
        expect(utils.exponentialBackoff(2, 1000)).toBeGreaterThan(4000);
      });

      it('should respect max delay', () => {
        expect(utils.exponentialBackoff(10, 1000, 5000)).toBeLessThan(6000);
      });

      it('should add jitter', () => {
        const delays = [];
        for (let i = 0; i < 10; i++) {
          delays.push(utils.exponentialBackoff(1, 1000));
        }
        // With jitter, delays should vary
        const uniqueDelays = new Set(delays);
        expect(uniqueDelays.size).toBeGreaterThan(1);
      });
    });
  });

  describe('Retry Utilities', () => {
    describe('retryWithBackoff()', () => {
      it('should succeed on first try', async () => {
        let calls = 0;
        const result = await utils.retryWithBackoff(async () => {
          calls++;
          return 'success';
        });
        expect(result).toBe('success');
        expect(calls).toBe(1);
      });

      it('should retry on failure', async () => {
        let calls = 0;
        const result = await utils.retryWithBackoff(async () => {
          calls++;
          if (calls < 3) throw new Error('fail');
          return 'success';
        }, { maxRetries: 3, baseDelay: 10 });
        expect(result).toBe('success');
        expect(calls).toBe(3);
      });

      it('should throw after max retries', async () => {
        let calls = 0;
        try {
          await utils.retryWithBackoff(async () => {
            calls++;
            throw new Error('persistent failure');
          }, { maxRetries: 2, baseDelay: 10 });
          expect(false).toBe(true); // Should not reach here
        } catch (error) {
          expect(error.message).toContain('persistent failure');
          expect(calls).toBe(3); // Initial + 2 retries
        }
      });

      it('should call onRetry callback', async () => {
        let retryCalls = [];
        await utils.retryWithBackoff(async () => {
          if (retryCalls.length < 2) throw new Error('fail');
          return 'success';
        }, {
          maxRetries: 3,
          baseDelay: 10,
          onRetry: (attempt, error, delay) => {
            retryCalls.push({ attempt, error: error.message, delay });
          }
        });
        expect(retryCalls.length).toBe(2);
        expect(retryCalls[0].attempt).toBe(1);
        expect(retryCalls[0].error).toBe('fail');
      });
    });

    describe('retryWithCondition()', () => {
      it('should retry only when condition is met', async () => {
        let calls = 0;
        const result = await utils.retryWithCondition(
          async () => {
            calls++;
            if (calls === 1) {
              const error = new Error('retryable');
              error.code = 'ECONNRESET';
              throw error;
            }
            return 'success';
          },
          (error) => error.code === 'ECONNRESET',
          { maxRetries: 2, baseDelay: 10 }
        );
        expect(result).toBe('success');
        expect(calls).toBe(2);
      });

      it('should not retry when condition is not met', async () => {
        let calls = 0;
        try {
          await utils.retryWithCondition(
            async () => {
              calls++;
              const error = new Error('fatal');
              error.code = 'EINVAL';
              throw error;
            },
            (error) => error.code === 'ECONNRESET',
            { maxRetries: 2, baseDelay: 10 }
          );
          expect(false).toBe(true);
        } catch (error) {
          expect(error.code).toBe('EINVAL');
          expect(calls).toBe(1);
        }
      });
    });
  });

  describe('File Operations', () => {
    const testDir = path.join(__dirname, '..', '.tmp', 'file-tests');
    
    beforeAll(async () => {
      await fs.mkdir(testDir, { recursive: true });
    });

    afterAll(async () => {
      await fs.rm(testDir, { recursive: true, force: true });
    });

    describe('readJson()', () => {
      it('should read valid JSON file', async () => {
        const testFile = path.join(testDir, 'valid.json');
        await fs.writeFile(testFile, '{"key": "value"}');
        
        const result = await utils.readJson(testFile);
        expect(result).toEqual({ key: 'value' });
      });

      it('should return default value for missing file', async () => {
        const result = await utils.readJson(
          path.join(testDir, 'nonexistent.json'),
          { default: true }
        );
        expect(result).toEqual({ default: true });
      });

      it('should throw for invalid JSON', async () => {
        const testFile = path.join(testDir, 'invalid.json');
        await fs.writeFile(testFile, 'not valid json');
        
        try {
          await utils.readJson(testFile);
          expect(false).toBe(true);
        } catch (error) {
          expect(error).toBeDefined();
        }
      });
    });

    describe('writeJson()', () => {
      it('should write JSON atomically', async () => {
        const testFile = path.join(testDir, 'write.json');
        await utils.writeJson(testFile, { test: 'data' });
        
        const content = await fs.readFile(testFile, 'utf8');
        expect(JSON.parse(content)).toEqual({ test: 'data' });
      });

      it('should handle nested objects', async () => {
        const testFile = path.join(testDir, 'nested.json');
        const data = {
          level1: {
            level2: {
              level3: ['a', 'b', 'c']
            }
          }
        };
        await utils.writeJson(testFile, data);
        
        const result = await utils.readJson(testFile);
        expect(result).toEqual(data);
      });
    });

    describe('ensureDir()', () => {
      it('should create directory if not exists', async () => {
        const newDir = path.join(testDir, 'new', 'nested', 'dir');
        await utils.ensureDir(newDir);
        
        const stats = await fs.stat(newDir);
        expect(stats.isDirectory()).toBe(true);
      });

      it('should not throw if directory exists', async () => {
        const existingDir = path.join(testDir, 'existing');
        await fs.mkdir(existingDir);
        
        await utils.ensureDir(existingDir); // Should not throw
        
        const stats = await fs.stat(existingDir);
        expect(stats.isDirectory()).toBe(true);
      });
    });

    describe('fileExists()', () => {
      it('should return true for existing file', async () => {
        const testFile = path.join(testDir, 'exists.txt');
        await fs.writeFile(testFile, 'content');
        
        const exists = await utils.fileExists(testFile);
        expect(exists).toBe(true);
      });

      it('should return false for non-existing file', async () => {
        const exists = await utils.fileExists(
          path.join(testDir, 'nonexistent.txt')
        );
        expect(exists).toBe(false);
      });
    });
  });

  describe('Date/Time Utilities', () => {
    describe('formatDate()', () => {
      it('should format date as YYYY-MM-DD', () => {
        const date = new Date('2026-02-18T15:30:00.000Z');
        expect(utils.formatDate(date)).toBe('2026-02-18');
      });

      it('should use current date by default', () => {
        const result = utils.formatDate();
        expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      });
    });

    describe('formatDateTime()', () => {
      it('should format as ISO string', () => {
        const date = new Date('2026-02-18T15:30:00.000Z');
        expect(utils.formatDateTime(date)).toBe(date.toISOString());
      });
    });

    describe('getRelativeTime()', () => {
      it('should return "just now" for recent time', () => {
        const recent = new Date(Date.now() - 1000);
        expect(utils.getRelativeTime(recent)).toBe('just now');
      });

      it('should return minutes for recent times', () => {
        const minutesAgo = new Date(Date.now() - 5 * 60 * 1000);
        expect(utils.getRelativeTime(minutesAgo)).toContain('minute');
      });

      it('should return hours for longer times', () => {
        const hoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
        expect(utils.getRelativeTime(hoursAgo)).toContain('hour');
      });

      it('should return days for old times', () => {
        const daysAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);
        expect(utils.getRelativeTime(daysAgo)).toContain('day');
      });
    });
  });

  describe('Validation Utilities', () => {
    describe('isValidEmail()', () => {
      it('should validate correct emails', () => {
        expect(utils.isValidEmail('test@example.com')).toBe(true);
        expect(utils.isValidEmail('alex@1v1a.com')).toBe(true);
        expect(utils.isValidEmail('user.name@domain.co.uk')).toBe(true);
      });

      it('should reject invalid emails', () => {
        expect(utils.isValidEmail('not-an-email')).toBe(false);
        expect(utils.isValidEmail('@nodomain.com')).toBe(false);
        expect(utils.isValidEmail('missing@domain')).toBe(false);
        expect(utils.isValidEmail('')).toBe(false);
      });
    });

    describe('isValidUrl()', () => {
      it('should validate correct URLs', () => {
        expect(utils.isValidUrl('https://www.heb.com')).toBe(true);
        expect(utils.isValidUrl('http://localhost:3000')).toBe(true);
        expect(utils.isValidUrl('https://example.com/path?query=1')).toBe(true);
      });

      it('should reject invalid URLs', () => {
        expect(utils.isValidUrl('not-a-url')).toBe(false);
        expect(utils.isValidUrl('')).toBe(false);
        expect(utils.isValidUrl('http://')).toBe(false);
      });
    });

    describe('sanitizeFilename()', () => {
      it('should replace special characters with underscore', () => {
        expect(utils.sanitizeFilename('file@name.txt')).toBe('file_name_txt');
        expect(utils.sanitizeFilename('hello world')).toBe('hello_world');
      });

      it('should convert to lowercase', () => {
        expect(utils.sanitizeFilename('UPPERCASE')).toBe('uppercase');
      });

      it('should handle empty string', () => {
        expect(utils.sanitizeFilename('')).toBe('');
      });
    });
  });
});
