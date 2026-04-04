# Technology Radar 2024-2025

## For Alexander's Automation Workflow

**Last Updated:** February 18, 2026  
**Classification:** Internal Use

---

## Radar Quadrants

```
                    ADOPT
                       ▲
                       │
                       │
    TECHNIQUES    ◄────┼────►  TOOLS
                       │
                       │
                       ▼
                   AVOID
```

**Quadrants:**
- **Adopt** → Proven technologies ready for immediate use
- **Trial** → Promising technologies worth exploring
- **Assess** → Technologies to research and understand
- **Hold/Avoid** → Technologies to avoid or decommission

---

## ADOPT (Proven, Ready for Production)

### Browser Automation

| Technology | Rationale | Use Case |
|------------|-----------|----------|
| **Playwright 1.50+** | Microsoft's actively maintained framework with excellent CDP support, auto-waiting, and resilient locators | Primary automation tool for HEB, Facebook, and general web automation |
| **Chrome for Testing** | Purpose-built for automation, stable versions, eliminates "works on my machine" issues | Default browser for all automation (Playwright 1.57+ uses this) |
| **CDP (Chrome DevTools Protocol)** | Direct browser control, access to all Chrome features, connection to existing browser instances | Connecting to persistent Chrome sessions for HEB/Facebook |
| **Persistent Browser Profiles** | Maintains login state, cookies, localStorage across sessions | Long-running automation with single login |

### Locator Strategies

| Pattern | Rationale | Migration Priority |
|---------|-----------|-------------------|
| **getByRole()** | ARIA-first approach, most resilient to DOM changes | HIGH - Replace all data-testid locators |
| **getByText()** | User-centric, survives redesigns | HIGH - Use for user-visible elements |
| **getByTestId()** | Explicit, intended for testing | MEDIUM - Keep existing, use sparingly for new |
| **getByLabel()** | Accessibility-first form interaction | MEDIUM - Form inputs |

### JavaScript/Node.js

| Pattern | Rationale | Implementation |
|---------|-----------|----------------|
| **Promise.all() for Parallel Ops** | Significant speedup for independent operations | Fetch multiple resources simultaneously |
| **p-limit for Concurrency Control** | Prevent resource exhaustion | Limit parallel browser pages |
| **Stream Processing** | Memory-efficient for large files | Log processing, CSV operations |
| **Structured Logging (Winston/Pino)** | Observable, debuggable automation | Replace console.log |

### Anti-Detection

| Technique | Rationale | Risk Level |
|-----------|-----------|------------|
| **Headed Mode for Social Sites** | Facebook/HEB less likely to flag | Low - Most reliable approach |
| **Randomized Delays** | Mimics human behavior | Low - Easy to implement |
| **Persistent Profiles** | Natural browsing history | Low - Industry standard |
| **Realistic Viewports** | Common resolution matching | Low - Simple configuration |

---

## TRIAL (Promising, Evaluate in Non-Critical Projects)

### Browser Automation

| Technology | Rationale | Evaluation Criteria |
|------------|-----------|---------------------|
| **Playwright Test Agents (1.56+)** | LLM-driven test generation and healing | Generate tests for new HEB features |
| **Codegen Assertions** | Auto-generate visibility/text assertions | Reduce manual assertion writing |
| **BiDi Protocol** | Future standard, combines WebDriver + CDP | Monitor stability, prepare migration path |
| **Playwright UI Mode** | Interactive debugging, time-travel | Use for debugging flaky tests |

### AI-Powered Tools

| Technology | Rationale | Evaluation Approach |
|------------|-----------|---------------------|
| **Claude Code** | Agentic coding, multi-file context | Trial for generating page objects |
| **GitHub Copilot for Automation** | Pattern recognition for locators | Test in fb-share.js rewrite |
| **AI Test Healers** | Automatic test repair | Monitor Playwright's healer agent |

### Financial APIs

| Technology | Rationale | Evaluation Criteria |
|------------|-----------|---------------------|
| **Teller API** | Modern alternative to Plaid, no OAuth complexity | Compare coverage vs Plaid |
| **GoCardless Bank Account Data** | European coverage, PSD2 compliant | Evaluate if expanding to EU |

### Manufacturing/Quoting

| Technology | Rationale | Evaluation Approach |
|------------|-----------|---------------------|
| **Onshape API** | Cloud-native CAD with robust REST API | POC for Vectarr part analysis |
| **Fusion 360 CAM API** | Automated toolpath generation | Evaluate for quoting automation |
| **JobBOSS² API** | Job shop ERP integration | Assess for Vectarr integration |

### Email/Calendar

| Technology | Rationale | Evaluation Criteria |
|------------|-----------|---------------------|
| **Resend API** | Modern email API, generous free tier | Replace any existing email sending |
| **Microsoft Graph API** | Unified M365 access | Calendar/email integration |

---

## ASSESS (Research and Understand)

### Emerging Technologies

| Technology | Why Interesting | Research Questions |
|------------|-----------------|-------------------|
| **WebDriver BiDi** | Future browser automation standard | When will it be production-ready? |
| **V8 Maglev Optimizations** | Potential 10-100x compile speed improvements | Impact on cold-start automation scripts? |
| **Chrome Extension Manifest V3** | New extension architecture | Impact on HEB extension development? |
| **TLS Fingerprint Randomization** | Evasion of JA3/JA4 detection | Practical implementation approaches? |

### Manufacturing APIs

| Technology | Why Interesting | Research Questions |
|------------|-----------------|-------------------|
| **Paperless Parts API** | Automated quoting from CAD | Integration complexity for Vectarr? |
| **Xometry API** | Instant quoting platform | API availability and pricing? |
| **CADQuery** | Python CAD scripting | Alternative to Fusion 360 API? |

### Browser Technologies

| Technology | Why Interesting | Research Questions |
|------------|-----------------|-------------------|
| **Puppeteer Stealth Evasion Modules** | 17 different evasion techniques | Which are most effective for HEB/Facebook? |
| **Browser Fingerprint Randomization** | Dynamic fingerprint rotation | Feasibility for automation? |
| **Headless Chrome New Mode** | `--headless=new` differences | Performance vs detectability tradeoffs? |

---

## HOLD / AVOID (Do Not Use or Plan Deprecation)

### Deprecated/Legacy

| Technology | Reason | Action |
|------------|--------|--------|
| **Playwright _react selectors** | Removed in 1.58 | Migrate to getByRole/getByTestId |
| **Playwright _vue selectors** | Removed in 1.58 | Migrate to getByRole/getByTestId |
| **Playwright :light selector suffix** | Removed in 1.58 | Use standard CSS selectors |
| **page.accessibility** | Removed in 1.57 | Use Axe library instead |
| **browserContext.on('backgroundpage')** | Deprecated in 1.56 | Use alternative approaches |

### Anti-Patterns

| Pattern | Why Avoid | Alternative |
|---------|-----------|-------------|
| **XPath Selectors** | Brittle, hard to maintain | ARIA or test-id locators |
| **CSS Selector Chains** | Break on minor DOM changes | Single stable attributes |
| **Fixed Delays (waitForTimeout)** | Slow, unreliable | Auto-waiting assertions |
| **Headless Mode for Social Sites** | High detection risk | Headed mode with stealth |
| **Hardcoded Credentials** | Security risk | Environment variables + key vault |
| **Global Browser Instances** | Resource leaks, crashes | Proper cleanup in finally blocks |

### Obsolete Tools

| Tool | Reason | Migration Path |
|------|--------|----------------|
| **PhantomJS** | Deprecated, unmaintained | Playwright or Puppeteer |
| **Selenium WebDriver (standalone)** | Slower, less reliable | Playwright for new projects |
| **Nightmare.js** | Unmaintained | Playwright |
| **CasperJS** | Deprecated | Playwright |

---

## Specific Recommendations by Project

### Dinner Automation / HEB

**Immediate Actions (Adopt):**
```yaml
Priority: HIGH
- Upgrade to Playwright 1.58
- Implement persistent browser profiles for login state
- Use getByRole() locators for cart interactions
- Add structured logging with Winston
```

**Trial (Next 30 Days):**
```yaml
Priority: MEDIUM
- Test Playwright Codegen for new HEB UI features
- Evaluate Playwright UI Mode for debugging
- Implement health check endpoint for monitoring
```

**Assess (Next 90 Days):**
```yaml
Priority: LOW
- Monitor BiDi protocol development
- Research HEB mobile API endpoints
```

### Facebook Marketplace (F-150)

**Immediate Actions (Adopt):**
```yaml
Priority: HIGH
- Always use headed mode
- Implement stealth plugin (playwright-extra)
- Add randomized delays between actions
- Use realistic viewport (1366x768 or 1920x1080)
- Implement screenshot evidence collection
```

**Trial (Next 30 Days):**
```yaml
Priority: MEDIUM
- Test AI-generated locators with Claude Code
- Evaluate group rotation algorithms
```

**Avoid:**
```yaml
- Never use headless mode for Facebook
- Don't use rapid-fire posting patterns
- Avoid shared IP across multiple accounts
```

### Vectarr Manufacturing

**Assess (Research Phase):**
```yaml
Priority: HIGH
- Onshape API capabilities for part analysis
- Fusion 360 CAM API for toolpath generation
- JobBOSS² API for ERP integration
- Xometry API for instant quoting
```

**Trial (Next 60 Days):**
```yaml
Priority: MEDIUM
- POC: Extract mass properties from Onshape parts
- POC: Generate setup sheets via Fusion 360 API
```

**Avoid:**
```yaml
- Don't commit to single CAD platform prematurely
- Avoid custom quoting algorithms before evaluating APIs
```

### Personal Automation

**Trial (Next 30 Days):**
```yaml
Priority: MEDIUM
- GoCardless API for bank aggregation (if EU expansion)
- Microsoft Graph API for calendar integration
- Resend API for email notifications
```

**Assess:**
```yaml
Priority: LOW
- Teller API vs Plaid comparison
- Nylas for unified email/calendar
```

---

## Migration Roadmap

### Phase 1: Foundation (Weeks 1-2)
- [ ] Upgrade Playwright to 1.58
- [ ] Audit all existing scripts for deprecated selectors
- [ ] Implement structured logging
- [ ] Set up persistent browser profiles

### Phase 2: HEB Automation Hardening (Weeks 3-4)
- [ ] Migrate to getByRole() locators
- [ ] Implement retry logic with exponential backoff
- [ ] Add storage state for authentication
- [ ] Create health check endpoints

### Phase 3: Facebook Stealth (Weeks 5-6)
- [ ] Implement playwright-extra with StealthPlugin
- [ ] Add human-like mouse movements
- [ ] Randomize delays and typing speeds
- [ ] Set up evidence screenshot collection

### Phase 4: Vectarr Research (Weeks 7-10)
- [ ] Evaluate Onshape API POC
- [ ] Research Fusion 360 CAM automation
- [ ] Assess JobBOSS² integration options
- [ ] Compare quoting API alternatives

### Phase 5: Optimization (Weeks 11-12)
- [ ] Implement parallel execution where safe
- [ ] Add rate limiting for external APIs
- [ ] Optimize V8 performance patterns
- [ ] Set up monitoring and alerting

---

## Risk Assessment

| Technology | Risk Level | Mitigation |
|------------|------------|------------|
| BiDi Protocol | HIGH (not stable) | Monitor only, don't implement |
| Facebook Automation | MEDIUM (detection) | Stealth mode, human-like behavior |
| HEB Automation | LOW-MEDIUM | Persistent profiles, retry logic |
| Manufacturing APIs | MEDIUM (learning curve) | POC before commitment |
| Financial APIs | MEDIUM (compliance) | Review terms of service |

---

## Success Metrics

### Automation Reliability
- Target: 95%+ success rate for HEB cart sync
- Target: 80%+ success rate for Facebook sharing
- Metric: Mean time between failures (MTBF)

### Performance
- Target: <5 second cold start for scripts
- Target: <30 second total execution for HEB sync
- Metric: P95 execution times

### Maintainability
- Target: <1 hour to update selectors after UI change
- Target: 100% of scripts use structured logging
- Metric: Time to fix broken automation

---

## References

- [Playwright Best Practices](https://playwright.dev/docs/best-practices)
- [Technology Radar Methodology](https://www.thoughtworks.com/radar/faq)
- [Vectarr Requirements Document](link-to-be-added)
- [HEB Automation Runbook](link-to-be-added)

---

*Generated by OpenClaw Research Subagent*  
*For questions or updates, contact: Alexander*
