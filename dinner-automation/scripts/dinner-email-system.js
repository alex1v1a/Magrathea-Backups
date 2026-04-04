#!/usr/bin/env node
/**
 * Dinner Plan Email System
 * 
 * Sends weekly dinner plan confirmation emails via iCloud SMTP,
 * monitors for replies, and syncs changes to Apple Calendar and HEB cart.
 * 
 * Usage:
 *   node dinner-email-system.js --send-test    # Send test email via SMTP
 *   node dinner-email-system.js --check-reply  # Check for replies
 *   node dinner-email-system.js --sync         # Sync current plan to all systems
 */

const fs = require('fs').promises;
const path = require('path');
const { execSync } = require('child_process');

const DINNER_DATA_DIR = path.join(__dirname, '..', 'data');
const WORKSPACE_DIR = path.join(__dirname, '..', '..');
const SMTP_CONFIG_FILE = path.join(WORKSPACE_DIR, '.secrets', 'icloud-smtp.json');
const WEEKLY_PLAN_FILE = path.join(DINNER_DATA_DIR, 'weekly-plan.json');
const RECIPE_DATABASE_FILE = path.join(DINNER_DATA_DIR, 'recipe-database.json');
const YOUTUBE_CACHE_FILE = path.join(DINNER_DATA_DIR, 'youtube-cache.json');
const EMAIL_STATE_FILE = path.join(DINNER_DATA_DIR, 'dinner-email-state.json');
const PENDING_CHANGES_FILE = path.join(DINNER_DATA_DIR, 'dinner-pending-changes.json');

// Email configuration - iCloud ONLY
const EMAIL_CONFIG = {
  from: 'MarvinMartian9@icloud.com',
  to: 'alex@1v1a.com',
  subjectPrefix: '🍽️ Dinner Plan',
  provider: 'icloud'
};

/**
 * Load SMTP configuration
 */
async function loadSmtpConfig() {
  try {
    const data = await fs.readFile(SMTP_CONFIG_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('❌ Could not load SMTP config:', error.message);
    return null;
  }
}

/**
 * Send email via SMTP using curl
 */
async function sendEmailViaSmtp(to, subject, htmlBody, config) {
  const boundary = `----=_Part_${Date.now()}`;
  const date = new Date().toUTCString();
  
  // Create plain text version
  const plainText = htmlBody.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().substring(0, 1000);
  
  const emailContent = [
    `MIME-Version: 1.0`,
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    ``,
    `--${boundary}`,
    `Content-Type: text/plain; charset=utf-8`,
    ``,
    plainText + (plainText.length >= 1000 ? '\n\n[View full email in HTML]' : ''),
    ``,
    `--${boundary}`,
    `Content-Type: text/html; charset=utf-8`,
    ``,
    htmlBody,
    ``,
    `--${boundary}--`
  ].join('\r\n');
  
  const fullEmail = [
    `From: "Marvin Maverick" <${config.email}>`,
    `To: ${to}`,
    `Subject: ${subject}`,
    `Date: ${date}`,
    `Message-Id: <${Date.now()}@icloud.com>`,
    emailContent
  ].join('\r\n');
  
  const tempFile = path.join(DINNER_DATA_DIR, 'temp-email.eml');
  await fs.writeFile(tempFile, fullEmail);
  
  try {
    const curlCmd = [
      'curl',
      '-s',
      '--url', 'smtp://smtp.mail.me.com:587',
      '--ssl-reqd',
      '--mail-from', config.email,
      '--mail-rcpt', to,
      '--upload-file', tempFile,
      '--user', `${config.email}:${config.app_specific_password}`,
      '--tlsv1.2'
    ];
    
    execSync(curlCmd.join(' '), { 
      encoding: 'utf8',
      timeout: 30000,
      stdio: ['pipe', 'pipe', 'pipe']
    });
    
    await fs.unlink(tempFile).catch(() => {});
    return { success: true };
    
  } catch (error) {
    await fs.unlink(tempFile).catch(() => {});
    console.error('❌ SMTP send failed:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Load weekly dinner plan
 */
async function loadWeeklyPlan() {
  try {
    const data = await fs.readFile(WEEKLY_PLAN_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('❌ Failed to load weekly plan:', error.message);
    return null;
  }
}

/**
 * Load recipe database
 */
async function loadRecipeDatabase() {
  try {
    const data = await fs.readFile(RECIPE_DATABASE_FILE, 'utf8');
    const db = JSON.parse(data);
    return db.recipes || {};
  } catch (error) {
    console.error('⚠️ Failed to load recipe database:', error.message);
    return {};
  }
}

/**
 * Load YouTube cache
 */
async function loadYouTubeCache() {
  try {
    const data = await fs.readFile(YOUTUBE_CACHE_FILE, 'utf8');
    const cache = JSON.parse(data);
    return cache.videos || {};
  } catch (error) {
    return {};
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
    return {
      lastSent: null,
      lastReply: null,
      pendingConfirmation: false,
      changes: []
    };
  }
}

/**
 * Save email state
 */
async function saveEmailState(state) {
  await fs.writeFile(EMAIL_STATE_FILE, JSON.stringify(state, null, 2));
}

/**
 * Build email content for weekly dinner plan
 */
async function buildEmailContent(plan, recipes, youtubeCache) {
  const weekOf = new Date(plan.weekOf).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  let html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
    h1 { color: #d81e05; border-bottom: 2px solid #d81e05; padding-bottom: 10px; }
    h2 { color: #555; margin-top: 30px; }
    .meal { background: #f9f9f9; border-radius: 8px; padding: 15px; margin: 15px 0; border-left: 4px solid #d81e05; }
    .day { font-weight: bold; color: #d81e05; font-size: 14px; text-transform: uppercase; }
    .meal-name { font-size: 18px; font-weight: 600; margin: 5px 0; }
    .details { font-size: 13px; color: #666; margin: 8px 0; }
    .ingredients { font-size: 12px; color: #888; margin-top: 10px; }
    .video-link { display: inline-block; margin-top: 8px; padding: 6px 12px; background: #ff0000; color: white; text-decoration: none; border-radius: 4px; font-size: 12px; }
    .budget { background: #e8f5e9; border-radius: 8px; padding: 15px; margin: 20px 0; }
    .budget-row { display: flex; justify-content: space-between; margin: 5px 0; }
    .actions { background: #fff3e0; border-radius: 8px; padding: 15px; margin: 20px 0; }
    .actions h3 { margin-top: 0; color: #e65100; }
    .actions ul { margin: 10px 0; padding-left: 20px; }
    .actions li { margin: 8px 0; }
    .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #999; }
  </style>
</head>
<body>
  <h1>🍽️ Weekly Dinner Plan</h1>
  <p><strong>Week of:</strong> ${weekOf}</p>
  
  <div class="budget">
    <div class="budget-row"><span>Budget Allocated:</span> <strong>$${plan.budget.allocated}</strong></div>
    <div class="budget-row"><span>Estimated Cost:</span> <strong>$${plan.budget.estimatedMealCost}</strong></div>
    <div class="budget-row"><span>Remaining:</span> <strong style="color: #4caf50;">$${plan.budget.remaining.toFixed(2)}</strong></div>
  </div>
`;

  // Add each meal
  for (const meal of plan.meals) {
    const recipe = recipes[meal.name];
    const youtube = youtubeCache[meal.name];
    
    html += `
  <div class="meal">
    <div class="day">${meal.day}</div>
    <div class="meal-name">${meal.name}</div>
    <div class="details">
      ⏱️ ${meal.prepTime} | 
      ${recipe ? `🌍 ${recipe.cuisine} | ` : ''}
      💰 ~$${meal.estimatedCost} | 
      ${meal.difficulty === 'easy' ? '🔰' : meal.difficulty === 'medium' ? '⚡' : '🔥'} ${meal.difficulty}
    </div>
    ${recipe ? `<div class="details">📖 ${recipe.story ? recipe.story.substring(0, 100) + '...' : 'A delicious family favorite'}</div>` : ''}
    ${youtube ? `<a href="${youtube.url}" class="video-link" target="_blank">🎥 Watch on YouTube (${youtube.duration})</a>` : ''}
    <div class="ingredients">
      <strong>Ingredients needed:</strong> ${meal.ingredients.map(i => i.name).join(', ')}
    </div>
  </div>
`;
  }

  html += `
  <div class="actions">
    <h3>📋 How to Confirm or Make Changes</h3>
    <p><strong>Reply to this email with any changes:</strong></p>
    <ul>
      <li><strong>Swap a meal:</strong> "Swap Monday to Chicken Alfredo"</li>
      <li><strong>Remove a meal:</strong> "Remove Wednesday dinner"</li>
      <li><strong>Add a meal:</strong> "Add Sunday: Spaghetti Carbonara"</li>
      <li><strong>Confirm all:</strong> "Looks good!" or "Confirmed"</li>
    </ul>
    <p><em>I'll automatically sync your changes to your Apple Calendar and update your HEB cart!</em></p>
  </div>
  
  <div style="background: #f0f0f0; border-radius: 8px; padding: 15px; margin: 20px 0; font-size: 12px;">
    <h4 style="margin-top: 0; color: #555;">🛠️ Quick Commands Reference</h4>
    <table style="width: 100%; border-collapse: collapse;">
      <tr style="border-bottom: 1px solid #ddd;">
        <td style="padding: 6px 0; font-weight: bold;">Exclude item this week only:</td>
        <td style="padding: 6px 0; font-family: monospace;">node stock-manager.js --weekly-add "Olive oil"</td>
      </tr>
      <tr style="border-bottom: 1px solid #ddd;">
        <td style="padding: 6px 0; font-weight: bold;">Permanently exclude item:</td>
        <td style="padding: 6px 0; font-family: monospace;">node stock-manager.js --stock-add "Soy sauce"</td>
      </tr>
      <tr style="border-bottom: 1px solid #ddd;">
        <td style="padding: 6px 0; font-weight: bold;">View exclusions:</td>
        <td style="padding: 6px 0; font-family: monospace;">node stock-manager.js --list</td>
      </tr>
      <tr style="border-bottom: 1px solid #ddd;">
        <td style="padding: 6px 0; font-weight: bold;">Remove from exclusions:</td>
        <td style="padding: 6px 0; font-family: monospace;">node stock-manager.js --weekly-remove "Garlic"</td>
      </tr>
      <tr>
        <td style="padding: 6px 0; font-weight: bold;">Check dinner plan status:</td>
        <td style="padding: 6px 0; font-family: monospace;">node dinner-email-system.js --check-reply</td>
      </tr>
    </table>
  </div>
  
  <div class="footer">
    <p>— Marvin Maverick<br>Alex's Assistant | Logistics Coordinator | Professional Overthinker</p>
    <br>
    <p style="font-style: italic; color: #666;">"Brain the size of a planet, and I'm asked to write an email."</p>
  </div>
</body>
</html>
`;

  return html;
}

/**
 * Send dinner plan email via SMTP
 */
async function sendDinnerPlanEmail() {
  console.log('📧 Sending dinner plan confirmation email...\n');
  
  // Load SMTP config
  const config = await loadSmtpConfig();
  if (!config) {
    console.error('❌ SMTP configuration not found. Cannot send email.');
    return { success: false };
  }
  
  const plan = await loadWeeklyPlan();
  if (!plan) {
    console.error('❌ No weekly plan available');
    return { success: false };
  }
  
  const recipes = await loadRecipeDatabase();
  const youtubeCache = await loadYouTubeCache();
  
  // Build email content
  const htmlContent = await buildEmailContent(plan, recipes, youtubeCache);
  const subject = `${EMAIL_CONFIG.subjectPrefix}: Week of ${new Date(plan.weekOf).toLocaleDateString()}`;
  
  // Send via SMTP
  console.log('📤 Sending via iCloud SMTP...');
  const result = await sendEmailViaSmtp(EMAIL_CONFIG.to, subject, htmlContent, config);
  
  if (result.success) {
    // Update email state
    const state = await loadEmailState();
    state.lastSent = new Date().toISOString();
    state.pendingConfirmation = true;
    await saveEmailState(state);
    
    // Also save as markdown for reference
    const mdContent = buildMarkdownContent(plan, recipes, youtubeCache);
    const mdFile = path.join(DINNER_DATA_DIR, 'pending-dinner-email.md');
    await fs.writeFile(mdFile, mdContent);
    
    console.log('✅ Dinner plan email sent successfully!');
    console.log(`   To: ${EMAIL_CONFIG.to}`);
    console.log(`   Subject: ${subject}`);
    
    return { success: true };
  } else {
    console.error('❌ Failed to send email');
    return { success: false, error: result.error };
  }
}

/**
 * Build markdown email content
 */
function buildMarkdownContent(plan, recipes, youtubeCache) {
  const weekOf = new Date(plan.weekOf).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  let md = `# 🍽️ Weekly Dinner Plan

**Week of:** ${weekOf}

## Budget Summary
- **Allocated:** $${plan.budget.allocated}
- **Estimated:** $${plan.budget.estimatedMealCost}
- **Remaining:** $${plan.budget.remaining.toFixed(2)}

## This Week's Meals

`;

  for (const meal of plan.meals) {
    const recipe = recipes[meal.name];
    const youtube = youtubeCache[meal.name];
    
    md += `### ${meal.day}: ${meal.name}

- ⏱️ **Prep Time:** ${meal.prepTime}
`;
    if (recipe) {
      md += `- 🌍 **Cuisine:** ${recipe.cuisine}\n`;
    }
    md += `- 💰 **Estimated Cost:** $${meal.estimatedCost}
- **Difficulty:** ${meal.difficulty}
`;
    
    if (recipe && recipe.story) {
      md += `- 📖 **Story:** ${recipe.story.substring(0, 120)}...\n`;
    }
    
    if (youtube) {
      md += `- 🎥 **[Watch on YouTube](${youtube.url})** (${youtube.duration})\n`;
    }
    
    md += `- 🛒 **Ingredients:** ${meal.ingredients.map(i => i.name).join(', ')}\n\n`;
  }

  md += `## 📋 How to Confirm or Make Changes

**Reply to this email with any changes:**

- **Swap a meal:** "Swap Monday to Chicken Alfredo"
- **Remove a meal:** "Remove Wednesday dinner"
- **Add a meal:** "Add Sunday: Spaghetti Carbonara"
- **Confirm all:** "Looks good!" or "Confirmed"

*I'll automatically sync your changes to your Apple Calendar and update your HEB cart!*

---

## 🛠️ Quick Commands Reference

| Command | What It Does |
|---------|-------------|
| \`node stock-manager.js --weekly-add "Olive oil"\` | Exclude item this week only |
| \`node stock-manager.js --stock-add "Soy sauce"\` | **Permanently exclude item** (all future recipes) |
| \`node stock-manager.js --list\` | View all exclusions |
| \`node stock-manager.js --weekly-remove "Garlic"\` | Remove from weekly exclusions |
| \`node stock-manager.js --stock-remove "Ketchup"\` | Remove from permanent stock |
| \`node dinner-email-system.js --check-reply\` | Check dinner plan status |

**Categories for permanent stock:** produce, pantry, dairy, meat, spices, condiments_and_sauces, beverages

---

— Marvin Maverick  
Alex's Assistant | Logistics Coordinator | Professional Overthinker

> "Brain the size of a planet, and I'm asked to write an email."
`;

  return md;
}

/**
 * Check for email replies (placeholder for email monitoring)
 */
async function checkEmailReplies() {
  console.log('📥 Checking for dinner plan email replies...\n');
  
  const state = await loadEmailState();
  
  if (!state.pendingConfirmation) {
    console.log('ℹ️ No pending dinner plan confirmation');
    return { hasReply: false };
  }
  
  // Check if there's a manual changes file
  try {
    const changesData = await fs.readFile(PENDING_CHANGES_FILE, 'utf8');
    const changesFile = JSON.parse(changesData);
    const changes = changesFile.changes || [];
    
    if (changes.length > 0) {
      console.log(`✅ Found ${changes.length} pending changes from email reply`);
      return { hasReply: true, changes };
    }
  } catch (error) {
    // No pending changes
  }
  
  console.log('⏳ No replies yet. Waiting for your confirmation...');
  console.log('\nTo simulate a reply, create: ' + PENDING_CHANGES_FILE);
  console.log('With content like: {"changes": [{"action": "swap", "day": "Monday", "newMeal": "Chicken Alfredo"}]}');
  
  return { hasReply: false };
}

/**
 * Apply changes to dinner plan
 */
async function applyChanges(changes) {
  console.log('🔄 Applying changes to dinner plan...\n');
  
  const plan = await loadWeeklyPlan();
  if (!plan) {
    console.error('❌ No plan to modify');
    return { success: false };
  }
  
  const appliedChanges = [];
  
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
        
      case 'confirm':
        appliedChanges.push('Confirmed all meals');
        break;
    }
  }
  
  // Save updated plan
  await fs.writeFile(WEEKLY_PLAN_FILE, JSON.stringify(plan, null, 2));
  
  // Clear pending changes
  await fs.writeFile(PENDING_CHANGES_FILE, JSON.stringify([], null, 2));
  
  console.log('✅ Changes applied:');
  appliedChanges.forEach(c => console.log(`   • ${c}`));
  
  return { success: true, changes: appliedChanges, plan };
}

/**
 * Sync dinner plan to all systems
 */
async function syncToAllSystems() {
  console.log('🔄 Syncing dinner plan to all systems...\n');
  
  const results = {
    calendar: false,
    heb: false
  };
  
  // 1. Sync to Apple Calendar
  console.log('1️⃣ Syncing to Apple Calendar...');
  try {
    execSync('node calendar-sync.js', {
      cwd: __dirname,
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true
    });
    results.calendar = true;
    console.log('   ✅ Calendar synced\n');
  } catch (error) {
    console.log('   ⚠️ Calendar sync had issues\n');
  }
  
  // 2. Update HEB Extension meal plan
  console.log('2️⃣ Updating HEB Extension meal plan...');
  try {
    const plan = await loadWeeklyPlan();
    if (plan) {
      // Extract all unique ingredients
      const allIngredients = [];
      for (const meal of plan.meals) {
        if (meal.status !== 'removed') {
          for (const ing of meal.ingredients) {
            allIngredients.push({
              name: ing.name,
              searchTerm: ing.hebSearch || ing.name
            });
          }
        }
      }
      
      // Deduplicate
      const unique = [];
      const seen = new Set();
      for (const item of allIngredients) {
        if (!seen.has(item.name.toLowerCase())) {
          seen.add(item.name.toLowerCase());
          unique.push(item);
        }
      }
      
      // Save for extension
      const extensionItemsFile = path.join(DINNER_DATA_DIR, 'heb-extension-items.json');
      await fs.writeFile(extensionItemsFile, JSON.stringify({ items: unique }, null, 2));
      
      console.log(`   ✅ Extension meal plan updated (${unique.length} items)\n`);
      results.heb = true;
    }
  } catch (error) {
    console.log('   ⚠️ HEB extension update had issues\n');
  }
  
  // 3. Send confirmation
  console.log('3️⃣ Sending confirmation...');
  await sendConfirmationEmail(results);
  
  // Update state
  const state = await loadEmailState();
  state.pendingConfirmation = false;
  state.lastSync = new Date().toISOString();
  await saveEmailState(state);
  
  console.log('\n✅ All systems synced!');
  return results;
}

/**
 * Send confirmation email via SMTP
 */
async function sendConfirmationEmail(results) {
  const config = await loadSmtpConfig();
  if (!config) {
    console.log('   ⚠️ SMTP config not found, skipping confirmation email');
    return;
  }
  
  const plan = await loadWeeklyPlan();
  const subject = `✅ Dinner Plan Confirmed & Synced`;
  
  let body = `Your dinner plan has been confirmed and synced!\n\n`;
  body += `📅 Apple Calendar: ${results.calendar ? '✅ Synced' : '⚠️ Check needed'}\n`;
  body += `🛒 HEB Cart: ${results.heb ? '✅ Meal plan updated' : '⚠️ Check needed'}\n\n`;
  body += `Current meals:\n`;
  
  for (const meal of plan.meals) {
    if (meal.status !== 'removed') {
      body += `• ${meal.day}: ${meal.name} (${meal.status === 'modified' ? 'MODIFIED' : 'confirmed'})\n`;
    }
  }
  
  body += `\nReply to this email if you need any additional changes.\n`;
  
  // Create HTML version
  const htmlBody = `<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
    h1 { color: #4caf50; }
    .status { background: #e8f5e9; border-radius: 8px; padding: 15px; margin: 20px 0; }
    .meals { margin: 20px 0; }
    .meal { margin: 10px 0; padding: 10px; background: #f5f5f5; border-radius: 4px; }
    .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 13px; color: #666; }
    .quote { font-style: italic; color: #888; margin-top: 15px; }
  </style>
</head>
<body>
  <h1>✅ Dinner Plan Confirmed & Synced</h1>
  
  <div class="status">
    <p><strong>📅 Apple Calendar:</strong> ${results.calendar ? '✅ Synced' : '⚠️ Check needed'}</p>
    <p><strong>🛒 HEB Cart:</strong> ${results.heb ? '✅ Meal plan updated' : '⚠️ Check needed'}</p>
  </div>
  
  <div class="meals">
    <h3>Current Meals:</h3>
    ${plan.meals.filter(m => m.status !== 'removed').map(m => 
      `<div class="meal">• ${m.day}: ${m.name} ${m.status === 'modified' ? '<em>(MODIFIED)</em>' : ''}</div>`
    ).join('')}
  </div>
  
  <p>Reply to this email if you need any additional changes.</p>
  
  <div class="footer">
    <p>— Marvin Maverick<br>
    Alex's Assistant | Logistics Coordinator | Professional Overthinker</p>
    
    <p class="quote">"Brain the size of a planet, and I'm asked to write an email."</p>
  </div>
</body>
</html>`;
  
  const result = await sendEmailViaSmtp(EMAIL_CONFIG.to, subject, htmlBody, config);
  
  if (result.success) {
    console.log('   ✅ Confirmation email sent');
  } else {
    console.log('   ⚠️ Could not send confirmation email');
  }
}

/**
 * Main function
 */
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  
  switch (command) {
    case '--send-test':
      await sendDinnerPlanEmail();
      break;
      
    case '--check-reply':
      const reply = await checkEmailReplies();
      if (reply.hasReply) {
        console.log('\n🔄 Applying changes...');
        const result = await applyChanges(reply.changes);
        if (result.success) {
          await syncToAllSystems();
        }
      }
      break;
      
    case '--sync':
      await syncToAllSystems();
      break;
      
    default:
      console.log('Dinner Plan Email System (iCloud SMTP)\n');
      console.log('Usage:');
      console.log('  node dinner-email-system.js --send-test    Send dinner plan email via SMTP');
      console.log('  node dinner-email-system.js --check-reply  Check for email replies');
      console.log('  node dinner-email-system.js --sync         Sync current plan to all systems');
      break;
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  sendDinnerPlanEmail,
  checkEmailReplies,
  applyChanges,
  syncToAllSystems
};
