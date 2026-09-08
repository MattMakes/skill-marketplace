# Refactoring Prompt Template

Use this template to generate one structured refactoring prompt per flagged function. Fill in the placeholders with data from the analysis results and code review.

---

## Refactoring Task: `{functionName}` in `{filePath}:{line}`

### Metric Violations

| Metric | Value | Threshold | Severity |
|--------|-------|-----------|----------|
| {metric} | {value} | {threshold} | {severity} |

### What's Wrong

{2-4 sentences explaining what specific code patterns are causing each metric to exceed its threshold. Reference the actual constructs found in the code — e.g., "The function has 6 early return statements driving ev(G) to 7" or "A 12-case switch with function calls in each branch pushes both v(G) and iv(G) above error thresholds."}

### Root Cause Analysis

{For each violated metric, explain:}
- **{metric name}** ({value}): {Identify the specific constructs contributing. E.g., "3 nested if/else chains at lines 45-72, 4 logical && operators in the condition at line 48, and a ternary at line 55."}

### Recommended Refactoring

{List 2-3 specific, actionable refactoring steps tailored to the actual code, drawn from the strategies in metric-guidance.md. Be concrete — name the functions to extract, the patterns to apply, the code to restructure.}

### Constraints

- Preserve the function's external behavior and return type.
- Maintain all existing error handling semantics.
- Keep changes scoped to this function and any new helpers extracted from it.
- After refactoring, re-run empowerment-sa to verify all metrics fall within thresholds.
