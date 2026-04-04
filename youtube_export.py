#!/usr/bin/env python3
"""
YouTube Playlist Exporter
Fetches all YouTube playlists and their tracks using the YouTube Data API
"""

import json
import sys
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

# Configuration
YOUTUBE_API_KEY = "AIzaSyANW0BGJMf3PQLWUVHOi04aVGe6k4K56pE"
OUTPUT_FILE = "youtube_playlists.json"

def get_all_playlists(youtube, channel_id=None):
    """Fetch all playlists for a channel (or authenticated user's channel)"""
    playlists = []
    request = youtube.playlists().list(
        part="snippet,contentDetails",
        mine=True if not channel_id else False,
        channelId=channel_id if channel_id else None,
        maxResults=50
    )
    
    while request:
        response = request.execute()
        for item in response.get("items", []):
            playlists.append({
                "id": item["id"],
                "title": item["snippet"]["title"],
                "description": item["snippet"]["description"],
                "item_count": item["contentDetails"]["itemCount"],
                "privacy": item["status"]["privacyStatus"] if "status" in item else "unknown"
            })
        request = youtube.playlistItems().list_next(request, response)
    
    return playlists

def get_playlist_tracks(youtube, playlist_id):
    """Fetch all tracks/videos from a playlist"""
    tracks = []
    request = youtube.playlistItems().list(
        part="snippet,contentDetails",
        playlistId=playlist_id,
        maxResults=50
    )
    
    while request:
        response = request.execute()
        for item in response.get("items", []):
            snippet = item.get("snippet", {})
            # Skip deleted/private videos
            if snippet.get("title") == "Deleted video" or snippet.get("title") == "Private video":
                continue
                
            tracks.append({
                "video_id": item["contentDetails"]["videoId"],
                "title": snippet.get("title", ""),
                "channel": snippet.get("videoOwnerChannelTitle", snippet.get("channelTitle", "")),
                "position": snippet.get("position", 0),
                "description": snippet.get("description", "")[:200]  # Truncate
            })
        request = youtube.playlistItems().list_next(request, response)
    
    return tracks

def main():
    print("🎵 YouTube Playlist Exporter")
    print("=" * 50)
    
    try:
        # Build YouTube API client
        youtube = build("youtube", "v3", developerKey=YOUTUBE_API_KEY)
        print("✓ Connected to YouTube API")
        
        # For API key auth, we need a channel ID. Let's try to get it from a search or ask user
        # First, let's try to get playlists by searching for a known channel or using 'mine' (requires OAuth)
        # With just API key, we need a channel ID
        
        print("\nNote: With API key only, I need your YouTube Channel ID.")
        print("You can find it at: https://www.youtube.com/account_advanced")
        print("Or from your channel URL (e.g., UCxxxxxxxxxxxxxxxxxxx)")
        print("\nAlternatively, I can use yt-dlp which works with your YouTube cookies...")
        
        # Let's check if we can proceed with OAuth-like flow or need channel ID
        # For now, document what we need
        
        print("\n⚠️  With only an API key (not OAuth), I need your YouTube Channel ID to fetch playlists.")
        print("\nPlease provide your YouTube Channel ID, or I can switch to using yt-dlp instead.")
        
        # Save config for next step
        config = {
            "youtube_api_key": YOUTUBE_API_KEY,
            "plex_server": "http://10.0.1.99:32400",
            "playlist_prefix": "YT Red",
            "needs_channel_id": True
        }
        
        with open("config.json", "w") as f:
            json.dump(config, f, indent=2)
        
        print("\n✓ Configuration saved to config.json")
        
    except HttpError as e:
        print(f"✗ YouTube API Error: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"✗ Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
