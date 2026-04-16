#!/usr/bin/env python3
import json

with open('/home/marvin/homeassistant/config/.storage/core.config_entries', 'r') as f:
    data = json.load(f)

print('Total entries:', len(data['data']['entries']))
for e in data['data']['entries']:
    if 'Sayville' in str(e):
        print('Found Sayville in entry:', e['entry_id'])
        if 'homekit' in e.get('data', {}):
            print('  In nested array')
        else:
            print('  As separate entry')
