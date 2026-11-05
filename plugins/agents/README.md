# agents — AI Agents and Models

How do I build an AI system? Design and audit agents and their loops, write what agents read,
make skills and MCP servers, run a fleet of agent sessions, and train and evaluate a model.
Twenty-four skills in four groups.

```bash
claude plugin install agents@skill-marketplace
```

**Where to start.** To make a skill, start at `skill-creator`. Before you hand a repeating task to
an agent, run `loop-design-check`. To run a fleet, start at `herdr-setup`. To train a model, start
at `finetuning-method-selection`; it tells you first whether to train at all.

Each group has a detailed area document with the full skill descriptions and disclosures:
[agentic](docs/areas/agentic.md), [herdr](docs/areas/herdr.md) and [ml](docs/areas/ml.md).

## Skills

### Agents

| Skill | What it does |
|---|---|
| `loop-design-check` | A build gate and review checklist for a repeating task handed to an agent: a machine-decidable goal, servo vs regulator loops, a plan/build/judge skeleton, and five failure modes (spinning, verifier gaming, runaway wrong answers). |
| `agent-architecture-audit` | Finds which layer of an agent stack is at fault: walks twelve layers from prompt to persistence, searches the code for anti-patterns, and writes severity-ranked findings and a JSON report. |
| `autoresearch-agent` | A Karpathy-style improvement loop on one file: edit, evaluate with your metric command, commit improvements, reset failures, repeat; setup, run, scheduled loop, status and resume flows and eight evaluators. |
| `cli-for-agents` | How to build a CLI agents can drive: non-interactive first, layered help with examples, fail-fast errors that print a correct invocation, idempotency, dry-run, a review checklist. |
| `writing-for-agents` | How to write a skill, an `AGENTS.md` or any document an agent reads: context pointers, progressive disclosure, completion criteria, leading words, pruning; `SKILL-MECHANICS.md` covers frontmatter and router skills. |
| `llm-friendly-context` | Rewrites a prompt, handoff, plan or generated instruction so another model can act on it: a table of vague words to replace, plus handoff and generated-artifact checklists. |
| `model-router` | Before substantive work, decides whether it stays here, goes down to Haiku or Sonnet, escalates to Opus or Fable, or fans out across subagents; bails out when delegation costs more than it saves. |

### Skills and servers

| Skill | What it does |
|---|---|
| `skill-creator` | Creates or tightens a skill and proves it works: writes the `SKILL.md`, runs evals with `claude -p`, benchmarks with variance analysis and tunes the description for triggering. |
| `mcp-builder` | Builds an MCP server that wraps an external API in Python (FastMCP) or TypeScript (MCP SDK), with reference implementations and an evaluation harness. |
| `harvest` | Clones a GitHub repository of skills you name, detects name collisions and copies the rest into `~/.claude/skills`. |
| `book-to-skill` | Turns a book or a folder of docs into a progressive-disclosure skill: a small resident `SKILL.md`, chapter files, glossary and cheatsheet, with a cost pre-flight, a validator and a rights gate. |

### Fleets (herdr)

Run a [herdr](https://herdr.dev) multi-agent worker fleet in persistent terminal panes through the
`horch` CLI. The herdr CLI is not bundled; `herdr-setup` checks for it. Details:
[docs/areas/herdr.md](docs/areas/herdr.md).

| Skill | What it does |
|---|---|
| `herdr-setup` | Checks the machine against what the fleet needs (herdr 0.8.2 or newer, `horch` on PATH pointing at this plugin, agent integrations, `jq` and `python3`) and fixes only the gaps. |
| `herdr-orchestrator` | The orchestrator side: decompose the work, register tasks with file ownership, spawn workers by tier, unblock them, verify their DONE and retire the pane. |
| `herdr-worker` | The worker side: take a briefing, work independently, record progress in the session ledger, ask through `horch` when blocked, report `[role] DONE`. |
| `herdr-atomic` | Deterministic one-action-per-call scripts for driving herdr directly, returning JSON with fixed exit codes. |

### Models (ml)

Seven skills walk a language-model post-training run end to end, in this order; two design
retrieval and ranking pipelines. Details: [docs/areas/ml.md](docs/areas/ml.md).

| Skill | What it does |
|---|---|
| `finetuning-method-selection` | Whether to fine-tune at all (RAG and prompting first), then SFT, DPO/ORPO/KTO, GRPO/RLVR or continued pretraining by data shape; memory math and a dated base-model catalog. |
| `eval-harness-first` | Error analysis into failure buckets, one binary grader per bucket, judge calibration, a frozen drift suite and the base-model baseline, before any training config. |
| `dataset-curation` | Training rows by method: chat templates before packing, assistant-only loss masking, inspection of packed sequences, a floor of real data in synthetic mixes, a dataset card. |
| `lora-qlora-recipes` | A LoRA/QLoRA SFT config: target modules, alpha and rank, Unsloth defaults with the TRL/PEFT mapping, and the config choices that look like training-loop bugs. |
| `preference-optimization` | DPO, ORPO, KTO or SimPO from preference pairs or thumbs feedback: per-method TRL configs, iterative on-policy DPO, pair construction. |
| `grpo-rlvr-training` | GRPO when success is checkable: vLLM generation, composite rewards, mandatory reward inspection, memory sizing, DAPO/Dr.GRPO/GSPO by failure mode. |
| `checkpoint-promotion` | A four-stage gate for a trained checkpoint (data hygiene, drift budget, paired arena vs base, canary) ending in `PROMOTE` or `REJECT`. |
| `rag-architect` | Designs and evaluates a RAG pipeline: chunking, embedding tier, vector store, and precision/recall/MRR/NDCG against ground truth, with three stdlib scripts. |
| `recsys-pipeline-architect` | Any "top K items for a user and context" problem as a six-stage Source → Hydrator → Filter → Scorer → Selector → SideEffect pipeline, with a scaffold in your stack. |

## What these write and where they reach

Installing this plugin wires no hooks, no MCP servers and no background processes. Scripts run
only when you invoke them. The area documents give each item in full.

- **`autoresearch-agent`** writes `.autoresearch/` in the repo (or `~/.autoresearch/` with
  `--scope user`), creates an `autoresearch/<domain>/<name>` branch, commits the target file on
  every iteration and runs `git reset --hard HEAD~1` on a failed experiment. It runs your
  evaluation command as a subprocess. Its three `llm_judge_*` evaluators call the `claude`,
  `codex` or `gemini` CLI on your machine, which reaches that provider's API under your own
  subscription. The loop flow schedules recurring work through Claude Code's in-session
  scheduler.
- **`agent-architecture-audit`** runs `rg` searches you approve.
- **`harvest`** clones `https://github.com/<owner>/<repo>` for a repository you name into a temp
  directory (`gh repo clone`, falling back to `git clone`), copies the skill folders into
  `~/.claude/skills` (`CLAUDE_SKILLS_DIR` overrides), and deletes the clone. It never overwrites
  an existing skill.
- **`skill-creator`** spawns `claude -p` for each eval case and runs `lsof` to free its review
  viewer's localhost port. Its HTML reports link Google Fonts stylesheets, which your browser
  fetches when you open one.
- **`mcp-builder`**'s evaluation script calls the Anthropic API (`ANTHROPIC_API_KEY`) and connects
  to the MCP server you point it at.
- **`book-to-skill`** writes the compiled skill to the skills home you choose (default
  `~/.claude/skills/<slug>`) and a temp workdir it cleans up. `--install-missing yes` runs
  `pip install` for optional parsers, and only when you pass it.
- **`herdr-setup`** (and the `install.sh` wrapper in `herdr-orchestrator/scripts`) symlinks
  `horch` into `~/.local/bin` (`HORCH_BIN_DIR` overrides), runs `herdr integration install
  <engine>` for the engines you have, which installs herdr's session hooks for that engine, and
  installs herdr itself only with `--install-herdr`. Only for a cloned repo, not a plugin
  install, it links the skills into `~/.claude/skills` (`CLAUDE_SKILLS_DIR` overrides).
- **A running fleet** writes `.herdr-orchestrator/` (ledger, briefs) and per-task workspace
  folders into the project it is pointed at.
- **`rag-architect`**'s three scripts use only the standard library, read the corpus and JSON you
  pass them, and write one JSON result to the `-o` path. No network.
- The seven fine-tuning skills are guidance and templates to copy; nothing runs. The `eval/` and
  `runs/` layout they describe is a contract for your project, not something the plugin creates.
- `writing-for-agents`, `llm-friendly-context`, `model-router`, `loop-design-check`,
  `cli-for-agents`, `recsys-pipeline-architect` and the herdr skills' prose are markdown only.

## How it works with the other plugins

The marketplace has five plugins: `software`, `design`, `game`, `agents` and `work`. This one
hands off mostly to `software` and receives fleet work from `game`.

| Direction | Handoff |
|---|---|
| Out to `software` | `agents:loop-design-check` and `agents:autoresearch-agent` put a named person's sign-off in front of irreversible work through `software:human-gate`; `autoresearch-agent` also points at `software:tdd`. `agents:agent-architecture-audit` sends a bug that is not an agent-stack fault to `software:debug` and a security question to `software:security-sweep`. |
| In from `software` | `software:human-gate` points back at `agents:loop-design-check`; `software:mcp-dependency-review` points at `agents:mcp-builder`; `software:retro` sends instruction-file prose to `agents:writing-for-agents`. |
| In from `game` | `game:fleet-game-dev` is the Godot side of a fleet and sends the generic loops to `agents:herdr-worker`, `agents:herdr-orchestrator` and `agents:herdr-setup`. |
| Split with `software` | `software:keys` owns the `AGENTS.md` tree and `software:agent-memory`, `software:stow`, `software:retro` and `software:correct` learn from sessions; `agents:writing-for-agents` says how to write what goes in those files. `software:swarm` runs an agent team inside one session; the herdr skills run a fleet of sessions. |
| Inside | `agents:book-to-skill` hands a compiled skill to `agents:skill-creator` for evals and to `agents:writing-for-agents` for the prose. The fine-tuning skills hand off to each other in order. |

## Credits

The vendored skills are supply-chain-controlled copies: each is credited with repository, path,
commit, date, license and author in [NOTICE.md](NOTICE.md), which also lists what was changed to
make it standalone. Upstream is re-pulled deliberately, diffed first, never tracked live.

- Affaan Mustafa's ECC: `loop-design-check`, `agent-architecture-audit`.
- Alireza Rezvani's claude-skills (MIT): `autoresearch-agent`, `book-to-skill` and
  `rag-architect`.
- Shinsuke Kagawa's claude-code-workflows: `llm-friendly-context`.
- Matt Pocock's skills: `writing-for-agents`.
- Cursor's plugins: `cli-for-agents`.
- `skill-creator` and `mcp-builder` are copied from
  [anthropics/skills](https://github.com/anthropics/skills) at commit `41bbe19` (2026-09-03),
  Apache-2.0.
- The seven fine-tuning skills and `recsys-pipeline-architect` come from
  [wshobson/agents](https://github.com/wshobson/agents) by Seth Hobson (MIT) at commit `46891e7`
  (2026-10-04); `recsys-pipeline-architect` is itself his single-file adapter of
  [mturac/recsys-pipeline-architect](https://github.com/mturac/recsys-pipeline-architect) (MIT).

`harvest`, `model-router` and the four herdr skills are the marketplace owner's.

## Moved in v3

In 2.x these skills were in four plugins: `agentic`, `herdr`, `ml` and `meta`, plus
`model-router` from `tools`. Every skill kept its name.

| Before | Now |
|---|---|
| `agentic:<skill>` (loop-design-check, agent-architecture-audit, autoresearch-agent, cli-for-agents, writing-for-agents, llm-friendly-context, book-to-skill) | `agents:<skill>` |
| `herdr:<skill>` (herdr-orchestrator, herdr-worker, herdr-atomic, herdr-setup) | `agents:<skill>` |
| `ml:<skill>` (all nine) | `agents:<skill>` |
| `meta:skill-creator`, `meta:mcp-builder`, `meta:harvest` | `agents:skill-creator`, `agents:mcp-builder`, `agents:harvest` |
| `tools:model-router` | `agents:model-router` |
| `agentic:agent-memory`, `agentic:stow`, `agentic:human-gate` | `software:agent-memory`, `software:stow`, `software:human-gate` |

The root [README](../../README.md#migrating-from-2x) has the full move table.

## Invoking

Namespaced under the plugin: `/agents:skill-creator`, `/agents:mcp-builder`, `/agents:harvest`,
`/agents:loop-design-check`, `/agents:herdr-setup`, `/agents:finetuning-method-selection`, and so
on. Script paths inside each skill resolve from `${CLAUDE_PLUGIN_ROOT}/skills/<skill>/`.
