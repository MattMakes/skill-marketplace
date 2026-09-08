# Config Sub-Skill

Generate or update an `.empowerment-sarc.json` configuration file for a target repository.

## When to Use

- A target repo has no empowerment-sa config and one is needed before analysis.
- The user explicitly asks to create, update, or tune thresholds/weights/globs.
- After an initial analysis reveals the defaults are too strict or too lenient for the codebase.

## Workflow

### Step 1: Check for Existing Config

Look for any cosmiconfig-compatible file in the target repo root:

```
.empowerment-sarc
.empowerment-sarc.json
.empowerment-sarc.js
.empowerment-sarc.cjs
empowerment-sa.config.js
empowerment-sa.config.cjs
```

Also check `package.json` for an `"empowerment-sa"` key.

If a config exists, read it and proceed to Step 3 (update flow).

### Step 2: Gather Preferences (New Config)

Ask the user about:

- **Strictness level**
  - `default` — Use built-in thresholds as-is.
  - `strict` — For critical services; tighter thresholds (see `config-reference.md` examples).
  - `relaxed` — For legacy codebases being incrementally improved; wider thresholds.
- **Include/exclude patterns** — Inspect the repo structure to suggest sensible defaults:
  - Single project: `src/**/*.ts`
  - Monorepo: `packages/*/src/**/*.ts`
  - Check for existing patterns (e.g., `tsconfig.json` includes, `.eslintrc` overrides) and align.
- **Threshold action** — `"error"` (fail CI), `"warn"` (report only), or `"none"` (informational).
- **Weight adjustments** — Any constructs to weight differently (e.g., lower weight for `nullishCoalescing` or `ternary`).

### Step 3: Generate or Update Config

Load `config-reference.md` for the full config shape, defaults, and merging behavior.

**Key principle:** Generate a minimal config. Only include fields that differ from the CLI's built-in defaults — the tool merges partial configs automatically.

**Required override:** The skill's recommended baseline for cyclomatic complexity is `{ "warn": 5, "error": 7 }` (the CLI default is `{ "warn": 10, "error": 20 }`). Every generated config must include this override unless the user explicitly requests different values.

- **New config** — Build from preferences gathered in Step 2. Always include the cyclomatic complexity threshold override.
- **Update** — Read the existing config, apply the user's requested changes, and preserve existing customizations.

Write the result as `.empowerment-sarc.json` in the target repo root.

### Step 4: Validate Config

The CLI performs **no config validation** — unknown keys are silently ignored, wrong types are accepted, and illogical values (e.g., `warn > error`) pass without complaint. The skill must validate before writing.

Check the generated config for:

| Check | Rule |
|-------|------|
| **Valid JSON** | Config must parse without errors |
| **Known keys only** | Top-level keys must be one of: `thresholds`, `weights`, `include`, `exclude`, `format`, `thresholdAction`, `sort`, `top`, `showSummary`, `plugins` |
| **Threshold structure** | Each threshold must have `warn` (number) and `error` (number). For most metrics: `warn < error`. For `maintainabilityIndex` (and any metric with `lowerIsBad: true`): `warn > error`. |
| **Threshold metric names** | Must be one of: `cyclomaticComplexity`, `essentialComplexity`, `moduleDesignComplexity`, `globalDataComplexity`, `specifiedDataComplexity`, `peakLiveVariables`, `variableSpan`, `abcScore`, `scopeDepthWeightedLoc`, `scopeDepthRatio`, `halsteadVolume`, `halsteadDifficulty`, `halsteadEffort`, `maintainabilityIndex` |
| **Weight keys** | `weights.cyclomaticComplexity` keys must be one of: `if`, `elseIf`, `for`, `forIn`, `forOf`, `while`, `doWhile`, `case`, `catch`, `logicalAnd`, `logicalOr`, `nullishCoalescing`, `ternary` |
| **Weight values** | Must be non-negative numbers |
| **Format** | Must be `"table"`, `"json"`, or `"pretty"` |
| **Threshold action** | Must be `"warn"`, `"error"`, or `"none"` |
| **Sort** | Must be a valid metric name (any of the threshold metric names above) |
| **Globs** | `include` and `exclude` must be arrays of strings |
| **Plugins** | `plugins` must be an array of strings (file paths or npm package names) |

Report any issues found and fix them before writing the file.

### Step 5: Smoke Test

Run a quick analysis against a small sample of the repo to verify the config works end-to-end:

```bash
node <skill-directory>/packages/cli/dist/index.js \
  --format json \
  --threshold-action none \
  --top 5 \
  --config <path-to-new-config>
```

Report the top 5 results so the user can sanity-check whether thresholds feel right.
