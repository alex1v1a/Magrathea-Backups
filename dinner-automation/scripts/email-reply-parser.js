/**
 * Email Reply Parser
 * Parses dinner plan email replies for exclusions and stock items
 */

class EmailReplyParser {
  /**
   * Parse email reply text for dinner plan changes
   * Handles format like:
   * Exclude: Kimchi, Fresh asparagus, Capers
   * Already have: Dijon mustard, Sesame seeds, Sea salt, Olive oil
   */
  static parseReply(text) {
    const result = {
      exclusions: [],
      stockItems: [],
      approvals: false,
      rejections: false,
      adjustments: [],
      rawText: text.substring(0, 1000)
    };

    // Extract only the actual reply (before quoted text)
    const replyText = this.extractReplyText(text);

    // Parse exclusions
    result.exclusions = this.parseExclusions(replyText);

    // Parse stock items
    result.stockItems = this.parseStockItems(replyText);

    // Check for approvals/rejections
    result.approvals = this.checkApproval(replyText);
    result.rejections = this.checkRejection(replyText);

    // Parse adjustments
    result.adjustments = this.parseAdjustments(replyText);

    return result;
  }

  /**
   * Extract only the reply portion (before quoted original message)
   */
  static extractReplyText(text) {
    const replyMarkers = [
      'On Feb', 'On Jan', 'On Mar', 'On Apr', 'On May', 'On Jun',
      'On Jul', 'On Aug', 'On Sep', 'On Oct', 'On Nov', 'On Dec',
      '-------- Original Message --------',
      'From: Marvin Dinner Bot',
      '> Weekly Dinner Plan',
      '________________________________',
      '___________________________________________'
    ];

    let replyText = text;
    for (const marker of replyMarkers) {
      const index = replyText.indexOf(marker);
      if (index !== -1) {
        replyText = replyText.substring(0, index).trim();
        break;
      }
    }

    return replyText;
  }

  /**
   * Parse exclusion items from reply
   */
  static parseExclusions(text) {
    const exclusions = [];

    // Look for "Exclude:" or "Exclude" followed by list
    const exclusionPatterns = [
      /exclude[d]?:\s*([^\n]+)/i,
      /exclude\s+([^.\n]+?)(?:\n|\.\s|$)/i,
      /no\s*:?\s*([^\n]+)/i,
      /skip\s*:?\s*([^\n]+)/i,
      /don'?t\s+(?:want|need|like)\s*:?\s*([^\n]+)/i
    ];

    for (const pattern of exclusionPatterns) {
      const match = text.match(pattern);
      if (match) {
        const items = match[1]
          .split(/,|\band\b|\bor\b/)
          .map(s => s.trim())
          .filter(s => s.length > 1 && s.length < 50 && !this.isCommonNoiseWord(s));
        exclusions.push(...items);
      }
    }

    return [...new Set(exclusions)];
  }

  /**
   * Parse stock items from reply
   */
  static parseStockItems(text) {
    const stockItems = [];

    const stockPatterns = [
      /already\s*have[d]?:\s*([^\n]+)/i,
      /have\s*:?\s*([^\n]+?)(?:\n|already|\s+so)/i,
      /don'?t\s*need\s*:?\s*([^\n]+)/i,
      /got\s+([^\n]+?)\s+already/i
    ];

    for (const pattern of stockPatterns) {
      const match = text.match(pattern);
      if (match) {
        const items = match[1]
          .split(/,|\band\b|\bor\b/)
          .map(s => s.trim())
          .filter(s => s.length > 1 && s.length < 50 && !this.isCommonNoiseWord(s));
        stockItems.push(...items);
      }
    }

    return [...new Set(stockItems)];
  }

  /**
   * Check for approval keywords
   */
  static checkApproval(text) {
    const approvalKeywords = ['approve', 'looks good', 'sounds good', 'great', 'perfect', 'ok', 'okay', 'yes', 'confirmed', 'works for me'];
    const lowerText = text.toLowerCase();
    return approvalKeywords.some(kw => lowerText.includes(kw));
  }

  /**
   * Check for rejection keywords
   */
  static checkRejection(text) {
    const rejectionKeywords = ['reject', 'cancel', 'stop', 'no', 'don\'t like', 'hate', 'don\'t want'];
    const lowerText = text.toLowerCase();
    return rejectionKeywords.some(kw => lowerText.includes(kw) && !text.toLowerCase().includes('don\'t need'));
  }

  /**
   * Parse adjustment requests
   */
  static parseAdjustments(text) {
    const adjustments = [];
    const lines = text.split('\n');

    for (const line of lines) {
      const lower = line.toLowerCase();

      if (lower.match(/\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/)) {
        const dayMatch = lower.match(/\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/);
        const mealMatch = line.match(/(?:to|with|for)\s+(.+?)(?:\.|$|,)/i);

        if (dayMatch) {
          adjustments.push({
            day: dayMatch[1],
            suggestedChange: mealMatch ? mealMatch[1].trim() : null,
            originalLine: line.trim()
          });
        }
      }
    }

    return adjustments;
  }

  /**
   * Check if word is common noise word to filter out
   */
  static isCommonNoiseWord(word) {
    const noiseWords = [
      'the', 'this', 'that', 'plan', 'meals', 'dinners', 'week', 'next',
      'don\'t', 'won\'t', 'can\'t', 'thanks', 'please', 'help', 'it'
    ];
    return noiseWords.includes(word.toLowerCase());
  }
}

module.exports = { EmailReplyParser };
