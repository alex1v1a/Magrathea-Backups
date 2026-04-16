from faster_whisper import WhisperModel
import os
import json
from datetime import datetime

# Configuration
SOURCE_DIR = r'C:\Users\admin\iCloudDrive\Documents\NJNEER\Alexander\Work\Notes\Memos\RFQ'

# Use large-v3 model for highest accuracy
print("Loading Whisper large-v3 model for highest accuracy...")
model = WhisperModel('large-v3', device='cpu', compute_type='int8')

def transcribe_file(audio_path):
    """Transcribe with highest accuracy settings"""
    filename = os.path.basename(audio_path)
    print(f"\nTranscribing: {filename}")
    print("=" * 60)
    
    # High accuracy settings
    segments, info = model.transcribe(
        audio_path,
        beam_size=10,           # Higher beam size = better accuracy
        best_of=10,             # Consider more candidates
        patience=2.0,           # Allow more time for better results
        condition_on_previous_text=True,
        initial_prompt="This is a technical engineering discussion about automotive parts including knuckles, subframes, and load specifications.",
        word_timestamps=True    # Include word-level timestamps
    )
    
    print(f"Detected language: {info.language} (probability: {info.language_probability:.2f})")
    
    # Build transcript with timestamps
    transcript_lines = []
    full_text_parts = []
    
    for segment in segments:
        timestamp = f"[{segment.start:.2f}s - {segment.end:.2f}s]"
        text = segment.text.strip()
        transcript_lines.append(f"{timestamp} {text}")
        full_text_parts.append(text)
    
    full_transcript = '\n'.join(transcript_lines)
    full_text = ' '.join(full_text_parts)
    
    # Save detailed transcript with timestamps
    base_name = os.path.splitext(filename)[0]
    transcript_path = os.path.join(SOURCE_DIR, f"{base_name}_transcript.txt")
    
    with open(transcript_path, 'w', encoding='utf-8') as f:
        f.write(f"TRANSCRIPT: {filename}\n")
        f.write(f"Generated: {datetime.now().isoformat()}\n")
        f.write(f"Language: {info.language} (confidence: {info.language_probability:.2f})\n")
        f.write(f"Model: Whisper large-v3 (highest accuracy)\n")
        f.write("=" * 60 + "\n\n")
        f.write(full_transcript)
    
    # Save clean text version (no timestamps)
    clean_path = os.path.join(SOURCE_DIR, f"{base_name}_text.txt")
    with open(clean_path, 'w', encoding='utf-8') as f:
        f.write(full_text)
    
    # Save metadata
    metadata = {
        'source_file': filename,
        'transcribed_at': datetime.now().isoformat(),
        'language': info.language,
        'language_probability': info.language_probability,
        'model': 'large-v3',
        'settings': {
            'beam_size': 10,
            'best_of': 10,
            'patience': 2.0,
            'word_timestamps': True
        }
    }
    
    metadata_path = os.path.join(SOURCE_DIR, f"{base_name}_metadata.json")
    with open(metadata_path, 'w', encoding='utf-8') as f:
        json.dump(metadata, f, indent=2)
    
    print(f"Saved: {base_name}_transcript.txt (with timestamps)")
    print(f"Saved: {base_name}_text.txt (clean text)")
    print(f"Saved: {base_name}_metadata.json")
    
    return full_text

def main():
    # Find all WAV files
    wav_files = [f for f in os.listdir(SOURCE_DIR) if f.lower().endswith('.wav')]
    
    if not wav_files:
        print("No WAV files found in RFQ folder.")
        return
    
    print(f"Found {len(wav_files)} WAV file(s) to transcribe:")
    for f in wav_files:
        print(f"  - {f}")
    
    for wav_file in wav_files:
        audio_path = os.path.join(SOURCE_DIR, wav_file)
        try:
            transcribe_file(audio_path)
        except Exception as e:
            print(f"ERROR processing {wav_file}: {e}")
    
    print("\n" + "=" * 60)
    print("All transcriptions complete.")

if __name__ == '__main__':
    main()
