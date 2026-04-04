#!/usr/bin/env node
/**
 * Automation Dashboard Data Generator
 * Generates JSON data for Marvin Dashboard integration
 * 
 * Usage:
 *   node dashboard-data.js
 *   node dashboard-data.js --output ../../marvin-dash/data/automation-status.json
 */

const fs = require('fs').promises;
const path = require('path');
const { getPoolStats } = require('./shared-chrome-connector-v2');
const { getAutomationStatus } = require('./automation-api');

const DEFAULT_OUTPUT = path.join(__dirname, '..', '..', 'marvin-dash', 'data', 'automation-status.json');

async function generateDashboardData() {
  const timestamp = new Date().toISOString();
  
  // Gather all status information
  const [poolStats, autoStatus, hebProgress, emailState] = await Promise.all([
    getPoolStatsSafe(),
    getAutomationStatus(),
    getHEBProgress(),
    getEmailState()
  ]);
  
  // Load recipe count
  let recipeCount = 0;
  try {
    const recipeData = await fs.readFile(
      path.join(__dirname, '..', 'data', 'recipe-database.json'),
      'utf8'
    );
    const recipes = JSON.parse(recipeData);
    recipeCount = Object.keys(recipes.recipes || {}).length;
  } catch (e) {}
  
  // Load weekly plan
  let weeklyPlan = null;
  try {
    const planData = await fs.readFile(
      path.join(__dirname, '..', 'data', 'weekly-plan.json'),
      'utf8'
    );
    weeklyPlan = JSON.parse(planData);
  } catch (e) {}
  
  // Calculate health score
  const healthScore = calculateHealthScore({
    chromeRunning: autoStatus.chromeRunning,
    poolStats,
    emailState,
    hebProgress
  });
  
  const dashboardData = {
    generated: timestamp,
    health: {
      score: healthScore,
      status: healthScore > 80 ? 'healthy' : healthScore > 50 ? 'degraded' : 'critical',
      chromeRunning: autoStatus.chromeRunning,
      lastEmail: emailState?.lastSent || null,
      pendingConfirmation: emailState?.pendingConfirmation || false
    },
    pool: poolStats,
    meals: {
      thisWeek: weeklyPlan?.meals?.length || 0,
      totalRecipes: recipeCount,
      weekOf: weeklyPlan?.weekOf || null,
      budget: weeklyPlan?.budget || null
    },
    heb: {
      completed: hebProgress?.completed?.length || 0,
      failed: hebProgress?.failed?.length || 0,
      total: hebProgress?.total || 0,
      percentComplete: hebProgress?.total > 0 
        ? Math.round((hebProgress.completed.length / hebProgress.total) * 100) 
        : 0
    },
    tasks: generateTaskList({ autoStatus, emailState, hebProgress })
  };
  
  return dashboardData;
}

async function getPoolStatsSafe() {
  try {
    return getPoolStats();
  } catch (e) {
    return { total: 0, inUse: 0, available: 0, idle: 0, error: e.message };
  }
}

async function getHEBProgress() {
  try {
    const progressData = await fs.readFile(
      path.join(__dirname, '..', 'data', 'cache', 'heb-progress.json'),
      'utf8'
    );
    const progress = JSON.parse(progressData);
    
    // Get total items
    const itemsData = await fs.readFile(
      path.join(__dirname, '..', 'data', 'heb-extension-items.json'),
      'utf8'
    );
    const { items } = JSON.parse(itemsData);
    
    return {
      ...progress,
      total: items.length
    };
  } catch (e) {
    return { completed: [], failed: [], total: 0 };
  }
}

async function getEmailState() {
  try {
    const data = await fs.readFile(
      path.join(__dirname, '..', 'data', 'dinner-email-state.json'),
      'utf8'
    );
    return JSON.parse(data);
  } catch (e) {
    return null;
  }
}

function calculateHealthScore(components) {
  let score = 100;
  
  if (!components.chromeRunning) score -= 40;
  if (components.poolStats?.inUse > components.poolStats?.total * 0.8) score -= 10;
  if (components.emailState?.pendingConfirmation) score -= 5;
  if (components.hebProgress?.failed?.length > 0) score -= 5;
  
  return Math.max(0, score);
}

function generateTaskList({ autoStatus, emailState, hebProgress }) {
  const tasks = [];
  
  if (!autoStatus.chromeRunning) {
    tasks.push({
      priority: 'high',
      task: 'Restart Chrome',
      action: 'node launch-shared-chrome.js',
      status: 'blocked'
    });
  }
  
  if (emailState?.pendingConfirmation) {
    tasks.push({
      priority: 'medium',
      task: 'Check email replies',
      action: 'node dinner-email-system.js --check-reply',
      status: 'pending'
    });
  }
  
  if (hebProgress?.total > 0 && hebProgress.completed.length < hebProgress.total) {
    tasks.push({
      priority: 'medium',
      task: `Complete HEB cart (${hebProgress.completed.length}/${hebProgress.total})`,
      action: 'node heb-cart-v3.js --resume',
      status: 'in-progress'
    });
  }
  
  // Add scheduled tasks
  const now = new Date();
  const dayOfWeek = now.getDay();
  const hour = now.getHours();
  
  if (dayOfWeek === 6 && hour >= 9 && !emailState?.lastSent) {
    tasks.push({
      priority: 'high',
      task: 'Send weekly dinner plan email',
      action: 'node dinner-email-system.js --send-test',
      status: 'scheduled'
    });
  }
  
  return tasks.sort((a, b) => {
    const priorities = { high: 3, medium: 2, low: 1 };
    return priorities[b.priority] - priorities[a.priority];
  });
}

async function main() {
  const args = process.argv.slice(2);
  const outputArg = args.find(a => a.startsWith('--output='));
  const outputPath = outputArg ? outputArg.split('=')[1] : DEFAULT_OUTPUT;
  
  console.log('📊 Generating dashboard data...');
  
  try {
    const data = await generateDashboardData();
    
    // Ensure directory exists
    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    
    // Write data
    await fs.writeFile(outputPath, JSON.stringify(data, null, 2));
    
    console.log('✅ Dashboard data generated');
    console.log(`   Output: ${outputPath}`);
    console.log(`   Health Score: ${data.health.score}/100 (${data.health.status})`);
    console.log(`   Chrome: ${data.health.chromeRunning ? '✅ Running' : '❌ Down'}`);
    console.log(`   Meals this week: ${data.meals.thisWeek}`);
    console.log(`   HEB Progress: ${data.heb.percentComplete}%`);
    console.log(`   Active Tasks: ${data.tasks.length}`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { generateDashboardData, calculateHealthScore };
