#!/usr/bin/env python3
import json

with open('/home/marvin/homeassistant/config/.storage/core.config_entries', 'r') as f:
    data = json.load(f)

for e in data['data']['entries']:
    if 'Sayville' in str(e):
        print(json.dumps(e, indent=2))
