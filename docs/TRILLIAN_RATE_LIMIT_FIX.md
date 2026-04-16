# Rate Limit Fix for Trillian - 2026-04-14

## Issue
**Error:** Both Moonshot and Kimi APIs rate limited
**Context:** Switching to Claude Opus primary model
**Impact:** All models failing, cannot complete operation

## Immediate Solutions

### Option 1: Wait and Retry (Quickest)
```bash
# Rate limits reset after 60 seconds
sleep 60
# Retry the operation
```

### Option 2: Direct Config Edit (Bypass API calls)
```bash
# Edit config directly without API validation
openclaw config set agents.defaults.model.primary anthropic/claude-opus-4-6
openclaw config set agents.defaults.subagents.model kimi-coding/k2p5
openclaw gateway restart
```

### Option 3: Reduce Concurrency (Prevent recurrence)
```json
"agents": {
  "defaults": {
    "maxConcurrent": 4,  // Reduce from 16
    "subagents": {
      "maxConcurrent": 8  // Reduce from 16
    }
  }
}
```

### Option 4: API Key Refresh
```bash
# Verify keys are valid
openclaw config get env.MOONSHOT_API_KEY
openclaw config get env.KIMI_API_KEY

# If expired, update from Bitwarden
```

## Root Cause Analysis

**Why this happened:**
1. Maximum subagent spawning (16 concurrent)
2. Multiple teammates spawning simultaneously
3. API rate limits shared across organization
4. Hit quota on both primary and subagent models

**Prevention:**
- Implement request queuing
- Add exponential backoff
- Monitor API usage rates
- Balance parallelism with quotas

## Recommended Fix for Trillian

**Step 1:** Wait 60 seconds for rate limit reset
**Step 2:** Edit config directly (no API calls)
**Step 3:** Restart gateway
**Step 4:** Verify with `openclaw status`

## Long-term Solution

Implement rate limit handling:
```python
# Pseudo-code for retry logic
max_retries = 3
for attempt in range(max_retries):
    try:
        response = api_call()
        break
    except RateLimitError:
        wait_time = 2 ** attempt  # Exponential backoff
        sleep(wait_time)
```

---
Created: 2026-04-14 8:25 PM CDT
