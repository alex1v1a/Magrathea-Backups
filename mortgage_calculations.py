import json

# Key loan parameters
current_balance = 340281.97
current_rate = 6.375
current_mip = 193  # Monthly MIP estimate

# FHA loan details
fha_rate = 4.75
fha_loan_amount = 366300
fha_mip = 149  # Monthly FHA MIP estimate
fha_cash_to_close = 941
fha_closing_costs = 26960

# Conventional loan details
conv_rate = 5.5
# Estimated closing costs for conventional (typically 2-5% of loan amount)
conv_closing_costs_rate = 0.03  # 3% estimate

# Property values to analyze
property_values = [380000, 400000, 415000]

# Assumptions
conv_pmi_rate = 0.005  # ~0.5% for conventional with <20% equity

# Fixed escrow (property taxes only, per user request)
fixed_escrow = 708.33

def calculate_monthly_payment(principal, annual_rate, years=30):
    """Calculate monthly P&I payment"""
    monthly_rate = annual_rate / 100 / 12
    num_payments = years * 12
    if monthly_rate == 0:
        return principal / num_payments
    payment = principal * (monthly_rate * (1 + monthly_rate)**num_payments) / \
              ((1 + monthly_rate)**num_payments - 1)
    return payment

def calculate_loan_scenarios(property_value):
    """Calculate all loan scenarios for a given property value"""
    results = {}

    # Fixed escrow across all scenarios for fair comparison
    escrow = fixed_escrow

    # ========== CURRENT LOAN ==========
    current_ltv = (current_balance / property_value) * 100
    current_pi = calculate_monthly_payment(current_balance, current_rate)
    current_total = current_pi + current_mip + escrow

    results['current'] = {
        'property_value': property_value,
        'loan_amount': current_balance,
        'ltv': current_ltv,
        'rate': current_rate,
        'pi_payment': round(current_pi, 2),
        'mip': round(current_mip, 2),
        'escrow': round(escrow, 2),
        'total_payment': round(current_total, 2),
        'closing_costs': 0,
        'cash_to_close': 0
    }

    # ========== FHA REFINANCE ==========
    # FHA allows max 96.5% LTV for refinances
    fha_max_loan = property_value * 0.965
    fha_loan = min(fha_loan_amount, fha_max_loan)

    # If property value is lower, we may need to bring cash to close
    if fha_loan_amount > property_value * 0.965:
        # Need to cover the difference
        cash_needed = fha_loan_amount - (property_value * 0.965)
    else:
        cash_needed = fha_cash_to_close

    fha_ltv = (fha_loan / property_value) * 100
    fha_pi = calculate_monthly_payment(fha_loan, fha_rate)
    fha_total = fha_pi + fha_mip + escrow
    
    fha_monthly_savings = results['current']['total_payment'] - fha_total
    fha_break_even = fha_closing_costs / fha_monthly_savings if fha_monthly_savings > 0 else float('inf')

    results['fha'] = {
        'property_value': property_value,
        'loan_amount': round(fha_loan, 2),
        'ltv': round(fha_ltv, 2),
        'rate': fha_rate,
        'pi_payment': round(fha_pi, 2),
        'mip': round(fha_mip, 2),
        'escrow': round(escrow, 2),
        'total_payment': round(fha_total, 2),
        'monthly_savings': round(fha_monthly_savings, 2),
        'break_even_months': round(fha_break_even, 1) if fha_break_even != float('inf') else None,
        'closing_costs': fha_closing_costs,
        'cash_to_close': round(cash_needed, 2),
        'five_year_cost': round(fha_total * 60 + fha_closing_costs + cash_needed, 2),
        'thirty_year_cost': round(fha_total * 360 + fha_closing_costs + cash_needed, 2)
    }

    # ========== CONVENTIONAL REFINANCE ==========
    # Conventional allows up to 80% LTV without PMI, or higher with PMI
    conv_max_no_pmi = property_value * 0.80

    # Try to match current balance or go with 80% LTV
    if current_balance <= conv_max_no_pmi:
        conv_loan = current_balance
        conv_ltv = (conv_loan / property_value) * 100
        conv_pmi = 0
    else:
        conv_loan = current_balance
        conv_ltv = (conv_loan / property_value) * 100
        conv_pmi = conv_loan * conv_pmi_rate / 12

    conv_pi = calculate_monthly_payment(conv_loan, conv_rate)
    conv_escrow = escrow
    conv_total = conv_pi + conv_pmi + conv_escrow
    conv_closing = conv_loan * conv_closing_costs_rate
    conv_cash_needed = max(0, conv_loan - (property_value * 0.80)) if conv_ltv > 80 else 0

    conv_monthly_savings = results['current']['total_payment'] - conv_total
    conv_break_even = conv_closing / conv_monthly_savings if conv_monthly_savings > 0 else float('inf')

    results['conventional'] = {
        'property_value': property_value,
        'loan_amount': round(conv_loan, 2),
        'ltv': round(conv_ltv, 2),
        'rate': conv_rate,
        'pi_payment': round(conv_pi, 2),
        'pmi': round(conv_pmi, 2),
        'escrow': round(conv_escrow, 2),
        'total_payment': round(conv_total, 2),
        'monthly_savings': round(conv_monthly_savings, 2),
        'break_even_months': round(conv_break_even, 1) if conv_break_even != float('inf') else None,
        'closing_costs': round(conv_closing, 2),
        'cash_to_close': round(conv_cash_needed, 2),
        'five_year_cost': round(conv_total * 60 + conv_closing + conv_cash_needed, 2),
        'thirty_year_cost': round(conv_total * 360 + conv_closing + conv_cash_needed, 2)
    }

    return results

# Calculate all scenarios
all_results = {}
for pv in property_values:
    all_results[f'${pv:,.0f}'] = calculate_loan_scenarios(pv)

# Print summary
print(json.dumps(all_results, indent=2))

# Save to file for reference
with open('m refinance_calculations.json', 'w') as f:
    json.dump(all_results, f, indent=2)

print("\n" + "="*60)
print("SUMMARY TABLE")
print("="*60)

print(f"\n{'Property Value':<20} {'Loan Type':<15} {'LTV':<10} {'Monthly':<12} {'Savings':<12} {'Break-Even':<12}")
print("-"*80)
for pv_key, scenarios in all_results.items():
    print(f"{pv_key:<20} {'Current':<15} {scenarios['current']['ltv']:>6.1f}%   ${scenarios['current']['total_payment']:>7.0f}")
    if 'fha' in scenarios:
        fha = scenarios['fha']
        be = f"{fha['break_even_months']:.1f} mo" if fha['break_even_months'] else "N/A"
        print(f"{'':<20} {'FHA':<15} {fha['ltv']:>6.1f}%   ${fha['total_payment']:>7.0f}   ${fha['monthly_savings']:>7.0f}   {be:>10}")
    if 'conventional' in scenarios:
        conv = scenarios['conventional']
        be = f"{conv['break_even_months']:.1f} mo" if conv['break_even_months'] else "N/A"
        print(f"{'':<20} {'Conventional':<15} {conv['ltv']:>6.1f}%   ${conv['total_payment']:>7.0f}   ${conv['monthly_savings']:>7.0f}   {be:>10}")
    print()
