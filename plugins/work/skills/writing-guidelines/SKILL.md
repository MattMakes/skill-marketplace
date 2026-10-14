---
name: writing-guidelines
description: "Review docs and prose for compliance with the Vercel Writing Guidelines (content type, voice and tone, banned words, concision, structure, AI-generated tells) and report findings in file:line form. Use when asked to review docs, check writing style, audit prose, review voice and tone, or check a page against the writing handbook."
argument-hint: "<file-or-pattern>"
license: MIT
metadata:
  author: vercel
  version: "1.0.0"
  upstream: "https://github.com/vercel-labs/writing-guidelines"
  source-commit: 83e2316b034cf572400513538e4e4da01c4cc742
---

# Writing Guidelines

Review files for compliance with Writing Guidelines.

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
https://raw.githubusercontent.com/vercel-labs/writing-guidelines/main/command.md
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
