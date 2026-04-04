# Stealth Browser Automation System

Advanced browser automation with anti-detection features for 24/7 operation.

## Features

- ✅ **Stealth Mode**: Evades bot detection with real Chrome fingerprinting
- ✅ **Persistent Profiles**: Cookies and localStorage saved between sessions
- ✅ **Auto-Login**: Automatic login for HEB, Facebook, and custom sites
- ✅ **Human-Like Behavior**: Realistic mouse movements and typing delays
- ✅ **Error Recovery**: Automatic retry and recovery on failures
- ✅ **Screenshot Capability**: Capture page state for debugging
- ✅ **24/7 Ready**: Robust enough for continuous operation

## Installation

```bash
npm install
```

## Configuration

Copy `.env.example` to `.env` and fill in your credentials:

```bash
cp .env.example .env
```

## Quick Start

### Run Tests
```bash
npm test
```

### Run Demo (opens visible browser)
```bash
npm run demo
```

### HEB Automation
```bash
npm run heb
```

### Facebook Automation
```bash
npm run facebook
```

## Usage

### Basic Browser Usage

```javascript
const { StealthBrowser } = require('./index');

const browser = new StealthBrowser({
  profile: 'my-profile',  // Persistent profile name
  headless: true,         // Run in background
  slowMo: 50             // Delay between actions (ms)
});

await browser.launch();
await browser.navigate('https://example.com');
await browser.type('#search', 'hello world');
await browser.click('#submit');
await browser.screenshot({ filename: 'result.png' });
await browser.close();
```

### HEB Automation

```javascript
const { HEBAutomation } = require('./index');

const heb = new HEBAutomation({ headless: false });
await heb.initialize();

// Set credentials (first time only)
heb.credentials.setCredentials('heb', 'your@email.com', 'yourpassword');

// Build cart
const results = await heb.buildCart([
  { name: 'whole milk', quantity: 1 },
  { name: 'sourdough bread', quantity: 2 },
  { name: 'organic eggs', quantity: 1 }
]);

console.log(results);
await heb.shutdown();
```

### Facebook Marketplace Automation

```javascript
const { FacebookAutomation } = require('./index');

const fb = new FacebookAutomation({ headless: false });
await fb.initialize();

// Search Marketplace
const listings = await fb.searchMarketplace('playstation 5');
console.log(`Found ${listings.length} listings`);

// Filter by price
await fb.setPriceFilter(300, 500);

// View a listing
const details = await fb.viewListing(listings[0].url);
console.log(details);

// Message seller
await fb.messageSeller(listings[0].url, 'Is this still available?');

await fb.shutdown();
```

## Project Structure

```
dinner-automation/browser/
├── src/
│   ├── StealthBrowser.js      # Core browser with stealth features
│   ├── CredentialManager.js   # Secure credential storage
│   ├── AutoLogin.js          # Auto-login handlers
│   └── AutomationBase.js     # Base class for automations
├── scripts/
│   ├── heb-browser.js        # HEB.com automation
│   └── facebook-browser.js   # Facebook automation
├── profiles/                 # Persistent browser profiles
├── logs/                     # Screenshots and logs
├── index.js                  # Main exports
├── test.js                   # Test suite
└── package.json
```

## Stealth Features

The browser includes multiple layers of anti-detection:

1. **User Agent**: Real Chrome user agents
2. **Viewport**: Common desktop resolutions
3. **WebGL**: Spoofed vendor/renderer strings
4. **Canvas**: Fingerprint randomization
5. **Plugins**: Realistic plugin list
6. **WebDriver**: Navigator.webdriver undefined
7. **Chrome Runtime**: Mocked chrome object
8. **Mouse Movement**: Curved, human-like paths
9. **Typing Delays**: Variable delays between keystrokes
10. **Timezone & Locale**: Consistent US/English settings

## Environment Variables

```env
# HEB Credentials
HEB_EMAIL=your@email.com
HEB_PASSWORD=yourpassword

# Facebook Credentials
FACEBOOK_EMAIL=your@email.com
FACEBOOK_PASSWORD=yourpassword

# Location (for store selection)
DEFAULT_STORE=Buda
DEFAULT_LOCATION=Austin, TX
```

## Error Handling

The system includes multiple recovery mechanisms:

- Automatic retry with exponential backoff
- Browser restart on connection loss
- Screenshot capture on errors
- Detailed logging to `logs/browser.log`

## Logging

Logs are stored in `logs/`:
- `browser.log` - General operations
- `browser-error.log` - Errors only
- Screenshots saved with timestamps

## License

MIT
