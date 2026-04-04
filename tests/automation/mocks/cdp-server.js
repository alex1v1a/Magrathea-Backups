/**
 * Mock CDP Server
 * Simulates Chrome DevTools Protocol responses for testing without real browser
 */

const http = require('http');
const WebSocket = require('ws');
const { EventEmitter } = require('events');

class MockCDPServer extends EventEmitter {
  constructor(options = {}) {
    super();
    this.port = options.port || 9222;
    this.host = options.host || 'localhost';
    this.httpServer = null;
    this.wsServer = null;
    this.targets = [];
    this.sessions = new Map();
    this.commandHandlers = new Map();
    this.delay = options.delay || 0;
    this.errorRate = options.errorRate || 0;
    this.currentPageContent = '';
    this.networkEnabled = false;
    
    this._setupDefaultHandlers();
  }

  /**
   * Start the mock CDP server
   */
  async start() {
    // HTTP server for /json endpoints
    this.httpServer = http.createServer((req, res) => {
      this._handleHTTP(req, res);
    });

    // WebSocket server for CDP commands
    this.wsServer = new WebSocket.Server({ server: this.httpServer });
    this.wsServer.on('connection', (ws, req) => {
      this._handleWSConnection(ws, req);
    });

    return new Promise((resolve, reject) => {
      this.httpServer.listen(this.port, this.host, (err) => {
        if (err) reject(err);
        else {
          console.log(`🎭 Mock CDP Server listening on ws://${this.host}:${this.port}`);
          resolve();
        }
      });
    });
  }

  /**
   * Stop the mock server
   */
  async stop() {
    return new Promise((resolve) => {
      this.sessions.forEach((session) => {
        if (session.ws.readyState === WebSocket.OPEN) {
          session.ws.close();
        }
      });
      
      if (this.wsServer) {
        this.wsServer.close();
      }
      
      if (this.httpServer) {
        this.httpServer.close(resolve);
      } else {
        resolve();
      }
    });
  }

  /**
   * Register a custom command handler
   */
  onCommand(method, handler) {
    this.commandHandlers.set(method, handler);
  }

  /**
   * Set the current page HTML content
   */
  setPageContent(html) {
    this.currentPageContent = html;
  }

  /**
   * Simulate a network error
   */
  injectError(error) {
    this.emit('error:injected', error);
  }

  /**
   * Simulate target creation
   */
  createTarget(url, title = 'Mock Page', type = 'page') {
    const target = {
      targetId: `target-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      title,
      url,
      attached: false,
      browserContextId: 'mock-context'
    };
    this.targets.push(target);
    this.emit('target:created', target);
    return target;
  }

  /**
   * Simulate target destruction
   */
  destroyTarget(targetId) {
    const index = this.targets.findIndex(t => t.targetId === targetId);
    if (index !== -1) {
      const target = this.targets.splice(index, 1)[0];
      this.emit('target:destroyed', target);
    }
  }

  /**
   * Simulate navigation
   */
  navigate(targetId, url) {
    const target = this.targets.find(t => t.targetId === targetId);
    if (target) {
      target.url = url;
      target.title = `Mock: ${url}`;
      
      const session = this.sessions.get(targetId);
      if (session) {
        this._sendEvent(session, 'Page.frameNavigated', {
          frame: {
            id: 'mock-frame',
            loaderId: `loader-${Date.now()}`,
            url,
            domainAndRegistry: new URL(url).hostname,
            securityOrigin: new URL(url).origin,
            mimeType: 'text/html',
            secureContextType: 'Secure',
            crossOriginIsolatedContextType: 'NotIsolated'
          }
        });
        
        this._sendEvent(session, 'Page.loadEventFired', {
          timestamp: Date.now() / 1000
        });
      }
    }
  }

  /**
   * Simulate DOM element appearing
   */
  addElement(selector, attributes = {}, text = '') {
    const nodeId = `node-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const element = {
      nodeId,
      selector,
      attributes,
      text,
      visible: true,
      boxModel: {
        content: [0, 0, 100, 15],
        padding: [0, 0, 100, 15],
        border: [0, 0, 100, 15],
        margin: [0, 0, 100, 15],
        width: 100,
        height: 15
      }
    };
    
    this.sessions.forEach((session) => {
      this._sendEvent(session, 'DOM.childNodeInserted', {
        parentNodeId: 1,
        previousNodeId: 0,
        node: {
          nodeId,
          nodeType: 1,
          nodeName: selector.toUpperCase(),
          localName: selector,
          nodeValue: '',
          childNodeCount: text ? 1 : 0,
          attributes: Object.entries(attributes).flat()
        }
      });
    });
    
    return element;
  }

  // Private methods

  _handleHTTP(req, res) {
    res.setHeader('Content-Type', 'application/json');
    
    const url = new URL(req.url, `http://${req.headers.host}`);
    
    switch (url.pathname) {
      case '/json/version':
        res.end(JSON.stringify({
          Browser: 'MockChrome/120.0.0.0',
          'Protocol-Version': '1.3',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'V8-Version': '12.0.0',
          'WebKit-Version': '537.36',
          webSocketDebuggerUrl: `ws://${this.host}:${this.port}/devtools/browser/mock-browser`
        }));
        break;
        
      case '/json/list':
      case '/json':
        res.end(JSON.stringify(this.targets.map(t => ({
          description: '',
          devtoolsFrontendUrl: `/devtools/inspector.html?ws=${this.host}:${this.port}/devtools/page/${t.targetId}`,
          faviconUrl: 'https://www.google.com/favicon.ico',
          id: t.targetId,
          title: t.title,
          type: t.type,
          url: t.url,
          webSocketDebuggerUrl: `ws://${this.host}:${this.port}/devtools/page/${t.targetId}`,
          ...t
        }))));
        break;
        
      case '/json/protocol':
        res.end(JSON.stringify(this._getProtocol()));
        break;
        
      default:
        res.statusCode = 404;
        res.end(JSON.stringify({ error: 'Not found' }));
    }
  }

  _handleWSConnection(ws, req) {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const targetId = url.pathname.split('/').pop();
    
    const session = {
      ws,
      targetId,
      messageId: 0,
      enabledDomains: new Set()
    };
    
    this.sessions.set(targetId, session);
    
    ws.on('message', async (data) => {
      try {
        const message = JSON.parse(data);
        await this._handleCDPMessage(session, message);
      } catch (err) {
        console.error('CDP message error:', err);
        this._sendResponse(session, message.id, null, {
          code: -32600,
          message: err.message
        });
      }
    });
    
    ws.on('close', () => {
      this.sessions.delete(targetId);
    });
  }

  async _handleCDPMessage(session, message) {
    // Simulate network delay
    if (this.delay > 0) {
      await this._sleep(this.delay);
    }
    
    // Simulate random errors
    if (this.errorRate > 0 && Math.random() < this.errorRate) {
      this._sendResponse(session, message.id, null, {
        code: -32603,
        message: 'Random error injected for testing'
      });
      return;
    }
    
    const { id, method, params } = message;
    
    // Check for custom handler
    const customHandler = this.commandHandlers.get(method);
    if (customHandler) {
      const result = await customHandler(params, session);
      this._sendResponse(session, id, result);
      return;
    }
    
    // Default handlers
    const handler = this._getDefaultHandler(method);
    if (handler) {
      try {
        const result = await handler(params, session);
        this._sendResponse(session, id, result);
      } catch (err) {
        this._sendResponse(session, id, null, {
          code: -32000,
          message: err.message
        });
      }
    } else {
      // Unknown method - return empty result
      this._sendResponse(session, id, {});
    }
  }

  _sendResponse(session, id, result, error = null) {
    const response = { id };
    if (error) {
      response.error = error;
    } else {
      response.result = result;
    }
    
    if (session.ws.readyState === WebSocket.OPEN) {
      session.ws.send(JSON.stringify(response));
    }
  }

  _sendEvent(session, method, params) {
    if (session.ws.readyState === WebSocket.OPEN) {
      session.ws.send(JSON.stringify({
        method,
        params
      }));
    }
  }

  _getDefaultHandler(method) {
    return this._defaultHandlers[method];
  }

  _setupDefaultHandlers() {
    this._defaultHandlers = {
      // Target domain
      'Target.attachToTarget': ({ targetId, flatten = true }) => ({
        sessionId: `session-${targetId}`
      }),
      
      'Target.detachFromTarget': ({ sessionId }) => ({
        success: true
      }),
      
      'Target.getTargets': () => ({
        targetInfos: this.targets
      }),
      
      'Target.createTarget': ({ url, newWindow = false }) => {
        const target = this.createTarget(url, 'New Tab', 'page');
        return { targetId: target.targetId };
      },
      
      'Target.closeTarget': ({ targetId }) => {
        this.destroyTarget(targetId);
        return { success: true };
      },
      
      // Page domain
      'Page.enable': (params, session) => {
        session.enabledDomains.add('Page');
        return {};
      },
      
      'Page.disable': (params, session) => {
        session.enabledDomains.delete('Page');
        return {};
      },
      
      'Page.navigate': ({ url }, session) => {
        const frameId = 'mock-frame';
        const loaderId = `loader-${Date.now()}`;
        
        setTimeout(() => {
          this._sendEvent(session, 'Page.frameStartedLoading', {
            frameId
          });
          
          setTimeout(() => {
            this.navigate(session.targetId, url);
          }, 100);
        }, 0);
        
        return { frameId, loaderId };
      },
      
      'Page.reload': ({ ignoreCache = false }, session) => {
        const target = this.targets.find(t => t.targetId === session.targetId);
        if (target) {
          this.navigate(session.targetId, target.url);
        }
        return {};
      },
      
      'Page.captureScreenshot': ({ format = 'png', fromSurface = true }) => {
        // Return a 1x1 transparent PNG base64
        const mockScreenshot = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
        return { data: mockScreenshot };
      },
      
      'Page.printToPDF': ({ landscape = false, printBackground = false }) => {
        return { data: 'JVBERi0xLjQKJcOkw7zDtsO8CjIgMCBvYmoKPDwKL0xlbmd0aCAzIDAgUgovRmlsdGVyIC9GbGF0ZURlY29kZQo+PgpzdHJlYW0KeJzLSMxLLUmNzNFLzs8rzi9KycxLt4IDAIvJBw4KZW5kc3RyZWFtCmVuZG9iago=' };
      },
      
      // Runtime domain
      'Runtime.enable': (params, session) => {
        session.enabledDomains.add('Runtime');
        return {};
      },
      
      'Runtime.evaluate': ({ expression, returnByValue = false, awaitPromise = false }) => {
        // Evaluate JavaScript expression (simplified)
        let result;
        try {
          // Handle common patterns
          if (expression.includes('navigator.webdriver')) {
            result = undefined;
          } else if (expression.includes('navigator.plugins')) {
            result = [{ name: 'Chrome PDF Plugin' }];
          } else if (expression.includes('window.location')) {
            result = { href: 'https://www.heb.com/', hostname: 'www.heb.com' };
          } else if (expression.includes('document.title')) {
            result = 'HEB Mock Page';
          } else if (expression.includes('document.querySelector')) {
            // Return mock element
            result = { 
              __type: 'HTMLElement',
              tagName: 'DIV',
              innerText: 'Mock Element'
            };
          } else {
            result = null;
          }
          
          return {
            result: {
              type: typeof result === 'object' ? 'object' : typeof result,
              value: result,
              description: String(result)
            }
          };
        } catch (err) {
          return {
            result: {
              type: 'undefined'
            },
            exceptionDetails: {
              text: err.message,
              lineNumber: 0,
              columnNumber: 0
            }
          };
        }
      },
      
      'Runtime.callFunctionOn': ({ objectId, functionDeclaration, arguments: args = [] }) => {
        return {
          result: {
            type: 'object',
            value: { success: true }
          }
        };
      },
      
      // DOM domain
      'DOM.enable': (params, session) => {
        session.enabledDomains.add('DOM');
        return {};
      },
      
      'DOM.getDocument': ({ depth = 0, pierce = false }) => ({
        root: {
          nodeId: 1,
          parentId: 0,
          backendNodeId: 1,
          nodeType: 9,
          nodeName: '#document',
          localName: '',
          nodeValue: '',
          childNodeCount: 2,
          children: [
            {
              nodeId: 2,
              parentId: 1,
              backendNodeId: 2,
              nodeType: 10,
              nodeName: 'html',
              localName: 'html',
              nodeValue: '',
              publicId: '',
              systemId: ''
            },
            {
              nodeId: 3,
              parentId: 1,
              backendNodeId: 3,
              nodeType: 1,
              nodeName: 'HTML',
              localName: 'html',
              nodeValue: '',
              childNodeCount: 2,
              children: [
                {
                  nodeId: 4,
                  parentId: 3,
                  backendNodeId: 4,
                  nodeType: 1,
                  nodeName: 'HEAD',
                  localName: 'head',
                  nodeValue: ''
                },
                {
                  nodeId: 5,
                  parentId: 3,
                  backendNodeId: 5,
                  nodeType: 1,
                  nodeName: 'BODY',
                  localName: 'body',
                  nodeValue: '',
                  childNodeCount: 0
                }
              ]
            }
          ]
        }
      }),
      
      'DOM.querySelector': ({ nodeId, selector }) => {
        const foundNodeId = Math.floor(Math.random() * 1000000);
        return { nodeId: foundNodeId };
      },
      
      'DOM.querySelectorAll': ({ nodeId, selector }) => {
        // Return random number of matches based on selector
        const count = selector.includes('button') ? 5 : 
                      selector.includes('input') ? 3 : 
                      selector.includes('a') ? 10 : 1;
        
        return {
          nodeIds: Array.from({ length: count }, (_, i) => 100 + i)
        };
      },
      
      'DOM.getBoxModel': ({ nodeId }) => ({
        model: {
          content: [100, 100, 200, 100, 200, 115, 100, 115],
          padding: [98, 98, 202, 98, 202, 117, 98, 117],
          border: [96, 96, 204, 96, 204, 119, 96, 119],
          margin: [96, 96, 204, 96, 204, 119, 96, 119],
          width: 108,
          height: 23
        }
      }),
      
      'DOM.focus': ({ nodeId }) => ({
        success: true
      }),
      
      'DOM.setFileInputFiles': ({ files, nodeId, objectId }) => ({
        success: true
      }),
      
      // Input domain
      'Input.dispatchMouseEvent': ({ type, x, y, button = 'none', clickCount = 1 }) => {
        return { success: true };
      },
      
      'Input.dispatchKeyEvent': ({ type, key, code, text }) => {
        return { success: true };
      },
      
      // Network domain
      'Network.enable': (params, session) => {
        session.enabledDomains.add('Network');
        this.networkEnabled = true;
        return {};
      },
      
      'Network.setCacheDisabled': ({ cacheDisabled }) => ({
        success: true
      }),
      
      'Network.setUserAgentOverride': ({ userAgent, acceptLanguage, platform }) => ({
        success: true
      }),
      
      'Network.setExtraHTTPHeaders': ({ headers }) => ({
        success: true
      }),
      
      // Fetch domain (for request interception)
      'Fetch.enable': (params, session) => {
        session.enabledDomains.add('Fetch');
        return {};
      },
      
      'Fetch.continueRequest': ({ requestId, url, method, headers, postData }) => ({
        success: true
      }),
      
      'Fetch.continueResponse': ({ requestId, responseCode, responseHeaders }) => ({
        success: true
      }),
      
      'Fetch.fulfillRequest': ({ requestId, responseCode, body, responseHeaders }) => ({
        success: true
      }),
      
      'Fetch.failRequest': ({ requestId, errorReason }) => ({
        success: true
      }),
      
      // Emulation domain
      'Emulation.setDeviceMetricsOverride': ({ width, height, deviceScaleFactor, mobile }) => ({
        success: true
      }),
      
      'Emulation.setUserAgentOverride': ({ userAgent, acceptLanguage, platform }) => ({
        success: true
      }),
      
      'Emulation.setViewport': ({ width, height, deviceScaleFactor, mobile }) => ({
        success: true
      }),
      
      // Security domain
      'Security.enable': (params, session) => {
        session.enabledDomains.add('Security');
        return {};
      },
      
      'Security.setIgnoreCertificateErrors': ({ ignore }) => ({
        success: true
      }),
      
      // Browser domain
      'Browser.getVersion': () => ({
        protocolVersion: '1.3',
        product: 'MockChrome/120.0.0.0',
        revision: '@mock',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        jsVersion: '12.0.0'
      }),
      
      'Browser.close': () => {
        setTimeout(() => this.stop(), 100);
        return {};
      },
      
      // Storage domain
      'Storage.clearDataForOrigin': ({ origin, storageTypes }) => ({
        success: true
      }),
      
      // Performance domain
      'Performance.enable': (params, session) => {
        session.enabledDomains.add('Performance');
        return {};
      },
      
      'Performance.getMetrics': () => ({
        metrics: [
          { name: 'Timestamp', value: Date.now() / 1000 },
          { name: 'Documents', value: 5 },
          { name: 'Frames', value: 3 },
          { name: 'JSEventListeners', value: 150 },
          { name: 'Nodes', value: 1200 },
          { name: 'LayoutCount', value: 10 },
          { name: 'RecalcStyleCount', value: 15 },
          { name: 'LayoutDuration', value: 0.05 },
          { name: 'RecalcStyleDuration', value: 0.03 },
          { name: 'ScriptDuration', value: 0.2 },
          { name: 'TaskDuration', value: 0.3 },
          { name: 'JSHeapUsedSize', value: 25000000 },
          { name: 'JSHeapTotalSize', value: 35000000 }
        ]
      })
    };
  }

  _sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  _getProtocol() {
    // Simplified protocol definition
    return {
      version: { major: '1', minor: '3' },
      domains: [
        { domain: 'Browser', description: 'Browser domain' },
        { domain: 'DOM', description: 'DOM domain' },
        { domain: 'Emulation', description: 'Emulation domain' },
        { domain: 'Fetch', description: 'Fetch domain' },
        { domain: 'Input', description: 'Input domain' },
        { domain: 'Network', description: 'Network domain' },
        { domain: 'Page', description: 'Page domain' },
        { domain: 'Performance', description: 'Performance domain' },
        { domain: 'Runtime', description: 'Runtime domain' },
        { domain: 'Security', description: 'Security domain' },
        { domain: 'Storage', description: 'Storage domain' },
        { domain: 'Target', description: 'Target domain' }
      ]
    };
  }
}

module.exports = { MockCDPServer };
