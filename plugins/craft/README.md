# craft — Engineering Craft

What does good code look like? `craft` is the principles library: sixteen one-page engineering
principles from Lauren Tan's pstack, and the code-level practices that apply them while you
write a change. Start with the principle whose trigger matches what you are doing (the "Use it
when" column), or with `ponytail` for any coding task where the smallest complete change is what
you want. Workflows live in `dev` and design methods in `architecture`; both cite these skills by
name.

```bash
claude plugin install craft@skill-marketplace
```

## Skills

### Principles

One rule each, with the pattern, the test and the tells that you skipped it. Other skills cite
them by name (`architecture:architect`, `dev:arena`, `verify:benchmark-checklist`,
`stack:typescript-best-practices`); you can also apply one directly when its trigger shows up.

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

### The smallest correct change

`principle-laziness-protocol` is the rule; `ponytail` is the working mode that applies it;
`karpathy-coder` adds a review procedure and a pre-commit gate.

| Skill | Use it when |
|---|---|
| `ponytail` | Any coding task where the smallest change that fully solves it is what you want. Scope-first checklist, a six-step smallest-complete-change ladder, a never-cut list (trust-boundary validation, security, accessibility), a `shortcut:` comment convention, and a reply that names what was skipped. Levels `lite`, `full`, `ultra`. |
| `karpathy-coder` | Writing, reviewing or committing code when the model might be overcoding. Karpathy's four principles (surface assumptions, simplicity, surgical changes, verifiable goals) as a review procedure plus four stdlib-only Python checkers and a non-blocking pre-commit gate. |

### Code-level practice

| Skill | Use it when |
|---|---|
| `error-handling-patterns` | Designing error handling across languages: exceptions vs Result types, recoverable vs unrecoverable errors, propagation, circuit breaker, error aggregation and graceful degradation. Worked examples in Python, TypeScript, Rust and Go in `references/details.md`. |
| `performance-optimization` | Performance requirements, a suspected regression, poor Core Web Vitals, or N+1 queries. Measure, identify, fix, verify, guard; a symptom-driven diagnosis tree, `EXPLAIN ANALYZE` and pool-sizing specifics, strict keep-or-revert rules ("neutral is a revert"), an attempts ledger, and worked fixes plus a checklist in `references/`. |
| `deprecation-and-migration` | Removing an old system, API or feature, or changing a production schema without downtime. Advisory vs compulsory deprecation, strangler/adapter/flag patterns, zombie code, and a worked expand/backfill/contract migration with hard rules. |
| `source-driven-development` | Writing framework-specific code where correctness depends on the version. Detects versions from dependency files, fetches the exact official doc page, implements from it, cites deep links, and flags anything it could not verify as UNVERIFIED. |
| `constraint-driven-development` | No quality bar is written down, or an agent keeps silencing checks and skipping tests to get to green. A four-question intake with defaults, a `CONSTRAINTS.md` contract with a tool and command per dimension, ratchets instead of invented thresholds, and a floor guard that catches a lowered bar in the diff. |
| `ai-development-guide` | Reviewing a backend implementation choice, a code smell, a failure, or whether a change is complete. Fail-fast fallback policy with error-masking review triggers, five named failure patterns, a reference-representativeness check, and a risk-scaled three-stage impact analysis. |

### Answer one question, then clean up

| Skill | Use it when |
|---|---|
| `prototype` | Sanity-checking whether a state model feels right (a single HTML file with guided walkthroughs, see `LOGIC.md`) or what a UI should look like (URL-param switchable variants, see `UI.md`). Throwaway by design; the validated decision is folded into real code and the prototype captured on a throwaway branch. For a UI fidelity ladder use `design:prototype`. |
| `oh-my-issues` | An issue tracker with dozens of reports that share root causes. Clusters them into plan-master issues with architectural titles, closes children with a standard redirect, appends Round-N triage comments, bundles one PR per cluster, and runs health checks on the masters. |

## What these write and where they reach

Installing this plugin wires no hooks, no MCP servers and no background processes. Nothing here
downloads a binary. The sixteen principles and `error-handling-patterns` are prose only.

- `karpathy-coder` ships four stdlib-only Python scripts under `scripts/` (`complexity_checker.py`,
  `diff_surgeon.py`, `assumption_linter.py`, `goal_verifier.py`) and `karpathy-gate.sh`, a
  non-blocking pre-commit hook that runs the first two on staged files. `diff_surgeon.py` and the
  hook read `git diff`. The hook runs only if you wire it into `.claude/settings.json` or a git hook
  yourself; `references/enforcement-patterns.md` shows how.
- `oh-my-issues` needs `gh` and `jq`; it opens, comments on and closes GitHub issues in the
  current repo.
- `source-driven-development` fetches official documentation pages (WebFetch); that lookup is the
  skill's purpose.
- `constraint-driven-development` writes `CONSTRAINTS.md` and one line in `AGENTS.md`/`CLAUDE.md`.
  The tools it recommends per dimension (gitleaks, semgrep, osv-scanner, axe, lighthouse,
  size-limit, stryker, …) are installed only when you say so.
- `prototype` writes throwaway prototype files next to the code they test and captures them on a
  throwaway branch.

## How it works with the other plugins

| Direction | Handoff |
|---|---|
| Out | `craft` is cited, not run as a pipeline. `architecture:architect` screens designs against `principle-foundational-thinking`, `principle-subtract-before-you-add` and six more principles; `dev:arena` cites `principle-laziness-protocol` and `principle-separate-before-serializing-shared-state`; `dev:show-me-your-work` cites `principle-encode-lessons-in-structure`. |
| Out | `stack:typescript-best-practices` is the TypeScript form of `craft:principle-type-system-discipline` and `craft:principle-boundary-discipline`; `craft:principle-type-system-discipline` points back to it. |
| Out | `verify:benchmark-checklist` pairs with `craft:principle-explain-the-number`. |
| In | `dev:doubt-driven-development` sends version-dependent claims to `craft:source-driven-development`. |
| Out | `craft:constraint-driven-development` borrows `product:interview-me`'s intake and names `dev:tdd` and `security:security-and-hardening` as the sources for its test and security dimensions. |
| Split | `craft:deprecation-and-migration` owns code-level deprecation; `ops:migration-architect` owns system-level migration and `stack:database-migrations` the per-tool workflow. `craft:prototype` answers one design question in throwaway code; `design:prototype` is the UI fidelity ladder. |

## Credits

Every skill here is a vendored, supply-chain-controlled copy: each is maintained here,
credited in [NOTICE.md](NOTICE.md) with its upstream repository, path, commit, date, license and
author, and re-pulled deliberately rather than tracked live. Diff against upstream before pulling
changes in.

- The sixteen `principle-*` skills are from [cursor/plugins](https://github.com/cursor/plugins)
  `pstack` by Lauren Tan, taken at commit `9d76bca` (2026-10-11) under the MIT license
  (`LICENSE-pstack.txt`).
- `error-handling-patterns` is from [wshobson/agents](https://github.com/wshobson/agents) by Seth
  Hobson, copied from commit `a30778f` (2026-09-01).
- `constraint-driven-development`, `performance-optimization`, `source-driven-development` and
  `deprecation-and-migration` are from addyosmani/agent-skills; `ponytail` from
  DietrichGebert/ponytail; `prototype` from mattpocock/skills; `ai-development-guide` from
  shinpr/claude-code-workflows; `oh-my-issues` from thedotmack/claude-mem (Apache-2.0); and
  `karpathy-coder` from alirezarezvani/claude-skills.

## Moved in v3

| Before | After |
|---|---|
| `pstack:principle-*` (all sixteen) | `craft:principle-*`, same names |
| `tools:error-handling-patterns` | `craft:error-handling-patterns` |
| `craft:codebase-design` | `architecture:codebase-design` |
| `craft:domain-modeling` | `architecture:domain-modeling` |
| `craft:architecture-decision-records` | `architecture:architecture-decision-records` |
| `craft:contract-first` | `architecture:contract-first` |
| `craft:improve-codebase-architecture` | `architecture:improve-codebase-architecture` |
| `craft:improve` | `architecture:improve` |
| `craft:doubt-driven-development` | `dev:doubt-driven-development` |
| `craft:verification-before-completion` | `dev:verification-before-completion` |
| `craft:finishing-a-development-branch` | `dev:finishing-a-development-branch` |
| `craft:make-pr-easy-to-review` | `dev:make-pr-easy-to-review` |
| `craft:diagnosing-bugs` | merged into `dev:debug` as its hard-bug mode |
| `craft:retro` | `agentic:retro` |
| `craft:code-tour` | `code:code-tour` |

## Invoking

Namespaced under the plugin: `/craft:ponytail`, `/craft:principle-type-system-discipline`,
`/craft:error-handling-patterns`, and so on. `ponytail` takes a level
(`/craft:ponytail lite|full|ultra`).
