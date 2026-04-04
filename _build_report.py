import json
from datetime import datetime

with open('mortgage_data.json') as f:
    data=json.load(f)

summary=data['summary']
values=sorted([int(v) for v in summary.keys()])

current_with_pmi=data['current_with_pmi']
current_after=data['current_after']
fha_total=data['fha_total']


def fmt_currency(x):
    return f"${x:,.2f}"

def fmt_months(m):
    if m is None: return "—"
    years=m/12
    return f"{m} months ({years:.1f} yrs)"

rows=[]
for v in values:
    s=summary[str(v)]
    rows.append({
        'value':v,
        'pmi_drop':fmt_months(s['pmi_drop_month']),
        'current_5yr':fmt_currency(s['current_5yr']),
        'fha_5yr':fmt_currency(s['fha_5yr']),
        'current_30yr':fmt_currency(s['current_30yr']),
        'fha_30yr':fmt_currency(s['fha_30yr']),
        'break_even':fmt_months(s['break_even']),
        'savings_5yr':fmt_currency(s['savings_5yr']),
        'savings_30yr':fmt_currency(s['savings_30yr']),
    })

savings_with_pmi=data['savings_with_pmi']
savings_after=data['savings_after']

row_html=''.join([f"<tr><td>${r['value']:,}</td><td>{r['pmi_drop']}</td><td>{r['break_even']}</td><td>{r['current_5yr']}</td><td>{r['fha_5yr']}</td><td>{r['current_30yr']}</td><td>{r['fha_30yr']}</td><td>{r['savings_5yr']}</td><td>{r['savings_30yr']}</td></tr>" for r in rows])

template="""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Mortgage Refinance Comparison Report</title>
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js"></script>
<style>
  body { font-family: 'Segoe UI', Arial, sans-serif; margin: 24px; color:#222; }
  h1, h2, h3 { margin: 0 0 12px; }
  .card { border:1px solid #e5e5e5; border-radius:12px; padding:16px 20px; margin:16px 0; box-shadow:0 2px 8px rgba(0,0,0,0.05); }
  .grid { display:grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap:16px; }
  .metric { font-size:20px; font-weight:600; }
  .muted { color:#666; }
  table { width:100%; border-collapse: collapse; margin-top:12px; }
  th, td { border-bottom:1px solid #eee; padding:10px 8px; text-align:right; }
  th:first-child, td:first-child { text-align:left; }
  .tag { display:inline-block; padding:4px 8px; border-radius:999px; background:#f1f5ff; color:#2b5cff; font-size:12px; }
  .note { font-size:12px; color:#666; }
  canvas { max-width:100%; }
</style>
</head>
<body>
  <h1>Mortgage Refinance Comparison Report</h1>
  <p class="muted">Prepared for Alexander • __DATE__</p>

  <div class="card">
    <h2>Loan Snapshot</h2>
    <div class="grid">
      <div>
        <h3>Current Loan (Mr. Cooper)</h3>
        <div class="muted">Conventional • Balance $340,281.97 • Rate 6.375%</div>
        <ul>
          <li>P&I: $2,122.92</li>
          <li>PMI: $193 (drops at 80% LTV)</li>
          <li>Escrow: $875</li>
          <li>Total w/ PMI: $3,190.92</li>
          <li>Total after PMI: $2,997.92</li>
        </ul>
      </div>
      <div>
        <h3>FHA Refinance Offer</h3>
        <div class="muted">FHA • Loan Amount $366,300 • Rate 4.75%</div>
        <ul>
          <li>P&I: $1,910.79</li>
          <li>MIP: $149 (permanent)</li>
          <li>Escrow: $875</li>
          <li>Total: $2,934.79</li>
          <li>Closing Costs: $24,000</li>
          <li>Cash to Close: $941</li>
        </ul>
      </div>
    </div>
  </div>

  <div class="card">
    <h2>Key Monthly Payment Comparison</h2>
    <div class="grid">
      <div>
        <div class="tag">With PMI</div>
        <div class="metric">__CURRENT_WITH_PMI__ vs __FHA_TOTAL__</div>
        <div class="muted">Monthly savings (FHA vs current w/ PMI): <strong>__SAVINGS_WITH_PMI__</strong></div>
      </div>
      <div>
        <div class="tag">After PMI Drops</div>
        <div class="metric">__CURRENT_AFTER__ vs __FHA_TOTAL__</div>
        <div class="muted">Monthly savings (FHA vs current after PMI): <strong>__SAVINGS_AFTER__</strong></div>
      </div>
    </div>
  </div>

  <div class="card">
    <h2>PMI Drop Timing & Cost Summary</h2>
    <table>
      <thead>
        <tr>
          <th>Property Value</th>
          <th>PMI Drops At</th>
          <th>Break-Even</th>
          <th>5-Year Cost (Current)</th>
          <th>5-Year Cost (FHA)</th>
          <th>30-Year Cost (Current)</th>
          <th>30-Year Cost (FHA)</th>
          <th>5-Year Savings (FHA)</th>
          <th>30-Year Savings (FHA)</th>
        </tr>
      </thead>
      <tbody>
        __ROWS__
      </tbody>
    </table>
    <p class="note">Costs include escrow. FHA costs include $24,000 closing costs. Current loan includes PMI only until 80% LTV.</p>
  </div>

  <div class="card">
    <h2>Interactive Charts</h2>
    <div class="grid">
      <div><h3>Monthly Payment Comparison Over Time</h3><canvas id="paymentChart"></canvas></div>
      <div><h3>Cumulative Savings Over 30 Years</h3><canvas id="savingsChart"></canvas></div>
      <div><h3>Break-Even Analysis</h3><canvas id="breakEvenChart"></canvas></div>
      <div><h3>Cost Comparison (5-yr & 30-yr)</h3><canvas id="costChart"></canvas></div>
    </div>
  </div>

  <div class="card">
    <h2>Recommendation</h2>
    <p>Refinancing to the FHA loan lowers the monthly payment by about __SAVINGS_WITH_PMI__ while PMI is in place and about __SAVINGS_AFTER__ after PMI drops. However, the $24,000 closing costs create a long break-even period (see chart). If you plan to hold the property long enough to reach break-even or you need the cash-out proceeds, the FHA option can make sense. If you expect to sell or refinance again before break-even, staying with the current loan may be more cost-effective.</p>
  </div>

<script>
const data = __DATA__;
const values = __VALUES__;
const months = Array.from({length: 360}, (_,i)=>i+1);

// Payment chart
const paymentDatasets = values.map((v, idx) => ({
  label: `Current Loan (Value $${v.toLocaleString()})` ,
  data: data.payment_series[v],
  borderColor: ['#2b5cff','#00a77e','#e86d3a'][idx],
  backgroundColor: 'transparent',
  borderWidth: 2,
  tension: 0.1
}));

paymentDatasets.push({
  label: 'FHA Refinance',
  data: months.map(()=>data.fha_total),
  borderColor: '#111',
  borderWidth: 2,
  borderDash: [6,4],
  tension: 0.1
});

new Chart(document.getElementById('paymentChart'), {
  type: 'line',
  data: { labels: months, datasets: paymentDatasets },
  options: { scales: { x: { title: { display: true, text: 'Month' } }, y: { title: { display: true, text: 'Monthly Payment ($)' } } }, plugins: { legend: { position: 'bottom' } } }
});

// Cumulative savings chart
const savingDatasets = values.map((v, idx) => ({
  label: `Value $${v.toLocaleString()}`,
  data: data.cumulative[v],
  borderColor: ['#2b5cff','#00a77e','#e86d3a'][idx],
  backgroundColor: 'transparent',
  borderWidth: 2,
  tension: 0.1
}));

new Chart(document.getElementById('savingsChart'), {
  type: 'line',
  data: { labels: Array.from({length: 361}, (_,i)=>i), datasets: savingDatasets },
  options: { scales: { x: { title: { display: true, text: 'Month' } }, y: { title: { display: true, text: 'Cumulative Savings ($)' } } }, plugins: { legend: { position: 'bottom' } } }
});

// Break-even chart
new Chart(document.getElementById('breakEvenChart'), {
  type: 'bar',
  data: {
    labels: values.map(v=>`$${v.toLocaleString()}`),
    datasets: [{
      label: 'Break-even (months)',
      data: values.map(v=>data.summary[v].break_even),
      backgroundColor: ['#2b5cff','#00a77e','#e86d3a']
    }]
  },
  options: { scales: { y: { title: { display: true, text: 'Months' } } }, plugins: { legend: { display: false } } }
});

// Cost comparison chart
const costLabels = ['5-Year Cost','30-Year Cost'];
const costDatasets = values.map((v, idx) => ({
  label: `Current ($${v.toLocaleString()})` ,
  data: [data.summary[v].current_5yr, data.summary[v].current_30yr],
  backgroundColor: ['rgba(43,92,255,0.6)','rgba(43,92,255,0.6)']
}));
const fhaDataset = values.map((v, idx) => ({
  label: `FHA ($${v.toLocaleString()})` ,
  data: [data.summary[v].fha_5yr, data.summary[v].fha_30yr],
  backgroundColor: ['rgba(0,167,126,0.6)','rgba(0,167,126,0.6)']
}));

new Chart(document.getElementById('costChart'), {
  type: 'bar',
  data: {
    labels: costLabels,
    datasets: [...costDatasets, ...fhaDataset]
  },
  options: { plugins: { legend: { position: 'bottom' } }, scales: { y: { title: { display: true, text: 'Total Cost ($)' } } } }
});

</script>
</body>
</html>
"""

html = template.replace('__DATE__', datetime.now().strftime('%B %d, %Y'))
html = html.replace('__CURRENT_WITH_PMI__', fmt_currency(current_with_pmi))
html = html.replace('__CURRENT_AFTER__', fmt_currency(current_after))
html = html.replace('__FHA_TOTAL__', fmt_currency(fha_total))
html = html.replace('__SAVINGS_WITH_PMI__', fmt_currency(savings_with_pmi))
html = html.replace('__SAVINGS_AFTER__', fmt_currency(savings_after))
html = html.replace('__ROWS__', row_html)
html = html.replace('__DATA__', json.dumps(data))
html = html.replace('__VALUES__', json.dumps(values))

with open('mortgage_final_comparison.html','w',encoding='utf-8') as f:
    f.write(html)

print('Wrote mortgage_final_comparison.html')
