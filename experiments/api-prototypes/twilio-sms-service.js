# Twilio SMS API Prototype

Enhanced SMS capabilities for automation notifications and confirmations.

## Overview

This prototype demonstrates Twilio's Programmable Messaging API for:
- Dinner confirmation SMS (existing use case expansion)
- Priority alerts and reminders
- Two-way SMS for quick responses
- Scheduled message delivery
- Bulk notifications

## Setup

1. Sign up at https://www.twilio.com
2. Get Account SID and Auth Token from Console Dashboard
3. Buy a phone number or use existing one
4. Set environment variables

### Installation
```bash
npm install twilio
```

## Pricing

### SMS Pricing (US)
- Outbound SMS: ~$0.0075 per message
- Inbound SMS: ~$0.0075 per message
- MMS (pictures): ~$0.02 per message
- Phone number: ~$1.15/month

### Cost Estimates
- Daily dinner confirmation: $0.0075 × 30 = $0.23/month
- Weekly meal plan notification: $0.0075 × 4 = $0.03/month
- Emergency alerts (rare): Negligible
- **Total estimated: ~$1.50-2.00/month including phone number**

## Prototype Code

```javascript
const twilio = require('twilio');

class TwilioSMSService {
  constructor() {
    this.accountSid = process.env.TWILIO_ACCOUNT_SID;
    this.authToken = process.env.TWILIO_AUTH_TOKEN;
    this.phoneNumber = process.env.TWILIO_PHONE_NUMBER;
    
    if (!this.accountSid || !this.authToken) {
      throw new Error('Twilio credentials not configured');
    }
    
    this.client = twilio(this.accountSid, this.authToken);
    this.messageLog = []; // In production, use a database
  }

  /**
   * Send a simple SMS message
   */
  async sendSMS(to, message, options = {}) {
    try {
      const messageParams = {
        body: message,
        from: this.phoneNumber,
        to: this._formatPhoneNumber(to)
      };

      // Add media URL if provided (MMS)
      if (options.mediaUrl) {
        messageParams.mediaUrl = options.mediaUrl;
      }

      // Add status callback URL for delivery tracking
      if (options.statusCallback) {
        messageParams.statusCallback = options.statusCallback;
        messageParams.statusCallbackMethod = 'POST';
      }

      const response = await this.client.messages.create(messageParams);

      // Log the message
      this._logMessage({
        sid: response.sid,
        to: to,
        body: message,
        status: response.status,
        timestamp: new Date(),
        direction: 'outbound'
      });

      return {
        success: true,
        sid: response.sid,
        status: response.status,
        to: to,
        message: message.substring(0, 50) + (message.length > 50 ? '...' : '')
      };

    } catch (error) {
      console.error('SMS Send Error:', error.message);
      return {
        success: false,
        error: error.message,
        to: to
      };
    }
  }

  /**
   * Send dinner confirmation SMS (primary use case)
   */
  async sendDinnerConfirmation(phoneNumber, dinnerDetails) {
    const message = `🍽️ Dinner Tonight: ${dinnerDetails.mealName}

⏰ Ready at: ${dinnerDetails.time}
📍 Location: ${dinnerDetails.location || 'Home'}

Ingredients needed:
${dinnerDetails.ingredients?.slice(0, 3).join('\n')}${dinnerDetails.ingredients?.length > 3 ? '\n...' : ''}

Reply YES if you're eating home tonight, or NO if plans changed.`;

    return await this.sendSMS(phoneNumber, message, {
      statusCallback: process.env.TWILIO_STATUS_CALLBACK_URL
    });
  }

  /**
   * Send weekly meal plan summary
   */
  async sendWeeklyMealPlan(phoneNumber, mealPlan) {
    const meals = mealPlan.meals.map((m, i) => 
      `${['Mon','Tue','Wed','Thu','Fri','Sat','Sun'][i]}: ${m.name}`
    ).join('\n');

    const message = `📅 This Week's Dinners (${mealPlan.weekOf}):

${meals}

💰 Est. Budget: $${mealPlan.totalBudget}
🛒 HEB Cart: ${mealPlan.cartStatus || 'Ready to review'}

Reply VIEW for full details or SHOP to auto-approve.`;

    return await this.sendSMS(phoneNumber, message);
  }

  /**
   * Send priority alert (weather, urgent, etc.)
   */
  async sendPriorityAlert(phoneNumber, alert) {
    const emoji = alert.type === 'weather' ? '⛈️' :
                  alert.type === 'urgent' ? '🚨' :
                  alert.type === 'reminder' ? '⏰' : '⚠️';

    const message = `${emoji} ${alert.title}

${alert.message}

${alert.actionRequired ? `Action needed: ${alert.action}` : ''}

Reply DONE when handled or HELP for assistance.`;

    return await this.sendSMS(phoneNumber, message);
  }

  /**
   * Send grocery reminder
   */
  async sendGroceryReminder(phoneNumber, items) {
    const itemList = items.slice(0, 5).map(i => `• ${i}`).join('\n');
    const more = items.length > 5 ? `\n...and ${items.length - 5} more items` : '';

    const message = `🛒 Grocery Reminder

Don't forget to pick up:
${itemList}${more}

📍 HEB Buda closes at 11 PM

Reply GOT for each item you purchase.`;

    return await this.sendSMS(phoneNumber, message);
  }

  /**
   * Send meal prep reminder
   */
  async sendMealPrepReminder(phoneNumber, prepTasks) {
    const tasks = prepTasks.map(t => `□ ${t}`).join('\n');

    const message = `🍳 Meal Prep Sunday

Get ahead for the week:
${tasks}

⏱️ Total time: ~${prepTasks.length * 10} mins

Reply DONE when finished!`;

    return await this.sendSMS(phoneNumber, message);
  }

  /**
   * Handle incoming SMS replies
   */
  async handleIncomingMessage(from, body, messageSid) {
    const response = body.trim().toUpperCase();
    const phoneNumber = this._formatPhoneNumber(from);

    // Log the incoming message
    this._logMessage({
      sid: messageSid,
      from: phoneNumber,
      body: body,
      timestamp: new Date(),
      direction: 'inbound'
    });

    // Process based on response type
    const handlers = {
      'YES': () => this._handleConfirmation(phoneNumber, true),
      'NO': () => this._handleConfirmation(phoneNumber, false),
      'DONE': () => this._handleTaskComplete(phoneNumber),
      'SHOP': () => this._handleAutoApprove(phoneNumber),
      'VIEW': () => this._handleViewDetails(phoneNumber),
      'GOT': () => this._handleItemReceived(phoneNumber, body),
      'HELP': () => this._handleHelpRequest(phoneNumber),
      'STOP': () => this._handleOptOut(phoneNumber),
      'START': () => this._handleOptIn(phoneNumber)
    };

    // Check for exact matches first
    if (handlers[response]) {
      return await handlers[response]();
    }

    // Check for partial matches
    if (response.includes('YES') || response.includes('Y')) {
      return await handlers['YES']();
    }
    if (response.includes('NO') || response.includes('N')) {
      return await handlers['NO']();
    }

    // Default response for unrecognized messages
    return await this._sendDefaultReply(phoneNumber);
  }

  /**
   * Schedule a message for later delivery
   */
  async scheduleMessage(to, message, sendAt, options = {}) {
    try {
      // Twilio doesn't natively support scheduling, so we store and send later
      // In production, use a job queue like Bull or node-cron
      const scheduledMessage = {
        id: `msg_${Date.now()}`,
        to: this._formatPhoneNumber(to),
        message: message,
        scheduledFor: sendAt,
        options: options,
        status: 'scheduled'
      };

      // Store in your job queue
      this._scheduleForLater(scheduledMessage);

      return {
        success: true,
        scheduledId: scheduledMessage.id,
        scheduledFor: sendAt
      };

    } catch (error) {
      console.error('Schedule Error:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get message delivery status
   */
  async getMessageStatus(messageSid) {
    try {
      const message = await this.client.messages(messageSid).fetch();
      return {
        sid: message.sid,
        status: message.status,
        to: message.to,
        from: message.from,
        dateSent: message.dateSent,
        dateUpdated: message.dateUpdated,
        errorMessage: message.errorMessage
      };
    } catch (error) {
      console.error('Status Check Error:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get message history for a phone number
   */
  async getMessageHistory(phoneNumber, limit = 10) {
    const formattedNumber = this._formatPhoneNumber(phoneNumber);
    
    return this.messageLog
      .filter(m => m.to === formattedNumber || m.from === formattedNumber)
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  /**
   * Send bulk messages (use responsibly)
   */
  async sendBulkMessages(recipients, messageTemplate, variables = {}) {
    const results = [];
    
    for (const recipient of recipients) {
      // Replace variables in template
      let message = messageTemplate;
      for (const [key, value] of Object.entries(variables)) {
        message = message.replace(new RegExp(`{{${key}}}`, 'g'), value);
      }
      
      // Add personalization if provided
      if (recipient.name) {
        message = message.replace('{{name}}', recipient.name);
      }

      const result = await this.sendSMS(recipient.phone, message);
      results.push({
        recipient: recipient.phone,
        ...result
      });

      // Rate limiting - max 1 message per second
      await this._sleep(1000);
    }

    return {
      total: recipients.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results: results
    };
  }

  // ============== Private Helper Methods ==============

  _formatPhoneNumber(number) {
    // Ensure E.164 format (+1XXXXXXXXXX)
    let cleaned = number.replace(/\D/g, '');
    if (cleaned.length === 10) {
      cleaned = '1' + cleaned;
    }
    return '+' + cleaned;
  }

  _logMessage(messageData) {
    this.messageLog.push(messageData);
    // In production, save to database
    console.log(`[SMS ${messageData.direction.toUpperCase()}] ${messageData.to || messageData.from}: ${messageData.body?.substring(0, 30)}...`);
  }

  async _handleConfirmation(phoneNumber, confirmed) {
    const message = confirmed 
      ? "✅ Got it! Dinner plan confirmed. I'll have the ingredients ready."
      : "👍 No problem! I'll adjust the plan. Check your email for alternatives.";
    
    // Update dinner tracking system
    await this._updateDinnerStatus(phoneNumber, confirmed ? 'confirmed' : 'declined');
    
    return await this.sendSMS(phoneNumber, message);
  }

  async _handleTaskComplete(phoneNumber) {
    return await this.sendSMS(phoneNumber, "🎉 Nice work! Task marked complete. On to the next one! 💪");
  }

  async _handleAutoApprove(phoneNumber) {
    return await this.sendSMS(phoneNumber, "🛒 Auto-approving HEB cart... Check your email for the order summary!");
  }

  async _handleViewDetails(phoneNumber) {
    return await this.sendSMS(phoneNumber, "📧 Full details sent to your email! Check alex@1v1a.com");
  }

  async _handleItemReceived(phoneNumber, originalMessage) {
    return await this.sendSMS(phoneNumber, "✓ Item marked as purchased! Keep it up!");
  }

  async _handleHelpRequest(phoneNumber) {
    const helpMessage = `🤖 Available commands:
• YES/NO - Confirm dinner plans
• DONE - Mark task complete  
• SHOP - Auto-approve cart
• VIEW - Get details via email
• STOP - Pause notifications
• START - Resume notifications`;
    
    return await this.sendSMS(phoneNumber, helpMessage);
  }

  async _handleOptOut(phoneNumber) {
    // Add to opt-out list
    console.log(`[OPT-OUT] ${phoneNumber}`);
    return await this.sendSMS(phoneNumber, "You've been unsubscribed. Reply START to resume notifications.");
  }

  async _handleOptIn(phoneNumber) {
    console.log(`[OPT-IN] ${phoneNumber}`);
    return await this.sendSMS(phoneNumber, "🎉 Welcome back! You're now subscribed to dinner notifications.");
  }

  async _sendDefaultReply(phoneNumber) {
    return await this.sendSMS(phoneNumber, 
      "I didn't catch that. Reply HELP for available commands or contact alex@1v1a.com for assistance.");
  }

  async _updateDinnerStatus(phoneNumber, status) {
    // Integration point with dinner automation system
    console.log(`[DINNER STATUS] ${phoneNumber}: ${status}`);
    // In production: update database, trigger automation
  }

  _scheduleForLater(scheduledMessage) {
    // In production: add to job queue
    console.log(`[SCHEDULED] Message to ${scheduledMessage.to} at ${scheduledMessage.scheduledFor}`);
  }

  _sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Express webhook handler for incoming messages
function createWebhookHandler(twilioService) {
  return async (req, res) => {
    const { From, Body, MessageSid } = req.body;
    
    console.log(`[INCOMING SMS] From: ${From}, Body: ${Body}`);
    
    const response = await twilioService.handleIncomingMessage(From, Body, MessageSid);
    
    // Send TwiML response if needed
    res.set('Content-Type', 'text/xml');
    res.send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>${response.message || 'Received!'}</Message>
</Response>`);
  };
}

// Example usage
async function runExamples() {
  const sms = new TwilioSMSService();

  console.log('=== Twilio SMS Service Examples ===\n');

  // Example 1: Send dinner confirmation
  console.log('1. Sending dinner confirmation...');
  const dinnerResult = await sms.sendDinnerConfirmation('808-381-8835', {
    mealName: 'Grilled Salmon with Asparagus',
    time: '6:30 PM',
    ingredients: ['Salmon fillets', 'Asparagus', 'Lemon', 'Olive oil', 'Garlic']
  });
  console.log('Result:', dinnerResult);

  // Example 2: Send weekly meal plan
  console.log('\n2. Sending weekly meal plan...');
  const weeklyResult = await sms.sendWeeklyMealPlan('808-381-8835', {
    weekOf: 'Feb 16-22',
    totalBudget: 200,
    cartStatus: 'Pending approval',
    meals: [
      { name: 'Chicken Stir Fry' },
      { name: 'Taco Tuesday' },
      { name: 'Pasta Primavera' },
      { name: 'Grilled Salmon' },
      { name: 'Beef Tacos' },
      { name: 'Pizza Night' },
      { name: 'Leftover Remix' }
    ]
  });
  console.log('Result:', weeklyResult);

  // Example 3: Send priority alert
  console.log('\n3. Sending priority alert...');
  const alertResult = await sms.sendPriorityAlert('808-381-8835', {
    type: 'weather',
    title: 'Severe Weather Alert',
    message: 'Severe thunderstorms expected 5-8 PM. Consider indoor dinner option.',
    actionRequired: false
  });
  console.log('Result:', alertResult);

  // Example 4: Handle incoming message
  console.log('\n4. Simulating incoming message handling...');
  const incomingResult = await sms.handleIncomingMessage('+18083818835', 'YES', 'SM123456');
  console.log('Response:', incomingResult);

  // Example 5: Get message history
  console.log('\n5. Getting message history...');
  const history = await sms.getMessageHistory('808-381-8835', 5);
  console.log('History:', history);
}

module.exports = { TwilioSMSService, createWebhookHandler };

// Run examples if called directly
if (require.main === module) {
  runExamples().catch(console.error);
}
```

## Environment Variables

```bash
# Required
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_PHONE_NUMBER=+1xxxxxxxxxx

# Optional - for webhook callbacks
TWILIO_STATUS_CALLBACK_URL=https://your-domain.com/sms/status
TWILIO_WEBHOOK_URL=https://your-domain.com/sms/webhook
```

## Use Cases Demonstrated

1. **Dinner Confirmation** - Primary use case, replaces email for urgent confirmations
2. **Weekly Meal Plan** - SMS summary with quick action keywords
3. **Priority Alerts** - Weather, urgent notifications with immediate delivery
4. **Grocery Reminders** - Pickup reminders while out
5. **Meal Prep Reminders** - Sunday prep task lists
6. **Two-Way SMS** - Handle YES/NO/DONE/HELP responses
7. **Message Scheduling** - Schedule reminders in advance
8. **Delivery Tracking** - Track message status
9. **Bulk Messaging** - Send to multiple family members

## Integration with Dinner Automation

```javascript
const { TwilioSMSService } = require('./twilio-sms-service');

// In your dinner automation cron job
async function sendDinnerNotification(dinnerPlan) {
  const sms = new TwilioSMSService();
  
  // Send to Alexander
  await sms.sendDinnerConfirmation('808-381-8835', {
    mealName: dinnerPlan.mealName,
    time: dinnerPlan.scheduledTime,
    ingredients: dinnerPlan.ingredients
  });
  
  // Send to Alexandra if shared plan
  await sms.sendDinnerConfirmation('xxx-xxx-xxxx', {
    mealName: dinnerPlan.mealName,
    time: dinnerPlan.scheduledTime,
    ingredients: dinnerPlan.ingredients
  });
}

// Webhook endpoint for replies
app.post('/sms/webhook', createWebhookHandler(smsService));
```

## Webhook Setup

1. In Twilio Console > Phone Numbers > Active Numbers
2. Select your number
3. Under "Messaging":
   - Configure with: Webhooks
   - A message comes in: POST to your webhook URL
   - Primary handler fails: Use fallback URL

## Rate Limits

- 1 message per second per number (recommended)
- Burst: Up to 100 messages per second (with multiple numbers)
- Daily limit: Varies by account type

## Best Practices

1. **Always honor STOP requests** - Required by law
2. **Keep messages under 160 chars** - Avoid split SMS
3. **Use MMS sparingly** - Costs more, use for images
4. **Implement retry logic** - Handle failures gracefully
5. **Log everything** - Track delivery and responses
6. **Test in staging first** - Use test credentials
7. **Personalize when possible** - Use {{name}} variables

## Message Templates

```javascript
// Keep templates under 160 characters
templates: {
  confirmation: '🍽️ Dinner: {{meal}} at {{time}}. Reply YES to confirm.',
  reminder: '⏰ {{task}} due today! Reply DONE when complete.',
  alert: '⚠️ {{title}}: {{message}}',
  weekly: '📅 This week: {{summary}}. Reply SHOP to approve.'
}
```

## Next Steps

1. Sign up for Twilio account
2. Get phone number
3. Configure webhooks
4. Set up environment variables
5. Test all message types
6. Integrate with dinner automation
7. Add to Marvin Dashboard for monitoring

## Alternative: Use Email-to-SMS Gateways (Free)

If Twilio costs are a concern, use carrier email gateways:
- AT&T: number@txt.att.net
- Verizon: number@vtext.com
- T-Mobile: number@tmomail.net

```javascript
// Free alternative using nodemailer
async function sendFreeSMS(phoneNumber, carrier, message) {
  const gateways = {
    'att': 'txt.att.net',
    'verizon': 'vtext.com',
    'tmobile': 'tmomail.net'
  };
  
  const email = `${phoneNumber}@${gateways[carrier]}`;
  // Send via nodemailer...
}
```
