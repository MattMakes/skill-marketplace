# herdr CLI reference (0.8.2)

What the scripts in `../scripts/` wrap, plus the areas they deliberately leave
alone. Read this only when you need something the scripts do not cover.

## Contents

- [Verified behaviour and traps](#verified-behaviour-and-traps)
- [IDs and caller context](#ids-and-caller-context)
- [Layout: workspace, tab, pane](#layout-workspace-tab-pane)
- [Pane input and output](#pane-input-and-output)
- [Agents](#agents)
- [Read sources](#read-sources)
- [Not wrapped: worktrees, plugins, sessions](#not-wrapped-worktrees-plugins-sessions)

## Verified behaviour and traps

Each of these was confirmed against herdr 0.8.2, and each is already handled by
the corresponding script.

**Responses can be invalid JSON.** Terminal escape bytes from the user's shell
prompt are copied unescaped into `.result.read.text`, so `jq` fails on the
document. Strip C0 control bytes first, keeping tab and newline:
`LC_ALL=C tr -d '\000-\010\013-\037\177'`.

**`pane run` has no exit status.** It types a command and returns immediately.
To recover the status, append a marker carrying `$?` and wait for it:

```bash
tok="HERDR$(od -An -N6 -tx1 /dev/urandom | tr -d ' \n')"
herdr pane run "$pane" "( $cmd ) ; printf '$tok rc=%s\n' \"\$?\""
herdr pane wait-output "$pane" --regex "$tok rc=[0-9]+" --timeout 120000
```

Three details make this work. The subshell keeps `exit` or `set -e` inside the
command from killing the pane's shell. The token is unique per invocation because
`wait-output` matches text already in the scrollback, so a reused token matches a
previous run instantly. And the marker prints `rc=%s`, so herdr's echo of the
command line contains `rc=%s` while only the result line contains `rc=<digits>` —
which is what stops the regex matching the echo.

**`wait-output --match` can match the command's own echo.** The snapshot includes
what is already on screen, including the line herdr echoed.

**`agent start` can succeed onto a dialog.** It may return success while the agent
is still painting a first-run trust or login prompt, which herdr reports as
`unknown`, not `blocked`. Prompting then sends Enter into that dialog. Claude Code
highlights *No, exit*, so the agent quits. Wait for a settled `idle`/`done`/`blocked`
before treating a start as ready.

**Pane-busy is a process-group question.** A pane is idle at its shell when
`foreground_process_group_id == shell_pid`. Counting `foreground_processes` does
not work — a shell still sourcing its rc files shows several while being idle.

**Error shapes differ.** Most commands return `{"error":{"code":...}}`; waits
return a bare `{"code":...}`. Read `.error.code // .code`.

**Exit codes.** `1` server error (JSON on stderr), `2` CLI syntax error.

## IDs and caller context

Opaque and stable: workspace `w1`, tab `w1:t1`, pane `w1:p1`. Closed IDs are never
reused. Read IDs from JSON responses; never predict them.

`workspace create` returns `.result.workspace`, `.result.tab`, `.result.root_pane`.
`tab create` returns `.result.tab` and `.result.root_pane`. `pane split` returns
`.result.pane`. After `pane move`, continue with `.result.move_result.pane.pane_id`;
a cross-workspace move changes the pane's ID.

Inside a managed pane: `HERDR_ENV=1`, `HERDR_PANE_ID`, `HERDR_TAB_ID`,
`HERDR_WORKSPACE_ID`. Other useful variables: `HERDR_SESSION` selects a named
session for CLI commands, `HERDR_CONFIG_PATH`, `HERDR_SOCKET_PATH`, `HERDR_LOG`.

Omitting a pane target uses whichever pane the UI has focused — which may belong to
the human or another client. Always pass an explicit ID or `--current`.

## Layout: workspace, tab, pane

```bash
herdr workspace list | create [--cwd PATH] [--label TEXT] [--env K=V] [--focus|--no-focus]
herdr workspace get|focus|close <workspace_id>
herdr tab list [--workspace ID] | create [--workspace ID] [--cwd PATH] [--label TEXT]
herdr tab get|focus|close <tab_id>
herdr pane list [--workspace ID] | current [--current] | get <pane_id>
herdr pane split [<pane_id>|--current] --direction right|down [--ratio F] [--cwd PATH]
herdr pane close <pane_id>
```

Creation leaves focus unchanged by default. Closing a workspace's last tab closes
the workspace. Geometry helpers: `pane layout`, `pane edges`, `pane neighbor
--direction`, `pane resize --direction [--amount F]`, `pane zoom`, `pane swap`,
`pane move`.

## Pane input and output

```bash
herdr pane run <pane_id> <command>          # types command + Enter atomically
herdr pane send-text <pane_id> <text>       # literal, no Enter
herdr pane send-keys <pane_id> <key>...     # logical keys
herdr pane read <pane_id> [--source S] [--lines N] [--ansi]
herdr pane wait-output <pane_id> (--match TEXT|--regex PATTERN) [--timeout MS]
herdr pane process-info [--pane ID|--current]
```

Key syntax: printable (`a`), named (`enter`, `tab`, `esc`, `backspace`, arrows),
chords (`ctrl+c`, `alt+x`, `shift+tab`), function keys (`f1`), named punctuation
(`minus`, `plus`, `backtick`). `escape` is accepted for `esc`; `C-c` for `ctrl+c`.

Prefer `pane run` over send-text plus send-keys: it honours bracketed paste and
submits atomically.

## Agents

```bash
herdr agent list | get <target>
herdr agent start <name> --kind KIND --pane ID [--timeout MS] [-- <args>]
herdr agent prompt <target> <text> [--wait] [--until STATUS]... [--timeout MS]
herdr agent wait <target> [--until STATUS]... [--timeout MS]
herdr agent read <target> [--source S] [--lines N]
herdr agent send-keys <target> <key>...
herdr agent rename|focus|attach <target>
```

Targets are a unique live agent name or the pane ID hosting it — not terminal IDs
or bare kind labels. Names: `[a-z][a-z0-9_-]{0,31}`, unique among live agents,
cleared when the agent exits or is replaced.

Kinds: `pi claude codex gemini cursor devin agy cline omp mastracode opencode
copilot kimi kiro droid amp grok hermes kilo qodercli qwen maki`.

`agent start` needs a pane already at its shell prompt and never creates layout.
Startup timeout defaults to 30000ms; explicit values must be 3001–300000.

Lifecycle states: `idle` ready and its tab has been seen in the focused UI; `done`
the same idle state after unseen background work finished; `working`; `blocked` at
a recognized approval or question UI; `unknown` present but unclassified —
which does **not** mean finished. In JSON the field is `agent_status`, and the
agent's kind is in `agent`.

`agent prompt` rejects a blocked agent with `agent_blocked` before sending input.
With `--wait`, a prompt from a non-working state must produce a lifecycle change
within five seconds or returns `agent_prompt_stalled`. It tracks lifecycle, not
individual turns: if the agent is already working, the current turn finishing can
satisfy the wait.

Full-screen agents (Claude Code, OpenCode) render history on the terminal's
alternate screen. For an idle agent at the bottom of its transcript, `recent` reads
with `--lines` beyond the visible screen use the agent's scroll interface
automatically; the same request while it is working returns `agent_not_idle`. If a
long answer still will not come back, ask the agent to write it to a file and reply
with the path, then read the file.

## Read sources

| Source | Meaning |
|---|---|
| `visible` | Current rendered screen. Best for dialogs and UI state. |
| `recent` | Recent scrollback with terminal wrapping. |
| `recent-unwrapped` | Recent scrollback, soft wraps joined. Best for logs and transcripts. |
| `detection` | Bottom-buffer snapshot used by agent detection. `agent read` only. |

## Not wrapped: worktrees, plugins, sessions

Deliberately outside the scripts. Use the CLI directly.

```bash
herdr worktree list|create|open|remove [--workspace ID|--cwd PATH] [--branch NAME] [--base REF]
herdr plugin install <owner>/<repo>[/subdir] | list | enable | disable | uninstall
herdr plugin action list|invoke <action_id>
herdr session list [--json] | attach <name> | stop <name> | delete <name>
herdr status [server|client]
herdr api schema [--json]
herdr notification show <title> [--body TEXT] [--sound none|done|request]
herdr integration install|uninstall <agent> | status
```

`worktree create` makes a Git checkout and opens it as a workspace grouped with the
parent repo. `workspace close` closes only herdr state; `worktree remove` deletes
the checkout and never deletes the branch.

Never run `herdr server stop` from an active session, and never kill the main herdr
process — both take the user's panes down with them.
