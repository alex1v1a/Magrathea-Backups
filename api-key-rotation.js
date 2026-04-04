#!/usr/bin/env node
/**
 * API Key Rotation Script
 * Rotates 6 exposed API keys: Brave, OpenAI, Anthropic, Moonshot, MiniMax, Discord
 * 
 * Usage: node api-key-rotation.js --dry-run | --execute
 */

const { execSync } = require('child_process');
const fs = require('fs').promises;
const path = require('path');

const KEYS_TO_ROTATE = [
  {
    name: 'Brave Search API',
    envVar: 'BRAVE_API_KEY',
    configPath: '.secrets/brave-api-key.json',
    provider: 'https://api.search.brave.com/app/keys',
    docs: 'https://brave.com/search/api/'
  },
  {
    name: 'OpenAI API',
    envVar: 'OPENAI_API_KEY',
    configPath: '.secrets/openai-api-key.json',
    provider: 'https://platform.openai.com/api-keys',
    docs: 'https://platform.openai.com/docs/api-reference'
  },
  {
    name: 'Anthropic API',
    envVar: 'ANTHROPIC_API_KEY',
    configPath: '.secrets/anthropic-api-key.json',
    provider: 'https://console.anthropic.com/settings/keys',
    docs: 'https://docs.anthropic.com/'
  },
  {
    name: 'Moonshot API',
    envVar: 'MOONSHOT_API_KEY',
    configPath: '.secrets/kimi-api-key.json',
    provider: 'https://platform.moonshot.cn/console/api-keys',
    docs: 'https://platform.moonshot.cn/docs'
  },
  {
    name: 'MiniMax API',
    envVar: 'MINIMAX_API_KEY',
    configPath: '.secrets/minimax-api-key.json',
    provider: 'https://www.minimaxi.com/platform',
    docs: 'https://www.minimaxi.com/docs'
  },
  {
    name: 'Discord Bot Token',
    envVar: 'DISCORD_BOT_TOKEN',
    configPath: '.secrets/discord-token.json',
    provider: 'https://discord.com/developers/applications',
    docs: 'https://discord.com/developers/docs'
  }
];

async function generateRotationReport() {
  console.log('🔐 API Key Rotation Report');
  console.log('═══════════════════════════════════════════════════\n');
  
  console.log('⚠️  CRITICAL: 6 API keys exposed in git history\n');
  
  console.log('Keys requiring rotation:\n');
  
  KEYS_TO_ROTATE.forEach((key, i) => {
    console.log(`${i + 1}. ${key.name}`);
    console.log(`   Environment Variable: ${key.envVar}`);
    console.log(`   Config Path: ${key.configPath}`);
    console.log(`   Rotation URL: ${key.provider}`);
    console.log(`   Docs: ${key.docs}\n`);
  });
  
  console.log('═══════════════════════════════════════════════════\n');
  
  console.log('📋 MANUAL ROTATION STEPS:');
  console.log('1. Visit each provider URL above');
  console.log('2. Revoke old API key');
  console.log('3. Generate new API key');
  console.log('4. Update .secrets/ files with new keys');
  console.log('5. Update environment variables');
  console.log('6. Restart services\n');
  
  console.log('⚡ Automated rotation not available - manual action required\n');
  
  // Generate checklist
  const checklist = KEYS_TO_ROTATE.map(k => `- [ ] ${k.name}: ${k.provider}`).join('\n');
  
  await fs.writeFile(
    'api-key-rotation-checklist.md',
    `# API Key Rotation Checklist\n\n## Critical: 6 Keys Exposed\n\n${checklist}\n\n## Steps\n1. Rotate each key at provider portal\n2. Update .secrets/ files\n3. Test connectivity\n4. Purge from git history (if needed)\n\nGenerated: ${new Date().toISOString()}\n`
  );
  
  console.log('✅ Checklist saved to: api-key-rotation-checklist.md');
}

async function checkKeyFiles() {
  console.log('\n🔍 Checking current key files...\n');
  
  for (const key of KEYS_TO_ROTATE) {
    try {
      await fs.access(key.configPath);
      console.log(`✅ ${key.name}: Found at ${key.configPath}`);
    } catch {
      console.log(`❌ ${key.name}: NOT FOUND at ${key.configPath}`);
    }
  }
}

async function gitPurgeCheck() {
  console.log('\n🧹 Git History Check');
  console.log('═══════════════════════════════════════════════════\n');
  
  try {
    // Check if keys exist in git history
    const result = execSync('git log --all --full-history -- .secrets/', { encoding: 'utf8' });
    if (result) {
      console.log('⚠️  WARNING: .secrets/ directory found in git history');
      console.log('Run: git filter-repo --path .secrets/ --invert-paths');
      console.log('Or: git filter-branch --force --index-filter "git rm --cached --ignore-unmatch -r .secrets/" HEAD');
    }
  } catch {
    console.log('ℹ️  Git history check skipped (may not be a git repo)');
  }
}

const args = process.argv.slice(2);

if (args.includes('--check')) {
  checkKeyFiles();
} else if (args.includes('--purge')) {
  gitPurgeCheck();
} else {
  generateRotationReport();
}
