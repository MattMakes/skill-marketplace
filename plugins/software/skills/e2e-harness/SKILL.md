---
name: e2e-harness
description: Set up, discover, build, and run end-to-end tests across a whole polyglot system — services in Node, Python, Go, C#, or Rust plus Kafka, Event Hubs, blob storage, S3, Postgres, and cloud emulators — using the deterministic `e2e` CLI in this skill's scripts/ directory. Use this skill whenever the user wants E2E, end-to-end, integration, smoke, or acceptance tests across more than one service; wants to test an event-driven or async flow where the outcome is a message on a topic or an object in a bucket; asks to "test the whole system", "wire up Playwright", "check the services actually talk to each other", or wants tests generated from collected documentation. Use it even when they only say "write some tests for this system" without naming E2E, and use it whenever a docs folder has just been collected and the natural next step is proving the system works.
---

# E2E harness

Turn a documented system into a running end-to-end suite. The work splits into
four phases, and the `e2e` CLI in `scripts/` does three of them without you.

```
setup     probe the repo, write config.json, install the runner   deterministic
discover  probe repo + docs -> inventory.json                     deterministic
journeys  author journeys.json                                    ← you, here
build     journeys.json + inventory.json -> Playwright specs      deterministic
run       up -> readiness gate -> tests -> report -> down         deterministic
```

## The one place judgment belongs

Only `journeys.json` needs a model. Deciding *which flows matter* and *what
counts as success* is genuinely a judgment call. Everything else — finding
services, resolving ports, emitting test code, waiting for readiness — is a
function of files on disk, and doing it with a script means the same repo always
produces the same tests.

So resist the pull to hand-write spec files. If a generated test is wrong, the
journey that produced it is wrong; fix that and rebuild. Hand-edits are silently
destroyed on the next `e2e build`, which regenerates the tree from scratch.

## Run it

`scripts/e2e` is a stdlib-only Python CLI. Invoke it by path; no install step.

```bash
E2E=<this-skill>/scripts/e2e

$E2E --root . setup --docs ./docs --install   # detect stack, install Playwright
$E2E --root . discover                        # -> e2e/inventory.json
$E2E --root . journeys scaffold               # -> e2e/journeys.json skeleton
#   ... you fill it in ...
$E2E --root . journeys validate               # strict; blocks build until clean
$E2E --root . build                           # -> e2e/tests/generated/*.spec.ts
$E2E --root . run --yes                       # -> e2e/report.json
```

`$E2E status` tells you which phase you are in. `$E2E doctor` checks Node,
Docker, PyYAML, and whether the boot command is set — run it first when
something behaves oddly.

## Documentation is a precondition, not a nicety

`discover` refuses to run without a docs folder. That is deliberate. Journeys
invented from code alone test what the code *does*, which is circular — a bug
faithfully reproduced in a test is still a bug. Journeys grounded in
documentation test what the system *promises*, and the gap between those two is
exactly what E2E tests exist to find.

`discover` mines the docs deterministically into `inventory.json` under `docs`:
endpoints (`POST /uploads` references and curl invocations), environment
variables, base URLs, and workflow candidates — headings that read like a user
action, ranked by whether they cite an endpoint and carry a code sample.

If the user has no docs, say so plainly and offer the two honest options: collect
them first, or pass `--allow-no-docs` and accept that the journeys are grounded
in nothing but the code.

## Writing journeys.json

Read `references/journeys-schema.md` before your first one. Run
`$E2E journeys kinds` for the exact fields of each step kind in the installed
version. The short version:

Start from `inventory.json`. Its `docs.workflow_candidates` are ranked leads and
its `resources` list gives you the exact ids to reference. Pick the handful of
flows that would matter if they broke — three good journeys beat twenty shallow
ones, and every journey you add is a thing that has to keep passing.

**Assert on the observable effect, not the acknowledgement.** This is the habit
that separates a real E2E test from a smoke test wearing a costume. A `202
Accepted` proves only that the request arrived. In the systems this skill targets
the actual outcome lands somewhere else: a message on a Kafka topic, an object in
a blob container, a status endpoint flipping from 404 to 200. That is what the
`await_message`, `await_blob`, and `await_http` steps are for, and a journey whose
only assertion is on the immediate response is not testing the system end to end.

**Never reach for `sleep`.** A fixed wait is tuned to one machine on one day; it
makes the suite slow *and* flaky, and it hides the race rather than removing it.
Poll for the real condition with an `await_*` step instead — it is faster and
deterministic. The validator warns every time you use `sleep`, and that warning
is worth heeding.

**Cite your source.** Every journey needs a `source` naming the doc section or
inventory entry it came from. The validator enforces this because an uncited
journey is a guess, and a reviewer needs to be able to check your reasoning.

## The validator is strict on purpose

`journeys validate` rejects unknown fields rather than ignoring them. A typo like
`expect_stats` instead of `expect_status` would produce a test that asserts
nothing and passes forever — far worse than one that fails loudly. It also
checks that every `resource` exists in the inventory, that the resource kind can
serve the step (no publishing to a Postgres container), and that each journey
asserts something.

When it rejects your file, read the message; each one names the fix. Do not work
around it by loosening the journey.

## Running

`run` will not execute a boot command it guessed. `setup` detects a likely one
(`docker compose up -d`, `aspire run`, an npm script) and records it as
unconfirmed; `run` then stops until the user sets `"up_confirmed": true` or you
pass `--yes`. Launching the wrong command against someone's machine is worse
than pausing to ask, so confirm the command with the user the first time.

The readiness gate polls every resource's own signal — an HTTP response for
services, an open port for brokers and stores — before any test starts. Most
flaky E2E suites are flaky because they started against a half-booted system, and
this removes that whole failure class. If the gate times out, the fix is almost
never `--ignore-readiness`; it is a missing or wrong readiness target in
`config.json`.

Useful flags: `--no-up` when the system is already running, `--keep-up` to leave
it up for debugging, `--filter '@critical'` to run one tag.

## When to stop and ask

- **No documentation.** Offer to collect it first; that is the higher-value work.
- **The boot command is not obvious.** Ask rather than guess. Set `up` and
  `down` in `config.json` from the answer.
- **A resource kind has no adapter.** `references/adapters.md` lists what ships.
  A journey referencing a stub validates but fails at runtime with a named error.
  Tell the user which adapter is missing and offer to write it — it is two small
  edits, documented there.
- **An Aspire AppHost.** Its resources are declared in code, so static discovery
  cannot see them. `discover` flags this; resolve it by adding `extra_resources`
  to `config.json` or by capturing the live graph after one `aspire run`.
- **A test fails.** Read the failure before touching the journey. A genuine bug
  found is the suite doing its job, and quietly relaxing an assertion to get
  green is the one outcome worse than having no tests.

## Layout

| Path | What |
|---|---|
| `scripts/e2e` | The CLI. Start here. |
| `scripts/e2elib/inventory.py` | Probes. Add image → kind mappings here. |
| `scripts/e2elib/docsmine.py` | Docs → endpoints, env vars, workflow candidates. |
| `scripts/e2elib/journeys.py` | Step vocabulary and the validator. |
| `scripts/e2elib/codegen.py` | journeys.json → TypeScript. Pure function. |
| `assets/templates/harness.ts` | The async assertion runtime the specs call. |
| `references/journeys-schema.md` | Full journey and step reference. |
| `references/adapters.md` | Which resource kinds work, and how to add one. |
| `evals/fixtures/upload-pipeline/` | A working system (Node + Kafka + Azurite) with docs and journeys. Use it to check a change end to end. |

Artifacts land in `e2e/` in the target repo: `config.json`, `inventory.json`,
`journeys.json`, generated tests, and `report.json`.
