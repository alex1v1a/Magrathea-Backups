# Sub-Agent Reasoning Patterns

*When and how to use parallel sub-agents for better reasoning and results.*

---

## Pattern 1: Chain-of-Thought Decomposition

**When to use:** Complex problems that can be broken into independent sub-problems.

**How it works:**
1. Decompose the main problem into sub-problems
2. Spawn sub-agents for each sub-problem in parallel
3. Aggregate results into final answer

**Example:**
```
Problem: "Should we buy this house?"

Spawn in parallel:
├─ Agent A: Analyze financial impact (mortgage, taxes, appreciation)
├─ Agent B: Evaluate location (schools, commute, neighborhood trends)  
├─ Agent C: Assess property condition (inspection red flags, repair costs)
└─ Agent D: Compare to alternatives (renting, other houses, waiting)

Aggregate: Combine all analyses into recommendation
```

**Best for:** Multi-faceted decisions, research tasks, cost-benefit analyses

---

## Pattern 2: Verification Pattern

**When to use:** High-stakes reasoning where errors are costly.

**How it works:**
1. Agent A generates initial reasoning/answer
2. Agent B critiques and verifies (finds flaws, checks logic)
3. Agent C synthesizes (incorporates valid critiques, resolves conflicts)

**Example:**
```
Problem: "Review this contract for risks"

Step 1: Agent A analyzes contract, flags potential issues
Step 2: Agent B critiques Agent A's analysis (false positives? missed issues?)
Step 3: Agent C produces final risk assessment incorporating both
```

**Best for:** Legal review, security analysis, code review, fact-checking

**Prompt template for verifier:**
```
Review this analysis for:
- Logical errors or fallacies
- Missed edge cases
- Overconfident claims without evidence
- Alternative interpretations not considered

Be constructively critical. Point out what's wrong, not just what's right.
```

---

## Pattern 3: Expert Specialization

**When to use:** Problems spanning multiple domains requiring different expertise.

**How it works:**
1. Identify domains involved
2. Spawn domain-specific experts
3. Synthesize expert opinions

**Example:**
```
Problem: "Design a new feature for the app"

Spawn experts:
├─ UX Agent: User flows, accessibility, usability
├─ Technical Agent: Implementation complexity, tech stack fit
├─ Business Agent: Revenue impact, market fit, competitor analysis
└─ Security Agent: Data handling, compliance, threat model

Synthesize: Combined feature spec with all constraints satisfied
```

**Best for:** Product decisions, architecture design, policy creation

**Expert personas to use:**
- **UX Expert:** Focus on user experience, accessibility, interaction design
- **Technical Expert:** Focus on implementation, performance, maintainability
- **Security Expert:** Focus on threats, compliance, data protection
- **Business Expert:** Focus on ROI, market fit, competitive advantage
- **Legal Expert:** Focus on compliance, liability, regulations

---

## Pattern 4: Iterative Refinement

**When to use:** Tasks where quality improves through iterations (writing, coding, design).

**How it works:**
1. Agent A produces initial draft
2. Agent B improves specific aspects
3. Repeat until satisfied or diminishing returns

**Example:**
```
Problem: "Write a proposal for the client"

Round 1: Agent A writes initial draft
Round 2: Agent B improves clarity and persuasive structure
Round 3: Agent C tightens language and removes fluff
Round 4: Agent D finalizes with formatting and polish

(Stop when improvement < 10% per round)
```

**Best for:** Writing, code refactoring, presentation design, argument construction

**Refinement directives:**
```
Improve this by:
- Making it more concise (cut 20%)
- Strengthening the opening hook
- Adding specific examples where vague
- Improving flow between sections
- Removing redundant points
```

---

## Hybrid Patterns

### Research → Verification
For research tasks: Spawn multiple researchers in parallel, then have a verifier check for consistency and gaps.

```
Problem: "What's the best CRM for our needs?"

Phase 1 (Parallel):
├─ Researcher A: Salesforce analysis
├─ Researcher B: HubSpot analysis
└─ Researcher C: Custom build analysis

Phase 2 (Verification):
└─ Verifier: Check for missing criteria, conflicting claims
```

### Expert → Iterate
For complex deliverables: Domain experts create content, then iterative refinement polishes.

```
Problem: "Create a security policy"

Phase 1 (Experts):
├─ Security Expert: Threat model and requirements
└─ Legal Expert: Compliance requirements

Phase 2 (Iterate):
├─ Refiner A: Improve clarity and structure
└─ Refiner B: Add examples and templates
```

---

## Decision Framework

```
Complex problem?
│
├─ Multiple independent aspects?
│   └─→ Chain-of-Thought Decomposition
│
├─ High stakes / need to catch errors?
│   └─→ Verification Pattern
│
├─ Spans multiple domains?
│   └─→ Expert Specialization
│
├─ Quality improves with iteration?
│   └─→ Iterative Refinement
│
└─ Combination of above?
    └─→ Hybrid Pattern
```

---

## Practical Guidelines

### When NOT to use sub-agents

- **Simple tasks** (< 2 min for main agent) — overhead not worth it
- **Sequential dependencies** — where B can't start until A finishes
- **Tight loops** — spawning inside loops kills performance
- **Low-stakes decisions** — verification overkill for trivial choices

### Cost vs. Quality Trade-off

| Pattern | Latency | Token Cost | Quality Gain | Use When |
|---------|---------|------------|--------------|----------|
| Single agent | Low | Low | Baseline | Simple tasks |
| Chain-of-thought | Medium | Medium | +30% | Multi-faceted problems |
| Verification | Medium | High | +40% | High-stakes decisions |
| Expert specialization | Medium | High | +50% | Cross-domain problems |
| Iterative refinement | High | Very High | +35% | Polished deliverables |

### Spawning Best Practices

1. **Clear prompts:** Each sub-agent needs complete context, not references
2. **Specific outputs:** Define exactly what each agent should return
3. **Parallel when possible:** Don't serialize what can run concurrently
4. **Timeout appropriately:** Complex reasoning needs more time
5. **Aggregate explicitly:** Don't assume results combine automatically

---

## Example: Complete Workflow

**Task:** "Should we migrate from PostgreSQL to ClickHouse?"

```javascript
// Phase 1: Domain experts in parallel
const experts = await Promise.all([
  sessions_spawn({
    task: "Analyze technical migration path from PostgreSQL to ClickHouse. Consider: schema changes, query rewrites, data migration effort, operational complexity. Return: effort estimate (S/M/L), risk level (1-5), key blockers."
  }),
  sessions_spawn({
    task: "Analyze business impact of PostgreSQL→ClickHouse migration. Consider: query performance gains, cost changes, team learning curve, vendor lock-in. Return: ROI estimate, break-even timeline, strategic recommendation."
  }),
  sessions_spawn({
    task: "Analyze what we'd lose moving from PostgreSQL. Consider: ecosystem tools, ACID guarantees, JSON support, team expertise. Return: deal-breakers or acceptable trade-offs."
  })
]);

// Phase 2: Verification
const verification = await sessions_spawn({
  task: `Critique these three analyses for flaws, missed considerations, or overconfident claims:
  Technical: ${experts[0].result}
  Business: ${experts[1].result}
  Trade-offs: ${experts[2].result}
  Return: List of concerns and what's missing.`
});

// Phase 3: Final recommendation
const decision = await sessions_spawn({
  task: `Synthesize into final recommendation:
  Expert analyses + critiques above.
  Return: Clear YES/NO/MAYBE with reasoning, next steps if yes.`
});
```

---

## Prompt Templates

### For Decomposition
```
You are analyzing one aspect of [PROBLEM]. Focus ONLY on [ASPECT].

Context: [FULL CONTEXT]

Analyze and return:
1. Key findings (bullet points)
2. Supporting evidence
3. Confidence level (high/medium/low)
4. Open questions or uncertainties
```

### For Verification
```
You are a critical reviewer. Find flaws in this analysis:

[ANALYSIS TO REVIEW]

Check for:
- Logical fallacies
- Unsupported claims
- Missed edge cases
- Alternative explanations
- Overconfidence

Return: Specific critiques and what was missed.
```

### For Expert Specialization
```
You are a [DOMAIN] expert reviewing [PROBLEM].

From your domain perspective, analyze:
- Key considerations
- Risks and mitigations
- Recommendations
- Trade-offs

Return: Domain-specific analysis in structured format.
```

### For Iterative Refinement
```
Improve this [DOCUMENT/CODE]:

[CONTENT]

Focus on: [SPECIFIC IMPROVEMENTS]

Return: Improved version only (no commentary unless asked).
```

---

## Remember

- **Parallel > Serial:** When possible, spawn together
- **Specific > General:** Precise prompts get better results
- **Verify important stuff:** Double-check high-stakes reasoning
- **Iterate when quality matters:** First draft is rarely final
- **Know when to stop:** Don't over-engineer simple decisions

---

*Reference this when planning complex multi-agent workflows.*
