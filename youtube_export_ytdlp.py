#!/usr/bin/env python3
"""
YouTube Playlist Exporter using yt-dlp
Fetches all YouTube playlists and their tracks (works with cookies)
"""

import json
import subprocess
import sys

def run_yt_dlp(args):
    """Run yt-dlp with given arguments and return JSON output"""
    cmd = ["yt-dlp", "--dump-json", "--flat-playlist"] + args
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=300)
        if result.returncode != 0:
            print(f"yt-dlp stderr: {result.stderr}")
        return result.stdout.strip()
    except subprocess.TimeoutExpired:
        print("✗ yt-dlp timed out")
        return None
    except FileNotFoundError:
        print("✗ yt-dlp not found. Please install: pip install yt-dlp")
        return None

def get_user_playlists():
    """Fetch all playlists for the authenticated user"""
    print("📋 Fetching your YouTube playlists...")
    print("   (This requires yt-dlp to access your YouTube account)")
    print("   Make sure you're logged into YouTube in your browser or use --cookies-from-browser")
    
    # Get playlists from liked videos and uploads to infer user
    # Actually, yt-dlp can get playlists from a channel with: yt-dlp :ytplaylists
    # But that requires knowing the channel URL
    
    print("\n⚠️  To fetch ALL your playlists, I need your YouTube channel URL.")
    print("   Example: https://www.youtube.com/channel/UCxxxxxxxxxxxxxxxxxxx")
    print("   Or: https://www.youtube.com/@YourUsername")
    print("\n   Or you can provide specific playlist URLs to copy.")
    
    return None

def get_playlist_tracks(playlist_url):
    """Fetch all tracks from a specific playlist URL"""
    print(f"🎵 Fetching tracks from: {playlist_url}")
    
    output = run_yt_dlp([playlist_url])
    if not output:
        return []
    
    tracks = []
    for line in output.split('\n'):
        if not line.strip():
            continue
        try:
            data = json.loads(line)
            if data.get("_type") == "url":
                tracks.append({
                    "video_id": data.get("id"),
                    "title": data.get("title", ""),
                    "channel": data.get("uploader", ""),
                    "duration": data.get("duration"),
                    "url": data.get("url")
                })
        except json.JSONDecodeError:
            continue
    
    return tracks

def main():
    print("🎵 YouTube Playlist Exporter (yt-dlp version)")
    print("=" * 50)
    
    # Check if yt-dlp is available
    try:
        result = subprocess.run(["yt-dlp", "--version"], capture_output=True, text=True)
        print(f"✓ yt-dlp version: {result.stdout.strip()}")
    except FileNotFoundError:
        print("✗ yt-dlp not found. Install with: pip install yt-dlp")
        sys.exit(1)
    
    print("\n📋 To proceed, please provide:")
    print("   1. Your YouTube Channel URL (for ALL playlists)")
    print("      OR")
    print("   2. Specific playlist URLs you want to copy")
    print("\n   Channel URL format:")
    print("   - https://www.youtube.com/channel/UCxxxxxxxxxxxx")
    print("   - https://www.youtube.com/@YourUsername")
    print("   - https://www.youtube.com/c/YourChannelName")

if __name__ == "__main__":
    main()
