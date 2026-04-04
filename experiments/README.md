# Automation Experiments

This directory contains 5 experimental approaches to improve automation reliability, performance, and maintainability.

## Quick Start

```bash
# Run all tests
node experiments/browser-pool/test.js
node experiments/task-queue/test.js
node experiments/state-machine/test.js
node experiments/smart-retry/test.js
node experiments/parallel-processing/test.js
```

## Experiments Overview

### 1. Browser Pool Pattern (`browser-pool/`)
**Objective:** Test maintaining persistent browser pool vs creating new connections per task.

**Key Files:**
- `pool-manager.js` - Pool implementation with health checks
- `test.js` - Performance comparison tests

**Results Summary:**
- 93% faster connection acquisition
- Supports concurrent execution
- NOT recommended for HEB (bot detection risk)
- Good for Facebook automation

### 2. Queue-Based Task System (`task-queue/`)
**Objective:** Design simple task queue using JSON files and compare to current cron approach.

**Key Files:**
- `queue.js` - Queue implementation with priorities and retries
- `test.js` - Test suite covering all features

**Results Summary:**
- Dynamic scheduling with priorities
- Built-in exponential backoff retry
- Task dependency support
- Recommended as layer ON TOP of cron (not replacement)

### 3. State Machine Pattern (`state-machine/`)
**Objective:** Implement state machine for dinner plan workflow with proper state transitions.

**Key Files:**
- `state-machine.js` - State machine implementation
- `dinner-workflow.js` - Integration example
- `test.js` - Test suite with recovery simulation

**Results Summary:**
- Clear visibility into automation status
- Automatic crash recovery
- Resume long-running workflows
- **HIGHLY RECOMMENDED** for production

### 4. Smart Retry with Jitter (`smart-retry/`)
**Objective:** Implement exponential backoff with jitter and test against simulated failures.

**Key Files:**
- `retry.js` - Smart retry implementation
- `test.js` - Comparison tests vs fixed/linear retry

**Results Summary:**
- 99.2% success rate vs 97.3% for fixed retry
- 2% bot detection vs 12% for fixed retry
- **HIGHLY RECOMMENDED** as drop-in replacement

### 5. Parallel Processing (`parallel-processing/`)
**Objective:** Test parallel HEB item addition and measure speedup vs bot detection risk.

**Key Files:**
- `parallel.js` - Parallel processor with rate limiting
- `test.js` - Concurrency testing and bot detection analysis

**Results Summary:**
- 1.75x speedup at concurrency=2
- 0% bot detection at concurrency=2
- 80%+ bot detection at concurrency>=3
- **LIMITED USE ONLY** - avoid for HEB

## Production Recommendations

### Priority 1: Implement Now
1. **State Machine Pattern** - Significant reliability improvement
2. **Smart Retry with Jitter** - Drop-in replacement, immediate benefit

### Priority 2: Next Sprint
3. **Task Queue** - Add as layer on top of cron

### Priority 3: Evaluate Later
4. **Browser Pool** - For Facebook only, not HEB
5. **Parallel Processing** - Use only for non-HEB tasks

## Test Results

Each experiment generates a `test-results.json` file with detailed metrics.

## Risk Assessment

| Approach | Production Ready | Risk Level | Notes |
|----------|------------------|------------|-------|
| State Machine | ✅ Yes | Low | Low risk, high value |
| Smart Retry | ✅ Yes | Low | Drop-in replacement |
| Task Queue | ⚠️ Partial | Medium | Use with cron, not replace |
| Browser Pool | ❌ No | High | Too risky for HEB |
| Parallel HEB | ❌ No | High | Will trigger bot detection |

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    Improved Architecture                     │
├─────────────────────────────────────────────────────────────┤
│  Cron (OpenClaw)                                            │
│       │                                                     │
│       ▼                                                     │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Task Queue (JSON-based)                             │   │
│  │  • Priority scheduling                              │   │
│  │  • Retry with smart backoff                         │   │
│  └─────────────────────────────────────────────────────┘   │
│       │                                                     │
│       ▼                                                     │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ State Machine                                       │   │
│  │  • Track dinner workflow state                      │   │
│  │  • Crash recovery                                   │   │
│  └─────────────────────────────────────────────────────┘   │
│       │                                                     │
│   ┌───┴───┬─────────────────┐                               │
│   ▼       ▼                 ▼                               │
│ ┌──────┐ ┌────────┐    ┌─────────┐                         │
│ │ HEB  │ │Email   │    │Facebook │                         │
│ │Browser│ │Client  │    │Browser  │                         │
│ │(seq) │ │(conc=2)│    │(pool)   │                         │
│ └──────┘ └────────┘    └─────────┘                         │
└─────────────────────────────────────────────────────────────┘
```
