# Simple API Test - Direct endpoint testing
import requests
import json
import hashlib
import time
from datetime import datetime

print("=" * 60)
print("API Integration Health Check")
print("=" * 60)

results = {}

# 1. Test Wyze API
print("\n[1/4] Testing WYZE API...")
print("API Key provided: hKQwoTq0sPelYmpk15XHXRhiqhXVHxWNW3PijpbXK0sH8f9duzp6PUraMZUS")

# Wyze uses different endpoints - let's try the correct one
# Wyze API base URL is typically https://api.wyzecam.com or uses their SDK
# The API key format suggests it might be for their newer developer API

wyze_headers = {
    "Authorization": f"Bearer hKQwoTq0sPelYmpk15XHXRhiqhXVHxWNW3PijpbXK0sH8f9duzp6PUraMZUS",
    "Content-Type": "application/json"
}

try:
    # Try alternative Wyze endpoints
    endpoints = [
        "https://api.wyzecam.com/app/v2/home_page/get_object_list",
        "https://wyze-api.wyzecam.com/app/v2/home_page/get_object_list",
    ]
    wyze_success = False
    for endpoint in endpoints:
        try:
            resp = requests.post(endpoint, headers=wyze_headers, json={}, timeout=5)
            if resp.status_code in [200, 401]:  # 401 means key format is recognized
                wyze_success = True
                results["wyze"] = {"status": "AUTH_CHECK" if resp.status_code == 401 else "SUCCESS", "code": resp.status_code}
                print(f"  Endpoint {endpoint}: HTTP {resp.status_code}")
                break
        except Exception as e:
            print(f"  Endpoint {endpoint}: {str(e)[:50]}")
    
    if not wyze_success:
        results["wyze"] = {"status": "FAILED", "error": "Could not connect to any Wyze endpoint"}
        print("  Status: FAILED - DNS resolution issues")
except Exception as e:
    results["wyze"] = {"status": "FAILED", "error": str(e)}
    print(f"  Status: FAILED - {e}")

# 2. Test Tuya API
print("\n[2/4] Testing TUYA API...")
print("Access ID: 94sy733fes5akhdah3ne")
print("Access Secret: 947fa02f3e4e451a89a60938ad1bc1f7")

access_id = "94sy733fes5akhdah3ne"
access_secret = "947fa02f3e4e451a89a60938ad1bc1f7"
timestamp = str(int(time.time() * 1000))

# Tuya signature calculation
message = access_id + timestamp
signature = hashlib.sha256((message + access_secret).encode()).hexdigest().upper()

tuya_headers = {
    "client_id": access_id,
    "sign": signature,
    "t": timestamp,
    "sign_method": "HMAC-SHA256"
}

try:
    resp = requests.get("https://openapi.tuyaus.com/v1.0/token?grant_type=1", headers=tuya_headers, timeout=10)
    results["tuya"] = {"status": "SUCCESS" if resp.status_code == 200 else "FAILED", "code": resp.status_code}
    print(f"  HTTP Status: {resp.status_code}")
    if resp.status_code == 200:
        data = resp.json()
        print(f"  Response: {json.dumps(data, indent=2)[:200]}...")
    else:
        print(f"  Response: {resp.text[:200]}")
except Exception as e:
    results["tuya"] = {"status": "FAILED", "error": str(e)}
    print(f"  Status: FAILED - {e}")

# 3. Test Govee API
print("\n[3/4] Testing GOVEE API...")
print("Looking for API key in /home/marvin/homeassistant/config/secrets.yaml")

# Try to find secrets file
govee_key = None
import os
possible_paths = [
    "C:/home/marvin/homeassistant/config/secrets.yaml",
    "/home/marvin/homeassistant/config/secrets.yaml", 
    "C:/config/secrets.yaml",
    "/config/secrets.yaml",
    "./secrets.yaml",
    "../secrets.yaml",
    "../../secrets.yaml"
]

for path in possible_paths:
    if os.path.exists(path):
        print(f"  Found secrets file at: {path}")
        try:
            with open(path, 'r') as f:
                content = f.read()
                # Parse YAML manually for simple key:value
                for line in content.split('\n'):
                    if 'govee' in line.lower() and ':' in line:
                        print(f"  Found line: {line.strip()}")
                    if 'govee_api_key' in line or 'govee_api' in line:
                        parts = line.split(':', 1)
                        if len(parts) == 2:
                            govee_key = parts[1].strip().strip('"').strip("'")
                            print(f"  Found Govee API key: {govee_key[:10]}...")
                            break
        except Exception as e:
            print(f"  Error reading file: {e}")

if govee_key:
    try:
        headers = {"Govee-API-Key": govee_key}
        resp = requests.get("https://developer-api.govee.com/v1/devices", headers=headers, timeout=10)
        results["govee"] = {"status": "SUCCESS" if resp.status_code == 200 else "FAILED", "code": resp.status_code}
        print(f"  HTTP Status: {resp.status_code}")
    except Exception as e:
        results["govee"] = {"status": "FAILED", "error": str(e)}
        print(f"  Status: FAILED - {e}")
else:
    results["govee"] = {"status": "SKIPPED", "reason": "API key not found"}
    print("  Status: SKIPPED - Could not locate Govee API key")

# 4. Test OpenWeatherMap API
print("\n[4/4] Testing OPENWEATHERMAP API...")
print("Looking for API key...")

owm_key = None
for path in possible_paths:
    if os.path.exists(path):
        try:
            with open(path, 'r') as f:
                content = f.read()
                for line in content.split('\n'):
                    if 'openweathermap' in line.lower() or 'owm_' in line.lower():
                        parts = line.split(':', 1)
                        if len(parts) == 2:
                            owm_key = parts[1].strip().strip('"').strip("'")
                            print(f"  Found OWM API key: {owm_key[:10]}...")
                            break
        except:
            pass
    if owm_key:
        break

# Also check environment variables
if not owm_key:
    owm_key = os.environ.get('OPENWEATHERMAP_API_KEY') or os.environ.get('OWM_API_KEY')
    if owm_key:
        print(f"  Found OWM API key in environment: {owm_key[:10]}...")

if owm_key:
    try:
        params = {"q": "Austin,TX,US", "appid": owm_key, "units": "imperial"}
        resp = requests.get("https://api.openweathermap.org/data/2.5/weather", params=params, timeout=10)
        results["openweathermap"] = {"status": "SUCCESS" if resp.status_code == 200 else "FAILED", "code": resp.status_code}
        print(f"  HTTP Status: {resp.status_code}")
        if resp.status_code == 200:
            data = resp.json()
            print(f"  Current temp in Austin: {data.get('main', {}).get('temp')}°F")
    except Exception as e:
        results["openweathermap"] = {"status": "FAILED", "error": str(e)}
        print(f"  Status: FAILED - {e}")
else:
    results["openweathermap"] = {"status": "SKIPPED", "reason": "API key not found"}
    print("  Status: SKIPPED - Could not locate OpenWeatherMap API key")

# SUMMARY
print("\n" + "=" * 60)
print("SUMMARY")
print("=" * 60)

for api_name, result in results.items():
    status = result.get('status', 'UNKNOWN')
    if status == 'SUCCESS':
        print(f"[PASS] {api_name.upper()}: Working (HTTP {result.get('code', 'N/A')})")
    elif status == 'SKIPPED':
        print(f"[SKIP] {api_name.upper()}: Skipped - {result.get('reason', 'N/A')}")
    else:
        print(f"[FAIL] {api_name.upper()}: {status}")
        if 'code' in result:
            print(f"       HTTP Code: {result['code']}")
        if 'error' in result:
            print(f"       Error: {result['error'][:100]}")

# Save results
with open("api_test_results.json", "w") as f:
    json.dump(results, f, indent=2)
print("\nDetailed results saved to api_test_results.json")
