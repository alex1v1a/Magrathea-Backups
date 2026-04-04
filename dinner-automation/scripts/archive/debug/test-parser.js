const { ExcludeManager } = require('./exclude-manager');
const { StockManager } = require('./stock-manager');

/**
 * Parse email reply for dinner plan changes
 * Handles format like:
 * Exclude: Kimchi, Fresh asparagus, Capers
 * Already have: Dijon mustard, Sesame seeds, Sea salt, Olive oil
 */
function parseEmailReply(text) {
  const result = {
    exclusions: [],
    stockItems: [],
    rawText: text.substring(0, 500)
  };

  // Extract only the actual reply (before quoted text)
  const replyMarkers = [
    'On Feb', 'On Jan', 'On Mar', 'On Apr', 'On May', 'On Jun',
    'On Jul', 'On Aug', 'On Sep', 'On Oct', 'On Nov', 'On Dec',
    '-------- Original Message --------',
    'From: Marvin Dinner Bot',
    '> Weekly Dinner Plan',
    '________________________________'
  ];

  let replyText = text;
  for (const marker of replyMarkers) {
    const index = replyText.indexOf(marker);
    if (index !== -1) {
      replyText = replyText.substring(0, index).trim();
      break;
    }
  }

  // Parse exclusions - look for "Exclude:" or "Exclude" followed by list
  const exclusionPatterns = [
    /exclude[d]?:\s*([^\n]+)/i,
    /exclude\s+([^.\n]+)/i,
    /no\s*:?\s*([^\n]+)/i,
    /skip\s*:?\s*([^\n]+)/i
  ];

  for (const pattern of exclusionPatterns) {
    const match = replyText.match(pattern);
    if (match) {
      const items = match[1]
        .split(/,|\band\b|\bor\b/)
        .map(s => s.trim())
        .filter(s => s.length > 1 && s.length < 50);
      result.exclusions.push(...items);
    }
  }

  // Parse stock items - look for "Already have:" or similar
  const stockPatterns = [
    /already\s*have[d]?:\s*([^\n]+)/i,
    /have\s*:?\s*([^\n]+)/i,
    /don't\s*need\s*:?\s*([^\n]+)/i,
    /don['']t\s*need\s*:?\s*([^\n]+)/i
  ];

  for (const pattern of stockPatterns) {
    const match = replyText.match(pattern);
    if (match) {
      const items = match[1]
        .split(/,|\band\b|\bor\b/)
        .map(s => s.trim())
        .filter(s => s.length > 1 && s.length < 50);
      result.stockItems.push(...items);
    }
  }

  // Remove duplicates
  result.exclusions = [...new Set(result.exclusions)];
  result.stockItems = [...new Set(result.stockItems)];

  return result;
}

// Test with the actual email
const testEmail = `Exclude: Kimchi, Fresh asparagus, Capers
Already have: Dijon mustard, Sesame seeds, Sea salt, Olive oil

On Feb 7, 2026, at 10:49 AM, Marvin Dinner Bot <MarvinMartian9@icloud.com> wrote:
> Weekly Dinner Plan
> ...`;

console.log('Testing email parser...\n');
console.log('Input:');
console.log(testEmail);
console.log('\nParsed result:');
const result = parseEmailReply(testEmail);
console.log(JSON.stringify(result, null, 2));

module.exports = { parseEmailReply };
