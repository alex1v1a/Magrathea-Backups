#!/usr/bin/env python3
"""
Main orchestrator: YouTube Playlists → Plex
"""

import json
import sys
from pathlib import Path

# Import our modules
from youtube_export_ytdlp import get_playlist_tracks
from plex_client import PlexClient
from matcher import match_tracks

def load_config():
    """Load configuration from config.json"""
    try:
        with open("config.json", "r") as f:
            return json.load(f)
    except FileNotFoundError:
        return {}

def save_config(config):
    """Save configuration to config.json"""
    with open("config.json", "w") as f:
        json.dump(config, f, indent=2)

def step1_fetch_youtube(channel_url=None, playlist_urls=None):
    """Step 1: Fetch YouTube playlists"""
    print("\n" + "="*60)
    print("STEP 1: Fetching YouTube Playlists")
    print("="*60)
    
    playlists = []
    
    if playlist_urls:
        # Fetch specific playlists
        for url in playlist_urls:
            tracks = get_playlist_tracks(url)
            # Extract playlist name from URL or page
            playlist_name = url.split("list=")[-1].split("&")[0][:30]  # Temporary name
            playlists.append({
                "id": playlist_name,
                "title": f"Playlist_{playlist_name}",
                "tracks": tracks
            })
    elif channel_url:
        print(f"Fetching all playlists from channel: {channel_url}")
        print("⚠️  This requires yt-dlp with cookie access or playlist enumeration")
        # This is more complex - would need to parse channel page
    
    # Save playlists
    with open("youtube_playlists.json", "w") as f:
        json.dump(playlists, f, indent=2)
    
    print(f"✓ Saved {len(playlists)} playlists to youtube_playlists.json")
    return playlists

def step2_scan_plex(plex_url, plex_token):
    """Step 2: Scan Plex library"""
    print("\n" + "="*60)
    print("STEP 2: Scanning Plex Music Library")
    print("="*60)
    
    plex = PlexClient(plex_url, plex_token)
    
    if not plex.test_connection():
        return None
    
    if not plex.get_music_library():
        return None
    
    tracks = plex.get_all_tracks()
    
    with open("plex_tracks.json", "w") as f:
        json.dump(tracks, f, indent=2)
    
    print(f"✓ Saved {len(tracks)} tracks to plex_tracks.json")
    return tracks

def step3_match(youtube_playlists, plex_tracks):
    """Step 3: Match tracks"""
    print("\n" + "="*60)
    print("STEP 3: Matching Tracks")
    print("="*60)
    
    results = match_tracks(youtube_playlists, plex_tracks)
    
    with open("matched_playlists.json", "w") as f:
        json.dump(results, f, indent=2)
    
    return results

def step4_create_playlists(plex_url, plex_token, matched_results, prefix="YT Red"):
    """Step 4: Create playlists in Plex"""
    print("\n" + "="*60)
    print("STEP 4: Creating Playlists in Plex")
    print("="*60)
    
    plex = PlexClient(plex_url, plex_token)
    
    created = []
    for playlist_name, tracks in matched_results.items():
        # Get rating keys for matched tracks
        rating_keys = [t["plex"]["rating_key"] for t in tracks if t["plex"]]
        
        if rating_keys:
            new_name = f"{prefix} - {playlist_name}"
            playlist_id = plex.create_playlist(new_name, rating_keys)
            if playlist_id:
                created.append({
                    "name": new_name,
                    "id": playlist_id,
                    "track_count": len(rating_keys)
                })
    
    print(f"\n✓ Created {len(created)} playlists")
    return created

def main():
    print("🎵 YouTube → Plex Playlist Sync")
    print("=" * 60)
    
    config = load_config()
    
    # Check for required config
    plex_url = config.get("plex_server", "http://10.0.1.99:32400")
    plex_token = config.get("plex_token")
    prefix = config.get("playlist_prefix", "YT Red")
    
    if not plex_token:
        print("\n⚠️  PLEX TOKEN REQUIRED")
        print("   Please provide your Plex token to continue.")
        print("   You can find it in Plex: Settings → Network → Show Advanced")
        return
    
    # Get YouTube source
    channel_url = config.get("youtube_channel_url")
    playlist_urls = config.get("youtube_playlist_urls", [])
    
    if not channel_url and not playlist_urls:
        print("\n⚠️  YOUTUBE SOURCE REQUIRED")
        print("   Please provide either:")
        print("   1. Your YouTube Channel URL (for ALL playlists)")
        print("   2. Specific playlist URLs to copy")
        return
    
    # Run the pipeline
    try:
        # Step 1: YouTube
        if Path("youtube_playlists.json").exists():
            print("\n📁 Found existing youtube_playlists.json")
            with open("youtube_playlists.json", "r") as f:
                youtube_playlists = json.load(f)
        else:
            youtube_playlists = step1_fetch_youtube(channel_url, playlist_urls)
        
        # Step 2: Plex
        if Path("plex_tracks.json").exists():
            print("\n📁 Found existing plex_tracks.json")
            with open("plex_tracks.json", "r") as f:
                plex_tracks = json.load(f)
        else:
            plex_tracks = step2_scan_plex(plex_url, plex_token)
            if not plex_tracks:
                print("\n✗ Failed to scan Plex library. Exiting.")
                return
        
        # Step 3: Match
        if Path("matched_playlists.json").exists():
            print("\n📁 Found existing matched_playlists.json")
            with open("matched_playlists.json", "r") as f:
                matched_results = json.load(f)
        else:
            matched_results = step3_match(youtube_playlists, plex_tracks)
        
        # Step 4: Create playlists
        print("\n⚠️  Ready to create playlists in Plex!")
        print(f"   Playlist naming: '{prefix} - [Original Name]'")
        print(f"   Matched playlists: {len(matched_results)}")
        
        total_matched = sum(
            sum(1 for t in tracks if t["plex"]) 
            for tracks in matched_results.values()
        )
        print(f"   Total matched tracks: {total_matched}")
        
        response = input("\nProceed with creating playlists? (yes/no): ").lower().strip()
        if response in ["yes", "y"]:
            created = step4_create_playlists(plex_url, plex_token, matched_results, prefix)
            print(f"\n✅ Success! Created {len(created)} playlists in Plex.")
        else:
            print("\n⏹️  Cancelled. Playlists were not created.")
            print("   You can review matched_playlists.json and run again.")
        
    except Exception as e:
        print(f"\n✗ Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    main()
