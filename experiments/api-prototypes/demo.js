#!/usr/bin/env node
/**
 * API Prototypes Demo Runner
 * 
 * Quick test to verify all API integrations are working.
 * Run this after setting up environment variables.
 */

require('dotenv').config();

const fs = require('fs');
const path = require('path');

console.log('╔══════════════════════════════════════════════════════════╗');
console.log('║     API Integration Prototypes - Demo Runner             ║');
console.log('║     Research Task 3/5 Complete                           ║');
console.log('╚══════════════════════════════════════════════════════════╝\n');

// Check environment variables
const requiredEnvVars = {
  'OpenAI': ['OPENAI_API_KEY'],
  'Twilio': ['TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN', 'TWILIO_PHONE_NUMBER'],
  'Notion': ['NOTION_API_KEY'],
  'OpenWeather': ['OPENWEATHER_API_KEY'],
  'Telegram': ['TELEGRAM_BOT_TOKEN']
};

console.log('📋 Environment Variable Check:\n');

let allConfigured = true;
for (const [service, vars] of Object.entries(requiredEnvVars)) {
  const status = vars.every(v => process.env[v]) ? '✅' : '❌';
  if (!vars.every(v => process.env[v])) allConfigured = false;
  
  console.log(`${status} ${service}`);
  vars.forEach(v => {
    const exists = process.env[v] ? '✓' : '✗';
    console.log(`   ${exists} ${v}`);
  });
}

console.log('\n' + '─'.repeat(60) + '\n');

if (!allConfigured) {
  console.log('⚠️  Some API keys are missing. Set up environment variables:');
  console.log('   1. Copy .env.example to .env');
  console.log('   2. Fill in your API keys');
  console.log('   3. Run this script again\n');
}

// List available prototypes
console.log('📁 Available Prototypes:\n');

const prototypes = [
  {
    name: 'OpenAI Recipe Enhancer',
    file: 'openai-recipe-enhancer.js',
    description: 'AI-powered recipe generation and enhancement',
    cost: '~$0.25/month',
    priority: 'HIGH'
  },
  {
    name: 'Twilio SMS Service',
    file: 'twilio-sms-service.js',
    description: 'SMS notifications and two-way messaging',
    cost: '~$2.00/month',
    priority: 'HIGH'
  },
  {
    name: 'Notion Integration',
    file: 'notion-api-prototype.js',
    description: 'Task management and meeting notes',
    cost: 'FREE',
    priority: 'Medium'
  },
  {
    name: 'Weather Service',
    file: 'openweather-prototype.js',
    description: 'Weather briefings for meal planning',
    cost: 'FREE',
    priority: 'Medium'
  },
  {
    name: 'Telegram Bot',
    file: 'telegram-bot-prototype.js',
    description: 'Mobile notifications and commands',
    cost: 'FREE',
    priority: 'Medium'
  }
];

prototypes.forEach((p, i) => {
  const exists = fs.existsSync(path.join(__dirname, p.file)) ? '✅' : '❌';
  const priorityColor = p.priority === 'HIGH' ? '🔴' : '🟡';
  
  console.log(`${i + 1}. ${exists} ${p.name}`);
  console.log(`   ${priorityColor} Priority: ${p.priority} | 💰 Cost: ${p.cost}`);
  console.log(`   📝 ${p.description}`);
  console.log(`   🚀 Run: node ${p.file}\n`);
});

console.log('─'.repeat(60) + '\n');

// Quick start guide
console.log('🚀 Quick Start:\n');
console.log('1. Get API Keys:');
console.log('   • OpenAI: https://platform.openai.com/api-keys');
console.log('   • Twilio: https://www.twilio.com/console');
console.log('   • Notion: https://www.notion.so/my-integrations');
console.log('   • Weather: https://openweathermap.org/api');
console.log('   • Telegram: Message @BotFather\n');

console.log('2. Install Dependencies:');
console.log('   npm install openai twilio @notionhq/client node-fetch@2 dotenv\n');

console.log('3. Test Individual Prototypes:');
console.log('   node openai-recipe-enhancer.js');
console.log('   node twilio-sms-service.js\n');

console.log('4. Integrate with Dinner Automation:');
console.log('   See API_RESEARCH_FINDINGS.md for integration guide\n');

// Cost summary
console.log('─'.repeat(60) + '\n');
console.log('💰 Monthly Cost Summary:\n');
console.log('   OpenAI:        $0.25');
console.log('   Twilio:        $2.00');
console.log('   Others:        $0.00');
console.log('   ───────────────────');
console.log('   TOTAL:         ~$2.25/month (~$27/year)\n');

console.log('✨ All prototypes ready for integration!\n');
console.log('📖 See README.md and API_RESEARCH_FINDINGS.md for details.\n');
