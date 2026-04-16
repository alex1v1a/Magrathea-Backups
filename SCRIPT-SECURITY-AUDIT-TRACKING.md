# Script Security Audit & Remediation - Mission Control Tracking

**Started:** 2026-04-13 15:40 CDT  
**Status:** IN PROGRESS  
**Priority:** CRITICAL

---

## Active Subagents (5 Claude Sonnet Agents)

| Agent | Domain | Session Key | Status | Focus |
|-------|--------|-------------|--------|-------|
| Sonnet-1 | Marvin Dashboard | `f1b44ab9-a57c-41f4-ae83-21fec89bbbf8` | 🔄 Running | API keys, cwd fixes, race conditions |
| Sonnet-2 | Dinner Automation | `4283ff57-a57e-45c2-9a0f-023039aabdbf` | 🔄 Running | HEB/Facebook passwords, module paths |
| Sonnet-3 | Workspace Scripts | `47eb4507-dda6-42a2-a323-f8739905a45c` | 🔄 Running | Gmail/iCloud/NAS passwords, path fixes |
| Sonnet-4 | Magrathea Infrastructure | `cf127c5f-bc98-45d6-8c61-873f5daa2b89` | 🔄 Running | section9 password, SSH consolidation |
| Sonnet-5 | Utils/Templates | `abd4bd5a-8329-4ed3-bc3c-2691eceb2a33` | 🔄 Running | iCloud password, Express handler fixes |

---

## Critical Credentials to Rotate (19 Found)

### API Keys (5)
- [ ] OpenAI: `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`
- [ ] OpenRouter: `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`
- [ ] MiniMax: `sk-api-M9U4SwpTO43eL_XL4ZS7vegk0lQjg3vSFA1bYbJg2hf4hhI-5XiBtODgkEkoP7ZQl8BrzHzgSZZkXjD-oKFdIV3RdgdeHvJZBuDu_vyaDe97jzR9g8xvDRM`
- [ ] Kimi: `sk-kimi-HvKVAWIeq9x1hWkqvZmHQqEsyeXSCx9wAAqpdMnFo1L5mc4GVV`
- [ ] Anthropic: `sk-ant-a03tL7-ewg1XJuA1GfP9AWnB-Baj8d5Me7p9d9hH7FPGeVPgAA`

### Passwords (9)
- [ ] HEB: `$Tandal0ne`
- [ ] Facebook: `section9`
- [ ] Shared system password: `section9` (infrastructure scripts)
- [ ] iCloud app password: `jgdw-epfw-mspb-nihn`
- [ ] Gmail: `section9`
- [ ] NAS: `$Tandal0nec0mplex9`
- [ ] Windows auto-logon: `section9`
- [ ] iCloud app-specific password (send-instructions.js)
- [ ] OpenClaw webhook token: `4256f1ad48767996a440015aae1be25c2c7835523d58f8a4`

---

## Critical Bugs Being Fixed

| Bug | Severity | Location | Fix Agent |
|-----|----------|----------|-----------|
| service-health.js wrong cwd | 🔴 Critical | marvin-dash | Sonnet-1 |
| progress-tracker.js race condition | 🔴 Critical | marvin-dash | Sonnet-1 |
| dinner-automation.js broken require() | 🔴 Critical | dinner-auto | Sonnet-2 |
| heb-add-cart.js race condition | 🔴 Critical | dinner-auto | Sonnet-2 |
| gateway-recovery.sh kills all Chrome | 🔴 Critical | workspace | Sonnet-3 |
| fix-marvin.ps1 deletes Docker folder | 🔴 Critical | workspace | Sonnet-3 |
| rotate-keys-bitwarden vs load mismatch | 🔴 Critical | magrathea | Sonnet-4 |
| ENABLE_CRON.sh overwrites crontab | 🔴 Critical | magrathea | Sonnet-4 |
| heb-bridge error handler order | 🔴 Critical | utils | Sonnet-5 |

---

## Consolidation Tasks

| Task | Scripts to Archive/Consolidate | Agent |
|------|-------------------------------|-------|
| Email systems | Archive v1, v2, v3 → keep email-client.js | Sonnet-2 |
| HEB cart variants | Consolidate 8 variants → 1 canonical | Sonnet-2 |
| Facebook Marketplace | Keep refactored.js only | Sonnet-2 |
| Health checks | Merge 4 scripts into 1 | Sonnet-4 |
| SSH fixes | Merge bistromath/deep-thought → 1 script | Sonnet-4 |
| Key rotation | Merge bitwarden/file variants | Sonnet-4 |

---

## Bitwarden Integration

Creating loader utilities in:
- `marvin-dash/scripts/lib/bitwarden-loader.js`
- `dinner-automation/scripts/lib/bitwarden-loader.js`
- `workspace-scripts/lib/bitwarden-loader.ps1` + `.js`

All scripts will use:
```javascript
const { getCredential } = require('./lib/bitwarden-loader');
const apiKey = getCredential('OpenAI-API-Key');
```

---

## Output Reports (Expected)

| Report | Path | Agent |
|--------|------|-------|
| Marvin Dash Summary | `fixes-marvin-dash-summary.md` | Sonnet-1 |
| Dinner Auto Summary | `fixes-dinner-auto-summary.md` | Sonnet-2 |
| Workspace Scripts Summary | `fixes-workspace-summary.md` | Sonnet-3 |
| Magrathea Infra Summary | `fixes-magrathea-summary.md` | Sonnet-4 |
| Utils/Templates Summary | `fixes-utils-summary.md` | Sonnet-5 |

---

## Timeline

- **15:40** - Security audit initiated (5 KimiCode review agents)
- **15:46** - All 5 reviews completed, 130+ scripts analyzed
- **15:58** - Claude Sonnet configured for subagents
- **16:47** - First fix attempt failed (config issue)
- **17:00** - Config corrected, Sonnet agents respawned
- **17:15** - Mission Control kanban updated with all tasks
- **ETA 17:45** - All fixes expected complete

---

## Notes

- All credentials moving to Bitwarden with session caching
- Scripts must maintain full functionality after fixes
- Browser separation (Edge for HEB, Chrome for Facebook) must be preserved
- SSH keys and API keys require immediate rotation
