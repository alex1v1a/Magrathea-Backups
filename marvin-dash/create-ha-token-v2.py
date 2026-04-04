#!/usr/bin/env python3
"""Create a proper long-lived access token for Home Assistant using internal APIs."""
import json
import secrets
import jwt
from datetime import datetime, timezone
from pathlib import Path

AUTH_FILE = Path("/opt/homeassistant/config/.storage/auth")

# Generate secure values
token_id = secrets.token_hex(16)
token_secret = secrets.token_hex(64)
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

# Check if OpenClaw token already exists, remove it
auth_data["data"]["refresh_tokens"] = [
    t for t in auth_data["data"]["refresh_tokens"]
    if t.get("client_name") != "OpenClaw Integration"
]

# Create new long-lived access token entry
now = datetime.now(timezone.utc)
new_token = {
    "id": token_id,
    "user_id": user_id,
    "client_id": None,
    "client_name": "OpenClaw Integration",
    "client_icon": None,
    "token_type": "long_lived_access_token",
    "created_at": now.isoformat(),
    "access_token_expiration": 315360000.0,  # 10 years
    "token": token_secret,
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

# Generate the actual access token (JWT)
# HA access tokens are JWTs with specific claims
access_token = jwt.encode(
    {
        "iss": token_id,
        "iat": now,
        "exp": datetime(2036, 1, 1, tzinfo=timezone.utc),
    },
    jwt_key,
    algorithm="HS256"
)

print(f"ACCESS_TOKEN={access_token}")
print("Token created! Restart Home Assistant to activate.")
