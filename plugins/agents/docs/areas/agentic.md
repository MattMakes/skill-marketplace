# Agent engineering — area of the `agents` plugin

Build agents, and the skills and MCP servers they use. Eleven skills for the documents agents
read, the way work is routed across models, the loops agents run, and the skills and servers
they call. Start with `skill-creator` to make a skill and `loop-design-check` before you hand a
repeating task to an agent.

This area holds most of the 2.x `agentic` plugin, plus `skill-creator`, `mcp-builder` and
`harvest` from `meta` and `model-router` from `tools`. `agent-memory`, `stow` and `human-gate`
moved from `agentic` to `software`, which also owns the instruction-file skills (`keys`,
`rules-from-code`, `engineering-rules`), `retro`, `correct` and `persona`; see "How it works with
the other plugins".

## Skills

### Documents agents read

| Skill | Use it when |
|---|---|
| `writing-for-agents` | Writing or editing any document an agent consumes: a skill, an `AGENTS.md`, a doc reached by a pointer. Context pointers, the two loads, the information hierarchy and progressive disclosure, completion criteria, leading words, the negation failure mode, pruning. `SKILL-MECHANICS.md` covers frontmatter, invocation choice and router skills. |
| `llm-friendly-context` | Writing or revising a prompt, handoff, plan, review or generated instruction another model will act on. A rewrite table for `optional`, `as needed`, `per convention`, `TBD`, `appropriate` and friends, plus handoff and generated-artifact checklists. |

### Route

| Skill | Use it when |
|---|---|
| `model-router` | Before starting substantive work: decides whether the work stays here, goes down to Haiku or Sonnet (mechanical, well-specified), escalates to Opus or Fable (hard architecture, debugging, security), or fans out across parallel subagents. Bails out first when delegation costs more than it saves. |

### Build agents

| Skill | Use it when |
|---|---|
| `loop-design-check` | Before handing a repeating task to an agent, or when an existing loop spins, games its verifier or runs a wrong answer to completion. A four-condition build gate, a machine-decidable goal framework, servo vs regulator loop types, a plan/build/judge skeleton, and a five-failure-mode review checklist with a worked nightly-green-keeper example. Covers goal and runaway prevention, not loop mechanics. |
| `agent-architecture-audit` | An agent or LLM feature misbehaves and you do not know which layer is at fault, or before shipping an agent stack. Walks the twelve-layer stack (prompt, history, memory, distillation, tools, rendering, hidden repair loops, persistence), searches the codebase for anti-patterns with `rg`, and produces severity-ranked, code-first findings and a JSON report. |
| `autoresearch-agent` | "Make this faster / smaller / better" with a target file, an evaluation command that prints a metric, and a git repo. Karpathy-style loop: edit one thing, evaluate, commit improvements, reset failures, repeat; with setup, run, loop (scheduled), status and resume flows, eight evaluators and `program.md` templates. Python 3 and git. |
| `cli-for-agents` | Building a CLI, adding commands or writing `--help` for a tool agents will run. Non-interactive first, layered help with examples, stdin and pipelines, fail-fast errors that print a correct invocation, idempotency, dry-run, machine-useful success output, and a review checklist. |

### Make skills and servers

| Skill | Use it when |
|---|---|
| `skill-creator` | Start here for skills. Creating a skill from scratch, tightening an existing one, or proving it works: writes the `SKILL.md`, runs evals against it with `claude -p`, benchmarks with variance analysis, and tunes the description for triggering accuracy. Python 3 with `pyyaml`; the eval runner needs the `claude` CLI on your PATH. |
| `mcp-builder` | Building an MCP server that wraps an external API, in Python (FastMCP) or TypeScript (MCP SDK). Design guidance, reference implementations, and an evaluation harness. The harness (`scripts/evaluation.py`) needs `anthropic` and `mcp` from `scripts/requirements.txt` and an `ANTHROPIC_API_KEY`; the guidance needs nothing. |
| `harvest` | You have a GitHub URL to a repository of skills and want them installed locally. Clones it, finds every `SKILL.md`, detects name collisions with what you already have, and copies the rest into `~/.claude/skills`. Node with `npx ts-node`, plus `gh` or `git`. |
| `book-to-skill` | Turning a book or a folder of docs (PDF, EPUB, DOCX, HTML, Markdown, RST, RTF, MOBI) into a progressive-disclosure skill: a resident `SKILL.md` under 4,000 tokens, on-demand chapter files, glossary, patterns and cheatsheet, with a cost pre-flight, a validator and a rights gate before packaging. Python 3; optional parsers improve quality (see below). |

## What these write and where they reach

Installing the plugin wires no hooks, no MCP servers and no background processes. Scripts run
only when you invoke them.

- **`autoresearch-agent`** writes `.autoresearch/` in the repo (or `~/.autoresearch/` with
  `--scope user`), creates an `autoresearch/<domain>/<name>` git branch, and on every
  iteration commits the target file and runs `git reset --hard HEAD~1` on a failed
  experiment. `run_experiment.py` runs your evaluation command as a subprocess. The three
  `llm_judge_*` evaluators call the `claude`, `codex` or `gemini` CLI already on your machine,
  which reaches that provider's API under your own subscription. The loop flow schedules
  recurring work through Claude Code's in-session scheduler.
- **`agent-architecture-audit`** runs `rg` searches you approve; the Grep tool works the same.
- **`harvest`** reaches out and writes outside its own directory, and only for a repository you
  name. It clones `https://github.com/<owner>/<repo>` into a temp directory (`gh repo clone`,
  falling back to `git clone`), copies the skill folders it finds into `~/.claude/skills`
  (`CLAUDE_SKILLS_DIR` overrides), and deletes the temp clone. It never overwrites an existing
  skill; collisions are reported and skipped unless you supply a rename.
- **`skill-creator`** runs subprocesses on your machine when you ask it to evaluate a skill: it
  spawns `claude -p` for each eval case, and the review viewer runs `lsof` to free its localhost
  port. Its HTML reports link Google Fonts stylesheets, which your browser fetches when you open
  one; the scripts themselves make no network calls.
- **`mcp-builder`**'s evaluation script calls the Anthropic API and connects to the MCP server
  you point it at (stdio, SSE, or streamable HTTP). It runs only when you invoke it.
- **`book-to-skill`** writes the compiled skill into the skills home you choose (default
  `~/.claude/skills/<slug>`, or a temp folder when packaging) and a temp workdir it cleans up.
  `extract_document.py --check` only reports missing parsers; `--install-missing yes` runs
  `pip install` for them, and only when you pass it. Optional parsers: `pypdf` or
  `pdfminer.six` or poppler's `pdftotext` for PDF, `docling` for `--mode technical`,
  `ebooklib` for EPUB, `python-docx` for DOCX, `striprtf` for RTF, calibre's `ebook-convert`
  for MOBI/AZW; every one has a stdlib fallback or degrades to a clear message. The skill is
  about 320 KB, mostly the Python package and references.
- `writing-for-agents`, `llm-friendly-context`, `model-router`, `loop-design-check` and
  `cli-for-agents` are prose only.

## How it works with the other plugins

| Direction | Handoff |
|---|---|
| Out | `agents:loop-design-check` and `agents:autoresearch-agent` put a named person's sign-off in front of irreversible work through `software:human-gate`. `autoresearch-agent` also points at `software:tdd`. |
| Out | `agents:agent-architecture-audit` sends a bug that is not an agent-stack fault to `software:debug` and a security question to `software:security-sweep`. |
| In | `software:human-gate` points back at `agents:loop-design-check`; `software:mcp-dependency-review` points at `agents:mcp-builder`; `software:retro` sends instruction-file prose to `agents:writing-for-agents`. |
| In | `software:keys` owns the `AGENTS.md` tree that `agents:writing-for-agents` tells you how to write. |
| Inside | `agents:book-to-skill` hands a compiled skill to `agents:skill-creator` for evals and to `agents:writing-for-agents` for the prose. |
| Split | `agents:model-router` routes one session's work across models; `software:swarm` runs agent teams in one session and the fleet skills (`agents:herdr-orchestrator`) run a fleet of sessions. `software:correct` turns repeated agent mistakes into enforced checks. |

## Credits

The vendored skills are supply-chain-controlled copies: each is credited with repository, path,
commit, date and license in the plugin's [NOTICE.md](../../NOTICE.md), which also lists what was
changed to make them standalone. From the recorded commit forward these are this marketplace's
copies: upstream is re-pulled deliberately, diffed first, never tracked live.

- Affaan Mustafa's ECC: `loop-design-check`, `agent-architecture-audit`.
- Alireza Rezvani's claude-skills: `autoresearch-agent`, `book-to-skill`.
- Shinsuke Kagawa's claude-code-workflows: `llm-friendly-context`.
- Matt Pocock's skills: `writing-for-agents`.
- Cursor's plugins: `cli-for-agents`.
- `skill-creator` and `mcp-builder` are copied from
  [anthropics/skills](https://github.com/anthropics/skills) at commit `41bbe19` (2026-09-03),
  Apache-2.0.

`harvest` and `model-router` are the marketplace owner's.

## Invoking

Namespaced under the plugin: `/agents:skill-creator`, `/agents:mcp-builder`, `/agents:harvest`,
`/agents:book-to-skill`, `/agents:loop-design-check`, `/agents:model-router`, and so on. Script
paths inside each skill resolve from `${CLAUDE_PLUGIN_ROOT}/skills/<skill>/`.
