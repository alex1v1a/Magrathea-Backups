# API Health Check Script
# Tests Wyze, Tuya, Govee, and OpenWeatherMap APIs

import requests
import json
import yaml
import sys
import os
from datetime import datetime

# Test results
results = {
    "timestamp": datetime.now().isoformat(),
    "apis": {}
}

def test_wyze_api():
    """Test Wyze API with provided key"""
    api_key = "hKQwoTq0sPelYmpk15XHXRhiqhXVHxWNW3PijpbXK0sH8f9duzp6PUraMZUS"
    
    try:
        # Wyze API requires authentication via their developer API
        # The key provided appears to be an API key format
        # Try to access the Wyze developer API console endpoint
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
        
        # Wyze API endpoints
        # Try the auth endpoint first
        response = requests.get(
            "https://developer-api.wyze.com/v1/user/info",
            headers=headers,
            timeout=10
        )
        
        if response.status_code == 200:
            return {"status": "success", "code": response.status_code, "response": response.json()}
        elif response.status_code == 401:
            return {"status": "auth_failed", "code": 401, "error": "Invalid API key"}
        else:
            return {"status": "error", "code": response.status_code, "error": response.text}
    except requests.exceptions.RequestException as e:
        return {"status": "failed", "error": str(e)}

def test_tuya_api():
    """Test Tuya API with Access ID and Secret"""
    access_id = "94sy733fes5akhdah3ne"
    access_secret = "947fa02f3e4e451a89a60938ad1bc1f7"
    
    try:
        # Tuya API requires signature-based authentication
        # First try to get a token
        import hashlib
        import time
        
        timestamp = str(int(time.time() * 1000))
        
        # Build signature
        message = access_id + timestamp
        signature = hashlib.sha256((message + access_secret).encode()).hexdigest().upper()
        
        headers = {
            "client_id": access_id,
            "sign": signature,
            "t": timestamp,
            "sign_method": "HMAC-SHA256"
        }
        
        response = requests.get(
            "https://openapi.tuyaus.com/v1.0/token?grant_type=1",
            headers=headers,
            timeout=10
        )
        
        if response.status_code == 200:
            return {"status": "success", "code": response.status_code, "response": response.json()}
        elif response.status_code == 401:
            return {"status": "auth_failed", "code": 401, "error": "Invalid credentials"}
        else:
            return {"status": "error", "code": response.status_code, "error": response.text}
    except requests.exceptions.RequestException as e:
        return {"status": "failed", "error": str(e)}

def test_govee_api():
    """Test Govee API - need to read key from secrets file"""
    # Try common locations for secrets file
    possible_paths = [
        "/home/marvin/homeassistant/config/secrets.yaml",
        "/config/secrets.yaml",
        "./secrets.yaml",
        "../secrets.yaml"
    ]
    
    api_key = None
    for path in possible_paths:
        if os.path.exists(path):
            try:
                with open(path, 'r') as f:
                    secrets = yaml.safe_load(f)
                    if secrets and 'govee_api_key' in secrets:
                        api_key = secrets['govee_api_key']
                        break
            except:
                continue
    
    if not api_key:
        return {"status": "failed", "error": "Could not find Govee API key in secrets.yaml"}
    
    try:
        headers = {
            "Govee-API-Key": api_key,
            "Content-Type": "application/json"
        }
        
        # Govee API endpoint for devices
        response = requests.get(
            "https://developer-api.govee.com/v1/devices",
            headers=headers,
            timeout=10
        )
        
        if response.status_code == 200:
            return {"status": "success", "code": response.status_code, "response": response.json()}
        elif response.status_code == 401:
            return {"status": "auth_failed", "code": 401, "error": "Invalid API key"}
        else:
            return {"status": "error", "code": response.status_code, "error": response.text}
    except requests.exceptions.RequestException as e:
        return {"status": "failed", "error": str(e)}

def test_openweathermap_api():
    """Test OpenWeatherMap API - need to find API key"""
    # Try common locations for API key
    possible_paths = [
        "/home/marvin/homeassistant/config/secrets.yaml",
        "/config/secrets.yaml",
        "./secrets.yaml",
        "../secrets.yaml"
    ]
    
    api_key = None
    for path in possible_paths:
        if os.path.exists(path):
            try:
                with open(path, 'r') as f:
                    secrets = yaml.safe_load(f)
                    if secrets and 'openweathermap_api_key' in secrets:
                        api_key = secrets['openweathermap_api_key']
                        break
                    elif secrets and 'owm_api_key' in secrets:
                        api_key = secrets['owm_api_key']
                        break
            except:
                continue
    
    if not api_key:
        # Try environment variable
        api_key = os.environ.get('OPENWEATHERMAP_API_KEY') or os.environ.get('OWM_API_KEY')
    
    if not api_key:
        return {"status": "failed", "error": "Could not find OpenWeatherMap API key"}
    
    try:
        # Test with a simple weather query for Austin, TX
        params = {
            "q": "Austin,TX,US",
            "appid": api_key,
            "units": "imperial"
        }
        
        response = requests.get(
            "https://api.openweathermap.org/data/2.5/weather",
            params=params,
            timeout=10
        )
        
        if response.status_code == 200:
            return {"status": "success", "code": response.status_code, "response": response.json()}
        elif response.status_code == 401:
            return {"status": "auth_failed", "code": 401, "error": "Invalid API key"}
        else:
            return {"status": "error", "code": response.status_code, "error": response.text}
    except requests.exceptions.RequestException as e:
        return {"status": "failed", "error": str(e)}

if __name__ == "__main__":
    print("=" * 60)
    print("API Health Check")
    print("=" * 60)
    
    # Test Wyze API
    print("\n[1/4] Testing Wyze API...")
    wyze_result = test_wyze_api()
    results["apis"]["wyze"] = wyze_result
    print(f"Status: {wyze_result['status']}")
    if 'code' in wyze_result:
        print(f"HTTP Code: {wyze_result['code']}")
    if 'error' in wyze_result:
        print(f"Error: {wyze_result['error']}")
    
    # Test Tuya API
    print("\n[2/4] Testing Tuya API...")
    tuya_result = test_tuya_api()
    results["apis"]["tuya"] = tuya_result
    print(f"Status: {tuya_result['status']}")
    if 'code' in tuya_result:
        print(f"HTTP Code: {tuya_result['code']}")
    if 'error' in tuya_result:
        print(f"Error: {tuya_result['error']}")
    
    # Test Govee API
    print("\n[3/4] Testing Govee API...")
    govee_result = test_govee_api()
    results["apis"]["govee"] = govee_result
    print(f"Status: {govee_result['status']}")
    if 'code' in govee_result:
        print(f"HTTP Code: {govee_result['code']}")
    if 'error' in govee_result:
        print(f"Error: {govee_result['error']}")
    
    # Test OpenWeatherMap API
    print("\n[4/4] Testing OpenWeatherMap API...")
    owm_result = test_openweathermap_api()
    results["apis"]["openweathermap"] = owm_result
    print(f"Status: {owm_result['status']}")
    if 'code' in owm_result:
        print(f"HTTP Code: {owm_result['code']}")
    if 'error' in owm_result:
        print(f"Error: {owm_result['error']}")
    
    # Print summary
    print("\n" + "=" * 60)
    print("SUMMARY")
    print("=" * 60)
    
    for api_name, result in results["apis"].items():
        status_icon = "✅" if result['status'] == 'success' else "❌"
        print(f"{status_icon} {api_name.upper()}: {result['status']}")
    
    # Save results
    with open("api_test_results.json", "w") as f:
        json.dump(results, f, indent=2)
    
    print("\nDetailed results saved to api_test_results.json")
