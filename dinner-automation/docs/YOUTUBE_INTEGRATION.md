# YouTube Video Integration for Dinner Calendar

## Overview

The calendar sync now includes **YouTube cooking videos** for each dinner recipe!

## How It Works

1. **Build YouTube Cache** - Run `build-youtube-cache.js` to create a database of cooking videos
2. **Sync Calendar** - Run `sync-dinner-to-icloud.js` to push events with YouTube links
3. **View in Calendar** - Open Apple Calendar to see dinner events with video links

## What You Get

Each dinner event in Apple Calendar now includes:

```
🍽️  Pan-Seared Cod with Lemon Butter

🌍 Cuisine: Mediterranean / Italian
📍 Origin: Coastal Italy and Greece

📖 The Story:
[Recipe story...]

⏱️  Timing:
   Prep: 10 min
   Cook: 10 min
   Total: 20 min

🛒 Ingredients:
   • 1.5 lbs cod fillets
   • 4 tbsp unsalted butter
   ...

👨‍🍳 Instructions:
   1. Pat cod fillets dry...
   ...

🎥 How to Cook This Recipe:
   Watch on YouTube: https://www.youtube.com/watch?v=tlr2X09QKeo

💡 Chef's Tip:
   Don't overcook the cod...
```

## Video Selection Criteria

Videos are selected based on:
- ⭐ **Top-rated** cooking channels
- ⏱️ **Under 30 minutes** (quick weeknight cooking)
- 🎯 **Relevant to the exact recipe**
- 👨‍🍳 **Professional quality**

## Current Video Cache

| Recipe | YouTube Video | Duration | Channel |
|--------|--------------|----------|---------|
| Pan-Seared Cod | Lemon Butter Pan Seared Cod | 8:45 | Chef's Plate |
| Beef Stir-Fry | Easy Beef Stir Fry Recipe | 12:30 | Tasty |
| Fish Tacos | The BEST Fish Tacos | 15:20 | Joshua Weissman |
| Grilled Salmon | Perfect Grilled Salmon | 12:45 | Gordon Ramsay |
| Korean Beef Bowl | Search YouTube | N/A | Search Results |
| Mediterranean Chicken | Search YouTube | N/A | Search Results |
| Chicken Tikka Masala | Search YouTube | N/A | Search Results |

## Usage

### Build/Update YouTube Cache
```bash
cd dinner-automation/scripts
node build-youtube-cache.js
```

### Sync with YouTube Links
```bash
node sync-dinner-to-icloud.js
```

The sync will automatically:
1. Load the YouTube video cache
2. Match videos to recipes
3. Include links in calendar event descriptions

## Adding More Videos

Edit `build-youtube-cache.js` and add entries to `YOUTUBE_VIDEO_CACHE`:

```javascript
"Your Recipe Name": {
  url: "https://www.youtube.com/watch?v=VIDEO_ID",
  title: "Video Title",
  duration: "15:00",
  channel: "Channel Name"
}
```

Then rebuild the cache.

## Cron Integration

The YouTube cache should be rebuilt periodically (weekly) to ensure links are fresh:

```bash
# Add to cron (runs Sundays at 2 AM)
0 2 * * 0 cd ~/.openclaw/workspace/dinner-automation/scripts && node build-youtube-cache.js
```

## Notes

- Videos without curated links will show "Search YouTube" links
- Click the link in your calendar to open YouTube
- All videos are selected to be under 30 minutes for weeknight cooking
