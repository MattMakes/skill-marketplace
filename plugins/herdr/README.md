# herdr — fleet orchestration

Three skills for running a [herdr](https://herdr.dev) multi-agent worker fleet: one for each
side of the orchestrator/worker protocol, and one that wraps the terminal workspace manager in
deterministic scripts.

```bash
claude plugin install herdr@skill-marketplace
```

## Skills

| Skill | Role |
|---|---|
| `herdr-orchestrator` | You decompose the work, register tasks with declared file ownership, write a briefing file per task, spawn workers by tier (sonnet, opus, fable, codex-sol, codex-terra), unblock them, verify their DONE, and retire the pane. You never do the work yourself. |
| `herdr-worker` | The other side: receive a briefing, work independently, record progress in the session ledger, ask the orchestrator through `horch` when blocked, report a `[role] DONE` summary before the pane closes. |
| `herdr-atomic` | Deterministic scripts for driving herdr directly — the terminal workspace manager that keeps agent sessions alive in persistent panes. |

A session picks its own side: if the spawn prompt names a role like `sonnet-1` or mentions a
session ledger, it is a worker; anything else in a fleet is the orchestrator.

## Requirements

**The herdr CLI is not bundled** — install it from [herdr.dev](https://herdr.dev) first. Then:

```bash
plugins/herdr/skills/herdr-orchestrator/scripts/install.sh
```

That symlinks `horch` into `~/.local/bin` (override with `HORCH_BIN_DIR`) so every worker the
orchestrator spawns can find it, and installs the agent integrations that give native session-id
restore. It also writes into your skills directory — override with `CLAUDE_SKILLS_DIR`.

`horch` handles the terminal grid, tier launch flags, trust dialogs, session ids and the ledger,
so the orchestrator skill never calls `herdr` directly.

## Fleet state is local, not repo content

A running fleet writes `.herdr-orchestrator/` (ledger, briefs) and per-task workspace folders
into whatever project it is pointed at. Both are gitignored in this repo — they are run data for
one machine, not marketplace content.

## Invoking

Namespaced under the plugin: `herdr:herdr-orchestrator`, `herdr:herdr-worker`,
`herdr:herdr-atomic`.
