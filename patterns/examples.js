#!/usr/bin/env node
/**
 * Sub-Agent Workflow Examples
 * 
 * Demonstrates all 5 parallelization patterns with practical examples.
 * Run individual examples with: node patterns/examples.js <pattern-name>
 */

// ============================================================================
// Example 1: Fan-Out Research (Competitive Analysis)
// ============================================================================

async function exampleFanOutResearch() {
  console.log("=== Example: Fan-Out Research ===\n");
  
  const competitors = ["Apple", "Google", "Microsoft", "Amazon", "Meta"];
  
  // Spawn parallel research tasks
  for (const competitor of competitors) {
    await sessions_spawn({
      task: `Research ${competitor}'s latest product announcements from the past 6 months.

Focus areas:
1. New products or services launched
2. Pricing strategy changes
3. Target market shifts
4. Key partnerships or acquisitions

Return a structured summary with:
- Executive summary (2-3 sentences)
- Key launches (bullet points)
- Strategic implications`,
      label: `research-${competitor.toLowerCase()}`,
      model: "kimi-coding/k2p5",
      runTimeoutSeconds: 300
    });
  }
  
  console.log(`✅ Spawned ${competitors.length} parallel research tasks`);
  console.log("📊 Results will be announced back as each completes\n");
  console.log("Use '/subagents list' to monitor progress");
}

// ============================================================================
// Example 2: Map-Reduce (Batch Content Processing)
// ============================================================================

async function exampleMapReduce() {
  console.log("=== Example: Map-Reduce Content Processing ===\n");
  
  // Simulated: Large dataset of customer feedback
  const feedbackItems = Array.from({ length: 100 }, (_, i) => ({
    id: i + 1,
    text: `Sample feedback ${i + 1}`,
    rating: Math.floor(Math.random() * 5) + 1
  }));
  
  // Split into chunks of 20
  const chunkSize = 20;
  const chunks = [];
  for (let i = 0; i < feedbackItems.length; i += chunkSize) {
    chunks.push(feedbackItems.slice(i, i + chunkSize));
  }
  
  console.log(`Processing ${feedbackItems.length} feedback items in ${chunks.length} chunks\n`);
  
  // Spawn parallel processing for each chunk
  for (const [index, chunk] of chunks.entries()) {
    await sessions_spawn({
      task: `Process this batch of customer feedback and extract insights.

Feedback batch (${chunk.length} items):
${JSON.stringify(chunk, null, 2)}

Tasks:
1. Categorize each item (bug, feature request, praise, complaint, question)
2. Extract key themes and sentiment
3. Identify urgent issues requiring immediate attention

Return structured results with:
- Category breakdown (counts)
- Top 3 themes
- Any urgent items flagged`,
      label: `feedback-chunk-${index}`,
      model: "kimi-coding/k2p5",
      runTimeoutSeconds: 300,
      cleanup: "delete"
    });
  }
  
  console.log(`✅ Spawned ${chunks.length} parallel processing jobs`);
  console.log("📊 Wait for all results, then aggregate insights\n");
}

// ============================================================================
// Example 3: Pipeline (Content Production)
// ============================================================================

async function examplePipeline() {
  console.log("=== Example: Pipeline (Content Production) ===\n");
  
  const topic = "AI in Healthcare 2026";
  
  // Stage 1: Research (parallel sub-topics)
  console.log("Stage 1/3: Research...");
  
  const researchAreas = [
    "Diagnostics and imaging AI",
    "Drug discovery acceleration", 
    "Patient care automation",
    "Regulatory developments"
  ];
  
  for (const area of researchAreas) {
    await sessions_spawn({
      task: `Research: ${area} in healthcare for 2026.
             
Topic context: ${topic}

Find:
- 3-5 key developments or trends
- Statistics or data points
- Real-world examples or case studies

Be concise - this feeds into a larger report.`,
      label: `research-${area.replace(/\s+/g, '-').toLowerCase()}`,
      model: "kimi-coding/k2p5",
      runTimeoutSeconds: 240
    });
  }
  
  console.log(`  ✅ Stage 1: ${researchAreas.length} research tasks spawned\n`);
  console.log("(Wait for Stage 1 to complete, then run Stage 2...)");
  
  // Stage 2 would be triggered after research completes
  // For demo purposes, showing the structure:
  
  console.log("Stage 2/3: Draft Writing (would spawn after research completes)");
  console.log("  - Draft introduction");
  console.log("  - Draft each section based on research");
  console.log("  - Draft conclusion\n");
  
  console.log("Stage 3/3: Final Assembly (single agent)");
  console.log("  - Combine all drafts");
  console.log("  - Add transitions");
  console.log("  - Final polish\n");
}

// ============================================================================
// Example 4: Race (Multiple Solution Approaches)
// ============================================================================

async function exampleRace() {
  console.log("=== Example: Race (Multiple Approaches) ===\n");
  
  const problem = `Extract all email addresses from unstructured text.
Example input: "Contact John at john@example.com or jane.doe@company.co.uk for help."
Expected output: ["john@example.com", "jane.doe@company.co.uk"]`;
  
  const approaches = [
    {
      name: "regex",
      description: "Use comprehensive regex pattern matching"
    },
    {
      name: "parser",
      description: "Build a simple state machine parser"
    },
    {
      name: "library",
      description: "Simulate using a validation library approach"
    }
  ];
  
  console.log(`Problem: ${problem}\n`);
  console.log("Spawning competing solutions...\n");
  
  for (const approach of approaches) {
    await sessions_spawn({
      task: `Solve this problem using: ${approach.description}

${problem}

Requirements:
- Working solution code
- Handle edge cases (subdomains, TLD variations, etc.)
- Test with at least 3 examples
- Time yourself - work efficiently

Return your solution quickly.`,
      label: `race-${approach.name}`,
      model: "kimi-coding/k2p5",
      runTimeoutSeconds: 120,
      cleanup: "delete"
    });
  }
  
  console.log(`✅ Spawned ${approaches.length} competing solutions`);
  console.log("🏁 First to return with a working solution wins!");
  console.log("📊 Use '/subagents list' to see completion order\n");
}

// ============================================================================
// Example 5: Parallel Validation
// ============================================================================

async function exampleValidation() {
  console.log("=== Example: Parallel Validation ===\n");
  
  // Simulated: A generated report that needs quality checks
  const report = `
# Q4 2025 Sales Report

## Executive Summary
Our Q4 performance exceeded targets by 15% across all regions.

## Key Metrics
- Revenue: $5.2M (+15% YoY)
- New Customers: 450
- Churn Rate: 2.3%

## Regional Breakdown
- North America: $2.1M
- Europe: $1.8M  
- APAC: $1.3M

## Next Steps
Focus on APAC expansion in Q1 2026.
`;
  
  const validators = [
    {
      name: "accuracy",
      criteria: "factual accuracy and data consistency"
    },
    {
      name: "completeness",
      criteria: "completeness - what's missing that should be included"
    },
    {
      name: "clarity",
      criteria: "clarity and readability for executive audience"
    },
    {
      name: "actionability",
      criteria: "actionability of recommendations"
    }
  ];
  
  console.log("Running parallel validation on report...\n");
  
  for (const validator of validators) {
    await sessions_spawn({
      task: `Validate the following report for: ${validator.criteria}

REPORT TO VALIDATE:
${report}

VALIDATION FOCUS: ${validator.criteria}

Provide:
1. PASS or FAIL
2. Specific issues found (if any)
3. Line-by-line feedback where applicable
4. Recommendations for improvement`,
      label: `validate-${validator.name}`,
      model: "kimi-coding/k2p5",
      runTimeoutSeconds: 180,
      cleanup: "delete"
    });
  }
  
  console.log(`✅ Spawned ${validators.length} parallel validators`);
  console.log("📊 Aggregate all validation results for final quality score\n");
}

// ============================================================================
// Example 6: Hybrid - Research + Validation
// ============================================================================

async function exampleHybrid() {
  console.log("=== Example: Hybrid (Research + Validation) ===\n");
  
  // Step 1: Parallel research
  const topics = ["Renewable Energy Trends", "EV Market Growth", "Carbon Capture Tech"];
  
  console.log("Step 1: Parallel research on multiple topics...");
  
  for (const topic of topics) {
    await sessions_spawn({
      task: `Research: ${topic}

Provide:
- Current state overview
- 3 key statistics with sources
- Major players/companies
- Future outlook (next 2-3 years)

This research will be validated by another agent.`,
      label: `research-${topic.replace(/\s+/g, '-').toLowerCase()}`,
      model: "kimi-coding/k2p5",
      runTimeoutSeconds: 300
    });
  }
  
  console.log(`  ✅ ${topics.length} research tasks spawned`);
  console.log("\nStep 2: After research completes, spawn validators to fact-check results");
  console.log("  - Check source credibility");
  console.log("  - Verify statistics");
  console.log("  - Identify potential biases\n");
}

// ============================================================================
// Main Runner
// ============================================================================

const examples = {
  "fanout": exampleFanOutResearch,
  "mapreduce": exampleMapReduce,
  "pipeline": examplePipeline,
  "race": exampleRace,
  "validate": exampleValidation,
  "hybrid": exampleHybrid,
  "all": async () => {
    await exampleFanOutResearch();
    await exampleMapReduce();
    await examplePipeline();
    await exampleRace();
    await exampleValidation();
    await exampleHybrid();
  }
};

async function main() {
  const requested = process.argv[2] || "all";
  
  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║     OpenClaw Sub-Agent Parallelization Examples               ║
╚═══════════════════════════════════════════════════════════════╝

Available examples:
  fanout      - Fan-out research pattern
  mapreduce   - Map-reduce data processing
  pipeline    - Multi-stage pipeline
  race        - Race multiple approaches
  validate    - Parallel validation
  hybrid      - Combined research + validation
  all         - Run all examples

Usage: node examples.js <example-name>
`);

  if (examples[requested]) {
    await examples[requested]();
  } else {
    console.log(`❌ Unknown example: ${requested}`);
    console.log("Available:", Object.keys(examples).join(", "));
  }
}

// If running directly, execute main
if (require.main === module) {
  main().catch(console.error);
}

module.exports = examples;
