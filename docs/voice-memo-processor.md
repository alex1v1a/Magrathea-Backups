# Voice Memo Processor

Processes voice memos from F:\memo folder using OpenAI Whisper API.

## Structure

Each processed memo creates a folder containing:
- `transcript.txt` - Full verbatim transcript
- `summary.md` - Structured analysis with:
  - High-level summary (2-3 sentences)
  - Detailed notes (bullet points of key thoughts)
  - Meeting minutes (if applicable - action items, decisions, owners)
- `metadata.json` - Recording date, duration, processing info

## Auto-Titling

Folders named based on content analysis:
- Date prefix: YYYY-MM-DD
- Topic extracted from transcript (keywords, named entities)
- Examples: `2026-03-24_Budget_Review`, `2026-03-24_Client_Call_AcmeCorp`

## Storage Management

When F: drive reaches 80% capacity:
1. Identify least important memos (oldest, lowest priority markers)
2. Delete original audio files (keep transcripts/summaries)
3. Preserve structured notes indefinitely

## Usage

Run manually or schedule via cron:
```bash
powershell.exe -File "C:\Users\admin\.openclaw\workspace\scripts\process-voice-memos.ps1"
```
