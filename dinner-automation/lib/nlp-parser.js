/**
 * Enhanced NLP Parser for Dinner Plan Replies
 * 
 * Improvements over v1:
 * - Fuzzy matching for recipe names (handles typos)
 * - Sentiment analysis for tone detection
 * - Confidence scoring with clarification prompts
 * - Complex request handling ("make Monday lighter")
 * - Multi-intent parsing ("Swap Monday to X and remove Tuesday")
 * 
 * Usage:
 *   const { parseReply } = require('../lib/nlp-parser');
 *   const result = parseReply("Swap monday to chiken alfredo");
 */

const fs = require('fs').promises;
const path = require('path');

// Load recipe database for fuzzy matching
let recipeDatabase = null;
let recipeNames = [];

async function loadRecipeDatabase() {
  if (recipeDatabase) return recipeDatabase;
  
  try {
    const data = await fs.readFile(
      path.join(__dirname, '..', 'data', 'recipe-database.json'),
      'utf8'
    );
    const db = JSON.parse(data);
    recipeDatabase = db.recipes || {};
    recipeNames = Object.keys(recipeDatabase);
    return recipeDatabase;
  } catch {
    recipeDatabase = {};
    recipeNames = [];
    return {};
  }
}

// ============================================================================
// FUZZY MATCHING UTILITIES
// ============================================================================

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(a, b) {
  const matrix = [];
  
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }
  
  return matrix[b.length][a.length];
}

/**
 * Calculate similarity score (0-1) between two strings
 */
function similarityScore(a, b) {
  const aLower = a.toLowerCase();
  const bLower = b.toLowerCase();
  
  // Exact match
  if (aLower === bLower) return 1.0;
  
  // Contains
  if (aLower.includes(bLower) || bLower.includes(aLower)) return 0.9;
  
  // Levenshtein distance
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1.0;
  
  const distance = levenshteinDistance(aLower, bLower);
  return 1 - (distance / maxLen);
}

/**
 * Find closest matching recipe name
 */
function findClosestRecipe(input, threshold = 0.6) {
  let bestMatch = null;
  let bestScore = 0;
  
  for (const name of recipeNames) {
    const score = similarityScore(input, name);
    if (score > bestScore && score >= threshold) {
      bestScore = score;
      bestMatch = name;
    }
  }
  
  return bestMatch ? { name: bestMatch, score: bestScore } : null;
}

/**
 * Find recipe by partial match
 */
function findRecipeByPartial(input) {
  const inputLower = input.toLowerCase();
  
  // Direct contains
  for (const name of recipeNames) {
    if (name.toLowerCase().includes(inputLower)) {
      return { name, score: 0.8 };
    }
  }
  
  // Word-by-word match
  const inputWords = inputLower.split(/\s+/);
  for (const name of recipeNames) {
    const nameLower = name.toLowerCase();
    let matchCount = 0;
    
    for (const word of inputWords) {
      if (word.length > 3 && nameLower.includes(word)) {
        matchCount++;
      }
    }
    
    const score = matchCount / inputWords.length;
    if (score >= 0.5) {
      return { name, score };
    }
  }
  
  return null;
}

// ============================================================================
// SENTIMENT ANALYSIS
// ============================================================================

const SENTIMENT_PATTERNS = {
  positive: [
    /\b(?:great|awesome|excellent|perfect|love|fantastic|amazing|wonderful|delicious|yum|yummy|tasty)\b/gi,
    /\b(?:looks?\s+(?:good|great|amazing)|sounds?\s+(?:good|great|perfect))\b/gi,
    /\b(?:can't\s+wait|excited|looking\s+forward)\b/gi,
    /\b(?:yes+|yep|yeah|sure|absolutely|definitely)\b/gi,
    /\b(?:confirmed?|approved?|go\s+ahead)\b/gi
  ],
  negative: [
    /\b(?:bad|terrible|awful|hate|dislike|gross|disgusting)\b/gi,
    /\b(?:don't\s+(?:like|want)|do\s+not\s+(?:like|want))\b/gi,
    /\b(?:no\s+(?:way|thanks)|nope|never)\b/gi,
    /\b(?:remove|delete|drop|skip)\s+(?:all|everything)\b/gi
  ],
  frustrated: [
    /\b(?:ugh|annoying|frustrating|problem|issue|error|wrong|confused)\b/gi,
    /\b(?:why\s+(?:is|does|did)|what\s+(?:is|happened))\b/gi,
    /[!]{2,}/g, // Multiple exclamation marks
    /\b(?:fix|correct|change)\s+(?:this|that|it)\b/gi
  ],
  uncertain: [
    /\b(?:maybe|perhaps|possibly|might|not\s+sure|uncertain|idk)\b/gi,
    /\?/g, // Question marks
    /\b(?:what\s+(?:about|if)|how\s+about)\b/gi
  ]
};

/**
 * Analyze sentiment of text
 */
function analyzeSentiment(text) {
  const scores = { positive: 0, negative: 0, frustrated: 0, uncertain: 0 };
  
  for (const [sentiment, patterns] of Object.entries(SENTIMENT_PATTERNS)) {
    for (const pattern of patterns) {
      const matches = text.match(pattern);
      if (matches) {
        scores[sentiment] += matches.length;
      }
    }
  }
  
  // Determine dominant sentiment
  const dominant = Object.entries(scores).sort((a, b) => b[1] - a[1])[0];
  
  return {
    dominant: dominant[1] > 0 ? dominant[0] : 'neutral',
    scores,
    isPositive: scores.positive > scores.negative && scores.positive > 0,
    isNegative: scores.negative > scores.positive,
    isFrustrated: scores.frustrated > 0,
    isUncertain: scores.uncertain > 0
  };
}

// ============================================================================
// INTENT PATTERNS (Enhanced)
// ============================================================================

const INTENT_PATTERNS = {
  confirm: {
    patterns: [
      /\b(?:looks?\s+good|sounds?\s+good|perfect|great|awesome|excellent|confirm(?:ed)?|approve[d]?)\b/i,
      /\b(?:yes+|yep|yeah|ok(?:ay)?|sure|works?\s+(?:for\s+me|fine))\b/i,
      /\b(?:i'm?\s+(?:good|happy|satisfied)|all\s+(?:good|set|fine)|go\s+ahead|proceed)\b/i,
      /\b(?:no\s+changes?|nothing\s+(?:to\s+)?change|keep\s+(?:it|them|as\s+is))\b/i,
      /\b(?:send\s+it|ship\s+it|let'?s\s+do\s+it)\b/i
    ],
    weight: 1.0
  },
  
  swap: {
    patterns: [
      /\b(?:swap|change|replace|switch|trade)\s+(?<target>.+?)\s+(?:to|with|for)\s+(?<replacement>.+?)(?:\s|$|\.)/i,
      /\b(?:make|set)\s+(?<day>\w+day)\s+(?:into|to|:)?\s*(?<replacement>.+?)(?:\s|$|\.)/i,
      /\binstead\s+of\s+(?<target>.+?),?\s+(?:do|make|have)\s+(?<replacement>.+?)(?:\s|$|\.)/i,
      /\b(?:swap\s+out|replace)\s+(?<target>.+?)(?:\s+for\s+(?<replacement>.+?))?(?:\s|$|\.)/i,
      /\b(?<day>\w+day)\s+(?:should\s+be|to)\s+(?<replacement>.+?)(?:\s|$|\.)/i,
      /\b(?<target>.+?)\s+is\s+(?:now|changed\s+to)\s+(?<replacement>.+?)(?:\s|$|\.)/i
    ],
    weight: 0.95
  },
  
  remove: {
    patterns: [
      /\b(?:remove|delete|drop|skip|cancel|get\s+rid\s+of|eliminate)\s+(?<target>.+?)(?:\s|$|\.)/i,
      /\b(?:no\s+(?:need\s+for)?|don't\s+(?:need|want))\s+(?<target>.+?)(?:\s|$|\.)/i,
      /\b(?:remove|skip)\s+(?<day>\w+day)(?:\s+(?:dinner|meal))?(?:\s|$|\.)/i,
      /\b(?:take\s+out|cut)\s+(?<target>.+?)(?:\s|$|\.)/i,
      /\b(?:not\s+(?:doing|having|cooking))\s+(?<target>.+?)(?:\s|$|\.)/i,
      /\b(?<day>\w+day)\s+(?:is\s+)?(?:off|canceled|cancelled|skipped)(?:\s|$|\.)/i
    ],
    weight: 0.9
  },
  
  add: {
    patterns: [
      /\b(?:add|include|insert|put\s+in)\s+(?<meal>.+?)(?:\s+(?:to|on)\s+(?<day>\w+day))?(?:\s|$|\.)/i,
      /\b(?:also\s+)?(?:want|need|like)\s+(?<meal>.+?)(?:\s+(?:on|for)\s+(?<day>\w+day))?(?:\s|$|\.)/i,
      /\b(?:let'?s?\s+(?:add|have)|can\s+we\s+add)\s+(?<meal>.+?)(?:\s|$|\.)/i,
      /\b(?<day>\w+day)\s+(?:add|include)\s+(?<meal>.+?)(?:\s|$|\.)/i,
      /\band\s+(?<meal>.+?)(?:\s+on\s+(?<day>\w+day))?(?:\s*$|\s+too|\s+also)/i
    ],
    weight: 0.85
  },
  
  modify: {
    patterns: [
      /\b(?:make|set)\s+(?<target>.+?)\s+(?<attribute>lighter|heavier|easier|cheaper|fancier|healthier|simpler|quicker)(?:\s|$|\.)/i,
      /\b(?<target>.+?)\s+(?:should\s+be)?\s+(?<attribute>lighter|heavier|easier|cheaper|fancier|healthier)(?:\s|$|\.)/i,
      /\b(?:less\s+(?:expensive|heavy|complex)|more\s+(?:healthy|fancy|simple))\s+(?:for\s+)?(?<target>.+?)(?:\s|$|\.)/i,
      /\bdouble\s+(?:the\s+)?(?:portion|serving)s?(?:\s+for\s+)?(?<target>.+?)(?:\s|$|\.)/i,
      /\bhalf\s+(?:the\s+)?(?:portion|serving)s?(?:\s+for\s+)?(?<target>.+?)(?:\s|$|\.)/i
    ],
    weight: 0.75
  },
  
  question: {
    patterns: [
      /\b(?:what|how|when|where|why|can|could|would|will|is|are|does|do)\b[^.!?]+[.!?]/gi,
      /\?\s*$/
    ],
    weight: 0.6
  }
};

const DAY_NAMES = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const DAY_ABBREVIATIONS = ['mon', 'tue', 'tues', 'wed', 'thu', 'thur', 'thurs', 'fri', 'sat', 'sun'];

/**
 * Extract day from text
 */
function extractDay(text) {
  const lower = text.toLowerCase();
  
  // Full day names
  for (const day of DAY_NAMES) {
    if (lower.includes(day)) {
      return day.charAt(0).toUpperCase() + day.slice(1);
    }
  }
  
  // Abbreviations (more specific)
  const abbrevMap = {
    'mon': 'Monday',
    'tue': 'Tuesday', 'tues': 'Tuesday',
    'wed': 'Wednesday',
    'thu': 'Thursday', 'thur': 'Thursday', 'thurs': 'Thursday',
    'fri': 'Friday',
    'sat': 'Saturday',
    'sun': 'Sunday'
  };
  
  for (const [abbrev, full] of Object.entries(abbrevMap)) {
    // Use word boundaries
    const regex = new RegExp(`\\b${abbrev}\\b`, 'i');
    if (regex.test(lower)) {
      return full;
    }
  }
  
  return null;
}

/**
 * Extract meal name with fuzzy matching
 */
async function extractMeal(text, context = {}) {
  await loadRecipeDatabase();
  
  // Try fuzzy matching
  const fuzzy = findClosestRecipe(text);
  if (fuzzy && fuzzy.score >= 0.7) {
    return { name: fuzzy.name, confidence: fuzzy.score, method: 'fuzzy' };
  }
  
  // Try partial matching
  const partial = findRecipeByPartial(text);
  if (partial) {
    return { name: partial.name, confidence: partial.score, method: 'partial' };
  }
  
  // Return as-is with low confidence
  return { name: text.trim(), confidence: 0.3, method: 'raw' };
}

/**
 * Parse a single sentence
 */
async function parseSentence(sentence) {
  const actions = [];
  const lower = sentence.toLowerCase();
  
  // Check each intent
  for (const [intent, config] of Object.entries(INTENT_PATTERNS)) {
    for (const pattern of config.patterns) {
      const match = sentence.match(pattern);
      if (match) {
        const groups = match.groups || {};
        let action = { intent, confidence: config.weight };
        
        switch (intent) {
          case 'confirm':
            action = { ...action, action: 'confirm' };
            break;
            
          case 'swap':
            const swapDay = extractDay(groups.day || groups.target || sentence);
            const newMeal = groups.replacement 
              ? await extractMeal(groups.replacement)
              : null;
            action = {
              ...action,
              action: 'swap',
              day: swapDay,
              targetMeal: groups.target,
              newMeal: newMeal?.name,
              mealConfidence: newMeal?.confidence
            };
            break;
            
          case 'remove':
            const removeDay = extractDay(groups.day || groups.target || sentence);
            action = {
              ...action,
              action: 'remove',
              day: removeDay,
              targetMeal: groups.target
            };
            break;
            
          case 'add':
            const addDay = extractDay(groups.day || sentence);
            const addMeal = groups.meal 
              ? await extractMeal(groups.meal)
              : null;
            action = {
              ...action,
              action: 'add',
              day: addDay,
              mealName: addMeal?.name,
              mealConfidence: addMeal?.confidence
            };
            break;
            
          case 'modify':
            const modDay = extractDay(groups.target || sentence);
            action = {
              ...action,
              action: 'modify',
              day: modDay,
              targetMeal: groups.target,
              attribute: groups.attribute
            };
            break;
        }
        
        actions.push(action);
      }
    }
  }
  
  return actions;
}

// ============================================================================
// MAIN PARSER
// ============================================================================

/**
 * Parse a reply message
 * @param {string} text - The reply text
 * @returns {Object} Parsed result with actions, confidence, sentiment
 */
async function parseReply(text) {
  if (!text || typeof text !== 'string') {
    return {
      intent: 'unknown',
      actions: [],
      confidence: 0,
      sentiment: analyzeSentiment(''),
      needsClarification: true,
      clarificationPrompt: "I didn't understand that. Please try 'Looks good' or 'Swap Monday to Chicken'."
    };
  }
  
  // Clean text
  const cleaned = text
    .replace(/\r\n/g, ' ')
    .replace(/\n+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  
  // Split into sentences
  const sentences = cleaned
    .split(/[.!?]+/)
    .map(s => s.trim())
    .filter(s => s.length > 0);
  
  // Analyze sentiment
  const sentiment = analyzeSentiment(cleaned);
  
  // Parse each sentence
  let allActions = [];
  for (const sentence of sentences) {
    const actions = await parseSentence(sentence);
    allActions.push(...actions);
  }
  
  // Remove duplicates
  const seen = new Set();
  allActions = allActions.filter(a => {
    const key = `${a.action}-${a.day}-${a.mealName || a.newMeal}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  
  // Calculate overall confidence
  let confidence = 0;
  if (allActions.length > 0) {
    confidence = allActions.reduce((sum, a) => sum + (a.confidence || 0), 0) / allActions.length;
  }
  
  // Determine if clarification needed
  const needsClarification = confidence < 0.5 || 
    allActions.some(a => a.mealConfidence && a.mealConfidence < 0.6);
  
  // Generate clarification prompt if needed
  let clarificationPrompt = null;
  if (needsClarification) {
    const lowConfActions = allActions.filter(a => a.mealConfidence && a.mealConfidence < 0.6);
    if (lowConfActions.length > 0) {
      clarificationPrompt = `Did you mean "${lowConfActions[0].newMeal || lowConfActions[0].mealName}"? ` +
        `I can suggest similar recipes if that's not quite right.`;
    } else {
      clarificationPrompt = "I'm not sure I understood. Could you rephrase? Try 'Swap Monday to Chicken Alfredo'.";
    }
  }
  
  // Determine primary intent
  const primaryIntent = allActions.length > 0 
    ? allActions[0].intent 
    : (sentiment.isPositive ? 'confirm' : 'unknown');
  
  return {
    intent: primaryIntent,
    actions: allActions,
    confidence,
    sentiment,
    needsClarification,
    clarificationPrompt,
    raw: text,
    cleaned
  };
}

/**
 * Generate human-readable summary
 */
function summarize(result) {
  if (result.actions.length === 0) {
    return result.clarificationPrompt || "I couldn't understand your reply. Please try phrases like 'Looks good', 'Swap Monday to Chicken', or 'Remove Tuesday'.";
  }
  
  const lines = [];
  
  // Add sentiment indicator
  if (result.sentiment.isFrustrated) {
    lines.push("⚠️ I sense some frustration. Let me help clarify:");
  } else if (result.sentiment.isPositive) {
    lines.push("😊 Great! Here's what I understood:");
  }
  
  // Summarize actions
  for (const action of result.actions) {
    switch (action.action) {
      case 'confirm':
        lines.push("✅ Confirm all meals");
        break;
      case 'swap':
        lines.push(`↔️ Swap ${action.day || 'meal'} to "${action.newMeal}"`);
        break;
      case 'remove':
        lines.push(`🗑️ Remove ${action.day || action.targetMeal || 'meal'}`);
        break;
      case 'add':
        lines.push(`➕ Add "${action.mealName}" ${action.day ? `on ${action.day}` : ''}`);
        break;
      case 'modify':
        lines.push(`✏️ Make ${action.day || 'meal'} ${action.attribute}`);
        break;
    }
  }
  
  // Add confidence note
  if (result.confidence < 0.7) {
    lines.push("\n_(I'm not entirely sure - let me know if I misunderstood!)_");
  }
  
  return lines.join('\n');
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  parseReply,
  summarize,
  analyzeSentiment,
  findClosestRecipe,
  similarityScore,
  extractDay,
  extractMeal
};

// CLI for testing
if (require.main === module) {
  const testPhrase = process.argv[2] || "Swap monday to chiken alfredo";
  
  console.log('Testing NLP Parser v2\n');
  console.log(`Input: "${testPhrase}"\n`);
  
  parseReply(testPhrase).then(result => {
    console.log('Results:');
    console.log(JSON.stringify(result, null, 2));
    console.log('\n--- Summary ---');
    console.log(summarize(result));
  });
}
