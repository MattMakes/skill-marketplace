---
name: fleet-game-dev
description: >-
  Habits that let many agent sessions build one Godot game at the same time without
  breaking each other: one git worktree per plan unit, a fresh import, a baseline, small
  committed steps, merges of a moving base, a finish gate, and a clean land. It also covers
  the shared-machine rules (a slot runner for headless Godot, mkdir locks for the window,
  the timing machine and the main checkout), scope questions, dependency waits, compaction
  handoffs, long runs, the steward who lands branches, the balance lead, and the owner who
  decides gameplay changes. Use it whenever a fleet, an orchestrator, a worker, a steward
  or several parallel agents work on a game repo, or someone asks how to split a feature
  into parallel units, why a worktree fails its tests after a merge, how to land a branch
  safely, how to stop agents from overloading one machine, or how a worker should wait or
  ask, even if nobody says "fleet".
---

# Fleet Game Dev

A game built by many agent sessions breaks in ways a solo project never sees. Two workers
edit the same row, a fresh worktree fails 40 tests because its import cache is empty, 20
headless runs load the machine while the human plays, a question gets lost and a worker
idles for hours, and a DONE claim hides a red suite. The method gives each plan unit its
own worktree and a fixed loop: import, baseline, small steps, merge, finish gate, land. It
puts every shared resource behind one lock shape and every decision behind one message
shape. It works because each failure above has one owner and one check, so a fresh session
can follow the loop and land clean work without the history.

This skill is the Godot and game side of the fleet. The herdr plugin in the same repo
gives the generic worker and orchestrator mechanics (`herdr-worker`, `herdr-orchestrator`).
Read those for the `horch` commands. Read this skill for what a game fleet adds.

## When to use

- You are a worker that gets 1 plan unit of a Godot game and must land it on a moving base.
- You orchestrate or lead a wave of parallel units on 1 game repo.
- You land other workers' branches as a steward.
- Several agents share 1 machine, 1 display or 1 checkout, and runs or locks collide.
- A worker must wait for a land, a GO, a lock or an answer, or must hand off before compaction.

## When not to use

- A single agent works alone on a branch. Use `godot-testing` for the test loop instead.
- The question is how to write the test, the bot or the seam. This skill only says when to run it.
- The fleet tool itself fails to install or start. Use the herdr plugin's setup skill.

## Words used here

| Word | Meaning |
| --- | --- |
| unit | 1 plan file with GOAL, FILES (own and do-not-touch), STEPS, DONE WHEN. 1 worker builds it. |
| base branch | The integration branch that units branch from and land on. It moves while you work. |
| orchestrator | The session that writes plans, spawns workers and answers questions. |
| steward | The only session that commits on the base branch. It lands units by hash. |
| lead | A worker that owns shared targets and shared code for a wave (for example a balance wave). |
| owner | The human who decides gameplay and looks. Only the owner's own words are direction. |
| parse check | A headless tool script that loads every project script with the autoloads and prints each parse error. |
| visual gate | A short windowed run that captures the key screens, so a human or a diff can judge them. |
| message keywords | `ready`, `NOTE`, `QUESTION`, `BLOCKED`, `READY`, `DONE`, `COMPACT-READY`. 1 keyword starts each report. |

## Method: the unit lifecycle

1. **Read the plan, the wave common file, the fleet rules and the contract in full.** Read
   a named skill only when its step comes. Check: you can name every file in your FILES
   list and every do-not-touch file.
2. **Make the worktree and branch from the base.** Use the fleet's worktree command. Never
   switch branches in the main checkout, because other sessions work there. Check:
   `git -C <worktree> branch --show-current` names your unit branch.
3. **Import before you read code or run tests.** A fresh worktree has no `.godot` cache, so
   class names do not resolve. Copy the cache from a working worktree if the rules allow,
   then run 1 headless import with a time limit. Check: the import log has no `ERROR` line.
4. **Record a baseline.** Run the full suite, or the folders you will touch, and every
   balance model or data generator. Save the outputs as "before". Check: you list every
   failure that exists before your first edit, so nobody blames you for it later.
5. **Build each plan step with its tests.** For a fix, write the test first and see it fail
   for the expected reason. Edit with an asserted script or the editor tool (see
   [Asserted scripted edits](#asserted-scripted-edits)). Check: the filtered tests pass.
6. **Commit each step after its filtered tests pass.** Commit exact files, not folders.
   Commit the `.uid` files of your own new scripts with the scripts. Leave other units'
   `.uid` files out. Check: `git status --short` shows no stray file of yours.
7. **Send a note at each milestone with counts.** A note is for a future session: files,
   decisions, dead ends. For a gap or a file outside FILES, see
   [Scope questions and blocks](#scope-questions-and-blocks).
8. **Merge the base when a relevant peer lands and before the final checks.** Read the
   incoming diff first for files that change your measures. Import again after the merge,
   then run the suite. See [Merges in a worktree](#merges-in-a-worktree). Check: no
   "Identifier not declared" or "Compilation failed" line.
9. **Run the finish gate.** Import, the project parse check, the full suite, the visual gate
   if you touched anything on screen, every generator with a clean `git status`, and a diff
   that lists only your files. The `godot-testing` skill owns the gate. Check: the gate
   output and the counts go into your notes.
10. **List the files of your own commits, not the diff against the base.** A branch that
    landed first shows up in a plain diff. Check: every file is in FILES or approved.
11. **Check that no Godot process of yours runs.** Match by binary and worktree path, not by
    name, because a name match finds your own shell. Stop only your own processes.
12. **Write the notes file.** Changes, checks with counts, gotchas for the next unit, and
    every claim checked against a log (see [Verify claims](#verify-claims-before-you-report)).
13. **Report and land.** Send READY or DONE with the commit hash, the test line and the
    changed files. Land only if the plan allows it. If the plan says "never merge" and the
    fleet rules say "land your work", ask which rule applies. Correct a wrong hash at once.

When a failure appears only after a merge, test the base alone in a detached worktree.
That proves whether the merge or the base causes it.

## Scope questions and blocks

Map every seam and out-of-scope file you need before you code. Then ask once per decision.

1. Send 1 QUESTION per decision through the message channel, not only a ledger note. Give
   the exact file and lines, 2 or more numbered options, and your recommendation.
2. Write the same question, with your measured numbers, in the unit notes file. A message
   can get lost; a notes file stays.
3. Ask for the smallest grant: 1 file or a line range. Prefer a generic seam (a signal, a
   method, a hook at the end of a shared function) over unit-specific code in a shared file.
4. Continue the independent steps. Restore any trial change the question depends on.
5. After approval, put generic seam lines on a separate seam branch from the newest base,
   with a test, so the steward lands them first.
6. Write the answer and its date in the notes file. Apply only the approved change. A
   standing rule covers the whole class; do not ask again.
7. For legacy tests that a planned change breaks: list each test with its cause, propose the
   smallest change per test, and adapt obsolete tests. Do not delete them, or coverage goes.
8. On a permission denial, stop. Do not retry in another form and do not route around it.
   Send BLOCKED with the command, the reason, and the choices: the owner runs the exact
   command, a narrow permission rule, or a skip.
9. When a plan step cannot pass, restore trial values, write the table, stop, and send
   options. Draft later steps that do not depend on it.
10. When 2 senders give different orders, hold the change and ask both for a ruling.

## Dependency waits

A planned wait for another unit's land is not a block.

1. Report `ready` and the state, not BLOCKED.
2. Check the base log for the merge subject of each dependency. Confirm the work landed with
   `git branch --merged` or `git show --stat`, not only a plan commit or a steward log line.
3. While you wait, read the plan, the code you will change, and the dependency's branch to
   learn its data shape. Do not build on an unlanded branch unless told to.
4. Do the work that does not depend on the land: independent tests, red tests for the gated
   step, the parts all options share.
5. Ask whether you can start with a stub (a constant table with the expected ids). Swap it
   for the real call after the land.
6. Wait without waste. Use a monitor that fires once when all dependencies show, or end your
   turn and let the orchestrator's notice arrive. Do not poll `git log` with `sleep`.
7. When the dependency lands, merge the base, import, run the suite, and rebuild dependent
   fixtures and captures from the new data.
8. If both land orders are possible, gate the new behaviour on the presence of the
   dependency's data at run time. Test both branches.

## Phase-gated delivery

Some units have phases that a lead or the orchestrator reviews before GO.

1. Finish the phase with its tests and commit it. Report the commit, test counts, cost
   numbers and captures.
2. Apply review fixes first.
3. While you wait, prepare the next phase as an uncommitted draft. Write needed out-of-scope
   files into the notes. Make no commit to shared files.
4. Do the no-wait items: captures, a 1-command script that rebuilds your table, findings that
   other units need. Do not idle after READY.
5. On a partial GO, commit only the approved files with their tests. Run the tests again on
   that partial commit.
6. Mark each part with a DONE-PART or READY line.
7. On a CULL order (a fresh worker replaces you), write the handoff, commit it and close.

## Compaction handoff

A long unit outlives one context. Hand off with no loss.

1. Finish the current step and its check. Do not stop inside a run or a timing batch. If a
   run must go on, note its pid and log path.
2. Commit the current state, so the handoff points at a commit. Copy helper scripts from
   `/tmp` into the unit's review folder, because `/tmp` does not survive.
3. Write the handoff: role, plan path, branch and head, done steps, files and their state,
   trials and results, decisions, rules received, open questions with answers, the next step.
4. Commit it, send a note with its path, send COMPACT-READY, and end the turn.
5. A message that arrives during the wait (an answer, a GO, a new rule) goes into the
   handoff at once. Acknowledge it; do not start it.
6. After compaction, read the handoff, the full plan and any addendum. Act on the union of
   the handoff and the resume message. Check `git status`, the last commit and live
   processes of your role.
7. Continue from the next step only. Never repeat done steps; a repeated run can double a
   table or a commit.

The orchestrator side (run the compact at once, wait on new log lines only) is in
[references/fleet-roles.md](references/fleet-roles.md#compaction-orchestrator-side).

## Long command waits

Bot sweeps, long batches and full suites often run longer than 1 tool call.

1. Time 1 smoke call. Estimate the wall time of the batch.
2. Split seeds into chunks that end well inside the call limit (for example 2 or 3 seeds per
   call), or start the batch as a tracked background job.
3. Give each Godot call a hard alarm below the limit, inside the slot runner.
4. Write each chunk to its own log with the seed range in the name. Keep resumable state.
5. Wait for the harness notice, or a monitor on an end marker: an exit-code file, a summary
   line, or no matching process. Anchor the monitor pattern, or every log line wakes you.
6. Do work that needs no Godot run while you wait. Start no second Godot process.
7. On the notice, check that the real job ended, not only a wrapper. Grep the logs for
   script errors and the summary line before you trust the result.
8. Re-arm a monitor that expires without an end event. It is not a failure.

## Shared machine: slot runner and load

Many agents and a human share 1 machine. Unbounded headless runs make it unusable.

1. Start every headless Godot run through 1 slot runner: N slot folders taken with `mkdir`,
   an owner file with role and pid, stale-pid cleanup, and the command under `nice`. The
   shipped `scripts/slot-run.sh` has this shape.
2. Put the alarm on the Godot command inside the slot, not around the runner. An alarm
   around the runner counts the slot wait, and it can stop the parent but leave the child.
3. Keep at most 1 Godot process per worker. Do not start a second run while one waits.
4. End every run by itself: a frame limit, `quit()`, `--quit-after`, or the alarm.
5. Exempt timing runs (they take the perf lock and skip `nice`) and windowed runs (they take
   a window lock).
6. Before you change N or blame load, trace each process: a real run, a waiting run, or an
   abandoned run. A load figure is not a count of games.
7. Before DONE, list Godot processes by binary and worktree path. Stop only your own and
   report others. Never start or stop the owner's game.

The Godot flags, the log check and the run cleanup are in the `headless-godot-runs` skill.

## Resource locks

Use 1 lock folder per scarce resource: each window slot, the timing machine, the main
checkout. `mkdir` is atomic, so it is a safe lock on any Unix machine.

1. Take and release in 1 shape only:
   `if mkdir "$L" 2>/dev/null; then echo "$ROLE $(date -u +%FT%TZ)" > "$L/owner"; <run>; release; fi`.
   Release means: check that the owner line names you, remove the owner file, `rmdir`.
2. Never write `mkdir "$L" && run; rm -rf "$L"`. When `mkdir` fails, the `rm` still runs and
   deletes another worker's lock.
3. Put the take-wait-run-release loop in 1 helper. The shipped `scripts/with-lock.sh` does it.
   Try each window lock in turn and take the first free one.
4. Bound the wait (for example 10 minutes in 15 s steps). Do headless work while you wait.
5. Keep each hold short (for example 3 minutes). Put the visual gate and the captures into
   1 hold. Wait 30 s after a release before a new take.
6. For an ordered lock (timing), write a wait file per role. Do not take the lock while a
   role ahead of you waits.
7. Respect an announced quiet window: let a running windowed job finish and start no new
   one. Headless runs may go on.
8. Take the checkout lock before a commit, merge, cherry-pick, amend or push in a shared
   checkout. Worktree commits need no lock.
9. Report an owner line older than the limit (for example 30 minutes) to its owner. Never
   remove a lock that is not yours or that has no owner file.
10. Before you report, check that you hold no lock.

## Merges in a worktree

1. Check `git status --short`. Save uncommitted work with `git diff > /tmp/<unit>.patch` and
   restore those files to the committed version.
2. If the merge refuses on an untracked `.uid` or plan copy, compare it with the incoming
   file, delete your copy, and merge again.
3. Read both hunks of each conflict. Keep both sides when they are additive. Write down any
   order rule (the second line reads what the first sets) and send it to the steward. For a
   `.uid` conflict, take the base's id. For a lead-owned file, take the owner's side.
4. Make no commit while `MERGE_HEAD` exists, because the commit completes that merge.
5. Check that the merge commit holds none of your draft.
6. Import, run the parse check, the focused tests and the full suite on the merged head.
7. Re-apply the patch per file: `git apply --3way --include=<file>`. A whole-patch apply
   fails on 1 file and applies nothing.
8. If the base moves again, list the new commits that touch your files. Dry-run with
   `git merge-tree` instead of a second merge.
9. If Godot rewrote a file you do not own (a bus layout, the project file), restore it.

## Asserted scripted edits

A `sed` or a heredoc can change the wrong row or a second match without a sound.

1. Read the file. Copy the exact old text with its exact indentation.
2. Replace with a helper that asserts the old text occurs exactly once. The shipped
   `scripts/rep.py` does this for a list of pairs.
3. Apply all pairs in memory, then write the file once. If an assert fires, the file stays
   unchanged.
4. When an assert fires, print the line with `cat -et` and count the tabs. Or pick a longer
   anchor when the anchor matched 2 places.
5. Match on a unique row id, never on a value that other rows share.
6. Use the editor tool for tricky multi-line edits or nested quotes.
7. Run `git diff` after a bulk edit. Read the new value back before you measure or commit.

## macOS shell

Agents bring GNU habits; macOS has zsh and BSD tools.

- There is no `timeout`. Use `perl -e 'alarm N; exec @ARGV' <command>`, `gtimeout`, or the
  tool's own quit flag.
- Use `sed -i ''` with 1 `-e` per expression, or `perl -pi -e`, for 1-line changes only.
- zsh does not split an unquoted variable into words. Never keep a command line in a string
  variable; use an array, a function or a small `sh` script.
- Quote every glob in `grep --include` and `find -name`. zsh stops on an unmatched glob.
- `echo $?` after a pipe gives the status of the last command. Use a log file or `pipefail`.
- Use absolute paths after any `cd` in a compound command.
- `git grep` needs `-E` or several `-e` for "or". Test a search on a known hit before you
  trust an empty result.
- `python3 -I` hides user-site packages. Check that imports load, or use a venv.
- Avoid 1-letter shell function and variable names; an alias can take them.

## Verify claims before you report

A wrong number in a DONE travels into the next plan.

1. List every number and every "X causes Y" sentence in your report.
2. Check each one with a command against a log or a file. Remove what you cannot confirm.
3. Recompute 1 or 2 headline rows from the raw traces. When a result is far better than all
   others, look for a leak (for example free levels written into a real save).
4. Send a correction at once when an earlier report was wrong.

The orchestrator side (treat DONE as a claim, liveness evidence) is in
[references/fleet-roles.md](references/fleet-roles.md#verify-done-claims-orchestrator-side).

## Gameplay changes go to the owner

Number tuning, behaviour-neutral bug fixes and perf fixes go on. A new or removed mechanic,
verb or cue is a proposal, not a build. The owner decides it.

1. Classify each change. A coach line or help text that changes how players act is gameplay.
2. Collect the evidence: tables, traces, captures.
3. Write a numbered item in 1 decision file: facts, 2 to 4 options, 1 recommendation. Look
   for a new number on an existing mechanic, and prefer the entity's own row (a local lever)
   over a new global mechanic.
4. Items built before the rule go on a hold branch. Merge only their number part.
5. Ask the owner. Hold only the work that depends on the answer.
6. Record the owner's exact words under the item and quote them in the next plan. A worker
   report pasted into the answer box is not direction.
7. If the answer is ambiguous, restate your reading with an example and ask again.
8. After the answer, start the agreed steps at once. Do not wait for a "continue".

The design side of the rule is in `upgrade-tree-design`.

## Sandboxed workers

Some fleet workers run in a sandbox (often a fallback agent when quota runs out). They cannot
write `.git`, `user://` or the home folder, read the process table, or open a window.

1. Check each new pane for a silent fallback in the session list.
2. Give sandboxed workers code and tests only. Bot runs, calibration, captures and visual
   judgement go to workers that can write saves and open windows.
3. A sandboxed worker never runs `git worktree add`, `git commit` or `git merge`. It sends
   `COMMIT REQUEST: <worktree>, <files>, <message>` after each passed step.
4. Give Godot runs a private home folder, so `user://` is writable, and a log file in `/tmp`.
   Make logger autoloads fail safe: 1 warning, then no writes.
5. Record the sandbox failure classes in the baseline (denied `user://` writes, `nice`
   denied). Group FAIL lines by cause and report exact counts per group.
6. When a message fails, retry once, then write the line in a note and in the notes file.
7. The steward commits by path, runs 1 import to make `.uid` files, and runs the suite
   outside the sandbox. Sandbox results hide real failures.

## Orchestration CLI drift

The prompt can name flags that the installed fleet CLI does not have.

1. When the CLI rejects a flag, read its usage line and run the plain form. Do not block.
2. When `done --unlanded` or `done --handoff` is rejected, run plain `done` with the reason
   in the summary.
3. If `worktree land` is unknown, report that the branch is committed and not landed.
4. If `done` fails twice on a registry file, do not edit that file. Note it and tell the
   orchestrator.

## Lead, steward and orchestrator duties

Read [references/fleet-roles.md](references/fleet-roles.md) when you plan a wave, lead a
balance wave, land branches, push, or run 2 fleets on 1 repo. It holds:

- wave plans and the file ownership map;
- contract-first parallel modules;
- the lead proposal and GO protocol;
- the steward land protocol and the check matrix per change type;
- the push policy, PR consolidation and the patch audit;
- notes consolidation at wave end;
- 2 fleets in 1 repo;
- the orchestrator side of compaction and DONE checks.

## Pitfalls

The most common faults are below. Read
[references/pitfalls.md](references/pitfalls.md) for the full table when something fails
that this list does not name.

| Symptom | Cause | Fix |
| --- | --- | --- |
| 30 or more UI tests fail with "Identifier not declared" or "Compilation failed". | Fresh worktree or a merge brought new class names; the cache is stale. | Import after every merge and in every fresh worktree. |
| `godot --check-only` says "Identifier not found" for an autoload. | `--check-only` does not load autoloads. | Use the project parse check or the suite. |
| Another worker's lock disappeared; 2 timing runs overlapped. | `mkdir L && run; rm L` ran the `rm` after a failed `mkdir`. | Release only inside the success branch, after an owner check. |
| Load average 50+ while the owner plays. | Unbounded runs; hung windows. | Slot runner, `nice`, 1 process per worker, runs that end by themselves. |
| 1 call waited about 10 hours. | The slot wait sat inside or outside the alarm. | Alarm on the Godot command only; check the runner after a long gap. |
| A worker idled for hours. | The question went only to the ledger, or the message failed. | Tell plus a notes-file copy. |
| The orchestrator said "running" for a blocked worker. | Status from memory, not evidence. | Check note times, open questions and file times in UTC. |
| A land brought 2 later commits with red tests. | The steward merged a branch name. | Merge the exact hash only. |
| A `sed` for 1 value changed another unit's row. | Pattern matched a shared value. | Asserted edit on the unique row id. |
| A comma-separated test filter ran 0 tests and looked green. | The runner takes 1 filter. | 1 filter per call; check the count is not 0. |
| A worker sent BLOCKED for a planned wait. | Wait read as a block. | Report `ready` and wait. |
| A worker sat idle after COMPACT-READY for about 1 hour. | The orchestrator only acknowledged it. | Run the compact at once. |

## Artifacts to build

- **Fleet rules file**: 1 rule set per worker type (commit or not, land or not, locks, slot
  runner, message keywords). Plans link it; they do not restate it.
- **Wave common file**: the owner's request verbatim, shared rules, the contract, the file
  ownership map, shared files with their 2 owners and lines, the steward conflict rules.
- **Unit plan template**: GOAL, CONTEXT, FILES own and do-not-touch, STEPS each with a check,
  CONSTRAINTS, DONE WHEN, REPORT.
- **Owner check script**: reads the plans and fails when a file has 0 or 2 owners. Keep it
  in the repo, not in `/tmp`.
- **Slot runner** (`scripts/slot-run.sh`): `mkdir` slot pool, owner file, stale-pid cleanup,
  `nice`. 1 command per call.
- **Lock helper** (`scripts/with-lock.sh`): take-wait-run-release in the if-mkdir shape.
- **Asserted edit helper** (`scripts/rep.py`): pairs of old and new text, each must match once.
- **Unit notes file**: changes, checks with counts, QUESTION and answer blocks with dates,
  gotchas for the next unit.
- **Handoff file**: the shape in [Compaction handoff](#compaction-handoff).
- **Steward land log**: 1 entry per land with hash, merge commit, conflicts, counts, gate,
  copies and strays.
- **Decision file**: numbered gameplay items with evidence, options, recommendation and the
  owner's exact words.
- **Message shapes**: role tag, keyword, 1 outcome sentence, details. `COMMIT REQUEST`,
  `MERGE NOTICE n`, `GATE OPEN`, `READY-2A`, `INT-READY` for the special flows.

## Related skills

- `godot-testing`: the test loop and the unit finish gate that step 9 runs.
- `headless-godot-runs`: Godot flags, import and parse hygiene, tool save isolation; this
  skill only gives the slot and load rules.
- `visual-verification`: the windowed gate and the capture queue that run inside a window lock.
- `bot-balance-loop`: the tables a balance wave measures and proposes from.
- `upgrade-tree-design`: the design side of the gameplay-change rule.
- `feature-seams-and-saves`: what a seam looks like when a scope question asks for one.
- `safe-refactor-and-review`: review units and fix waves that a steward lands.
- The herdr plugin (`herdr-worker`, `herdr-orchestrator`): the fleet CLI and the generic
  worker and orchestrator loops.
