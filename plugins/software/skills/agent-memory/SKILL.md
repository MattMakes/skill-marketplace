---
name: agent-memory
description: Use when a project's CLAUDE.md has grown past what anyone reads and you want the agent to learn durable facts from its own sessions instead — or when asking why the agent keeps re-learning the same correction, why a remembered rule is wrong, or where a memory line came from. Implements a four-tier store (L0 transcripts / L1 candidates / L2 project context / L3 stable persona) where promotion is earned by recurrence across sessions and days, never by one confident statement, and nothing reaches a committed file without a human adopting it.
argument-hint: "[optional: status | why \"<claim>\" | a tier name]"
license: MIT
metadata:
  version: 1.0.0
  build_pattern: "Tencent TencentDB-Agent-Memory's tiering concept rebuilt natively on Claude Code hooks; deterministic recurrence gates, no LLM, no database"
---

# Agent Memory — promotion is earned, not asserted

> **Portability:** stdlib only. No database, no embeddings, no network, no LLM calls.

## The problem

A project's `CLAUDE.md` is a memory system with one tier and no eviction: every
durable fact and every passing preference land in the same always-loaded file,
until the important lines are diluted by the incidental ones. Facts learned
mid-session vanish at teardown unless someone writes them down.

**The fix is not more storage — it is a promotion ladder.** A claim earns its
way toward always-loaded context by recurring; a human confirms the last step.

## The four tiers

Tiers are distinguished by **injection policy**, not storage format.

| Tier | Holds | Injected | Committed |
|---|---|---|---|
| **L0** | raw session transcripts | never | no (already on disk) |
| **L1** | candidate atoms | on relevance, at prompt time | no (gitignored) |
| **L2** | this project's context | every session start | yes, after adopt |
| **L3** | stable cross-project persona | always | yes, after adopt |

## The gates

Nothing moves up because it sounded important. It moves up because it recurred.

- **L0 → L1** — an explicit marker fires (a directive, a correction, a stated
  preference, a named lesson, a reproducible failure). Rule-based, high
  precision, deliberately low recall.
- **L1 → L2** — ≥ 3 distinct sessions spanning ≥ 2 distinct calendar days. A
  claim stated outright needs 2 sessions; the distinct-day rule still applies. A
  verified claim promotes on one observation and is the only day-exempt path.
- **L2 → L3** — held in ≥ 2 distinct projects, aged ≥ 30 days, uncontested.

**Two gates refuse rather than guess.** A claim whose text was altered by
redaction never promotes on evidence alone — the flag firing is evidence the
source was sensitive, and a lexical filter finding one secret is not proof it
found all of them. A claim with an open contradiction is frozen at L1 until a
human resolves it; the incumbent is never silently overwritten.

## Use it

```bash
S=${CLAUDE_PLUGIN_ROOT}/skills/agent-memory/scripts

# what is remembered, and what is blocking the next promotion
python3 "$S/memory_inspect.py" --tier L1

# where did this line come from — sessions, days, transcript, quoted source
python3 "$S/memory_inspect.py" --why "PR base branch is dev"

# every claim with an open contradiction, both directions of the join
python3 "$S/memory_inspect.py" --contested

# dry-run the promotion pass; writes nothing
python3 "$S/memory_promote.py"
```

Every script takes `--sample` and `--output json`, and reads `./.memory/` unless
`--memory-dir` says otherwise. `validate_examples.py` runs the 69 drift checks
over `DESIGN.md` and the schema.

Three hooks run the loop unattended **once you opt in**: `SessionStart` injects
L2 + L3, `UserPromptSubmit` recalls relevant L1 atoms, `SessionEnd` captures and
stages. Installing the plugin wires none of them. To turn the loop on, copy the
three entries from [`scripts/hooks.json`](scripts/hooks.json) into the `hooks`
section of your `settings.json`; each command runs
`${CLAUDE_PLUGIN_ROOT}/skills/agent-memory/scripts/<hook>.py`. Without the
hooks the scripts still work by hand: `memory_extract.py <transcript.jsonl>`
shows what a session would capture (it prints, never writes); piping a hook
payload — `{"transcript_path": "...", "cwd": "...", "session_id": "..."}` — into
`session_end.py` performs the capture; `memory_promote.py --stage` stages.
Each hook is disabled independently with `AGENT_MEMORY_SESSIONSTART=0`,
`AGENT_MEMORY_USERPROMPTSUBMIT=0`, `AGENT_MEMORY_SESSIONEND=0`. Every hook fails
open: a broken memory system costs you memory, never a session.

## Commands

Argument: `status` (default) | `why "<claim>"` | `contested` | `adopt` |
`forget "<claim>"`. All are read-only except where stated.

**`status`** — run `memory_inspect.py --tier L3`, `--tier L2`, `--tier L1`; read
`.memory/staged/promotions.json` if it exists; read the last 7 days of
`.memory/errors.log` if it exists and **surface any entry** — that file is where
silently dropped writes are recorded, and a log nobody is pointed at is the same
as no log. Report, in this order: what is always loaded (L3), what this project
loads (L2), how many candidates are waiting and what is blocking each, what is
staged for adoption, and any dropped writes. **Do not adopt anything here.**

**`why "<claim>"`** — run `memory_inspect.py --why "<claim>"`. Report the full
provenance: observation count, distinct sessions, distinct calendar days, first
and latest transcript back-pointers, whether each resolves, and the quoted
source line when exactly one transcript matched. If the resolution status is
**`ambiguous`**, say so plainly and print no source line. Two projects can hold
a transcript of the same basename; guessing attaches a real claim to the wrong
session, and a wrong citation is worse than none.

**`contested`** — run `memory_inspect.py --contested`. For each pair, present
both claims with their dates and sources side by side and ask the user which
governs. **Do not pick.** Do not merge them. Do not mark one resolved on your
own judgement — resolution is a human decision by design.

**`adopt`** — the only command that writes. Six steps, in order, no skipping:

1. Run `memory_promote.py --stage` to refresh `.memory/staged/promotions.json`.
2. **Back up both `CLAUDE.md` files** (project and global) with a timestamped
   copy. Do this before writing anything, every time.
3. Walk the staged list **one atom at a time**. For each, show the claim, the
   evidence (sessions, days, sources), and the target file. Wait for the user.
4. **Refuse outright** any atom with `redacted: true` — no amount of evidence
   substitutes for the human reading the original. Explain why and move on.
5. **Refuse** any atom whose citation does not resolve.
6. Append accepted atoms to the target `CLAUDE.md` under a clearly marked
   `<!-- agent-memory: adopted -->` section, and log each to `.memory/adopted.log`.

Never write to a `CLAUDE.md` outside this flow. Never batch-accept.

**`forget "<claim>"`** — locate the atom with `memory_inspect.py --why "<claim>"`;
show the user exactly what will be removed, from which tier, and whether it was
already adopted into a `CLAUDE.md`; on confirmation, remove it from
`.memory/atoms.jsonl` and, if it was adopted, remove the corresponding line from
the `CLAUDE.md` — after backing that file up. Removing an atom does **not**
prevent re-learning: if the marker fires again in a future session, it returns.
To stop it returning, change the underlying fact or state the correction — a
correction is itself a high-confidence observation.

**Refuse and route.** No `.memory/` directory yet → say so; it is created on the
first session end with the hooks installed, nothing is wrong. User asks to lower
a promotion threshold so something passes → refuse; gates are changed in the
open, in `DESIGN.md`, not per-claim; offer to record the case as evidence the
threshold is wrong. User asks to design or price a memory system generally →
that is an audit of memory systems, which this skill is a subject of, not the
tool for.

## Hard rules

1. **Redact before writing.** Every atom passes the filter before it reaches
   disk. Anything altered is quarantined from promotion.
2. **Propose, never apply.** Promotions land in `.memory/staged/`. Only the
   explicit `adopt` flow above touches a `CLAUDE.md`, and it backs both up first.
3. **Cite, don't invent.** Every atom carries a back-pointer to the transcript
   line that produced it. `--why` resolving to *ambiguous* prints nothing rather
   than guess: a wrong citation is worse than a missing one.
4. **Never surface a contested claim as fact.** It is still injected — hiding
   the conflict is worse — but always tagged.
5. **The committed tiers carry no paths.** Promotion strips the back-pointer
   prefix, which embeds an OS username.

## Forcing questions

Walk these one at a time before trusting the store.

1. Which line in your `CLAUDE.md` did you last actually read before acting?
2. Would you rather the agent forget a true thing, or remember a false one?
3. When two remembered rules disagree, who decides — and when?
4. What would make you delete `.memory/` entirely?

Rationale, open decisions, field schema: [`DESIGN.md`](DESIGN.md).
