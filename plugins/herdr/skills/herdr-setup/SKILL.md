---
name: herdr-setup
description: Use when the herdr plugin was just installed or updated, before the first `horch` run on a machine, or when something in the fleet is missing - `horch: command not found`, `herdr is not installed`, `herdr too old`, a worker `--resume` that fails with "No conversation found", a tier that never comes up, or herdr agent integrations reported as not installed. Also use when asked whether herdr / horch is set up on this machine.
---

# herdr-setup

The herdr plugin depends on things outside the plugin: the `herdr` CLI, a `horch`
symlink on PATH that points at *this* copy of the plugin, herdr's per-agent
integrations, and `jq`/`python3`. None of them is bundled. This skill finds the
delta between what the machine has and what the fleet needs, and fills only that.

**Check first, apply only what the check flags.** Never run `--apply` on a clean
report; never reinstall something the check says is `OK`.

## Steps

1. Run the check (read-only, exits 1 when there is a gap):

   ```bash
   python3 ${CLAUDE_PLUGIN_ROOT}/skills/herdr-setup/scripts/setup.py --check
   ```

   Outside a plugin install, use the path relative to this SKILL.md: `scripts/setup.py`.

2. Read the table. Rows are `OK`, `GAP`, `WARN` or `INFO`. Only `GAP` rows stop a
   fleet from working. Each `GAP`/`WARN` row prints its `fix:` line.

3. If there are gaps, apply them:

   ```bash
   python3 ${CLAUDE_PLUGIN_ROOT}/skills/herdr-setup/scripts/setup.py --apply
   ```

   `--apply` fixes only gaps, then re-checks and prints the new table. Two fixes
   are gated behind explicit flags because they touch things this plugin did not
   create - tell the user and let them decide before adding either:
   - `--install-herdr` runs the herdr installer (`brew install herdr`, else `curl | sh`).
   - `--prune-loose-skills` removes `herdr-*` symlinks in `~/.claude/skills` that
     point at another copy and would shadow the plugin's own skills.

4. Report the final table to the user. A `WARN` about PATH needs a shell rc edit
   the user makes themselves.

## What the check knows

| Component | Gap means | Fix applied |
|---|---|---|
| herdr | missing or older than 0.8.2 | print install line; `herdr update`; install only with `--install-herdr` |
| horch link | missing, dangling (plugin update moved the cache path), or pointing at another copy | relink to this plugin's `horch` |
| integration `<engine>` | engine binary exists but `herdr integration status` says not installed | `herdr integration install <engine>` |
| skill links | cloned-repo mode only: `~/.claude/skills/herdr-*` missing or stale | symlink; in plugin mode never linked |
| jq, python3 | missing | print `brew install` line |

`HORCH_BIN_DIR`, `CLAUDE_SKILLS_DIR` and `HERDR_BIN_PATH` override the defaults.
`--json` gives the same rows as JSON.

## Common mistakes

- Running `install.sh` again on every problem. It is now a wrapper for `--apply`;
  the check is the diagnosis, run that first.
- Treating `INFO engine pi: not installed` as a failure. Missing engines only make
  that tier unavailable.
- Deleting a real `~/.claude/skills/herdr-*` directory. The script refuses; the
  user moves it aside.
