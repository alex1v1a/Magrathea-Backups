/**
 * Twilio API Proof of Concept
 * Demonstrates expanded capabilities beyond basic SMS
 * 
 * Setup:
 * 1. npm install twilio
 * 2. Set env vars: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER
 * 3. For WhatsApp: WhatsApp Business account required
 */

const twilio = require('twilio');

class TwilioIntegration {
  constructor() {
    this.client = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );
    this.phoneNumber = process.env.TWILIO_PHONE_NUMBER;
    this.whatsappNumber = process.env.TWILIO_WHATSAPP_NUMBER; // Format: whatsapp:+1234567890
  }

  /**
   * USE CASE 1: Voice Calls for Urgent Alerts
   * Perfect for critical system failures or time-sensitive dinner confirmations
   */
  async makeVoiceCall(to, message, options = {}) {
    try {
      const call = await this.client.calls.create({
        to: to,
        from: this.phoneNumber,
        twiml: `
          <Response>
            <Say voice="${options.voice || 'alice'}" language="${options.language || 'en-US'}">
              ${message}
            </Say>
            ${options.gatherInput ? `
              <Gather input="speech dtmf" timeout="5" numDigits="1">
                <Say>Press 1 to confirm, or say confirm.</Say>
              </Gather>
            ` : ''}
          </Response>
        `,
        statusCallback: options.webhookUrl,
        statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
      });
      
      console.log('Voice call initiated:', call.sid);
      return { success: true, callSid: call.sid, status: call.status };
    } catch (error) {
      console.error('Voice call failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * USE CASE 2: WhatsApp Business Integration
   * Rich messaging with media support for dinner confirmations
   */
  async sendWhatsAppMessage(to, message, mediaUrl = null) {
    try {
      const messageData = {
        from: this.whatsappNumber,
        to: `whatsapp:${to.replace('whatsapp:', '')}`,
        body: message,
      };

      if (mediaUrl) {
        messageData.mediaUrl = [mediaUrl];
      }

      const msg = await this.client.messages.create(messageData);
      
      console.log('WhatsApp message sent:', msg.sid);
      return { success: true, messageSid: msg.sid, status: msg.status };
    } catch (error) {
      console.error('WhatsApp message failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * USE CASE 3: Two-Way Conversational Flows
   * Handle incoming messages and respond contextually
   */
  async handleIncomingMessage(from, body, messageSid) {
    // Parse intent from message
    const intent = this.parseIntent(body.toLowerCase());
    
    let response;
    switch (intent.type) {
      case 'confirm_dinner':
        response = await this.handleDinnerConfirmation(from, intent);
        break;
      case 'reschedule':
        response = this.handleRescheduleRequest(from, intent);
        break;
      case 'status':
        response = await this.getOrderStatus(from);
        break;
      default:
        response = "I didn't understand. Reply CONFIRM to confirm dinner, STATUS for order status, or RESCHEDULE to change pickup time.";
    }

    // Send response
    await this.sendSMS(from, response);
    return { handled: true, intent: intent.type };
  }

  parseIntent(message) {
    if (message.includes('confirm') || message.includes('yes')) {
      return { type: 'confirm_dinner', confidence: 'high' };
    }
    if (message.includes('reschedule') || message.includes('change')) {
      return { type: 'reschedule', confidence: 'medium' };
    }
    if (message.includes('status') || message.includes('where')) {
      return { type: 'status', confidence: 'high' };
    }
    return { type: 'unknown', confidence: 'low' };
  }

  /**
   * USE CASE 4: SMS with Scheduling (Future-dated messages)
   * Schedule dinner reminders in advance
   */
  async scheduleSMS(to, message, sendAt) {
    try {
      const msg = await this.client.messages.create({
        to: to,
        from: this.phoneNumber,
        body: message,
        scheduleType: 'fixed',
        sendAt: sendAt.toISOString(), // Must be between 15 mins and 7 days from now
      });
      
      console.log('Scheduled SMS:', msg.sid, 'for', sendAt);
      return { success: true, messageSid: msg.sid, scheduled: sendAt };
    } catch (error) {
      console.error('Schedule SMS failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * USE CASE 5: Conference Calls
   * Multi-party calls for family coordination
   */
  async createConferenceCall(participants, conferenceName) {
    try {
      const calls = [];
      for (const participant of participants) {
        const call = await this.client.calls.create({
          to: participant,
          from: this.phoneNumber,
          twiml: `
            <Response>
              <Say>You are being connected to the family conference.</Say>
              <Dial>
                <Conference startConferenceOnEnter="true" endConferenceOnExit="false">
                  ${conferenceName}
                </Conference>
              </Dial>
            </Response>
          `,
        });
        calls.push(call.sid);
      }
      
      return { success: true, conferenceName, callSids: calls };
    } catch (error) {
      console.error('Conference call failed:', error);
      return { success: false, error: error.message };
    }
  }

  // Helper methods
  async sendSMS(to, message) {
    return this.client.messages.create({
      to: to,
      from: this.phoneNumber,
      body: message,
    });
  }

  async handleDinnerConfirmation(from, intent) {
    // Integration point: Update dinner database
    return "✅ Dinner confirmed! Your meal will be ready for pickup at 6:00 PM. Reply STATUS for updates.";
  }

  handleRescheduleRequest(from, intent) {
    return "What time would you prefer? Reply with a time like '7pm' and I'll check availability.";
  }

  async getOrderStatus(from) {
    // Integration point: Query dinner automation system
    return "📦 Your order is being prepared. Estimated pickup: 6:00 PM.";
  }

  // Webhook handler for Express/Fastify
  static webhookHandler(req, res) {
    const twiml = new twilio.twiml.MessagingResponse();
    
    const from = req.body.From;
    const body = req.body.Body;
    const messageSid = req.body.MessageSid;

    // Process asynchronously
    const twilio = new TwilioIntegration();
    twilio.handleIncomingMessage(from, body, messageSid);

    // Immediate acknowledgment
    twiml.message('Processing your request...');
    res.type('text/xml');
    res.send(twiml.toString());
  }
}

// Demo usage
async function demo() {
  const twilio = new TwilioIntegration();

  // Demo 1: Urgent voice alert
  console.log('\n=== Demo 1: Voice Alert ===');
  // await twilio.makeVoiceCall(
  //   '+1234567890',
  //   'This is an urgent alert. Your dinner order requires immediate attention. Please check your messages.',
  //   { gatherInput: true }
  // );

  // Demo 2: WhatsApp with media (meal photo)
  console.log('\n=== Demo 2: WhatsApp Rich Message ===');
  // await twilio.sendWhatsAppMessage(
  //   '+1234567890',
  //   '🍽️ Your dinner for tonight: Grilled Salmon with roasted vegetables. Pickup at 6 PM!',
  //   'https://example.com/meal-photo.jpg'
  // );

  // Demo 3: Schedule reminder
  console.log('\n=== Demo 3: Scheduled Reminder ===');
  // const reminderTime = new Date();
  // reminderTime.setHours(reminderTime.getHours() + 4);
  // await twilio.scheduleSMS(
  //   '+1234567890',
  //   '⏰ Reminder: Pick up your dinner in 30 minutes!',
  //   reminderTime
  // );

  console.log('Demo complete - uncomment calls above to test with real credentials');
}

module.exports = { TwilioIntegration };

// Run if called directly
if (require.main === module) {
  demo();
}
