---
name: web-design-guidelines
description: Review UI code for compliance with the Vercel Web Interface Guidelines, a terse checklist covering accessibility, focus states, forms, animation, typography, layout, color, and performance for product UI, and report findings as file:line. Use when asked to review UI code against a design checklist, check accessibility of components, or audit product UI standards.
argument-hint: <file-or-pattern>
metadata:
  author: Vercel Labs
  upstream: https://github.com/vercel-labs/web-interface-guidelines
  upstream-commit: 4e799d45c17aec1498c269287a83b9dba22b966b
---
# Web Interface Guidelines

Review files for compliance with Web Interface Guidelines.

## How It Works

1. Load the pinned guidelines from [`references/guidelines.md`](references/guidelines.md) — this is the default, reproducible execution path
2. Optionally, fetch the latest guidelines from the upstream URL below and diff against the pinned snapshot to see if anything has changed
3. Read the specified files (or prompt user for files/pattern)
4. Check against all rules in the guidelines
5. Output findings in the terse `file:line` format

## Guidelines Source

**Default (pinned):** The vendored copy at [`references/guidelines.md`](references/guidelines.md) is the default execution path. It is a pinned snapshot of the upstream guidelines and guarantees the skill produces reproducible results in any runtime environment.

**Upstream (live):** For users who want the very latest rules, the live source is available at:

```
https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md
```

Fetching the live version is optional — the pinned snapshot is always the baseline.

## Usage

When a user provides a file or pattern argument:
1. Load [`references/guidelines.md`](references/guidelines.md) as the default source
2. Optionally fetch the upstream URL to check for updates
3. Read the specified files
4. Apply all rules from the guidelines
5. Output findings using the format specified in the guidelines

If no files specified, ask the user which files to review.
