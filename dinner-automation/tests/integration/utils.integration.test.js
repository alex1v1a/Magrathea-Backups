import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { RetryWrapper, CircuitBreaker } from '../../utils/retry-wrapper.js';
import { CacheManager } from '../../utils/cache-manager.js';
import { MetricsCollector } from '../../utils/metrics-collector.js';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

describe('Retry Wrapper Integration', () => {
  it('should retry on failure then succeed', async () => {
    let attempts = 0;
    const wrapper = new RetryWrapper({ 
      maxRetries: 2, 
      delay: 10,
      jitter: false 
    });

    const flakyFn = async () => {
      attempts++;
      if (attempts < 3) throw new Error('Temporary failure');
      return 'success';
    };

    const wrapped = wrapper.wrap(flakyFn);
    const result = await wrapped();

    expect(result).toBe('success');
    expect(attempts).toBe(3);
  });

  it('should use circuit breaker after threshold', async () => {
    const cb = new CircuitBreaker({ 
      failureThreshold: 2, 
      resetTimeout: 100 
    });

    // Record failures
    cb.recordFailure();
    cb.recordFailure();

    expect(cb.getState().state).toBe('OPEN');
    expect(cb.canExecute()).toBe(false);

    // Wait for reset
    await new Promise(r => setTimeout(r, 150));
    expect(cb.canExecute()).toBe(true);
  });

  it('should classify retryable vs fatal errors', async () => {
    const wrapper = new RetryWrapper({ maxRetries: 1, delay: 10 });
    wrapper.registerErrorType('fatal_error', false);

    let attempts = 0;
    const fatalFn = async () => {
      attempts++;
      const err = new Error('fatal_error');
      err.message = 'this is a fatal_error';
      throw err;
    };

    const wrapped = wrapper.wrap(fatalFn);
    await expect(wrapped()).rejects.toThrow();
    expect(attempts).toBe(1); // Should not retry
  });
});

describe('Cache Manager Integration', () => {
  let cache;
  let tempDir;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'cache-test-'));
    cache = new CacheManager({ 
      cacheDir: tempDir,
      defaultTTL: 1000 
    });
  });

  afterEach(async () => {
    await cache.clear();
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('should store and retrieve values', async () => {
    await cache.set('key1', { data: 'value1' });
    const retrieved = await cache.get('key1');
    
    expect(retrieved).toEqual({ data: 'value1' });
  });

  it('should expire values after TTL', async () => {
    await cache.set('key1', 'value', { ttl: 50 });
    
    expect(await cache.get('key1')).toBe('value');
    
    await new Promise(r => setTimeout(r, 100));
    
    expect(await cache.get('key1')).toBeUndefined();
  });

  it('should use getOrCompute pattern', async () => {
    let computeCount = 0;
    const factory = async () => {
      computeCount++;
      return `computed-${computeCount}`;
    };

    const r1 = await cache.getOrCompute('computed', factory);
    const r2 = await cache.getOrCompute('computed', factory);

    expect(r1).toBe('computed-1');
    expect(r2).toBe('computed-1'); // Should use cache
    expect(computeCount).toBe(1);
  });

  it('should track cache statistics', async () => {
    await cache.set('key1', 'value1');
    
    await cache.get('key1'); // hit
    await cache.get('key1'); // hit
    await cache.get('key2'); // miss

    const stats = cache.getStats();
    expect(stats.hits).toBe(2);
    expect(stats.misses).toBe(1);
    expect(parseFloat(stats.hitRate)).toBeGreaterThan(65);
  });

  it('should support namespaced caches', async () => {
    const ns1 = cache.namespace('namespace1');
    const ns2 = cache.namespace('namespace2');

    await ns1.set('key', 'value1');
    await ns2.set('key', 'value2');

    expect(await ns1.get('key')).toBe('value1');
    expect(await ns2.get('key')).toBe('value2');
  });
});

describe('Metrics Collector Integration', () => {
  let collector;
  let tempDir;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'metrics-test-'));
    collector = new MetricsCollector({ outputDir: tempDir });
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('should collect timing metrics', async () => {
    const timer = collector.startTimer('operation');
    await new Promise(r => setTimeout(r, 50));
    timer.end();

    const summary = collector.getSummary();
    expect(summary.metrics.operation.type).toBe('timing');
    expect(summary.metrics.operation.count).toBe(1);
    expect(parseFloat(summary.metrics.operation.avg)).toBeGreaterThan(40);
  });

  it('should track counters', () => {
    collector.increment('requests');
    collector.increment('requests', 5);
    collector.increment('errors');

    const summary = collector.getSummary();
    expect(summary.metrics.requests.value).toBe(6);
    expect(summary.metrics.errors.value).toBe(1);
  });

  it('should track gauges', () => {
    collector.gauge('active_connections', 5);
    collector.gauge('active_connections', 3);

    const summary = collector.getSummary();
    expect(summary.metrics.active_connections.value).toBe(3);
  });

  it('should calculate percentiles', () => {
    for (let i = 1; i <= 100; i++) {
      collector.histogram('response_time', i);
    }

    const summary = collector.getSummary();
    const h = summary.histograms.response_time;
    expect(h.p50).toBe(50);
    expect(h.p90).toBe(90);
    expect(h.p99).toBe(99);
  });

  it('should save metrics to JSON', async () => {
    collector.increment('test_metric');
    
    const filepath = await collector.save('json');
    expect(filepath).toContain('.json');
    
    const content = await fs.readFile(filepath, 'utf8');
    const data = JSON.parse(content);
    expect(data.metrics.test_metric.value).toBe(1);
  });

  it('should save metrics to CSV', async () => {
    collector.startTimer('op').end();
    collector.increment('counter', 5);

    const filepath = await collector.save('csv');
    expect(filepath).toContain('.csv');
    
    const content = await fs.readFile(filepath, 'utf8');
    expect(content).toContain('metric_type');
    expect(content).toContain('counter');
  });
});
