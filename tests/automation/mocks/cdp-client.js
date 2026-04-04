/**
 * CDP Client
 * Connects to CDP server (real or mock) for browser automation
 */

const WebSocket = require('ws');
const http = require('http');

class CDPClient {
  constructor(options = {}) {
    this.host = options.host || 'localhost';
    this.port = options.port || 9222;
    this.ws = null;
    this.messageId = 0;
    this.pending = new Map();
    this.eventHandlers = new Map();
    this.sessionId = null;
    this.targetId = null;
  }

  /**
   * Connect to CDP server and attach to target
   */
  async connect(targetId = null) {
    // Get available targets
    const targets = await this._getTargets();
    
    if (!targetId && targets.length > 0) {
      targetId = targets[0].id;
    }
    
    if (!targetId) {
      throw new Error('No target available');
    }
    
    this.targetId = targetId;
    
    // Connect to target WebSocket
    const wsUrl = `ws://${this.host}:${this.port}/devtools/page/${targetId}`;
    this.ws = new WebSocket(wsUrl);
    
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Connection timeout'));
      }, 10000);
      
      this.ws.on('open', () => {
        clearTimeout(timeout);
        this._setupMessageHandler();
        resolve(this);
      });
      
      this.ws.on('error', (err) => {
        clearTimeout(timeout);
        reject(err);
      });
    });
  }

  /**
   * Disconnect from CDP server
   */
  async disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.pending.clear();
    this.eventHandlers.clear();
  }

  /**
   * Send CDP command and wait for response
   */
  send(method, params = {}) {
    return new Promise((resolve, reject) => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        reject(new Error('Not connected'));
        return;
      }
      
      const id = ++this.messageId;
      const message = { id, method, params };
      
      if (this.sessionId) {
        message.sessionId = this.sessionId;
      }
      
      const timeout = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`Command timeout: ${method}`));
      }, 30000);
      
      this.pending.set(id, { resolve, reject, timeout });
      this.ws.send(JSON.stringify(message));
    });
  }

  /**
   * Subscribe to CDP events
   */
  on(event, handler) {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event).push(handler);
    
    // Return unsubscribe function
    return () => {
      const handlers = this.eventHandlers.get(event);
      const index = handlers.indexOf(handler);
      if (index !== -1) {
        handlers.splice(index, 1);
      }
    };
  }

  /**
   * Enable a domain
   */
  async enableDomain(domain) {
    return this.send(`${domain}.enable`);
  }

  /**
   * Navigate to URL
   */
  async navigate(url) {
    const result = await this.send('Page.navigate', { url });
    
    // Wait for load event
    return new Promise((resolve) => {
      const unsubscribe = this.on('Page.loadEventFired', () => {
        unsubscribe();
        resolve(result);
      });
    });
  }

  /**
   * Evaluate JavaScript
   */
  async evaluate(expression, options = {}) {
    const result = await this.send('Runtime.evaluate', {
      expression,
      returnByValue: options.returnByValue !== false,
      awaitPromise: options.awaitPromise || false,
      timeout: options.timeout || 5000
    });
    
    if (result.exceptionDetails) {
      throw new Error(`Script error: ${result.exceptionDetails.text}`);
    }
    
    return result.result;
  }

  /**
   * Query selector
   */
  async querySelector(selector, nodeId = null) {
    if (!nodeId) {
      const doc = await this.send('DOM.getDocument');
      nodeId = doc.root.nodeId;
    }
    
    return this.send('DOM.querySelector', { nodeId, selector });
  }

  /**
   * Click element at position
   */
  async click(x, y, options = {}) {
    // Mouse move
    await this.send('Input.dispatchMouseEvent', {
      type: 'mouseMoved',
      x,
      y
    });
    
    // Mouse down
    await this.send('Input.dispatchMouseEvent', {
      type: 'mousePressed',
      x,
      y,
      button: 'left',
      clickCount: options.clickCount || 1
    });
    
    // Small delay
    await this._sleep(options.delay || 50);
    
    // Mouse up
    await this.send('Input.dispatchMouseEvent', {
      type: 'mouseReleased',
      x,
      y,
      button: 'left',
      clickCount: options.clickCount || 1
    });
  }

  /**
   * Type text
   */
  async type(text, options = {}) {
    const delay = options.delay || 10;
    
    for (const char of text) {
      // Key down
      await this.send('Input.dispatchKeyEvent', {
        type: 'keyDown',
        text: char
      });
      
      // Key up
      await this.send('Input.dispatchKeyEvent', {
        type: 'keyUp',
        text: char
      });
      
      if (delay > 0) {
        await this._sleep(delay);
      }
    }
  }

  /**
   * Take screenshot
   */
  async screenshot(options = {}) {
    const result = await this.send('Page.captureScreenshot', {
      format: options.format || 'png',
      quality: options.quality,
      clip: options.clip,
      fromSurface: options.fromSurface !== false,
      captureBeyondViewport: options.captureBeyondViewport || false
    });
    
    return Buffer.from(result.data, 'base64');
  }

  // Private methods

  _getTargets() {
    return new Promise((resolve, reject) => {
      const req = http.get(`http://${this.host}:${this.port}/json/list`, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch (err) {
            reject(err);
          }
        });
      });
      
      req.on('error', reject);
      req.setTimeout(5000, () => {
        req.destroy();
        reject(new Error('Timeout getting targets'));
      });
    });
  }

  _setupMessageHandler() {
    this.ws.on('message', (data) => {
      try {
        const message = JSON.parse(data);
        
        if (message.id !== undefined) {
          // Response to command
          const pending = this.pending.get(message.id);
          if (pending) {
            clearTimeout(pending.timeout);
            this.pending.delete(message.id);
            
            if (message.error) {
              pending.reject(new Error(message.error.message));
            } else {
              pending.resolve(message.result);
            }
          }
        } else if (message.method) {
          // Event
          const handlers = this.eventHandlers.get(message.method) || [];
          handlers.forEach(handler => {
            try {
              handler(message.params);
            } catch (err) {
              console.error('Event handler error:', err);
            }
          });
        }
      } catch (err) {
        console.error('Message parsing error:', err);
      }
    });
  }

  _sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = { CDPClient };
