/**
 * HTTP Client with Retry, Caching, and Rate Limiting
 * Optimized for API calls and web scraping
 * 
 * @module lib/http-client
 */

const https = require('https');
const http = require('http');
const { URL } = require('url');
const { withRetry } = require('./retry-utils');
const { SimpleCache } = require('./performance-utils');

class HTTPClient {
  constructor(options = {}) {
    this.timeout = options.timeout || 30000;
    this.retries = options.retries || 3;
    this.cache = options.cache !== false ? new SimpleCache({
      ttl: options.cacheTtl || 60000,
      maxSize: options.cacheSize || 100
    }) : null;
    
    this.defaultHeaders = {
      'User-Agent': options.userAgent || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.0',
      'Accept': 'application/json, text/html, */*',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'Connection': 'keep-alive',
      ...options.headers
    };
  }

  async request(url, options = {}) {
    const cacheKey = `${url}:${JSON.stringify(options)}`;
    
    // Check cache for GET requests
    if (options.method === 'GET' || !options.method) {
      const cached = this.cache?.get(cacheKey);
      if (cached) return cached;
    }

    const result = await withRetry(
      () => this._makeRequest(url, options),
      {
        maxRetries: options.retries ?? this.retries,
        delay: 1000,
        backoff: 2,
        shouldRetry: (err) => this._shouldRetry(err)
      }
    );

    // Cache successful GET responses
    if ((options.method === 'GET' || !options.method) && this.cache) {
      this.cache.set(cacheKey, result, options.cacheTtl);
    }

    return result;
  }

  _makeRequest(url, options) {
    return new Promise((resolve, reject) => {
      const parsed = new URL(url);
      const client = parsed.protocol === 'https:' ? https : http;
      
      const requestOptions = {
        hostname: parsed.hostname,
        port: parsed.port,
        path: parsed.pathname + parsed.search,
        method: options.method || 'GET',
        headers: { ...this.defaultHeaders, ...options.headers },
        timeout: options.timeout || this.timeout,
        ...options.requestOptions
      };

      const req = client.request(requestOptions, (res) => {
        let data = '';
        
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve({
              status: res.statusCode,
              headers: res.headers,
              body: data,
              json: () => {
                try {
                  return JSON.parse(data);
                } catch {
                  return null;
                }
              }
            });
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${data.slice(0, 200)}`));
          }
        });
      });

      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });

      if (options.body) {
        req.write(options.body);
      }

      req.end();
    });
  }

  _shouldRetry(error) {
    const retryableCodes = ['ECONNRESET', 'ETIMEDOUT', 'ECONNREFUSED', 'ENOTFOUND'];
    const retryableStatuses = [429, 500, 502, 503, 504];
    
    if (retryableCodes.includes(error.code)) return true;
    if (error.message?.includes('timeout')) return true;
    
    const statusMatch = error.message?.match(/HTTP (\d+)/);
    if (statusMatch && retryableStatuses.includes(parseInt(statusMatch[1]))) {
      return true;
    }
    
    return false;
  }

  get(url, options = {}) {
    return this.request(url, { ...options, method: 'GET' });
  }

  post(url, body, options = {}) {
    return this.request(url, {
      ...options,
      method: 'POST',
      body: typeof body === 'string' ? body : JSON.stringify(body),
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    });
  }
}

module.exports = { HTTPClient };
