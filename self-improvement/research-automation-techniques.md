# Research Report: Modern Browser Automation & APIs (2025/2026)

**Prepared for:** Alexander’s automation systems (HEB, Facebook Marketplace, email processing)

---

## Executive Summary (Actionable Highlights)
- **Playwright is still the gold standard** for deterministic automation; focus on **locator strategy**, **test isolation**, and **parallelization** for stable, high‑throughput flows. (Playwright best practices + parallelism docs) <https://playwright.dev/docs/best-practices> <https://playwright.dev/docs/test-parallel>
- **Stealth/detection avoidance** should be used cautiously and ethically; it’s useful mainly for **reliability** in legitimate workflows, not evasion. Consider **playwright-extra/puppeteer-extra stealth plugins** for brittle sites when API access isn’t possible. <https://raw.githubusercontent.com/berstend/puppeteer-extra/master/packages/puppeteer-extra-plugin-stealth/readme.md>
- **Retail APIs**: Instacart’s platform docs show multiple integration options (Connect APIs, Developer Platform API, Catalog, etc.). Useful for partner/integration paths (or to understand data requirements). <https://docs.instacart.com/>
- **AI agent tools** (Browser‑Use, Stagehand) are maturing into “AI‑assisted automation frameworks” that can bridge unknown UIs. They are best paired with deterministic Playwright steps for stability. <https://raw.githubusercontent.com/browser-use/browser-use/main/README.md> <https://raw.githubusercontent.com/browserbase/stagehand/main/README.md>
- **Node.js performance patterns**: reuse browser instances, pool contexts, block unnecessary resources, optimize concurrency, and use queues + circuit breakers for reliability.

---

## 1) Playwright Best Practices (2025/2026)
**Key principles from Playwright docs:**
- **Test user‑visible behavior** and avoid implementation details (use role/name-based locators). <https://playwright.dev/docs/best-practices>
- **Keep tests isolated** (each test has its own context; reuse signed‑in state via storage state). <https://playwright.dev/docs/best-practices>
- **Prefer locators** over CSS/XPath; use `getByRole`, `getByLabel`, etc. <https://playwright.dev/docs/best-practices>
- **Parallelize** to maximize throughput; control worker count for CI stability. <https://playwright.dev/docs/test-parallel>

### Tactical Recommendations (for Alexander’s automations)
1. **Use resilient locators**
   - Prefer `getByRole`, `getByLabel`, `getByText`, or `getByTestId` if you can set it.
2. **Persistent auth & session reuse**
   - For HEB/Facebook flows, store login state and reuse across runs to reduce friction and reduce bot signals.
3. **Isolate flows**
   - Separate tasks into distinct browser contexts to avoid cross‑contamination of cookies/session storage.
4. **Run parallel jobs with throttle**
   - Use Playwright’s parallelism or a custom queue to keep concurrency safe and avoid detection.

### Example (login reuse with storage state)
```ts
// login-setup.ts
import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto('https://www.heb.com/');
  // ...login steps...
  await context.storageState({ path: 'storage/heb.json' });
  await browser.close();
})();
```

```ts
// usage
const context = await browser.newContext({ storageState: 'storage/heb.json' });
```

---

## 2) Modern Web Scraping Patterns & Anti‑Detection (Ethical & Reliable)

### Reliable scraping patterns
- **HTTP-first**: use APIs or direct JSON endpoints when available.
- **Hybrid approach**: a small Playwright step to get tokens/session cookies, then switch to direct HTTP for data extraction.
- **Intelligent resource blocking**: block images, analytics, and 3rd‑party scripts for speed and fewer signals.

### Anti‑detection techniques (use cautiously)
- **Stealth plugins**: `puppeteer-extra-plugin-stealth` works with Playwright via `playwright-extra`. <https://raw.githubusercontent.com/berstend/puppeteer-extra/master/packages/puppeteer-extra-plugin-stealth/readme.md>
- **Human-like interaction**: realistic waits, scroll, mouse movement patterns.
- **Fingerprint consistency**: set locale/timezone/UA, maintain a stable profile per account.
- **Proxy hygiene**: use consistent IP per account; avoid rapid IP churn.

### Example: Request blocking for performance + stability
```ts
await page.route('**/*', (route) => {
  const type = route.request().resourceType();
  if (['image', 'media', 'font'].includes(type)) return route.abort();
  return route.continue();
});
```

### Example: Playwright‑extra stealth usage (if needed)
```ts
import { chromium } from 'playwright-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

chromium.use(StealthPlugin());
const browser = await chromium.launch({ headless: true });
```

**Note:** Use anti‑detection only where it’s allowed and necessary. The best approach is always **official APIs** or first‑party integrations.

---

## 3) Grocery/Retail APIs (Instacart, Kroger, etc.)

### Instacart Platform (public docs)
Instacart’s docs list **Connect APIs**, **Developer Platform API**, **Catalog**, and integrations for retailer sites. <https://docs.instacart.com/>

**What this means for Alexander:**
- If the goal is **HEB-like order automation**, check if Instacart APIs can provide an **integration path** or data model pattern.
- It can inform **product catalog ingestion**, **inventory sync**, and **cart/checkout flows** for partnerships.

### Kroger Developer (partner‑centric)
Kroger’s APIs are historically **OAuth‑based** and typically require partner approval. Even when automation is necessary, it’s better to **pursue API access** for long‑term stability and compliance.

**Action idea:**
- If HEB doesn’t provide an API, **try Instacart/Kroger partner‑style flows** for architecture inspiration.
- Keep a **fallback Playwright automation** with session caching.

---

## 4) AI‑Powered Automation Tools (Browser‑Use, Stagehand)

### Browser‑Use
A Python-first AI browser agent platform with optional **cloud stealth browsers** and agent execution. <https://raw.githubusercontent.com/browser-use/browser-use/main/README.md>

**Best use case:**
- Unknown or rapidly changing pages, or “one‑off” tasks where coding exact selectors is too slow.

### Stagehand (Browserbase)
Stagehand combines **natural language actions** with precise code and **self‑healing caching**. <https://raw.githubusercontent.com/browserbase/stagehand/main/README.md>

**Best use case:**
- When you want a hybrid approach: **LLM for discovery**, then **cached deterministic steps** for production.

### AI + Playwright “golden path”
1. Use AI tool (Stagehand/Browser‑Use) to **discover selectors or workflows**.
2. Convert to Playwright **deterministic steps** for production.
3. Keep AI fallback mode for **unexpected UI changes**.

---

## 5) Performance Optimization Patterns for Node.js Automation

### Core patterns
- **Reuse the browser**: keep one browser instance and create multiple contexts.
- **Context pooling**: pre‑warm and reuse contexts to reduce startup overhead.
- **Concurrency limits**: use `p-queue` or `bottleneck` to throttle across accounts.
- **Resource blocking**: abort unnecessary assets (images/fonts) to speed runs.
- **Circuit breakers**: stop when CAPTCHA spikes, retry later.
- **Structured logging + traces**: enable Playwright tracing for failures.

### Example: Context pool
```ts
import { chromium } from 'playwright';
import PQueue from 'p-queue';

const browser = await chromium.launch({ headless: true });
const queue = new PQueue({ concurrency: 3 });

async function runJob(jobFn) {
  return queue.add(async () => {
    const context = await browser.newContext();
    try {
      return await jobFn(context);
    } finally {
      await context.close();
    }
  });
}
```

---

## Recommendations Tailored to Alexander’s Use Cases

### A) HEB Automation
- **Primary path:** persistent login state + Playwright deterministic flows.
- **Failover path:** short AI‑assisted action (Stagehand/Browser‑Use) when layout changes.
- **Reliability**: block heavy resources + reduce concurrency.
- **Data extraction**: extract product data from API/XHR calls once logged in.

### B) Facebook Marketplace Automation
- **Stability priority**: use stable selectors + stored auth; keep actions human‑paced.
- **Risk mitigation**: throttle actions, keep one account per IP, avoid excessive parallelism.
- **LLM assistance**: generate listing descriptions or classify leads; keep browser steps deterministic.

### C) Email Processing
- **Avoid browser automation** when possible: use IMAP/SMTP or Gmail/Outlook APIs.
- For parsing: use LLM to classify and auto‑draft replies, then send via API.

---

## Suggested Next Steps
1. **Prototype a Playwright “core harness”** with storage state, tracing, and a queue.
2. **Add an AI fallback layer** (Stagehand or Browser‑Use) for brittle flows.
3. **Map current HEB/Facebook flows** and replace brittle selectors with role‑based locators.
4. **Investigate API partnerships** where feasible (Instacart/Kroger patterns).

---

## Sources
- Playwright Best Practices: <https://playwright.dev/docs/best-practices>
- Playwright Parallelism: <https://playwright.dev/docs/test-parallel>
- Puppeteer/Playwright Stealth Plugin: <https://raw.githubusercontent.com/berstend/puppeteer-extra/master/packages/puppeteer-extra-plugin-stealth/readme.md>
- Browser‑Use (AI automation): <https://raw.githubusercontent.com/browser-use/browser-use/main/README.md>
- Stagehand (AI automation): <https://raw.githubusercontent.com/browserbase/stagehand/main/README.md>
- Instacart Docs: <https://docs.instacart.com/>
