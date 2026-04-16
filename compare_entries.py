#!/usr/bin/env python3
import json

with open('/home/marvin/homeassistant/config/.storage/core.config_entries', 'r') as f:
    data = json.load(f)

for e in data['data']['entries']:
    if e['entry_id'] == '01KKTCK5JVM5GNK40BQSWN06TF':
        print('HASS Bridge (working):')
        print('  data keys:', sorted(e['data'].keys()))
        print('  options keys:', sorted(e['options'].keys()))
        print('  has exclude_accessory_mode:', 'exclude_accessory_mode' in e['data'])
    if e['entry_id'] == '01F35C2A5A9E8D405E9645F2C0':
        print('Sayville (not working):')
        print('  data keys:', sorted(e['data'].keys()))
        print('  options keys:', sorted(e['options'].keys()))
        print('  has exclude_accessory_mode:', 'exclude_accessory_mode' in e['data'])
