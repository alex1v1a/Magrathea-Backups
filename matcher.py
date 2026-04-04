#!/usr/bin/env python3
"""
Match YouTube tracks to Plex tracks using fuzzy string matching
"""

import json
from difflib import SequenceMatcher
from collections import defaultdict

def normalize_string(s):
    """Normalize a string for better matching"""
    if not s:
        return ""
    # Convert to lowercase, remove common suffixes/prefixes
    s = s.lower().strip()
    # Remove "official", "music video", "audio", "hd", "4k", etc.
    removals = [
        "official", "music video", "audio", "lyrics",
        "hd", "4k", "1080p", "720p", "hq",
        "(", ")", "[", "]", "-", "|", "//"
    ]
    for r in removals:
        s = s.replace(r, " ")
    # Normalize whitespace
    return " ".join(s.split())

def similarity(a, b):
    """Calculate similarity between two strings"""
    return SequenceMatcher(None, normalize_string(a), normalize_string(b)).ratio()

def extract_artist_title(youtube_title, youtube_channel):
    """
    Try to extract artist and title from YouTube video title
    Common formats:
    - "Artist - Title"
    - "Artist — Title"  
    - "Title by Artist"
    - "Artist: Title"
    """
    title = youtube_title or ""
    channel = youtube_channel or ""
    
    # Try "Artist - Title" format
    separators = [" - ", " — ", " – ", " : ", " | ", " // ", " ~ ", " • ", " › ", "by "]
    
    artist = None
    track_title = None
    
    for sep in separators:
        if sep in title:
            if sep == "by ":
                # Format: "Title by Artist"
                parts = title.split(sep)
                if len(parts) >= 2:
                    track_title = parts[0].strip()
                    artist = parts[1].strip().split("(")[0].split("[")[0].strip()
            else:
                parts = title.split(sep, 1)
                if len(parts) == 2:
                    artist = parts[0].strip()
                    track_title = parts[1].strip()
                    break
    
    if not artist:
        # Use channel name as artist
        artist = channel.replace(" - Topic", "").replace("VEVO", "").strip()
    
    if not track_title:
        track_title = title
    
    # Clean up
    artist = artist.split("(")[0].split("[")[0].strip() if artist else ""
    track_title = track_title.split("(")[0].split("[")[0].strip()
    
    return artist, track_title

def match_tracks(youtube_playlists, plex_tracks, min_similarity=0.6):
    """
    Match YouTube tracks to Plex tracks
    Returns: dict of playlist_name -> [(youtube_track, plex_track, score), ...]
    """
    results = {}
    
    # Build index of Plex tracks by normalized artist
    plex_by_artist = defaultdict(list)
    for plex_track in plex_tracks:
        artist = normalize_string(plex_track.get("artist", ""))
        if artist:
            plex_by_artist[artist].append(plex_track)
        # Also add by first word of artist
        first_word = artist.split()[0] if artist else ""
        if first_word and first_word != artist:
            plex_by_artist[first_word].append(plex_track)
    
    total_tracks = sum(len(pl.get("tracks", [])) for pl in youtube_playlists)
    matched_count = 0
    
    for playlist in youtube_playlists:
        playlist_name = playlist.get("title", "Unknown")
        youtube_tracks = playlist.get("tracks", [])
        
        matched_tracks = []
        
        for yt_track in youtube_tracks:
            yt_title = yt_track.get("title", "")
            yt_channel = yt_track.get("channel", "")
            
            # Extract artist and title from YouTube
            yt_artist, yt_track_title = extract_artist_title(yt_title, yt_channel)
            
            best_match = None
            best_score = 0
            
            # Search in Plex tracks
            candidates = []
            
            # Add candidates by artist match
            if yt_artist:
                norm_artist = normalize_string(yt_artist)
                candidates.extend(plex_by_artist.get(norm_artist, []))
                # Also try first word
                if norm_artist.split():
                    candidates.extend(plex_by_artist.get(norm_artist.split()[0], []))
            
            # If no artist candidates, search all tracks (slower but more thorough)
            if not candidates:
                candidates = plex_tracks
            
            # Score each candidate
            for plex_track in candidates:
                plex_title = plex_track.get("title", "")
                plex_artist = plex_track.get("artist", "")
                
                # Calculate title similarity
                title_score = similarity(yt_track_title, plex_title)
                
                # Calculate artist similarity (if both available)
                artist_score = similarity(yt_artist, plex_artist) if yt_artist and plex_artist else 0.5
                
                # Combined score (weighted)
                combined_score = (title_score * 0.7) + (artist_score * 0.3)
                
                if combined_score > best_score and combined_score >= min_similarity:
                    best_score = combined_score
                    best_match = plex_track
            
            if best_match:
                matched_tracks.append({
                    "youtube": yt_track,
                    "plex": best_match,
                    "score": best_score,
                    "extracted_artist": yt_artist,
                    "extracted_title": yt_track_title
                })
                matched_count += 1
            else:
                matched_tracks.append({
                    "youtube": yt_track,
                    "plex": None,
                    "score": 0,
                    "extracted_artist": yt_artist,
                    "extracted_title": yt_track_title
                })
        
        results[playlist_name] = matched_tracks
    
    match_rate = (matched_count / total_tracks * 100) if total_tracks else 0
    print(f"\n📊 Matching Summary:")
    print(f"   Total YouTube tracks: {total_tracks}")
    print(f"   Matched: {matched_count} ({match_rate:.1f}%)")
    
    return results

def main():
    print("🎯 Track Matcher")
    print("=" * 50)
    
    # Load data
    try:
        with open("youtube_playlists.json", "r") as f:
            youtube_playlists = json.load(f)
    except FileNotFoundError:
        print("✗ youtube_playlists.json not found. Run youtube export first.")
        return
    
    try:
        with open("plex_tracks.json", "r") as f:
            plex_tracks = json.load(f)
    except FileNotFoundError:
        print("✗ plex_tracks.json not found. Run plex client first.")
        return
    
    print(f"📥 Loaded {len(youtube_playlists)} YouTube playlists")
    print(f"📥 Loaded {len(plex_tracks)} Plex tracks")
    
    # Perform matching
    results = match_tracks(youtube_playlists, plex_tracks)
    
    # Save results
    with open("matched_playlists.json", "w") as f:
        json.dump(results, f, indent=2)
    
    print("\n✓ Saved matched results to matched_playlists.json")
    
    # Print summary per playlist
    print("\n📋 Playlist Match Summary:")
    for playlist_name, tracks in results.items():
        matched = sum(1 for t in tracks if t["plex"])
        total = len(tracks)
        print(f"   {playlist_name}: {matched}/{total} matched ({matched/total*100:.1f}%)")

if __name__ == "__main__":
    main()
