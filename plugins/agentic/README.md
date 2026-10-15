# agentic — Agent Engineering

Ten skills for building and running agents: deciding whether a task deserves a loop and
reviewing the loop for the ways it runs away, auditing a misbehaving agent stack, putting a
human sign-off lane in front of irreversible work, running an autonomous optimize loop, giving
an agent memory that earns promotion instead of asserting it, and writing the documents, prompts
and CLIs that agents consume. All ten are vendored from upstream and maintained here.

```bash
claude plugin install agentic@skill-marketplace
```

## Skills

### Designing, auditing and gating loops

| Skill | Use it when |
|---|---|
| `loop-design-check` | Before handing a repeating task to an agent, or when an existing loop spins, games its verifier or runs a wrong answer to completion. A four-condition build gate, a machine-decidable goal framework, servo vs regulator loop types, a plan/build/judge skeleton, and a five-failure-mode review checklist with a worked nightly-green-keeper example. Covers goal and runaway prevention, not loop mechanics. |
| `agent-architecture-audit` | An agent or LLM feature misbehaves and you do not know which layer is at fault, or before shipping an agent stack. Walks the twelve-layer stack (prompt, history, memory, distillation, tools, rendering, hidden repair loops, persistence), searches the codebase for anti-patterns with `rg`, and produces severity-ranked, code-first findings and a JSON report. |
| `human-gate` | A plan, spec, RFC, report, migration or any irreversible action needs a named person's sign-off before it ships. Builds a single-file HTML review page, collects severity-graded feedback as a parseable `batch.v1` sidecar anyone can write by hand, and runs a gate that refuses to close with an open BLOCKER, an unnamed reviewer, or no review at all. Python 3, stdlib only. |
| `autoresearch-agent` | "Make this faster / smaller / better" with a target file, an evaluation command that prints a metric, and a git repo. Karpathy-style loop: edit one thing, evaluate, commit improvements, reset failures, repeat; with setup, run, loop (scheduled), status and resume flows, eight evaluators and `program.md` templates. Python 3 and git. |

### Memory

| Skill | Use it when |
|---|---|
| `agent-memory` | A project's `CLAUDE.md` has outgrown what anyone reads and you want the agent to learn durable facts from its own sessions. A four-tier store (transcripts, candidates, project context, persona) where promotion needs recurrence across sessions and days, contradictions freeze a claim, redacted claims never promote on evidence alone, and nothing reaches a `CLAUDE.md` without a human `adopt`. Five stdlib scripts plus three optional hooks you wire yourself (see below). |
| `stow` | End of a session, before a context reset or a long break: sweep the conversation for preferences, project facts, gotchas, standing decisions and open next steps, and file each into the project's existing `CLAUDE.md` / `AGENTS.md` / `TODO` conventions or a private `.stow-notes.md`, inspecting before updating and retiring stale entries to a local archive on a tiered decay clock. |

### Writing for agents

| Skill | Use it when |
|---|---|
| `writing-for-agents` | Writing or editing any document an agent consumes: a skill, an `AGENTS.md` or `CLAUDE.md`, a doc reached by a pointer. Context pointers, the two loads, the information hierarchy and progressive disclosure, completion criteria, leading words, the negation failure mode, pruning. `SKILL-MECHANICS.md` covers frontmatter, invocation choice and router skills. |
| `llm-friendly-context` | Writing or revising a prompt, handoff, plan, review or generated instruction another model will act on. A rewrite table for `optional`, `as needed`, `per convention`, `TBD`, `appropriate` and friends, plus handoff and generated-artifact checklists. |
| `cli-for-agents` | Building a CLI, adding commands or writing `--help` for a tool agents will run. Non-interactive first, layered help with examples, stdin and pipelines, fail-fast errors that print a correct invocation, idempotency, dry-run, machine-useful success output, and a review checklist. |
| `book-to-skill` | Turning a book or a folder of docs (PDF, EPUB, DOCX, HTML, Markdown, RST, RTF, MOBI) into a progressive-disclosure skill: a resident `SKILL.md` under 4,000 tokens, on-demand chapter files, glossary, patterns and cheatsheet, with a cost pre-flight, a validator and a rights gate before packaging. Python 3; optional parsers improve quality (see below). |

## What these write and where they reach

Installing this plugin wires no hooks, no MCP servers and no background processes. Scripts
run only when you invoke them.

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
- **`human-gate`** writes `<artifact>.review.html`, reads and writes `<artifact>.review.md`,
  and keeps gate state in a `.human-gate/` directory beside the artifact. `open --launch`
  opens the page in your default browser; the page itself makes no network request. It never
  fetches code; the optional `petergyang/human-review` editor it mentions is something you
  run yourself, pinned.
- **`autoresearch-agent`** writes `.autoresearch/` in the repo (or `~/.autoresearch/` with
  `--scope user`), creates an `autoresearch/<domain>/<name>` git branch, and on every
  iteration commits the target file and runs `git reset --hard HEAD~1` on a failed
  experiment. `run_experiment.py` runs your evaluation command as a subprocess. The three
  `llm_judge_*` evaluators call the `claude`, `codex` or `gemini` CLI already on your machine,
  which reaches that provider's API under your own subscription. The loop flow schedules
  recurring work through Claude Code's in-session scheduler.
- **`book-to-skill`** writes the compiled skill into the skills home you choose (default
  `~/.claude/skills/<slug>`, or a temp folder when packaging) and a temp workdir it cleans up.
  `extract_document.py --check` only reports missing parsers; `--install-missing yes` runs
  `pip install` for them, and only when you pass it. Optional parsers: `pypdf` or
  `pdfminer.six` or poppler's `pdftotext` for PDF, `docling` for `--mode technical`,
  `ebooklib` for EPUB, `python-docx` for DOCX, `striprtf` for RTF, calibre's `ebook-convert`
  for MOBI/AZW; every one has a stdlib fallback or degrades to a clear message. The skill is
  about 320 KB, mostly the Python package and references.
- **`stow`** writes only to files the project already uses (`CLAUDE.md`, `AGENTS.md`, a
  tracked `TODO`/`NOTES`), to `.stow-notes.md` and `.stow-archive.md` in the current directory,
  and adds those two names to a `.gitignore` there. It never commits.
- **`agent-architecture-audit`** runs `rg` searches you approve; the Grep tool works the same.
- `loop-design-check`, `writing-for-agents`, `llm-friendly-context` and `cli-for-agents` are
  prose only.

## Credits

All ten skills are vendored, supply-chain-controlled copies: Affaan Mustafa's ECC
(`loop-design-check`, `agent-architecture-audit`), Alireza Rezvani's claude-skills
(`agent-memory`, `human-gate`, `autoresearch-agent`, `book-to-skill`), Shinsuke Kagawa's
claude-code-workflows (`llm-friendly-context`), Kun Chen's firstmate (`stow`), Matt Pocock's
skills (`writing-for-agents`) and Cursor's plugins (`cli-for-agents`). Each is credited with
repository, path, commit, date and license in [NOTICE.md](NOTICE.md), which also lists what was
changed to make them standalone. From the recorded commit forward these are this marketplace's
copies: upstream is re-pulled deliberately, diffed first, never tracked live.

## Invoking

Namespaced under the plugin: `agentic:loop-design-check`, `agentic:agent-architecture-audit`,
`agentic:human-gate`, `agentic:autoresearch-agent`, `agentic:agent-memory`, `agentic:stow`,
`agentic:writing-for-agents`, `agentic:llm-friendly-context`, `agentic:cli-for-agents`,
`agentic:book-to-skill`.
