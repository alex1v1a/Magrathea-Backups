#!/usr/bin/env node
/**
 * ElevenLabs Setup Script
 * Sets up ElevenLabs Creator plan ($22/mo) and voice samples
 * 
 * Usage: node elevenlabs-setup.js --check | --setup | --voices
 */

const { execSync } = require('child_process');
const fs = require('fs').promises;
const path = require('path');

const ELEVENLABS_CONFIG = {
  baseUrl: 'https://api.elevenlabs.io/v1',
  creatorPlan: {
    price: 22,
    credits: 100000, // 100K characters/month
    voices: 10,
    cloning: true
  },
  signupUrl: 'https://elevenlabs.io/app/sign-up',
  pricingUrl: 'https://elevenlabs.io/pricing'
};

const VOICE_SAMPLES = [
  {
    name: 'Marvin_Calm',
    description: 'Calm, slightly sardonic male voice for Marvin',
    gender: 'male',
    age: 'adult',
    accent: 'american',
    tone: 'calm, witty, slightly sardonic'
  },
  {
    name: 'Marvin_Friendly',
    description: 'Warm but dry humor male voice',
    gender: 'male',
    age: 'adult',
    accent: 'american',
    tone: 'warm, helpful, dry humor'
  },
  {
    name: 'Trillian_Professional',
    description: 'Professional, efficient female voice for Trillian',
    gender: 'female',
    age: 'adult',
    accent: 'british',
    tone: 'professional, efficient, clear'
  },
  {
    name: 'DeepThought_Wise',
    description: 'Deep, contemplative voice for Deep Thought',
    gender: 'male',
    age: 'mature',
    accent: 'british',
    tone: 'deep, wise, contemplative'
  }
];

async function generateSetupGuide() {
  console.log('🎙️  ElevenLabs Setup Guide');
  console.log('═══════════════════════════════════════════════════\n');
  
  console.log('📋 PLAN: Creator ($22/month)');
  console.log(`   • ${ELEVENLABS_CONFIG.creatorPlan.credits.toLocaleString()} characters/month`);
  console.log(`   • ${ELEVENLABS_CONFIG.creatorPlan.voices} custom voices`);
  console.log(`   • Voice cloning: ${ELEVENLABS_CONFIG.creatorPlan.cloning ? 'Yes' : 'No'}\n`);
  
  console.log('🔗 LINKS:');
  console.log(`   Sign up: ${ELEVENLABS_CONFIG.signupUrl}`);
  console.log(`   Pricing: ${ELEVENLABS_CONFIG.pricingUrl}\n`);
  
  console.log('📋 SETUP STEPS:');
  console.log('1. Visit https://elevenlabs.io/app/sign-up');
  console.log('2. Create account with: MarvinMartian9@icloud.com');
  console.log('3. Upgrade to Creator plan ($22/mo)');
  console.log('4. Generate API key at: https://elevenlabs.io/app/settings/api-keys');
  console.log('5. Save API key to: .secrets/elevenlabs-api-key.json\n');
  
  console.log('🎭 RECOMMENDED VOICE CONFIGURATIONS:\n');
  
  VOICE_SAMPLES.forEach((voice, i) => {
    console.log(`${i + 1}. ${voice.name}`);
    console.log(`   Description: ${voice.description}`);
    console.log(`   Settings: ${voice.gender}, ${voice.age}, ${voice.accent}`);
    console.log(`   Tone: ${voice.tone}\n`);
  });
  
  console.log('═══════════════════════════════════════════════════\n');
  
  // Save voice config
  await fs.writeFile(
    'elevenlabs-voice-config.json',
    JSON.stringify({
      plan: ELEVENLABS_CONFIG.creatorPlan,
      voices: VOICE_SAMPLES,
      apiKeyPath: '.secrets/elevenlabs-api-key.json',
      setupDate: new Date().toISOString()
    }, null, 2)
  );
  
  console.log('✅ Voice config saved to: elevenlabs-voice-config.json');
}

async function generateSampleScript() {
  const sampleScripts = {
    marvin: `Hello, I'm Marvin. I'm here to help you with your tasks. I have a brain the size of a planet, and they've got me organizing your groceries. Don't mind me, I'll just be here, waiting for the inevitable heat death of the universe.`,
    
    trillian: `Greetings. I'm Trillian, your research and information specialist. I'm ready to assist with data analysis, web searches, and complex research tasks. How may I help you today?`,
    
    deep_thought: `I am Deep Thought. I have calculated the answer to life, the universe, and everything. It is... 42. Now, what was the question again?`,
    
    bistromath: `Hello! I'm Bistromath, your calculations and mathematics specialist. I run on the revolutionary bistro mathematics principle. Ready to compute!`
  };
  
  await fs.writeFile(
    'voice-sample-scripts.json',
    JSON.stringify(sampleScripts, null, 2)
  );
  
  console.log('\n✅ Sample scripts saved to: voice-sample-scripts.json');
  console.log('   Use these for voice cloning samples');
}

const args = process.argv.slice(2);

if (args.includes('--voices')) {
  generateSampleScript();
} else {
  generateSetupGuide();
  generateSampleScript();
}
