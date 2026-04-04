# Tax Prep 2025 – API & Tooling Research (Alexander)

## Executive Summary (Most Valuable Options)
1. **Plaid + Transactions/Investments + Statements** – Best for automating bank/brokerage data ingestion and reducing manual downloads. Pricing is pay‑as‑you‑go with a free limited‑production tier (first 200 live calls). Most practical time saver.
2. **Document AI for W‑2 / 1099 parsing** – **Google Document AI (W‑2 parser)** is the most precise for tax form extraction and has clear pricing. **AWS Textract** is a strong general OCR/structured extraction option with predictable per‑page pricing. These can eliminate manual data entry.
3. **Tax calculation** – No simple, consumer‑grade IRS income tax API exists. Use **open‑source tax calculators** (e.g., Tax‑Calculator or OpenFisca‑US) and wrap them in a small internal API if needed. This is more realistic and avoids enterprise-only pricing.
4. **Expense categorization** – **Plaid Transactions** already includes merchant/category enrichment; for higher accuracy or business‑grade classification, consider **MX** or **Finicity** (typically sales‑led pricing).
5. **IRS MeF** – Powerful but heavy‑weight. Requires becoming an authorized IRS e‑file provider and passing Assurance Testing System (ATS). Usually too complex unless Alexander plans to build a full e‑file product.

---

## 1) Plaid API (Bank/Brokerage Connectivity)
**Use case:** Connect to bank/brokerage accounts, pull transactions/holdings, statements, and income-related data.

**Relevant Plaid Products:**
- **Transactions**: categorized transactions; good for expenses/deductions.
- **Investments**: holdings & transactions from brokerages.
- **Statements**: bank statements (PDFs) for supporting docs.
- **Income / Assets**: income verification and assets history.

**Pricing (Public Info)**
- Plaid has **Pay‑As‑You‑Go, Growth, Custom** plans.
- **Free Limited Production**: first **200 API calls** with live data.
- Pricing is not shown in docs; you must request production access to see a price list.
- Billing models include **one‑time**, **subscription**, and **per‑request** depending on product.

**Sources**
- Plaid Pricing: https://plaid.com/pricing/
- Plaid Billing docs: https://plaid.com/docs/account/billing/

**Ease of Integration**
- **Medium**. Requires OAuth-like Link flow, access token exchange, webhook handling, and recurring syncs.
- Excellent SDKs and documentation.

**Value for Alexander**
- **High**. Biggest time saver by auto‑collecting transactions and statements.

**Sample (Node.js – Plaid Link + Transactions)**
```js
import { Configuration, PlaidApi, PlaidEnvironments } from 'plaid';

const config = new Configuration({
  basePath: PlaidEnvironments.sandbox,
  baseOptions: {
    headers: {
      'PLAID-CLIENT-ID': process.env.PLAID_CLIENT_ID,
      'PLAID-SECRET': process.env.PLAID_SECRET,
    },
  },
});

const client = new PlaidApi(config);

// Create Link token (frontend uses this)
const linkToken = await client.linkTokenCreate({
  user: { client_user_id: 'alexander-user-id' },
  client_name: 'Tax Prep 2025',
  products: ['transactions'],
  country_codes: ['US'],
  language: 'en',
});

// Exchange public_token for access_token
const exchange = await client.itemPublicTokenExchange({
  public_token: 'public-sandbox-...' // from Link
});

// Pull transactions for the year
const tx = await client.transactionsGet({
  access_token: exchange.data.access_token,
  start_date: '2025-01-01',
  end_date: '2025-12-31',
});
```

---

## 2) IRS Modernized e‑File (MeF)
**Use case:** Direct IRS e‑filing. Required for full tax return submission.

**Reality Check**
- IRS MeF is **not a public API**. You must become an **authorized e‑file provider**, enroll via IRS e‑Services, implement IRS schemas, and pass **ATS (Assurance Testing System)** before production access.
- Significant compliance, security, and validation overhead.

**Pricing**
- IRS does not charge per API call, but **compliance and certification costs** are real (engineering + legal).

**Sources**
- IRS MeF Program info: https://www.irs.gov/e-file-providers/modernized-e-file-program-information

**Ease of Integration**
- **Low** (complex, lengthy approval process).

**Value for Alexander**
- **Low in 2025** unless he’s building a full e‑file platform. Use existing filing software instead.

---

## 3) Document AI / OCR APIs (W‑2, 1099, Statements)
### A) Google Document AI
**Best fit:** Tax form extraction (W‑2 parser, pay‑slips, bank statements).

**Pricing (from Google’s pricing page)**
- **W‑2 parser**: **$0.30 per document**
- **Form Parser**: **$30 / 1,000 pages** (tiered down after 1M)
- **Enterprise OCR**: **$1.50 / 1,000 pages**
- **Bank statement parser**: **$0.75 per document**

**Source**
- https://cloud.google.com/document-ai/pricing

**Ease of Integration**
- **Medium**. Needs GCP project, service account, and async processing for multi‑page docs.

**Value for Alexander**
- **High**. W‑2/1099 parsing can reduce manual entry.

**Sample (Node.js – W‑2 parser)**
```js
import { DocumentProcessorServiceClient } from '@google-cloud/documentai';

const client = new DocumentProcessorServiceClient();
const projectId = process.env.GCP_PROJECT_ID;
const location = 'us';
const processorId = process.env.GCP_W2_PROCESSOR_ID; // prebuilt W2 parser

const name = `projects/${projectId}/locations/${location}/processors/${processorId}`;

const [result] = await client.processDocument({
  name,
  rawDocument: {
    content: fs.readFileSync('W2.pdf'),
    mimeType: 'application/pdf',
  },
});

const doc = result.document;
console.log(doc.entities.map(e => [e.type, e.mentionText]));
```

### B) AWS Textract
**Best fit:** General OCR and structured extraction from PDFs; strong for tables/forms.

**Pricing (examples from AWS)**
- Detect text: **$0.0015 per page** (first 1M pages)
- Analyze forms: **$0.05 per page**
- Analyze tables: **$0.015 per page**
- Analyze expense: **$0.01 per page**

**Source**
- https://aws.amazon.com/textract/pricing/

**Ease of Integration**
- **Medium**. Straightforward SDK; good for PDFs.

**Value for Alexander**
- **High** for scanning PDFs from brokers or employers.

### C) Azure Document Intelligence (Form Recognizer)
**Best fit:** Prebuilt models for receipts, invoices, and **tax forms (W‑2, 1098)**.

**Pricing**
- Azure pricing page is dynamic; shows **500 pages/month free**.
- Pay‑as‑you‑go pricing is **per 1,000 pages**, varying by model and region.

**Source**
- https://azure.microsoft.com/en-us/pricing/details/document-intelligence/

**Ease of Integration**
- **Medium**. Strong SDKs; pricing must be checked in Azure calculator.

**Value for Alexander**
- **Medium‑High** depending on existing Azure usage.

---

## 4) Tax Calculation APIs (Estimating Liability)
**Reality:** Most commercial tax APIs focus on **sales tax**, not personal income tax.

**Options**
- **Avalara AvaTax** (sales tax) – enterprise‑grade, pricing is sales‑led.
- **TaxJar** (sales tax) – API access available in paid tiers.
- **Open‑source calculators** for **income tax** (recommended):
  - **PSL Tax‑Calculator** (federal + state rules)
  - **OpenFisca‑US** (policy simulation)

**Practical Recommendation**
- **Wrap an open‑source income tax library** into a small internal API. This gives you full control without enterprise pricing.

**Ease of Integration**
- Commercial sales‑tax APIs: **medium**.
- Open‑source income tax library: **medium**, but more flexible.

**Value for Alexander**
- **Medium**. Useful for planning, not required for filing.

---

## 5) Expense Categorization (Deduction Discovery)
**Options**
- **Plaid Transactions** – includes categories, merchant names, and enrichment. Works well for broad personal/business spend.
- **MX** – financial data + categorization; pricing is sales‑led.
- **Finicity** – owned by Mastercard; has transaction categorization and cash flow. Pricing is sales‑led.
- **Yodlee** – rich categorization; enterprise pricing.

**Value for Alexander**
- **High**, but **Plaid may be enough**.

**Sample (Plaid Transactions category usage)**
```js
const tx = await client.transactionsGet({
  access_token,
  start_date: '2025-01-01',
  end_date: '2025-12-31',
});

// Example: filter for potential deductions
const deductions = tx.data.transactions.filter(t =>
  t.category?.some(c => ['Travel', 'Office Supplies', 'Business Services'].includes(c))
);
```

---

## Recommended Stack for 2025 (Practical & Time‑Saving)
1. **Plaid Transactions + Investments + Statements**
   - Automates account connections and transaction ingestion.
2. **Google Document AI W‑2 parser** (or AWS Textract for generic PDFs)
   - Extracts structured data from W‑2s, 1099s, bank statements.
3. **Open‑source income tax calculator** (internal service)
   - Use for estimates and sanity checks.
4. **Plaid categories for expense classification**
   - Enough for a first‑pass deduction discovery.

---

## Implementation Notes / Risks
- **Compliance:** IRS MeF is heavy. Avoid unless e‑file product is a core business.
- **Security:** Bank and tax documents are sensitive; use encryption, secure storage, and audit logs.
- **Data Gaps:** Brokers don’t always expose 1099 PDFs via APIs. Plan a manual document upload path.

---

## Sources
- Plaid Pricing: https://plaid.com/pricing/
- Plaid Billing Docs: https://plaid.com/docs/account/billing/
- IRS MeF Program Info: https://www.irs.gov/e-file-providers/modernized-e-file-program-information
- Google Document AI Pricing: https://cloud.google.com/document-ai/pricing
- AWS Textract Pricing: https://aws.amazon.com/textract/pricing/
- Azure Document Intelligence Pricing: https://azure.microsoft.com/en-us/pricing/details/document-intelligence/
- TaxJar Pricing: https://www.taxjar.com/pricing
