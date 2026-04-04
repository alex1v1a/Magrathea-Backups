import requests
import os
from datetime import datetime, timedelta
import json

api_key = os.environ.get('OPENAI_API_KEY')
headers = {'Authorization': f'Bearer {api_key}'}

# Get current month date range
now = datetime.now()
start_date = now.replace(day=1).strftime('%Y-%m-%d')
end_date = now.strftime('%Y-%m-%d')

print(f'=== OpenAI API Usage Verification ===')
print(f'Date range: {start_date} to {end_date}')
print()

# Try the usage endpoint for each day
all_data = []

current = datetime.strptime(start_date, '%Y-%m-%d')
end = datetime.strptime(end_date, '%Y-%m-%d')

while current <= end:
    date_str = current.strftime('%Y-%m-%d')
    url = f'https://api.openai.com/v1/usage?date={date_str}'
    
    try:
        resp = requests.get(url, headers=headers, timeout=10)
        if resp.status_code == 200:
            data = resp.json()
            all_data.append({'date': date_str, 'data': data})
        else:
            print(f'{date_str} - API Error: {resp.status_code}')
    except Exception as e:
        print(f'{date_str} - Exception: {e}')
    
    current += timedelta(days=1)

# Print summary
print(f"Days checked: {len(all_data)}")
print()

# Try alternative endpoints
print("=== Checking Available API Endpoints ===")
endpoints = [
    "https://api.openai.com/v1/user",
    "https://api.openai.com/v1/models",
]

for endpoint in endpoints:
    try:
        resp = requests.get(endpoint, headers=headers, timeout=10)
        print(f"{endpoint}: {resp.status_code}")
    except Exception as e:
        print(f"{endpoint}: Error - {e}")
