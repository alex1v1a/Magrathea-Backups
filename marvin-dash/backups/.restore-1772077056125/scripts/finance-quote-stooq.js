#!/usr/bin/env node
/**
 * Finance Quote Prototype - Stooq (no API key)
 * Fetches latest OHLCV for provided symbols via CSV endpoint.
 *
 * Usage:
 *   node scripts/finance-quote-stooq.js --symbols TSLA.US,SPY.US
 *   node scripts/finance-quote-stooq.js --json --out data/finance-quotes.json
 *
 * Env:
 *   FINANCE_TICKERS=TSLA.US,SPY.US
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const DATA_DIR = path.join(__dirname, '..', 'data');

function parseArgs() {
  const args = process.argv.slice(2);
  const out = { symbols: null, json: false, outPath: null };
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--symbols' || arg === '-s') {
      out.symbols = args[i + 1];
      i++;
    } else if (arg === '--json') {
      out.json = true;
    } else if (arg === '--out') {
      out.outPath = args[i + 1];
      i++;
    }
  }
  return out;
}

function fetchCsv(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode} for ${url}`));
        res.resume();
        return;
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

function parseCsvRow(csv) {
  const lines = csv.trim().split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return null;
  const headers = lines[0].split(',');
  const values = lines[1].split(',');
  const obj = {};
  headers.forEach((h, i) => obj[h] = values[i]);
  return obj;
}

async function fetchQuote(symbol) {
  const url = `https://stooq.com/q/l/?s=${encodeURIComponent(symbol)}&f=sd2t2ohlcv&h&e=csv`;
  const csv = await fetchCsv(url);
  const row = parseCsvRow(csv);
  if (!row || !row.Close || row.Close === 'N/A') {
    throw new Error(`No quote data for ${symbol}`);
  }
  return {
    symbol: row.Symbol,
    date: row.Date,
    time: row.Time,
    open: Number(row.Open),
    high: Number(row.High),
    low: Number(row.Low),
    close: Number(row.Close),
    volume: Number(row.Volume)
  };
}

(async () => {
  const args = parseArgs();
  const symbols = (args.symbols || process.env.FINANCE_TICKERS || 'TSLA.US')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);

  const started = new Date().toISOString();
  const results = [];
  const errors = [];

  for (const symbol of symbols) {
    try {
      const quote = await fetchQuote(symbol);
      results.push(quote);
      if (!args.json) {
        console.log(`✅ ${quote.symbol} ${quote.date} ${quote.time} | O:${quote.open} H:${quote.high} L:${quote.low} C:${quote.close} V:${quote.volume}`);
      }
    } catch (error) {
      errors.push({ symbol, error: error.message });
      console.warn(`⚠️  ${symbol}: ${error.message}`);
    }
  }

  const payload = {
    fetchedAt: started,
    count: results.length,
    quotes: results,
    errors
  };

  if (args.json) {
    console.log(JSON.stringify(payload, null, 2));
  }

  if (args.outPath) {
    const fullPath = path.isAbsolute(args.outPath)
      ? args.outPath
      : path.join(DATA_DIR, args.outPath);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, JSON.stringify(payload, null, 2));
    console.log(`📝 Saved quotes to ${fullPath}`);
  }
})();
