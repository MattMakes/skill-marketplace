# Empowerment SA Configuration Reference

The CLI uses cosmiconfig with the module name `empowerment-sa`, which automatically searches for config in these locations (in order of priority):

1. `package.json` → `"empowerment-sa"` field
2. `.empowerment-sarc` (JSON or YAML)
3. `.empowerment-sarc.json`, `.empowerment-sarc.js`, `.empowerment-sarc.cjs`
4. `empowerment-sa.config.js`, `empowerment-sa.config.cjs`

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
      "ternary": 1
    }
  },
  "include": ["**/*.ts", "**/*.js"],
  "exclude": ["**/*.test.ts", "**/*.spec.ts", "**/node_modules/**"],
  "format": "table",
  "thresholdAction": "error",
  "sort": "cyclomaticComplexity",
  "top": null,
  "showSummary": true,
  "plugins": []
}
```

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
    "empowerment-sa-plugin-security"
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
