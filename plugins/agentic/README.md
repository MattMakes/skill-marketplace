# agentic — Agent Engineering

Make agents, skills and the agent harness. Nineteen skills for the files agents read, the
memory they keep, the way they route and behave, the loops they run, and the skills and MCP
servers they use. Start with `keys` to give a project one `AGENTS.md` tree that stays current;
start with `skill-creator` to make a skill.

```bash
claude plugin install agentic@skill-marketplace
```

## Skills

### Instruction files

`AGENTS.md` is the only instruction file. `keys` builds and checks the tree; the other four help
you write what goes in it.

| Skill | Use it when |
|---|---|
| `keys` | Start here for instruction files. Installs KEYS, a self-maintaining `AGENTS.md` hierarchy: a root contract with the framework rules, a child `AGENTS.md` at each real boundary, and an index of direct children in every doc. Agents read the chain from the root before an edit and update it after. Folds each `CLAUDE.md`, plus root rule files such as `GEMINI.md`, `.cursorrules` and `.github/copilot-instructions.md`, into the owning `AGENTS.md`, and deletes them only after you confirm. No `CLAUDE.md`, no symlinks. `keys.py scan`, `install` and `check`; Python 3. |
| `writing-for-agents` | Writing or editing any document an agent consumes: a skill, an `AGENTS.md`, a doc reached by a pointer. Context pointers, the two loads, the information hierarchy and progressive disclosure, completion criteria, leading words, the negation failure mode, pruning. `SKILL-MECHANICS.md` covers frontmatter, invocation choice and router skills. |
| `llm-friendly-context` | Writing or revising a prompt, handoff, plan, review or generated instruction another model will act on. A rewrite table for `optional`, `as needed`, `per convention`, `TBD`, `appropriate` and friends, plus handoff and generated-artifact checklists. |
| `rules-from-code` | You want a team's coding standards written down from its own code, not from generic advice. Tag the best and worst files, and it reverse-engineers a `rules.md` of conventions, ethos and patterns as paired positive and negative directives, from `references/rules-template.md`. |
| `engineering-rules` | Setting the SLC (Simple, Lovable, Complete) engineering ethos and a fixed set of coding standards as a preamble for planning or building: single-export service files, leveled logging, files under 200 lines and functions under 30, tests in a mirrored `__tests__` tree and never on log lines, camelCase file names. |

### Learn from sessions

| Skill | Use it when |
|---|---|
| `agent-memory` | A project's instruction file has outgrown what anyone reads and you want the agent to learn durable facts from its own sessions. A four-tier store (transcripts, candidates, project context, persona) where promotion needs recurrence across sessions and days, contradictions freeze a claim, redacted claims never promote on evidence alone, and nothing reaches a committed file without a human `adopt`. Five stdlib scripts plus three optional hooks you wire yourself (see below). |
| `stow` | End of a session, before a context reset or a long break: sweep the conversation for preferences, project facts, gotchas, standing decisions and open next steps, and file each into the project's existing `CLAUDE.md` / `AGENTS.md` / `TODO` conventions or a private `.stow-notes.md`, inspecting before updating and retiring stale entries to a local archive on a tiered decay clock. |
| `retro` | After a coding session, to improve the agent's environment for the next one: navigation pointers, missing guardrails, mechanical vs judgement standards, `AGENTS.md` bloat, tool economy, no-ops and information access. User-invoked only. |
| `correct` | The operator keeps correcting agents for the same mistakes. Mines commits, reverts and reviews for mistake classes and fixes each at the strongest level that works: architecture, then types, then a lint whose error names the fix, then a test, docs last. Proves each check on a real past mistake and keeps a rule-to-enforcer table. |

### Route and behave

| Skill | Use it when |
|---|---|
| `model-router` | Before starting substantive work: decides whether the work stays here, goes down to Haiku or Sonnet (mechanical, well-specified), escalates to Opus or Fable (hard architecture, debugging, security), or fans out across parallel subagents. Bails out first when delegation costs more than it saves. |
| `persona` | Building software or planning to. A senior staff engineer who applies SLC (Simple, Lovable, Complete) and refuses to ship phases. |

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

Installing this plugin wires no hooks, no MCP servers and no background processes. Scripts
run only when you invoke them.

- **`keys`** writes the root `AGENTS.md` (the framework sits between `<!-- KEYS:begin -->` and
  `<!-- KEYS:end -->`; a re-run replaces only that block) and a child `AGENTS.md` per boundary.
  An `AGENTS.md` that is a symlink becomes a regular file. It deletes the `CLAUDE.md` and rule
  files it folded only after you confirm the delete list, and warns first when the git tree is
  dirty or there is no git repository. `CLAUDE.local.md` is never touched. In a headless run with
  nobody to confirm, it folds, deletes nothing and lists each source as `pending delete`.
  `keys.py` is stdlib Python 3 and makes no network calls.
- **`agent-memory`** writes `.memory/` (candidate atoms, a lock, an error log, staged
  promotions) in the current project. `memory_inspect.py --why` reads your Claude Code
  transcripts under `~/.claude/projects/` to quote a cited line. The `adopt` flow is the only
  path that edits a `CLAUDE.md` (project and `~/.claude/CLAUDE.md`), one atom at a time with
  your confirmation, after backing both files up. The unattended mode is an explicit opt-in:
  copy the three entries from `skills/agent-memory/scripts/hooks.json` into the `hooks`
  section of your `settings.json`; they run
  `${CLAUDE_PLUGIN_ROOT}/skills/agent-memory/scripts/session_start.py`,
  `user_prompt_submit.py` and `session_end.py` (if your settings file does not expand
  `${CLAUDE_PLUGIN_ROOT}`, substitute the installed plugin's absolute path). Every hook fails
  open and each can be disabled with `AGENT_MEMORY_SESSIONSTART=0`,
  `AGENT_MEMORY_USERPROMPTSUBMIT=0` or `AGENT_MEMORY_SESSIONEND=0`. No network, no LLM calls.
- **`stow`** writes only to files the project already uses (`CLAUDE.md`, `AGENTS.md`, a
  tracked `TODO`/`NOTES`), to `.stow-notes.md` and `.stow-archive.md` in the current directory,
  and adds those two names to a `.gitignore` there. It never commits.
- **`retro`** reads session logs under `~/.claude/projects/`.
- **`correct`** changes repository configuration on purpose: lint rules, CI checks, types, tests
  and the agent instruction file, one commit per mistake class.
- **`rules-from-code`** writes `<project_root>/rules.md`; if one exists it asks before
  overwriting.
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
- `writing-for-agents`, `llm-friendly-context`, `engineering-rules`, `model-router`, `persona`,
  `loop-design-check` and `cli-for-agents` are prose only.

## How it works with the other plugins

| Direction | Handoff |
|---|---|
| In | `code:core` gives its instruction-file layer to `agentic:keys`. The owner decided that keys' model is the correct one: `AGENTS.md` is the only instruction file, with no `CLAUDE.md` and no symlinks. `core` keeps the graphify graph and the read, runs `agentic:keys` to build and check the `AGENTS.md` tree, and puts only graphify's own instructions in a `<!-- GRAPHIFY:begin -->` block of the root `AGENTS.md`, which keys leaves alone. Without `agentic` installed, `core` builds the graph only and tells you to install `agentic` for the instruction files. |
| In | `agentic:keys` folds a tree that an older `code:core` wrote (`CLAUDE.md` contracts with `AGENTS.md` symlinks, `<!-- CORE:begin -->` blocks, a `## graphify` section) into the KEYS layout, and leaves core's non-instruction files (`.claude/core/`, `graphify-out/`, its git hooks) alone. |
| In | `code:deepwiki` points at `agentic:keys` for the `AGENTS.md` tree; `security:mcp-dependency-review` points at `agentic:mcp-builder`. |
| Out | `agentic:loop-design-check` and `agentic:autoresearch-agent` put a named person's sign-off in front of irreversible work through `verify:human-gate`, which moved to `verify` in v3. `autoresearch-agent` also points at `dev:tdd`. |
| Out | `agentic:agent-architecture-audit` sends a bug that is not an agent-stack fault to `dev:debug` and a security question to `security:security-sweep`. |
| Out | `agentic:rules-from-code` can spawn the `code:codebase-locator` agent to find candidate files. |
| Out | `agentic:book-to-skill` hands a compiled skill to `agentic:skill-creator` for evals and to `agentic:writing-for-agents` for the prose. |
| Split | `agentic:correct` turns repeated mistakes into enforced checks; `craft:principle-encode-lessons-in-structure` is the principle behind it. `agentic:model-router` routes one session's work across models; `dev:swarm` runs agent teams in one session and `herdr` runs a fleet of sessions. |

## Credits

The vendored skills are supply-chain-controlled copies: each is credited with repository, path,
commit, date and license in [NOTICE.md](NOTICE.md), which also lists what was changed to make
them standalone. From the recorded commit forward these are this marketplace's copies: upstream
is re-pulled deliberately, diffed first, never tracked live.

- Affaan Mustafa's ECC: `loop-design-check`, `agent-architecture-audit`.
- Alireza Rezvani's claude-skills: `agent-memory`, `autoresearch-agent`, `book-to-skill`.
- Shinsuke Kagawa's claude-code-workflows: `llm-friendly-context`.
- Kun Chen's firstmate: `stow`.
- Matt Pocock's skills: `writing-for-agents`, `retro`.
- Cursor's plugins: `cli-for-agents`; and `correct` from Lauren Tan's pstack at commit `9d76bca`
  (2026-10-11), MIT (`LICENSE-pstack.txt`).
- `skill-creator` and `mcp-builder` are copied from
  [anthropics/skills](https://github.com/anthropics/skills) at commit `41bbe19` (2026-09-03),
  Apache-2.0.
- `keys` installs KEYS, the DOX `AGENTS.md` framework from
  [agent0ai/dox](https://github.com/agent0ai/dox) (MIT), renamed and made `AGENTS.md`-only.

`harvest`, `model-router` and `persona` are the marketplace owner's. `rules-from-code` and
`engineering-rules` came from `dev`, whose README says parts of that plugin are adapted from
obra/superpowers, HumanLayer, wshobson/agents and BMAD-METHOD, with the original work credited in
the skill files themselves; neither of these two skill files names an upstream.

## Moved in v3

| Before | After |
|---|---|
| `code:keys` | `agentic:keys` |
| `dev:rules-from-code` | `agentic:rules-from-code` |
| `dev:engineering-rules` | `agentic:engineering-rules` |
| `craft:retro` | `agentic:retro` |
| `pstack:correct` | `agentic:correct` |
| `tools:model-router` | `agentic:model-router` |
| `tools:persona` | `agentic:persona` |
| `meta:skill-creator` | `agentic:skill-creator` |
| `meta:mcp-builder` | `agentic:mcp-builder` |
| `meta:harvest` | `agentic:harvest` |
| `agentic:human-gate` | `verify:human-gate` |
| `code:core`'s CLAUDE.md and symlink layer | `agentic:keys` (core keeps the graph) |

The `meta` plugin is gone; all three of its skills are here.

## Invoking

Namespaced under the plugin: `/agentic:keys`, `/agentic:skill-creator`, `/agentic:mcp-builder`,
`/agentic:harvest`, `/agentic:agent-memory`, `/agentic:stow`, `/agentic:retro`,
`/agentic:correct`, `/agentic:loop-design-check`, and so on. Script paths inside each skill
resolve from `${CLAUDE_PLUGIN_ROOT}/skills/<skill>/`.
