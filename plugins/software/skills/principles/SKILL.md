---
name: principles
description: >-
  Sixteen one-page engineering principles from Lauren Tan's pstack. Use when a design or code decision needs a principle behind it: choosing core types and data structures, type-system design, wiring validation and error handling at boundaries, modelling stateful logic, idempotent commands and retries, concurrent writers to shared state, migrating callers off a legacy API, deciding diff size or whether to add an abstraction, sequencing a multi-step change into verifiable units, removing before adding, writing or keeping a test, trusting a measured number, building a tool instead of working by hand, turning a repeated correction into a lint or check, making code easier to trace, or questioning a premise after repeated failed fixes. Read only the principle that applies.
---

# Principles

Each principle is one page in `topics/<name>/GUIDE.md`. Pick the one whose trigger matches the work, read it in full, and apply it. Two principles can apply at once; read both. Do not load all sixteen.

| Topic | Read it when | Guide |
|---|---|---|
| `principle-foundational-thinking` | Before writing logic: core types, data structures, what concurrent actors share | [`topics/principle-foundational-thinking/GUIDE.md`](topics/principle-foundational-thinking/GUIDE.md) |
| `principle-type-system-discipline` | Designing types or signatures in a statically typed language | [`topics/principle-type-system-discipline/GUIDE.md`](topics/principle-type-system-discipline/GUIDE.md) |
| `principle-model-the-domain` | Stateful logic, heavy branching, a shape assumption repeated across files | [`topics/principle-model-the-domain/GUIDE.md`](topics/principle-model-the-domain/GUIDE.md) |
| `principle-boundary-discipline` | Validation, error handling or framework adapters | [`topics/principle-boundary-discipline/GUIDE.md`](topics/principle-boundary-discipline/GUIDE.md) |
| `principle-make-operations-idempotent` | Commands, lifecycle steps or loops that must survive crashes and retries | [`topics/principle-make-operations-idempotent/GUIDE.md`](topics/principle-make-operations-idempotent/GUIDE.md) |
| `principle-separate-before-serializing-shared-state` | Concurrent writers to one file, branch, key or object | [`topics/principle-separate-before-serializing-shared-state/GUIDE.md`](topics/principle-separate-before-serializing-shared-state/GUIDE.md) |
| `principle-migrate-callers-then-delete-legacy-apis` | A new internal API while old callers still exist | [`topics/principle-migrate-callers-then-delete-legacy-apis/GUIDE.md`](topics/principle-migrate-callers-then-delete-legacy-apis/GUIDE.md) |
| `principle-laziness-protocol` | Diff size, refactors, the urge to add a layer or abstraction | [`topics/principle-laziness-protocol/GUIDE.md`](topics/principle-laziness-protocol/GUIDE.md) |
| `principle-subtract-before-you-add` | Sequencing an addition, refactor or rewrite | [`topics/principle-subtract-before-you-add/GUIDE.md`](topics/principle-subtract-before-you-add/GUIDE.md) |
| `principle-sequence-verifiable-units` | Multi-step work, sweeps, migrations, stacked commits and PRs | [`topics/principle-sequence-verifiable-units/GUIDE.md`](topics/principle-sequence-verifiable-units/GUIDE.md) |
| `principle-minimize-reader-load` | Code that is hard to trace: layers, wrappers, hidden state | [`topics/principle-minimize-reader-load/GUIDE.md`](topics/principle-minimize-reader-load/GUIDE.md) |
| `principle-test-behavior-not-implementation` | Writing, changing or keeping a test | [`topics/principle-test-behavior-not-implementation/GUIDE.md`](topics/principle-test-behavior-not-implementation/GUIDE.md) |
| `principle-explain-the-number` | Before trusting or reporting a measured number | [`topics/principle-explain-the-number/GUIDE.md`](topics/principle-explain-the-number/GUIDE.md) |
| `principle-build-the-lever` | Non-trivial work that a script, codemod or generator could do or prove | [`topics/principle-build-the-lever/GUIDE.md`](topics/principle-build-the-lever/GUIDE.md) |
| `principle-encode-lessons-in-structure` | A correction or instruction you are giving for the second time | [`topics/principle-encode-lessons-in-structure/GUIDE.md`](topics/principle-encode-lessons-in-structure/GUIDE.md) |
| `principle-attack-the-premise` | Two or more fixes on one premise failed the same gate | [`topics/principle-attack-the-premise/GUIDE.md`](topics/principle-attack-the-premise/GUIDE.md) |

Paths inside a guide are relative to that guide's folder. Other skills cite a topic as `software:principles` (topic `<name>`).

Credit: pstack by Lauren Tan, cursor/plugins `9d76bca`, MIT (`LICENSE-pstack.txt` at the plugin root). See `NOTICE.md`.
