/**
 * Sub-Agent Orchestration Library
 * 
 * Reusable utilities for parallel sub-agent workflows in OpenClaw.
 * 
 * Usage:
 *   const { spawnParallel, waitForResults, raceSubAgents } = require('./subagent-orchestrator');
 */

// ============================================================================
// Pattern 1: Fan-Out (Spawn Multiple Independent Tasks)
// ============================================================================

/**
 * Spawn multiple sub-agents in parallel with the same task template
 * @param {Array} items - Array of items to process
 * @param {Function} taskBuilder - Function that takes (item, index) and returns task string
 * @param {Object} options - Spawn options
 * @returns {Array} Array of spawn results
 */
async function fanOut(items, taskBuilder, options = {}) {
  const {
    model = "kimi-coding/k2p5",
    timeoutSeconds = 300,
    cleanup = "keep",
    labelPrefix = "task"
  } = options;

  const spawnPromises = items.map((item, index) => {
    const task = taskBuilder(item, index);
    const label = `${labelPrefix}-${index}`;
    
    return sessions_spawn({
      task,
      label,
      model,
      runTimeoutSeconds: timeoutSeconds,
      cleanup
    });
  });

  return Promise.all(spawnPromises);
}

/**
 * Spawn multiple sub-agents with different tasks
 * @param {Array<{task: string, label: string}>} taskSpecs - Array of task specifications
 * @param {Object} options - Spawn options
 */
async function spawnParallel(taskSpecs, options = {}) {
  const {
    model = "kimi-coding/k2p5",
    timeoutSeconds = 300,
    cleanup = "keep"
  } = options;

  const spawnPromises = taskSpecs.map(spec => 
    sessions_spawn({
      task: spec.task,
      label: spec.label,
      model: spec.model || model,
      runTimeoutSeconds: spec.timeout || timeoutSeconds,
      cleanup: spec.cleanup || cleanup
    })
  );

  return Promise.all(spawnPromises);
}

// ============================================================================
// Pattern 2: Map-Reduce (Split Work, Process Parallel, Aggregate)
// ============================================================================

/**
 * Split array into chunks for parallel processing
 * @param {Array} array - Array to chunk
 * @param {number} chunkSize - Items per chunk
 * @returns {Array<Array>} Array of chunks
 */
function chunkArray(array, chunkSize) {
  const chunks = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  return chunks;
}

/**
 * Map phase: Process chunks in parallel
 * @param {Array} data - Full dataset
 * @param {Function} mapper - Function to apply to each chunk
 * @param {Object} options - Processing options
 */
async function mapReduce(data, mapper, options = {}) {
  const {
    chunkSize = 25,
    model = "kimi-coding/k2p5",
    timeoutSeconds = 600
  } = options;

  const chunks = chunkArray(data, chunkSize);
  
  console.log(`Map-Reduce: Splitting ${data.length} items into ${chunks.length} chunks`);

  // Spawn parallel processing for each chunk
  const mapJobs = chunks.map((chunk, index) => 
    sessions_spawn({
      task: mapper(chunk, index),
      label: `map-chunk-${index}`,
      model,
      runTimeoutSeconds: timeoutSeconds,
      cleanup: "delete"
    })
  );

  const results = await Promise.all(mapJobs);
  
  console.log(`Map-Reduce: All ${chunks.length} chunks processed`);
  
  return {
    chunkCount: chunks.length,
    results,
    // Results will be announced back - this is just spawn confirmation
    expectedResults: chunks.length
  };
}

// ============================================================================
// Pattern 3: Pipeline (Multi-Stage with Dependencies)
// ============================================================================

/**
 * Define and execute a multi-stage pipeline
 * @param {Array<{name: string, tasks: Array, model?: string}>} stages - Pipeline stages
 * @param {Object} context - Shared context to pass between stages
 */
async function pipeline(stages, context = {}) {
  const results = {};
  
  for (const [stageIndex, stage] of stages.entries()) {
    console.log(`Pipeline Stage ${stageIndex + 1}/${stages.length}: ${stage.name}`);
    
    // Spawn all tasks in this stage in parallel
    const stageJobs = stage.tasks.map((task, taskIndex) => {
      const taskWithContext = typeof task === 'function' 
        ? task(context, results) 
        : task;
        
      return sessions_spawn({
        task: taskWithContext,
        label: `${stage.name}-task-${taskIndex}`,
        model: stage.model || "kimi-coding/k2p5",
        runTimeoutSeconds: stage.timeout || 300
      });
    });
    
    // Wait for stage completion (results announced back)
    results[stage.name] = await Promise.all(stageJobs);
    
    console.log(`Pipeline Stage ${stageIndex + 1} complete`);
  }
  
  return results;
}

// ============================================================================
// Pattern 4: Race (Multiple Approaches, First Wins)
// ============================================================================

/**
 * Race multiple sub-agents against each other
 * Note: In OpenClaw, all run simultaneously. You manually pick the winner from results.
 * @param {Array<string>} approaches - Different approaches to try
 * @param {string} problem - The problem to solve
 * @param {Object} options - Race options
 */
async function race(approaches, problem, options = {}) {
  const {
    timeoutSeconds = 120,
    model = "kimi-coding/k2p5"
  } = options;

  console.log(`Race: Starting ${approaches.length} competing approaches`);

  const raceJobs = approaches.map((approach, index) => 
    sessions_spawn({
      task: `Solve this problem using approach: ${approach}
             
             Problem: ${problem}
             
             Work quickly and efficiently. Return your solution as soon as possible.`,
      label: `race-approach-${index}`,
      model,
      runTimeoutSeconds: timeoutSeconds,
      cleanup: "delete"
    })
  );

  // All spawn immediately - monitor /subagents list to see which finishes first
  const results = await Promise.all(raceJobs);
  
  return {
    approaches: approaches.length,
    results,
    note: "Use /subagents list to see completion order, then /subagents log <id> for winner"
  };
}

// ============================================================================
// Pattern 5: Validation (Parallel Quality Checks)
// ============================================================================

/**
 * Run multiple validators on the same output in parallel
 * @param {string} output - The output to validate
 * @param {Array<{name: string, criteria: string}>} validators - Validation criteria
 * @param {Object} options - Validation options
 */
async function parallelValidate(output, validators, options = {}) {
  const {
    model = "kimi-coding/k2p5",
    timeoutSeconds = 180
  } = options;

  const validationJobs = validators.map(validator => 
    sessions_spawn({
      task: `Validate the following output for: ${validator.criteria}
             
             Output to validate:
             ${output}
             
             Provide:
             1. PASS or FAIL
             2. Specific issues found (if any)
             3. Recommendations for improvement`,
      label: `validate-${validator.name}`,
      model,
      runTimeoutSeconds: timeoutSeconds,
      cleanup: "delete"
    })
  );

  return Promise.all(validationJobs);
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Create a task builder for common patterns
 */
const TaskBuilders = {
  /**
   * Research task builder
   */
  research: (topic) => `Research: ${topic}
    Find comprehensive information including:
    - Key facts and statistics
    - Recent developments (past 12 months)
    - Major players or stakeholders
    - Common misconceptions
    
    Return a structured summary with sources where possible.`,

  /**
   * Analysis task builder  
   */
  analyze: (data, focus) => `Analyze the following data with focus on: ${focus}
    
    Data: ${JSON.stringify(data)}
    
    Provide:
    - Key insights
    - Trends or patterns
    - Actionable recommendations`,

  /**
   * Compare task builder
   */
  compare: (items, criteria) => `Compare the following items based on: ${criteria}
    
    Items: ${JSON.stringify(items)}
    
    Provide:
    - Side-by-side comparison
    - Pros/cons for each
    - Overall recommendation`
};

/**
 * Model selection helper based on task type
 */
function selectModel(taskType) {
  const modelMap = {
    research: "kimi-coding/k2p5",
    draft: "kimi-coding/k2p5",
    code: "kimi-coding/k2p5",
    review: "openai-codex/gpt-5.2",
    final: "openai-codex/gpt-5.2",
    creative: "openai-codex/gpt-5.2",
    simple: "kimi-coding/k2p5"
  };
  
  return modelMap[taskType] || "kimi-coding/k2p5";
}

// ============================================================================
// Export
// ============================================================================

module.exports = {
  // Core patterns
  fanOut,
  spawnParallel,
  mapReduce,
  pipeline,
  race,
  parallelValidate,
  
  // Utilities
  chunkArray,
  TaskBuilders,
  selectModel
};
