#!/usr/bin/env python3
"""Extract unique artists from YouTube Music export and prepare for Lidarr."""
import json
import re
from pathlib import Path

def extract_artists(songs):
    """Extract and clean unique artists from song list."""
    artists = set()
    
    # Skip these
    skip_patterns = [
        'cast', 'dialogue', 'various', 'unknown', 'shuffle all',
        'intro', 'soundtrack', 'original'
    ]
    
    for song in songs:
        artist_str = song.get('artist', '')
        if not artist_str:
            continue
            
        # Skip dialogue entries
        if '(Dialogue)' in song.get('title', ''):
            continue
        
        # Split by common separators: &, ,, feat., with, x
        # But be careful with artist names that contain these
        parts = re.split(r'\s*[&,]\s*|\s+feat\.?\s+|\s+with\s+|\s+x\s+', artist_str, flags=re.IGNORECASE)
        
        for part in parts:
            # Clean up
            cleaned = part.strip()
            # Remove featuring info in parens
            cleaned = re.sub(r'\s*\(feat\..*?\)', '', cleaned, flags=re.IGNORECASE)
            cleaned = cleaned.strip()
            
            if not cleaned:
                continue
                
            # Skip if matches skip patterns
            if any(skip.lower() in cleaned.lower() for skip in skip_patterns):
                continue
            
            # Skip very short names (likely garbage)
            if len(cleaned) < 2:
                continue
                
            artists.add(cleaned)
    
    return sorted(list(artists))


def main():
    # Load YouTube Music data
    yt_file = Path(__file__).parent / "music_export" / "youtube_music_songs.json"
    
    if not yt_file.exists():
        print(f"File not found: {yt_file}")
        return
    
    with open(yt_file, 'r', encoding='utf-8') as f:
        songs = json.load(f)
    
    artists = extract_artists(songs)
    
    print(f"Found {len(artists)} unique artists:\n")
    for i, artist in enumerate(artists, 1):
        print(f"{i:3}. {artist}")
    
    # Save to file
    output_file = Path(__file__).parent / "music_export" / "artists.json"
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(artists, f, indent=2, ensure_ascii=False)
    
    print(f"\nSaved to {output_file}")


if __name__ == "__main__":
    main()
