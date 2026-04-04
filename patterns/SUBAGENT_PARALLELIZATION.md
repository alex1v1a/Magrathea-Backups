# Sub-Agent Parallelization Patterns for OpenClaw

A comprehensive guide to spawning, coordinating, and optimizing parallel agent workflows.

---

## Table of Contents

1. [Core Concepts](#core-concepts)
2. [Pattern 1: Fan-Out Research](#pattern-1-fan-out-research)
3. [Pattern 2: Map-Reduce Processing](#pattern-2-map-reduce-processing)
4. [Pattern 3: Pipeline Orchestration](#pattern-3-pipeline-orchestration)
5. [Pattern 4: Race & Winner-Takes-All](#pattern-4-race--winner-takes-all)
6. [Pattern 5: Parallel Validation](#pattern-5-parallel-validation)
7. [Configuration Best Practices](#configuration-best-practices)
8. [Cost Optimization](#cost-optimization)

---

## Core Concepts

### How OpenClaw Sub-Agents Work

- **Isolation**: Each sub-agent runs in its own session (`agent:<agentId>:subagent:<uuid>`)
- **Non-blocking**: `sessions_spawn()` returns immediately with `{ status: "accepted", runId, childSessionKey }`
- **Announcement**: Sub-agents report back via automatic announce step
- **No nesting**: Sub-agents cannot spawn sub-agents (prevents runaway recursion)
- **Default concurrency**: 8 sub-agents max (configurable via `agents.defaults.subagents.maxConcurrent`)

### Key Limitations to Remember

1. **No nested fan-out** — Only main agent can spawn sub-agents
2. **Isolated context** — Must explicitly pass all needed context
3. **Best-effort announce** — Results may be lost if gateway restarts
4. **Shared resources** — All sub-agents run in same gateway process

---

## Pattern 1: Fan-Out Research

**Use Case**: Researching multiple topics simultaneously (competitors, products, topics)

**How it works**:
```
Main Agent
├── Spawn Sub-Agent A → Research Topic A
├── Spawn Sub-Agent B → Research Topic B
├── Spawn Sub-Agent C → Research Topic C
└── Spawn Sub-Agent D → Research Topic D
      ↓ (all complete independently)
Results A, B, C, D announced back to main channel
```

**Latency Reduction**: ~4x faster than sequential research

### Example: Competitive Analysis

```javascript
// In your main agent session
const competitors = ["Apple", "Google", "Microsoft", "Amazon"];

// Spawn parallel research tasks
for (const competitor of competitors) {
  await sessions_spawn({
    task: `Research ${competitor}'s latest product announcements from the past 6 months. 
           Focus on: 1) New products launched, 2) Pricing strategy, 3) Target markets.
           Return a structured summary with key findings.`,
    label: `research-${competitor.toLowerCase()}`,
    model: "kimi-coding/k2p5",  // Cheaper model for research
    runTimeoutSeconds: 300      // 5 min timeout
  });
}

// Main agent continues immediately while research runs in background
console.log("Research tasks spawned, continuing with other work...");
```

### Results Aggregation Strategy

Sub-agents announce results back to the channel. To coordinate:

1. **Wait-and-synthesize**: Main agent waits for all results, then synthesizes
2. **Progressive synthesis**: Process results as they arrive
3. **Tagged collection**: Use labels to identify related results

---

## Pattern 2: Map-Reduce Processing

**Use Case**: Processing large datasets by splitting work across sub-agents

**How it works**:
```
Main Agent (Split Phase)
├── Data Chunk 1 → Sub-Agent 1 → Partial Result 1
├── Data Chunk 2 → Sub-Agent 2 → Partial Result 2
├── Data Chunk 3 → Sub-Agent 3 → Partial Result 3
└── Data Chunk 4 → Sub-Agent 4 → Partial Result 4
      ↓ (all partial results announced back)
Main Agent (Reduce Phase) → Final Aggregated Result
```

**Best for**: Large file processing, batch data analysis, content generation at scale

### Example: Batch Document Processing

```javascript
// Split large task into chunks
const documents = await read("large-dataset.json");
const chunks = chunkArray(documents, 25); // 25 docs per sub-agent

// Map phase: Process chunks in parallel
const spawned = chunks.map((chunk, index) => 
  sessions_spawn({
    task: `Process these ${chunk.length} documents and extract:
         - Key entities mentioned
         - Sentiment classification
         - Action items
         
         Documents: ${JSON.stringify(chunk)}`,
    label: `process-chunk-${index}`,
    model: "kimi-coding/k2p5",
    cleanup: "delete"  // Auto-cleanup after announce
  })
);

// Reduce phase: Wait for announcements, then aggregate
// (Results come back via announce - main agent synthesizes)
```

### Chunking Strategy

| Total Items | Chunk Size | Sub-Agents | Est. Time* |
|-------------|------------|------------|------------|
| 100 | 25 | 4 | ~1x |
| 500 | 50 | 10 | ~1x |
| 1000 | 100 | 10 | ~2x |
| 5000 | 100 | 10 | ~10x |

*Sequential would be Nx longer

---

## Pattern 3: Pipeline Orchestration

**Use Case**: Multi-stage workflows where each stage can parallelize

**How it works**:
```
Stage 1 (Research)
├── Topic A → Sub-Agent → Raw Data A
├── Topic B → Sub-Agent → Raw Data B
└── Topic C → Sub-Agent → Raw Data C
      ↓
Stage 2 (Analysis) [triggered after Stage 1 completes]
├── Analyze A → Sub-Agent → Insights A
├── Analyze B → Sub-Agent → Insights B
└── Analyze C → Sub-Agent → Insights C
      ↓
Stage 3 (Synthesis) [single sub-agent or main agent]
Final Report
```

**Best for**: Complex workflows with dependencies, content pipelines, report generation

### Example: Content Production Pipeline

```javascript
// Stage 1: Research (parallel)
const topics = ["AI Trends 2026", "Web3 Developments", "Cloud Computing"];
const researchJobs = topics.map(t => sessions_spawn({
  task: `Research: ${t}. Find 5 key developments and summarize each.`,
  label: `research-${slugify(t)}`,
  model: "kimi-coding/k2p5"
}));

// Wait for all research (via announce monitoring)
// Then trigger Stage 2...

// Stage 2: Draft Writing (parallel)
const draftJobs = topics.map(t => sessions_spawn({
  task: `Write a blog post draft about: ${t}
         Use the research findings from the previous phase.
         Target: 800 words, professional tone.`,
  label: `draft-${slugify(t)}`,
  model: "openai-codex/gpt-5.2"  // Higher quality for writing
}));

// Stage 3: Final Review (single agent)
await sessions_spawn({
  task: `Review and combine these ${topics.length} blog drafts into a cohesive newsletter.
         Add introduction, transitions between sections, and conclusion.`,
  label: "newsletter-final",
  model: "openai-codex/gpt-5.2"
});
```

---

## Pattern 4: Race & Winner-Takes-All

**Use Case**: Trying multiple approaches simultaneously, using first/best result

**How it works**:
```
Main Agent
├── Approach A → Sub-Agent A ─┐
├── Approach B → Sub-Agent B ─┼→ First to complete wins
└── Approach C → Sub-Agent C ─┘
```

**Best for**: Problem-solving with uncertain best approach, optimization tasks

### Example: Multiple Solution Attempts

```javascript
// Try 3 different approaches to solve a problem
const approaches = [
  "Use regex pattern matching",
  "Use a parsing library approach", 
  "Use machine learning classification"
];

// Spawn all approaches simultaneously
approaches.forEach((approach, i) => {
  sessions_spawn({
    task: `Solve this data extraction problem using: ${approach}
           
           Problem: Extract email addresses from unstructured text
           Data: [provide sample data]
           
           Return working code and accuracy metrics.`,
    label: `approach-${i}`,
    model: "kimi-coding/k2p5",
    runTimeoutSeconds: 120  // Short timeout - we want fast answers
  });
});

// Use /subagents log to see which completed first
// Cancel others once winner is identified
```

---

## Pattern 5: Parallel Validation

**Use Case**: Verifying output quality through multiple independent checks

**How it works**:
```
Primary Work
└── Generate Output
    ├── Validator A → Check for errors
    ├── Validator B → Check for completeness  
    └── Validator C → Check for style/tone
          ↓
    Aggregate validation results → Pass/Fail/Revise
```

**Best for**: Critical outputs requiring quality assurance, code review, content review

### Example: Code Review Pipeline

```javascript
// Primary agent writes code
const code = await generateCode();

// Spawn parallel validators
const validators = [
  { name: "security", focus: "security vulnerabilities and unsafe practices" },
  { name: "performance", focus: "performance bottlenecks and optimization opportunities" },
  { name: "maintainability", focus: "code clarity, comments, and structure" }
];

validators.forEach(v => {
  sessions_spawn({
    task: `Review this code for ${v.focus}:
           
           ${code}
           
           Provide: 1) Issues found (if any), 2) Severity (high/medium/low), 
           3) Specific recommendations`,
    label: `validate-${v.name}`,
    model: "kimi-coding/k2p5"
  });
});
```

---

## Configuration Best Practices

### 1. Sub-Agent Model Selection

```yaml
# In OpenClaw config (openclaw.yaml or ~/.openclaw/config.yaml)
agents:
  defaults:
    subagents:
      model: "kimi-coding/k2p5"      # Default for sub-agents
      thinking: "low"                 # Reduce token usage
      maxConcurrent: 8                # Default concurrency
      archiveAfterMinutes: 60         # Auto-cleanup
```

### 2. Tool Restrictions

```yaml
tools:
  subagents:
    tools:
      deny: ["gateway", "cron", "sessions_spawn"]  # Prevent nesting
      # allow: ["read", "exec", "web_search"]       # Or whitelist mode
```

### 3. Timeout Configuration

| Task Type | Recommended Timeout | Rationale |
|-----------|---------------------|-----------|
| Quick research | 120s | Fast facts, simple queries |
| Deep research | 300s | Complex research, multiple sources |
| Code generation | 180s | Writing functions, small scripts |
| Data processing | 600s | Large dataset processing |
| Content writing | 300s | Articles, documentation |

---

## Cost Optimization

### Model Tier Strategy

```
┌─────────────────────────────────────────────────────────────┐
│  MAIN AGENT: openai-codex/gpt-5.2 (high quality)            │
│  ├── Spawns sub-agents...                                   │
│  │                                                           │
│  │  SUB-AGENT TIER 1: kimi-coding/k2p5 (research, drafts)   │
│  │  └── Default for most parallel work                      │
│  │                                                           │
│  │  SUB-AGENT TIER 2: openai-codex/gpt-5.2 (final polish)   │
│  │  └── Final reviews, critical outputs                     │
│  │                                                           │
│  │  SUB-AGENT TIER 3: ollama/local (pre-processing)         │
│  │  └── Data formatting, simple transformations              │
└─────────────────────────────────────────────────────────────┘
```

### Cost Comparison Example

**Scenario**: Research 10 competitors

| Approach | Model | Est. Cost | Time |
|----------|-------|-----------|------|
| Sequential (main agent) | gpt-5.2 | $0.80 | 20 min |
| Parallel (all gpt-5.2) | gpt-5.2 | $0.80 | 2 min |
| Parallel (kimi for research) | kimi/k2p5 | $0.15 | 2 min |
| **Optimized** | Mixed | **$0.20** | **2 min** |

### Cost Control Tips

1. **Use `cleanup: "delete"`** for temporary sub-agents
2. **Set appropriate timeouts** to prevent runaway tasks
3. **Match model to task complexity**: Don't use GPT-5.2 for simple data extraction
4. **Batch strategically**: Spawn overhead means tiny tasks aren't worth parallelizing
5. **Monitor with `/subagents info`**: Kill stuck or unnecessary sub-agents

---

## Quick Reference

### Command Cheat Sheet

```bash
# List all active sub-agents
/subagents list

# Get detailed info on a specific sub-agent  
/subagents info <session-id>

# View sub-agent conversation log
/subagents log <session-id>

# Send message to running sub-agent
/subagents send <session-id> "Additional context..."

# Stop a specific sub-agent
/subagents stop <session-id>

# Stop all sub-agents
/subagents stop
```

### Spawning Parameters

```javascript
{
  task: string;                    // Required: what to do
  label?: string;                  // Optional: identifier
  model?: string;                  // Optional: override default
  thinking?: "low" | "medium" | "high";  // Optional: thinking level
  runTimeoutSeconds?: number;      // Optional: timeout (0 = none)
  cleanup?: "delete" | "keep";     // Optional: auto-cleanup
}
```

---

## Summary

| Pattern | Best For | Speedup | Complexity |
|---------|----------|---------|------------|
| Fan-Out Research | Multiple independent topics | 3-10x | Low |
| Map-Reduce | Large data processing | 5-20x | Medium |
| Pipeline | Multi-stage workflows | 2-5x | Medium |
| Race | Uncertain approaches | Variable | Low |
| Validation | Quality assurance | Parallel | Low |

The key insight: **Any independent work can be parallelized**. Train yourself to spot parallelization opportunities in every workflow.
