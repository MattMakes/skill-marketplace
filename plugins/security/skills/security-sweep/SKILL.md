---
name: security-sweep
description: Orchestrate a multi-agent security audit of the current repo. Use when user says "run a security sweep", "do a security audit", "audit this repo for vulnerabilities", "check for secrets and CVEs", "scan for OWASP issues", "do a deep security pass" to invoke.
---

# security-sweep — orchestration runbook

You are the orchestrator. You drive a multi-phase pipeline of subagents. Your job is dispatch, wait, and route — never paraphrase.

## The most important rule

**Subagent replies are status lines, not data.** Every subagent in this pipeline replies with EXACTLY one of:

```
WROTE <path>
ERROR <one-line description>
```

You may NOT read findings, evidence, exploits, STRIDE blocks, or any analysis from a subagent's reply — those are guaranteed to be one-line statuses. **Always Read the file directly when you need the data.** If you ever find yourself paraphrasing a subagent's reply, stop and Read the actual file.

This rule prevents content drift across pipeline stages. Subagents are full LLMs and would otherwise paraphrase, reorder, or selectively quote findings. Files are the source of truth.

## Pipeline overview

```
Phase 0  scripts/detect-stack.js           → 00-stack-profile.json
Phase 1  scripts/plan-dispatch.js          → 01-dispatch-plan.json
Phase 2  ≤6 auditor agents in parallel     → 02-auditors/<agent>/findings.jsonl
                                           + 03-stride/components/*.md
Phase 3  scripts/queue-findings.js         → 04-verifier-queue/f-NNNNN.json
Phase 4  ≤8 verify-team-lead in parallel,  → 05-verifier-results/f-NNNNN.json
         each fans out ≤10 fp-verifier
Phase 5  exploit-author per qualifier      → 06-exploits/f-NNNNN.md
         (CONFIRMED + confidence ≥ 8)
Phase 6  scripts/assemble-report.js        → 07-report-input.json
         scripts/write-report.js           → 08-cso-report.md
```

Wall clock: ~10 minutes for a typical repo.

---

## Phase 0 — Detect stack

Run from the repo root (the directory you want to audit):

```
node ${CLAUDE_PLUGIN_ROOT}/skills/security-sweep/scripts/detect-stack.js --repo-root $(pwd)
```

The script prints two lines:

```
RUN_ID=2026-05-15T16-22-13Z
WROTE /abs/path/to/ai_docs/security-sweep/runs/2026-05-15T16-22-13Z/00-stack-profile.json
```

**Capture RUN_ID.** You will pass it to every subsequent script and embed it in every subagent prompt. Set `RUN_DIR` = `<repo-root>/ai_docs/security-sweep/runs/<RUN_ID>`.

## Phase 1 — Plan dispatch

```
node ${CLAUDE_PLUGIN_ROOT}/skills/security-sweep/scripts/plan-dispatch.js --run-id <RUN_ID>
```

Then `Read` the dispatch plan at `<RUN_DIR>/01-dispatch-plan.json`. It tells you which auditors to run and which to skip with reasons.

## Phase 1.5 — Resolve language catalog

For each auditor that will run in Phase 2 EXCEPT `skill-supply-chain`:
1. Read `stack_profile.primary_language` from `00-stack-profile.json`.
2. Map it to a catalog folder using this table:

   | primary_language | catalog folder |
   |---|---|
   | `dotnet` | `dotnet` |
   | `python` | `python` |
   | `javascript` | `nodejs` |
   | `typescript` | `nodejs` |
   | `go` | `golang` |
   | (anything else, including `none`) | (no catalog — skip inlining) |

3. For each running auditor `<agent>` (excluding `skill-supply-chain`), Read:
   `<skill-dir>/catalogs/<folder>/<agent-suffix>.md`

   where `<agent-suffix>` is:
   - `owasp-auditor` → `owasp`
   - `secret-scanner` → `secrets`
   - `supply-chain-auditor` → `supply-chain`
   - `llm-security` → `llm-security`
   - `stride-modeler` → `stride`

4. Hold the contents in memory; you will inline each into the matching subagent's prompt in Phase 2. If the catalog file does not exist, you will inline a single line `(no catalog — language not yet supported)` instead.

`<skill-dir>` is `${CLAUDE_PLUGIN_ROOT}/skills/security-sweep/`, the directory containing this SKILL.md (`${CLAUDE_PLUGIN_ROOT}` is the code plugin's install directory, set by Claude Code while a plugin skill runs).

`skill-supply-chain` does NOT receive a `LANGUAGE_CATALOG` — it audits Claude skill files and is language-agnostic.

## Phase 2 — Dispatch auditors in parallel

For every auditor where `dispatch_plan.auditors[<name>].run === true`, spawn one Task subagent. Issue ALL auditor Tasks in a single message (parallel fan-out).

### Auditor prompt template (most agents)

For `owasp-auditor`, `secret-scanner`, `supply-chain-auditor`, `llm-security`:

```
You are an instance of <AGENT-NAME>. Your invocation:

OUT_PATH: <RUN_DIR>/02-auditors/<AGENT-NAME>/findings.jsonl
REPO_ROOT: <REPO-ROOT-ABS>
STACK_PROFILE: <RUN_DIR>/00-stack-profile.json
LANGUAGE_CATALOG: <inline the verbatim contents of the resolved catalog file as a fenced markdown block, or the placeholder line if none>

Follow your system prompt exactly. Create the parent directory if it does not exist.

Reply with EXACTLY one line:
  WROTE <OUT_PATH>
  ERROR <one-line description>

Do NOT include findings, summaries, counts, excerpts, or commentary in your reply.
```

### `skill-supply-chain` prompt — extra args

```
You are an instance of skill-supply-chain. Your invocation:

OUT_PATH: <RUN_DIR>/02-auditors/skill-supply-chain/findings.jsonl
REPO_ROOT: <REPO-ROOT-ABS>
STACK_PROFILE: <RUN_DIR>/00-stack-profile.json
SKILL_PATHS: <JSON array from stack-profile.skill_paths>
SCAN_USER_SKILLS: false

Follow your system prompt exactly. Reply with EXACTLY one line.
```

(Set `SCAN_USER_SKILLS: true` only if the user has explicitly asked you to also scan `~/.claude/skills/`.)

### `stride-modeler` prompt — different output structure

```
You are an instance of stride-modeler. Your invocation:

COMPONENTS_OUT_DIR: <RUN_DIR>/03-stride/components
FINDINGS_OUT_PATH: <RUN_DIR>/02-auditors/stride-modeler/findings.jsonl
REPO_ROOT: <REPO-ROOT-ABS>
STACK_PROFILE: <RUN_DIR>/00-stack-profile.json
LANGUAGE_CATALOG: <inline the verbatim contents of the resolved catalog file as a fenced markdown block, or the placeholder line if none>

Follow your system prompt exactly. Create both parent directories if they do not exist.

Reply with EXACTLY one line:
  WROTE <COMPONENTS_OUT_DIR> <FINDINGS_OUT_PATH>
  ERROR <one-line description>
```

(stride-modeler writes to 02-auditors/ for the JSONL so `queue-findings.js` picks up STRIDE findings the same way as auditor findings, and to 03-stride/components/ for per-component Markdown blocks.)

### Wait for all replies

Each auditor replies with a single `WROTE` or `ERROR` line. Do NOT Read or paraphrase their findings. Note any `ERROR` replies to surface to the user at the end.

## Phase 3 — Queue findings

```
node ${CLAUDE_PLUGIN_ROOT}/skills/security-sweep/scripts/queue-findings.js --run-id <RUN_ID>
```

The script reads every `02-auditors/*/findings.jsonl`, fingerprints, dedupes, and writes one JSON file per finding to `04-verifier-queue/f-NNNNN.json`. It prints:

```
WROTE <RUN_DIR>/04-verifier-queue (N findings)
```

Capture N. If N is 0, skip Phase 4 and go straight to Phase 6.

## Phase 4 — Verify (hierarchical fan-out)

Slice the N finding IDs into batches of 10. Spawn one `verify-team-lead` per batch (max 8 team-leads in a single fan-out).

If N > 80, run multiple waves: dispatch the first 8 team-leads, wait, then dispatch the next 8.

### verify-team-lead prompt

```
You are an instance of verify-team-lead. Your invocation:

RUN_DIR: <RUN_DIR>
FINDING_IDS: ["f-00001", "f-00002", "...", "f-00010"]

Follow your system prompt exactly. Reply with EXACTLY one line.
```

The team-lead spawns 10 fp-verifier subagents in parallel (its own fan-out, separate context window). Each verifier writes its result to `05-verifier-results/f-NNNNN.json` and replies `WROTE`. The team-lead aggregates only the reply statuses (never reads result files) and replies to you with a single `WROTE <status-file-path>` line.

**Critical:** Do NOT spawn `fp-verifier` directly from the orchestrator. Always go through `verify-team-lead`. The team-lead layer is what gives you parallelism above 10 (you can dispatch 8 team-leads in one fan-out, each with 10 verifiers, for 80 in flight).

## Phase 5 — Exploit-author for qualifying findings

Now read result files to decide who needs an exploit scenario. List `05-verifier-results/` and `Read` each `f-NNNNN.json`. Filter for:

```
result.verdict === "CONFIRMED" && result.confidence >= 8
```

For each qualifier, spawn one `exploit-author` Task. Max 10 in parallel; run multiple waves if there are more than 10 qualifiers.

### exploit-author prompt

```
You are an instance of exploit-author. Your invocation:

QUEUE_ITEM: <RUN_DIR>/04-verifier-queue/<id>.json
VERIFIER_RESULT: <RUN_DIR>/05-verifier-results/<id>.json
EXPLOIT_OUT: <RUN_DIR>/06-exploits/<id>.md

Follow your system prompt exactly. Create the parent directory if it does not exist.

Reply with EXACTLY one line:
  WROTE <EXPLOIT_OUT>
  ERROR <one-line description>
```

Wait for all to return. Note any UNREACHABLE_FROM_ATTACKER_PERSPECTIVE outputs are still written by the script — `assemble-report.js` will pick them up.

## Phase 6 — Assemble + write report

Two scripts in sequence:

```
node ${CLAUDE_PLUGIN_ROOT}/skills/security-sweep/scripts/assemble-report.js --run-id <RUN_ID>
node ${CLAUDE_PLUGIN_ROOT}/skills/security-sweep/scripts/write-report.js --run-id <RUN_ID>
```

The first script collects every queued finding, its verifier result, its exploit (if any), and every STRIDE block into `07-report-input.json`. The second script templates the final Markdown deterministically into `08-cso-report.md`.

Both scripts are pure templating — no LLM, no paraphrasing, idempotent.

## Phase 7 — Report to user

Tell the user the report path. Read the first ~40 lines of `08-cso-report.md` and show the user the Executive Summary section. Do NOT paraphrase the rest of the report — direct them to the file.

Example final reply:

```
Security sweep complete. Report at:
  ai_docs/security-sweep/runs/2026-05-15T16-22-13Z/08-cso-report.md

Executive summary:

[paste the actual Executive Summary section from the report file]
```

---

## Things you MUST NOT do

1. **Do not Read any agent's reply for content.** It's a status line. Read the file the status points at.
2. **Do not paraphrase findings, evidence, exploits, or STRIDE blocks.** Quote them verbatim from the file or omit them.
3. **Do not skip the team-lead layer.** Spawning fp-verifier directly works for ≤10 findings but breaks the design as soon as there are more.
4. **Do not invent findings, severities, or fixes.** If the file says nothing, say nothing.
5. **Do not edit any code in the audited repo.** Even fixing a finding the user mentions during the sweep is out of scope — file an issue or tell them.
6. **Do not change the OUTPUT CONTRACT block** when prompting subagents. The exact wording is what enforces the no-summarization property; weakening it makes the pipeline drift.

## Recovering from agent errors

If an auditor replies `ERROR`:
- Note which one. Do NOT skip to the next phase silently.
- Surface to the user: "owasp-auditor errored: <error message>. The report will be incomplete; should I re-run that one?"
- If the user says yes, re-dispatch only that auditor with the same prompt.

If a verifier returns `ERROR` (the team-lead surfaces this):
- Read `05-verifier-results/_team-lead-*.json` for the failed IDs.
- Re-dispatch a single `verify-team-lead` for just those IDs.

If a script fails (non-zero exit):
- Surface the script's stderr to the user verbatim.
- Do not try to "fix forward" by skipping the script — every downstream phase depends on the script's output file.

## Quick reference: phases at a glance

| Phase | Tool | Output file |
|---|---|---|
| 0 | `detect-stack.js` | `00-stack-profile.json` |
| 1 | `plan-dispatch.js` | `01-dispatch-plan.json` |
| 2 | up to 6 Tasks in parallel | `02-auditors/<agent>/findings.jsonl`, `03-stride/components/*.md` |
| 3 | `queue-findings.js` | `04-verifier-queue/f-NNNNN.json` |
| 4 | up to 8 Tasks (verify-team-lead) → each spawns up to 10 fp-verifier | `05-verifier-results/f-NNNNN.json` |
| 5 | up to 10 Tasks (exploit-author) per wave | `06-exploits/f-NNNNN.md` |
| 6 | `assemble-report.js` then `write-report.js` | `07-report-input.json`, `08-cso-report.md` |
