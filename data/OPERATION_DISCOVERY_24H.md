# 24-Hour Machine Shop Discovery Operation
## Operation Launch: 2026-04-07 22:00 CDT

---

## Executive Summary

A systematic 24-hour discovery operation has been initiated to identify 500+ CNC machine shops across 24 US states. The operation uses scheduled sub-agents spawning at 1-hour intervals to remain within API rate limits (900 searches/hour max).

---

## Operation Parameters

| Parameter | Value |
|-----------|-------|
| **Target Shops** | 500+ |
| **Duration** | 24 hours |
| **Regions** | 24 states |
| **Search Rate** | ≤850/hour (buffer under 900 limit) |
| **Reporting** | Every 2 hours |
| **Sub-agent Spawns** | 1 per hour |

---

## Regional Schedule (24 Slots)

| Hour | Region | File Output |
|------|--------|-------------|
| 22:00 | **Texas** | `shops_texas_2026-04-07.json` |
| 23:00 | **California** | `shops_california_2026-04-07.json` |
| 00:00 | **Ohio** | `shops_ohio_2026-04-07.json` |
| 01:00 | **Illinois** | `shops_illinois_2026-04-07.json` |
| 02:00 | **Michigan** | `shops_michigan_2026-04-07.json` |
| 03:00 | **Pennsylvania** | `shops_pennsylvania_2026-04-07.json` |
| 04:00 | **New York** | `shops_newyork_2026-04-07.json` |
| 05:00 | **Florida** | `shops_florida_2026-04-07.json` |
| 06:00 | **Georgia** | `shops_georgia_2026-04-07.json` |
| 07:00 | **North Carolina** | `shops_ncarolina_2026-04-07.json` |
| 08:00 | **Indiana** | `shops_indiana_2026-04-07.json` |
| 09:00 | **Wisconsin** | `shops_wisconsin_2026-04-07.json` |
| 10:00 | **Arizona** | `shops_arizona_2026-04-07.json` |
| 11:00 | **Washington** | `shops_washington_2026-04-07.json` |
| 12:00 | **Massachusetts** | `shops_massachusetts_2026-04-07.json` |
| 13:00 | **Minnesota** | `shops_minnesota_2026-04-07.json` |
| 14:00 | **Colorado** | `shops_colorado_2026-04-07.json` |
| 15:00 | **Tennessee** | `shops_tennessee_2026-04-07.json` |
| 16:00 | **Missouri** | `shops_missouri_2026-04-07.json` |
| 17:00 | **Maryland** | `shops_maryland_2026-04-07.json` |
| 18:00 | **Oregon** | `shops_oregon_2026-04-07.json` |
| 19:00 | **Connecticut** | `shops_connecticut_2026-04-07.json` |
| 20:00 | **Oklahoma** | `shops_oklahoma_2026-04-07.json` |
| 21:00 | **Kentucky** | `shops_kentucky_2026-04-07.json` |
| 22:00+ | **South Carolina** | `shops_southcarolina_2026-04-07.json` |
| 23:00+ | **Alabama** | `shops_alabama_2026-04-07.json` |
| 00:00+ | **Louisiana** | `shops_louisiana_2026-04-07.json` |
| 01:00+ | **Iowa** | `shops_iowa_2026-04-07.json` |
| 02:00+ | **Utah** | `shops_utah_2026-04-07.json` |

---

## Data Collection Standards

### Required Fields per Shop:
1. **Company Name** (exact legal name)
2. **City/State** (full location)
3. **Contact Details** (at least one required):
   - Email addresses (group multiple: sales@, info@, contact@)
   - Phone numbers
4. **Website URL** (if available)
5. **Capabilities** (CNC Milling, Turning, 3D Printing, etc.)

### Duplicate Prevention:
- Domain matching groups contacts under same company
- Phone number cross-reference
- Email deduplication
- City + similar name = investigation required

---

## Reporting Schedule

Automated progress reports every 2 hours to Discord channel:
- **00:00** - First report (Texas + California progress)
- **02:00** - Second report (+ Ohio, Illinois, Michigan)
- **04:00** - Third report
- **06:00** - Fourth report
- **08:00** - Fifth report
- **10:00** - Sixth report
- **12:00** - Seventh report
- **14:00** - Eighth report
- **16:00** - Ninth report
- **18:00** - Tenth report
- **20:00** - Eleventh report
- **22:00** - FINAL REPORT (24-hour completion)

---

## Output Files

| File | Purpose |
|------|---------|
| `shops_texas_2026-04-07.json` | Texas shops data |
| `shops_california_2026-04-07.json` | California shops data |
| `shops_[region]_2026-04-07.json` | Other regional data |
| `shop_discovery_config.json` | Operation configuration |
| `shop_discovery_tracker.md` | Progress tracker |
| `shops_master_discovery_2026-04-07.json` | Final consolidated list |

---

## Quality Assurance

1. **Contact Verification**: Every shop must have email OR phone
2. **No Duplicates**: Domain/phone cross-checking
3. **Cluster Grouping**: Multiple contacts grouped under single company entry
4. **Capability Tags**: Standardized capability categorization
5. **Source Tracking**: Web search source logged for each entry

---

## Operational Notes

- **API Limit**: Hard cap at 850 searches/hour (50 buffer under 900 limit)
- **Timeout**: Each sub-agent has 55-minute timeout
- **Retry Logic**: Failed searches logged for manual review
- **Pause Capability**: Operation can be paused by disabling cron jobs
- **Real-time Updates**: Progress files updated as each region completes

---

## Next Actions

1. **Monitor**: First Texas results expected within 1 hour
2. **Review**: Verify data quality from first region
3. **Adjust**: Tune search parameters if needed
4. **Report**: First progress report at 00:00 CDT

---

*Operation initiated by Deep Thought*
*All systems nominal. Awaiting first results...*
