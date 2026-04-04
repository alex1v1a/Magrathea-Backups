# Sub-Agent Quick Reference

## Spawning a Sub-Agent

```javascript
await sessions_spawn({
  task: "What you want the sub-agent to do",
  label: "optional-identifier",
  model: "kimi-coding/k2p5",
  runTimeoutSeconds: 300,
  cleanup: "delete"
});
```

## Pattern 1: Fan-Out Research

```javascript
const topics = ["A", "B", "C"];
for (const topic of topics) {
  await sessions_spawn({
    task: `Research: ${topic}`,
    label: `research-${topic}`,
    model: "kimi-coding/k2p5"
  });
}
```

## Pattern 2: Map-Reduce

```javascript
const chunks = chunkArray(bigData, 25);
for (const [i, chunk] of chunks.entries()) {
  await sessions_spawn({
    task: `Process: ${JSON.stringify(chunk)}`,
    label: `chunk-${i}`,
    cleanup: "delete"
  });
}
```

## Pattern 3: Pipeline

```javascript
// Stage 1: Research (parallel)
await Promise.all(topics.map(t => sessions_spawn({
  task: `Research: ${t}`,
  label: `s1-${t}`
})));

// Stage 2: Analysis (after research completes)
// Stage 3: Synthesis (final)
```

## Pattern 4: Race

```javascript
const approaches = ["Approach A", "Approach B", "Approach C"];
for (const [i, approach] of approaches.entries()) {
  await sessions_spawn({
    task: `Solve using: ${approach}`,
    label: `race-${i}`,
    runTimeoutSeconds: 120  // Short timeout
  });
}
// Use /subagents list to see winner
```

## Pattern 5: Validation

```javascript
const checks = ["accuracy", "completeness", "clarity"];
for (const check of checks) {
  await sessions_spawn({
    task: `Validate for ${check}: ${output}`,
    label: `val-${check}`,
    cleanup: "delete"
  });
}
```

## Monitoring Commands

```bash
/subagents list          # Show all sub-agents
/subagents info <id>     # Details on specific agent
/subagents log <id>      # View conversation log
/subagents stop <id>     # Stop specific agent
/subagents stop          # Stop all agents
/subagents send <id>     # Send message to agent
```

## Model Selection Guide

| Task Type | Recommended Model | Why |
|-----------|-------------------|-----|
| Research | kimi-coding/k2p5 | Fast, cost-effective |
| Data processing | kimi-coding/k2p5 | Good at structured tasks |
| Code generation | kimi-coding/k2p5 | Strong coding model |
| Final review | openai-codex/gpt-5.2 | Higher quality |
| Creative writing | openai-codex/gpt-5.2 | Better nuance |
| Simple transforms | kimi-coding/k2p5 | Overkill for premium |

## Timeout Guidelines

| Task | Timeout | Notes |
|------|---------|-------|
| Quick lookup | 60s | Simple facts |
| Research | 300s | Multiple sources |
| Code writing | 180s | Functions, scripts |
| Data processing | 600s | Large datasets |
| Content writing | 300s | Articles, docs |
| Complex analysis | 480s | Deep analysis |

## Cost Optimization Tips

1. **Use kimi-coding/k2p5 for sub-agents** (5x cheaper)
2. **Set `cleanup: "delete"`** for temporary work
3. **Set appropriate timeouts** (prevents runaway costs)
4. **Chunk appropriately** (don't spawn for tiny tasks)
5. **Monitor with `/subagents list`** (kill stuck agents)

## Common Pitfalls

❌ **Don't**: Spawn sub-agents for trivial tasks (< 30s work)
✅ **Do**: Use sub-agents for parallelizable work > 60s

❌ **Don't**: Forget to pass context explicitly
✅ **Do**: Include all needed context in the task description

❌ **Don't**: Use expensive models for simple research
✅ **Do**: Match model capability to task complexity

❌ **Don't**: Spawn more than maxConcurrent (8 default)
✅ **Do**: Chunk work to stay within limits

❌ **Don't**: Expect sub-agents to see main conversation
✅ **Do**: Treat each spawn as briefing a new team member
