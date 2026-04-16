#!/usr/bin/env bash
# Kimi Code Sub-Agent Wrapper for OpenClaw
# Usage: kimi-code-subagent.sh <task-description> [working-directory]
# This is the PRIMARY sub-agent for all automated tasks (uses $39/m subscription)

set -e

TASK="$1"
WORKING_DIR="${2:-$(pwd)}"

if [ -z "$TASK" ]; then
    echo "Usage: kimi-code-subagent.sh <task-description> [working-directory]"
    echo ""
    echo "Examples:"
    echo "  kimi-code-subagent.sh 'fix the bug in auth.js'"
    echo "  kimi-code-subagent.sh 'refactor login component' /path/to/project"
    exit 1
fi

# Change to working directory if specified
if [ -n "$WORKING_DIR" ] && [ -d "$WORKING_DIR" ]; then
    cd "$WORKING_DIR"
fi

echo "=== Kimi Code Sub-Agent Starting ==="
echo "Task: $TASK"
echo "Working Dir: $(pwd)"
echo "Model: kimi-coding/k2p5 (subscription - unlimited)"
echo ""

# Method 1: Try OpenClaw ACP runtime with kimi-coding agent
if command -v openclaw &> /dev/null; then
    echo "Using OpenClaw ACP runtime..."
    openclaw spawn --runtime acp --agent kimi-coding --model kimi-coding/k2p5 --task "$TASK" 2>&1 || {
        echo "WARNING: OpenClaw ACP spawn failed, falling back to direct method..."
    }
    if [ $? -eq 0 ]; then
        echo ""
        echo "=== Kimi Code Sub-Agent Complete ==="
        exit 0
    fi
fi

# Method 2: Try Kimi CLI if available
if command -v kimi &> /dev/null; then
    echo "Using Kimi CLI..."
    kimi --model k2p5 --no-interactive "$TASK" 2>&1 || {
        echo "WARNING: Kimi CLI failed"
    }
    if [ $? -eq 0 ]; then
        echo ""
        echo "=== Kimi Code Sub-Agent Complete ==="
        exit 0
    fi
fi

# Method 3: Fallback to Codex CLI if Kimi unavailable
if command -v codex &> /dev/null; then
    echo "Kimi Code unavailable, falling back to Codex CLI..."
    codex --quiet --no-confirm "$TASK" 2>&1 || {
        echo "ERROR: Both Kimi Code and Codex CLI failed"
        exit 1
    }
    echo ""
    echo "=== Codex Sub-Agent Complete (Kimi fallback) ==="
    exit 0
fi

echo "ERROR: No sub-agent runtime available (tried: OpenClaw ACP, Kimi CLI, Codex CLI)"
exit 1
