#!/usr/bin/env node
/**
 * HEB Cart Automation Wrapper
 * Ensures browser cleanup before/after and limits concurrent tabs
 */

const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

async function runWithCleanup() {
  console.log('🧹 Pre-flight cleanup...');
  
  // Kill any existing browser processes
  try {
    await execPromise('taskkill /F /IM msedge.exe /T 2>&1');
    console.log('  ✅ Cleaned up Edge processes');
  } catch {
    // No Edge running
  }
  
  try {
    await execPromise('taskkill /F /IM chrome.exe /T 2>&1');
    console.log('  ✅ Cleaned up Chrome processes');
  } catch {
    // No Chrome running
  }
  
  // Wait for processes to terminate
  await new Promise(r => setTimeout(r, 3000));
  
  console.log('\n🚀 Starting HEB Cart Automation...\n');
  
  // Run the actual automation
  const script = require('./heb-add-cart.js');
  
  // The script exports nothing, it runs immediately
  // Wait for it to complete
  await new Promise(r => setTimeout(r, 5000));
  
  console.log('\n🧹 Post-flight cleanup...');
  
  // Cleanup after
  try {
    await execPromise('taskkill /F /IM msedge.exe /T 2>&1');
    console.log('  ✅ Cleaned up Edge processes');
  } catch {}
  
  console.log('✨ Complete!');
}

// Check if we should limit tabs
process.env.PLAYWRIGHT_MAX_CONTEXTS = '1';
process.env.PLAYWRIGHT_MAX_PAGES = '2';

runWithCleanup().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
