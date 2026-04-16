# Complete API Test with Actual Keys
import requests
import hashlib
import hmac
import time
import json
from datetime import datetime

print("=" * 60)
print("API Integration Health Check - Complete")
print("=" * 60)

results = {}

# 1. Test Wyze API
print("\n[1/4] Testing WYZE API...")
print("API Key: hKQwoTq0sPelYmpk15XHXRhiqhXVHxWNW3PijpbXK0sH8f9duzp6PUraMZUS")

# Wyze uses a custom authentication flow
# The key format suggests it might be for their newer developer API
# Try the Wyze Developer API endpoint

wyze_headers = {
    "Authorization": f"Bearer hKQwoTq0sPelYmpk15XHXRhiqhXVHxWNW3PijpbXK0sH8f9duzp6PUraMZUS",
    "Content-Type": "application/json",
    "Accept": "application/json"
}

try:
    # Try Wyze developer API endpoints
    endpoints = [
        "https://developer-api.wyze.com/v1/user/info",
        "https://api.wyzecam.com/app/v2/home_page/get_object_list",
    ]
    wyze_success = False
    last_error = ""
    
    for endpoint in endpoints:
        try:
            if "developer-api" in endpoint:
                resp = requests.get(endpoint, headers=wyze_headers, timeout=10)
            else:
                resp = requests.post(endpoint, headers=wyze_headers, json={}, timeout=10)
            
            print(f"  Endpoint {endpoint.split('/')[2]}: HTTP {resp.status_code}")
            
            if resp.status_code == 200:
                wyze_success = True
                results["wyze"] = {"status": "SUCCESS", "code": resp.status_code}
                break
            elif resp.status_code == 401:
                results["wyze"] = {"status": "AUTH_FAILED", "code": 401, "error": "Invalid API key"}
                wyze_success = True  # API is reachable, just auth failed
                break
            else:
                last_error = f"HTTP {resp.status_code}"
        except requests.exceptions.ConnectionError as e:
            last_error = f"Connection error: {str(e)[:40]}"
            print(f"  Endpoint {endpoint.split('/')[2]}: Connection failed")
        except Exception as e:
            last_error = str(e)[:50]
    
    if not wyze_success:
        results["wyze"] = {"status": "FAILED", "error": last_error or "Could not connect to any endpoint"}
        print(f"  Status: FAILED - {last_error}")
        
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

# Tuya API signature calculation
string_to_sign = access_id + timestamp
signature = hmac.new(access_secret.encode(), string_to_sign.encode(), hashlib.sha256).hexdigest().upper()

tuya_headers = {
    "client_id": access_id,
    "sign": signature,
    "t": timestamp,
    "sign_method": "HMAC-SHA256"
}

try:
    resp = requests.get("https://openapi.tuyaus.com/v1.0/token?grant_type=1", headers=tuya_headers, timeout=15)
    print(f"  HTTP Status: {resp.status_code}")
    
    if resp.status_code == 200:
        data = resp.json()
        if data.get("success"):
            results["tuya"] = {"status": "SUCCESS", "code": resp.status_code}
            print(f"  Status: SUCCESS")
            print(f"  Token obtained: {data.get('result', {}).get('access_token', 'N/A')[:20]}...")
        else:
            results["tuya"] = {"status": "API_ERROR", "code": data.get("code"), "error": data.get("msg")}
            print(f"  Status: API_ERROR - {data.get('msg')}")
    else:
        results["tuya"] = {"status": "FAILED", "code": resp.status_code, "error": resp.text[:100]}
        print(f"  Status: FAILED - {resp.text[:100]}")
except Exception as e:
    results["tuya"] = {"status": "FAILED", "error": str(e)}
    print(f"  Status: FAILED - {e}")

# 3. Test Govee API
print("\n[3/4] Testing GOVEE API...")
govee_key = "a58b8033-ae31-460e-aa5c-c9f5f231f510"
print(f"API Key: {govee_key[:15]}...")

try:
    headers = {
        "Govee-API-Key": govee_key,
        "Content-Type": "application/json"
    }
    
    resp = requests.get("https://developer-api.govee.com/v1/devices", headers=headers, timeout=10)
    print(f"  HTTP Status: {resp.status_code}")
    
    if resp.status_code == 200:
        data = resp.json()
        devices = data.get("data", {}).get("devices", [])
        results["govee"] = {"status": "SUCCESS", "code": resp.status_code, "devices_found": len(devices)}
        print(f"  Status: SUCCESS")
        print(f"  Devices found: {len(devices)}")
        for device in devices[:3]:  # Show first 3 devices
            print(f"    - {device.get('deviceName', 'Unknown')} ({device.get('model', 'Unknown')})")
    elif resp.status_code == 401:
        results["govee"] = {"status": "AUTH_FAILED", "code": 401, "error": "Invalid API key"}
        print(f"  Status: AUTH_FAILED - Invalid API key")
    else:
        results["govee"] = {"status": "ERROR", "code": resp.status_code, "error": resp.text[:100]}
        print(f"  Status: ERROR - {resp.text[:100]}")
except Exception as e:
    results["govee"] = {"status": "FAILED", "error": str(e)}
    print(f"  Status: FAILED - {e}")

# 4. Test OpenWeatherMap API
print("\n[4/4] Testing OPENWEATHERMAP API...")
owm_key = "86068b6ad9e2c382b390824b9ea7979b"
print(f"API Key: {owm_key[:15]}...")

try:
    params = {
        "q": "Austin,TX,US",
        "appid": owm_key,
        "units": "imperial"
    }
    
    resp = requests.get("https://api.openweathermap.org/data/2.5/weather", params=params, timeout=10)
    print(f"  HTTP Status: {resp.status_code}")
    
    if resp.status_code == 200:
        data = resp.json()
        temp = data.get("main", {}).get("temp")
        weather = data.get("weather", [{}])[0].get("description", "unknown")
        results["openweathermap"] = {"status": "SUCCESS", "code": resp.status_code, "temp": temp, "weather": weather}
        print(f"  Status: SUCCESS")
        print(f"  Current weather in Austin: {temp}°F, {weather}")
    elif resp.status_code == 401:
        results["openweathermap"] = {"status": "AUTH_FAILED", "code": 401, "error": "Invalid API key"}
        print(f"  Status: AUTH_FAILED - Invalid API key")
    else:
        results["openweathermap"] = {"status": "ERROR", "code": resp.status_code, "error": resp.text[:100]}
        print(f"  Status: ERROR - {resp.text[:100]}")
except Exception as e:
    results["openweathermap"] = {"status": "FAILED", "error": str(e)}
    print(f"  Status: FAILED - {e}")

# SUMMARY
print("\n" + "=" * 60)
print("FINAL SUMMARY")
print("=" * 60)

working_apis = []
failing_apis = []
skipped_apis = []

for api_name, result in results.items():
    status = result.get('status', 'UNKNOWN')
    if status == 'SUCCESS':
        working_apis.append(api_name)
        print(f"[PASS] {api_name.upper()}: WORKING (HTTP {result.get('code', 'N/A')})")
    elif status in ['SKIPPED', 'CONFIG_MISSING']:
        skipped_apis.append(api_name)
        print(f"[SKIP] {api_name.upper()}: SKIPPED - {result.get('reason', 'N/A')}")
    else:
        failing_apis.append(api_name)
        print(f"[FAIL] {api_name.upper()}: {status}")
        if 'code' in result:
            print(f"       HTTP/Error Code: {result['code']}")
        if 'error' in result:
            print(f"       Details: {result['error'][:80]}")

print("\n" + "-" * 60)
print(f"WORKING: {len(working_apis)} ({', '.join(working_apis) if working_apis else 'None'})")
print(f"FAILING: {len(failing_apis)} ({', '.join(failing_apis) if failing_apis else 'None'})")
print(f"SKIPPED: {len(skipped_apis)} ({', '.join(skipped_apis) if skipped_apis else 'None'})")

# Save results
with open("api_test_results.json", "w") as f:
    json.dump(results, f, indent=2)
print("\nDetailed results saved to api_test_results.json")
