#!/usr/bin/env python3
"""Create a long-lived access token for Home Assistant."""
import json
import secrets
from datetime import datetime
from pathlib import Path

AUTH_FILE = Path("/opt/homeassistant/config/.storage/auth")

# Generate tokens
token_id = secrets.token_hex(16)
access_token = secrets.token_hex(64)
jwt_key = secrets.token_hex(64)

# Load existing auth
with open(AUTH_FILE, "r") as f:
    auth_data = json.load(f)

# Find Alexander's user ID
user_id = None
for user in auth_data["data"]["users"]:
    if user["name"] == "Alexander Sferrazza":
        user_id = user["id"]
        break

if not user_id:
    print("ERROR: User not found")
    exit(1)

# Create new long-lived access token entry
new_token = {
    "id": token_id,
    "user_id": user_id,
    "client_id": None,
    "client_name": "OpenClaw Integration",
    "client_icon": None,
    "token_type": "long_lived_access_token",
    "created_at": datetime.utcnow().isoformat() + "+00:00",
    "access_token_expiration": 315360000.0,  # 10 years
    "token": access_token,
    "jwt_key": jwt_key,
    "last_used_at": None,
    "last_used_ip": None,
    "expire_at": None,
    "credential_id": None,
    "version": "2026.1.3"
}

# Add to refresh tokens
auth_data["data"]["refresh_tokens"].append(new_token)

# Write back
with open(AUTH_FILE, "w") as f:
    json.dump(auth_data, f, indent=2)

print(f"TOKEN_ID={token_id}")
print(f"ACCESS_TOKEN={access_token}")
print("Token created successfully! Restart Home Assistant to activate.")
