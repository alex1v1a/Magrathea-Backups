/**
 * Discord Webhook Notifier for Dinner Plans
 * Used as a backup when email delivery fails
 */

const https = require('https');
const http = require('http');
const { URL } = require('url');

// Default webhook URL - should be overridden with environment variable
const DEFAULT_WEBHOOK_URL = process.env.DINNER_DISCORD_WEBHOOK || '';

class DiscordNotifier {
  constructor(webhookUrl = DEFAULT_WEBHOOK_URL) {
    this.webhookUrl = webhookUrl;
  }

  /**
   * Check if Discord webhook is configured
   */
  isConfigured() {
    return !!this.webhookUrl && this.webhookUrl.startsWith('https://discord.com/api/webhooks/');
  }

  /**
   * Send a message to Discord via webhook
   * @param {Object} payload - Discord webhook payload
   * @returns {Promise<Object>}
   */
  async sendWebhook(payload) {
    if (!this.isConfigured()) {
      throw new Error('Discord webhook URL not configured. Set DINNER_DISCORD_WEBHOOK environment variable.');
    }

    const url = new URL(this.webhookUrl);
    const data = JSON.stringify(payload);

    const options = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname + url.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    };

    return new Promise((resolve, reject) => {
      const req = https.request(options, (res) => {
        let responseData = '';
        res.on('data', (chunk) => responseData += chunk);
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve({ success: true, statusCode: res.statusCode });
          } else {
            reject(new Error(`Discord webhook failed: ${res.statusCode} - ${responseData}`));
          }
        });
      });

      req.on('error', (error) => reject(error));
      req.write(data);
      req.end();
    });
  }

  /**
   * Send dinner plan notification
   * @param {Object} weeklyPlan - The weekly meal plan
   * @param {Object} cartSummary - Optional cart summary
   */
  async sendDinnerPlan(weeklyPlan, cartSummary = null) {
    const fields = weeklyPlan.meals.map((meal, i) => ({
      name: `${this.getDayEmoji(i)} ${meal.day}: ${meal.name}`,
      value: `Category: ${meal.category} | Prep: ${meal.prepTime} | Est: $${meal.estimatedCost}`,
      inline: false
    }));

    const embed = {
      title: `🍽️ Weekly Dinner Plan - Week of ${weeklyPlan.weekOf}`,
      description: `Generated: ${new Date(weeklyPlan.metadata.generatedAt).toLocaleString()}`,
      color: 0x4CAF50, // Green
      fields: [
        {
          name: '💰 Budget Summary',
          value: `Allocated: $${weeklyPlan.budget.allocated.toFixed(2)}\n` +
                 `Estimated: $${weeklyPlan.budget.estimatedMealCost.toFixed(2)}\n` +
                 `Buffer (10%): $${weeklyPlan.budget.buffer.toFixed(2)}\n` +
                 `**Total: $${weeklyPlan.budget.totalWithBuffer.toFixed(2)}**\n` +
                 `Remaining: $${weeklyPlan.budget.remaining.toFixed(2)}`,
          inline: true
        },
        ...fields
      ],
      footer: {
        text: 'Dinner Automation System • Reply with: approve, change [day] to [meal], add [item], etc.'
      },
      timestamp: new Date().toISOString()
    };

    if (cartSummary) {
      embed.fields.push({
        name: '🛒 HEB Cart',
        value: `Status: ${cartSummary.status}\nItems: ${cartSummary.items?.length || 'N/A'}`,
        inline: true
      });
    }

    const payload = {
      content: '@here 🍽️ New weekly dinner plan is ready for review!',
      embeds: [embed]
    };

    return this.sendWebhook(payload);
  }

  /**
   * Send test notification
   */
  async sendTest() {
    const payload = {
      content: '🧪 Dinner Automation - Test Notification',
      embeds: [{
        title: 'Discord Webhook Test',
        description: 'If you can see this message, the Discord webhook is working correctly!\n\nThis is a backup notification method when email delivery fails.',
        color: 0x2196F3, // Blue
        fields: [
          {
            name: 'Recipients',
            value: 'alex@1v1a.com\nsferrazzaa96@gmail.com',
            inline: true
          },
          {
            name: 'Status',
            value: '✅ Discord webhook active',
            inline: true
          }
        ],
        footer: {
          text: 'Marvin 🤖 Dinner Automation System'
        },
        timestamp: new Date().toISOString()
      }]
    };

    return this.sendWebhook(payload);
  }

  /**
   * Send notification about email delivery failure
   * @param {Error} error - The email error
   * @param {Object} weeklyPlan - The plan that failed to send
   */
  async sendEmailFailureNotification(error, weeklyPlan) {
    const payload = {
      content: '@here ⚠️ Email delivery failed - Dinner plan attached below',
      embeds: [{
        title: '⚠️ Email Delivery Failed',
        description: `The dinner plan email was not delivered.\n\n**Error:** ${error.message || 'Unknown error'}`,
        color: 0xFF5722, // Orange/Red
        fields: [
          {
            name: '📧 Intended Recipients',
            value: 'alex@1v1a.com\nsferrazzaa96@gmail.com',
            inline: true
          },
          {
            name: '📅 Week Of',
            value: weeklyPlan?.weekOf || 'Unknown',
            inline: true
          },
          {
            name: '💡 Action Required',
            value: 'Please check the dinner plan in this message and reply with any changes needed.',
            inline: false
          }
        ],
        footer: {
          text: 'Email delivery issue detected - using Discord backup'
        },
        timestamp: new Date().toISOString()
      }]
    };

    // Add meal summary if available
    if (weeklyPlan?.meals) {
      const mealList = weeklyPlan.meals.map((m, i) => 
        `${i + 1}. ${m.day}: ${m.name} ($${m.estimatedCost})`
      ).join('\n');
      
      payload.embeds[0].fields.push({
        name: '🍽️ This Week\'s Meals',
        value: mealList.substring(0, 1024), // Discord field limit
        inline: false
      });
    }

    return this.sendWebhook(payload);
  }

  /**
   * Get emoji for day of week
   */
  getDayEmoji(index) {
    const emojis = ['☀️', '🌙', '🔥', '💧', '🌳', '⭐', '🌸'];
    return emojis[index] || '📅';
  }
}

module.exports = { DiscordNotifier };

// CLI usage
if (require.main === module) {
  const notifier = new DiscordNotifier();
  const args = process.argv.slice(2);

  if (args.includes('--test')) {
    notifier.sendTest()
      .then(() => {
        console.log('✓ Test notification sent to Discord');
        process.exit(0);
      })
      .catch(err => {
        console.error('✗ Failed to send test:', err.message);
        process.exit(1);
      });
  } else {
    console.log('Usage:');
    console.log('  node discord-notifier.js --test    # Send test notification');
    console.log('');
    console.log('Environment variable:');
    console.log('  DINNER_DISCORD_WEBHOOK=<webhook_url>  # Discord webhook URL');
  }
}
