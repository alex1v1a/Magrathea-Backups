# HomeKit IP-Based Architecture

## Overview
Created 6 HomeKit bridges for 3 homes with IP-based separation.

## Network Architecture
- **Austin (10.0.1.x)** - Primary home
- **Sayville (10.1.1.x)** - Secondary home
- **Parnell (10.2.1.x)** - Third home

## Bridges

| Bridge | Port | IP Subnet | Entities | Status |
|--------|------|-----------|----------|--------|
| Austin Lights | 21063 | 10.0.1.x | 66 lights | Active |
| Austin Sensors | 21064 | 10.0.1.x | 236 sensors/switches/media | Active |
| Sayville Lights | 21065 | 10.1.1.x | 0 (ready for future) | Ready |
| Sayville Switches | 21066 | 10.1.1.x | 5 switches | Active |
| Parnell Lights | 21067 | 10.2.1.x | 0 (ready for future) | Ready |
| Parnell Switches | 21068 | 10.2.1.x | 0 (ready for future) | Ready |

## mDNS Advertising
All bridges are configured with `advertise_ip` for cross-subnet discovery:
- Austin bridges: advertise on 10.0.1.90
- Sayville bridges: advertise on 10.0.1.90 and 10.1.1.90
- Parnell bridges: advertise on 10.0.1.90 and 10.2.1.90

## Files Created/Modified

### /home/marvin/homeassistant/config/homekit.yaml
New file containing all 6 bridge configurations with entity filters and custom names.

### /home/marvin/homeassistant/config/configuration.yaml
Updated to include:
```yaml
# HomeKit Bridge Configuration
homekit: !include homekit.yaml
```

The old inline homekit configuration was removed.

## Next Steps

1. **Restart Home Assistant** to load the new configuration
2. **Pair each bridge** in the Apple Home app:
   - Austin Lights (port 21063)
   - Austin Sensors (port 21064)
   - Sayville Lights (port 21065) - if/when devices added
   - Sayville Switches (port 21066)
   - Parnell Lights (port 21067) - ready for future
   - Parnell Switches (port 21068) - ready for future

3. **Verify mDNS** - Check that bridges are discoverable on all configured subnets

## Backup
Original configuration backed up to:
- `/home/marvin/homeassistant/config/configuration.yaml.backup.pre_homekit`
