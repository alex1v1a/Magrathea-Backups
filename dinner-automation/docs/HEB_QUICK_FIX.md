# HEB Cart Fix - Quick Implementation Guide

## Problem
HEB cart automation is being detected by anti-bot systems (likely DataDome/Cloudflare).

## Immediate Fix (5 minutes)

### Option 1: Switch to Patchright (Recommended)

```bash
# Uninstall standard Playwright
pip uninstall playwright

# Install undetected version
pip install patchright
patchright install chromium
```

Update your code:
```python
# OLD import
# from playwright.async_api import async_playwright

# NEW import
from patchright.async_api import async_playwright

# Rest of your code stays the SAME!
```

### Option 2: Add Basic Stealth to Current Playwright

```python
browser = await playwright.chromium.launch(
    headless=False,  # CRITICAL: Use headed mode
    args=[
        '--disable-blink-features=AutomationControlled',
        '--disable-features=IsolateOrigins,site-per-process',
    ]
)

context = await browser.new_context(
    viewport={'width': 1920, 'height': 1080},
    user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36',
    locale='en-US',
    timezone_id='America/Chicago',
)

# Remove webdriver flag
await context.add_init_script("""
    Object.defineProperty(navigator, 'webdriver', {
        get: () => undefined
    });
""")
```

## Best Long-Term Fix: Chrome Extension

See full research doc for extension code. Key benefits:
- Runs in REAL browser (virtually undetectable)
- User already logged in
- No headless browser detection issues

## Key Changes to Make

1. **Use headed mode** (`headless=False`) - Headless is easily detected
2. **Add random delays** between actions (1.5-4 seconds)
3. **Use realistic viewport** (1920x1080 minimum)
4. **Set timezone** to America/Chicago (HEB is Texas-based)
5. **Remove navigator.webdriver** flag
6. **Consider residential proxies** if IP gets blocked

## Testing

Test your fix at:
- https://bot.sannysoft.com
- https://nowsecure.nl

If these pass, HEB should work.

## Full Research

See `HEB_ANTI_BOT_RESEARCH.md` for:
- 5 complete solution implementations with code
- Human-like mouse movement code
- HEB-specific selectors
- Proxy recommendations
