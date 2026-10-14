---
name: "autoresearch-agent"
description: "Autonomous experiment loop that optimizes any file by a measurable metric. Inspired by Karpathy's autoresearch. The agent edits a target file, runs a fixed evaluation, keeps improvements (git commit), discards failures (git reset), and loops indefinitely. Use when: user wants to optimize code speed, reduce bundle/image size, improve test pass rate, optimize prompts, improve content quality (headlines, copy, CTR), or run any measurable improvement loop. Requires: a target file, an evaluation command that outputs a metric, and a git repo."
license: MIT
metadata:
  version: 2.0.0
  author: Alireza Rezvani
  category: engineering
  updated: 2026-03-13
---

# Autoresearch Agent

> You sleep. The agent experiments. You wake up to results.

Autonomous experiment loop inspired by [Karpathy's autoresearch](https://github.com/karpathy/autoresearch). The agent edits one file, runs a fixed evaluation, keeps improvements, discards failures, and loops indefinitely.

Not one guess — fifty measured attempts, compounding.

---

## Commands

The upstream package exposed these as five slash commands; here they are flows of this one
skill, driven by the three scripts in `scripts/`. In every command below, `$S` is
`${CLAUDE_PLUGIN_ROOT}/skills/autoresearch-agent/scripts`.

| Flow | What it does |
|------|-------------|
| **setup** | Set up a new experiment interactively |
| **run** | Run a single experiment iteration |
| **loop** | Start an autonomous loop with a configurable interval (10m, 1h, daily, weekly, monthly) |
| **status** | Show dashboard and results |
| **resume** | Resume a paused experiment |

### setup

If the user gave the parameters, pass them straight to `setup_experiment.py` (see Setup
below). If not, collect each one at a time:

1. **Domain** — "What domain? (engineering, marketing, content, prompts, custom)"
2. **Name** — "Experiment name? (e.g., api-speed, blog-titles)"
3. **Target file** — "Which file to optimize?" Verify it exists.
4. **Eval command** — "How to measure it? (e.g., pytest bench.py, python evaluate.py)"
5. **Metric** — "What metric does the eval output? (e.g., p50_ms, ctr_score)"
6. **Direction** — "Is lower or higher better?"
7. **Evaluator** (optional) — show `python3 "$S/setup_experiment.py" --list-evaluators`. "Use a built-in evaluator, or your own?"
8. **Scope** — "Store in project (.autoresearch/) or user (~/.autoresearch/)?"

Then run `setup_experiment.py` with the collected parameters. `--list` shows existing
experiments. Afterwards report the experiment path and branch name, whether the eval
command worked and the baseline metric, and offer **run** (one iteration) or **loop**.

### run

Exactly ONE iteration: if no experiment was named, run `setup_experiment.py --list` and ask
the user to pick. Then follow the Agent Protocol below (load context, decide one change,
edit, commit, evaluate) and report the result: **KEEP** "Improvement! {metric}: {value}
({delta} from previous best)", **DISCARD** "No improvement. {metric}: {value} vs best
{best}. Reverted.", **CRASH** "Evaluation failed: {reason}. Reverted."

### loop

A recurring loop at a user-selected interval, using Claude Code's in-session scheduler
(`CronCreate` / `CronDelete`; the `/loop` skill is the same mechanism).

1. Resolve the experiment (list and let the user pick if needed).
2. Select the interval if not given: every 10 minutes (rapid — stay and watch), every hour
   (background — check back later), daily at ~9am (overnight), weekly on Monday
   (long-running), monthly on the 1st (slow). Cron expressions: `*/10 * * * *` (10m),
   `7 * * * *` (1h), `57 8 * * *` (daily), `57 8 * * 1` (weekly), `57 8 1 * *` (monthly).
3. Create the recurring job with this prompt, filled in:

```
You are running autoresearch experiment "{domain}/{name}".

1. Read .autoresearch/{domain}/{name}/config.cfg for: target, evaluate_cmd, metric, metric_direction
2. Read .autoresearch/{domain}/{name}/program.md for strategy and constraints
3. Read .autoresearch/{domain}/{name}/results.tsv for experiment history
4. Run: git checkout autoresearch/{domain}/{name}

Then do exactly ONE iteration:
- Review results.tsv: what worked, what failed, what hasn't been tried
- Edit the target file with ONE change (strategy escalation based on run count)
- Commit: git add {target} && git commit -m "experiment: {description}"
- Evaluate: python3 <absolute path of $S>/run_experiment.py --experiment {domain}/{name} --single
- Read the output (KEEP/DISCARD/CRASH)

Rules:
- ONE change per experiment
- NEVER modify the evaluator
- If 5 consecutive crashes in results.tsv, delete this cron job and alert
- After every 10 experiments, update Strategy section of program.md

Current best metric: {read from results.tsv or "no baseline yet"}
Total experiments so far: {count from results.tsv}
```

4. Write `.autoresearch/{domain}/{name}/loop.json` with `cron_id`, `interval`, `started`
   (ISO timestamp) and `experiment`.
5. Confirm: interval, cron ID, how to check progress (**status**) and how to stop.

**Stopping:** read `loop.json` for the cron ID, delete the job, delete `loop.json`, confirm
"Loop stopped for {experiment}. {n} experiments completed."

**Limitations:** scheduled jobs auto-expire (3 days); re-run **loop** to restart and it picks up
where it left off, since results persist. One loop per experiment. Concurrent experiments
only on different git branches (the default — each gets `autoresearch/{domain}/{name}`).

### status

`log_results.py` as in Viewing Results below (`--experiment`, `--domain`, `--dashboard`,
`--format csv|markdown --output <file>`). For each experiment also `cat
.autoresearch/{domain}/{name}/loop.json 2>/dev/null` and, if it exists, show
`Active loop: every {interval} (cron ID: {id}, started: {date})`.

### resume

1. If no experiment was named, `setup_experiment.py --list`; show status for each
   (active/paused/done from results.tsv age) and let the user pick.
2. Load full context: `git checkout autoresearch/{domain}/{name}`, read `config.cfg`,
   `program.md`, `results.tsv`, and `git log --oneline -20`.
3. Summarize: target, metric and direction, totals (kept / discarded / crashed), best and
   delta from baseline, the last experiment and its result, and recent patterns by kind of
   change (what was kept, what was discarded, what looks promising).
4. Ask: single iteration (**run**), start a loop (**loop**), or just review the results.

---

## When This Skill Activates

Recognize these patterns from the user:

- "Make this faster / smaller / better"
- "Optimize [file] for [metric]"
- "Improve my [headlines / copy / prompts]"
- "Run experiments overnight"
- "I want to get [metric] from X to Y"
- Any request involving: optimize, benchmark, improve, experiment loop, autoresearch

If the user describes a target file + a way to measure success → this skill applies.

---

## Setup

### First Time — Create the Experiment

Run the setup script. The user decides where experiments live:

**Project-level** (inside repo, git-tracked, shareable with team):
```bash
S=${CLAUDE_PLUGIN_ROOT}/skills/autoresearch-agent/scripts
python3 "$S/setup_experiment.py" \
  --domain engineering \
  --name api-speed \
  --target src/api/search.py \
  --eval "pytest bench.py --tb=no -q" \
  --metric p50_ms \
  --direction lower \
  --scope project
```

**User-level** (personal, in `~/.autoresearch/`):
```bash
python3 "$S/setup_experiment.py" \
  --domain marketing \
  --name medium-ctr \
  --target content/titles.md \
  --eval "python evaluate.py" \
  --metric ctr_score \
  --direction higher \
  --evaluator llm_judge_content \
  --scope user
```

The `--scope` flag determines where `.autoresearch/` lives:
- `project` (default) → `.autoresearch/` in the repo root. Experiment definitions are git-tracked. Results are gitignored.
- `user` → `~/.autoresearch/` in the home directory. Everything is personal.

### What Setup Creates

```
.autoresearch/
├── config.yaml                        ← Global settings
├── .gitignore                         ← Ignores results.tsv, *.log
└── {domain}/{experiment-name}/
    ├── program.md                     ← Objectives, constraints, strategy
    ├── config.cfg                     ← Target, eval cmd, metric, direction
    ├── results.tsv                    ← Experiment log (gitignored)
    └── evaluate.py                    ← Evaluation script (if --evaluator used)
```

**results.tsv columns:** `commit | metric | status | description`
- `commit` — short git hash
- `metric` — float value or "N/A" for crashes
- `status` — keep | discard | crash
- `description` — what changed or why it crashed

### Domains

| Domain | Use Cases |
|--------|-----------|
| `engineering` | Code speed, memory, bundle size, test pass rate, build time |
| `marketing` | Headlines, social copy, email subjects, ad copy, engagement |
| `content` | Article structure, SEO descriptions, readability, CTR |
| `prompts` | System prompts, chatbot tone, agent instructions |
| `custom` | Anything else with a measurable metric |

### If `program.md` Already Exists

The user may have written their own `program.md`. If found in the experiment directory, read it. It overrides the template. Only ask for what's missing.

---

## Agent Protocol

You are the loop. The scripts handle setup and evaluation — you handle the creative work.

### Before Starting
1. Read `.autoresearch/{domain}/{name}/config.cfg` to get:
   - `target` — the file you edit
   - `evaluate_cmd` — the command that measures your changes
   - `metric` — the metric name to look for in eval output
   - `metric_direction` — "lower" or "higher" is better
   - `time_budget_minutes` — max time per evaluation
2. Read `program.md` for strategy, constraints, and what you can/cannot change
3. Read `results.tsv` for experiment history (columns: commit, metric, status, description)
4. Checkout the experiment branch: `git checkout autoresearch/{domain}/{name}`

### Each Iteration
1. Review results.tsv — what worked? What failed? What hasn't been tried?
2. Decide ONE change to the target file. One variable per experiment.
3. Edit the target file
4. Commit: `git add {target} && git commit -m "experiment: {description}"`
5. Evaluate: `python3 "$S/run_experiment.py" --experiment {domain}/{name} --single`
6. Read the output — it prints KEEP, DISCARD, or CRASH with the metric value
7. Go to step 1

### What the Script Handles (you don't)
- Running the eval command with timeout
- Parsing the metric from eval output
- Comparing to previous best
- Reverting the commit on failure (`git reset --hard HEAD~1`)
- Logging the result to results.tsv

### Starting an Experiment

```bash
# Single iteration (the agent calls this repeatedly)
python3 "$S/run_experiment.py" --experiment engineering/api-speed --single

# Dry run (test setup before starting)
python3 "$S/run_experiment.py" --experiment engineering/api-speed --dry-run
```

### Strategy Escalation
- Runs 1-5: Low-hanging fruit (obvious improvements, simple optimizations)
- Runs 6-15: Systematic exploration (vary one parameter at a time)
- Runs 16-30: Structural changes (algorithm swaps, architecture shifts)
- Runs 30+: Radical experiments (completely different approaches)
- If no improvement in 20+ runs: update program.md Strategy section

### Self-Improvement
After every 10 experiments, review results.tsv for patterns. Update the
Strategy section of program.md with what you learned (e.g., "caching changes
consistently improve by 5-10%", "refactoring attempts never improve the metric").
Future iterations benefit from this accumulated knowledge.

### Stopping
- Run until interrupted by the user, context limit reached, or goal in program.md is met
- Before stopping: ensure results.tsv is up to date
- On context limit: the next session can resume — results.tsv and git log persist

### Rules

- **One change per experiment.** Don't change 5 things at once. You won't know what worked.
- **Simplicity criterion.** A small improvement that adds ugly complexity is not worth it. Equal performance with simpler code is a win. Removing code that gets same results is the best outcome.
- **Never modify the evaluator.** `evaluate.py` is the ground truth. Modifying it invalidates all comparisons. Hard stop if you catch yourself doing this.
- **Timeout.** If a run exceeds 2.5× the time budget, kill it and treat as crash.
- **Crash handling.** If it's a typo or missing import, fix and re-run. If the idea is fundamentally broken, revert, log "crash", move on. 5 consecutive crashes → pause and alert.
- **No new dependencies.** Only use what's already available in the project.

---

## Evaluators

Ready-to-use evaluation scripts in `evaluators/`. Copied into the experiment directory during setup with `--evaluator`.

### Free Evaluators (no API cost)

| Evaluator | Metric | Use Case |
|-----------|--------|----------|
| `benchmark_speed` | `p50_ms` (lower) | Function/API execution time |
| `benchmark_size` | `size_bytes` (lower) | File, bundle, Docker image size |
| `test_pass_rate` | `pass_rate` (higher) | Test suite pass percentage |
| `build_speed` | `build_seconds` (lower) | Build/compile/Docker build time |
| `memory_usage` | `peak_mb` (lower) | Peak memory during execution |

### LLM Judge Evaluators (uses your subscription)

| Evaluator | Metric | Use Case |
|-----------|--------|----------|
| `llm_judge_content` | `ctr_score` 0-10 (higher) | Headlines, titles, descriptions |
| `llm_judge_prompt` | `quality_score` 0-100 (higher) | System prompts, agent instructions |
| `llm_judge_copy` | `engagement_score` 0-10 (higher) | Social posts, ad copy, emails |

LLM judges call the CLI tool the user is already running (Claude, Codex, Gemini). The evaluation prompt is locked inside `evaluate.py` — the agent cannot modify it. This prevents the agent from gaming its own evaluator.

The user's existing subscription covers the cost:
- Claude Code Max → unlimited Claude calls for evaluation
- Codex CLI (ChatGPT Pro) → unlimited Codex calls
- Gemini CLI (free tier) → free evaluation calls

### Custom Evaluators

If no built-in evaluator fits, the user writes their own `evaluate.py`. Only requirement: it must print `metric_name: value` to stdout.

```python
#!/usr/bin/env python3
# My custom evaluator — DO NOT MODIFY after experiment starts
import subprocess
result = subprocess.run(["my-benchmark", "--json"], capture_output=True, text=True)
# Parse and output
print(f"my_metric: {parse_score(result.stdout)}")
```

---

## Viewing Results

```bash
# Single experiment
python3 "$S/log_results.py" --experiment engineering/api-speed

# All experiments in a domain
python3 "$S/log_results.py" --domain engineering

# Cross-experiment dashboard
python3 "$S/log_results.py" --dashboard

# Export formats
python3 "$S/log_results.py" --experiment engineering/api-speed --format csv --output results.csv
python3 "$S/log_results.py" --experiment engineering/api-speed --format markdown --output results.md
python3 "$S/log_results.py" --dashboard --format markdown --output dashboard.md
```

### Dashboard Output

```
DOMAIN          EXPERIMENT          RUNS  KEPT  BEST         Δ FROM START  STATUS
engineering     api-speed            47    14   185ms        -76.9%        active
engineering     bundle-size          23     8   412KB        -58.3%        paused
marketing       medium-ctr           31    11   8.4/10       +68.0%        active
prompts         support-tone         15     6   82/100       +46.4%        done
```

### Export Formats

- **TSV** — default, tab-separated (compatible with spreadsheets)
- **CSV** — comma-separated, with proper quoting
- **Markdown** — formatted table, readable in GitHub/docs

---

## Proactive Triggers

Flag these without being asked:

- **No evaluation command works** → Test it before starting the loop. Run once, verify output.
- **Target file not in git** → `git init && git add . && git commit -m 'initial'` first.
- **Metric direction unclear** → Ask: is lower or higher better? Must know before starting.
- **Time budget too short** → If eval takes longer than budget, every run crashes.
- **Agent modifying evaluate.py** → Hard stop. This invalidates all comparisons.
- **5 consecutive crashes** → Pause the loop. Alert the user. Don't keep burning cycles.
- **No improvement in 20+ runs** → Suggest changing strategy in program.md or trying a different approach.

---

## Related Skills

- **`agentic:loop-design-check`** — check the goal is machine-decidable and bounded before letting this loop run unattended.
- **`agentic:human-gate`** — human sign-off before an experiment result ships.
- **`tools:test-driven-development`** — complementary; tests can be the evaluation function.
