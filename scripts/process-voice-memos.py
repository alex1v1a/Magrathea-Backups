from faster_whisper import WhisperModel
import json
import os
import re
from datetime import datetime

# Configuration
SOURCE_DIR = r'F:\memo'
OUTPUT_DIR = r'F:\memo\processed'
AUDIO_EXTENSIONS = ['.m4a', '.mp3', '.wav', '.ogg', '.webm', '.mp4', '.mov', '.aac', '.flac']

def get_drive_usage_percent():
    """Get F: drive usage percentage"""
    import shutil
    total, used, free = shutil.disk_usage('F:/')
    return round((used / total) * 100, 2)

def transcribe_audio(audio_path):
    """Transcribe audio using local Whisper model"""
    print(f"Loading Whisper model...")
    model = WhisperModel('base', device='cpu', compute_type='int8')
    
    print(f"Transcribing: {os.path.basename(audio_path)}")
    segments, info = model.transcribe(audio_path, beam_size=5)
    
    transcript_parts = []
    for segment in segments:
        transcript_parts.append(segment.text)
    
    return ' '.join(transcript_parts), info.language

def generate_summary_local(transcript):
    """Generate a simple local summary without API calls"""
    # Extract key topics/keywords
    words = transcript.lower().split()
    
    # Simple keyword extraction
    important_words = []
    skip_words = {'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'shall', 'can', 'need', 'dare', 'ought', 'used', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them', 'my', 'your', 'his', 'her', 'its', 'our', 'their', 'this', 'that', 'these', 'those'}
    
    word_freq = {}
    for word in words:
        word = re.sub(r'[^\w]', '', word)
        if len(word) > 3 and word not in skip_words:
            word_freq[word] = word_freq.get(word, 0) + 1
    
    # Get top keywords
    top_keywords = sorted(word_freq.items(), key=lambda x: x[1], reverse=True)[:5]
    keywords = [k[0] for k in top_keywords]
    
    # Generate title from keywords
    title = '_'.join(keywords[:3]).title() if keywords else "Voice_Memo"
    
    # Simple sentence extraction for summary
    sentences = transcript.split('.')
    high_level = sentences[0].strip() if sentences else transcript[:200]
    
    # Create detailed notes (bullet points from sentences)
    detailed_notes = []
    for sent in sentences[:5]:
        sent = sent.strip()
        if len(sent) > 10:
            detailed_notes.append(f"- {sent}")
    
    # Check if it looks like a meeting
    meeting_indicators = ['meeting', 'discuss', 'decided', 'action', 'task', 'follow up', 'next steps', 'agenda']
    is_meeting = any(ind in transcript.lower() for ind in meeting_indicators)
    
    if is_meeting:
        meeting_minutes = "### Meeting Notes\n- Discussion recorded\n- Action items to be extracted from transcript"
    else:
        meeting_minutes = "N/A - Not a formal meeting"
    
    return {
        'title': title,
        'high_level_summary': high_level,
        'detailed_notes': '\n'.join(detailed_notes),
        'meeting_minutes': meeting_minutes,
        'keywords': keywords,
        'priority': 'Medium'
    }

def get_safe_folder_name(name, date):
    """Create safe folder name"""
    date_prefix = date.strftime('%Y-%m-%d')
    clean_name = re.sub(r'[<>:"/\\|?*]', '_', name)
    clean_name = re.sub(r'\.+', '.', clean_name)
    clean_name = clean_name.strip('_. ')
    
    if len(clean_name) > 50:
        clean_name = clean_name[:50]
    
    return f"{date_prefix}_{clean_name}"

def process_memo(audio_path):
    """Process a single voice memo"""
    print(f"\n{'='*60}")
    print(f"Processing: {os.path.basename(audio_path)}")
    print(f"{'='*60}")
    
    # Get file info
    file_stat = os.stat(audio_path)
    recorded_date = datetime.fromtimestamp(file_stat.st_mtime)
    
    # Transcribe
    transcript, language = transcribe_audio(audio_path)
    
    # Generate summary
    summary = generate_summary_local(transcript)
    
    # Create folder
    folder_name = get_safe_folder_name(summary['title'], recorded_date)
    folder_path = os.path.join(OUTPUT_DIR, folder_name)
    
    # Handle duplicates
    counter = 1
    original_name = folder_name
    while os.path.exists(folder_path):
        folder_name = f"{original_name}_({counter})"
        folder_path = os.path.join(OUTPUT_DIR, folder_name)
        counter += 1
    
    os.makedirs(folder_path, exist_ok=True)
    
    # Create audio subdirectory and move file
    audio_dir = os.path.join(folder_path, 'original_audio')
    os.makedirs(audio_dir, exist_ok=True)
    
    audio_filename = os.path.basename(audio_path)
    new_audio_path = os.path.join(audio_dir, audio_filename)
    os.rename(audio_path, new_audio_path)
    
    # Save transcript
    transcript_path = os.path.join(folder_path, 'transcript.txt')
    with open(transcript_path, 'w', encoding='utf-8') as f:
        f.write(transcript)
    
    # Save summary markdown
    duration_min = round(file_stat.st_size / (16000 * 60), 1)  # Rough estimate
    
    summary_md = f"""# {summary['title'].replace('_', ' ')}

**Date:** {recorded_date.strftime('%Y-%m-%d %H:%M')}  
**Duration:** ~{duration_min} minutes (estimated)  
**Language:** {language}  
**Priority:** {summary['priority']}

## High-Level Summary

{summary['high_level_summary']}

## Detailed Notes

{summary['detailed_notes']}

## Meeting Minutes

{summary['meeting_minutes']}

## Keywords

{', '.join(summary['keywords'])}

---
*Processed: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}*
"""
    
    summary_path = os.path.join(folder_path, 'summary.md')
    with open(summary_path, 'w', encoding='utf-8') as f:
        f.write(summary_md)
    
    # Save metadata
    metadata = {
        'original_file_name': audio_filename,
        'recorded_date': recorded_date.isoformat(),
        'processed_date': datetime.now().isoformat(),
        'file_size': file_stat.st_size,
        'language': language,
        'priority': summary['priority'],
        'title': summary['title'],
        'keywords': summary['keywords']
    }
    
    metadata_path = os.path.join(folder_path, 'metadata.json')
    with open(metadata_path, 'w', encoding='utf-8') as f:
        json.dump(metadata, f, indent=2)
    
    print(f"\nCreated folder: {folder_name}")
    print(f"Title: {summary['title']}")
    print(f"Priority: {summary['priority']}")
    print(f"Keywords: {', '.join(summary['keywords'])}")
    
    return folder_path

def manage_storage():
    """Clean up audio files when storage is high"""
    usage = get_drive_usage_percent()
    print(f"\nF: drive usage: {usage}%")
    
    if usage < 80:
        return
    
    print(f"Storage threshold (80%) exceeded. Cleaning up...")
    
    # Find folders with audio to clean
    folders_to_clean = []
    for folder in os.listdir(OUTPUT_DIR):
        folder_path = os.path.join(OUTPUT_DIR, folder)
        if os.path.isdir(folder_path):
            audio_dir = os.path.join(folder_path, 'original_audio')
            metadata_path = os.path.join(folder_path, 'metadata.json')
            
            if os.path.exists(audio_dir) and os.path.exists(metadata_path):
                with open(metadata_path, 'r') as f:
                    metadata = json.load(f)
                
                audio_size = sum(os.path.getsize(os.path.join(audio_dir, f)) 
                               for f in os.listdir(audio_dir) 
                               if os.path.isfile(os.path.join(audio_dir, f)))
                
                folders_to_clean.append({
                    'folder': folder,
                    'priority': metadata.get('priority', 'Medium'),
                    'date': metadata.get('processed_date', ''),
                    'size': audio_size
                })
    
    # Sort by priority (Low first) then date
    priority_order = {'Low': 3, 'Medium': 2, 'High': 1}
    folders_to_clean.sort(key=lambda x: (priority_order.get(x['priority'], 2), x['date']))
    
    # Remove audio until we free enough space
    freed = 0
    target = 5 * 1024 * 1024 * 1024  # 5GB
    
    for item in folders_to_clean:
        if freed >= target:
            break
        
        audio_dir = os.path.join(OUTPUT_DIR, item['folder'], 'original_audio')
        if os.path.exists(audio_dir):
            size = item['size']
            import shutil
            shutil.rmtree(audio_dir)
            freed += size
            print(f"  Removed audio from: {item['folder']} (freed {size/1024/1024:.1f} MB)")
    
    print(f"Freed total: {freed/1024/1024:.1f} MB")

def main():
    """Main processing loop"""
    print("Voice Memo Processor")
    print(f"Source: {SOURCE_DIR}")
    print(f"Output: {OUTPUT_DIR}")
    
    # Ensure directories exist
    os.makedirs(SOURCE_DIR, exist_ok=True)
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    
    # Check storage
    manage_storage()
    
    # Find audio files
    audio_files = []
    for f in os.listdir(SOURCE_DIR):
        ext = os.path.splitext(f)[1].lower()
        if ext in AUDIO_EXTENSIONS:
            audio_files.append(os.path.join(SOURCE_DIR, f))
    
    if not audio_files:
        print("\nNo new audio files to process.")
        return
    
    print(f"\nFound {len(audio_files)} audio file(s) to process.")
    
    for audio_path in audio_files:
        try:
            process_memo(audio_path)
        except Exception as e:
            print(f"Error processing {audio_path}: {e}")
    
    print(f"\n{'='*60}")
    print("Processing complete.")
    print(f"F: drive usage: {get_drive_usage_percent()}%")

if __name__ == '__main__':
    main()
