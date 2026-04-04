import math, json
balance=340281.97
rate=0.06375
pmt=2122.92
r=rate/12
values=[380000,400000,415000]

n=360
balances=[balance]
for m in range(1,n+1):
    interest=balances[-1]*r
    principal=pmt-interest
    new=balances[-1]-principal
    balances.append(new)

def months_to_threshold(thresh):
    for m,b in enumerate(balances):
        if b<=thresh:
            return m
    return None

months_to_80={v:months_to_threshold(0.8*v) for v in values}

pmi=193
escrow=875

fha_pmt=1910.79
fha_mip=149
fha_esc=875
fha_total=fha_pmt+fha_mip+fha_esc

current_with_pmi=pmt+pmi+escrow
current_after=pmt+escrow

def total_cost_current(value):
    m=months_to_80[value]
    if m is None: m=360
    total = current_with_pmi*m + current_after*(360-m)
    return total


def total_cost_fha():
    return fha_total*360 + 24000


def cost_current_months(value, months=60):
    m=months_to_80[value]
    if m is None: m=360
    if months<=m:
        return current_with_pmi*months
    else:
        return current_with_pmi*m + current_after*(months-m)


def cost_fha_months(months=60):
    return fha_total*months + 24000

fha_total30=total_cost_fha()


def cumulative_savings(value, months):
    m_drop=months_to_80[value]
    if m_drop is None: m_drop=360
    if months<=m_drop:
        cur = current_with_pmi*months
    else:
        cur = current_with_pmi*m_drop + current_after*(months-m_drop)
    fha = fha_total*months + 24000
    return cur - fha


def break_even(value):
    for m in range(1,361):
        if cumulative_savings(value,m)>=0:
            return m
    return None

breaks={v:break_even(v) for v in values}

summary={}
for v in values:
    summary[v]={
        'pmi_drop_month':months_to_80[v],
        'pmi_drop_years':months_to_80[v]/12,
        'current_5yr':cost_current_months(v,60),
        'fha_5yr':cost_fha_months(60),
        'current_30yr':total_cost_current(v),
        'fha_30yr':fha_total30,
        'break_even':breaks[v],
        'savings_5yr':cost_current_months(v,60)-cost_fha_months(60),
        'savings_30yr':total_cost_current(v)-fha_total30,
    }

savings_with_pmi=current_with_pmi - fha_total
savings_after=current_after - fha_total

months=360
cumulative={}
for v in values:
    arr=[]
    for m in range(0,months+1):
        arr.append(round(cumulative_savings(v,m),2))
    cumulative[v]=arr

payment_series={}
for v in values:
    m_drop=months_to_80[v]
    arr=[]
    for m in range(1,361):
        if m<=m_drop:
            arr.append(current_with_pmi)
        else:
            arr.append(current_after)
    payment_series[v]=arr

with open('mortgage_data.json','w') as f:
    json.dump({
        'summary':summary,
        'cumulative':cumulative,
        'payment_series':payment_series,
        'months_to_80':months_to_80,
        'current_with_pmi':current_with_pmi,
        'current_after':current_after,
        'fha_total':fha_total,
        'savings_with_pmi':savings_with_pmi,
        'savings_after':savings_after,
    },f,indent=2)

print(json.dumps(summary,indent=2))
print('savings_with_pmi',savings_with_pmi,'savings_after',savings_after)
