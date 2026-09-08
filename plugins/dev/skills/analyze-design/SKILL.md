---
name: analyze-design
description: Analyze designs from 8 expert perspectives simultaneously using specialized sub-agents
---

# Analyze Design from Multiple Expert Perspectives

**Output directory:** `./ai_docs/designs/`

## Arguments

- `design` — Path to the markdown design specification file

## Analysis Perspectives

Our specialized analyzers will evaluate the design from these critical angles:

1. **Planning & SLC Ethos** - Pragmatic implementation planning following Simple, Lovable, Complete principles
2. **Codebase Integration** - How well the design fits with existing architecture and patterns
3. **Simplicity** - Finding the simplest viable solution that avoids unnecessary complexity
4. **Testability** - Ensuring comprehensive and maintainable test coverage
5. **Robustness** - Error handling, edge cases, and resilience
6. **Pattern Consistency** - Adherence to established codebase patterns and conventions
7. **Best Practices** - Following SOLID, DRY, KISS, YAGNI and industry standards
8. **Strategic Alignment** - Overall strategic alignment and trade-offs

## Task

- Read the design document provided as the argument
- DO NOT implement the design yourself
- Create a plan for each of the 8 specialized analyzer subagents to evaluate the design simultaneously:
  - @planner-analyzer - For SLC ethos and pragmatic planning
  - @understand-analyzer - For codebase integration analysis
  - @simplicity-analyzer - For simplicity assessment
  - @testability-analyzer - For test coverage and maintainability
  - @robustness-analyzer - For error handling and resilience
  - @pattern-analyzer - For pattern consistency
  - @best-practices-analyzer - For engineering principles compliance
  - @strategic-analyzer - For overall strategic alignment and trade-offs
- Launch all subagents simultaneously

## Sub-Agent Dispatch

For each analyzer, include in the prompt:
1. The full design document text (paste it into the prompt, don't make the subagent read a file path)
2. A specific focus question for that analyzer's perspective (e.g., for simplicity-analyzer: "What could be removed or simplified without losing core functionality?")
3. The required output format: "Provide your analysis as: Key Findings (3-5 bullets), Risks (if any), Recommendation (1-2 sentences)"

## Output

1. **Collect Outputs:** Gather all 8 analyses from the subagents.
2. **Create Comparison Summary:** Generate a markdown table that summarizes the key findings, pros, and cons from each perspective:
   - Planning & SLC alignment
   - Codebase integration fit
   - Simplicity score
   - Testability assessment
   - Robustness evaluation
   - Pattern consistency
   - Best practices compliance
3. **Identify Conflicts & Synergies:** Create a list of conflicts (e.g., "The Simplicity analysis recommends removing abstractions that the Testability analysis deems necessary") and synergies between perspectives.
4. **Create Unified Architecture:** Based on the comparison and conflict analysis, create a final, unified architecture document. This document should:
   - Synthesize the strongest recommendations from each perspective
   - Explicitly state the decisions made to resolve conflicts and the reasoning behind them
   - Result in a balanced design that adheres to the SLC ethos while maintaining best practices
   - Prioritize simplicity and pragmatism while ensuring robustness and maintainability
5. **Save Document:** Save the final unified analysis to `./ai_docs/designs/design_analysis_${FEATURE_NAME}_$(date +%Y%m%d_%H%M%S).md`
