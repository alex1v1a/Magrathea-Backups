# Mission Control API Configuration
# Provided by Trillian
# Updated: 2026-04-11

## API Base URL
http://10.0.1.90:8000

## Board IDs
- Machine Shop Outreach: `machine-shop-outreach`
- Customer Projects: `customer-projects`
- Cron Jobs: `cron-job-calendar`
- Fleet Status: `fleet-status`

## Authentication
Bearer token from environment: MISSION_CONTROL_API_KEY

## Fleet Status Dashboard
http://10.0.1.90:3001/boards/fleet-status

## Status (per Trillian)
- ✅ Kanban SQL fixed and working
- ✅ CSS fixed
- ✅ Fleet status dashboard operational

## Integration Script
See: magrathea/deepthought/scripts/MissionControlApi.psm1
