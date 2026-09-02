---
name: herdr-atomic
description: "Deterministic scripts for driving herdr, the terminal workspace manager that keeps coding agents alive in persistent panes. Use this skill whenever herdr is mentioned by name, and also whenever the task calls for running a command in another pane, delegating work to a second or parallel coding agent, orchestrating several agents at once, reading or waiting on another pane's output, or checking what agents are currently running — even if the user never says the word 'herdr'. Each script performs one atomic action and returns JSON with fixed exit codes, so never hand-compose herdr CLI invocations or parse its output yourself. Requires herdr 0.8.2 or newer."
---

# herdr-atomic

Ten scripts in `scripts/`. Each one performs a complete action and prints a single
JSON object on stdout. Run them; do not reconstruct what they do from raw `herdr`
commands.

That restriction is the point. The herdr CLI has sharp edges that cost a run to
discover — responses that are not valid JSON, a `pane run` that reports no exit
status, an `agent start` that returns success onto a dialog whose default button
quits the agent. Every script here already handles the edge it touches. Composing
the CLI by hand means rediscovering them.

## Choosing a script

| You want to | Run |
|---|---|
| Check herdr is usable and see what is live | `preflight.sh` |
| List workspaces, panes, and agents | `snapshot.sh` |
| Make somewhere to work | `new_pane.sh` |
| Run a command and get its exit code and output | `run_cmd.sh` |
| Read what is on a pane or agent screen | `read_pane.sh` |
| Block until an agent settles or text appears | `wait_for.sh` |
| Start a coding agent in its own pane | `spawn_agent.sh` |
| Give a running agent work and get its reply | `ask_agent.sh` |
| Press keys — answer a dialog, interrupt a process | `send_keys.sh` |
| Close what these scripts created | `cleanup.sh` |

Every script accepts `--session NAME` and `-h`. Run `-h` for its full arguments.

## Exit codes

Branch on the exit code. It is the same everywhere, so you never need to read the
message to decide what to do next.

| Code | Meaning | What to do |
|---|---|---|
| 0 | Success | Continue. |
| 2 | Bad arguments to the script | Fix the call; check `-h`. |
| 3 | Not inside herdr and no session named | Pass `--session NAME`. |
| 4 | herdr missing, too old, or no server running | Report it; do not retry. |
| 5 | Timed out | The work may still be running. Read the pane before assuming failure. |
| 6 | Agent is blocked at a dialog | `read_pane.sh` it, then `send_keys.sh`. Never guess. |
| 7 | Pane or agent does not exist | Re-check with `snapshot.sh`. |
| 8 | Other herdr error | Read `.message`. |

`run_cmd.sh` is the exception worth remembering: a command that fails still exits
**0**, because running it was successful. The command's own status is in
`.exit_code`.

## The two guarantees worth knowing

**Nothing implicit.** These scripts act inside a herdr pane (`HERDR_ENV=1`) or on a
session you name with `--session`. With neither, they exit 3 rather than reach for
whichever pane happens to be focused — that pane may belong to the human.

**Nothing you did not create.** Creating scripts record what they made.
`cleanup.sh` closes only those records, so it cannot close the user's own work.
Use `--dry-run` to see the list first.

## Typical flows

Run something and check the result:

```bash
scripts/run_cmd.sh --cmd "npm test" --new-pane --timeout 300000
# -> {"ok":true,"pane_id":"w1:p3","exit_code":1,"output":"..."}
```

Delegate to another agent:

```bash
scripts/spawn_agent.sh --kind codex --name reviewer --cwd "$PWD"
# -> {"ok":true,"agent":"reviewer","pane_id":"w1:p4","kind":"codex","status":"idle"}
scripts/ask_agent.sh --agent reviewer --prompt "Review the current diff." --timeout 600000
# -> {"ok":true,"agent":"reviewer","status":"idle","text":"..."}
```

Fan work out to several agents by spawning them all first, then prompting each —
`ask_agent.sh` blocks until its agent settles, so prompt in one pass and collect in
another rather than spawning and waiting one at a time.

When `spawn_agent.sh` or `ask_agent.sh` exits 6, the agent is alive and waiting on a
question:

```bash
scripts/read_pane.sh --agent reviewer --source visible   # see what it asked
scripts/send_keys.sh --agent reviewer down enter         # answer deliberately
```

Read the dialog before answering it. First-run agents commonly open a trust prompt
whose highlighted default is *No, exit*, so a reflexive `enter` quits the agent
instead of continuing.

## Working sensibly

Keep the human's focus where they left it — creation defaults to `--no-focus`;
pass `--focus` only when the user asked to be taken somewhere.

Prefer `run_cmd.sh` over typing a command with `send_keys.sh`. It submits
atomically and returns the real exit code; typing plus `enter` gives you neither.

Split panes get narrower each time. For more than two or three parallel agents,
give each its own tab with `new_pane.sh --where tab`.

Agent names must match `[a-z][a-z0-9_-]{0,31}` and be unique among live agents.
Omit `--name` and one is generated.

If `wait_for.sh --pane --match` returns instantly, check the matched line: herdr's
snapshot includes text already on screen, so a pattern can match the command being
echoed rather than its output. `run_cmd.sh` avoids this with a unique end-marker;
prefer it for anything you are running yourself.

## Reference

`references/herdr-cli.md` holds the details these scripts wrap — read it only when
you need something the scripts do not cover, such as worktrees, plugins, or
pane geometry.
