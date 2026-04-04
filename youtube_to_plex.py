#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
YouTube to Plex Playlist Sync - Optimized
"""

import requests
import re
import sys
from collections import defaultdict
from difflib import SequenceMatcher

# ============ CONFIGURATION ============
YOUTUBE_API_KEY = "AIzaSyANW0BGJMf3PQLWUVHOi04aVGe6k4K56pE"
PLEX_URL = "http://10.0.1.99:32400"
PLEX_TOKEN = "dJ1YCVmoHytpF_7MNxEi"
PLAYLIST_PREFIX = "YT Red - "
# =======================================

def log(msg):
    print(msg)
    sys.stdout.flush()

def clean_string(s):
    if not s:
        return ""
    s = re.sub(r'\([^)]*\)', '', s)
    s = re.sub(r'\[[^\]]*\]', '', s)
    s = re.sub(r'[^\w\s]', '', s.lower())
    return ' '.join(s.split()).strip()

def first_word(s):
    """Get first word for indexing."""
    words = clean_string(s).split()
    return words[0] if words else ""

def quick_similarity(a, b):
    """Fast string similarity."""
    a, b = clean_string(a), clean_string(b)
    if a == b:
        return 1.0
    if not a or not b:
        return 0.0
    # Quick check - if first words don't match at all, low similarity
    if first_word(a) != first_word(b):
        # Still check if they're close
        return 0.0
    return SequenceMatcher(None, a, b).quick_ratio()

def youtube_get(endpoint, params):
    params['key'] = YOUTUBE_API_KEY
    url = f"https://www.googleapis.com/youtube/v3/{endpoint}"
    resp = requests.get(url, params=params, timeout=30)
    resp.raise_for_status()
    return resp.json()

def plex_get(endpoint, params=None):
    url = f"{PLEX_URL}{endpoint}"
    p = params.copy() if params else {}
    p['X-Plex-Token'] = PLEX_TOKEN
    headers = {"Accept": "application/json"}
    resp = requests.get(url, params=p, headers=headers, timeout=60)
    resp.raise_for_status()
    try:
        return resp.json()
    except:
        return {}

def plex_post(endpoint, params=None):
    url = f"{PLEX_URL}{endpoint}"
    p = params.copy() if params else {}
    p['X-Plex-Token'] = PLEX_TOKEN
    headers = {"Accept": "application/json"}
    return requests.post(url, params=p, headers=headers, timeout=30)

def get_youtube_playlists():
    """Get popular music playlists."""
    all_playlists = []
    seen_ids = set()
    
    known_ids = [
        "PL4fGSI1pDJn6OlsJ5H77Y0lV4k7OAyMhX",
        "PL4fGSI1pDJn5aDM4j4O0SH4k5EJkJPQ1J",
        "PL4fGSI1pDJn7BPgh02mj5X8U3PzhlzwLr",
        "PL4fGSI1pDJn7G4jHjRjF9F-JM9Q9yLQ1Y",
        "PL4fGSI1pDJn6DTZB7IazCUXZgL12QqB7L",
        "PL4fGSI1pDJn5jjZ1DlhcaqxrXqZH7Mf9j",
        "PL4fGSI1pDJn4vyP3xD0zhxuFHX1K0X2eT",
        "PL4fGSI1pDJn5Jl8E1WqC8fXsXieKxGtCb",
    ]
    
    for pl_id in known_ids:
        try:
            data = youtube_get("playlists", {"part": "snippet,contentDetails", "id": pl_id})
            if data.get('items'):
                all_playlists.append(data['items'][0])
                seen_ids.add(pl_id)
        except:
            pass
    
    searches = ["top 50", "viral hits"]
    for query in searches:
        try:
            data = youtube_get("search", {"part": "snippet", "type": "playlist", "q": query, "maxResults": 5})
            for item in data.get('items', []):
                pl_id = item.get('id', {}).get('playlistId')
                if pl_id and pl_id not in seen_ids:
                    seen_ids.add(pl_id)
                    details = youtube_get("playlists", {"part": "snippet,contentDetails", "id": pl_id})
                    if details.get('items'):
                        all_playlists.append(details['items'][0])
        except:
            pass
    
    return all_playlists

def get_playlist_tracks(playlist_id):
    """Get all tracks from a YouTube playlist."""
    tracks = []
    next_page = None
    
    while len(tracks) < 200:
        params = {"part": "snippet,contentDetails", "playlistId": playlist_id, "maxResults": 50}
        if next_page:
            params['pageToken'] = next_page
        
        try:
            data = youtube_get("playlistItems", params)
            
            for item in data.get('items', []):
                snippet = item.get('snippet', {})
                title = snippet.get('title', '')
                
                if title in ['Deleted video', 'Private video', '']:
                    continue
                
                artist = "Unknown"
                track_title = title
                for sep in [' - ', ' -', ' – ', ' | ', '– ']:
                    if sep in title:
                        parts = title.split(sep, 1)
                        artist = parts[0].strip()
                        track_title = parts[1].strip()
                        break
                
                tracks.append({
                    'title': track_title,
                    'artist': artist,
                    'full_title': title,
                    'first_word': first_word(track_title)
                })
            
            next_page = data.get('nextPageToken')
            if not next_page:
                break
        except:
            break
    
    return tracks

def get_plex_music_library():
    data = plex_get("/library/sections")
    directories = data.get('MediaContainer', {}).get('Directory', [])
    if not isinstance(directories, list):
        directories = [directories]
    for lib in directories:
        if lib.get('type') == 'artist':
            return lib
    return None

def get_plex_tracks_indexed(library_key):
    """Get Plex tracks indexed by first word for fast lookup."""
    log("  Fetching tracks from Plex...")
    data = plex_get(f"/library/sections/{library_key}/all", {"type": "10"})
    metadata = data.get('MediaContainer', {}).get('Metadata', [])
    
    if not isinstance(metadata, list):
        metadata = [metadata]
    
    tracks = []
    index = defaultdict(list)
    
    for track in metadata:
        if isinstance(track, dict):
            t = {
                'title': track.get('title', ''),
                'artist': track.get('originalTitle') or track.get('grandparentTitle', ''),
                'rating_key': track.get('ratingKey')
            }
            t['clean_title'] = clean_string(t['title'])
            t['first_word'] = first_word(t['title'])
            tracks.append(t)
            index[t['first_word']].append(t)
    
    return tracks, index

def match_tracks_fast(youtube_tracks, plex_tracks, plex_index):
    """Match YouTube tracks to Plex tracks using indexed lookup."""
    matched_keys = []
    
    for yt in youtube_tracks:
        candidates = plex_index.get(yt['first_word'], [])
        
        if not candidates:
            # Try without first word matching - check a sample
            candidates = plex_tracks[:1000]  # Limit fallback
        
        best_match = None
        best_score = 0
        
        yt_clean = clean_string(yt['title'])
        yt_artist = clean_string(yt['artist'])
        
        for pt in candidates:
            title_sim = quick_similarity(yt['title'], pt['title'])
            
            if title_sim < 0.5:
                continue
            
            # Detailed comparison for candidates
            detailed_sim = SequenceMatcher(None, yt_clean, pt['clean_title']).ratio()
            
            artist_sim = 0
            if yt_artist and yt_artist != "unknown":
                artist_sim = SequenceMatcher(None, yt_artist, clean_string(pt['artist'])).ratio()
            
            combined = (detailed_sim * 0.7) + (artist_sim * 0.3)
            
            if combined > best_score and combined > 0.6:
                best_score = combined
                best_match = pt
        
        if best_match:
            matched_keys.append(best_match['rating_key'])
    
    return matched_keys

def create_plex_playlist(name, track_keys):
    if not track_keys:
        return False
    
    try:
        resp = plex_post("/playlists", {"type": "audio", "title": name, "uri": f"library://{track_keys[0]}"})
        if resp.status_code not in [200, 201]:
            return False
        
        data = resp.json() if resp.text else {}
        pl_id = data.get('MediaContainer', {}).get('Metadata', [{}])[0].get('ratingKey')
        
        for key in track_keys[1:100]:  # Limit to 100 tracks per playlist for speed
            plex_post(f"/playlists/{pl_id}/items", {"uri": f"library://{key}"})
        
        return True
    except:
        return False

def get_existing_playlists():
    try:
        data = plex_get("/playlists")
        playlists = data.get('MediaContainer', {}).get('Metadata', [])
        if not isinstance(playlists, list):
            playlists = [playlists]
        return {p.get('title'): p.get('ratingKey') for p in playlists if isinstance(p, dict)}
    except:
        return {}

def delete_playlist(rating_key):
    try:
        url = f"{PLEX_URL}/playlists/{rating_key}"
        requests.delete(url, params={"X-Plex-Token": PLEX_TOKEN}, timeout=10)
    except:
        pass

def main():
    log("=" * 60)
    log("YouTube to Plex Playlist Sync")
    log("=" * 60)
    
    # Test connections
    log("\n[1/4] Testing connections...")
    try:
        youtube_get("videos", {"part": "id", "chart": "mostPopular", "maxResults": 1})
        log("  [OK] YouTube API")
    except Exception as e:
        log(f"  [FAIL] YouTube: {e}")
        return
    
    try:
        plex_get("/")
        log("  [OK] Plex server")
    except Exception as e:
        log(f"  [FAIL] Plex: {e}")
        return
    
    # Get YouTube playlists
    log("\n[2/4] Fetching YouTube playlists...")
    yt_playlists = get_youtube_playlists()
    log(f"  Found {len(yt_playlists)} playlists")
    
    if not yt_playlists:
        log("  No playlists found!")
        return
    
    for pl in yt_playlists[:5]:  # Show first 5
        title = pl.get('snippet', {}).get('title', 'Unknown')
        count = pl.get('contentDetails', {}).get('itemCount', 0)
        safe = title.encode('ascii', 'ignore').decode('ascii')[:50]
        log(f"    - {safe} ({count} items)")
    if len(yt_playlists) > 5:
        log(f"    ... and {len(yt_playlists)-5} more")
    
    # Get Plex library
    log("\n[3/4] Scanning Plex music library...")
    music_lib = get_plex_music_library()
    if not music_lib:
        log("  No music library found!")
        return
    
    log(f"  Library: {music_lib.get('title')}")
    plex_tracks, plex_index = get_plex_tracks_indexed(music_lib['key'])
    log(f"  Tracks: {len(plex_tracks)}")
    
    existing = get_existing_playlists()
    yt_existing = {k: v for k, v in existing.items() if k.startswith(PLAYLIST_PREFIX)}
    log(f"  Existing YT Red playlists: {len(yt_existing)}")
    
    # Process playlists
    log("\n[4/4] Syncing playlists...")
    results = []
    
    for i, pl in enumerate(yt_playlists, 1):
        pl_id = pl.get('id')
        pl_title = pl.get('snippet', {}).get('title', 'Unknown')
        new_title = f"{PLAYLIST_PREFIX}{pl_title}"
        
        safe_title = pl_title.encode('ascii', 'ignore').decode('ascii')[:45]
        log(f"\n  [{i}/{len(yt_playlists)}] {safe_title}")
        
        # Get YouTube tracks
        yt_tracks = get_playlist_tracks(pl_id)
        log(f"    YouTube tracks: {len(yt_tracks)}")
        
        if not yt_tracks:
            results.append({'name': pl_title, 'created': False, 'reason': 'No tracks'})
            continue
        
        # Match to Plex
        matched = match_tracks_fast(yt_tracks, plex_tracks, plex_index)
        match_rate = len(matched) / len(yt_tracks) * 100 if yt_tracks else 0
        log(f"    Matched: {len(matched)}/{len(yt_tracks)} ({match_rate:.1f}%)")
        
        if matched:
            if new_title in existing:
                delete_playlist(existing[new_title])
            
            success = create_plex_playlist(new_title, matched)
            status = "[OK] Created" if success else "[FAIL] Error"
            log(f"    {status}")
            
            results.append({
                'name': pl_title,
                'plex_name': new_title,
                'total': len(yt_tracks),
                'matched': len(matched),
                'match_rate': match_rate,
                'created': success
            })
        else:
            results.append({'name': pl_title, 'created': False, 'reason': 'No matches'})
            log(f"    [SKIP] No matches")
    
    # Summary
    log("\n" + "=" * 60)
    log("SYNC SUMMARY")
    log("=" * 60)
    
    created = sum(1 for r in results if r.get('created'))
    total_yt = sum(r.get('total', 0) for r in results if r.get('created'))
    total_matched = sum(r.get('matched', 0) for r in results if r.get('created'))
    
    log(f"\nPlaylists created: {created}/{len(results)}")
    if total_yt > 0:
        log(f"Overall match rate: {total_matched}/{total_yt} ({total_matched/total_yt*100:.1f}%)")
    
    log("\nDetails:")
    log("-" * 60)
    for r in results:
        safe_name = r['name'].encode('ascii', 'ignore').decode('ascii')[:40]
        if r.get('created'):
            log(f"  [OK] YT Red - {safe_name}")
            log(f"       {r['matched']}/{r['total']} tracks ({r['match_rate']:.1f}%)")
        else:
            log(f"  [ERR] {safe_name}: {r.get('reason', 'Failed')}")
    
    log("=" * 60)

if __name__ == "__main__":
    main()
