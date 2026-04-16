#!/usr/bin/env bash
# Codex CLI Sub-Agent Wrapper for OpenClaw
# DEPRECATED: Use kimi-code-subagent.sh instead (uses $39/m subscription)
# This script now redirects to kimi-code-subagent.sh for cost control

set -e

TASK="$1"
if [ -z "$TASK" ]; then
    echo "Usage: codex-subagent.sh <task-description>"
    echo ""
    echo "⚠️  DEPRECATED: This script now uses Kimi Code by default"
    echo "   (kimi-coding/k2p5 - $39/month unlimited subscription)"
    echo ""
    echo "To use Codex CLI directly, run: codex --quiet --no-confirm '<task>'"
    echo ""
    exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Redirect to Kimi Code wrapper (uses subscription model)
echo "🔄 Redirecting to Kimi Code sub-agent (subscription model)..."
exec "$SCRIPT_DIR/kimi-code-subagent.sh" "$@"
