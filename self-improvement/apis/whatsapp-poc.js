/**
 * WhatsApp Business API POC
 * Integration for notifications and alerts
 * 
 * @module apis/whatsapp-poc
 */

const https = require('https');

// Configuration (use environment variables in production)
const CONFIG = {
  apiKey: process.env.WHATSAPP_API_KEY,
  phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID,
  businessAccountId: process.env.WHATSAPP_BUSINESS_ACCOUNT_ID,
  baseUrl: 'https://graph.facebook.com/v18.0'
};

/**
 * Send WhatsApp message
 */
async function sendMessage(to, message, options = {}) {
  const url = `${CONFIG.baseUrl}/${CONFIG.phoneNumberId}/messages`;
  
  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: formatPhoneNumber(to),
    type: 'text',
    text: {
      body: message,
      preview_url: options.previewUrl || false
    }
  };
  
  return makeRequest(url, 'POST', payload);
}

/**
 * Send template message (for notifications)
 */
async function sendTemplateMessage(to, templateName, language = 'en', components = []) {
  const url = `${CONFIG.baseUrl}/${CONFIG.phoneNumberId}/messages`;
  
  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: formatPhoneNumber(to),
    type: 'template',
    template: {
      name: templateName,
      language: { code: language },
      components
    }
  };
  
  return makeRequest(url, 'POST', payload);
}

/**
 * Send media message (image, document)
 */
async function sendMediaMessage(to, mediaType, mediaUrl, caption = '') {
  const url = `${CONFIG.baseUrl}/${CONFIG.phoneNumberId}/messages`;
  
  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: formatPhoneNumber(to),
    type: mediaType,
    [mediaType]: {
      link: mediaUrl,
      caption
    }
  };
  
  return makeRequest(url, 'POST', payload);
}

/**
 * Format phone number for WhatsApp API
 */
function formatPhoneNumber(number) {
  // Remove non-numeric characters
  let cleaned = number.replace(/\D/g, '');
  
  // Ensure it starts with country code
  if (!cleaned.startsWith('1') && cleaned.length === 10) {
    cleaned = '1' + cleaned; // Add US country code
  }
  
  return cleaned;
}

/**
 * Make HTTPS request
 */
function makeRequest(url, method, payload) {
  return new Promise((resolve, reject) => {
    const options = {
      method,
      headers: {
        'Authorization': `Bearer ${CONFIG.apiKey}`,
        'Content-Type': 'application/json'
      }
    };
    
    const req = https.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(parsed);
          } else {
            reject(new Error(`API Error: ${parsed.error?.message || data}`));
          }
        } catch (e) {
          resolve(data);
        }
      });
    });
    
    req.on('error', reject);
    
    if (payload) {
      req.write(JSON.stringify(payload));
    }
    
    req.end();
  });
}

/**
 * Send order confirmation notification
 */
async function sendOrderConfirmation(phoneNumber, orderDetails) {
  const message = `🛒 *Order Confirmed!*\n\n` +
    `Order #: ${orderDetails.orderNumber}\n` +
    `Store: ${orderDetails.store}\n` +
    `Pickup: ${orderDetails.pickupTime}\n\n` +
    `Items: ${orderDetails.itemCount}\n` +
    `Total: $${orderDetails.total}\n\n` +
    `We'll notify you when your order is ready!`;
  
  return sendMessage(phoneNumber, message);
}

/**
 * Send delivery slot alert
 */
async function sendDeliverySlotAlert(phoneNumber, slots) {
  const slotList = slots.map(s => `• ${s.time} (${s.price})`).join('\n');
  
  const message = `📅 *New Delivery Slots Available!*\n\n${slotList}\n\n` +
    `Book now: https://www.heb.com/orders`;
  
  return sendMessage(phoneNumber, message);
}

/**
 * Send substitution notification
 */
async function sendSubstitutionNotification(phoneNumber, originalItem, substituteItem) {
  const message = `🔄 *Substitution Suggestion*\n\n` +
    `Original: ${originalItem.name} (${originalItem.price})\n` +
    `Substitute: ${substituteItem.name} (${substituteItem.price})\n\n` +
    `Would you like to accept this substitution?\n` +
    `Reply YES to accept or NO to remove from cart.`;
  
  return sendMessage(phoneNumber, message);
}

// Example usage
async function demo() {
  console.log('WhatsApp Business API POC');
  console.log('=========================\n');
  
  // Check configuration
  if (!CONFIG.apiKey) {
    console.log('⚠️  WHATSAPP_API_KEY not set');
    console.log('   Set environment variable to enable WhatsApp integration\n');
    console.log('Features available:');
    console.log('  - Order confirmations');
    console.log('  - Delivery slot alerts');
    console.log('  - Substitution notifications');
    console.log('  - Rich media messages\n');
    console.log('Pricing: ~$0.005 per conversation (24-hour window)');
    return;
  }
  
  // Demo: Send test message
  try {
    const testNumber = process.env.TEST_PHONE_NUMBER;
    if (testNumber) {
      console.log(`Sending test message to ${testNumber}...`);
      
      const result = await sendMessage(
        testNumber,
        '👋 This is a test message from your automation system!'
      );
      
      console.log('✓ Message sent:', result.messages?.[0]?.id);
    }
  } catch (error) {
    console.error('✗ Failed:', error.message);
  }
}

if (require.main === module) {
  demo();
}

module.exports = {
  sendMessage,
  sendTemplateMessage,
  sendMediaMessage,
  sendOrderConfirmation,
  sendDeliverySlotAlert,
  sendSubstitutionNotification,
  formatPhoneNumber
};
