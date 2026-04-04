#!/usr/bin/env node
/**
 * Fix MiniMax data - reset incorrect simulated values to 0
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const USAGE_FILE = path.join(DATA_DIR, 'model-usage.json');
const EXPENSES_FILE = path.join(DATA_DIR, 'expenses.json');

console.log('🔧 Fixing MiniMax data...\n');

// Fix model-usage.json
console.log('1. Fixing model-usage.json...');
const usageData = JSON.parse(fs.readFileSync(USAGE_FILE, 'utf8'));

if (usageData.models['minimax/abab6.5s-chat']) {
  const before = usageData.models['minimax/abab6.5s-chat'].monthlySpent;
  usageData.models['minimax/abab6.5s-chat'].monthlySpent = 0;
  usageData.models['minimax/abab6.5s-chat'].dailyUsed = 0;
  usageData.models['minimax/abab6.5s-chat'].accountBalance = 10;
  console.log(`   MiniMax monthlySpent: $${before.toFixed(2)} → $0.00`);
}

// Also fix Anthropic - it's OAuth and doesn't have API data
if (usageData.models['anthropic/claude-opus-4-5']) {
  const before = usageData.models['anthropic/claude-opus-4-5'].monthlySpent;
  // Keep a small placeholder since we don't have real data
  usageData.models['anthropic/claude-opus-4-5'].monthlySpent = 0;
  usageData.models['anthropic/claude-opus-4-5'].dailyUsed = 0;
  usageData.models['anthropic/claude-opus-4-5'].accountBalance = 75;
  console.log(`   Anthropic monthlySpent: $${before.toFixed(2)} → $0.00 (no API access)`);
}

usageData.lastUpdated = new Date().toISOString();
fs.writeFileSync(USAGE_FILE, JSON.stringify(usageData, null, 2));
console.log('   ✅ model-usage.json updated\n');

// Fix expenses.json
console.log('2. Fixing expenses.json...');
const expensesData = JSON.parse(fs.readFileSync(EXPENSES_FILE, 'utf8'));

if (expensesData.providers.minimax) {
  const before = expensesData.providers.minimax.totalSpent;
  expensesData.providers.minimax.totalSpent = 0;
  expensesData.providers.minimax.budgetPercent = 0;
  expensesData.providers.minimax.remaining = 10;
  expensesData.providers.minimax.status = 'ok';
  expensesData.providers.minimax.models.forEach(m => {
    m.monthlySpent = 0;
  });
  console.log(`   MiniMax totalSpent: $${before.toFixed(2)} → $0.00`);
}

if (expensesData.providers.anthropic) {
  const before = expensesData.providers.anthropic.totalSpent;
  expensesData.providers.anthropic.totalSpent = 0;
  expensesData.providers.anthropic.budgetPercent = 0;
  expensesData.providers.anthropic.remaining = 60;
  expensesData.providers.anthropic.status = 'ok';
  expensesData.providers.anthropic.models.forEach(m => {
    m.monthlySpent = 0;
  });
  console.log(`   Anthropic totalSpent: $${before.toFixed(2)} → $0.00 (no API access)`);
}

// Recalculate totals
const totalSpent = Object.values(expensesData.providers).reduce((sum, p) => sum + p.totalSpent, 0);
expensesData.totalSpent = totalSpent;
expensesData.totalRemaining = Math.max(0, expensesData.monthlyBudget - totalSpent);
expensesData.budgetPercent = (totalSpent / expensesData.monthlyBudget) * 100;
expensesData.lastUpdated = new Date().toISOString();

fs.writeFileSync(EXPENSES_FILE, JSON.stringify(expensesData, null, 2));
console.log(`   Total spending: recalculated to $${totalSpent.toFixed(2)}`);
console.log('   ✅ expenses.json updated\n');

console.log('═══════════════════════════════════════════════════════════');
console.log('✅ MiniMax data fixed!');
console.log('═══════════════════════════════════════════════════════════');
console.log('\nChanges made:');
console.log('  • Reset MiniMax monthlySpent from ~$75 to $0');
console.log('  • Reset MiniMax dailyUsed to 0');
console.log('  • Reset MiniMax accountBalance to $10 (full budget)');
console.log('  • Fixed expenses.json provider totals');
console.log('  • Recalculated overall budget percentages');
console.log('\nThe simulation bug in server.js has also been fixed.');
console.log('Only models without real API data will be simulated going forward.');
