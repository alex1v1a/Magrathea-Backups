# Automation Strategy Upgrade – Research Report (2026-02-20)

## Executive Summary

- **Standardize on the Marvin Automation Framework v2 for all browser tasks**, and migrate remaining ad-hoc scripts (especially Facebook and HEB helpers) into plugins with shared retry/verification logic.
- **Lean into long-lived, user-driven browser sessions over "cold" headless runs**: use `connectOverCDP`/debug-ports and persistent profiles for HEB (Edge 9222) and Facebook (Chrome 9222), with stronger session/state management.
- **Adopt a strict "verify every action" pattern**: every cart change, post, or message send must be followed by an explicit DOM/API verification + bounded retries + circuit-breaker.
- **Introduce a small, opinionated task-runner layer on top of Windows Task Scheduler/NSSM** for running many tiny automations with isolation, per-task timeouts, and structured logging.
- **Add a messaging automation layer around iMessage (BlueBubbles), WhatsApp, and Telegram** so grocery/dinner and Facebook flows can notify, confirm, and accept lightweight commands via chat.
- **Improve calendar & email integration via stable CalDAV + Gmail API wrappers**, enabling more robust “source of truth” flows (dinner planning, commitments, follow-ups) instead of brittle IMAP scraping.
- **Harden anti-bot behavior beyond simple random delays**: codify a reusable "human behavior" module (scrolling, reading-time, mouse movement) and plug it directly into the HEB/Facebook plugins.
- **Add a lightweight validation suite for stealth & reliability** (smoke tests, stealth test URLs, and production health checks) so regressions in HEB or Facebook detection are caught early.
- **New APIs worth piloting in this repo**: BlueBubbles (iMessage), Telegram Bot API, WhatsApp Cloud API (for one-way alerts), FastMail/Gmail API wrappers, and a simple CalDAV helper.
- **Top 10 concrete actions** are listed at the end; most are realistically implementable in 2–3 weeks with incremental value after each step.

---

## 1. Browser Automation & Anti-Bot Techniques

You already have strong foundations (`AUTOMATION-ARCHITECTURE.md`, `AUTOMATION-FRAMEWORK-v2.md`, `ANTI-BOT-PLAYBOOK.md`, `RESEARCH-PLAYWRIGHT-STEALTH.md`, `automation-research-2026.md`). The gap now is **consistency and full adoption** rather than new theory.

### 1.1 Opportunity: Fully adopt the v2 Automation Framework for HEB & Facebook

**What**  
You have a well-designed v2 framework (`lib/automation-task.js`, `browser-pool.js`, `retry-manager.js`, `anti-bot-advanced.js`, plugins for HEB and Facebook). Some older scripts in the repo still bypass this and talk directly to Playwright/CDP or use very ad-hoc patterns.

**Why it matters here**
- Reduces bugs like partial cart updates or missed Facebook postings because **every plugin gets the same retry/backoff/verification behaviors** for free.
- Makes it much easier to bolt on improved anti-bot behavior—once in the base classes instead of per-script.
- Simplifies future integrations (e.g., Instacart API, Facebook message classification) because they can be plugins instead of separate worlds.

**Key design patterns to lean into**
- All task scripts become thin wrappers that instantiate a plugin class and call `task.execute()`.
- Each plugin exposes small methods (`syncCart`, `shareListing`, `checkMessages`) but shares:
  - CDP/Playwright connection handling
  - Retry/circuit-breaker
  - Human delays
  - Structured logging & metrics

**Concrete next steps (inside this repo)**
- [ ] Inventory non-framework scripts touching HEB/Facebook:
  - HEB: `heb-clear-and-add.js`, `heb-rebuild-cart.js`, `heb-sync-cart-exact.js`, `check-heb-page.js`, `check-heb-status.js`, `test-heb-console.js`, etc.
  - Facebook: `fb-monitor.js`, `check-fb-marketplace.js`, `fb-share.js`, `f150_share_fixed.js`, `facebook_share.py`, etc.
- [ ] For each, decide: **(a)** delete as obsolete, **(b)** migrate into the v2 HEB plugin, or **(c)** create a new plugin.
- [ ] Add a short `docs/AUTOMATION-FRAMEWORK-ADOPTION.md` with a table: script → plugin method.
- [ ] Create tiny CLI entrypoints under `dinner-automation/scripts/` and `scripts/` that do nothing but:
  ```js
  const { HEBPlugin } = require('../lib/plugins/heb-plugin');
  const task = new HEBPlugin();
  task.execute('syncCart');
  ```
- [ ] Update any Windows scheduled tasks/NSSM services to call the new entrypoints.

---

### 1.2 Opportunity: Long-lived CDP sessions with strong state & health checks

**What**  
Your current setup already separates browsers (Edge for HEB via `launch-edge-heb.bat`, Chrome for Facebook via `launch-shared-chrome.js` on port 9222), but the scripts around them are still somewhat “fragile” on connection drops and stale sessions.

**Why it matters here**
- CDP connection flakiness is a major source of automation failures (especially for long HEB cart runs or Facebook message polling).
- HEB 2FA / re-auth flows are painful; solid session persistence + health checks saves a lot of human supervision.

**Recommended techniques** (aligning with your existing research):
- Use **persistent contexts / user profiles** for both Edge (HEB) and Chrome (FB) and treat “headless” as an exception, not the default.
- Maintain a **CDP Manager** that:
  - Validates the debug port is reachable before starting a task.
  - Restarts the browser process if CDP handshake fails more than N times.
  - Optionally does a quick probe (e.g., `page.goto(about:blank)` + `page.title()` check) before proceeding.
- Keep **session metadata** (last login time, last success, last CAPTCHA detected) in a small JSON file alongside storage state so your scripts can short-circuit or escalate when the session is probably bad.

**Concrete next steps**
- [ ] In `lib/browser-pool.js` or `CDPManager`, add:
  - A `healthCheck()` method that attempts a trivial operation on the existing `Browser` and returns `{ ok, reason }`.
  - A `ensureConnected()` helper that either returns a healthy browser or throws a `BrowserUnhealthyError`.
- [ ] In the HEB and Facebook plugins, call `ensureConnected()` at the start of `run()` and log **explicit reasons** (e.g. “CDP port not reachable”, “no contexts present”, “page crashed”).
- [ ] Add a lightweight session metadata file, e.g. `dinner-automation/data/sessions/heb-main-meta.json`, with fields:
  ```json
  {
    "lastLogin": "2026-02-18T23:10:00Z",
    "lastSuccess": "2026-02-20T11:00:00Z",
    "lastFailure": "2026-02-20T10:15:00Z",
    "lastCaptcha": null,
    "manualInterventionRequired": false
  }
  ```
- [ ] Teach the HEB plugin to set `manualInterventionRequired: true` when it hits **repeated login failures or a suspected CAPTCHA**, and **stop** automation instead of brute forcing.

---

### 1.3 Opportunity: Codify "verify every action" into the base classes

You already have guidance in `ANTI-BOT-PLAYBOOK.md` and good examples in `automation-research-2026.md`. The missing piece is **making verification unavoidable/convenient**.

**What**  
Create standard verification helpers in the framework so plugin authors naturally use them instead of fire-and-forget clicks.

**Why it matters here**
- HEB cart desync and Facebook share failures are insidious when scripts “succeed” but state does not change.
- Verification is also a stealth signal: re-checking DOM/cart via realistic delays feels more human than immediately moving on.

**Proposed pattern**
- Add a `verify` helper in `AutomationTask` or a shared util:
  ```js
  async verifyStateChange(label, checkFn, {
    attempts = 3,
    delayMs = [2000, 4000],
    logger = this.logger,
  } = {}) {
    const [min, max] = delayMs;
    const initial = await checkFn();
    for (let i = 0; i < attempts; i++) {
      await this.randomDelay(min, max);
      const current = await checkFn();
      if (current !== initial) {
        logger.info(`Verified state change for ${label}`, { initial, current });
        return { success: true, initial, current };
      }
    }
    logger.warn(`Failed to verify state change for ${label}`, { initial });
    return { success: false, initial };
  }
  ```
- Use it for:
  - HEB: cart count before/after `addToCart`, `removeFromCart`, and final totals.
  - Facebook: verifying that a listing appears in the target group list; that a message shows up in the thread.

**Concrete next steps**
- [ ] Implement `verifyStateChange` (and variants) in the shared library.
- [ ] Refactor HEB plugin methods (`syncCart`, `rebuildCart`, etc.) to use it instead of hand-rolled verification.
- [ ] Refactor Facebook plugin sharing logic to **ensure the share actually appears** by querying the DOM or relevant network call.
- [ ] Add a tiny `tests/integration/verification-patterns.spec.js` that drives a fake page and asserts the helper’s behavior.

---

### 1.4 Opportunity: Reusable "Human Behavior" module wired into plugins

You have detailed ideas and even code in `RESEARCH-PLAYWRIGHT-STEALTH.md` and `automation-research-2026.md`. Turn those into a simple module and require it for all browser interactions.

**What**  
A `lib/human-behavior.js` (or folded into `anti-bot-advanced.js`) that exposes:
- `humanLikeScroll(page)`
- `humanLikeType(page, selector, text, options)`
- `simulateReading(page, selector)`
- `humanLikeClick(locator)` (mouse move + delayed click)
- `shoppingPattern` helpers for HEB

**Why it matters here**
- Centralizes and improves anti-bot behavior over time instead of rewriting per script.
- Lets you tune behavior per-site (HEB vs Facebook) using config.

**Concrete next steps**
- [ ] Create `lib/human-behavior.js` by extracting the best versions of the snippets from `RESEARCH-PLAYWRIGHT-STEALTH.md` and `automation-research-2026.md`.
- [ ] Add per-site configuration, e.g. `config/anti-bot.json`:
  ```json
  {
    "heb": {
      "searchDelayMs": [3000, 6000],
      "addToCartDelayMs": [1500, 4000],
      "batchSize": 5
    },
    "facebook": {
      "shareDelayMs": [5000, 10000],
      "messagesCheckIntervalMs": 60000
    }
  }
  ```
- [ ] Wire HEB & Facebook plugins to:
  - Perform a **session warmup** (home page, scroll, short read) before real work.
  - Use `humanLikeType` and `humanLikeClick` for all search / share operations.

---

## 2. Reliability: Retry, Backoff, and Verification Patterns

A lot of the building blocks exist (`retry-manager.js`, `error-handling`, `ANTI-BOT-PLAYBOOK.md`). The next upgrade is to **standardize usage** and plug in a few missing patterns.

### 2.1 Opportunity: Opinionated retry profiles per task type

**What**  
Create a small set of retry profiles (e.g., `networkCall`, `domInteraction`, `idempotentTask`, `sideEffectfulTask`) and enforce their use in plugins.

**Why**
- Many operations can safely retry (DOM lookup, navigation), but some should not (e.g., final checkout or sending a message) unless verification shows they failed.

**Example profiles**
```js
const RETRY_PROFILES = {
  networkCall: {
    maxAttempts: 4,
    baseDelayMs: 1000,
    maxDelayMs: 15000,
    retryOn: ['TimeoutError', 'NetworkError', '429'],
  },
  domInteraction: {
    maxAttempts: 3,
    baseDelayMs: 500,
    maxDelayMs: 5000,
    retryOn: ['SelectorError', 'TimeoutError'],
  },
  sideEffectWithVerify: {
    maxAttempts: 2,
    baseDelayMs: 2000,
    maxDelayMs: 8000,
    retryOn: ['VerificationFailed'],
  }
};
```

**Concrete next steps**
- [ ] Define `RETRY_PROFILES` in `retry-manager.js` or a new `lib/retry-profiles.js`.
- [ ] Add a helper: `this.withRetryProfile('domInteraction', fn)` on `AutomationTask`.
- [ ] Map HEB/Facebook plugin operations to profiles, e.g.:
  - `goto()` → `networkCall`
  - `locator.click()` → `domInteraction`
  - `addToCart()` / `shareListing()` → `sideEffectWithVerify`

---

### 2.2 Opportunity: Circuit breakers & escalation hooks

**What**  
You already mention circuit breakers in docs; enforcing them would prevent repeated hammering when HEB or Facebook is down or aggressively blocking.

**Why**
- Protects your accounts from lockouts.
- Reduces noise in logs and makes failures more actionable.

**Concrete next steps**
- [ ] Implement a tiny `CircuitBreaker` class backed by a JSON file in `data/runtime/`:
  - Track per-site: failure count, lastFailure, openUntil.
  - After N consecutive failures, “open” the breaker for a cool-down window (e.g., 30–60 minutes).
- [ ] In each plugin `run()`, check the breaker before doing anything; if open, exit early and log a **single** warning.
- [ ] Hook the breaker into metrics/logging so it shows up as a distinct state in `SYSTEM_HEALTH_MONITORING.md` style dashboards.

---

### 2.3 Opportunity: End-to-end verification for dinner + Facebook flows

**What**  
Define success conditions at the **workflow** level, not just per click.

**Examples**
- Dinner automation:
  - Calendar contains the right events.
  - HEB cart contains the expected items and quantities.
  - Confirmation email was sent (or at least logged).
- Facebook Marketplace:
  - Listing appears on the intended group pages.
  - Recent unread messages have been processed.

**Concrete next steps**
- [ ] For each major workflow (HEB weekly cart, FB listing share, FB message check), write a short YAML/JSON manifest describing expected final state (counts, key DOM text, etc.) and build a generic verifier that loads it and checks conditions.
- [ ] Integrate this into task exit codes: **non-zero exit if verification fails**, even if no individual step threw an error.
- [ ] Update system health scripts to surface “verification failed” as a distinct alert cause.

---

## 3. Running Many Small Scripts Safely (Task Runner / Cron Layer)

On Windows you already use **NSSM services** + **Task Scheduler** + various `.bat` wrappers. Rather than replacing them, layer a tiny convention-based runner to standardize behavior.

### 3.1 Opportunity: A simple Node-based task runner

**What**  
Create a `scripts/task-runner.js` that:
- Accepts a task name and optional payload.
- Loads a small task config (JSON/YAML) describing:
  - Command to run
  - Max runtime
  - Expected frequency
  - Retry policy
- Enforces **timeout, logging, and single-instance locking** for each run.

**Why**
- Prevents runaway scripts from piling up.
- Gives a single place to plug in metrics and alerts.
- Works fine wrapped by Task Scheduler or NSSM.

**Concrete design**
```bash
node scripts/task-runner.js heb-weekly-cart
node scripts/task-runner.js fb-check-messages
```

`config/tasks.json` example:
```json
{
  "heb-weekly-cart": {
    "cmd": "node dinner-automation/scripts/update-heb-meal-plan.js",
    "timeoutSec": 1800,
    "lockFile": "data/locks/heb-weekly-cart.lock",
    "maxRetries": 1
  },
  "fb-check-messages": {
    "cmd": "node dinner-automation/scripts/facebook-marketplace-shared.js --messages",
    "timeoutSec": 300,
    "lockFile": "data/locks/fb-check-messages.lock",
    "maxRetries": 0
  }
}
```

Task runner behaviors:
- If lockfile exists and process still alive → **skip run** with a warning.
- Spawn child process with timeout; kill if exceeded.
- Write structured log line: `{ task, start, end, durationMs, exitCode }` to `logs/task-runner.log`.

**Concrete next steps**
- [ ] Implement `scripts/task-runner.js` as above.
- [ ] Add `config/tasks.json` for current automations.
- [ ] Update Task Scheduler entries / NSSM services to call the task-runner instead of the scripts directly.

---

### 3.2 Opportunity: Health + observability for scheduled jobs

**What**  
Add a small “cron health” script that reads `logs/task-runner.log` and reports:
- Last success/failure per task
- Time since last run
- Rolling error rate over N days

**Why**
- Gives a quick at-a-glance view (could even render into `SYSTEM_HEALTH_MONITORING.md` or marvin-dash) of whether the automations are actually running and succeeding.

**Concrete next steps**
- [ ] Create `scripts/check-scheduled-tasks-health.js` (you already have `check-scheduled-tasks.js` – this could be an evolution that reads the new log format).
- [ ] Define a simple JSON summary output, e.g. `data/task-health.json`, which marvin-dash can display.

---

## 4. New APIs / Integrations to Consider

This section focuses on messaging and calendar/email integrations that are **practical to pilot in this repo**.

### 4.1 BlueBubbles (iMessage)

**What**  
BlueBubbles is a self-hosted iMessage relay: a macOS server app that connects to iMessage, plus clients and an HTTP/WebSocket API for automations. Recent guides (2025) show setups using Tailscale to avoid port forwarding and keep the API reachable from anywhere.

**Why it matters here**
- Lets your automations **send and receive iMessages** from Marvin without touching your main phone:
  - “Dinner plan ready, reply YES to approve this week’s HEB cart.”
  - “FB buyer replied ‘Can pick up today at 5?’ – reply 1/2/3 to accept/suggest/decline.”
- BlueBubbles already has:
  - REST endpoints for sending messages.
  - WebSocket or push-based updates for new incoming messages.

**Integration model**
- BlueBubbles server runs on a Mac (separate from this repo).
- This repo contains a **thin client** that:
  - Reads a `.secrets/bluebubbles.json` with server URL + auth token.
  - Exposes simple helpers: `sendImessage(to, text)`, `subscribeToThread(id, handler)`.

**Concrete next steps**
- [ ] Create `self-improvement/apis/bluebubbles-notes.md` outlining:
  - REST endpoints you plan to use (from docs/reddit/API examples).
  - Message formats and threading model.
- [ ] Add a small Node client: `lib/integrations/bluebubbles.js`:
  ```js
  async function sendImessage({ to, text }) { /* axios/fetch wrapper */ }
  async function listThreads() { /* for debugging */ }
  ```
- [ ] Build a **one-way** proof-of-concept: dinner automation sends an iMessage summary when the HEB cart is ready, with a link or code for manual confirmation.
- [ ] Later, add a small webhook/long-polling script that watches for a reply like `CONFIRM 2026-02-21` and writes a flag file consumed by the dinner task.

---

### 4.2 Telegram Bot API

**What**  
Telegram’s Bot API is stable, free, and easy to integrate. You can receive messages via long-polling or webhooks and send messages/attachments programmatically.

**Why it matters here**
- Great for **automation status and control**:
  - “HEB run succeeded/failed”; “FB listing shared to 7 groups”.
  - Ad-hoc commands like `/run_heb_now`, `/fb_status`, `/next_dinner`.
- Works even if iMessage/BlueBubbles is down.

**Concrete next steps**
- [ ] Add `self-improvement/apis/telegram-notes.md` with Bot token handling, security notes.
- [ ] Add `lib/integrations/telegram.js` with two helpers: `sendMessage(chatId, text)` and `sendMarkdown(chatId, text)`.
- [ ] Wire the task-runner to optionally send a Telegram notification on failure for key tasks (HEB weekly, FB listing runs), controlled via config.

---

### 4.3 WhatsApp Cloud API (one-way alerts)

**What**  
Meta’s WhatsApp Cloud API provides a hosted endpoint for sending templated messages and, with some setup, interactive messages. The main limitations are onboarding friction and template approval.

**Why it matters here**
- Could be used as an **additional alert/backup channel** for critical automations, especially buyer messages or time-sensitive dinner failures.
- Not ideal for complex conversational flows (templates & compliance overhead), but fine for “Your HEB run failed; please check the dashboard.”

**Practical constraints**
- Requires a Meta developer account & WhatsApp Business number.
- Template approval for each message pattern.

**Concrete next steps**
- [ ] Add a short feasibility note `self-improvement/apis/whatsapp-cloud-notes.md` summarizing onboarding steps and whether you want to tolerate them.
- [ ] If yes, create `lib/integrations/whatsapp-cloud.js` with a single function `sendTemplate(name, to, params)` and keep usage **limited to rare, critical alerts**.

---

### 4.4 Gmail API (or FastMail / IMAP+OAuth wrapper)

**What**  
You already send email via Python/Node. A more robust integration could use Gmail’s API (or a generic IMAP+SMTP wrapper with OAuth) to read & act on messages without scraping.

**Why it matters here**
- Improves:
  - Dinner confirmation emails.
  - Automated follow-ups (e.g., “You missed this HEB run – want to re-run tomorrow?”).
- Makes it easier to correlate task runs with confirmation emails.

**Concrete next steps**
- [ ] Decide whether to use Gmail proper or a provider like FastMail; document in `EMAIL_SETUP.md` or a sibling doc.
- [ ] Add `lib/integrations/email-gmail.js` or `email-imap.js` with **specific capabilities**:
  - `listRecentMessages(labelOrFolder, since)`
  - `sendMessage({ to, subject, html })` (thin wrapper over your existing code but with API-level auth).
- [ ] Extend existing dinner automation to read replies with a known subject pattern and set a “confirmed” flag.

---

### 4.5 CalDAV Helper (iCloud or FastMail Calendars)

**What**  
Instead of talking to iCloud calendar in low-level ways each time, add a thin CalDAV abstraction with a cache layer.

**Why it matters here**
- Dinner automation and marvin-dash both depend on calendar truth.
- A small helper that does “give me events in this date range” and “create/update this event” with proper recurrence handling will simplify higher-level logic.

**Concrete next steps**
- [ ] Add `lib/integrations/caldav.js` with functions:
  - `listEvents({ calendarId, from, to })`
  - `upsertEvent({ calendarId, uid, summary, start, end, metadata })`
- [ ] Configure iCloud or another CalDAV source via `.secrets/caldav.json`, following `HEB_APP_AUTOMATION_OPTIONS.md` and `HEB_WORKAROUND_INSTACART_API.md` where relevant.
- [ ] Refactor dinner automation to only depend on this helper instead of raw CalDAV or ad-hoc ICS handling.

---

## 5. Facebook Marketplace & Messaging Improvements

### 5.1 Opportunity: Structured handling of buyer messages

**What**  
Move from “poll messages and show them” to “classify and triage messages with simple automations.”

**Why**
- A lot of value is in reducing friction for common replies: “Is this available?”, “Can you do X price?”, “When can I pick up?”.
- Even without auto-reply, summarizing threads and prompting suggested responses (via iMessage/Telegram) is powerful.

**Concrete next steps**
- [ ] Extend the Facebook plugin to:
  - Fetch recent message snippets (within the allowed UI/DOM constraints).
  - Dump them to a small JSON file (`data/fb-messages.json`) with timestamps.
- [ ] Add a tiny classifier script (even rule-based at first) to tag messages by type.
- [ ] Have a separate “notifier” script that reads that file and pushes a summary via Telegram or iMessage (BlueBubbles), but **does not** send any replies itself.

---

### 5.2 Opportunity: Safer, slower, and more observable FB sharing

**What**  
Your current FB scripts are already careful, but you can go further by:
- Lowering the per-hour share rate.
- Making batch size and spacing configurable.
- Tracking “share history” per listing so you never re-share to the same group too soon.

**Concrete next steps**
- [ ] Create a simple file `data/fb-share-history.json` keyed by listing ID and group ID with lastSharedAt.
- [ ] In the FB plugin, before sharing, check this file and **skip** any group that saw the listing within the last X days.
- [ ] Add a config for max shares per day / per hour and enforce it with the retry profiles + task-runner.

---

## 6. Final Prioritized Top-10 Actions

1. **Adopt the v2 Automation Framework everywhere**  
   - Migrate HEB & Facebook scripts into plugins; deprecate old one-off scripts.  
   - *References:* §1.1, `AUTOMATION-FRAMEWORK-v2.md`, `AUTOMATION-ARCHITECTURE.md`.

2. **Implement standardized verification helpers and wire them into HEB/FB plugins**  
   - Make “verify every action” the default; fail the task if workflow-level verification fails.  
   - *References:* §1.3, §2.3, `ANTI-BOT-PLAYBOOK.md`.

3. **Introduce `human-behavior` utilities and enforce them for all browser interactions**  
   - Session warmup, scrolling, reading-time, human-like typing & clicks.  
   - *References:* §1.4, `RESEARCH-PLAYWRIGHT-STEALTH.md`, `automation-research-2026.md`.

4. **Strengthen CDP/session management with health checks and metadata**  
   - `ensureConnected()`, session TTL, `manualInterventionRequired` flags.  
   - *References:* §1.2, `AUTOMATION-ARCHITECTURE.md`.

5. **Build the Node-based task runner and route all scheduled automations through it**  
   - Timeouts, log aggregation, single-instance locks, plus per-task config.  
   - *References:* §3.1, `SYSTEM_HEALTH_MONITORING.md`.

6. **Add a small circuit breaker layer for HEB and Facebook tasks**  
   - Avoid hammering when blocked or unstable; require manual review after too many failures.  
   - *References:* §2.2, `error-handling-improvements.md`.

7. **Implement a basic CalDAV helper and refactor dinner automation to use it**  
   - Make calendar operations simpler and more reliable.  
   - *References:* §4.5, `HEB_APP_AUTOMATION_OPTIONS.md`, `HEB_WORKAROUND_INSTACART_API.md`.

8. **Pilot BlueBubbles integration for outbound iMessage notifications**  
   - Start with one-way alerts (HEB cart ready; FB buyer summary) using a thin Node client.  
   - *References:* §4.1, docs from BlueBubbles + Tailscale article.

9. **Add Telegram Bot integration for automation status & simple commands**  
   - Use as a resilient control plane and alert channel across all automations.  
   - *References:* §4.2, `SYSTEM_HEALTH_MONITORING.md`.

10. **Harden Facebook Marketplace workflows with share-history tracking & rate limits**  
    - Ensure you never overshare listings and maintain a very "human" behavior profile.  
    - *References:* §5.1–5.2, `ANTI-BOT-PLAYBOOK.md`.

---

This report focuses on **realistic, near-term upgrades** that build on the substantial groundwork already in this repo. If you tackle the top 3–5 actions, you’ll significantly improve reliability and maintainability of HEB and Facebook automations while setting up a clean path for richer messaging and calendar integrations in the next few weeks.