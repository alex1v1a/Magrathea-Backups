#!/usr/bin/env python3
"""
Export liked songs from YouTube Music and Spotify, extract unique artists.
"""
import json
import os
import sys
from pathlib import Path

OUTPUT_DIR = Path(__file__).parent / "music_export"
OUTPUT_DIR.mkdir(exist_ok=True)

def export_spotify(username: str):
    """Export Spotify liked songs."""
    import spotipy
    from spotipy.oauth2 import SpotifyOAuth
    
    # Using Spotify's example app credentials for testing
    # In production, you'd want your own app
    scope = "user-library-read playlist-read-private"
    
    sp = spotipy.Spotify(auth_manager=SpotifyOAuth(
        client_id=os.environ.get("SPOTIFY_CLIENT_ID"),
        client_secret=os.environ.get("SPOTIFY_CLIENT_SECRET"),
        redirect_uri="http://localhost:8888/callback",
        scope=scope,
        cache_path=str(OUTPUT_DIR / ".spotify_cache"),
        open_browser=True
    ))
    
    print("Fetching Spotify liked songs...")
    songs = []
    results = sp.current_user_saved_tracks(limit=50)
    
    while results:
        for item in results['items']:
            track = item['track']
            songs.append({
                'title': track['name'],
                'artists': [a['name'] for a in track['artists']],
                'album': track['album']['name'],
                'source': 'spotify'
            })
        
        if results['next']:
            results = sp.next(results)
        else:
            break
    
    print(f"Found {len(songs)} Spotify liked songs")
    
    # Also get playlists
    print("Fetching Spotify playlists...")
    playlists = sp.current_user_playlists()
    for playlist in playlists['items']:
        if playlist['owner']['id'] == sp.current_user()['id']:
            print(f"  - {playlist['name']} ({playlist['tracks']['total']} tracks)")
            tracks = sp.playlist_tracks(playlist['id'])
            while tracks:
                for item in tracks['items']:
                    if item['track']:
                        track = item['track']
                        songs.append({
                            'title': track['name'],
                            'artists': [a['name'] for a in track['artists']],
                            'album': track['album']['name'],
                            'source': 'spotify',
                            'playlist': playlist['name']
                        })
                if tracks['next']:
                    tracks = sp.next(tracks)
                else:
                    break
    
    output_file = OUTPUT_DIR / "spotify_songs.json"
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(songs, f, indent=2, ensure_ascii=False)
    
    print(f"Saved to {output_file}")
    return songs


def export_youtube_music():
    """Export YouTube Music liked songs."""
    from ytmusicapi import YTMusic, setup
    
    auth_file = OUTPUT_DIR / "ytmusic_headers.json"
    
    if not auth_file.exists():
        print("YouTube Music browser headers required.")
        print("\nInstructions:")
        print("1. Open https://music.youtube.com in Chrome/Firefox")
        print("2. Make sure you're logged in")
        print("3. Press F12 to open Developer Tools")
        print("4. Go to Network tab")
        print("5. Click on any request (or refresh the page)")
        print("6. Find a request to music.youtube.com")
        print("7. Right-click → Copy → Copy request headers")
        print("8. Paste below and press Enter twice when done:\n")
        setup(filepath=str(auth_file))
    
    yt = YTMusic(str(auth_file))
    
    print("Fetching YouTube Music liked songs...")
    liked = yt.get_liked_songs(limit=None)
    
    songs = []
    for track in liked.get('tracks', []):
        songs.append({
            'title': track.get('title', ''),
            'artists': [a['name'] for a in track.get('artists', [])],
            'album': track.get('album', {}).get('name', '') if track.get('album') else '',
            'source': 'youtube_music'
        })
    
    print(f"Found {len(songs)} YouTube Music liked songs")
    
    # Get library albums
    print("Fetching YouTube Music library albums...")
    try:
        albums = yt.get_library_albums(limit=None)
        for album in albums:
            album_detail = yt.get_album(album['browseId'])
            for track in album_detail.get('tracks', []):
                songs.append({
                    'title': track.get('title', ''),
                    'artists': [a['name'] for a in track.get('artists', [])],
                    'album': album_detail.get('title', ''),
                    'source': 'youtube_music_library'
                })
    except Exception as e:
        print(f"Could not fetch library albums: {e}")
    
    output_file = OUTPUT_DIR / "youtube_music_songs.json"
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(songs, f, indent=2, ensure_ascii=False)
    
    print(f"Saved to {output_file}")
    return songs


def extract_artists(songs: list) -> list:
    """Extract unique artists from songs."""
    artists = set()
    for song in songs:
        for artist in song.get('artists', []):
            if artist and artist.strip():
                # Clean up artist name
                clean = artist.strip()
                if clean.lower() not in ['various artists', 'various', 'unknown']:
                    artists.add(clean)
    
    return sorted(list(artists))


def main():
    if len(sys.argv) < 2:
        print("Usage: python music_export.py [spotify|youtube|artists|all]")
        sys.exit(1)
    
    command = sys.argv[1].lower()
    
    if command == 'spotify':
        export_spotify(sys.argv[2] if len(sys.argv) > 2 else None)
    
    elif command == 'youtube':
        export_youtube_music()
    
    elif command == 'artists':
        # Load existing exports and extract artists
        all_songs = []
        
        spotify_file = OUTPUT_DIR / "spotify_songs.json"
        if spotify_file.exists():
            with open(spotify_file, 'r', encoding='utf-8') as f:
                all_songs.extend(json.load(f))
        
        yt_file = OUTPUT_DIR / "youtube_music_songs.json"
        if yt_file.exists():
            with open(yt_file, 'r', encoding='utf-8') as f:
                all_songs.extend(json.load(f))
        
        if not all_songs:
            print("No song data found. Run 'spotify' and 'youtube' first.")
            sys.exit(1)
        
        artists = extract_artists(all_songs)
        print(f"\nFound {len(artists)} unique artists:")
        
        output_file = OUTPUT_DIR / "artists.json"
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(artists, f, indent=2, ensure_ascii=False)
        
        print(f"Saved to {output_file}")
        
        # Also print first 50
        for artist in artists[:50]:
            print(f"  - {artist}")
        if len(artists) > 50:
            print(f"  ... and {len(artists) - 50} more")
    
    elif command == 'all':
        print("=" * 50)
        print("Step 1: YouTube Music")
        print("=" * 50)
        yt_songs = export_youtube_music()
        
        print("\n" + "=" * 50)
        print("Step 2: Spotify")
        print("=" * 50)
        sp_songs = export_spotify(None)
        
        print("\n" + "=" * 50)
        print("Step 3: Extract Artists")
        print("=" * 50)
        all_songs = yt_songs + sp_songs
        artists = extract_artists(all_songs)
        
        output_file = OUTPUT_DIR / "artists.json"
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(artists, f, indent=2, ensure_ascii=False)
        
        print(f"\nTotal: {len(all_songs)} songs, {len(artists)} unique artists")
        print(f"Saved to {output_file}")


if __name__ == "__main__":
    main()
