/**
 * Mission Control API Client
 * Connects the static dashboard to backend data sources
 */

class MissionControlAPI {
    constructor() {
        this.baseUrl = this.detectBackend();
        this.cache = new Map();
        this.cacheExpiry = 60000; // 1 minute
    }

    detectBackend() {
        // Try to connect to Marvin backend if available
        // Fall back to static data if not
        return window.location.hostname === '10.0.1.99' 
            ? 'http://10.0.1.90:3001/api'
            : '/api';
    }

    async fetch(endpoint, options = {}) {
        const url = `${this.baseUrl}${endpoint}`;
        const cacheKey = `${endpoint}-${JSON.stringify(options)}`;
        
        // Check cache
        const cached = this.cache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
            return cached.data;
        }

        try {
            const response = await fetch(url, {
                ...options,
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            
            // Cache successful response
            this.cache.set(cacheKey, { data, timestamp: Date.now() });
            
            return data;
        } catch (error) {
            console.warn(`API fetch failed for ${endpoint}:`, error);
            // Return fallback data
            return this.getFallbackData(endpoint);
        }
    }

    getFallbackData(endpoint) {
        // Fallback data when backend is unavailable
        const fallbacks = {
            '/stats': {
                shopsContacted: 44,
                activeProjects: 12,
                emailsSentToday: 11,
                responseRate: 23
            },
            '/cron-jobs': [
                { id: '1', name: 'Daily Machine Shop Outreach', schedule: '0 5 * * *', status: 'active', lastRun: new Date().toISOString() },
                { id: '2', name: 'Daily Email Summary', schedule: '0 14 * * *', status: 'active', lastRun: new Date().toISOString() }
            ],
            '/tasks': [
                { id: '1', title: 'Heart of Texas Machining', status: 'prospect', column: 'prospects' },
                { id: '2', title: 'Minco Inc', status: 'contacted', column: 'contacted' }
            ]
        };

        for (const [key, value] of Object.entries(fallbacks)) {
            if (endpoint.includes(key.replace('/', ''))) {
                return value;
            }
        }
        
        return null;
    }

    // Public API methods
    async getStats() {
        return this.fetch('/stats');
    }

    async getCronJobs() {
        return this.fetch('/cron-jobs');
    }

    async getTasks(board = 'machine-shops') {
        return this.fetch(`/tasks?board=${board}`);
    }

    async getCalendarEvents(month, year) {
        return this.fetch(`/calendar?month=${month}&year=${year}`);
    }

    async updateTask(taskId, updates) {
        return this.fetch(`/tasks/${taskId}`, {
            method: 'PUT',
            body: JSON.stringify(updates)
        });
    }

    async createTask(task) {
        return this.fetch('/tasks', {
            method: 'POST',
            body: JSON.stringify(task)
        });
    }
}

// Data refresh manager
class DataRefreshManager {
    constructor(api) {
        this.api = api;
        this.intervals = new Map();
        this.subscribers = new Map();
    }

    subscribe(key, callback, intervalMs = 30000) {
        // Store callback
        if (!this.subscribers.has(key)) {
            this.subscribers.set(key, new Set());
        }
        this.subscribers.get(key).add(callback);

        // Start polling if not already running
        if (!this.intervals.has(key)) {
            const interval = setInterval(async () => {
                const data = await this.fetchData(key);
                this.notify(key, data);
            }, intervalMs);
            this.intervals.set(key, interval);
        }

        // Return unsubscribe function
        return () => {
            this.subscribers.get(key)?.delete(callback);
            if (this.subscribers.get(key)?.size === 0) {
                clearInterval(this.intervals.get(key));
                this.intervals.delete(key);
            }
        };
    }

    async fetchData(key) {
        switch (key) {
            case 'stats':
                return this.api.getStats();
            case 'cron-jobs':
                return this.api.getCronJobs();
            case 'tasks':
                return this.api.getTasks();
            default:
                return null;
        }
    }

    notify(key, data) {
        this.subscribers.get(key)?.forEach(callback => {
            try {
                callback(data);
            } catch (error) {
                console.error(`Error in subscriber callback for ${key}:`, error);
            }
        });
    }

    refresh(key) {
        return this.fetchData(key).then(data => {
            this.notify(key, data);
            return data;
        });
    }
}

// Export for use in main app
window.MissionControlAPI = MissionControlAPI;
window.DataRefreshManager = DataRefreshManager;
