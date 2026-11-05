# Fleets (herdr) — area of the `agents` plugin

Four skills for running a [herdr](https://herdr.dev) multi-agent worker fleet: one for each
side of the orchestrator/worker protocol, one that wraps the terminal workspace manager in
deterministic scripts, and one that sets up the machine. This area was the `herdr` plugin in 2.x;
the skills kept their names and are now `agents:herdr-*`.

## Skills

| Skill | Role |
|---|---|
| `herdr-orchestrator` | You decompose the work, register tasks with declared file ownership, write a briefing file per task, spawn workers by tier (sonnet, opus, fable, codex-sol, codex-terra), unblock them, verify their DONE, and retire the pane. You never do the work yourself. |
| `herdr-worker` | The other side: receive a briefing, work independently, record progress in the session ledger, ask the orchestrator through `horch` when blocked, report a `[role] DONE` summary before the pane closes. |
| `herdr-atomic` | Deterministic scripts for driving herdr directly — the terminal workspace manager that keeps agent sessions alive in persistent panes. |
| `herdr-setup` | Checks what this machine has against what the fleet needs (herdr CLI and version, `horch` on PATH pointing at this plugin, agent integrations, `jq`/`python3`) and fixes only the gaps. Run it after install or update, or when anything is missing. |

A session picks its own side: if the spawn prompt names a role like `sonnet-1` or mentions a
session ledger, it is a worker; anything else in a fleet is the orchestrator.

## Requirements

**The herdr CLI is not bundled** — install it from [herdr.dev](https://herdr.dev) first
(`brew install herdr`). Then let the setup skill find the delta:

```bash
# read-only: what is missing on this machine (exit 1 if anything is)
python3 plugins/agents/skills/herdr-setup/scripts/setup.py --check
# fix only the gaps the check reported, then re-check
python3 plugins/agents/skills/herdr-setup/scripts/setup.py --apply
```

Or ask Claude to run the `agents:herdr-setup` skill, which does exactly that. The check covers
the herdr version (0.8.2 or newer), the `horch` symlink in `~/.local/bin` (`HORCH_BIN_DIR`
overrides) and whether it still points at *this* copy of the plugin — a plugin update moves the
cache path and leaves the old link dangling — the `herdr integration install` hooks that give
native session-id restore for each engine you have, and `jq`/`python3` for the atomic scripts.
Loose `herdr-*` links in `~/.claude/skills` are only created for a cloned repo; a plugin install
already exposes the skills as `agents:<skill>`, and stale loose links are reported as a conflict
(remove them with `--prune-loose-skills`). Running the herdr installer needs `--install-herdr`.

`install.sh` in `herdr-orchestrator/scripts` still exists and is now a wrapper for `--apply`.

`horch` handles the terminal grid, tier launch flags, trust dialogs, session ids and the ledger,
so the orchestrator skill never calls `herdr` directly. `horch --version` prints the shipped
version.

## Changelog

Versions of the former `herdr` plugin. In 3.0.0 the skills moved into `agents` 1.0.0 unchanged.

- **1.1.0** — new `herdr-setup` skill with `scripts/setup.py` (check-then-apply, idempotent);
  `install.sh` becomes a wrapper for it; `horch --version`; `horch` no longer links skills into
  `~/.claude/skills` when running from a plugin install, honours `CLAUDE_SKILLS_DIR`, and fails
  early with a pointer to `agents:herdr-setup` when `herdr` is missing; boot and worker prompts
  name the skills in namespaced form (`agents:herdr-orchestrator`, `agents:herdr-worker`).
- **1.0.0** — initial release.

## How it works with the other plugins

- `game:fleet-game-dev` is the Godot and game side of a fleet: worktrees, a slot runner, locks and
  a steward who lands branches. It sends the generic loops here: `agents:herdr-worker`,
  `agents:herdr-orchestrator`, and `agents:herdr-setup` when the fleet tool fails to install or
  start.
- `software:swarm` runs an agent team inside one session; the skills here run a fleet of
  sessions in persistent panes.

## Fleet state is local, not repo content

A running fleet writes `.herdr-orchestrator/` (ledger, briefs) and per-task workspace folders
into whatever project it is pointed at. Both are gitignored in this repo — they are run data for
one machine, not marketplace content.

## Invoking

Namespaced under the plugin: `agents:herdr-orchestrator`, `agents:herdr-worker`,
`agents:herdr-atomic`, `agents:herdr-setup`.
