---
name: complexity-sweep
description: Sweep TypeScript/JavaScript files for over-complex functions: run the bundled static-analysis CLI, flag functions that exceed complexity thresholds (14 metrics across control flow, data flow, cognitive load, information density and composite), review the flagged code, and either refactor them directly or generate a structured refactoring prompt per function. Also generates and manages static-analysis config files for target repos. This skill should be used when validating code quality after writing code, reviewing recently changed files for complexity, when the user asks to check code metrics or complexity, or when setting up static-analysis configuration for a project.
---

# Complexity Sweep

Analyze TypeScript/JavaScript code using the static-analysis CLI to measure 14 complexity metrics across 5 categories (control flow, data flow, cognitive load, information density, and composite), identify functions that exceed thresholds, then either generate structured refactoring prompts or act directly on the results.

## Prerequisites

The static-analysis CLI is bundled with this skill at `code/cli/dist/index.js`. On first use, install dependencies for both packages:

```bash
cd ${CLAUDE_PLUGIN_ROOT}/skills/complexity-sweep/code/core && npm install --omit=dev
cd ${CLAUDE_PLUGIN_ROOT}/skills/complexity-sweep/code/cli && npm install --omit=dev
```

`${CLAUDE_PLUGIN_ROOT}` is the code plugin's install directory, which Claude Code sets while a plugin skill runs. If it is unset (a loose copy of the skill), use the directory containing this SKILL.md instead.

To check if setup is needed, verify `${CLAUDE_PLUGIN_ROOT}/skills/complexity-sweep/code/cli/node_modules` exists. If not, run the install commands above.

The CLI executable path is: `${CLAUDE_PLUGIN_ROOT}/skills/complexity-sweep/code/cli/dist/index.js`

## Workflow

### Step 1: Determine Target Files

Determine which files to analyze based on the invocation context:

- **Explicit glob/path provided** — Use the user-supplied pattern directly.
- **Recently changed files** — Run `git diff --name-only HEAD~N -- '*.ts' '*.tsx' '*.js' '*.jsx'` (or `git diff --name-only --staged`, or `git diff --name-only main...HEAD`) to get changed files relevant to the review scope.
- **Validation after code generation** — Analyze only the files that were created or modified during the current session.

If no files match or the user hasn't specified a target, ask which files or directories to analyze.

### Step 2: Run the Analysis

Execute the CLI with JSON output and threshold-action none (to capture all results without exiting):

```bash
node ${CLAUDE_PLUGIN_ROOT}/skills/complexity-sweep/code/cli/dist/index.js \
  --format json \
  --threshold-action none \
  "<glob-or-file-patterns>"
```

To analyze specific files (e.g., from git diff), quote each path or pass them as positional args:

```bash
node ${CLAUDE_PLUGIN_ROOT}/skills/complexity-sweep/code/cli/dist/index.js \
  --format json \
  --threshold-action none \
  "src/api/handler.ts" "src/utils/parser.ts"
```

If the target repo has a cosmiconfig file (`.static-analysisrc.json`, `static-analysis.config.js`, etc.), the CLI picks it up automatically. To use an explicit config: add `--config <path>`.

### Step 3: Parse Results

The JSON output structure is:

```json
{
  "files": [{
    "filePath": "src/orders/process.ts",
    "functions": [{
      "name": "processOrder",
      "filePath": "src/orders/process.ts",
      "line": 42,
      "metrics": {
        "cyclomaticComplexity": 5,
        "essentialComplexity": 2,
        "peakLiveVariables": 8,
        "abcScore": 22.4,
        "halsteadEffort": 8500,
        "maintainabilityIndex": 52
      },
      "details": {
        "abcScore": { "a": 12, "b": 15, "c": 8 },
        "halsteadVolume": { "n1": 10, "n2": 18, "N1": 30, "N2": 40 }
      }
    }]
  }],
  "violations": [{
    "functionName": "processOrder",
    "filePath": "src/orders/process.ts",
    "line": 42,
    "metric": "peakLiveVariables",
    "value": 8,
    "threshold": 7,
    "severity": "warn"
  }]
}
```

**Key format details:**
- Function metrics are in `fn.metrics["metricName"]` (a `Record<string, number>`), not as top-level fields.
- Multi-valued metrics (ABC, Halstead) include a `details` object with sub-components (e.g., the `(A, B, C)` vector for ABC).
- Maintainability Index uses **inverted semantics**: lower values are worse. Its thresholds have `lowerIsBad: true` — violations fire when value is *below* the threshold.

Group violations by `filePath` and `functionName` to build a per-function violation profile.

If there are **no violations**, report that all functions are within acceptable thresholds and stop.

### Step 4: Review Flagged Code

For each function with violations:

1. Read the source file at the flagged line number to see the actual function implementation.
2. Load `references/metric-guidance.md` to understand what each violated metric means and which refactoring strategies apply.
3. Analyze the code to identify the specific constructs causing each metric to exceed its threshold (e.g., which nested `if` chains drive cyclomatic complexity, which early returns drive essential complexity).

### Step 5: Generate Refactoring Prompts or Act Directly

Based on user preference, either **generate a structured prompt** for each flagged function or **act directly** on the refactoring. Default to acting directly unless the user requests prompts.

#### Option A: Act Directly (Default)

For each flagged function, apply the appropriate refactoring strategies identified in Step 4. After refactoring, re-run the analysis (Step 2) on the modified files to verify metrics are now within thresholds.

#### Option B: Generate Structured Prompts

Load `references/refactoring-prompt-template.md` and produce one filled-in prompt per flagged function. Each prompt includes the violation data, a root cause analysis of which code constructs are driving each metric, and concrete refactoring recommendations.

### Step 6: Verify (When Acting Directly)

After applying refactoring changes, re-run the analysis on the modified files:

```bash
node ${CLAUDE_PLUGIN_ROOT}/skills/complexity-sweep/code/cli/dist/index.js \
  --format json \
  --threshold-action none \
  "<modified-file-paths>"
```

Compare before/after metrics. If any function still exceeds thresholds, iterate on the refactoring. Report the final metric values to confirm all functions are now within acceptable bounds.

## Sub-Skills

### Config Generation (`config/`)

To create or update an static-analysis config file for a target repo, follow the workflow in `config/CONFIG.md`. The config reference with full schema, defaults, merging behavior, and examples is at `config/config-reference.md`.

## Metric Reference

For detailed metric definitions, interpretation guidance, and refactoring strategies, read `references/metric-guidance.md`.

Quick summary of all 14 metrics:

### Control Flow Metrics (McCabe)
| Metric | Symbol | Measures |
|--------|--------|----------|
| Cyclomatic Complexity | v(G) | Independent execution paths (decision points) |
| Essential Complexity | ev(G) | Unstructured control flow (early returns, continue, labeled break, conditional throw) |
| Module Design Complexity | iv(G) | Branches containing function calls (coupling under conditions) |
| Global Data Complexity | gdv(G) | Mutable module-scoped variables referenced by the function |
| Specified Data Complexity | sdv(G) | Function parameters that influence branching decisions |

### Cognitive Load Metrics
| Metric | Symbol | Measures |
|--------|--------|----------|
| Peak Live Variables | PLV | Max variables simultaneously alive at any point (working memory load) |
| Variable Span | VSpan | Max lines between a variable's definition and last use |

### Operation Metrics
| Metric | Symbol | Measures |
|--------|--------|----------|
| ABC Score | ABC | Euclidean magnitude of (Assignments, Branches, Conditions) vector |
| Scope-Depth Weighted LOC | SDWL | Lines of code weighted by nesting depth |
| Scope-Depth Ratio | SDR | Ratio of weighted LOC to raw LOC (higher = more nesting) |

### Information Density Metrics (Halstead)
| Metric | Symbol | Measures |
|--------|--------|----------|
| Halstead Volume | HVol | Information content in bits (N * log2(n)) |
| Halstead Difficulty | HDiff | Error-proneness estimate ((n1/2) * (N2/n2)) |
| Halstead Effort | HEff | Total cognitive effort (D * V) |

### Composite Metrics
| Metric | Symbol | Measures | Direction |
|--------|--------|----------|-----------|
| Maintainability Index | MI | Composite of Halstead Volume + CC + LOC (0-100) | **Lower = worse** |

**AI-generated code signature:** The combination most reliably indicating "AI-generated code that needs refactoring" is: **low cyclomatic + high PLV + high ABC (A or B heavy)**. This is code with no branching complexity but dense with setup, intermediate state, and sequential SDK calls.

### Plugin Support

The CLI supports third-party metric plugins loaded via config:
```json
{
  "plugins": ["./my-custom-metric.js", "static-analysis-plugin-security"]
}
```
Plugins export a `MetricDefinition` (or array of them). See the static-analysis documentation for the plugin authoring API.
