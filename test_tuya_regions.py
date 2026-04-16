import requests
import hashlib
import hmac
import time

access_id = '94sy733fes5akhdah3ne'
access_secret = '947fa02f3e4e451a89a60938ad1bc1f7'
timestamp = str(int(time.time() * 1000))

string_to_sign = access_id + timestamp
signature = hmac.new(access_secret.encode(), string_to_sign.encode(), hashlib.sha256).hexdigest().upper()

headers = {
    'client_id': access_id,
    'sign': signature,
    't': timestamp,
    'sign_method': 'HMAC-SHA256'
}

endpoints = [
    'https://openapi.tuyaus.com/v1.0/token?grant_type=1',
    'https://openapi.tuyaeu.com/v1.0/token?grant_type=1',
    'https://openapi.tuyacn.com/v1.0/token?grant_type=1',
]

for endpoint in endpoints:
    try:
        resp = requests.get(endpoint, headers=headers, timeout=10)
        data = resp.json()
        region = endpoint.split('.')[1]
        print(f'{region}: HTTP {resp.status_code} - {data.get("msg", "OK")}')
    except Exception as e:
        print(f'{endpoint}: Error - {str(e)[:50]}')
