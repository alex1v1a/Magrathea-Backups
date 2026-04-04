#!/usr/bin/env node
/**
 * Setup helper for Dinner Plans Email Fix
 * Guides through Discord webhook configuration
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { DiscordNotifier } = require('./discord-notifier');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise(resolve => rl.question(prompt, resolve));
}

async function main() {
  console.log('\n========================================');
  console.log('Dinner Plans Email Fix Setup');
  console.log('========================================\n');
  
  console.log('This setup will help you configure Discord webhook as a backup');
  console.log('for email notifications.\n');
  
  // Check current Discord status
  const discordNotifier = new DiscordNotifier();
  const isDiscordConfigured = discordNotifier.isConfigured();
  
  console.log('Current Status:');
  console.log(`  Discord Webhook: ${isDiscordConfigured ? '✓ Configured' : '✗ Not configured'}`);
  console.log(`  Environment Variable DINNER_DISCORD_WEBHOOK: ${process.env.DINNER_DISCORD_WEBHOOK ? 'Set' : 'Not set'}`);
  
  console.log('\n----------------------------------------\n');
  
  if (isDiscordConfigured) {
    console.log('Discord webhook is already configured!');
    const testNow = await question('Would you like to send a test notification? (y/n): ');
    if (testNow.toLowerCase() === 'y') {
      try {
        await discordNotifier.sendTest();
        console.log('\n✓ Test notification sent successfully!');
      } catch (err) {
        console.log(`\n✗ Test failed: ${err.message}`);
      }
    }
  } else {
    console.log('Discord webhook is not configured.');
    console.log('\nTo set up a Discord webhook:');
    console.log('1. Open Discord and go to your server');
    console.log('2. Go to Server Settings → Integrations → Webhooks');
    console.log('3. Click "New Webhook"');
    console.log('4. Select the channel for dinner plan notifications');
    console.log('5. Copy the Webhook URL\n');
    
    const webhookUrl = await question('Enter Discord Webhook URL (or press Enter to skip): ');
    
    if (webhookUrl && webhookUrl.includes('discord.com/api/webhooks')) {
      console.log('\n✓ Valid webhook URL entered');
      
      console.log('\nTo make this permanent, add the environment variable:');
      console.log('\nWindows PowerShell:');
      console.log(`  [Environment]::SetEnvironmentVariable("DINNER_DISCORD_WEBHOOK", "${webhookUrl}", "User")`);
      console.log('\nWindows CMD:');
      console.log(`  setx DINNER_DISCORD_WEBHOOK "${webhookUrl}"`);
      console.log('\nLinux/macOS (add to ~/.bashrc or ~/.zshrc):');
      console.log(`  export DINNER_DISCORD_WEBHOOK="${webhookUrl}"`);
      
      // Test with the provided URL
      const testNow = await question('\nTest the webhook now? (y/n): ');
      if (testNow.toLowerCase() === 'y') {
        const tempNotifier = new DiscordNotifier(webhookUrl);
        try {
          await tempNotifier.sendTest();
          console.log('\n✓ Test notification sent successfully!');
          console.log('  Check your Discord channel for the test message.');
        } catch (err) {
          console.log(`\n✗ Test failed: ${err.message}`);
        }
      }
    } else if (webhookUrl) {
      console.log('\n✗ Invalid webhook URL. It should look like:');
      console.log('  https://discord.com/api/webhooks/1234567890/abcdefghijklmnopqrstuvwxyz');
    } else {
      console.log('\nSkipped Discord setup.');
    }
  }
  
  console.log('\n----------------------------------------\n');
  
  // Email deliverability tips
  console.log('Email Deliverability Tips:');
  console.log('1. Ask recipients to add MarvinMartian9@icloud.com to their contacts');
  console.log('2. Check spam/junk folders for test emails');
  console.log('3. In Gmail, check "All Mail" (not just Inbox)');
  console.log('4. The new email format removes emoji to reduce spam filtering');
  
  console.log('\n----------------------------------------\n');
  
  console.log('Next Steps:');
  console.log('1. Run: npm run email:test    # Test email delivery');
  console.log('2. Run: npm run discord:test  # Test Discord webhook (if configured)');
  console.log('3. Run: npm run weekly        # Run full weekly automation');
  
  console.log('\nFor more info, see EMAIL_FIX.md\n');
  
  rl.close();
}

main().catch(err => {
  console.error('Setup error:', err);
  process.exit(1);
});
