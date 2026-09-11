# Golden fixtures

The three fixtures the golden harness (`../golden.mjs`) runs every subcommand against.
They are not checked in as directories: `build.mjs` derives each one from the shipped
example at `plugins/code/shared/examples/mealkit` into a temp directory the caller owns,
so the example is never touched and the mutants cannot drift from it.

```bash
node plugins/code/shared/tests/fixtures/build.mjs /tmp/ddd-fixtures   # look at all three by hand
```

| Fixture | How it is made | What it proves |
|---|---|---|
| `mealkit` | verbatim copy of `shared/examples/mealkit` | the happy path: nine steps done, every gate green, every render has input |
| `truncated-3` | mealkit, then delete `ddd/04-strategize` … `ddd/09-contracts` and reset `manifest.steps` 4-9 to `{ "status": "pending" }` (their `artifacts` and `open_questions` are dropped because the files they point at are gone) | a run stopped after step 3: `validate` still passes and names `ddd-strategize` as next; the step 4-9 tools that need later input hit their "input missing" path (exit 1 or 2 with a message naming the file) and that wording is pinned; the brief-drafting prefills (`define prefill`, `code prefill`) still run, since they draft from decompose alone |
| `broken-refs` | mealkit, then append the dangling event id `subscription-teleported` to `bounded_contexts[0].owns_events` in `ddd/03-decompose/decompose.json` | the reference check: `validate` exits 1 with `unknown reference 'subscription-teleported'`; downstream tools still have complete input so their own gates are recorded on a workspace validate rejects |

The dangling id is deliberately one that appears nowhere in `discover.json`. If it were
added to the event storm the fixture would silently stop failing.

Every caller gets its own fresh copy per run (`materialise(name, destDir)`), following the
rule in `../README.md`: a failing test can never damage the example or a real workspace.
