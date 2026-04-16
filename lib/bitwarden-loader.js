// Bitwarden credential loader - Node.js
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const CACHE_DIR = path.join(__dirname, '..', '.cache');
const CACHE_FILE = path.join(CACHE_DIR, 'bw-credentials.json');
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

// Ensure cache directory exists
if (!fs.existsSync(CACHE_DIR)) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
}

/**
 * Load credential from Bitwarden CLI
 * @param {string} itemName - Name of the Bitwarden item
 * @param {string} field - Field to retrieve (password, username, apiKey, etc.)
 * @returns {string|null} The credential value or null if not found
 */
function loadCredential(itemName, field = 'password') {
  try {
    // Check cache first
    if (fs.existsSync(CACHE_FILE)) {
      const cache = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
      const cached = cache[itemName]?.[field];
      if (cached && Date.now() - cache._timestamp < CACHE_TTL_MS) {
        return cached;
      }
    }

    // Sync and fetch from Bitwarden
    execSync('bw sync', { stdio: 'pipe' });
    
    const result = execSync(
      `bw get item "${itemName}"`,
      { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }
    );
    
    const item = JSON.parse(result);
    
    // Extract the requested field
    let value = null;
    
    if (field === 'password') {
      value = item.login?.password;
    } else if (field === 'username') {
      value = item.login?.username;
    } else {
      // Check custom fields
      const customField = item.fields?.find(f => f.name === field);
      value = customField?.value;
    }
    
    // Update cache
    let cache = {};
    if (fs.existsSync(CACHE_FILE)) {
      cache = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
    }
    cache._timestamp = Date.now();
    cache[itemName] = cache[itemName] || {};
    cache[itemName][field] = value;
    fs.writeFileSync(CACHE_FILE, JSON.stringify(cache));
    
    return value;
  } catch (err) {
    console.error(`Failed to load credential "${itemName}.${field}":`, err.message);
    return null;
  }
}

/**
 * Load all API keys from Bitwarden
 * @returns {Object} API keys by provider
 */
function loadApiKeys() {
  return {
    openai: loadCredential('API-OpenAI', 'apiKey'),
    anthropic: loadCredential('API-Anthropic', 'apiKey'),
    minimax: loadCredential('API-Minimax', 'apiKey'),
    kimi: loadCredential('API-Kimi', 'apiKey'),
    openrouter: loadCredential('API-OpenRouter', 'apiKey'),
    brave: loadCredential('API-Brave', 'apiKey'),
    elevenlabs: loadCredential('API-ElevenLabs', 'apiKey')
  };
}

/**
 * Load service credentials from Bitwarden
 * @returns {Object} Service credentials
 */
function loadServiceCredentials() {
  return {
    heb: {
      username: loadCredential('HEB-Account', 'username'),
      password: loadCredential('HEB-Account', 'password')
    },
    facebook: {
      username: loadCredential('Facebook-Account', 'username'),
      password: loadCredential('Facebook-Account', 'password')
    },
    icloud: {
      email: loadCredential('iCloud-Marvin', 'username'),
      appPassword: loadCredential('iCloud-Marvin', 'appPassword')
    }
  };
}

module.exports = {
  loadCredential,
  loadApiKeys,
  loadServiceCredentials
};

// CLI usage
if (require.main === module) {
  const args = process.argv.slice(2);
  if (args.length >= 1) {
    const [itemName, field = 'password'] = args;
    const value = loadCredential(itemName, field);
    if (value) {
      console.log(value);
      process.exit(0);
    } else {
      process.exit(1);
    }
  } else {
    console.error('Usage: node bitwarden-loader.js <item-name> [field]');
    process.exit(1);
  }
}
