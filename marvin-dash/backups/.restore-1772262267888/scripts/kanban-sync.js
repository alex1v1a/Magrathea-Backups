#!/usr/bin/env node
/**
 * Kanban Board Sync Script
 * Updates and maintains the Marvin's Dashboard kanban board
 * Run via: node scripts/kanban-sync.js
 */

const fs = require('fs').promises;
const path = require('path');
const http = require('http');

const TASKS_FILE = path.join(__dirname, '..', 'data', 'tasks.json');
const USAGE_FILE = path.join(__dirname, '..', 'data', 'model-usage.json');

// ANSI colors for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  console.log('');
  log(`═══ ${title} ═══`, 'bright');
}

// Load tasks from file
async function loadTasks() {
  try {
    const data = await fs.readFile(TASKS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    log(`Error loading tasks: ${error.message}`, 'red');
    return null;
  }
}

// Save tasks to file
async function saveTasks(tasks) {
  try {
    await fs.writeFile(TASKS_FILE, JSON.stringify(tasks, null, 2));
    return true;
  } catch (error) {
    log(`Error saving tasks: ${error.message}`, 'red');
    return false;
  }
}

// Check if dashboard server is running
async function checkServer() {
  return new Promise((resolve) => {
    const req = http.get('http://localhost:3001/api/tasks', (res) => {
      resolve(res.statusCode === 200);
    });
    req.on('error', () => resolve(false));
    req.setTimeout(3000, () => {
      req.destroy();
      resolve(false);
    });
  });
}

// Get usage stats
async function getUsageStats() {
  try {
    const data = await fs.readFile(USAGE_FILE, 'utf8');
    const usage = JSON.parse(data);
    
    let totalDailyUsed = 0;
    let totalMonthlySpent = 0;
    let totalBudget = 0;
    
    for (const model of Object.values(usage.models)) {
      totalDailyUsed += model.dailyUsed || 0;
      totalMonthlySpent += model.monthlySpent || 0;
      totalBudget += model.monthlyCost || 0;
    }
    
    return {
      lastUpdated: usage.lastUpdated,
      totalDailyUsed,
      totalMonthlySpent,
      totalBudget,
      remainingBudget: totalBudget - totalMonthlySpent,
      models: Object.keys(usage.models).length
    };
  } catch (error) {
    return null;
  }
}

// Print kanban board summary
function printKanbanSummary(tasks) {
  logSection('KANBAN BOARD STATUS');
  
  const columns = {
    todo: { label: 'To Do', color: 'red', icon: '📋' },
    inprogress: { label: 'In Progress', color: 'yellow', icon: '🔄' },
    review: { label: 'Review', color: 'blue', icon: '👀' },
    completed: { label: 'Completed', color: 'green', icon: '✅' }
  };
  
  for (const [key, config] of Object.entries(columns)) {
    const taskList = tasks[key] || [];
    const highPriority = taskList.filter(t => t.priority === 'high').length;
    
    log(`${config.icon} ${config.label}: ${taskList.length} tasks`, config.color);
    if (highPriority > 0 && key !== 'completed') {
      log(`   └─ ${highPriority} high priority`, 'red');
    }
    
    // Show first 3 tasks
    taskList.slice(0, 3).forEach(task => {
      const priorityColor = task.priority === 'high' ? 'red' : task.priority === 'medium' ? 'yellow' : 'dim';
      log(`   • ${task.title}`, priorityColor);
    });
    
    if (taskList.length > 3) {
      log(`   ... and ${taskList.length - 3} more`, 'dim');
    }
  }
}

// Auto-update task statuses based on age
async function autoUpdateTasks(tasks) {
  logSection('AUTO-UPDATING TASKS');
  
  const now = new Date();
  let moved = 0;
  let updated = 0;
  
  // Check for stale "in progress" tasks (older than 7 days)
  const staleThreshold = 7 * 24 * 60 * 60 * 1000; // 7 days
  
  for (const column of ['inprogress', 'review']) {
    const taskList = tasks[column] || [];
    
    for (let i = taskList.length - 1; i >= 0; i--) {
      const task = taskList[i];
      const created = new Date(task.created);
      const age = now - created;
      
      // Auto-move stale review tasks to completed
      if (column === 'review' && age > staleThreshold && !task.needsReview) {
        log(`Moving stale review task: ${task.title}`, 'yellow');
        task.completed = now.toISOString();
        tasks.completed = tasks.completed || [];
        tasks.completed.push(task);
        taskList.splice(i, 1);
        moved++;
      }
    }
  }
  
  // Check for duplicates in todo
  const todoTitles = new Set();
  const duplicates = [];
  
  (tasks.todo || []).forEach((task, index) => {
    const normalized = task.title.toLowerCase().trim();
    if (todoTitles.has(normalized)) {
      duplicates.push(index);
    } else {
      todoTitles.add(normalized);
    }
  });
  
  // Remove duplicates (keep first occurrence)
  for (let i = duplicates.length - 1; i >= 0; i--) {
    const task = tasks.todo[duplicates[i]];
    log(`Removing duplicate: ${task.title}`, 'yellow');
    tasks.todo.splice(duplicates[i], 1);
    updated++;
  }
  
  if (moved === 0 && updated === 0) {
    log('No automatic updates needed', 'green');
  } else {
    log(`Moved ${moved} tasks, removed ${updated} duplicates`, 'green');
  }
  
  return { moved, updated };
}

// ----- AI-POWERED HELPERS (OPTIONAL USE) -----
function normalizeText(text) {
  return (text || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenize(text) {
  const normalized = normalizeText(text);
  if (!normalized) return [];
  return normalized.split(' ').filter(token => token.length > 1);
}

function getTaskText(task) {
  return [task.title, task.description, task.notes].filter(Boolean).join(' ');
}

function extractDueDate(task) {
  const keys = ['due', 'dueDate', 'deadline', 'due_at', 'dueAt'];
  for (const key of keys) {
    if (task && task[key]) {
      const candidate = new Date(task[key]);
      if (!Number.isNaN(candidate.getTime())) {
        return candidate;
      }
    }
  }
  return null;
}

function determineTaskPriority(task, options = {}) {
  const { now = new Date() } = options;
  const text = normalizeText(getTaskText(task));
  const highKeywords = ['urgent', 'asap', 'immediately', 'critical', 'blocker', 'deadline', 'overdue'];
  const mediumKeywords = ['soon', 'important', 'follow up', 'review', 'schedule'];
  const lowKeywords = ['someday', 'whenever', 'nice to have', 'optional'];

  let score = 0;
  const signals = [];

  if (text) {
    if (highKeywords.some(keyword => text.includes(keyword))) {
      score += 2;
      signals.push('high-keyword');
    }
    if (mediumKeywords.some(keyword => text.includes(keyword))) {
      score += 1;
      signals.push('medium-keyword');
    }
    if (lowKeywords.some(keyword => text.includes(keyword))) {
      score -= 1;
      signals.push('low-keyword');
    }
  }

  const dueDate = extractDueDate(task);
  if (dueDate) {
    const msUntilDue = dueDate - now;
    const daysUntilDue = msUntilDue / (24 * 60 * 60 * 1000);
    if (daysUntilDue <= 0) {
      score += 3;
      signals.push('overdue');
    } else if (daysUntilDue <= 2) {
      score += 2;
      signals.push('due-soon');
    } else if (daysUntilDue <= 7) {
      score += 1;
      signals.push('due-this-week');
    }
  }

  let priority = 'low';
  if (score >= 3) priority = 'high';
  else if (score >= 1) priority = 'medium';

  return { priority, score, signals };
}

function autoCategorizeTask(task) {
  const text = normalizeText(getTaskText(task));
  if (!text) return { column: null, priority: null, reason: null };

  if (/\b(fix|bug|error)\b/.test(text)) {
    return { column: 'inprogress', priority: null, reason: 'keyword: fix/bug/error' };
  }
  if (/\b(research|learn|investigate)\b/.test(text)) {
    return { column: 'review', priority: null, reason: 'keyword: research/learn/investigate' };
  }
  if (/\b(buy|purchase|order)\b/.test(text)) {
    return { column: 'todo', priority: 'high', reason: 'keyword: buy/purchase/order' };
  }
  if (/\b(email|call|contact)\b/.test(text)) {
    return { column: 'todo', priority: null, reason: 'keyword: email/call/contact' };
  }

  return { column: null, priority: null, reason: null };
}

function levenshteinDistance(a, b) {
  if (a === b) return 0;
  const matrix = Array.from({ length: a.length + 1 }, () => []);
  for (let i = 0; i <= a.length; i++) matrix[i][0] = i;
  for (let j = 0; j <= b.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }
  return matrix[a.length][b.length];
}

function similarityScore(a, b) {
  const tokensA = tokenize(a);
  const tokensB = tokenize(b);
  if (tokensA.length === 0 || tokensB.length === 0) return 0;

  const setA = new Set(tokensA);
  const setB = new Set(tokensB);
  const intersection = [...setA].filter(token => setB.has(token)).length;
  const union = new Set([...setA, ...setB]).size || 1;
  const jaccard = intersection / union;

  const normA = normalizeText(a);
  const normB = normalizeText(b);
  const distance = levenshteinDistance(normA, normB);
  const maxLen = Math.max(normA.length, normB.length) || 1;
  const levenshteinScore = 1 - distance / maxLen;

  return (jaccard * 0.6) + (levenshteinScore * 0.4);
}

function flattenTasks(tasks) {
  const columns = ['todo', 'inprogress', 'review', 'completed'];
  const flat = [];
  columns.forEach(column => {
    (tasks[column] || []).forEach(task => {
      flat.push({ ...task, column });
    });
  });
  return flat;
}

function detectDuplicateTasks(tasks, options = {}) {
  const { threshold = 0.82 } = options;
  const flat = flattenTasks(tasks);
  const duplicates = [];

  for (let i = 0; i < flat.length; i++) {
    for (let j = i + 1; j < flat.length; j++) {
      const titleA = flat[i].title || '';
      const titleB = flat[j].title || '';
      const score = similarityScore(titleA, titleB);
      if (score >= threshold) {
        duplicates.push({
          taskA: flat[i],
          taskB: flat[j],
          score: Number(score.toFixed(3))
        });
      }
    }
  }

  return duplicates;
}

function generateSmartSuggestions(tasks, options = {}) {
  const now = options.now || new Date();
  const inProgressStaleDays = options.inProgressStaleDays || 5;
  const completedWindowDays = options.completedWindowDays || 14;
  const suggestions = [];

  const inProgressThreshold = inProgressStaleDays * 24 * 60 * 60 * 1000;
  (tasks.inprogress || []).forEach(task => {
    const created = new Date(task.created);
    if (!Number.isNaN(created.getTime()) && (now - created) > inProgressThreshold) {
      suggestions.push({
        type: 'breakdown',
        task,
        suggestion: `Consider breaking down "${task.title}" into smaller tasks.`
      });
    }
  });

  const similar = detectDuplicateTasks(tasks, { threshold: 0.75 });
  if (similar.length > 0) {
    suggestions.push({
      type: 'consolidation',
      count: similar.length,
      suggestion: 'Multiple tasks look similar. Consider consolidating or merging them.',
      matches: similar
    });
  }

  const completedThreshold = completedWindowDays * 24 * 60 * 60 * 1000;
  (tasks.completed || []).forEach(task => {
    const completedAt = new Date(task.completed || task.updated || task.created);
    if (!Number.isNaN(completedAt.getTime()) && (now - completedAt) <= completedThreshold) {
      suggestions.push({
        type: 'next-action',
        task,
        suggestion: `Follow up on "${task.title}" (verify results or capture learnings).`
      });
    }
  });

  return suggestions;
}

function detectTaskTemplates(tasks, options = {}) {
  const minCount = options.minCount || 2;
  const templates = [
    { regex: /^call\s+(.+)/i, template: 'Call {person} about {topic}' },
    { regex: /^email\s+(.+)/i, template: 'Email {person} about {topic}' },
    { regex: /^contact\s+(.+)/i, template: 'Contact {person} about {topic}' },
    { regex: /^buy\s+(.+)/i, template: 'Buy {item}' },
    { regex: /^purchase\s+(.+)/i, template: 'Purchase {item}' },
    { regex: /^order\s+(.+)/i, template: 'Order {item}' },
    { regex: /^fix\s+(.+)/i, template: 'Fix {issue}' },
    { regex: /^investigate\s+(.+)/i, template: 'Investigate {issue}' },
    { regex: /^research\s+(.+)/i, template: 'Research {topic}' }
  ];

  const counts = new Map();
  const examples = new Map();
  const flat = flattenTasks(tasks);

  flat.forEach(task => {
    const title = (task.title || '').trim();
    templates.forEach(({ regex, template }) => {
      if (regex.test(title)) {
        counts.set(template, (counts.get(template) || 0) + 1);
        if (!examples.has(template)) {
          examples.set(template, [title]);
        } else if (examples.get(template).length < 3) {
          examples.get(template).push(title);
        }
      }
    });
  });

  const suggestions = [];
  counts.forEach((count, template) => {
    if (count >= minCount) {
      suggestions.push({
        template,
        count,
        examples: examples.get(template) || []
      });
    }
  });

  return suggestions;
}

// Print usage summary
function printUsageSummary(stats) {
  if (!stats) return;
  
  logSection('MODEL USAGE SUMMARY');
  log(`📊 Daily Tokens Used: ${stats.totalDailyUsed.toLocaleString()}`, 'cyan');
  const spentStr = typeof stats.totalMonthlySpent === 'number' ? `$${stats.totalMonthlySpent.toFixed(2)}` : stats.totalMonthlySpent;
  const budgetStr = typeof stats.totalBudget === 'number' ? `$${stats.totalBudget.toFixed(2)}` : stats.totalBudget;
  log(`💰 Monthly Spent: ${spentStr} / ${budgetStr}`, 'cyan');
  const remainingStr = typeof stats.remainingBudget === 'number' ? `$${stats.remainingBudget.toFixed(2)}` : stats.remainingBudget;
  const remainingVal = typeof stats.remainingBudget === 'number' ? stats.remainingBudget : 0;
  log(`💵 Remaining Budget: ${remainingStr}`, remainingVal < 20 ? 'yellow' : 'green');
  log(`🤖 Active Models: ${stats.models}`, 'cyan');
  log(`🕐 Last Updated: ${new Date(stats.lastUpdated).toLocaleString()}`, 'dim');
}

// Update service status
async function updateServiceStatus(serviceId, status = 'online') {
  try {
    const SERVICE_STATUS_FILE = path.join(__dirname, '..', 'data', 'service-status.json');
    const data = await fs.readFile(SERVICE_STATUS_FILE, 'utf8');
    const serviceStatus = JSON.parse(data);
    
    const service = serviceStatus.services.find(s => s.id === serviceId);
    if (service) {
      service.status = status;
      service.lastRecovery = new Date().toISOString();
      service.uptimeStarted = new Date().toISOString();
      serviceStatus.lastUpdated = new Date().toISOString();
      await fs.writeFile(SERVICE_STATUS_FILE, JSON.stringify(serviceStatus, null, 2));
    }
  } catch (error) {
    // Silently fail - not critical
  }
}

// Main sync function
async function sync() {
  // Update service status to show we're running
  await updateServiceStatus('kanban-sync', 'online');

  log('', 'reset');
  log('════════════════════════════════════════', 'bright');
  log('   🤖 MARVIN\'S KANBAN SYNC', 'bright');
  log('   ' + new Date().toLocaleString(), 'dim');
  log('════════════════════════════════════════', 'bright');
  
  // Check server status
  const serverRunning = await checkServer();
  logSection('SERVER STATUS');
  if (serverRunning) {
    log('✅ Dashboard server is running on port 3001', 'green');
  } else {
    log('⚠️  Dashboard server is NOT running on port 3001', 'yellow');
    log('   Start with: cd marvin-dash && npm start', 'dim');
  }
  
  // Load and process tasks
  const tasks = await loadTasks();
  if (!tasks) {
    process.exit(1);
  }
  
  // Print current state
  printKanbanSummary(tasks);
  
  // Auto-update tasks
  const { moved, updated } = await autoUpdateTasks(tasks);
  
  // Save if changes were made
  if (moved > 0 || updated > 0) {
    const saved = await saveTasks(tasks);
    if (saved) {
      log('✅ Changes saved successfully', 'green');
    }
  }
  
  // Get usage stats
  const usageStats = await getUsageStats();
  printUsageSummary(usageStats);
  
  logSection('SYNC COMPLETE');
  log('Next sync in 30 minutes', 'dim');
  log('', 'reset');
}

// Run if called directly
if (require.main === module) {
  sync().catch(error => {
    console.error('Sync failed:', error);
    process.exit(1);
  });
}

module.exports = {
  sync,
  loadTasks,
  saveTasks,
  checkServer,
  determineTaskPriority,
  autoCategorizeTask,
  detectDuplicateTasks,
  generateSmartSuggestions,
  detectTaskTemplates
};
