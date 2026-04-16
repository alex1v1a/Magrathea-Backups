# OpenClaw DM Routing Fix
# Issue: DMs routing to group chat instead of separate sessions
# Channel: 1474647549200830694 (DM) vs 1477860415059923098 (Group)

## Diagnosis
- Current session: Group chat (1477860415059923098)
- Expected DM session: 1474647549200830694
- Config dmScope: per-peer (correct for separate sessions)
- Problem: Gateway not creating separate DM sessions

## Fix Applied
1. Verified dmScope: per-peer configuration
2. Confirmed dmPolicy: allowlist with user 212101250525691904
3. Will restart gateway to apply session separation

## Verification Steps
1. Send DM after restart
2. Check new session created for channel 1474647549200830694
3. Confirm group chat remains separate

## Prevention
- Monitor session list for separate DM sessions
- Alert if DMs merge with group chat
