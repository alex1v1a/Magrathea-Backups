from faster_whisper import WhisperModel

# Load model
model = WhisperModel('base', device='cpu', compute_type='int8')

# Transcribe
segments, info = model.transcribe(
    r'C:\Users\admin\.openclaw\workspace\temp_audio.wav',
    beam_size=5
)

print(f"Language: {info.language} (Probability: {info.language_probability:.2f})")
print()
print('--- TRANSCRIPT ---')
print()

full_text = []
for segment in segments:
    print(segment.text)
    full_text.append(segment.text)

# Save full transcript
with open(r'C:\Users\admin\.openclaw\workspace\temp_transcript.txt', 'w', encoding='utf-8') as f:
    f.write('\n'.join(full_text))

print()
print('Transcript saved to temp_transcript.txt')
