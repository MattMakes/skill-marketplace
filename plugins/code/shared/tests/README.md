# Tests for the `ddd-*` chain

Two kinds, both plain Node (18 or newer, nothing to install), both run on throwaway copies of the
meal-kit example so a failing test can never damage `shared/examples/mealkit` or a real workspace.

## 1. `node --test` suites

```bash
node --test --test-reporter=tap "plugins/code/shared/tests/*.test.mjs"
```

One file per defect the chain has actually shipped or per invariant it must keep. A fix without a
test here is not done: the test must fail on the old code and pass on the new one.

| File | Pins |
|---|---|
| `channels.test.mjs` | `entries[].channels` are objects; a second transport keeps its own `delivery`, `sync` and `note` all the way into `contracts.md` |
| `decision-strategist.test.mjs` | the strategist agent exists where `modes.md` says, its frontmatter is usable, it never writes artifacts, its output contract is complete, it is told not to just agree, no em dashes, and its landing block names the `decisions[]` entry |
| `review.test.mjs` | looking at a run never changes it; a failing gate is never reported as fine; open decisions and blocking questions come first; unknown keys are shown, not dropped; the page builds on a half-finished run; it is self-contained; the note-trace wording is a prompt, not an accusation |
| `render-core.test.mjs` | the vendored layout engine and the SVG primitives: deterministic layout, no overlaps, routed edges, the DOM contract, PNG conversion degrades to a note without Chrome |

The first three carry the invariants of the Python-era `test_channels.py`, `test_decision_strategist.py`
and `test_review.py` (five, seven and seven tests) under the same names; `checks/root/check-carried-tests.mjs`
asserts that they are still all there.

## 2. The golden harness

```bash
node plugins/code/shared/tests/golden.mjs                    # replay every command against its snapshot
node plugins/code/shared/tests/golden.mjs validate           # one command
node plugins/code/shared/tests/golden.mjs --fixture broken-refs contracts check
```

`goldens/<fixture>/<cmd>/<variant>/` holds, for every CLI subcommand and argument variant,
the stdout, stderr, exit code and the files written (`files.json`, contents inline) of one run on a
fresh copy of a fixture (`fixtures/build.mjs` derives `mealkit`, `truncated-3` and `broken-refs`
from the shipped example). Replay runs `node shared/bin/ddd.mjs <cmd> …` the same way and compares
byte for byte (JSON structurally, timestamps and temp paths normalised). It prints
`golden verification passed` when all 273 variants match.

The snapshots are the durable form of the Python toolchain this plugin started with. They were
recorded once (`golden.mjs record`, `meta.json` names the script and Python version) while the
Python scripts still existed; the Node ports were then written against them, so "the Node CLI
behaves like the Python did" is a claim the goldens prove rather than a memory. Leaf 1.4.1 of the
Node cut-over reworded the Python-era hints in both the Node messages and the snapshots with one
substitution table (`goldens/REWORDING.md`, applied by `goldens/reword.mjs`), and re-baselined the
six `review` snapshots from the Node CLI after the page was redesigned (its `meta.json` says so).

`record` mode is therefore historical: it needs the deleted `.py` scripts and a `python3`. If a
Python checkout is ever restored (the scripts lived under `shared/scripts/` and
`skills/ddd-<step>/scripts/`, git history has them), `node golden.mjs record [<cmd>...]` re-records
from it and `node goldens/reword.mjs` re-applies the table; `node golden.mjs record --from-node review`
re-records the review page from Node. Do not re-record a golden to make a failing replay pass:
change the Node code, or change the golden by hand and say why in `REWORDING.md`.

## 3. Gate checks

`checks/<leaf>/*.mjs` are the runnable gates of the Node cut-over plan (one directory per leaf,
`checks/root/` for the whole plugin). Each prints a `… verification passed` marker, exits 1 on a
failed assertion and 2 on misuse, and runs from the repository root. `checks/1.4.1/no-python.mjs`
proves no `python3` invocation or `.py` file remains in the DDD-owned payload; other code skills retain their own runtimes.
