#!/usr/bin/env python3
"""
Plex Music Library Scanner and Playlist Creator
"""

import json
import requests
import sys
from urllib.parse import quote

class PlexClient:
    def __init__(self, base_url, token):
        self.base_url = base_url.rstrip('/')
        self.token = token
        self.headers = {
            "X-Plex-Token": token,
            "Accept": "application/json"
        }
        self.music_library = None
    
    def test_connection(self):
        """Test connection to Plex server"""
        try:
            response = requests.get(
                f"{self.base_url}/identity",
                headers=self.headers,
                timeout=10
            )
            if response.status_code == 200:
                data = response.json()
                print(f"✓ Connected to Plex Server: {data.get('MediaContainer', {}).get('friendlyName', 'Unknown')}")
                return True
            else:
                print(f"✗ Connection failed: HTTP {response.status_code}")
                return False
        except requests.exceptions.RequestException as e:
            print(f"✗ Connection error: {e}")
            return False
    
    def get_music_library(self):
        """Find the music library"""
        try:
            response = requests.get(
                f"{self.base_url}/library/sections",
                headers=self.headers,
                timeout=10
            )
            data = response.json()
            
            for section in data.get("MediaContainer", {}).get("Directory", []):
                if section.get("type") == "artist":  # Music library type
                    self.music_library = section
                    print(f"✓ Found Music Library: {section['title']} (ID: {section['key']})")
                    return section
            
            print("✗ No music library found!")
            return None
        except Exception as e:
            print(f"✗ Error fetching libraries: {e}")
            return None
    
    def get_all_tracks(self):
        """Get all tracks from the music library"""
        if not self.music_library:
            return []
        
        print("📚 Scanning music library (this may take a moment)...")
        
        try:
            library_key = self.music_library["key"]
            response = requests.get(
                f"{self.base_url}/library/sections/{library_key}/all",
                headers=self.headers,
                timeout=60
            )
            data = response.json()
            
            tracks = []
            # The response might be organized by artist/album/track
            # We need to fetch tracks specifically
            
            # Get all tracks from the library
            track_response = requests.get(
                f"{self.base_url}/library/sections/{library_key}/all?type=10",  # type 10 = tracks
                headers=self.headers,
                timeout=120
            )
            track_data = track_response.json()
            
            for track in track_data.get("MediaContainer", {}).get("Metadata", []):
                tracks.append({
                    "rating_key": track.get("ratingKey"),
                    "title": track.get("title", ""),
                    "artist": track.get("originalTitle") or track.get("grandparentTitle", ""),
                    "album": track.get("parentTitle", ""),
                    "track_number": track.get("index"),
                    "duration": track.get("duration"),
                    "file_path": track.get("Media", [{}])[0].get("Part", [{}])[0].get("file", "")
                })
            
            print(f"✓ Found {len(tracks)} tracks in library")
            return tracks
            
        except Exception as e:
            print(f"✗ Error fetching tracks: {e}")
            return []
    
    def create_playlist(self, name, track_rating_keys):
        """Create a playlist with the given tracks"""
        if not track_rating_keys:
            print(f"⚠️  Skipping '{name}' - no tracks to add")
            return None
        
        try:
            # First create the playlist
            params = {
                "type": "audio",
                "title": name,
                "smart": "0",
                "X-Plex-Token": self.token
            }
            
            response = requests.post(
                f"{self.base_url}/playlists",
                params=params,
                headers=self.headers,
                timeout=30
            )
            
            if response.status_code not in [200, 201]:
                print(f"✗ Failed to create playlist '{name}': HTTP {response.status_code}")
                return None
            
            # Get the playlist ID from response
            playlist_data = response.json()
            playlist_id = playlist_data.get("MediaContainer", {}).get("Metadata", [{}])[0].get("ratingKey")
            
            # Add tracks to the playlist
            items_param = ",".join(str(key) for key in track_rating_keys)
            add_response = requests.put(
                f"{self.base_url}/playlists/{playlist_id}/items",
                params={"uri": f"library://{items_param}", "X-Plex-Token": self.token},
                headers=self.headers,
                timeout=30
            )
            
            if add_response.status_code in [200, 201]:
                print(f"✓ Created playlist '{name}' with {len(track_rating_keys)} tracks")
                return playlist_id
            else:
                print(f"⚠️  Created playlist but failed to add all tracks: HTTP {add_response.status_code}")
                return playlist_id
                
        except Exception as e:
            print(f"✗ Error creating playlist '{name}': {e}")
            return None
    
    def list_existing_playlists(self):
        """List existing playlists"""
        try:
            response = requests.get(
                f"{self.base_url}/playlists",
                headers=self.headers,
                timeout=10
            )
            data = response.json()
            
            playlists = []
            for playlist in data.get("MediaContainer", {}).get("Metadata", []):
                if playlist.get("playlistType") == "audio":
                    playlists.append({
                        "id": playlist.get("ratingKey"),
                        "title": playlist.get("title"),
                        "item_count": playlist.get("leafCount", 0)
                    })
            
            return playlists
        except Exception as e:
            print(f"✗ Error listing playlists: {e}")
            return []

def main():
    print("🎧 Plex Music Library Client")
    print("=" * 50)
    
    # Configuration
    PLEX_URL = "http://10.0.1.99:32400"
    PLEX_TOKEN = None  # Will be loaded from config or user input
    
    # Try to load token from config
    try:
        with open("config.json", "r") as f:
            config = json.load(f)
            PLEX_TOKEN = config.get("plex_token")
    except FileNotFoundError:
        pass
    
    if not PLEX_TOKEN:
        print("⚠️  Plex token not found in config.json")
        print("   Please add it to config.json or update this script")
        return
    
    # Initialize client
    plex = PlexClient(PLEX_URL, PLEX_TOKEN)
    
    # Test connection
    if not plex.test_connection():
        sys.exit(1)
    
    # Get music library
    if not plex.get_music_library():
        sys.exit(1)
    
    # Get all tracks
    tracks = plex.get_all_tracks()
    
    # Save tracks to file for matching
    with open("plex_tracks.json", "w") as f:
        json.dump(tracks, f, indent=2)
    
    print(f"✓ Saved {len(tracks)} tracks to plex_tracks.json")
    
    # Show existing playlists
    playlists = plex.list_existing_playlists()
    print(f"\n📋 Existing playlists: {len(playlists)}")
    for pl in playlists[:10]:  # Show first 10
        print(f"   - {pl['title']} ({pl['item_count']} tracks)")

if __name__ == "__main__":
    main()
