---
name: analyze-design
description: Analyze designs from 8 expert perspectives simultaneously using specialized sub-agents, plus a ninth user-experience and accessibility perspective when the design has a user interface
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
9. **User Experience & Accessibility** - *Only when the design has a user interface.* Flows and their error paths, the eight interactive states, WCAG 2.2 AA, and fit with the project's design system

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
  - @ux-analyzer - For user experience and accessibility, only when the design has a user interface (screens, components, forms, user-facing copy)
- Launch all subagents simultaneously

## Sub-Agent Dispatch

For each analyzer, include in the prompt:
1. The full design document text (paste it into the prompt, don't make the subagent read a file path)
2. A specific focus question for that analyzer's perspective (e.g., for simplicity-analyzer: "What could be removed or simplified without losing core functionality?")
3. For @ux-analyzer, also paste the UX lens below
4. The required output format: "Provide your analysis as: Key Findings (3-5 bullets), Risks (if any), Recommendation (1-2 sentences)"

### The UX lens

Give @ux-analyzer this focus question: "Can every user complete every flow in this design, by mouse, keyboard and screen reader, on a phone and a desktop, in light and dark, including the empty, loading and error paths?" And this checklist, distilled from the `design-system` plugin's doctrine:

- Every flow has its error, empty, loading and success states written down, and every error message says how to fix it
- Every interactive element is specified in all eight states: default, hover, focus, active, disabled, loading, error, selected
- Keyboard and screen-reader behaviour is defined for every custom control (listbox, combobox, dialog, tabs), not left to implementation
- Destructive actions are confirmed, and the confirm button restates the action
- One thing leads on each screen; the design names what the eye lands on first
- Values come from the project's design tokens and shared theme, never one-off colours or sizes
- The design works at 320px wide before it earns a desktop layout

If the `design-system` plugin is installed, name `design-system:grill-me` (closing open questions in the brief), `design-system:design-screen` (building screens) and `design-system:a11y-audit` as the follow-ups in the analyzer's Recommendation.

## Output

1. **Collect Outputs:** Gather all 8 analyses (9 with the UX lens) from the subagents.
2. **Create Comparison Summary:** Generate a markdown table that summarizes the key findings, pros, and cons from each perspective:
   - Planning & SLC alignment
   - Codebase integration fit
   - Simplicity score
   - Testability assessment
   - Robustness evaluation
   - Pattern consistency
   - Best practices compliance
   - User experience and accessibility (when the UX lens ran)
3. **Identify Conflicts & Synergies:** Create a list of conflicts (e.g., "The Simplicity analysis recommends removing abstractions that the Testability analysis deems necessary") and synergies between perspectives.
4. **Create Unified Architecture:** Based on the comparison and conflict analysis, create a final, unified architecture document. This document should:
   - Synthesize the strongest recommendations from each perspective
   - Explicitly state the decisions made to resolve conflicts and the reasoning behind them
   - Result in a balanced design that adheres to the SLC ethos while maintaining best practices
   - Prioritize simplicity and pragmatism while ensuring robustness and maintainability
5. **Save Document:** Save the final unified analysis to `./ai_docs/designs/design_analysis_${FEATURE_NAME}_$(date +%Y%m%d_%H%M%S).md`
