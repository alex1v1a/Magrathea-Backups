import requests
import os
from datetime import datetime, timedelta
import json

api_key = os.environ.get('OPENAI_API_KEY')
headers = {'Authorization': f'Bearer {api_key}'}

print('=== OpenAI API Usage Verification ===')
print(f'API Key (first 10 chars): {api_key[:10]}...')
print()

# Check multiple months - the $471 might be from a previous month
# Let's check January 2026 and February 2026
months_to_check = [
    ('2026-01-01', '2026-01-31', 'January 2026'),
    ('2026-02-01', '2026-02-03', 'February 2026 (so far)'),
]

for start, end, label in months_to_check:
    print(f'\n=== {label} ===')
    
    current = datetime.strptime(start, '%Y-%m-%d')
    end_date = datetime.strptime(end, '%Y-%m-%d')
    
    month_total = 0
    
    while current <= end_date:
        date_str = current.strftime('%Y-%m-%d')
        url = f'https://api.openai.com/v1/usage?date={date_str}'
        
        try:
            resp = requests.get(url, headers=headers, timeout=10)
            if resp.status_code == 200:
                data = resp.json()
                
                # Check for any usage data
                has_data = False
                daily_cost = 0
                
                categories = {
                    'data': 'Completions/Chat',
                    'dalle_api_data': 'DALL-E Images',
                    'tts_api_data': 'Text-to-Speech',
                    'whisper_api_data': 'Whisper/Audio',
                    'ft_data': 'Fine-tuning',
                    'assistant_code_interpreter_data': 'Assistant Code',
                    'retrieval_storage_data': 'Retrieval Storage'
                }
                
                for key, name in categories.items():
                    if data.get(key):
                        if isinstance(data[key], dict) and data[key]:
                            has_data = True
                            print(f"  {date_str} - {name}: {data[key]}")
                        elif isinstance(data[key], list) and data[key]:
                            has_data = True
                            print(f"  {date_str} - {name}: {len(data[key])} items")
                
                if not has_data:
                    pass  # No data for this day
            else:
                print(f"  {date_str} - Error {resp.status_code}: {resp.text[:100]}")
        except Exception as e:
            print(f"  {date_str} - Exception: {e}")
        
        current += timedelta(days=1)

# Try to check subscription/billing info
print('\n=== Checking Billing/Subscription Endpoints ===')
billing_endpoints = [
    'https://api.openai.com/v1/billing/subscription',
    'https://api.openai.com/dashboard/billing/credit_grants',
    'https://api.openai.com/v1/account',
]

for endpoint in billing_endpoints:
    try:
        resp = requests.get(endpoint, headers=headers, timeout=10)
        print(f"{endpoint.split('/')[-1]}: Status {resp.status_code}")
        if resp.status_code == 200:
            print(f"  Response: {json.dumps(resp.json(), indent=2)[:500]}")
    except Exception as e:
        print(f"{endpoint.split('/')[-1]}: Error - {str(e)[:100]}")
