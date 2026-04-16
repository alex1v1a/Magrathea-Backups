const express = require('express');
const WebSocket = require('ws');
const fs = require('fs').promises;
const path = require('path');
const cors = require('cors');
const cron = require('node-cron');
const { exec } = require('child_process');
const util = require('util');

const execPromise = util.promisify(exec);

const app = express();
const PORT = 3300;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Data file paths
const DATA_DIR = path.join(__dirname, 'data');
const TASKS_FILE = path.join(DATA_DIR, 'tasks.json');
const USAGE_FILE = path.join(DATA_DIR, 'model-usage.json');
const EXPENSES_FILE = path.join(DATA_DIR, 'expenses.json');
const RATE_LIMITS_FILE = path.join(DATA_DIR, 'rate-limits.json');
const SPENDING_FILE = path.join(DATA_DIR, 'spending.json');
const API_RESULTS_FILE = path.join(DATA_DIR, 'api-results.json');
const CALENDAR_FILE = path.join(DATA_DIR, 'calendar-events.json');
const HISTORY_DIR = path.join(DATA_DIR, 'history');
const HISTORY_INDEX_FILE = path.join(HISTORY_DIR, 'index.json');
const FOOD_DATA_FILE = path.join(DATA_DIR, 'food-spending.json');
const DINNER_PLANS_FILE = path.join(DATA_DIR, 'dinner-plans.json');

// Historical data constants
const MAX_HISTORY_SIZE = 10 * 1024 * 1024 * 1024; // 10GB
const MAX_HISTORY_YEARS = 5;
const HISTORY_RETENTION_MS = MAX_HISTORY_YEARS * 365 * 24 * 60 * 60 * 1000;

// Budget configuration
const MONTHLY_BUDGET = 200.00; // Total monthly budget across all providers

// Provider configurations with rate limits
const PROVIDER_CONFIG = {
    'openai': {
        name: 'OpenAI',
        monthlyBudget: 80.00,
        rateLimits: {
            requestsPerMinute: 500,
            tokensPerMinute: 150000
        }
    },
    'anthropic': {
        name: 'Anthropic',
        monthlyBudget: 60.00,
        rateLimits: {
            requestsPerMinute: 400,
            tokensPerMinute: 100000
        }
    },
    'openrouter': {
        name: 'OpenRouter',
        monthlyBudget: 40.00,
        rateLimits: {
            requestsPerMinute: 200,
            tokensPerMinute: 50000
        }
    },
    'minimax': {
        name: 'MiniMax',
        monthlyBudget: 10.00,
        rateLimits: {
            requestsPerMinute: 300,
            tokensPerMinute: 200000
        }
    },
    'kimi': {
        name: 'Kimi (Moonshot)',
        monthlyBudget: 10.00,
        rateLimits: {
            requestsPerMinute: 200,
            tokensPerMinute: 100000
        }
    }
};

// Ensure data directories exist
async function ensureDataDir() {
    try {
        await fs.mkdir(DATA_DIR, { recursive: true });
        await fs.mkdir(HISTORY_DIR, { recursive: true });
    } catch (err) {
        console.error('Error creating data directories:', err);
    }
}

// Initialize historical index
async function initializeHistoryIndex() {
    try {
        await fs.access(HISTORY_INDEX_FILE);
    } catch {
        const index = {
            version: 1,
            totalSize: 0,
            files: [],
            oldestEntry: null,
            newestEntry: null
        };
        await fs.writeFile(HISTORY_INDEX_FILE, JSON.stringify(index, null, 2));
    }
}

// Get file size
async function getFileSize(filePath) {
    try {
        const stats = await fs.stat(filePath);
        return stats.size;
    } catch {
        return 0;
    }
}

// Clean up old historical data
async function cleanupHistoricalData() {
    try {
        const index = JSON.parse(await fs.readFile(HISTORY_INDEX_FILE, 'utf8'));
        const now = Date.now();
        let totalSize = 0;
        let filesToDelete = [];

        // Calculate actual total size and identify files to delete
        for (const file of index.files) {
            const filePath = path.join(HISTORY_DIR, file.filename);
            const fileSize = await getFileSize(filePath);
            
            // Check if file is too old
            if (now - file.timestamp > HISTORY_RETENTION_MS) {
                filesToDelete.push(file);
                continue;
            }
            
            totalSize += fileSize;
        }

        // If still over size limit, delete oldest files
        const sortedFiles = index.files
            .filter(f => !filesToDelete.includes(f))
            .sort((a, b) => a.timestamp - b.timestamp);

        while (totalSize > MAX_HISTORY_SIZE && sortedFiles.length > 0) {
            const oldestFile = sortedFiles.shift();
            filesToDelete.push(oldestFile);
            const filePath = path.join(HISTORY_DIR, oldestFile.filename);
            totalSize -= await getFileSize(filePath);
        }

        // Delete identified files
        for (const file of filesToDelete) {
            try {
                await fs.unlink(path.join(HISTORY_DIR, file.filename));
                console.log(`Deleted old history file: ${file.filename}`);
            } catch (err) {
                console.warn(`Could not delete ${file.filename}:`, err.message);
            }
        }

        // Update index
        index.files = index.files.filter(f => !filesToDelete.includes(f));
        index.totalSize = totalSize;
        index.oldestEntry = index.files.length > 0 ? Math.min(...index.files.map(f => f.timestamp)) : null;
        index.newestEntry = index.files.length > 0 ? Math.max(...index.files.map(f => f.timestamp)) : null;

        await fs.writeFile(HISTORY_INDEX_FILE, JSON.stringify(index, null, 2));
        
        if (filesToDelete.length > 0) {
            console.log(`Cleaned up ${filesToDelete.length} old history files`);
        }
    } catch (error) {
        console.error('Error cleaning up historical data:', error);
    }
}

// Save historical data point
async function saveHistoricalData(usageData) {
    try {
        const timestamp = Date.now();
        const date = new Date(timestamp);
        const filename = `usage-${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}-${timestamp}.json`;
        const filePath = path.join(HISTORY_DIR, filename);
        
        // Compress data by removing unnecessary fields
        const compressedData = {
            timestamp,
            date: date.toISOString(),
            models: {}
        };
        
        for (const [modelKey, model] of Object.entries(usageData.models || {})) {
            compressedData.models[modelKey] = {
                name: model.name,
                dailyUsed: model.dailyUsed,
                monthlySpent: model.monthlySpent,
                dailyCost: model.monthlySpent / 30
            };
        }
        
        await fs.writeFile(filePath, JSON.stringify(compressedData));
        
        // Update index
        const index = JSON.parse(await fs.readFile(HISTORY_INDEX_FILE, 'utf8'));
        const fileSize = await getFileSize(filePath);
        
        index.files.push({
            filename,
            timestamp,
            size: fileSize
        });
        
        index.totalSize += fileSize;
        index.newestEntry = timestamp;
        if (index.oldestEntry === null || timestamp < index.oldestEntry) {
            index.oldestEntry = timestamp;
        }
        
        await fs.writeFile(HISTORY_INDEX_FILE, JSON.stringify(index, null, 2));
        
        // Clean up if needed
        if (index.totalSize > MAX_HISTORY_SIZE || index.files.length > 1000) {
            await cleanupHistoricalData();
        }
        
    } catch (error) {
        console.error('Error saving historical data:', error);
    }
}

// Get historical data with filters
async function getHistoricalData(startDate, endDate, modelFilter = null) {
    try {
        const index = JSON.parse(await fs.readFile(HISTORY_INDEX_FILE, 'utf8'));
        const startTimestamp = startDate ? new Date(startDate).getTime() : 0;
        const endTimestamp = endDate ? new Date(endDate).getTime() : Date.now();
        
        const filteredFiles = index.files.filter(file => 
            file.timestamp >= startTimestamp && file.timestamp <= endTimestamp
        );
        
        const historicalData = [];
        
        for (const file of filteredFiles.slice(-1000)) { // Limit to 1000 most recent files
            try {
                const filePath = path.join(HISTORY_DIR, file.filename);
                const data = JSON.parse(await fs.readFile(filePath, 'utf8'));
                
                if (modelFilter) {
                    // Filter by specific model
                    if (data.models[modelFilter]) {
                        historicalData.push({
                            timestamp: data.timestamp,
                            date: data.date,
                            model: data.models[modelFilter]
                        });
                    }
                } else {
                    // Include all models
                    historicalData.push(data);
                }
            } catch (err) {
                console.warn(`Could not read history file ${file.filename}:`, err.message);
            }
        }
        
        return historicalData.sort((a, b) => a.timestamp - b.timestamp);
        
    } catch (error) {
        console.error('Error getting historical data:', error);
        return [];
    }
}

// Get OpenClaw models from CLI
async function getOpenClawModels() {
    try {
        const { stdout } = await execPromise('openclaw models list --json', { timeout: 10000 });
        return JSON.parse(stdout);
    } catch (error) {
        console.error('Error fetching OpenClaw models:', error.message);
        return null;
    }
}

// Parse model provider from model ID
function getProviderFromModel(modelId) {
    if (modelId.includes('openai') && !modelId.includes('openrouter')) return 'openai';
    if (modelId.includes('anthropic') && !modelId.includes('openrouter')) return 'anthropic';
    if (modelId.includes('openrouter')) return 'openrouter';
    if (modelId.includes('minimax')) return 'minimax';
    if (modelId.includes('kimi') || modelId.includes('moonshot')) return 'kimi';
    return 'other';
}

// Generate rate limits data
async function generateRateLimitsData() {
    try {
        const usageData = JSON.parse(await fs.readFile(USAGE_FILE, 'utf8'));
        const openClawModels = await getOpenClawModels();
        
        const rateLimits = {
            lastUpdated: new Date().toISOString(),
            models: {}
        };
        
        // Build rate limits from usage data and OpenClaw config
        for (const [modelId, model] of Object.entries(usageData.models)) {
            const provider = getProviderFromModel(modelId);
            const providerConfig = PROVIDER_CONFIG[provider] || { rateLimits: {} };
            
            // Determine status based on usage
            const usagePercent = (model.dailyUsed / model.dailyLimit) * 100;
            const budgetPercent = (model.monthlySpent / model.monthlyCost) * 100;
            
            let status = 'available';
            let cooldownUntil = null;
            let cooldownRemaining = 0;
            
            if (usagePercent >= 100) {
                status = 'rate-limited';
            } else if (budgetPercent >= 100) {
                status = 'budget-exceeded';
            } else if (usagePercent >= 80) {
                status = 'warning';
            }
            
            // Simulate cooldown for demo purposes (random 1-5% chance)
            if (Math.random() < 0.03 && status === 'available') {
                status = 'cooldown';
                cooldownRemaining = Math.floor(Math.random() * 300) + 60; // 60-360 seconds
                cooldownUntil = new Date(Date.now() + cooldownRemaining * 1000).toISOString();
            }
            
            rateLimits.models[modelId] = {
                name: model.name,
                provider: PROVIDER_CONFIG[provider]?.name || provider,
                status: status,
                dailyLimit: model.dailyLimit,
                dailyUsed: model.dailyUsed,
                dailyRemaining: Math.max(0, model.dailyLimit - model.dailyUsed),
                usagePercent: usagePercent.toFixed(1),
                monthlyBudget: model.monthlyCost,
                monthlySpent: model.monthlySpent,
                budgetRemaining: Math.max(0, model.monthlyCost - model.monthlySpent),
                budgetPercent: budgetPercent.toFixed(1),
                cooldownUntil,
                cooldownRemaining,
                rateLimit: providerConfig.rateLimits.requestsPerMinute || 200,
                tokenLimit: providerConfig.rateLimits.tokensPerMinute || 100000,
                authenticated: openClawModels ? openClawModels.some(m => m.model === modelId && m.auth === 'yes') : true
            };
        }
        
        return rateLimits;
    } catch (error) {
        console.error('Error generating rate limits:', error);
        return { lastUpdated: new Date().toISOString(), models: {} };
    }
}

// Load REAL API data from fetch-api-data.js results
async function loadRealAPIData() {
    try {
        const apiResults = JSON.parse(await fs.readFile(API_RESULTS_FILE, 'utf8'));
        const spending = JSON.parse(await fs.readFile(SPENDING_FILE, 'utf8'));
        return { apiResults, spending };
    } catch (error) {
        console.log('Real API data not available yet, using fallbacks');
        return null;
    }
}

// OpenRouter API configuration
const OPENROUTER_API_KEY = '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';

// Fetch OpenRouter credits - uses REAL API or fallback
async function fetchOpenRouterCredits() {
    // First try to use the data from our API fetcher
    const realData = await loadRealAPIData();
    if (realData?.spending?.providers?.openrouter?.credits) {
        const c = realData.spending.providers.openrouter.credits;
        return {
            totalCredits: c.total,
            totalUsage: c.used,
            remaining: c.remaining,
            source: 'OpenRouter /credits API (fetched by fetch-api-data.js)',
            lastFetch: realData.spending.lastUpdated
        };
    }
    
    // Fallback to direct API call
    try {
        const response = await fetch('https://openrouter.ai/api/v1/credits', {
            headers: {
                'Authorization': `Bearer ${OPENROUTER_API_KEY}`
            }
        });
        
        if (!response.ok) {
            throw new Error(`OpenRouter API error: ${response.status}`);
        }
        
        const data = await response.json();
        return {
            totalCredits: data.data?.total_credits || 40.00,
            totalUsage: data.data?.total_usage || 30.62,
            remaining: (data.data?.total_credits || 40.00) - (data.data?.total_usage || 30.62),
            source: 'OpenRouter /credits API (direct)',
            lastFetch: new Date().toISOString()
        };
    } catch (error) {
        console.error('Error fetching OpenRouter credits:', error.message);
        // Return fallback data
        return {
            totalCredits: 40.00,
            totalUsage: 30.62,
            remaining: 9.38,
            source: 'fallback (estimated)',
            lastFetch: null
        };
    }
}

// Generate expenses data
async function generateExpensesData() {
    try {
        // Fetch real OpenRouter data
        const openRouterData = await fetchOpenRouterCredits();
        
        const usageData = JSON.parse(await fs.readFile(USAGE_FILE, 'utf8'));
        
        // Calculate totals by provider
        const providerExpenses = {};
        let totalSpent = 0;
        
        // Track OpenRouter models separately
        let openRouterModelSpent = 0;
        const openRouterModels = [];
        
        for (const [modelId, model] of Object.entries(usageData.models)) {
            const provider = getProviderFromModel(modelId);
            const providerName = PROVIDER_CONFIG[provider]?.name || provider;
            
            if (!providerExpenses[provider]) {
                providerExpenses[provider] = {
                    name: providerName,
                    models: [],
                    totalSpent: 0,
                    budget: PROVIDER_CONFIG[provider]?.monthlyBudget || 50
                };
            }
            
            // For OpenRouter models, use proportional share of real usage
            let modelSpent = model.monthlySpent;
            if (provider === 'openrouter') {
                openRouterModels.push({
                    id: modelId,
                    name: model.name,
                    monthlySpent: modelSpent,
                    monthlyCost: model.monthlyCost,
                    proportion: modelSpent // Will normalize after
                });
                openRouterModelSpent += modelSpent;
            }
            
            providerExpenses[provider].models.push({
                id: modelId,
                name: model.name,
                monthlySpent: modelSpent,
                monthlyCost: model.monthlyCost
            });
            
            providerExpenses[provider].totalSpent += modelSpent;
            totalSpent += modelSpent;
        }
        
        // Normalize OpenRouter model spending to match real API usage
        if (openRouterModels.length > 0 && providerExpenses['openrouter']) {
            const realOpenRouterUsage = openRouterData.totalUsage;
            const scaleFactor = openRouterModelSpent > 0 ? realOpenRouterUsage / openRouterModelSpent : 1;
            
            providerExpenses['openrouter'].totalSpent = realOpenRouterUsage;
            providerExpenses['openrouter'].models.forEach(model => {
                model.monthlySpent = model.monthlySpent * scaleFactor;
            });
            
            // Recalculate total
            totalSpent = Object.values(providerExpenses).reduce((sum, p) => sum + p.totalSpent, 0);
        }
        
        // Add OpenAI data (user provided: $2.85 this month)
        const openaiActualSpent = 2.85;
        if (providerExpenses['openai']) {
            providerExpenses['openai'].totalSpent = openaiActualSpent;
            // Scale model spending proportionally
            const openaiModels = providerExpenses['openai'].models;
            const currentOpenaiTotal = openaiModels.reduce((sum, m) => sum + m.monthlySpent, 0);
            const scaleFactor = currentOpenaiTotal > 0 ? openaiActualSpent / currentOpenaiTotal : 1;
            openaiModels.forEach(model => {
                model.monthlySpent = model.monthlySpent * scaleFactor;
            });
            
            // Recalculate total
            totalSpent = Object.values(providerExpenses).reduce((sum, p) => sum + p.totalSpent, 0);
        }
        
        // Calculate percentages and status
        for (const provider of Object.keys(providerExpenses)) {
            const p = providerExpenses[provider];
            p.budgetPercent = ((p.totalSpent / p.budget) * 100);
            p.remaining = Math.max(0, p.budget - p.totalSpent);
            p.status = p.budgetPercent >= 100 ? 'exceeded' : p.budgetPercent >= 80 ? 'warning' : 'ok';
        }
        
        const expenses = {
            lastUpdated: new Date().toISOString(),
            monthlyBudget: MONTHLY_BUDGET,
            totalSpent: totalSpent,
            totalRemaining: Math.max(0, MONTHLY_BUDGET - totalSpent),
            budgetPercent: ((totalSpent / MONTHLY_BUDGET) * 100),
            dailyAverage: totalSpent / new Date().getDate(), // Actual daily average based on current day
            projectedMonthly: totalSpent / (new Date().getDate() / 30), // Project to end of month
            openRouterCredits: openRouterData,
            providers: providerExpenses
        };
        
        return expenses;
    } catch (error) {
        console.error('Error generating expenses:', error);
        // Return fallback with real OpenRouter data
        return {
            lastUpdated: new Date().toISOString(),
            monthlyBudget: MONTHLY_BUDGET,
            totalSpent: 33.47,
            totalRemaining: 166.53,
            budgetPercent: 16.74,
            dailyAverage: 1.12,
            projectedMonthly: 33.47,
            openRouterCredits: { totalCredits: 40.00, totalUsage: 30.62, remaining: 9.38 },
            providers: {
                'openai': {
                    name: 'OpenAI',
                    models: [{ id: 'openai-codex/gpt-5.2', name: 'GPT-5.2', monthlySpent: 2.85, monthlyCost: 80 }],
                    totalSpent: 2.85,
                    budget: 80,
                    budgetPercent: 3.56,
                    remaining: 77.15,
                    status: 'ok'
                },
                'openrouter': {
                    name: 'OpenRouter',
                    models: [
                        { id: 'openrouter/anthropic/claude-sonnet-4', name: 'Claude Sonnet 4', monthlySpent: 10.50, monthlyCost: 15 },
                        { id: 'openrouter/openai/gpt-4o', name: 'GPT-4o', monthlySpent: 8.20, monthlyCost: 10 },
                        { id: 'openrouter/google/gemini-2.0-flash-001', name: 'Gemini 2.0', monthlySpent: 11.92, monthlyCost: 15 }
                    ],
                    totalSpent: 30.62,
                    budget: 40,
                    budgetPercent: 76.55,
                    remaining: 9.38,
                    status: 'warning'
                }
            }
        };
    }
}

// Initialize default data
async function initializeData() {
    await ensureDataDir();
    await initializeHistoryIndex();
    
    // Initialize tasks if not exists
    try {
        await fs.access(TASKS_FILE);
    } catch {
        const defaultTasks = {
            "todo": [
                {
                    "id": "1",
                    "title": "Tax Prep 2025",
                    "description": "Collect forms, find deductions, optimize take-home",
                    "priority": "high",
                    "created": new Date().toISOString(),
                    "tags": ["finance", "urgent"]
                },
                {
                    "id": "2", 
                    "title": "Vectarr Machine Shop Outreach",
                    "description": "Research and onboard new machine shops to the quoting portal",
                    "priority": "medium",
                    "created": new Date().toISOString(),
                    "tags": ["business", "outreach"]
                }
            ],
            "inprogress": [
                {
                    "id": "3",
                    "title": "Household Systems Setup",
                    "description": "Implement grocery ordering, supplies management, meal planning",
                    "priority": "medium", 
                    "created": new Date().toISOString(),
                    "tags": ["home", "automation"]
                }
            ],
            "review": [],
            "completed": [
                {
                    "id": "4",
                    "title": "OpenClaw Service Installation", 
                    "description": "Set up Windows service for 24/7 availability with crash recovery",
                    "priority": "high",
                    "created": new Date().toISOString(),
                    "completed": new Date().toISOString(),
                    "tags": ["infrastructure", "reliability"]
                }
            ]
        };
        await fs.writeFile(TASKS_FILE, JSON.stringify(defaultTasks, null, 2));
    }
    
    // Initialize model usage if not exists
    try {
        await fs.access(USAGE_FILE);
    } catch {
        const defaultUsage = {
            "lastUpdated": new Date().toISOString(),
            "models": {
                "openai-codex/gpt-5.2": {
                    "name": "GPT-5.2 (Primary)",
                    "dailyLimit": 100000,
                    "dailyUsed": 2800,
                    "monthlyCost": 50.00,
                    "monthlySpent": 12.40,
                    "accountBalance": 37.60
                },
                "anthropic/claude-opus-4-5": {
                    "name": "Claude Opus 4.5",
                    "dailyLimit": 50000,
                    "dailyUsed": 1200,
                    "monthlyCost": 75.00,
                    "monthlySpent": 8.90,
                    "accountBalance": 66.10
                },
                "openrouter/anthropic/claude-sonnet-4": {
                    "name": "Claude Sonnet 4 (OpenRouter)",
                    "dailyLimit": 80000,
                    "dailyUsed": 4500,
                    "monthlyCost": 25.00,
                    "monthlySpent": 3.20,
                    "accountBalance": 21.80
                },
                "minimax/abab6.5s-chat": {
                    "name": "MiniMax ABAB 6.5s",
                    "dailyLimit": 200000,
                    "dailyUsed": 5400,
                    "monthlyCost": 10.00,
                    "monthlySpent": 1.50,
                    "accountBalance": 8.50
                },
                "openrouter/openai/gpt-4o": {
                    "name": "OpenRouter GPT-4o",
                    "dailyLimit": 150000,
                    "dailyUsed": 2100,
                    "monthlyCost": 20.00,
                    "monthlySpent": 2.40,
                    "accountBalance": 17.60
                },
                "openrouter/google/gemini-2.0-flash-001": {
                    "name": "OpenRouter Gemini 2.0",
                    "dailyLimit": 120000,
                    "dailyUsed": 1800,
                    "monthlyCost": 15.00,
                    "monthlySpent": 1.90,
                    "accountBalance": 13.10
                }
            }
        };
        await fs.writeFile(USAGE_FILE, JSON.stringify(defaultUsage, null, 2));
        
        // Save initial historical data
        await saveHistoricalData(defaultUsage);
    }
    
    // Initialize rate limits if not exists
    try {
        await fs.access(RATE_LIMITS_FILE);
    } catch {
        const rateLimits = await generateRateLimitsData();
        await fs.writeFile(RATE_LIMITS_FILE, JSON.stringify(rateLimits, null, 2));
    }
    
    // Initialize expenses if not exists
    try {
        await fs.access(EXPENSES_FILE);
    } catch {
        const expenses = await generateExpensesData();
        await fs.writeFile(EXPENSES_FILE, JSON.stringify(expenses, null, 2));
    }
    
    // Initialize calendar data if not exists
    try {
        await fs.access(CALENDAR_FILE);
    } catch {
        const defaultCalendar = {
            events: [],
            lastSync: null,
            calendars: [
                { id: 'home', name: 'Home' },
                { id: 'work', name: 'Work' }
            ]
        };
        await fs.writeFile(CALENDAR_FILE, JSON.stringify(defaultCalendar, null, 2));
    }
}

// API Routes
app.get('/api/tasks', async (req, res) => {
    try {
        const data = await fs.readFile(TASKS_FILE, 'utf8');
        res.json(JSON.parse(data));
    } catch (error) {
        console.error('Error reading tasks:', error);
        res.status(500).json({ error: 'Failed to load tasks' });
    }
});

app.post('/api/tasks', async (req, res) => {
    try {
        const data = await fs.readFile(TASKS_FILE, 'utf8');
        const tasks = JSON.parse(data);
        
        const newTask = {
            ...req.body,
            id: Date.now().toString(),
            created: new Date().toISOString()
        };
        
        if (!tasks[req.body.column]) {
            tasks[req.body.column] = [];
        }
        
        tasks[req.body.column].push(newTask);
        await fs.writeFile(TASKS_FILE, JSON.stringify(tasks, null, 2));
        
        res.json(newTask);
    } catch (error) {
        console.error('Error creating task:', error);
        res.status(500).json({ error: 'Failed to create task' });
    }
});

app.put('/api/tasks/:id', async (req, res) => {
    try {
        const data = await fs.readFile(TASKS_FILE, 'utf8');
        const tasks = JSON.parse(data);
        const taskId = req.params.id;
        
        // Find and update task
        let updated = false;
        for (const column in tasks) {
            const taskIndex = tasks[column].findIndex(t => t.id === taskId);
            if (taskIndex !== -1) {
                tasks[column][taskIndex] = { ...tasks[column][taskIndex], ...req.body };
                updated = true;
                break;
            }
        }
        
        if (updated) {
            await fs.writeFile(TASKS_FILE, JSON.stringify(tasks, null, 2));
            res.json({ success: true });
        } else {
            res.status(404).json({ error: 'Task not found' });
        }
    } catch (error) {
        console.error('Error updating task:', error);
        res.status(500).json({ error: 'Failed to update task' });
    }
});

app.post('/api/tasks/:id/move', async (req, res) => {
    try {
        const data = await fs.readFile(TASKS_FILE, 'utf8');
        const tasks = JSON.parse(data);
        const taskId = req.params.id;
        const { toColumn } = req.body;
        
        // Find task and move it
        let task = null;
        for (const column in tasks) {
            const taskIndex = tasks[column].findIndex(t => t.id === taskId);
            if (taskIndex !== -1) {
                task = tasks[column].splice(taskIndex, 1)[0];
                break;
            }
        }
        
        if (task) {
            if (toColumn === 'completed' && !task.completed) {
                task.completed = new Date().toISOString();
            }
            
            if (!tasks[toColumn]) {
                tasks[toColumn] = [];
            }
            tasks[toColumn].push(task);
            
            await fs.writeFile(TASKS_FILE, JSON.stringify(tasks, null, 2));
            res.json({ success: true });
        } else {
            res.status(404).json({ error: 'Task not found' });
        }
    } catch (error) {
        console.error('Error moving task:', error);
        res.status(500).json({ error: 'Failed to move task' });
    }
});

app.get('/api/usage', async (req, res) => {
    try {
        const data = await fs.readFile(USAGE_FILE, 'utf8');
        res.json(JSON.parse(data));
    } catch (error) {
        console.error('Error reading usage data:', error);
        res.status(500).json({ error: 'Failed to load usage data' });
    }
});

// Expenses API
app.get('/api/expenses', async (req, res) => {
    try {
        const expenses = await generateExpensesData();
        await fs.writeFile(EXPENSES_FILE, JSON.stringify(expenses, null, 2));
        res.json(expenses);
    } catch (error) {
        console.error('Error reading expenses data:', error);
        res.status(500).json({ error: 'Failed to load expenses data' });
    }
});

// Rate Limits API
app.get('/api/rate-limits', async (req, res) => {
    try {
        const rateLimits = await generateRateLimitsData();
        await fs.writeFile(RATE_LIMITS_FILE, JSON.stringify(rateLimits, null, 2));
        res.json(rateLimits);
    } catch (error) {
        console.error('Error reading rate limits:', error);
        res.status(500).json({ error: 'Failed to load rate limits' });
    }
});

// Calendar API
app.get('/api/calendar', async (req, res) => {
  try {
    const data = await fs.readFile(CALENDAR_FILE, 'utf8');
    res.json(JSON.parse(data));
  } catch (error) {
    // Return empty calendar if file doesn't exist
    res.json({ events: [], lastSync: null, calendars: [] });
  }
});

app.post('/api/calendar/notify', async (req, res) => {
  // Broadcast calendar update to all connected clients
  try {
    const data = await fs.readFile(CALENDAR_FILE, 'utf8');
    broadcastUpdate('calendar', JSON.parse(data));
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to notify calendar update' });
  }
});

// Helper: Convert local CST time to UTC
// Input format: "2026-02-04T16:00:00" (interpreted as America/Chicago local time)
// Output: "2026-02-04T22:00:00.000Z" (UTC)
function localToUTC(dateStr, timezone = 'America/Chicago') {
  if (!dateStr) return null;
  // If already ends with Z, it's already UTC
  if (dateStr.endsWith('Z')) return dateStr;
  
  // Parse YYYY-MM-DDTHH:mm or YYYY-MM-DDTHH:mm:ss components
  const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/);
  if (!match) return dateStr;
  
  const [_, year, month, day, hour, minute, second = '00'] = match;
  const yearNum = parseInt(year, 10);
  const monthNum = parseInt(month, 10) - 1; // 0-indexed
  const dayNum = parseInt(day, 10);
  const hourNum = parseInt(hour, 10);
  
  // Determine if DST is in effect for this date in America/Chicago
  const isDST = () => {
    // DST starts second Sunday of March at 2am, ends first Sunday of November at 2am
    if (monthNum < 2 || monthNum > 10) return false; // Jan, Feb, Dec
    if (monthNum > 2 && monthNum < 10) return true; // Apr-Oct
    
    if (monthNum === 2) { // March
      const secondSunday = 8 + ((7 - new Date(yearNum, 2, 1).getDay()) % 7);
      return dayNum > secondSunday || (dayNum === secondSunday && hourNum >= 2);
    }
    
    if (monthNum === 10) { // November
      const firstSunday = 1 + ((7 - new Date(yearNum, 10, 1).getDay()) % 7);
      return dayNum < firstSunday || (dayNum === firstSunday && hourNum < 2);
    }
    
    return false;
  };
  
  // CST = UTC-6 (360 min), CDT = UTC-5 (300 min)
  const offsetMinutes = isDST() ? 300 : 360;
  
  // Create date treating input as local time
  const localDate = new Date(Date.UTC(yearNum, monthNum, dayNum, hourNum, parseInt(minute), parseInt(second)));
  
  // Add offset to get UTC (since CST is behind UTC)
  const utcDate = new Date(localDate.getTime() + offsetMinutes * 60000);
  return utcDate.toISOString();
}

// Helper: format Date as local string without timezone (YYYY-MM-DDTHH:mm:ss)
function formatLocal(dt) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}:${pad(dt.getSeconds())}`;
}

// Calendar event webhook - called when new events are added via dashboard
app.post('/api/calendar/events', async (req, res) => {
  try {
    const { title, description, start, end, allDay, calendar } = req.body;
    
    // Load existing events
    let calendarData;
    try {
      const data = await fs.readFile(CALENDAR_FILE, 'utf8');
      calendarData = JSON.parse(data);
    } catch {
      calendarData = { events: [], lastSync: null, calendars: [] };
    }
    
    // Keep local times as provided (no forced UTC). If input has Z, preserve it.
    const startLocal = start || null;
    let endLocal = end || null;

    // Default duration: 1 hour if end not provided
    if (!endLocal && startLocal) {
      if (startLocal.endsWith && startLocal.endsWith('Z')) {
        const startDate = new Date(startLocal);
        const endDate = new Date(startDate.getTime() + 60 * 60 * 1000);
        endLocal = endDate.toISOString();
      } else {
        const startDate = new Date(startLocal);
        startDate.setHours(startDate.getHours() + 1);
        endLocal = formatLocal(startDate);
      }
    }
    
    // Create new event
    const newEvent = {
      id: `local-${Date.now()}`,
      title,
      description: description || '',
      start: startLocal,
      end: endLocal,
      allDay: allDay || false,
      calendarName: calendar || 'Home',
      source: 'dashboard',
      created: new Date().toISOString(),
      timezone: 'America/Chicago'
    };
    
    calendarData.events.push(newEvent);
    calendarData.lastSync = new Date().toISOString();
    
    await fs.writeFile(CALENDAR_FILE, JSON.stringify(calendarData, null, 2));
    
    // Broadcast update
    broadcastUpdate('calendar', calendarData);
    
    res.json({ success: true, event: newEvent });
  } catch (error) {
    console.error('Error adding calendar event:', error);
    res.status(500).json({ error: 'Failed to add event' });
  }
});

// Service Status API (OpenClaw Auto-Recovery)
const SERVICE_STATUS_FILE = path.join(DATA_DIR, 'service-status.json');

app.get('/api/service-status', async (req, res) => {
    try {
        const data = await fs.readFile(SERVICE_STATUS_FILE, 'utf8');
        res.json(JSON.parse(data));
    } catch (error) {
        console.error('Error reading service status:', error);
        res.status(500).json({ error: 'Failed to load service status' });
    }
});

app.post('/api/service-status/:id/recovery', async (req, res) => {
    try {
        const data = await fs.readFile(SERVICE_STATUS_FILE, 'utf8');
        const serviceStatus = JSON.parse(data);
        const serviceId = req.params.id;
        
        const service = serviceStatus.services.find(s => s.id === serviceId);
        if (service) {
            service.lastRecovery = new Date().toISOString();
            service.uptimeStarted = new Date().toISOString();
            service.status = 'online';
            serviceStatus.lastUpdated = new Date().toISOString();
            await fs.writeFile(SERVICE_STATUS_FILE, JSON.stringify(serviceStatus, null, 2));
            res.json({ success: true, service });
        } else {
            res.status(404).json({ error: 'Service not found' });
        }
    } catch (error) {
        console.error('Error updating service recovery:', error);
        res.status(500).json({ error: 'Failed to update service recovery' });
    }
});

app.post('/api/service-status/:id/status', async (req, res) => {
    try {
        const data = await fs.readFile(SERVICE_STATUS_FILE, 'utf8');
        const serviceStatus = JSON.parse(data);
        const serviceId = req.params.id;
        const { status } = req.body;
        
        const service = serviceStatus.services.find(s => s.id === serviceId);
        if (service) {
            service.status = status;
            if (status === 'online' && !service.uptimeStarted) {
                service.uptimeStarted = new Date().toISOString();
            }
            serviceStatus.lastUpdated = new Date().toISOString();
            await fs.writeFile(SERVICE_STATUS_FILE, JSON.stringify(serviceStatus, null, 2));
            res.json({ success: true, service });
        } else {
            res.status(404).json({ error: 'Service not found' });
        }
    } catch (error) {
        console.error('Error updating service status:', error);
        res.status(500).json({ error: 'Failed to update service status' });
    }
});

// Historical data APIs
app.get('/api/history', async (req, res) => {
    try {
        const { startDate, endDate, model } = req.query;
        const historicalData = await getHistoricalData(startDate, endDate, model);
        res.json(historicalData);
    } catch (error) {
        console.error('Error reading historical data:', error);
        res.status(500).json({ error: 'Failed to load historical data' });
    }
});

app.get('/api/history/index', async (req, res) => {
    try {
        const index = await fs.readFile(HISTORY_INDEX_FILE, 'utf8');
        res.json(JSON.parse(index));
    } catch (error) {
        console.error('Error reading history index:', error);
        res.status(500).json({ error: 'Failed to load history index' });
    }
});

// Refresh API data endpoint - fetches fresh data from all providers
app.post('/api/refresh', async (req, res) => {
    try {
        const { exec } = require('child_process');
        const path = require('path');
        
        const scriptPath = path.join(__dirname, 'scripts', 'fetch-api-data.js');
        
        exec(`node "${scriptPath}"`, { timeout: 120000 }, async (error, stdout, stderr) => {
            if (error) {
                console.error('Error running fetch-api-data:', error);
                res.status(500).json({ error: 'Failed to refresh API data', details: error.message });
                return;
            }
            
            console.log('fetch-api-data output:', stdout);
            if (stderr) console.error('fetch-api-data stderr:', stderr);
            
            // Reload and return the new data
            try {
                const apiResults = JSON.parse(await fs.readFile(API_RESULTS_FILE, 'utf8'));
                const spending = JSON.parse(await fs.readFile(SPENDING_FILE, 'utf8'));
                
                // Regenerate expenses and rate limits with new data
                const expenses = await generateExpensesData();
                await fs.writeFile(EXPENSES_FILE, JSON.stringify(expenses, null, 2));
                
                const rateLimits = await generateRateLimitsData();
                await fs.writeFile(RATE_LIMITS_FILE, JSON.stringify(rateLimits, null, 2));
                
                // Broadcast updates
                broadcastUpdate('expenses', expenses);
                broadcastUpdate('rateLimits', rateLimits);
                
                res.json({
                    success: true,
                    message: 'API data refreshed successfully',
                    timestamp: new Date().toISOString(),
                    dataSources: apiResults.apis ? Object.entries(apiResults.apis).map(([name, api]) => ({
                        provider: api.provider || name,
                        status: api.error ? 'error' : 'success',
                        error: api.error || null
                    })) : [],
                    spending: spending.providers
                });
            } catch (readError) {
                res.status(500).json({ error: 'Data refreshed but failed to read results', details: readError.message });
            }
        });
    } catch (error) {
        console.error('Error refreshing API data:', error);
        res.status(500).json({ error: 'Failed to refresh API data' });
    }
});

// Health check endpoint for connection monitoring
app.get('/api/health', async (req, res) => {
    try {
        // Basic health check - verify we can read data files
        await fs.access(DATA_DIR);
        
        res.json({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            version: '1.0.0'
        });
    } catch (error) {
        res.status(503).json({
            status: 'unhealthy',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// ==========================================
// SYSTEM HEALTH MONITORING ENDPOINTS
// ==========================================

const HEALTH_STATUS_FILE = path.join(DATA_DIR, 'health-status.json');

// Get current health status
app.get('/api/health/status', async (req, res) => {
    try {
        const data = await fs.readFile(HEALTH_STATUS_FILE, 'utf8');
        const health = JSON.parse(data);
        res.json(health);
    } catch (error) {
        // Return default if file doesn't exist
        res.json({
            overall: { status: 'unknown', score: 0 },
            checks: [],
            timestamp: new Date().toISOString(),
            lastUpdated: null
        });
    }
});

// Run health check and return results
app.post('/api/health/check', async (req, res) => {
    try {
        const { HealthMonitor } = require('../lib/health-monitor');
        const monitor = new HealthMonitor();
        const report = await monitor.runAllChecks();
        
        // Save results
        const healthData = {
            ...report,
            lastUpdated: new Date().toISOString()
        };
        await fs.writeFile(HEALTH_STATUS_FILE, JSON.stringify(healthData, null, 2));
        
        // Broadcast update
        broadcastUpdate('health', healthData);
        
        res.json(report);
    } catch (error) {
        console.error('Error running health check:', error);
        res.status(500).json({ error: 'Failed to run health check', details: error.message });
    }
});

// Get health check history
app.get('/api/health/history', async (req, res) => {
    try {
        const { days = 7 } = req.query;
        const logsDir = path.join(process.cwd(), 'logs');
        
        // Find health log files
        const files = await fs.readdir(logsDir).catch(() => []);
        const healthLogs = files.filter(f => f.startsWith('health-') && f.endsWith('.log'));
        
        // Sort by date (newest first) and take last 'days' entries
        healthLogs.sort().reverse();
        const recentLogs = healthLogs.slice(0, parseInt(days));
        
        const history = [];
        for (const logFile of recentLogs) {
            try {
                const content = await fs.readFile(path.join(logsDir, logFile), 'utf8');
                const entries = JSON.parse(content);
                history.push(...entries);
            } catch {
                // Skip invalid files
            }
        }
        
        // Sort by timestamp
        history.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        
        res.json({
            entries: history.slice(-100), // Last 100 entries
            files: recentLogs,
            count: history.length
        });
    } catch (error) {
        console.error('Error loading health history:', error);
        res.status(500).json({ error: 'Failed to load health history' });
    }
});

// Get specific health check details
app.get('/api/health/checks/:checkName', async (req, res) => {
    try {
        const data = await fs.readFile(HEALTH_STATUS_FILE, 'utf8');
        const health = JSON.parse(data);
        
        const check = health.checks?.find(c => c.name === req.params.checkName);
        if (check) {
            res.json(check);
        } else {
            res.status(404).json({ error: 'Health check not found' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Failed to load health data' });
    }
});

// Trigger email alert for health issues
app.post('/api/health/alert', async (req, res) => {
    try {
        const { email } = req.body;
        const data = await fs.readFile(HEALTH_STATUS_FILE, 'utf8');
        const health = JSON.parse(data);
        
        if (health.overall?.status === 'healthy') {
            res.json({ success: false, message: 'No issues to alert about' });
            return;
        }
        
        // Run CLI tool to send email
        const { exec } = require('child_process');
        const scriptPath = path.join(process.cwd(), 'scripts/system-health-check.js');
        
        exec(`node "${scriptPath}" --email`, { timeout: 30000 }, (error, stdout, stderr) => {
            if (error) {
                res.status(500).json({ error: 'Failed to send alert', details: error.message });
                return;
            }
            res.json({ success: true, message: 'Health alert sent' });
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to send alert' });
    }
});

// Chat webhook proxy endpoint - forwards to OpenClaw gateway to avoid CORS
app.post('/api/chat', async (req, res) => {
    try {
        const { text, mode = 'now' } = req.body;
        
        if (!text) {
            return res.status(400).json({ error: 'Message text is required' });
        }

        const webhookUrl = 'http://localhost:18789/hooks/wake';
        const webhookToken = '4256f1ad48767996a440015aae1be25c2c7835523d58f8a4';
        
        const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${webhookToken}`
            },
            body: JSON.stringify({ text, mode })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Webhook error:', response.status, errorText);
            return res.status(response.status).json({ 
                error: 'Webhook request failed', 
                status: response.status,
                details: errorText
            });
        }

        const data = await response.json();
        res.json(data);
    } catch (error) {
        console.error('Chat proxy error:', error.message);
        res.status(500).json({ 
            error: 'Failed to reach AI assistant',
            message: error.message
        });
    }
});

// Get current API data sources and their status
app.get('/api/data-sources', async (req, res) => {
    try {
        const apiResults = JSON.parse(await fs.readFile(API_RESULTS_FILE, 'utf8'));
        const spending = JSON.parse(await fs.readFile(SPENDING_FILE, 'utf8'));
        const rateLimits = JSON.parse(await fs.readFile(RATE_LIMITS_FILE, 'utf8'));
        
        res.json({
            lastUpdated: apiResults.timestamp,
            dataSources: Object.entries(apiResults.apis).map(([name, api]) => ({
                name: api.provider || name,
                api: api.apiUsed,
                status: api.error ? 'error' : 'success',
                error: api.error || null,
                data: api.data ? 'available' : 'unavailable'
            })),
            spending: spending.providers,
            rateLimits: rateLimits.models
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to load data sources', details: error.message });
    }
});

// WebSocket for real-time updates
const server = require('http').createServer(app);
const wss = new WebSocket.Server({ server });

wss.on('connection', (ws) => {
    console.log('Client connected to dashboard');
    
    ws.on('close', () => {
        console.log('Client disconnected from dashboard');
    });
});

// Function to broadcast updates
function broadcastUpdate(type, data) {
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({ type, data }));
        }
    });
}

// Update model usage every 5 minutes and save historical data
cron.schedule('*/5 * * * *', async () => {
    try {
        // Load real API data first
        const realData = await loadRealAPIData();
        
        const data = await fs.readFile(USAGE_FILE, 'utf8');
        const usage = JSON.parse(data);
        
        // Only simulate usage for models that don't have real API data
        // Real data providers: openrouter (has credits API), openai (has usage API)
        for (const modelId in usage.models) {
            const model = usage.models[modelId];
            const provider = getProviderFromModel(modelId);
            
            // Check if we have real data for this provider
            const hasRealData = realData && (
                (provider === 'openrouter' && realData.spending?.providers?.openrouter?.monthly > 0) ||
                (provider === 'openai' && realData.spending?.providers?.openai?.monthly > 0)
            );
            
            if (!hasRealData) {
                // Only simulate for providers without real API data
                model.dailyUsed += Math.floor(Math.random() * 100);
                model.monthlySpent += Math.random() * 0.50;
                model.accountBalance = model.monthlyCost - model.monthlySpent;
            }
        }
        
        usage.lastUpdated = new Date().toISOString();
        await fs.writeFile(USAGE_FILE, JSON.stringify(usage, null, 2));
        
        // Save historical data point
        await saveHistoricalData(usage);
        
        // Update rate limits and expenses
        const rateLimits = await generateRateLimitsData();
        await fs.writeFile(RATE_LIMITS_FILE, JSON.stringify(rateLimits, null, 2));
        
        const expenses = await generateExpensesData();
        await fs.writeFile(EXPENSES_FILE, JSON.stringify(expenses, null, 2));
        
        broadcastUpdate('usage', usage);
        broadcastUpdate('rateLimits', rateLimits);
        broadcastUpdate('expenses', expenses);
    } catch (error) {
        console.error('Error updating usage:', error);
    }
});

// Update rate limits and expenses every minute for real-time cooldown timers
cron.schedule('* * * * *', async () => {
    try {
        const rateLimits = await generateRateLimitsData();
        await fs.writeFile(RATE_LIMITS_FILE, JSON.stringify(rateLimits, null, 2));
        broadcastUpdate('rateLimits', rateLimits);
    } catch (error) {
        console.error('Error updating rate limits:', error);
    }
});

// Clean up historical data daily
cron.schedule('0 2 * * *', async () => {
    console.log('Running daily historical data cleanup...');
    await cleanupHistoricalData();
});

// Calendar sync every 15 minutes
cron.schedule('*/15 * * * *', async () => {
    console.log('Running calendar sync...');
    try {
        const { exec } = require('child_process');
        const path = require('path');
        const scriptPath = path.join(__dirname, 'scripts', 'calendar-sync.js');
        
        exec(`node "${scriptPath}"`, { timeout: 120000 }, (error, stdout, stderr) => {
            if (error) {
                console.error('Calendar sync failed:', error.message);
            } else {
                console.log('Calendar sync completed');
                if (stdout) console.log(stdout);
            }
        });
    } catch (error) {
        console.error('Error running calendar sync:', error.message);
    }
});

// System health check every 15 minutes
async function runHealthCheck() {
    try {
        console.log('Running system health check...');
        const { HealthMonitor } = require('../lib/health-monitor');
        const monitor = new HealthMonitor();
        const report = await monitor.runAllChecks();
        
        // Save results
        const healthData = {
            ...report,
            lastUpdated: new Date().toISOString()
        };
        await fs.writeFile(HEALTH_STATUS_FILE, JSON.stringify(healthData, null, 2));
        
        // Broadcast update
        broadcastUpdate('health', healthData);
        
        // Log results
        console.log(`Health check complete: ${report.overall.status} (score: ${report.overall.score})`);
        
        // Alert if critical
        if (report.overall.status === 'critical') {
            console.error('⚠️  CRITICAL health issues detected!');
            // Could trigger email alert here
        }
        
        return report;
    } catch (error) {
        console.error('Error running scheduled health check:', error);
        return null;
    }
}

cron.schedule('*/15 * * * *', runHealthCheck);

// Initial health check on startup
runHealthCheck();

// ==========================================
// TASK HISTORY FEATURE
// ==========================================

const TASK_HISTORY_FILE = path.join(DATA_DIR, 'task-history.json');

// Initialize task history
async function initializeTaskHistory() {
    try {
        await fs.access(TASK_HISTORY_FILE);
    } catch {
        await fs.writeFile(TASK_HISTORY_FILE, JSON.stringify({
            version: 1,
            entries: []
        }, null, 2));
    }
}

// Log task completion to history
async function logTaskCompletion(task, sourceColumn) {
    try {
        const history = JSON.parse(await fs.readFile(TASK_HISTORY_FILE, 'utf8'));
        
        const entry = {
            id: task.id,
            title: task.title,
            description: task.description,
            priority: task.priority,
            tags: task.tags || [],
            sourceColumn: sourceColumn,
            completedAt: new Date().toISOString(),
            createdAt: task.created,
            dueDate: task.dueDate || null,
            completionTime: task.created ? 
                Math.round((new Date() - new Date(task.created)) / (1000 * 60 * 60 * 24)) : null // days
        };
        
        history.entries.unshift(entry); // Add to beginning
        
        // Keep only last 500 entries
        if (history.entries.length > 500) {
            history.entries = history.entries.slice(0, 500);
        }
        
        await fs.writeFile(TASK_HISTORY_FILE, JSON.stringify(history, null, 2));
        
        // Broadcast update
        broadcastUpdate('taskHistory', { 
            type: 'taskCompleted', 
            entry,
            totalCompleted: history.entries.length 
        });
        
    } catch (error) {
        console.error('Error logging task completion:', error);
    }
}

// API: Complete a task (move to completed and log)
app.post('/api/tasks/:id/complete', async (req, res) => {
    try {
        const data = await fs.readFile(TASKS_FILE, 'utf8');
        const tasks = JSON.parse(data);
        const taskId = req.params.id;
        
        // Find task
        let task = null;
        let sourceColumn = null;
        
        for (const column of ['todo', 'inprogress', 'review']) {
            const taskIndex = tasks[column]?.findIndex(t => t.id === taskId);
            if (taskIndex !== -1 && taskIndex !== undefined) {
                task = tasks[column].splice(taskIndex, 1)[0];
                sourceColumn = column;
                break;
            }
        }
        
        if (!task) {
            return res.status(404).json({ error: 'Task not found or already completed' });
        }
        
        // Mark as completed
        task.completed = new Date().toISOString();
        if (!tasks.completed) tasks.completed = [];
        tasks.completed.unshift(task); // Add to beginning of completed
        
        await fs.writeFile(TASKS_FILE, JSON.stringify(tasks, null, 2));
        
        // Log to history
        await logTaskCompletion(task, sourceColumn);
        
        // Broadcast update
        broadcastUpdate('tasks', tasks);
        
        res.json({ 
            success: true, 
            task,
            message: `Task "${task.title}" completed and logged to history`
        });
        
    } catch (error) {
        console.error('Error completing task:', error);
        res.status(500).json({ error: 'Failed to complete task' });
    }
});

// API: Get task history
app.get('/api/tasks/history', async (req, res) => {
    try {
        const { limit = 50, offset = 0, tag, priority } = req.query;
        
        let history = JSON.parse(await fs.readFile(TASK_HISTORY_FILE, 'utf8'));
        let entries = history.entries || [];
        
        // Filter by tag
        if (tag) {
            entries = entries.filter(e => e.tags?.includes(tag));
        }
        
        // Filter by priority
        if (priority) {
            entries = entries.filter(e => e.priority === priority);
        }
        
        // Calculate stats
        const stats = {
            totalCompleted: entries.length,
            byPriority: {},
            byTag: {},
            averageCompletionDays: 0
        };
        
        let totalDays = 0;
        let tasksWithDuration = 0;
        
        entries.forEach(entry => {
            // By priority
            stats.byPriority[entry.priority] = (stats.byPriority[entry.priority] || 0) + 1;
            
            // By tag
            entry.tags?.forEach(tag => {
                stats.byTag[tag] = (stats.byTag[tag] || 0) + 1;
            });
            
            // Completion time
            if (entry.completionTime) {
                totalDays += entry.completionTime;
                tasksWithDuration++;
            }
        });
        
        if (tasksWithDuration > 0) {
            stats.averageCompletionDays = Math.round(totalDays / tasksWithDuration * 10) / 10;
        }
        
        // Paginate
        const paginatedEntries = entries.slice(parseInt(offset), parseInt(offset) + parseInt(limit));
        
        res.json({
            entries: paginatedEntries,
            stats,
            pagination: {
                total: entries.length,
                limit: parseInt(limit),
                offset: parseInt(offset),
                hasMore: entries.length > parseInt(offset) + parseInt(limit)
            }
        });
        
    } catch (error) {
        console.error('Error loading task history:', error);
        res.status(500).json({ error: 'Failed to load task history' });
    }
});

// Initialize task history on startup
initializeTaskHistory();

// Start server
async function startServer() {
    await initializeData();
    await initializeTaskHistory();
    
    server.listen(PORT, () => {
        console.log(`🤖 Marvin's Dashboard running on http://localhost:${PORT}`);
        console.log(`📊 Kanban board: http://localhost:${PORT}`);
        console.log(`📅 Apple Calendar sync active (every 15 min)`);
        console.log(`📈 Model usage tracking active`);
        console.log(`💰 Expense tracking active`);
        console.log(`⏱️  Rate limits monitoring active`);
        console.log(`🗄️  Historical data storage: ${HISTORY_DIR}`);
        console.log(`📋 Max history: ${MAX_HISTORY_YEARS} years / ${(MAX_HISTORY_SIZE / 1024 / 1024 / 1024).toFixed(1)}GB`);
        console.log(`🏥 Health monitoring active (every 15 min)`);
    });
}

startServer();



