# Static Analysis Configuration Reference

The CLI uses cosmiconfig with the module name `static-analysis`, which automatically searches for config in these locations (in order of priority):

1. `package.json` → `"static-analysis"` field
2. `.static-analysisrc` (JSON or YAML)
3. `.static-analysisrc.json`, `.static-analysisrc.js`, `.static-analysisrc.cjs`
4. `static-analysis.config.js`, `static-analysis.config.cjs`

An explicit path can be passed via `--config <path>`.

## Full Config Shape with Defaults

Note: The CLI's built-in default for cyclomaticComplexity is `{ "warn": 10, "error": 20 }`, but **this skill uses `{ "warn": 5, "error": 7 }` as the recommended baseline**. Generated configs should always include this override.

```json
{
  "thresholds": {
    "cyclomaticComplexity": { "warn": 5, "error": 7 },
    "essentialComplexity": { "warn": 4, "error": 8 },
    "moduleDesignComplexity": { "warn": 10, "error": 20 },
    "globalDataComplexity": { "warn": 3, "error": 6 },
    "specifiedDataComplexity": { "warn": 4, "error": 8 },
    "peakLiveVariables": { "warn": 7, "error": 10 },
    "variableSpan": { "warn": 20, "error": 35 },
    "abcScore": { "warn": 20, "error": 30 },
    "scopeDepthWeightedLoc": { "warn": 45, "error": 70 },
    "scopeDepthRatio": { "warn": 1.7, "error": 2.0 },
    "halsteadVolume": { "warn": 1000, "error": 2000 },
    "halsteadDifficulty": { "warn": 30, "error": 50 },
    "halsteadEffort": { "warn": 4000, "error": 8000 },
    "maintainabilityIndex": { "warn": 60, "error": 40, "lowerIsBad": true }
  },
  "weights": {
    "cyclomaticComplexity": {
      "if": 1,
      "elseIf": 1,
      "for": 1,
      "forIn": 1,
      "forOf": 1,
      "while": 1,
      "doWhile": 1,
      "case": 1,
      "catch": 1,
      "logicalAnd": 1,
      "logicalOr": 1,
      "nullishCoalescing": 1,
      "ternary": 1,
      "tryOperator": 1
    }
  },
  "include": ["**/*.ts", "**/*.js", "**/*.py", "**/*.rs", "**/*.gd"],
  "exclude": [
    "**/*.test.ts", "**/*.spec.ts", "**/node_modules/**",
    "**/test_*.py", "**/*_test.py", "**/conftest.py",
    "**/.venv/**", "**/venv/**", "**/__pycache__/**", "**/site-packages/**",
    "**/target/**",
    "**/test_*.gd", "**/*_test.gd", "**/*Test.gd",
    "**/addons/**", "**/.godot/**", "**/.import/**"
  ],
  "format": "table",
  "thresholdAction": "error",
  "sort": "cyclomaticComplexity",
  "top": null,
  "showSummary": true,
  "plugins": []
}
```

### Languages and file routing

The CLI routes each file by extension:

| Extensions | Backend | `language` in JSON output |
|------------|---------|---------------------------|
| `.ts .tsx .mts .cts .js .jsx .mjs .cjs` | ts-morph | `typescript` |
| `.py` | Python (web-tree-sitter) | `python` |
| `.rs` | Rust (web-tree-sitter) | `rust` |
| `.gd` | GDScript, Godot 4 (web-tree-sitter) | `gdscript` |

The CLI ignores every other file. The 14 metrics, thresholds and directions are the same for all languages in this release. The shared thresholds were checked on 19,096 functions in Python, Rust and TypeScript corpora, with 0 crashes and 0 NaN values. No threshold value changed.

Two default `exclude` entries can leave out real source. `**/*Test.gd` also excludes a non-test file such as `HitTest.gd`, and `**/addons/**` also excludes a project's own plugin code. Set `exclude` without these globs to keep them.

### Glob matching and excludes

`include` and `exclude` globs use picomatch with `dot: true`, so `**` also matches dot-directories such as `.venv`. A glob matches either the absolute path or the path relative to the current directory.

**Behavior change:** Before this release the glob matcher was broken and the default `exclude` globs matched almost nothing. A default TypeScript run now leaves out `*.test.ts` and `*.spec.ts` files. On `core/src/**/*.ts` the run analyzed 56 files before and analyzes 37 files now. To analyze test files, set `exclude` without the test globs.

### Cyclomatic weight keys per language

Each weight key applies to the constructs below. A key with `none` has no construct in that language. Weight keys `forIn`, `forOf`, `doWhile` and `nullishCoalescing` apply to TypeScript/JavaScript only.

| Weight key | TypeScript/JavaScript | Python | Rust | GDScript |
|------------|-----------------------|--------|------|----------|
| `if` | `if` | `if_statement`; comprehension `if` clause; `case` guard | `if` (also `if let`) outside an `else`; `match` arm guard; let-else | `if`; `when` guard |
| `elseIf` | `else if` | `elif` | `if` that is the direct child of an `else` | `elif` |
| `for` | `for(;;)` | `for` (also `async for`); comprehension `for` clause | `for` | `for` |
| `while` | `while` | `while` | `while` (also `while let`) | `while` |
| `case` | `case` (not `default`) | `case`, except a guard-free `case _:` | `match` arm, except a guard-free `_` arm | `match` section, except a guard-free `_` section |
| `catch` | `catch` | `except` (also `except*`) | none | none |
| `logicalAnd` | `&&` | `and` | `&&` (each `&&` in a let chain) | `and`, `&&` |
| `logicalOr` | `\|\|` | `or` | `\|\|` | `or`, `\|\|` |
| `ternary` | `?:` | `x if c else y` | none | `x if c else y` |
| `tryOperator` | none | none | `expr?` | none |

Not counted in Python, Rust and GDScript: `else`, `finally`, `with`, `assert`, `try`, `loop` (no condition), `return`, `break`, `continue`, `raise` and macro invocations.

### Threshold Direction

Most metrics use `warn < error` (higher values are worse). **Maintainability Index is the exception** — it uses `lowerIsBad: true` with `warn > error` because lower MI values indicate worse maintainability.

When `lowerIsBad: true`:
- `warn: 60` means "warn when value drops to 60 or below"
- `error: 40` means "error when value drops to 40 or below"

### Plugins

The `plugins` array specifies paths to custom metric plugins:

```json
{
  "plugins": [
    "./my-custom-metric.js",
    "static-analysis-plugin-security"
  ]
}
```

Each plugin exports a `MetricDefinition` (or array of them). Relative paths are resolved from the config file's directory. npm package names are resolved from `node_modules`.

## Config Merging Behavior

The config is a partial — only override what needs to change. Merging works as follows:

1. **Top-level fields** — file config overrides defaults
2. **thresholds** — merged per-metric (override just one metric's thresholds and keep the rest)
3. **weights.cyclomaticComplexity** — merged per-construct (override just `"if": 2` and keep the rest at default 1)
4. **CLI flags** (`--format`, `--threshold-action`, `--sort`, `--top`, `--no-summary`, `--metrics`) override everything

## CLI Flags

| Flag | Description |
|------|-------------|
| `--format <table\|json\|pretty>` | Output format (default: table for TTY, json for piped) |
| `--config <path>` | Explicit config file path |
| `--threshold-action <warn\|error\|none>` | Action when thresholds exceeded (default: error) |
| `--sort <metric>` | Sort by metric key (default: cyclomaticComplexity). Validated against registered metrics. |
| `--top <n>` | Show only top N functions |
| `--no-summary` | Skip summaries |
| `--metrics <keys>` | Comma-separated list of metric keys to display (filters display only, all metrics still computed) |

## Minimal Config Examples

### Override only one threshold

```json
{
  "thresholds": {
    "cyclomaticComplexity": { "warn": 15, "error": 25 }
  }
}
```

### Custom include/exclude for a monorepo

```json
{
  "include": ["packages/api/src/**/*.ts", "packages/shared/src/**/*.ts"],
  "exclude": ["**/*.test.ts", "**/*.spec.ts", "**/__mocks__/**", "**/node_modules/**"]
}
```

### Stricter thresholds for a critical service

```json
{
  "thresholds": {
    "cyclomaticComplexity": { "warn": 6, "error": 12 },
    "essentialComplexity": { "warn": 3, "error": 5 },
    "peakLiveVariables": { "warn": 5, "error": 8 },
    "abcScore": { "warn": 15, "error": 25 },
    "halsteadEffort": { "warn": 3000, "error": 7000 },
    "maintainabilityIndex": { "warn": 65, "error": 45, "lowerIsBad": true }
  },
  "thresholdAction": "error"
}
```

### Python repository

```json
{
  "include": ["src/**/*.py"],
  "exclude": ["**/test_*.py", "**/*_test.py", "**/conftest.py", "**/.venv/**", "**/__pycache__/**", "**/migrations/**"],
  "thresholds": {
    "cyclomaticComplexity": { "warn": 5, "error": 7 }
  }
}
```

### Rust workspace

```json
{
  "include": ["crates/*/src/**/*.rs"],
  "exclude": ["**/target/**", "**/tests/**", "**/benches/**"],
  "thresholds": {
    "cyclomaticComplexity": { "warn": 5, "error": 7 }
  }
}
```

### Godot 4 project

```json
{
  "include": ["scripts/**/*.gd"],
  "exclude": ["**/test_*.gd", "**/*_test.gd", "**/addons/**", "**/.godot/**"],
  "thresholds": {
    "cyclomaticComplexity": { "warn": 5, "error": 7 }
  }
}
```

### Weight ternary and nullish coalescing lower

```json
{
  "weights": {
    "cyclomaticComplexity": {
      "ternary": 0.5,
      "nullishCoalescing": 0
    }
  }
}
```

### Focus on AI-generated code patterns

```json
{
  "thresholds": {
    "peakLiveVariables": { "warn": 6, "error": 9 },
    "variableSpan": { "warn": 15, "error": 25 },
    "abcScore": { "warn": 15, "error": 25 },
    "halsteadEffort": { "warn": 4000, "error": 8000 },
    "maintainabilityIndex": { "warn": 65, "error": 45, "lowerIsBad": true }
  }
}
```
