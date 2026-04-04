#!/bin/bash
# With mirrored networking, localhost works from WSL to Windows
curl -s -X POST "http://localhost:18789/hooks/wake" \
  -H "Authorization: Bearer 4256f1ad48767996a440015aae1be25c2c7835523d58f8a4" \
  -H "Content-Type: application/json" \
  -d '{"text": "Test from WSL - Home Assistant integration check", "mode": "now"}'
