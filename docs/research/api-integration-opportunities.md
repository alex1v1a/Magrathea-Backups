# API Integration Opportunities (Alexander) — Research Notes

Date: 2026-02-14

## Current stack (baseline)
- iCloud/SMTP email
- Apple Calendar (CalDAV)
- HEB (web automation)
- Facebook Marketplace (web automation)
- Discord (OpenClaw native)
- Twilio (SMS)

**Gaps/opportunities:** finance automation, business comms (Slack/WhatsApp), multi‑calendar sync (Google/Outlook), database/task hub (Notion), and LLM enrichment.

---

## 1) Financial APIs

### Plaid (bank aggregation)
- **Docs:** https://plaid.com/docs/api/
- **Auth:** `client_id` + `secret` in headers/body; Link uses `link_token` flow; OAuth with some institutions.
- **Rate limits:** Enforced per client/product; limits vary by endpoint and plan (see Plaid dashboard/docs).
- **Fit:** High — pulls balances/transactions for finance automation, categorization, cash‑flow, tax prep.
- **Complexity:** Medium — Link flow + webhooks + PCI/PII handling.

### IRS e‑Services / IRIS / TDS (tax documents)
- **Docs:** https://www.irs.gov/e-services (IRIS/TDS/IVES, API Client ID)
- **Auth:** IRS e‑Services account + API Client ID; access often restricted to tax professionals/authorized filers.
- **Rate limits:** Not publicly specified; governed by IRS e‑Services policies.
- **Fit:** Medium — possible transcript retrieval via TDS/IVES (requires permissions). No public consumer tax‑document API.
- **Complexity:** High — eligibility, compliance, and approval process.

### Alpaca (brokerage/trading)
- **Docs:** https://docs.alpaca.markets/
- **Auth:** API keys (paper vs live); OAuth available for brokerage solutions.
- **Rate limits:** Vary by product/plan; documented per API.
- **Fit:** Medium — automated trade execution, portfolio snapshots.
- **Complexity:** Medium — trading compliance, risk controls.

### Polygon.io (market data)
- **Docs:** https://polygon.io/docs/stocks
- **Auth:** API key in query/header.
- **Rate limits:** Vary by plan (free tier is rate‑limited; paid tiers increase). See dashboard/docs.
- **Fit:** Medium — pricing, quotes, historicals for valuation & alerts.
- **Complexity:** Low–Medium.

---

## 2) Communication APIs

### Slack API (business notifications)
- **Docs:** https://docs.slack.dev/ • OAuth: https://docs.slack.dev/authentication/installing-with-oauth/
- **Auth:** OAuth 2.0 (bot/user scopes) or incoming webhooks.
- **Rate limits:** Tiered per method (Tier 1–4). Message posting ~1 msg/sec/channel; see rate limits: https://docs.slack.dev/apis/web-api/rate-limits/
- **Fit:** High for business notifications and internal workflows.
- **Complexity:** Low–Medium.

### Telegram Bot API
- **Docs:** https://core.telegram.org/bots/api
- **Auth:** Bot token from @BotFather.
- **Rate limits:** Bot API limits (commonly 30 msgs/sec overall, ~1 msg/sec per chat; verify in Bot FAQ).
- **Fit:** Medium — lightweight alerts, group automation.
- **Complexity:** Low.

### WhatsApp Business Platform (Cloud API)
- **Docs:** https://developers.facebook.com/docs/whatsapp/
- **Auth:** Meta app + WhatsApp Business Account; OAuth + system user tokens.
- **Rate limits:** Messaging limits tiered by quality and number of unique recipients/24h.
  Messaging limits doc: https://developers.facebook.com/docs/whatsapp/messaging-limits/
- **Fit:** High for customer SMS‑like messaging in regions where WhatsApp is dominant.
- **Complexity:** Medium–High (template approval, compliance).

---

## 3) Calendar/Task APIs

### Microsoft Graph (Outlook/Teams)
- **Docs:** https://learn.microsoft.com/graph/api/overview
- **Auth:** OAuth 2.0 (MSAL) — delegated or app‑only.
- **Rate limits:** Throttling varies by scenario; 429 with Retry‑After. Docs: https://learn.microsoft.com/graph/throttling
- **Fit:** High — enterprise calendar/mail/task sync.
- **Complexity:** Medium.

### Google Calendar API v3
- **Docs:** https://developers.google.com/workspace/calendar/api/overview
- **Auth:** OAuth 2.0 (user) or service accounts for domain‑wide delegation.
- **Rate limits:** Project + per‑user quotas; 403/429 usageLimits. Docs: https://developers.google.com/workspace/calendar/api/guides/quota
- **Fit:** High — multi‑calendar automation, invite handling.
- **Complexity:** Medium.

### Notion API (database/task sync)
- **Docs:** https://developers.notion.com/reference/intro
- **Auth:** Bearer integration token (internal) or OAuth for public apps.
- **Rate limits:** Avg ~3 req/sec/integration; 429 with Retry‑After. Docs: https://developers.notion.com/reference/request-limits
- **Fit:** High — simple CRM/task/notes DB sync.
- **Complexity:** Low–Medium.

---

## 4) E‑commerce / Shopping APIs

### Instacart Developer Platform
- **Docs:** https://docs.instacart.com/developer_platform_api/
- **Auth:** API key.
- **Rate limits:** Not publicly specified; subject to program tier and approval.
- **Fit:** Medium — grocery shopping lists/recipe flows.
- **Complexity:** Medium (partner approval for richer data).

### Amazon Product Advertising API (PA‑API)
- **Docs:** https://webservices.amazon.com/paapi5/documentation/
- **Auth:** AWS SigV4 + Access Key/Secret + Associate Tag.
- **Rate limits:** Usage‑based; often starts at low RPS and scales with sales.
- **Fit:** Medium — product search/price/availability for shopping automation.
- **Complexity:** Medium (AWS signing).

### Kroger API
- **Docs:** https://developer.kroger.com/
- **Auth:** OAuth 2.0 client credentials + user authorization for certain scopes.
- **Rate limits:** Documented in developer portal; varies by app.
- **Fit:** Medium — grocery search, store availability.
- **Complexity:** Medium.

---

## 5) AI / LLM APIs

### OpenAI API
- **Docs:** https://platform.openai.com/docs
- **Auth:** API key (org/project).
- **Rate limits:** RPM/TPM/RPD by model and usage tier. Docs: https://platform.openai.com/docs/guides/rate-limits
- **Fit:** High — summarization, classification, automation reasoning.
- **Complexity:** Low–Medium.

### Anthropic Claude API
- **Docs:** https://platform.claude.com/docs
- **Auth:** API key.
- **Rate limits:** Tiered by plan; check console limits.
- **Fit:** High — long‑context summarization, drafting.
- **Complexity:** Low–Medium.

### Ollama (local LLM)
- **Docs:** https://ollama.com/blog/openai-compatibility
- **Auth:** None by default (localhost); OpenAI‑compatible endpoint.
- **Rate limits:** Local hardware bound.
- **Fit:** Medium–High — offline/private processing.
- **Complexity:** Low (local install) / Medium (model ops).

---

# Top 5 Recommended Integrations (with quick‑starts)

1) **Plaid** — finance aggregation + transactions for tax/finance automation.
2) **Microsoft Graph** — Outlook calendar + tasks + mail for business workflows.
3) **Google Calendar API** — interop with non‑Apple calendars + shared calendars.
4) **Notion API** — lightweight database/task hub and sync.
5) **OpenAI API** — AI‑powered classification/summarization and automation.

## Quick‑start snippets

### 1) Plaid — create link_token
```bash
curl https://sandbox.plaid.com/link/token/create \
  -H "Content-Type: application/json" \
  -d '{
    "client_id": "PLAID_CLIENT_ID",
    "secret": "PLAID_SECRET",
    "client_name": "Alexander Automation",
    "products": ["transactions"],
    "country_codes": ["US"],
    "language": "en",
    "user": {"client_user_id": "user-123"}
  }'
```

### 2) Microsoft Graph — list events (OAuth access token required)
```bash
curl -H "Authorization: Bearer MS_GRAPH_ACCESS_TOKEN" \
  "https://graph.microsoft.com/v1.0/me/events?$top=10"
```

### 3) Google Calendar — list events (OAuth access token required)
```bash
curl -H "Authorization: Bearer GOOGLE_ACCESS_TOKEN" \
  "https://www.googleapis.com/calendar/v3/calendars/primary/events?maxResults=10"
```

### 4) Notion — query a database
```bash
curl https://api.notion.com/v1/databases/NOTION_DB_ID/query \
  -H "Authorization: Bearer NOTION_TOKEN" \
  -H "Notion-Version: 2022-06-28" \
  -H "Content-Type: application/json" \
  -d '{"page_size": 5}'
```

### 5) OpenAI — basic response
```bash
curl https://api.openai.com/v1/responses \
  -H "Authorization: Bearer OPENAI_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-4.1-mini",
    "input": "Summarize today’s calendar events in 3 bullet points."
  }'
```

---

## Notes / Caveats
- **IRS APIs** are largely restricted to approved tax professionals and systems (IRIS/TDS/IVES). There is **no fully open IRS transcript API** for consumer apps.
- **WhatsApp Business** requires Meta Business verification and template approvals for outbound messaging.
- **Amazon PA‑API** access and higher rate limits depend on affiliate performance.
- **Plaid / Financial data** requires strong security, compliance, and user consent flows.
