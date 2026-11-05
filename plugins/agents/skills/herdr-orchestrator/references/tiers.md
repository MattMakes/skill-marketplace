# Tiers: engines, models, effort

A tier is a name for *(engine, model, effort)*. `horch tiers` prints the live catalog
and the exact command each tier launches. Nothing here is fixed — you can point a tier
at any Claude Code model, any Codex model, or a local model via `pi`, at any effort
level.

## Built-in catalog

| Tier | Engine | Model | Default effort | Usual range |
|---|---|---|---|---|
| `haiku` | Claude Code | `haiku` | low | low–medium |
| `sonnet` | Claude Code | `sonnet` | medium | low–high |
| `opus` | Claude Code | `opus` | high | high–max |
| `fable` | Claude Code | `fable` | xhigh | high–max |
| `codex-terra` | Codex | `gpt-5.6-terra` | low | minimal–medium |
| `codex-sol` | Codex | `gpt-5.6-sol` | high | medium–high |
| `pi` | pi | *(unset)* | — | — |

Claude models are **unversioned aliases** — `fable` resolves to the latest Fable,
`opus` to the latest Opus, and so on. Pin a version only if you have a reason to.

## Effort

Effort is orthogonal to tier: the tier picks the mind, the effort picks how hard it
thinks. `horch tiers` prints this ladder with the current catalog.

| Effort | Engines | The work it fits |
|---|---|---|
| `minimal` | codex | Trivial single-file edits that are spelled out exactly. |
| `low` | both | Mechanical, fully specified, no decisions: renames, a mirrored test, applying a described diff, run-and-report. |
| `medium` | both | Ordinary implementation with local judgment: a function to spec, a clearly diagnosed bug, straightforward tests. |
| `high` | both | Needs a plan held in mind: multi-file features, refactors with taste, subtle bugs, migrations, performance fixes. |
| `xhigh` | claude | Open-ended reasoning: architecture, ambiguous root-cause hunts, tricky algorithms, security review, fleet planning. |
| `max` | claude | Last resort: already failed at xhigh, or an expensive irreversible call. Slow and costly. |

Claude accepts `low, medium, high, xhigh, max`. Codex accepts
`minimal, low, medium, high` (passed as `-c model_reasoning_effort=...`). `horch`
validates the level against the engine before launching, so an `xhigh` Codex spawn
fails immediately with a readable error instead of a dead pane.

Raise a level when a worker comes back blocked on judgment. Lower a level when the
briefing already specifies the change precisely — writing a sharper brief is cheaper
than buying more reasoning.

## Launch commands

**Claude Code** — always launched in auto mode so a worker never stalls on a
permission prompt, and always with a pre-generated session id so the session can be
resumed later even though the pane is closed:

```
claude --session-id <uuid> --model <model> --permission-mode auto --effort <level>
```

Effort levels: `low`, `medium`, `high`, `xhigh`, `max`.

Resume: `claude --resume <session-id> --model <model> --permission-mode auto`

**Codex** — launched non-interactive-approval so it runs unattended:

```
codex -m <model> -c model_reasoning_effort="<level>" --sandbox workspace-write --ask-for-approval never
```

Effort levels: `minimal`, `low`, `medium`, `high`.

Resume: `codex resume <session-id> ...`. Codex has no `--session-id` flag, so `horch`
records the newest rollout id under `~/.codex/sessions/` at spawn time.

**pi** — `pi --model <model>`. Point it at a local model in `tiers.json`.

## The orchestrator's own tier

`horch "<goal>"` runs the orchestrator on `opus` by default - orchestration is
judgment work, and it is the session whose context matters most. Override with
`horch --tier fable "<goal>"` (heavier planning) or `horch --tier sonnet "<goal>"`
(cheap, for small or well-understood jobs).

## Overriding

Per spawn:

```bash
horch spawn opus  --effort max  --brief .herdr-orchestrator/briefs/hard-refactor.md
horch spawn sonnet --effort low --brief .herdr-orchestrator/briefs/rename.md
```

Per project — `<project>/.herdr-orchestrator/tiers.json` is merged over the defaults:

```json
{
  "codex-terra": { "model": "gpt-5.6-terra", "effort": "medium" },
  "pi":          { "engine": "pi", "model": "qwen3-coder-30b", "args": ["--local"] },
  "reviewer":    { "engine": "claude", "model": "opus", "effort": "xhigh",
                   "args": ["--append-system-prompt", "You review, you do not write code."],
                   "use": "second-opinion review pass" }
}
```

Any key you add becomes a spawnable tier. `args` are appended verbatim to the launch
command.

## Inherited environment (why `--resume` used to silently fail)

Worker panes inherit the herdr server's environment, and if the orchestrator is
itself a Claude Code session that environment carries `CLAUDECODE`,
`CLAUDE_CODE_SESSION_ID`, `CLAUDE_CODE_CHILD_SESSION` and friends. A worker that
inherits them believes it is a nested child session and **disables transcript
saving** — it runs fine, but nothing is written to `~/.claude/projects/`, so
`--resume <session-id>` later fails with "No conversation found".

`horch spawn` therefore prefixes every launch with `env -u ...` for those variables.
That is why the command it prints is so long. Don't launch workers with a bare
`herdr pane run "claude ..."` — you'll lose resumability without any warning.

## First-run dialogs

Claude Code shows a workspace-trust prompt the first time it runs in a directory, and
herdr reports the pane as `idle` while that prompt is up. `horch spawn` polls the
screen and answers it, then waits for the real ready state. If a worker ever seems
parked at startup, `horch peek <role>` shows exactly what is on its screen.
