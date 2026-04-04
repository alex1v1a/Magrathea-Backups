/**
 * Task Templates for Common Parallel Workflows
 * 
 * Pre-built task templates optimized for sub-agent execution.
 * Copy-paste ready with placeholders marked as {{PLACEHOLDER}}.
 */

const TaskTemplates = {
  
  // =========================================================================
  // Research Templates
  // =========================================================================
  
  research: {
    basic: (topic) => `Research: {{TOPIC}}

Find comprehensive information on this topic including:
- Key facts and statistics
- Recent developments (past 12 months)
- Major players, companies, or stakeholders
- Common misconceptions or controversies

Return a structured summary with:
- Executive summary (3-5 sentences)
- Key findings (bullet points)
- Sources or references mentioned`,

    competitor: (company) => `Competitive Analysis: {{COMPANY}}

Research {{COMPANY}} and provide:
1. Company Overview
   - What they do (main products/services)
   - Target market and positioning

2. Recent Developments (past 6 months)
   - New product launches
   - Major announcements
   - Strategic shifts

3. Strengths & Weaknesses
   - What they do well
   - Potential vulnerabilities

4. Key Takeaways
   - 3-5 bullet points of strategic importance`,

    market: (market) => `Market Research: {{MARKET}}

Analyze the {{MARKET}} market:

1. Market Size & Growth
   - Current market size (if available)
   - Growth rate and trends
   - Key growth drivers

2. Competitive Landscape
   - Top 5 players
   - Market share distribution (if known)
   - Emerging competitors

3. Key Trends
   - Technology trends
   - Consumer behavior shifts
   - Regulatory factors

4. Opportunities & Threats
   - Growth opportunities
   - Potential disruptions`,

    technology: (tech) => `Technology Analysis: {{TECH}}

Research {{TECH}} and provide:

1. What It Is
   - Clear explanation for non-technical audience
   - How it works (high-level)

2. Current State (2025-2026)
   - Maturity level
   - Adoption rate
   - Major implementations

3. Key Players
   - Leading companies
   - Important researchers/institutions
   - Open source projects

4. Future Outlook
   - Predicted timeline for mainstream adoption
   - Potential impact
   - Challenges to overcome`
  },

  // =========================================================================
  // Analysis Templates
  // =========================================================================
  
  analysis: {
    data: (data, focus) => `Data Analysis Task

DATA TO ANALYZE:
{{DATA}}

ANALYSIS FOCUS: {{FOCUS}}

Please provide:
1. Summary Statistics
   - Key metrics and counts
   - Distribution overview

2. Key Insights
   - 3-5 significant findings
   - Trends or patterns identified

3. Visual Recommendations
   - What charts/graphs would best represent this data

4. Actionable Recommendations
   - What actions should be taken based on this analysis`,

    sentiment: (text) => `Sentiment Analysis

TEXT TO ANALYZE:
{{TEXT}}

Analyze the sentiment and provide:
1. Overall Sentiment
   - Positive / Negative / Neutral (with confidence %)

2. Emotional Tone
   - Specific emotions detected (joy, anger, fear, etc.)

3. Key Phrases
   - Most positive phrases
   - Most negative phrases

4. Context Notes
   - Any sarcasm or irony detected
   - Subject-specific sentiment`,

    comparison: (items, criteria) => `Comparative Analysis

ITEMS TO COMPARE:
{{ITEMS}}

COMPARISON CRITERIA: {{CRITERIA}}

Provide:
1. Side-by-Side Comparison
   - Matrix/table format if applicable

2. Individual Assessments
   - Strengths of each item
   - Weaknesses of each item

3. Scoring (if applicable)
   - Rate each item on key criteria

4. Recommendation
   - Which item is best for what use case
   - Overall winner with justification`
  },

  // =========================================================================
  // Content Templates
  // =========================================================================
  
  content: {
    blogPost: (topic, audience) => `Write a Blog Post

TOPIC: {{TOPIC}}
TARGET AUDIENCE: {{AUDIENCE}}

Requirements:
- Length: 800-1200 words
- Tone: Professional but accessible
- Structure:
  * Engaging headline
  * Hook introduction
  * 3-5 main sections with subheadings
  * Practical takeaways
  * Conclusion with call-to-action

SEO Considerations:
- Include relevant keywords naturally
- Use proper heading hierarchy
- Suggest meta description

Deliverable: Complete blog post ready for publication`,

    socialMedia: (topic, platform) => `Create Social Media Content

TOPIC: {{TOPIC}}
PLATFORM: {{PLATFORM}}

Create:
1. Main Post
   - Platform-optimized length
   - Engaging hook
   - Clear message
   - Relevant hashtags (if applicable)

2. Variations
   - 2 alternative versions with different angles

3. Engagement Elements
   - Call-to-action
   - Question to spark discussion
   - Visual suggestions

Platform-Specific Notes:
- Twitter/X: 280 char focus, thread option
- LinkedIn: Professional tone, longer form OK
- Instagram: Visual-first, caption style
- Facebook: Community-focused`,

    email: (purpose, audience) => `Write an Email

PURPOSE: {{PURPOSE}}
AUDIENCE: {{AUDIENCE}}

Structure:
1. Subject Line
   - 3 options (test variations)
   - Clear and compelling

2. Opening
   - Personalized greeting
   - Immediate hook

3. Body
   - Clear value proposition
   - Supporting points
   - Social proof (if applicable)

4. Call-to-Action
   - Single, clear action
   - Urgency (if appropriate)

5. Sign-off
   - Professional closing
   - Signature block

Tone Guidance: Match audience expectations while maintaining authenticity`
  },

  // =========================================================================
  // Code Templates
  // =========================================================================
  
  code: {
    function: (description, language) => `Write a Function

DESCRIPTION: {{DESCRIPTION}}
LANGUAGE: {{LANGUAGE}}

Requirements:
1. Implementation
   - Clean, readable code
   - Proper error handling
   - Input validation

2. Documentation
   - Function docstring/comments
   - Parameter descriptions
   - Return value description

3. Testing
   - 3-5 test cases
   - Edge cases covered
   - Expected outputs

4. Usage Example
   - Complete working example
   - Common use patterns

Code Style: Follow best practices for {{LANGUAGE}}`,

    review: (code, focus) => `Code Review

CODE TO REVIEW:
\`\`\`{{LANGUAGE}}
{{CODE}}
\`\`\`

FOCUS AREAS: {{FOCUS}}

Review Checklist:
1. Correctness
   - Logic errors
   - Edge cases not handled
   - Potential bugs

2. Code Quality
   - Readability
   - Naming conventions
   - Code organization

3. Performance
   - Algorithmic efficiency
   - Resource usage
   - Optimization opportunities

4. Security
   - Injection vulnerabilities
   - Data exposure risks
   - Authentication/authorization issues

5. Maintainability
   - Documentation quality
   - Test coverage
   - Technical debt assessment

Provide specific line-by-line feedback where applicable.`,

    refactor: (code, goals) => `Refactor Code

CODE TO REFACTOR:
\`\`\`
{{CODE}}
\`\`\`

REFACTORING GOALS: {{GOALS}}

Deliver:
1. Refactored Code
   - Cleaner implementation
   - Same functionality preserved

2. Changes Made
   - List of specific improvements
   - Rationale for each change

3. Before/After Comparison
   - Key metrics (lines, complexity)
   - Readability improvements

4. Further Improvements
   - Additional suggestions (if any)`
  },

  // =========================================================================
  // Validation Templates
  // =========================================================================
  
  validation: {
    accuracy: (content) => `Accuracy Validation

CONTENT TO VALIDATE:
{{CONTENT}}

Validation Criteria:
1. Factual Accuracy
   - Are stated facts correct?
   - Are statistics accurate?
   - Are dates and figures correct?

2. Source Reliability
   - Are sources credible?
   - Is information current?

3. Logical Consistency
   - Are arguments sound?
   - Any contradictions?

RESULT FORMAT:
- PASS / NEEDS REVIEW / FAIL
- Specific issues found
- Corrections needed
- Confidence level (High/Medium/Low)`,

    completeness: (content, requirements) => `Completeness Check

CONTENT:
{{CONTENT}}

REQUIREMENTS:
{{REQUIREMENTS}}

Check:
1. Requirement Coverage
   - Which requirements are met?
   - Which are missing?
   - Partial coverage noted

2. Depth Assessment
   - Is coverage superficial or thorough?
   - Missing details identified

3. Context Adequacy
   - Is enough background provided?
   - Will audience understand?

RESULT FORMAT:
- Coverage percentage
- Missing elements list
- Suggestions for improvement`,

    clarity: (content, audience) => `Clarity Review

CONTENT:
{{CONTENT}}

TARGET AUDIENCE: {{AUDIENCE}}

Evaluate:
1. Readability
   - Sentence complexity
   - Jargon usage
   - Flow and transitions

2. Structure
   - Logical organization
   - Clear headings
   - Effective formatting

3. Accessibility
   - Appropriate for audience level
   - Definitions provided
   - Examples included

RESULT FORMAT:
- Readability score (estimate)
- Specific confusing sections
- Rewriting suggestions
- Overall clarity rating`
  }
};

// Export for use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = TaskTemplates;
}
