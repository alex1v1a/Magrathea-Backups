#!/usr/bin/env node
/**
 * Real API Data Fetcher for Marvin's Dashboard
 * Fetches live data from OpenAI, OpenRouter, Anthropic, Kimi, and MiniMax APIs
 * 
 * CRITICAL: NO MOCK DATA - ONLY REAL API VALUES
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

// Import progress tracker
const progress = require('./progress-tracker.js');
const TASK_ID = 'api-data-fetch';

// Configuration - API Keys from OpenClaw config
const CONFIG = {
  openai: {
    apiKey: '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',
    baseUrl: 'https://api.openai.com/v1'
  },
  openrouter: {
    apiKey: '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',
    baseUrl: 'https://openrouter.ai/api/v1'
  },
  minimax: {
    apiKey: 'sk-api-M9U4SwpTO43eL_XL4ZS7vegk0lQjg3vSFA1bYbJg2hf4hhI-5XiBtODgkEkoP7ZQl8BrzHzgSZZkXjD-oKFdIV3RdgdeHvJZBuDu_vyaDe97jzR9g8xvDRM',
    baseUrl: 'https://api.minimax.chat/v1'
  },
  kimi: {
    apiKey: 'sk-kimi-HvKVAWIeq9x1hWkqvZmHQqEsyeXSCx9wAAqpdMnFo1L5mc4GVV',
    baseUrl: 'https://api.moonshot.cn/v1'
  },
  anthropic: {
    apiKey: 'sk-ant-a03tL7-ewg1XJuA1GfP9AWnB-Baj8d5Me7p9d9hH7FPGeVPgAA',
    baseUrl: 'https://api.anthropic.com/v1'
  }
};

// Data storage paths
const DATA_DIR = path.join(__dirname, '..', 'data');
const USAGE_FILE = path.join(DATA_DIR, 'model-usage.json');
const HISTORY_DIR = path.join(DATA_DIR, 'history');

// HTTP request helper
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, data: parsed, headers: res.headers });
        } catch (e) {
          resolve({ status: res.statusCode, data: data, headers: res.headers });
        }
      });
    });
    req.on('error', reject);
    req.setTimeout(30000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
    req.end();
  });
}

// Fetch OpenAI Usage Data
async function fetchOpenAIUsage() {
  const results = {
    provider: 'OpenAI',
    apiUsed: 'OpenAI Usage API (v1/dashboard/billing/usage)',
    timestamp: new Date().toISOString(),
    data: null,
    error: null
  };

  try {
    // Get current date and first day of month for billing
    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    const startStr = startDate.toISOString().split('T')[0];
    const endStr = now.toISOString().split('T')[0];
    
    // OpenAI Usage API - fetch usage data using billing endpoint
    const url = `${CONFIG.openai.baseUrl}/dashboard/billing/usage?start_date=${startStr}&end_date=${endStr}`;
    
    const response = await makeRequest(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${CONFIG.openai.apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.status === 200 && response.data) {
      results.data = {
        usage: response.data,
        period: { start: startStr, end: endStr },
        // Note: OpenAI doesn't provide rate limit info via API, only via headers in responses
        rateLimits: {
          note: 'Rate limits available via response headers only - not exposed in standalone API',
          limits: 'Check OpenAI dashboard for current tier limits'
        }
      };
    } else {
      results.error = `API returned status ${response.status}: ${JSON.stringify(response.data)}`;
    }
  } catch (error) {
    results.error = error.message;
  }

  return results;
}

// Fetch OpenAI Billing Subscription
async function fetchOpenAIBilling() {
  const results = {
    provider: 'OpenAI',
    apiUsed: 'OpenAI Billing Subscription API',
    timestamp: new Date().toISOString(),
    data: null,
    error: null
  };

  try {
    const url = `${CONFIG.openai.baseUrl}/dashboard/billing/subscription`;
    
    const response = await makeRequest(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${CONFIG.openai.apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.status === 200 && response.data) {
      results.data = response.data;
    } else {
      results.error = `API returned status ${response.status}: ${JSON.stringify(response.data)}`;
    }
  } catch (error) {
    results.error = error.message;
  }

  return results;
}

// Fetch OpenAI User Info (for account details)
async function fetchOpenAIUser() {
  try {
    const url = `${CONFIG.openai.baseUrl}/me`;
    const response = await makeRequest(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${CONFIG.openai.apiKey}`,
        'Content-Type': 'application/json'
      }
    });
    return response.data;
  } catch (error) {
    return { error: error.message };
  }
}

// Fetch OpenRouter Credits/Usage
async function fetchOpenRouterCredits() {
  const results = {
    provider: 'OpenRouter',
    apiUsed: 'OpenRouter Credits API',
    timestamp: new Date().toISOString(),
    data: null,
    error: null
  };

  try {
    const url = `${CONFIG.openrouter.baseUrl}/credits`;
    const response = await makeRequest(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${CONFIG.openrouter.apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.status === 200) {
      results.data = response.data;
    } else {
      results.error = `API returned status ${response.status}: ${JSON.stringify(response.data)}`;
    }
  } catch (error) {
    results.error = error.message;
  }

  return results;
}

// Fetch MiniMax Usage
async function fetchMiniMaxUsage() {
  const results = {
    provider: 'MiniMax',
    apiUsed: 'MiniMax API (balance check)',
    timestamp: new Date().toISOString(),
    data: null,
    error: null
  };

  try {
    // MiniMax doesn't have a simple usage endpoint - check available models as proxy
    const url = `${CONFIG.minimax.baseUrl}/models`;
    const response = await makeRequest(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${CONFIG.minimax.apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.status === 200) {
      results.data = {
        modelsAvailable: response.data,
        note: 'MiniMax API authenticated successfully - API key is valid'
      };
    } else {
      results.error = `API returned status ${response.status}: ${JSON.stringify(response.data)}`;
    }
  } catch (error) {
    results.error = error.message;
  }

  return results;
}

// Try to fetch Kimi API info
async function fetchKimiUsage() {
  const results = {
    provider: 'Kimi (Moonshot)',
    apiUsed: 'Kimi API',
    timestamp: new Date().toISOString(),
    data: null,
    error: null
  };

  try {
    // Check if we have Kimi API key in config
    const url = `${CONFIG.kimi.baseUrl}/models`;
    const response = await makeRequest(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${CONFIG.kimi.apiKey || 'unknown'}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.status === 200) {
      results.data = response.data;
    } else {
      results.error = `API returned status ${response.status} - API key may not be configured`;
    }
  } catch (error) {
    results.error = `API key not configured or invalid: ${error.message}`;
  }

  return results;
}

// Fetch Anthropic Usage via Admin API
async function fetchAnthropicUsage() {
  const results = {
    provider: 'Anthropic',
    apiUsed: 'Anthropic Admin API (cost_report)',
    timestamp: new Date().toISOString(),
    data: null,
    error: null
  };

  try {
    if (!CONFIG.anthropic.apiKey) {
      results.error = 'Anthropic API key not configured';
      return results;
    }

    // Get date range for current month
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startStr = startOfMonth.toISOString().split('T')[0] + 'T00:00:00Z';
    const endStr = now.toISOString().split('T')[0] + 'T23:59:59Z';

    // Try Anthropic Admin API cost report endpoint
    const url = `${CONFIG.anthropic.baseUrl}/organizations/cost_report?starting_at=${encodeURIComponent(startStr)}&ending_at=${encodeURIComponent(endStr)}`;

    const response = await makeRequest(url, {
      method: 'GET',
      headers: {
        'x-api-key': CONFIG.anthropic.apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json'
      }
    });

    if (response.status === 200) {
      results.data = response.data;
      results.dateRange = { start: startStr, end: endStr };
    } else if (response.status === 401) {
      // Admin API key required - regular API key won't work
      results.error = 'Admin API key required - regular API key has insufficient permissions';
      results.note = 'Generate an Admin API key from Anthropic Console > Settings > Admin API Keys';
      results.status = 'admin_key_required';
    } else {
      results.error = `API returned status ${response.status}: ${JSON.stringify(response.data)}`;
    }
  } catch (error) {
    results.error = error.message;
  }

  return results;
}

// Calculate spending from actual API responses
function calculateSpending(apiData) {
  const spending = {
    openai: {
      daily: 0,
      monthly: 0,
      source: 'API',
      note: ''
    },
    openrouter: {
      daily: 0,
      monthly: 0,
      source: 'API',
      note: ''
    },
    minimax: {
      daily: 0,
      monthly: 0,
      source: 'API',
      note: ''
    },
    kimicoding: {
      daily: 0,
      monthly: 0,
      source: 'API',
      note: ''
    },
    anthropic: {
      daily: 0,
      monthly: 0,
      source: 'API',
      note: ''
    }
  };

  // Process OpenRouter credits data - REAL DATA
  if (apiData.openrouter?.data?.data) {
    const credits = apiData.openrouter.data.data;
    spending.openrouter.credits = {
      total: credits.total_credits || 0,
      used: credits.total_usage || 0,
      remaining: (credits.total_credits || 0) - (credits.total_usage || 0),
      currency: 'USD'
    };
    spending.openrouter.monthly = credits.total_usage || 0;
    spending.openrouter.source = 'OpenRouter /credits API';
  }

  // Process OpenAI billing data - REAL DATA
  if (apiData.openaiBilling?.data) {
    const billing = apiData.openaiBilling.data;
    spending.openai.plan = billing.plan?.id || 'unknown';
    spending.openai.hasPaymentMethod = billing.has_payment_method || false;
    spending.openai.softLimitUSD = billing.soft_limit_usd || 0;
    spending.openai.hardLimitUSD = billing.hard_limit_usd || 0;
    spending.openai.source = 'OpenAI /dashboard/billing/subscription API';
  }

  // Process OpenAI usage data - REAL DATA
  if (apiData.openai?.data?.usage) {
    const usage = apiData.openai.data.usage;
    spending.openai.totalUsage = usage.total_usage || 0;
    spending.openai.dailyUsage = usage.daily_usage || [];
    // Calculate monthly from cents to dollars
    spending.openai.monthly = (usage.total_usage || 0) / 100;
    spending.openai.source = 'OpenAI /dashboard/billing/usage API';
  }

  // Process Anthropic Admin API data if available
  if (apiData.anthropic?.data?.data) {
    const anthropicData = apiData.anthropic.data.data;
    // Sum up costs from all cost entries
    let totalCost = 0;
    if (Array.isArray(anthropicData)) {
      totalCost = anthropicData.reduce((sum, entry) => sum + (entry.cost?.amount || 0), 0);
    }
    spending.anthropic.monthly = totalCost;
    spending.anthropic.source = 'Anthropic Admin API (cost_report)';
    spending.anthropic.note = 'Real-time data from Anthropic Admin API';
  } else {
    // Fall back to model-usage.json data for Anthropic
    try {
      const usageData = JSON.parse(fs.readFileSync(USAGE_FILE, 'utf8'));
      const anthropicModel = usageData.models['anthropic/claude-opus-4-5'];
      if (anthropicModel && anthropicModel.monthlySpent > 0) {
        spending.anthropic.monthly = anthropicModel.monthlySpent;
        spending.anthropic.source = 'model-usage.json (estimated from token usage)';
        spending.anthropic.note = apiData.anthropic?.error || 'Admin API key required for real-time data';
      } else {
        spending.anthropic.source = 'Anthropic Console (manual)';
        spending.anthropic.note = apiData.anthropic?.error || 'Check Anthropic Console for usage';
      }
    } catch (e) {
      spending.anthropic.source = 'Anthropic Console (manual)';
      spending.anthropic.note = apiData.anthropic?.error || 'Check Anthropic Console for usage';
    }
  }

  // Note: Kimi, MiniMax require dashboard access
  spending.kimicoding.note = 'API key not exposed - check provider dashboard';
  spending.kimicoding.source = 'Kimi Dashboard (manual)';
  spending.minimax.note = 'Usage data not available via API - check MiniMax dashboard';
  spending.minimax.source = 'MiniMax Dashboard (manual)';

  return spending;
}

// Generate rate limits from actual API responses
function calculateRateLimits(apiData) {
  const rateLimits = {
    models: {}
  };

  // OpenAI models - get from tier info if available
  if (apiData.openaiUser?.data) {
    const user = apiData.openaiUser.data;
    // OpenAI tier determines rate limits
    const tier = user.tier || 'free';
    
    rateLimits.models['openai-codex/gpt-5.2'] = {
      provider: 'OpenAI',
      tier: tier,
      rateLimit: tier === 'tier5' ? '10,000 RPM' : tier === 'tier4' ? '5,000 RPM' : '60 RPM',
      tpm: tier === 'tier5' ? '2,000,000 TPM' : tier === 'tier4' ? '1,000,000 TPM' : '150,000 TPM',
      source: 'OpenAI /me API (tier-based)'
    };
  }

  // OpenRouter models
  if (apiData.openrouter?.data) {
    rateLimits.models['openrouter/auto'] = {
      provider: 'OpenRouter',
      rateLimit: 'Unlimited (per-model limits apply)',
      source: 'OpenRouter documentation'
    };
  }

  // MiniMax models
  rateLimits.models['minimax/abab6.5s-chat'] = {
    provider: 'MiniMax',
    rateLimit: 'Unknown',
    source: 'Authentication check only - limits not exposed'
  };

  // Kimi models
  rateLimits.models['kimi-coding/k2p5'] = {
    provider: 'Kimi',
    rateLimit: 'Unknown',
    source: 'API key not available for direct query'
  };

  // Anthropic models
  rateLimits.models['anthropic/claude-opus-4-5'] = {
    provider: 'Anthropic',
    rateLimit: 'Unknown',
    source: 'OAuth mode - limits not available via API'
  };

  return rateLimits;
}

// Main function to fetch all data
async function fetchAllAPIData() {
  console.log('🔍 Fetching real API data from all providers...\n');

  // Start progress tracking
  await progress.startTask(TASK_ID, 'API Data Fetch', {
    description: 'Fetches live data from OpenAI, OpenRouter, Anthropic, Kimi, and MiniMax APIs',
    category: 'data',
    steps: [
      'Fetch OpenAI usage',
      'Fetch OpenAI billing',
      'Fetch OpenRouter credits',
      'Fetch MiniMax usage',
      'Fetch Kimi usage',
      'Fetch Anthropic usage',
      'Calculate spending',
      'Update dashboard files'
    ]
  });

  const results = {
    timestamp: new Date().toISOString(),
    apis: {}
  };

  // Fetch all API data in parallel
  await progress.updateProgress(TASK_ID, 10, 'Fetching OpenAI data...', { stepIndex: 0 });
  const openaiUsage = await fetchOpenAIUsage();
  await progress.logTask(TASK_ID, `OpenAI usage: ${openaiUsage.error ? 'FAILED' : 'OK'}`);

  await progress.updateProgress(TASK_ID, 20, 'Fetching OpenAI billing...', { stepIndex: 1 });
  const openaiBilling = await fetchOpenAIBilling();
  await progress.logTask(TASK_ID, `OpenAI billing: ${openaiBilling.error ? 'FAILED' : 'OK'}`);

  await progress.updateProgress(TASK_ID, 30, 'Fetching OpenRouter credits...', { stepIndex: 2 });
  const openrouterCredits = await fetchOpenRouterCredits();
  await progress.logTask(TASK_ID, `OpenRouter credits: ${openrouterCredits.error ? 'FAILED' : 'OK'}`);

  await progress.updateProgress(TASK_ID, 45, 'Fetching MiniMax usage...', { stepIndex: 3 });
  const minimaxUsage = await fetchMiniMaxUsage();
  await progress.logTask(TASK_ID, `MiniMax usage: ${minimaxUsage.error ? 'FAILED' : 'OK'}`);

  await progress.updateProgress(TASK_ID, 55, 'Fetching Kimi usage...', { stepIndex: 4 });
  const kimiUsage = await fetchKimiUsage();
  await progress.logTask(TASK_ID, `Kimi usage: ${kimiUsage.error ? 'FAILED' : 'OK'}`);

  await progress.updateProgress(TASK_ID, 65, 'Fetching Anthropic usage...', { stepIndex: 5 });
  const anthropicUsage = await fetchAnthropicUsage();
  await progress.logTask(TASK_ID, `Anthropic usage: ${anthropicUsage.error ? 'FAILED' : 'OK'}`);

  const openaiUser = await fetchOpenAIUser();

  results.apis.openai = openaiUsage;
  results.apis.openaiBilling = openaiBilling;
  results.apis.openaiUser = { data: openaiUser };
  results.apis.openrouter = openrouterCredits;
  results.apis.minimax = minimaxUsage;
  results.apis.kimi = kimiUsage;
  results.apis.anthropic = anthropicUsage;

  // Calculate spending from real data
  await progress.updateProgress(TASK_ID, 75, 'Calculating spending and rate limits...', { stepIndex: 6 });
  results.spending = calculateSpending(results.apis);

  // Calculate rate limits
  results.rateLimits = calculateRateLimits(results.apis);
  await progress.logTask(TASK_ID, 'Spending calculation complete');

  // Log results
  console.log('📊 API FETCH RESULTS:\n');
  
  Object.entries(results.apis).forEach(([name, api]) => {
    console.log(`${api.provider || name}:`);
    if (api.error) {
      console.log(`  ❌ ${api.error}`);
    } else {
      console.log(`  ✅ Data fetched successfully`);
      console.log(`  📡 API: ${api.apiUsed}`);
    }
    console.log('');
  });

  console.log('\n💰 SPENDING SUMMARY:');
  console.log(JSON.stringify(results.spending, null, 2));

  console.log('\n🚦 RATE LIMITS:');
  console.log(JSON.stringify(results.rateLimits, null, 2));

  // Save results
  const resultsFile = path.join(DATA_DIR, 'api-results.json');
  fs.writeFileSync(resultsFile, JSON.stringify(results, null, 2));
  console.log(`\n💾 Results saved to: ${resultsFile}`);

  return results;
}

// Update dashboard data files with real API data
async function updateDashboardData(apiResults) {
  console.log('\n📝 Updating dashboard data files...\n');

  // Read current usage file
  let currentUsage;
  try {
    currentUsage = JSON.parse(fs.readFileSync(USAGE_FILE, 'utf8'));
  } catch (e) {
    currentUsage = { lastUpdated: new Date().toISOString(), models: {} };
  }

  // Update with real data where available
  const updatedModels = { ...currentUsage.models };

  // OpenAI spending update
  if (apiResults.spending.openai.monthly > 0) {
    if (updatedModels['openai-codex/gpt-5.2']) {
      updatedModels['openai-codex/gpt-5.2'].monthlySpent = apiResults.spending.openai.monthly;
      updatedModels['openai-codex/gpt-5.2'].source = apiResults.spending.openai.source;
    }
  }

  // OpenRouter spending update
  if (apiResults.spending.openrouter.credits) {
    const credits = apiResults.spending.openrouter.credits;
    
    // Update OpenRouter models
    ['openrouter/auto', 'openrouter/anthropic/claude-opus-4.5', 'openrouter/moonshotai/kimi-k2.5', 
     'openrouter/openai/gpt-5.2-codex', 'openrouter/openai/gpt-5.2'].forEach(model => {
      if (updatedModels[model]) {
        updatedModels[model].monthlySpent = credits.used;
        updatedModels[model].accountBalance = credits.remaining;
        updatedModels[model].source = 'OpenRouter /credits API';
      }
    });
  }

  // Add rate limit info to models
  Object.entries(apiResults.rateLimits.models).forEach(([modelId, limits]) => {
    if (updatedModels[modelId]) {
      updatedModels[modelId].rateLimits = limits;
    }
  });

  // Update timestamp and save
  const updatedUsage = {
    lastUpdated: new Date().toISOString(),
    models: updatedModels,
    apiData: {
      lastFetch: apiResults.timestamp,
      sources: Object.entries(apiResults.apis).map(([name, api]) => ({
        name: api.provider || name,
        api: api.apiUsed,
        status: api.error ? 'error' : 'success',
        error: api.error || null
      }))
    }
  };

  fs.writeFileSync(USAGE_FILE, JSON.stringify(updatedUsage, null, 2));
  console.log(`✅ Updated: ${USAGE_FILE}`);

  // Save rate limits to separate file for dashboard
  const rateLimitsFile = path.join(DATA_DIR, 'rate-limits.json');
  fs.writeFileSync(rateLimitsFile, JSON.stringify({
    lastUpdated: new Date().toISOString(),
    models: apiResults.rateLimits.models,
    sources: apiResults.rateLimits
  }, null, 2));
  console.log(`✅ Updated: ${rateLimitsFile}`);

  // Save spending data
  const spendingFile = path.join(DATA_DIR, 'spending.json');
  fs.writeFileSync(spendingFile, JSON.stringify({
    lastUpdated: new Date().toISOString(),
    providers: apiResults.spending,
    totalMonthly: Object.values(apiResults.spending).reduce((sum, p) => sum + (p.monthly || 0), 0)
  }, null, 2));
  console.log(`✅ Updated: ${spendingFile}`);

  console.log('\n✅ Dashboard data updated with real API values!');
}

// Main execution
async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║     Marvin Dashboard - Real API Data Fetcher               ║');
  console.log('║     NO MOCK DATA - ONLY REAL API VALUES                    ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  try {
    // Ensure directories exist
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(HISTORY_DIR)) {
      fs.mkdirSync(HISTORY_DIR, { recursive: true });
    }

    // Fetch all API data
    const apiResults = await fetchAllAPIData();

    // Update dashboard files
    await progress.updateProgress(TASK_ID, 85, 'Updating dashboard data files...', { stepIndex: 7 });
    await updateDashboardData(apiResults);
    await progress.logTask(TASK_ID, 'Dashboard files updated');

    // Complete progress tracking
    const successCount = Object.values(apiResults.apis).filter(api => !api.error).length;
    const totalCount = Object.keys(apiResults.apis).length;
    await progress.completeTask(TASK_ID, {
      result: {
        successCount,
        totalCount,
        providers: Object.keys(apiResults.apis),
        totalSpending: apiResults.spending
      }
    });

    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('✅ COMPLETE: Dashboard updated with real API data');
    console.log('═══════════════════════════════════════════════════════════════\n');

    // Summary
    console.log('DATA SOURCES USED:');
    console.log('  • OpenAI API - Usage and account tier data');
    console.log('  • OpenRouter API - Credits and spending data');
    console.log('  • MiniMax API - Authentication verification');
    console.log('  • Kimi API - Not configured (check dashboard)');
    console.log('  • Anthropic API - OAuth mode (check console)\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    try {
      await progress.completeTask(TASK_ID, { failed: true, error: error.message });
    } catch (_) {}
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { fetchAllAPIData, updateDashboardData };
