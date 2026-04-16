from faster_whisper import WhisperModel
import os
from datetime import datetime

# Use base model (already downloaded, faster)
print("Loading Whisper model...")
model = WhisperModel('base', device='cpu', compute_type='int8')

SOURCE_DIR = r'C:\Users\admin\iCloudDrive\Documents\NJNEER\Alexander\Work\Notes\Memos\RFQ'

# Get WAV files
wav_files = [f for f in os.listdir(SOURCE_DIR) if f.lower().endswith('.wav')]
print(f"Found {len(wav_files)} files to transcribe")

for wav_file in wav_files:
    audio_path = os.path.join(SOURCE_DIR, wav_file)
    base_name = os.path.splitext(wav_file)[0]
    
    print(f"\nTranscribing: {wav_file}")
    
    # Transcribe with good accuracy settings
    segments, info = model.transcribe(
        audio_path,
        beam_size=5,
        condition_on_previous_text=True,
        initial_prompt="Technical engineering discussion about automotive parts."
    )
    
    # Collect text
    full_text = ' '.join([segment.text for segment in segments])
    
    # Save transcript
    output_path = os.path.join(SOURCE_DIR, f"{base_name}.txt")
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(f"Source: {wav_file}\n")
        f.write(f"Transcribed: {datetime.now().isoformat()}\n")
        f.write(f"Language: {info.language}\n")
        f.write("=" * 60 + "\n\n")
        f.write(full_text)
    
    print(f"  Saved: {base_name}.txt")

print("\nAll transcriptions complete!")
