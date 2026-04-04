#!/usr/bin/env node
/**
 * Kanban Auto-Refresh Script
 * Runs every 30 minutes to:
 * 1. Check kanban board status
 * 2. Detect task changes
 * 3. Report updates to Discord
 */

const fs = require('fs').promises;
const path = require('path');
const http = require('http');

const DATA_DIR = path.join(__dirname, '..', 'data');
const TASKS_FILE = path.join(DATA_DIR, 'tasks.json');
const STATE_FILE = path.join(DATA_DIR, '.kanban-state.json');

// Notification configuration - uses OpenClaw webhook or logs to file
// To enable Discord, set KANBAN_DISCORD_WEBHOOK environment variable
const DISCORD_WEBHOOK = process.env.KANBAN_DISCORD_WEBHOOK || null;
const OPENCLAW_WEBHOOK = 'http://localhost:18789/hooks/wake';
const OPENCLAW_TOKEN = '4256f1ad48767996a440015aae1be25c2c7835523d58f8a4';

async function loadTasks() {
    try {
        const data = await fs.readFile(TASKS_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error loading tasks:', error);
        return null;
    }
}

async function loadPreviousState() {
    try {
        const data = await fs.readFile(STATE_FILE, 'utf8');
        return JSON.parse(data);
    } catch {
        return null;
    }
}

async function saveState(state) {
    try {
        await fs.writeFile(STATE_FILE, JSON.stringify(state, null, 2));
    } catch (error) {
        console.error('Error saving state:', error);
    }
}

function generateTaskHash(tasks) {
    // Create a simple hash of task counts and titles
    const columns = ['todo', 'inprogress', 'review', 'completed'];
    const hash = {};
    for (const col of columns) {
        hash[col] = {
            count: (tasks[col] || []).length,
            titles: (tasks[col] || []).map(t => t.title).sort()
        };
    }
    return JSON.stringify(hash);
}

function detectChanges(current, previous) {
    const changes = [];
    const columns = ['todo', 'inprogress', 'review', 'completed'];
    
    for (const col of columns) {
        const currTasks = current[col] || [];
        const prevTasks = previous ? (previous[col] || []) : [];
        
        // Check for new tasks
        const prevIds = new Set(prevTasks.map(t => t.id));
        const newTasks = currTasks.filter(t => !prevIds.has(t.id));
        
        for (const task of newTasks) {
            changes.push({
                type: 'added',
                column: col,
                title: task.title,
                priority: task.priority
            });
        }
        
        // Check for completed tasks (moved to completed)
        if (col === 'completed') {
            const currIds = new Set(currTasks.map(t => t.id));
            const newlyCompleted = currTasks.filter(t => !prevIds.has(t.id));
            
            for (const task of newlyCompleted) {
                changes.push({
                    type: 'completed',
                    title: task.title
                });
            }
        }
    }
    
    return changes;
}

function formatDiscordMessage(changes, taskSummary) {
    const timestamp = new Date().toISOString();
    const timeStr = new Date().toLocaleString('en-US', { 
        timeZone: 'America/Chicago',
        hour: '2-digit',
        minute: '2-digit',
        month: 'short',
        day: 'numeric'
    });
    
    let content = `🤖 **Marvin's Kanban Update** — ${timeStr}\n\n`;
    
    // Add changes section if there are any
    if (changes.length > 0) {
        content += `**Changes since last check:**\n`;
        for (const change of changes) {
            if (change.type === 'added') {
                const emoji = change.priority === 'high' ? '🔴' : change.priority === 'medium' ? '🟡' : '🟢';
                content += `${emoji} Added to **${change.column}**: ${change.title}\n`;
            } else if (change.type === 'completed') {
                content += `✅ Completed: ${change.title}\n`;
            }
        }
        content += '\n';
    }
    
    // Add summary
    content += `**Current Status:**\n`;
    content += `📋 To Do: ${taskSummary.todo} | 🔄 In Progress: ${taskSummary.inprogress}\n`;
    content += `👀 Review: ${taskSummary.review} | ✅ Completed: ${taskSummary.completed}\n`;
    
    return content;
}

async function sendToDiscord(message) {
    // Try Discord first if configured
    if (DISCORD_WEBHOOK) {
        return new Promise((resolve, reject) => {
            const url = new URL(DISCORD_WEBHOOK);
            const data = JSON.stringify({ content: message });
            
            const options = {
                hostname: url.hostname,
                path: url.pathname + url.search,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': data.length
                }
            };
            
            const req = http.request(options, (res) => {
                if (res.statusCode === 204) {
                    resolve();
                } else {
                    reject(new Error(`Discord API returned ${res.statusCode}`));
                }
            });
            
            req.on('error', reject);
            req.write(data);
            req.end();
        });
    }
    
    // Fall back to OpenClaw webhook
    console.log('No Discord webhook configured. Logging to file and attempting OpenClaw webhook...');
    console.log(message);
    
    return sendToOpenClaw(message);
}

async function sendToOpenClaw(message) {
    return new Promise((resolve, reject) => {
        const data = JSON.stringify({ 
            text: message,
            mode: 'now'
        });
        
        const options = {
            hostname: 'localhost',
            port: 18789,
            path: '/hooks/wake',
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${OPENCLAW_TOKEN}`,
                'Content-Type': 'application/json',
                'Content-Length': data.length
            }
        };
        
        const req = http.request(options, (res) => {
            if (res.statusCode === 200 || res.statusCode === 204) {
                resolve();
            } else {
                reject(new Error(`OpenClaw webhook returned ${res.statusCode}`));
            }
        });
        
        req.on('error', (err) => {
            console.log('OpenClaw webhook not available:', err.message);
            resolve(); // Don't fail the script if webhook is down
        });
        
        req.write(data);
        req.end();
    });
}

async function refreshAPIData() {
    console.log('🔄 Refreshing API data from providers...');
    
    return new Promise((resolve) => {
        const { exec } = require('child_process');
        const scriptPath = path.join(__dirname, 'fetch-api-data.js');
        
        exec(`node "${scriptPath}"`, { timeout: 120000 }, (error, stdout, stderr) => {
            if (error) {
                console.error('❌ Error refreshing API data:', error.message);
            } else {
                console.log('✅ API data refreshed successfully');
                console.log(stdout);
            }
            resolve();
        });
    });
}

async function main() {
    console.log('🔄 Kanban auto-refresh starting...');
    
    // Refresh API data first
    await refreshAPIData();
    
    const currentTasks = await loadTasks();
    if (!currentTasks) {
        console.error('Failed to load tasks');
        process.exit(1);
    }
    
    const previousState = await loadPreviousState();
    const currentHash = generateTaskHash(currentTasks);
    
    // Calculate summary
    const summary = {
        todo: (currentTasks.todo || []).length,
        inprogress: (currentTasks.inprogress || []).length,
        review: (currentTasks.review || []).length,
        completed: (currentTasks.completed || []).length
    };
    
    // Detect changes
    const changes = previousState ? detectChanges(currentTasks, previousState.tasks) : [];
    
    // Check if we should report (first run, changes detected, or every 30 min)
    const shouldReport = changes.length > 0 || !previousState;
    
    if (shouldReport) {
        const message = formatDiscordMessage(changes, summary);
        
        try {
            await sendToDiscord(message);
            console.log('✅ Discord notification sent');
        } catch (error) {
            console.error('❌ Failed to send Discord notification:', error.message);
        }
    } else {
        console.log('ℹ️ No changes detected, skipping Discord notification');
    }
    
    // Save current state
    await saveState({
        lastCheck: new Date().toISOString(),
        hash: currentHash,
        tasks: currentTasks
    });
    
    console.log('✅ Kanban refresh complete');
    console.log(`   To Do: ${summary.todo} | In Progress: ${summary.inprogress} | Review: ${summary.review} | Completed: ${summary.completed}`);
}

main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});
