# pstack — pstack Principles

Lauren Tan's pstack, vendored from cursor/plugins: sixteen one-page engineering principles and
eleven procedures that cite them (design, rationale archaeology, blast radius, benchmarks, writing,
decision trails, repo hygiene, TypeScript, verification skills). The Cursor-only router
(`poteto-mode`), its playbooks, the model-config rule and the sibling skills it leaned on are not
vendored; everything here runs on Claude Code's Task tool and model aliases.

```bash
claude plugin install pstack@skill-marketplace
```

## Skills

### Principles

One rule each, with the pattern, the test and the tells that you skipped it. The procedures below
cite them by name; you can also apply one directly when its trigger shows up.

| Skill | Use it when |
|---|---|
| `principle-type-system-discipline` | Designing types or reviewing a signature in any statically typed language. Illegal states unrepresentable, brand semantic primitives, parse at boundaries, never lie to the compiler, exhaustive matching, derive from authoritative schemas, strengthen a type only where partiality appears. |
| `principle-model-the-domain` | Writing stateful logic, or code that branches a lot or repeats a shape assumption across files. A menu of structures (state machine, registry, discriminated union, reducer, knowledge-organized module) to replace scattered conditionals. |
| `principle-minimize-reader-load` | Reviewing or shaping code that is hard to trace. Two axes (layers to trace, state to hold), collapse one-caller wrappers, shrink mutable scope, a 30-second test. |
| `principle-boundary-discipline` | Wiring validation, error handling or framework adapters. Validate at boundaries, trust inside, keep business logic pure. |
| `principle-separate-before-serializing-shared-state` | Concurrent actors might write the same file, branch, key or object. Eliminate the sharing first; "we need a lock" is a smell to check. |
| `principle-make-operations-idempotent` | Designing commands, lifecycle steps or loops that run amid crashes and retries. Runs twice, crashed at every point, same end state. |
| `principle-build-the-lever` | Any non-trivial edit, migration, analysis or check. Build the codemod, script or generator that does or proves the work; no lever in the diff means you did not apply it. |
| `principle-encode-lessons-in-structure` | You are writing the same instruction a second time. Route it to the strongest mechanism: uncompilable state, lint or banned API, canonical helper, runtime check. |
| `principle-test-behavior-not-implementation` | Writing, changing or keeping a test. Rewrite or delete any test that would pass if every import returned `undefined`. |
| `principle-attack-the-premise` | Two or more fixes sharing one premise failed the same gate. Write the premise down, take a per-actor census as a rerunnable script, remove the asymmetry. |
| `principle-laziness-protocol` | Refactoring, judging diff size, or tempted to add a layer. Deletion first, flat call hierarchy, consolidate decisions, question signal threading. |
| `principle-sequence-verifiable-units` | Sweeps, migrations, runs of similar edits, and how you stack commits. Each unit ends checkable; order delivery so the sequence proves itself. |
| `principle-explain-the-number` | Before you trust, report or act on a measured number. Ask "why not double", list what else it could be measuring, keep the evidence with the number. |
| `principle-foundational-thinking` | Before writing logic. Data structures first, scaffold first, concurrency corollary, subtraction before scaffolding. |
| `principle-migrate-callers-then-delete-legacy-apis` | Introducing a new internal API while old callers exist. Migrate and delete in one wave. |
| `principle-subtract-before-you-add` | Sequencing an addition, refactor or rewrite. Remove dead code, speculative validators and stubs first. |

### Procedures

| Skill | Use it when |
|---|---|
| `architect` | Non-trivial work where jumping to code would lock in the wrong shape. Grounds in the surrounding system, sketches types, signatures and module map with `not implemented` bodies, designs twice through `arena`, screens candidates against `references/design-red-flags.md`, then implements against the sketch and names the tells for scrapping it. Ships a rationale from `references/rationale-template.md`. |
| `arena` | One attempt at a non-trivial artifact would lock in the wrong shape. N parallel Task subagents on one task with a pre-written rubric, an independent cross-judge (a different model family where available, otherwise a fresh context), pick a base, graft the losers' best parts, verify. |
| `why` | "Why does X work this way", design rationale, regressions, postmortems, data-backed thresholds. Anchors in `git`/`gh`, spawns one investigator per connected evidence source (issue tracker, docs, chat, observability, error tracking, warehouse), then a synthesizer bound to a five-tier confidence framework. Per-source playbooks for git, Linear, Notion, Slack, Datadog, Sentry and Databricks, adaptable to their peers. |
| `blast-radius` | "What could this break", or a small diff you do not trust. Finds the one fact the change is safe because of and proves it by running real code, on a five-rung evidence ladder, looking where grep stops. |
| `benchmark-checklist` | You ran a benchmark or are about to report a speedup or regression. Seven questions (limiter, tuning, physical limits, errors, alternating repeats, end-to-end relevance, did the work happen) and a report format. |
| `correct` | The operator keeps correcting agents for the same mistakes. Mines commits, reverts and reviews for mistake classes and fixes each at the strongest level that works: architecture, then types, then a lint whose error names the fix, then a test, docs last. Proves each check on a real past mistake and keeps a rule-to-enforcer table. |
| `technical-writing` | Writing or reviewing docs, RFCs, readmes, PR bodies or commit messages. Diataxis mode selection, Google developer style, STE one-instruction sentences, Global English disambiguation, a worked before/after. Hands the AI-tell scrub to `tools:humanize`. |
| `show-me-your-work` | Long or unattended runs a human reviews afterwards. Append-only TSV decision log (what, why, evidence, result) via `scripts/log.sh`, an audit of the log against this session's transcript, and a cross-model review that ends the reply with an Attention section. |
| `typescript-best-practices` | Reading or editing `.ts` or `.tsx`. Sixteen rules (branded types, constructive modeling, simplest total type, narrowing hierarchy, `satisfies` over `as`, exhaustiveness) with before/after code in `references/patterns.md`. |
| `create-verification-skill` | A project has no scripted way to prove UI, CLI or service behavior. Interviews the repo, writes `.claude/skills/verify-<app>/` (launch, doctor, drive, evidence, cleanup, helpers) and a per-feature map, and proves it end to end before handing over. |
| `maintain-verification-skill` | Keeping that generated skill honest as the app changes. Parallel source readers per feature, one mandatory live pass under three invariants, triage into doc drift, harness gap or product gap, at most one PR. |

## What these write and where they reach

- `show-me-your-work/scripts/log.sh` appends rows to the TSV file you name (creating its parent
  directory) and nothing else. The skill's audit step reads this session's transcript under
  `~/.claude/projects/` and tells the model not to glob across other projects.
- `create-verification-skill` writes a new skill into the current project at
  `.claude/skills/verify-<app>/` and launches the app to prove it. `maintain-verification-skill`
  edits only that directory and drives the app live; it never edits product code.
- `correct` changes repository configuration on purpose: lint rules, CI checks, types, tests and
  the agent instruction file, one commit per mistake class.
- `architect`, `arena`, `why` and `show-me-your-work` spawn Task subagents. `arena` gives each
  candidate a git worktree or a directory under `/tmp/arena-<slug>/`.
- `why` runs `git` and `gh`, and queries whatever MCP servers are already connected in the
  session (issue tracker, docs, chat, observability, error tracking, warehouse). That is the only
  network reach in the plugin, and it goes through tools you configured.
- `blast-radius` and `benchmark-checklist` ask the model to write and run small proof scripts
  and profilers (`top`, `pidstat`, `strace -c`, `py-spy`, `node --cpu-prof`) where available.

Installing this plugin wires no hooks, no MCP servers and no background processes, and nothing
here downloads a binary.

## Credits

Every skill here is a vendored, supply-chain-controlled copy of
[cursor/plugins](https://github.com/cursor/plugins) `pstack` by Lauren Tan, taken at commit
`9d76bca` (2026-10-11) under the MIT license (`LICENSE-pstack.txt`); see `NOTICE.md` for the
per-skill table and the list of edits. Upstream is re-pulled deliberately, not automatically:
diff against it before pulling changes in.

## Invoking

Namespaced under the plugin: `pstack:architect`, `pstack:arena`, `pstack:why`,
`pstack:blast-radius`, `pstack:principle-type-system-discipline`, and so on.
