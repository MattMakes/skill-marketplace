# Config Sub-Skill

Generate or update a `.static-analysisrc.json` configuration file for a target repository.

## When to Use

- A target repo has no static-analysis config and one is needed before analysis.
- The user explicitly asks to create, update, or tune thresholds/weights/globs.
- After an initial analysis reveals the defaults are too strict or too lenient for the codebase.

## Workflow

### Step 1: Check for Existing Config

Look for any cosmiconfig-compatible file in the target repo root:

```
.static-analysisrc
.static-analysisrc.json
.static-analysisrc.js
.static-analysisrc.cjs
static-analysis.config.js
static-analysis.config.cjs
```

Also check `package.json` for an `"static-analysis"` key.

If a config exists, read it and proceed to Step 3 (update flow).

### Step 2: Gather Preferences (New Config)

Ask the user about:

- **Strictness level**
  - `default` — Use built-in thresholds as-is.
  - `strict` — For critical services; tighter thresholds (see `config-reference.md` examples).
  - `relaxed` — For legacy codebases being incrementally improved; wider thresholds.
- **Languages** — Detect the languages of the target repo from these markers, and propose `include` and `exclude` globs for each language found:

  | Marker | Language | Suggested `include` | Suggested `exclude` |
  |--------|----------|---------------------|---------------------|
  | `tsconfig.json`, `package.json`, `*.ts`, `*.js` | TypeScript/JavaScript | `src/**/*.ts`, `src/**/*.js` | `**/*.test.ts`, `**/*.spec.ts`, `**/node_modules/**` |
  | `pyproject.toml`, `setup.py`, `*.py` | Python | `src/**/*.py` (or the package directory) | `**/test_*.py`, `**/*_test.py`, `**/conftest.py`, `**/.venv/**`, `**/venv/**`, `**/__pycache__/**`, `**/site-packages/**` |
  | `Cargo.toml`, `*.rs` | Rust | `src/**/*.rs`, or `crates/*/src/**/*.rs` for a workspace | `**/target/**` |

  The built-in `include` and `exclude` defaults already cover all 3 languages. Write `include` and `exclude` only when the repo layout needs different globs.
- **Include/exclude patterns** — Inspect the repo structure to suggest sensible defaults:
  - Single project: `src/**/*.ts`, `src/**/*.py` or `src/**/*.rs`
  - Monorepo: `packages/*/src/**/*.ts` or `crates/*/src/**/*.rs`
  - Check for existing patterns (e.g., `tsconfig.json` includes, `.eslintrc` overrides, `pyproject.toml` package paths, Cargo workspace `members`) and align.
- **Threshold action** — `"error"` (fail CI), `"warn"` (report only), or `"none"` (informational).
- **Weight adjustments** — Any constructs to weight differently (e.g., lower weight for `nullishCoalescing` or `ternary`).

### Step 3: Generate or Update Config

Load `config-reference.md` for the full config shape, defaults, and merging behavior.

**Key principle:** Generate a minimal config. Only include fields that differ from the CLI's built-in defaults — the tool merges partial configs automatically.

**Required override:** The skill's recommended baseline for cyclomatic complexity is `{ "warn": 5, "error": 7 }` (the CLI default is `{ "warn": 10, "error": 20 }`). Every generated config must include this override unless the user explicitly requests different values.

- **New config** — Build from preferences gathered in Step 2. Always include the cyclomatic complexity threshold override.
- **Update** — Read the existing config, apply the user's requested changes, and preserve existing customizations.

Write the result as `.static-analysisrc.json` in the target repo root.

### Step 4: Validate Config

The CLI performs **no config validation** — unknown keys are silently ignored, wrong types are accepted, and illogical values (e.g., `warn > error`) pass without complaint. The skill must validate before writing.

Check the generated config for:

| Check | Rule |
|-------|------|
| **Valid JSON** | Config must parse without errors |
| **Known keys only** | Top-level keys must be one of: `thresholds`, `weights`, `include`, `exclude`, `format`, `thresholdAction`, `sort`, `top`, `showSummary`, `plugins` |
| **Threshold structure** | Each threshold must have `warn` (number) and `error` (number). For most metrics: `warn < error`. For `maintainabilityIndex` (and any metric with `lowerIsBad: true`): `warn > error`. |
| **Threshold metric names** | Must be one of: `cyclomaticComplexity`, `essentialComplexity`, `moduleDesignComplexity`, `globalDataComplexity`, `specifiedDataComplexity`, `peakLiveVariables`, `variableSpan`, `abcScore`, `scopeDepthWeightedLoc`, `scopeDepthRatio`, `halsteadVolume`, `halsteadDifficulty`, `halsteadEffort`, `maintainabilityIndex` |
| **Weight keys** | `weights.cyclomaticComplexity` keys must be one of: `if`, `elseIf`, `for`, `forIn`, `forOf`, `while`, `doWhile`, `case`, `catch`, `logicalAnd`, `logicalOr`, `nullishCoalescing`, `ternary`, `tryOperator` |
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
