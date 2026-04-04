# Telegram Bot API Prototype

Mobile notifications and command interface for personal alerts.

## Setup

1. Message @BotFather on Telegram
2. Create new bot with `/newbot`
3. Copy the bot token
4. Start a chat with your bot
5. Get your chat ID from the getUpdates endpoint

## Installation

```bash
npm install node-fetch@2 node-telegram-bot-api
```

## Prototype Code

```javascript
const fetch = require('node-fetch');
const EventEmitter = require('events');

class TelegramBotService extends EventEmitter {
  constructor(botToken) {
    super();
    this.token = botToken;
    this.baseUrl = `https://api.telegram.org/bot${botToken}`;
    this.offset = 0;
    this.polling = false;
  }

  /**
   * Make API request
   */
  async _request(method, params = {}) {
    const url = `${this.baseUrl}/${method}`;
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params)
      });
      
      const data = await response.json();
      
      if (!data.ok) {
        throw new Error(`Telegram API error: ${data.description}`);
      }
      
      return data.result;
    } catch (error) {
      console.error(`Telegram API error (${method}):`, error.message);
      throw error;
    }
  }

  /**
   * Send text message
   */
  async sendMessage(chatId, text, options = {}) {
    const params = {
      chat_id: chatId,
      text: text,
      parse_mode: options.parseMode || 'Markdown',
      disable_notification: options.silent || false,
      reply_to_message_id: options.replyTo || undefined
    };
    
    return this._request('sendMessage', params);
  }

  /**
   * Send notification with different priority levels
   */
  async notify(chatId, message, priority = 'normal') {
    const icons = {
      low: 'ℹ️',
      normal: '📢',
      high: '⚠️',
      urgent: '🚨'
    };
    
    const icon = icons[priority] || icons.normal;
    const text = `${icon} *${priority.toUpperCase()}*\n\n${message}`;
    
    return this.sendMessage(chatId, text, { 
      silent: priority === 'low',
      parseMode: 'Markdown'
    });
  }

  /**
   * Send structured notification (rich formatting)
   */
  async sendStructuredNotification(chatId, { title, message, details = [], actions = [], priority = 'normal' }) {
    const priorityEmojis = {
      low: '🔵',
      normal: '🟢',
      high: '🟠',
      urgent: '🔴'
    };
    
    let text = `${priorityEmojis[priority]} *${title}*\n\n`;
    text += `${message}\n\n`;
    
    if (details.length > 0) {
      text += '*Details:*\n';
      details.forEach(detail => {
        text += `• ${detail}\n`;
      });
      text += '\n';
    }
    
    if (actions.length > 0) {
      text += '*Actions:*\n';
      actions.forEach(action => {
        text += `→ ${action}\n`;
      });
    }
    
    return this.sendMessage(chatId, text);
  }

  /**
   * Send photo/image
   */
  async sendPhoto(chatId, photoUrl, caption = '', options = {}) {
    return this._request('sendPhoto', {
      chat_id: chatId,
      photo: photoUrl,
      caption: caption,
      parse_mode: options.parseMode || 'Markdown'
    });
  }

  /**
   * Send document/file
   */
  async sendDocument(chatId, document, caption = '', options = {}) {
    return this._request('sendDocument', {
      chat_id: chatId,
      document: document,
      caption: caption,
      parse_mode: options.parseMode || 'Markdown'
    });
  }

  /**
   * Send daily summary
   */
  async sendDailySummary(chatId, { weather, tasks, calendar, news }) {
    let message = `📅 *Daily Summary - ${new Date().toLocaleDateString()}*\n\n`;
    
    if (weather) {
      message += `🌤️ *Weather*\n${weather}\n\n`;
    }
    
    if (tasks && tasks.length > 0) {
      message += `✅ *Tasks (${tasks.length})*\n`;
      tasks.slice(0, 5).forEach(task => {
        message += `${task.completed ? '☑️' : '⬜'} ${task.title}\n`;
      });
      if (tasks.length > 5) {
        message += `...and ${tasks.length - 5} more\n`;
      }
      message += '\n';
    }
    
    if (calendar && calendar.length > 0) {
      message += `📆 *Calendar*\n`;
      calendar.slice(0, 3).forEach(event => {
        message += `• ${event.time} - ${event.title}\n`;
      });
      message += '\n';
    }
    
    if (news && news.length > 0) {
      message += `📰 *Top News*\n`;
      news.slice(0, 3).forEach(item => {
        message += `• [${item.title}](${item.url})\n`;
      });
    }
    
    return this.sendMessage(chatId, message);
  }

  /**
   * Send system status update
   */
  async sendStatusUpdate(chatId, services) {
    let message = `🔍 *System Status*\n\n`;
    
    services.forEach(service => {
      const status = service.status === 'up' ? '🟢' : 
                     service.status === 'warning' ? '🟠' : '🔴';
      message += `${status} *${service.name}*\n`;
      message += `  ${service.message}\n`;
      if (service.latency) {
        message += `  Latency: ${service.latency}ms\n`;
      }
      message += '\n';
    });
    
    return this.sendMessage(chatId, message);
  }

  /**
   * Create inline keyboard
   */
  async sendInlineKeyboard(chatId, text, buttons) {
    const keyboard = {
      inline_keyboard: buttons.map(row => 
        row.map(btn => ({
          text: btn.text,
          callback_data: btn.data,
          url: btn.url
        }))
      )
    };
    
    return this._request('sendMessage', {
      chat_id: chatId,
      text: text,
      parse_mode: 'Markdown',
      reply_markup: keyboard
    });
  }

  /**
   * Get updates (for webhook or polling)
   */
  async getUpdates(limit = 100) {
    return this._request('getUpdates', {
      offset: this.offset,
      limit: limit,
      timeout: 30
    });
  }

  /**
   * Start polling for messages
   */
  startPolling() {
    this.polling = true;
    this._poll();
    console.log('Telegram bot polling started');
  }

  /**
   * Stop polling
   */
  stopPolling() {
    this.polling = false;
    console.log('Telegram bot polling stopped');
  }

  /**
   * Poll for updates
   */
  async _poll() {
    while (this.polling) {
      try {
        const updates = await this.getUpdates();
        
        for (const update of updates) {
          this.offset = update.update_id + 1;
          this._handleUpdate(update);
        }
      } catch (error) {
        console.error('Polling error:', error.message);
        await this._sleep(5000);
      }
    }
  }

  /**
   * Handle incoming update
   */
  _handleUpdate(update) {
    // Handle messages
    if (update.message) {
      const msg = update.message;
      this.emit('message', msg);
      
      // Handle commands
      if (msg.text && msg.text.startsWith('/')) {
        const parts = msg.text.slice(1).split(' ');
        const command = parts[0];
        const args = parts.slice(1);
        
        this.emit('command', { command, args, message: msg });
      }
    }
    
    // Handle callback queries (button clicks)
    if (update.callback_query) {
      this.emit('callback', update.callback_query);
    }
  }

  /**
   * Answer callback query (required for button clicks)
   */
  async answerCallbackQuery(callbackQueryId, text = '') {
    return this._request('answerCallbackQuery', {
      callback_query_id: callbackQueryId,
      text: text
    });
  }

  /**
   * Set webhook for production
   */
  async setWebhook(url) {
    return this._request('setWebhook', { url });
  }

  /**
   * Delete webhook
   */
  async deleteWebhook() {
    return this._request('deleteWebhook');
  }

  /**
   * Get bot info
   */
  async getMe() {
    return this._request('getMe');
  }

  /**
   * Sleep helper
   */
  _sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Command handlers example
class BotCommandHandler {
  constructor(botService) {
    this.bot = botService;
    this.setupHandlers();
  }

  setupHandlers() {
    this.bot.on('command', async ({ command, args, message }) => {
      const chatId = message.chat.id;
      
      switch (command) {
        case 'start':
          await this.bot.sendMessage(chatId, 
            '👋 Welcome! I\'m your personal assistant bot.\n\n' +
            'Commands:\n' +
            '/status - System status\n' +
            '/weather - Weather update\n' +
            '/tasks - List tasks\n' +
            '/summary - Daily summary\n' +
            '/help - Show help'
          );
          break;
          
        case 'help':
          await this.bot.sendMessage(chatId, 
            '*Available Commands:*\n\n' +
            '/start - Start the bot\n' +
            '/status - Check system status\n' +
            '/weather [city] - Get weather\n' +
            '/tasks - Show pending tasks\n' +
            '/summary - Daily briefing\n' +
            '/notify [message] - Send test notification\n' +
            '/help - Show this help'
          );
          break;
          
        case 'status':
          await this.bot.sendStatusUpdate(chatId, [
            { name: 'API Server', status: 'up', message: 'Running normally', latency: 45 },
            { name: 'Database', status: 'up', message: 'Healthy' },
            { name: 'Discord Bot', status: 'up', message: 'Connected' }
          ]);
          break;
          
        case 'weather':
          const city = args.join(' ') || 'Austin, TX';
          await this.bot.sendMessage(chatId, `🌤️ Fetching weather for ${city}...`);
          // Integrate with weather service
          break;
          
        case 'tasks':
          await this.bot.sendMessage(chatId, 
            '✅ *Pending Tasks*\n\n' +
            '⬜ Review API documentation\n' +
            '⬜ Test Notion integration\n' +
            '☑️ Create Telegram bot'
          );
          break;
          
        case 'summary':
          await this.bot.sendDailySummary(chatId, {
            weather: '75°F, Clear sky',
            tasks: [
              { title: 'Review API docs', completed: false },
              { title: 'Test integration', completed: true }
            ],
            calendar: [
              { time: '10:00 AM', title: 'Team Standup' },
              { time: '2:00 PM', title: 'Code Review' }
            ]
          });
          break;
          
        case 'notify':
          const msg = args.join(' ') || 'Test notification';
          await this.bot.notify(chatId, msg, 'normal');
          break;
          
        default:
          await this.bot.sendMessage(chatId, `Unknown command: /${command}. Try /help`);
      }
    });
  }
}

// Example usage
async function main() {
  const bot = new TelegramBotService(process.env.TELEGRAM_BOT_TOKEN);
  const handler = new BotCommandHandler(bot);
  
  // Get bot info
  const me = await bot.getMe();
  console.log(`Bot started: @${me.username}`);
  
  // Example: Send a notification
  const chatId = process.env.TELEGRAM_CHAT_ID;
  
  // Send different priority notifications
  // await bot.notify(chatId, 'Low priority info', 'low');
  // await bot.notify(chatId, 'Normal notification', 'normal');
  // await bot.notify(chatId, 'High priority alert!', 'high');
  // await bot.notify(chatId, 'URGENT: System down!', 'urgent');
  
  // Send structured notification
  // await bot.sendStructuredNotification(chatId, {
  //   title: 'Deployment Complete',
  //   message: 'Version 2.3.0 has been deployed successfully.',
  //   details: ['Build: #1234', 'Duration: 3m 42s', 'Status: Success'],
  //   actions: ['View logs', 'Open dashboard'],
  //   priority: 'normal'
  // });
  
  // Start polling for commands
  // bot.startPolling();
}

module.exports = { TelegramBotService, BotCommandHandler };

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}
```

## Environment Variables

```bash
TELEGRAM_BOT_TOKEN=123456789:ABCdefGHIjklMNOpqrsTUVwxyz
TELEGRAM_CHAT_ID=123456789  # Your personal chat ID
```

## Getting Your Chat ID

After starting your bot, visit:
```
https://api.telegram.org/bot<YOUR_TOKEN>/getUpdates
```

Look for `"chat":{"id":123456789` - that's your chat ID.

## Use Cases Demonstrated

1. **Priority Notifications** - Low/Normal/High/Urgent alert levels
2. **Structured Notifications** - Rich formatted messages with details and actions
3. **Daily Summaries** - Weather, tasks, calendar, news in one message
4. **System Monitoring** - Status updates with latency and health info
5. **Command Interface** - Interactive bot with /commands
6. **Inline Keyboards** - Button-based interactions

## Integration with Other Services

```javascript
// Combined with WeatherService
const weather = new WeatherService(process.env.OPENWEATHER_API_KEY);
const bot = new TelegramBotService(process.env.TELEGRAM_BOT_TOKEN);

async function sendWeatherAlert() {
  const briefing = await weather.getWeatherBriefing('Austin, TX');
  await bot.notify(process.env.TELEGRAM_CHAT_ID, briefing.formatted, 'normal');
}

// Combined with Notion
const notion = new NotionWorkflowIntegration(process.env.NOTION_API_KEY);

async function sendTaskReminder() {
  const summary = await notion.getDailySummary('DB_ID');
  if (summary.overdueCount > 0) {
    await bot.notify(
      process.env.TELEGRAM_CHAT_ID,
      `You have ${summary.overdueCount} overdue tasks!`,
      'high'
    );
  }
}
```

## Rate Limiting

Telegram has generous limits (~30 msgs/sec to same chat), but best practices:
- Batch notifications when possible
- Use appropriate priority levels
- Don't spam - respect the user

## Next Steps

1. Create bot with @BotFather
2. Get chat ID
3. Test notifications
4. Integrate with other services
5. Set up webhook for production (instead of polling)

## Example Notification

```
🟢 *Deployment Complete*

Version 2.3.0 has been deployed successfully.

*Details:*
• Build: #1234
• Duration: 3m 42s
• Status: Success

*Actions:*
→ View logs
→ Open dashboard
```
