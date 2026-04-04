# Marvin Dash Scripts

## Finance Quote Prototype (Stooq)

Fetches latest OHLCV quotes without an API key using Stooq's CSV endpoint.

```bash
node scripts/finance-quote-stooq.js --symbols TSLA.US,SPY.US
node scripts/finance-quote-stooq.js --json --out data/finance-quotes.json
```

Environment:

```bash
set FINANCE_TICKERS=TSLA.US,SPY.US
```

Notes:
- Output can be written to `marvin-dash/data/finance-quotes.json` for downstream use.
- Intended as a lightweight financial data integration prototype.
