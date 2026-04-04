#!/usr/bin/env node
/**
 * IMAP Email Reply Processor - Real Email Monitoring
 * 
 * Connects to iCloud IMAP, checks for dinner plan replies,
 * parses them, and automatically applies changes.
 * 
 * Usage:
 *   node imap-reply-processor.js           # Check emails once
 *   node imap-reply-processor.js --daemon  # Run continuously
 *   node imap-reply-processor.js --since 10m  # Check last 10 minutes
 */

const fs = require('fs').promises;
const path = require('path');
const { execSync } = require('child_process');

const WORKSPACE_DIR = path.join(__dirname, '..', '..');
const DINNER_DATA_DIR = path.join(__dirname, '..', 'data');
const CREDENTIALS_FILE = path.join(WORKSPACE_DIR, '.secrets', 'icloud-credentials.json');
const EMAIL_STATE_FILE = path.join(DINNER_DATA_DIR, 'dinner-email-state.json');
const PROCESSED_REPLIES_FILE = path.join(DINNER_DATA_DIR, 'processed-email-replies.json');

/**
 * Load iCloud credentials
 */
async function loadCredentials() {
  try {
    const data = await fs.readFile(CREDENTIALS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('❌ Could not load credentials:', error.message);
    return null;
  }
}

/**
 * Load email state
 */
async function loadEmailState() {
  try {
    const data = await fs.readFile(EMAIL_STATE_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    return { lastSent: null, lastReply: null, pendingConfirmation: false };
  }
}

/**
 * Save email state
 */
async function saveEmailState(state) {
  await fs.writeFile(EMAIL_STATE_FILE, JSON.stringify(state, null, 2));
}

/**
 * Load processed reply IDs
 */
async function loadProcessedReplies() {
  try {
    const data = await fs.readFile(PROCESSED_REPLIES_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    return { processedIds: [], lastCheck: null };
  }
}

/**
 * Save processed reply IDs
 */
async function saveProcessedReplies(data) {
  await fs.writeFile(PROCESSED_REPLIES_FILE, JSON.stringify(data, null, 2));
}

/**
 * Fetch emails from iCloud using curl IMAP
 */
async function fetchEmails(credentials, sinceMinutes = 60) {
  console.log('📧 Connecting to iCloud IMAP...');
  
  const sinceDate = new Date(Date.now() - sinceMinutes * 60 * 1000);
  // IMAP date format: DD-Mon-YYYY (e.g., 10-Feb-2026)
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const sinceStr = `${String(sinceDate.getDate()).padStart(2, '0')}-${months[sinceDate.getMonth()]}-${sinceDate.getFullYear()}`;
  
  try {
    // Search for recent emails from alex@1v1a.com
    const searchCmd = `curl -s --url "imaps://imap.mail.me.com:993/INBOX" \
      --user "${credentials.email}:${credentials.app_specific_password}" \
      --request "SEARCH SINCE ${sinceStr} FROM alex@1v1a.com"`;
    
    const searchResult = execSync(searchCmd, { encoding: 'utf8', timeout: 30000 });
    console.log('Search result:', searchResult);
    
    // Parse message IDs
    const match = searchResult.match(/\* SEARCH (.+)/);
    if (!match) {
      console.log('ℹ️ No new emails found');
      return [];
    }
    
    const messageIds = match[1].trim().split(' ').filter(id => id);
    console.log(`📨 Found ${messageIds.length} recent email(s)`);
    
    const emails = [];
    for (const msgId of messageIds) {
      try {
        // Fetch email headers and body
        const fetchCmd = `curl -s --url "imaps://imap.mail.me.com:993/INBOX;UID=${msgId}" \
          --user "${credentials.email}:${credentials.app_specific_password}" \
          --request "FETCH ${msgId} (BODY[HEADER.FIELDS (FROM SUBJECT DATE MESSAGE-ID)])"`;
        
        const headers = execSync(fetchCmd, { encoding: 'utf8', timeout: 30000 });
        
        // Fetch body text
        const bodyCmd = `curl -s --url "imaps://imap.mail.me.com:993/INBOX;UID=${msgId}" \
          --user "${credentials.email}:${credentials.app_specific_password}" \
          --request "FETCH ${msgId} BODY[TEXT]"`;
        
        const body = execSync(bodyCmd, { encoding: 'utf8', timeout: 30000 });
        
        const email = parseEmail(headers, body, msgId);
        if (email) emails.push(email);
      } catch (e) {
        console.error(`⚠️ Failed to fetch message ${msgId}:`, e.message);
      }
    }
    
    return emails;
  } catch (error) {
    console.error('❌ IMAP fetch failed:', error.message);
    return [];
  }
}

/**
 * Parse email from IMAP response
 */
function parseEmail(headers, body, msgId) {
  const fromMatch = headers.match(/From: (.+)/i);
  const subjectMatch = headers.match(/Subject: (.+)/i);
  const dateMatch = headers.match(/Date: (.+)/i);
  const messageIdMatch = headers.match(/Message-ID: (.+)/i);
  
  if (!fromMatch) return null;
  
  // Clean up body (remove IMAP response formatting)
  const cleanBody = body
    .replace(/\* \d+ FETCH \(BODY\[TEXT\] \{\d+\}\r?\n/, '')
    .replace(/\)\r?\n.*$/, '')
    .replace(/=\r?\n/g, '')
    .trim();
  
  return {
    id: messageIdMatch ? messageIdMatch[1].trim() : msgId,
    imapId: msgId,
    from: fromMatch[1].trim(),
    subject: subjectMatch ? subjectMatch[1].trim() : 'No Subject',
    date: dateMatch ? dateMatch[1].trim() : new Date().toISOString(),
    body: cleanBody.substring(0, 2000)
  };
}

/**
 * Check if email is a dinner plan reply
 */
function isDinnerReply(email) {
  // Must be from Alexander
  if (!email.from.includes('alex@1v1a.com') && !email.from.includes('alexander')) {
    return false;
  }
  
  // Check subject for dinner-related keywords
  const subjectLower = email.subject.toLowerCase();
  const isRelevant = 
    subjectLower.includes('dinner') ||
    subjectLower.includes('meal') ||
    subjectLower.includes('plan') ||
    subjectLower.includes('re:') ||
    subjectLower.includes('food') ||
    subjectLower.includes('recipe');
  
  return isRelevant;
}

/**
 * Parse email body for dinner plan changes
 */
function parseReplyForChanges(body) {
  const changes = [];
  const lowerBody = body.toLowerCase();
  
  // Check for confirmation
  if (lowerBody.includes('looks good') || 
      lowerBody.includes('confirmed') || 
      lowerBody.includes('approve') ||
      lowerBody.includes('sounds good') ||
      lowerBody.includes('yes') ||
      lowerBody.includes('ok')) {
    changes.push({ action: 'confirm' });
    return changes;
  }
  
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  
  for (const day of days) {
    // Pattern: "swap monday to chicken alfredo"
    const swapPattern = new RegExp(`swap\\s+${day}\\s+(?:to|with|for)\\s+(.+?)(?:\\.|$|\\n)`, 'i');
    const swapMatch = body.match(swapPattern);
    if (swapMatch) {
      changes.push({
        action: 'swap',
        day: day.charAt(0).toUpperCase() + day.slice(1),
        newMeal: swapMatch[1].trim()
      });
    }
    
    // Pattern: "remove monday dinner"
    const removePattern = new RegExp(`remove\\s+${day}(?:\\s+dinner)?`, 'i');
    if (removePattern.test(body)) {
      changes.push({
        action: 'remove',
        day: day.charAt(0).toUpperCase() + day.slice(1)
      });
    }
    
    // Pattern: "add sunday: spaghetti carbonara"
    const addPattern = new RegExp(`add\\s+${day}[:\\s]+(.+?)(?:\\.|$|\\n)`, 'i');
    const addMatch = body.match(addPattern);
    if (addMatch) {
      changes.push({
        action: 'add',
        day: day.charAt(0).toUpperCase() + day.slice(1),
        newMeal: addMatch[1].trim()
      });
    }
  }
  
  // Pattern: "exclude X" or "don't buy X" or "we have X" → temporary exclusions
  const excludePatterns = [
    /exclude[d]?\s*:\s*(.+?)(?:\n|$)/i,
    /don't buy\s*:\s*(.+?)(?:\n|$)/i,
    /don't need\s*:\s*(.+?)(?:\n|$)/i,
    /skip\s*:\s*(.+?)(?:\n|$)/i
  ];
  
  for (const pattern of excludePatterns) {
    const match = body.match(pattern);
    if (match) {
      const items = match[1].split(/,\s*|\s+and\s+/).map(s => s.trim()).filter(s => s);
      items.forEach(item => {
        changes.push({
          action: 'exclude_weekly',
          item: item
        });
      });
    }
  }
  
  // Pattern: "add to stock: X" or "permanent stock: X" or "we always have X"
  const stockPatterns = [
    /add to stock\s*:\s*(.+?)(?:\n|$)/i,
    /permanent stock\s*:\s*(.+?)(?:\n|$)/i,
    /we always have\s*:\s*(.+?)(?:\n|$)/i,
    /in stock\s*:\s*(.+?)(?:\n|$)/i
  ];
  
  for (const pattern of stockPatterns) {
    const match = body.match(pattern);
    if (match) {
      const items = match[1].split(/,\s*|\s+and\s+/).map(s => s.trim()).filter(s => s);
      items.forEach(item => {
        changes.push({
          action: 'add_to_stock',
          item: item
        });
      });
    }
  }
  
  return changes;
}

/**
 * Load stock lists
 */
async function loadStockLists() {
  const longTermStockFile = path.join(DINNER_DATA_DIR, 'long-term-stock.json');
  const weeklyExclusionsFile = path.join(DINNER_DATA_DIR, 'weekly-exclusions.json');
  
  let longTermStock = { categories: { pantry: [], spices: [], produce: [], condiments_and_sauces: [] } };
  let weeklyExclusions = { items: [] };
  
  try {
    const data = await fs.readFile(longTermStockFile, 'utf8');
    longTermStock = JSON.parse(data);
  } catch (e) {
    // Use defaults
  }
  
  try {
    const data = await fs.readFile(weeklyExclusionsFile, 'utf8');
    weeklyExclusions = JSON.parse(data);
  } catch (e) {
    // Use defaults
  }
  
  return { longTermStock, weeklyExclusions };
}

/**
 * Save stock lists
 */
async function saveStockLists(longTermStock, weeklyExclusions) {
  const longTermStockFile = path.join(DINNER_DATA_DIR, 'long-term-stock.json');
  const weeklyExclusionsFile = path.join(DINNER_DATA_DIR, 'weekly-exclusions.json');
  
  await fs.writeFile(longTermStockFile, JSON.stringify(longTermStock, null, 2));
  await fs.writeFile(weeklyExclusionsFile, JSON.stringify(weeklyExclusions, null, 2));
}

/**
 * Apply changes to dinner plan
 */
async function applyChanges(changes) {
  console.log('\n🔄 Applying changes to dinner plan...');
  
  const planFile = path.join(DINNER_DATA_DIR, 'weekly-plan.json');
  const planData = await fs.readFile(planFile, 'utf8');
  const plan = JSON.parse(planData);
  
  const { longTermStock, weeklyExclusions } = await loadStockLists();
  
  const appliedChanges = [];
  let stockUpdated = false;
  
  for (const change of changes) {
    switch (change.action) {
      case 'swap':
        const mealIndex = plan.meals.findIndex(m => m.day === change.day);
        if (mealIndex >= 0) {
          const oldMeal = plan.meals[mealIndex].name;
          plan.meals[mealIndex].name = change.newMeal;
          plan.meals[mealIndex].status = 'modified';
          appliedChanges.push(`Swapped ${change.day}: ${oldMeal} → ${change.newMeal}`);
        }
        break;
        
      case 'remove':
        const removeIndex = plan.meals.findIndex(m => m.day === change.day);
        if (removeIndex >= 0) {
          const removedMeal = plan.meals[removeIndex].name;
          plan.meals[removeIndex].status = 'removed';
          appliedChanges.push(`Removed ${change.day}: ${removedMeal}`);
        }
        break;
        
      case 'exclude_weekly':
        // Add to weekly exclusions (temporary - resets each week)
        if (!weeklyExclusions.items.find(i => i.name.toLowerCase() === change.item.toLowerCase())) {
          weeklyExclusions.items.push({
            name: change.item,
            addedDate: new Date().toISOString().split('T')[0],
            source: 'email_reply'
          });
          appliedChanges.push(`Excluded from this week: ${change.item}`);
          stockUpdated = true;
        }
        break;
        
      case 'add_to_stock':
        // Add to permanent stock
        const category = 'pantry'; // Default category
        if (!longTermStock.categories[category]) {
          longTermStock.categories[category] = [];
        }
        if (!longTermStock.categories[category].find(i => i.name.toLowerCase() === change.item.toLowerCase())) {
          longTermStock.categories[category].push({
            name: change.item,
            notes: 'Added via email reply',
            stockLevel: 'medium',
            addedDate: new Date().toISOString().split('T')[0]
          });
          appliedChanges.push(`Added to permanent stock: ${change.item}`);
          stockUpdated = true;
        }
        break;
        
      case 'confirm':
        appliedChanges.push('Confirmed all meals');
        break;
    }
  }
  
  await fs.writeFile(planFile, JSON.stringify(plan, null, 2));
  
  // Save stock lists if updated
  if (stockUpdated) {
    await saveStockLists(longTermStock, weeklyExclusions);
    console.log('📦 Stock lists updated');
  }
  
  console.log('✅ Changes applied:');
  appliedChanges.forEach(c => console.log(`   • ${c}`));
  
  return { success: true, changes: appliedChanges, plan, stockUpdated };
}

/**
 * Sync to all systems
 */
async function syncToAllSystems() {
  console.log('\n🔄 Syncing to all systems...');
  
  // Step 1: Regenerate HEB shopping list with updated stock exclusions
  console.log('🛒 Regenerating HEB shopping list with stock exclusions...');
  try {
    execSync('node generate-heb-items.js', {
      cwd: __dirname,
      stdio: 'inherit'
    });
    console.log('✅ HEB shopping list regenerated');
  } catch (e) {
    console.log('⚠️ HEB list generation had issues:', e.message);
  }
  
  // Step 2: Sync to calendar
  console.log('📅 Syncing to Apple Calendar...');
  try {
    execSync('node sync-dinner-to-icloud.js', {
      cwd: __dirname,
      stdio: 'inherit'
    });
  } catch (e) {
    console.log('⚠️ Calendar sync had issues');
  }
  
  // Step 3: Update HEB cart
  console.log('🛒 Updating HEB cart...');
  try {
    execSync('node update-heb-meal-plan.js', {
      cwd: __dirname,
      stdio: 'inherit'
    });
  } catch (e) {
    console.log('⚠️ HEB cart update had issues');
  }
  
  // Step 4: Send confirmation email
  console.log('📧 Sending confirmation email...');
  try {
    execSync('node send-confirmation.js', {
      cwd: __dirname,
      stdio: 'inherit'
    });
  } catch (e) {
    console.log('⚠️ Confirmation email had issues');
  }
}

/**
 * Send confirmation email
 */
async function sendConfirmationEmail(changes) {
  console.log('\n📧 Sending confirmation email...');
  
  const confirmationBody = `
Your dinner plan changes have been applied and synced!

Changes made:
${changes.map(c => `• ${c}`).join('\n')}

✅ Apple Calendar updated
✅ HEB cart updated
✅ Meal plan confirmed

— Marvin Maverick
Alex's Assistant | Logistics Coordinator | Professional Overthinker

"Brain the size of a planet, and I'm asked to write an email."
`;
  
  // Save confirmation for send-email.js
  const confirmFile = path.join(DINNER_DATA_DIR, 'confirmation-to-send.txt');
  await fs.writeFile(confirmFile, confirmationBody);
  
  console.log('✅ Confirmation saved');
}

/**
 * Process dinner plan replies
 */
async function processReplies(options = {}) {
  const sinceMinutes = options.since || 60;
  
  console.log(`📧 Checking for dinner plan replies (last ${sinceMinutes} minutes)...\n`);
  
  const credentials = await loadCredentials();
  if (!credentials) {
    console.error('❌ Cannot process replies without credentials');
    return { success: false };
  }
  
  const state = await loadEmailState();
  const processed = await loadProcessedReplies();
  
  if (!state.pendingConfirmation) {
    console.log('ℹ️ No pending dinner plan confirmation');
    return { success: false, reason: 'no_pending' };
  }
  
  // Fetch emails
  const emails = await fetchEmails(credentials, sinceMinutes);
  
  if (emails.length === 0) {
    console.log('⏳ No new replies found');
    return { success: false, reason: 'no_emails' };
  }
  
  let processedCount = 0;
  
  for (const email of emails) {
    // Skip already processed
    if (processed.processedIds.includes(email.id)) {
      console.log(`⏩ Skipping already processed: ${email.subject}`);
      continue;
    }
    
    // Check if it's a dinner reply
    if (!isDinnerReply(email)) {
      console.log(`⏩ Not a dinner reply: ${email.subject}`);
      processed.processedIds.push(email.id);
      continue;
    }
    
    console.log(`\n📥 Processing dinner reply:`);
    console.log(`   From: ${email.from}`);
    console.log(`   Subject: ${email.subject}`);
    console.log(`   Date: ${email.date}`);
    
    // Parse for changes
    const changes = parseReplyForChanges(email.body);
    
    if (changes.length === 0) {
      console.log('   ⚠️ No actionable changes detected');
      processed.processedIds.push(email.id);
      continue;
    }
    
    console.log(`   Changes detected: ${changes.length}`);
    
    // Apply changes
    const result = await applyChanges(changes);
    
    if (result.success) {
      // Sync to all systems
      await syncToAllSystems();
      
      // Send confirmation
      await sendConfirmationEmail(result.changes);
      
      // Update state
      state.lastReply = new Date().toISOString();
      state.pendingConfirmation = false;
      await saveEmailState(state);
      
      // Mark as processed
      processed.processedIds.push(email.id);
      processed.lastCheck = new Date().toISOString();
      
      processedCount++;
      console.log('\n✅ Reply processed successfully!');
    }
  }
  
  await saveProcessedReplies(processed);
  
  return { 
    success: processedCount > 0, 
    processed: processedCount,
    totalEmails: emails.length
  };
}

/**
 * Main function
 */
async function main() {
  const args = process.argv.slice(2);
  const options = {};
  
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--since':
        options.since = parseInt(args[++i]);
        break;
      case '--daemon':
        options.daemon = true;
        break;
    }
  }
  
  if (options.daemon) {
    console.log('👻 Starting IMAP reply processor daemon...');
    console.log('   Checking every 5 minutes\n');
    
    // Initial check
    await processReplies(options);
    
    // Schedule checks
    setInterval(async () => {
      await processReplies(options);
    }, 5 * 60 * 1000); // Every 5 minutes
    
  } else {
    const result = await processReplies(options);
    
    if (result.success) {
      console.log('\n✅ Processing complete!');
    } else if (result.reason === 'no_pending') {
      console.log('\nℹ️ No pending confirmation to process');
    } else if (result.reason === 'no_emails') {
      console.log('\n⏳ No new replies found');
    } else {
      console.log('\n⚠️ No actionable replies found');
    }
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { processReplies, fetchEmails, parseReplyForChanges };
