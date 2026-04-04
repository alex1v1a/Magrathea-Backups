import json
with open('/home/marvin/homeassistant/config/.storage/core.device_registry') as f:
    data = json.load(f)
for device in data.get('data', {}).get('devices', []):
    name = device.get('name_by_user') or device.get('name', 'Unknown')
    manufacturer = device.get('manufacturer', 'Unknown')
    model = device.get('model', 'Unknown')
    connections = device.get('connections', [])
    print(f"{name} | {manufacturer} | {model}")
