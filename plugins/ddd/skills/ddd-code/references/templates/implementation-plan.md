# Implementation plan — {{project title}}

Produced by `ddd-code` on {{date}} from `ddd/07-define/define.json`, `ddd/04-strategize/strategize.json`, `ddd/05-connect/connect.json`, `ddd/06-organise/organise.json`, `ddd/02-discover/discover.json`.
Language {{language}} · framework {{framework}} · architecture {{style}} · deployables {{ids}} · scaffold generated: {{no}}

## In plain words

<One or two short sentences: what this step did and why anyone should care. Common words, one idea
per sentence, any jargon glossed the first time.>

**Decided:** <the call this step made, with numbers where there are numbers>

**Assumed:** <the guess a human is most likely to overturn>

**Riskiest:** <what hurts most if that guess is wrong, and where it bites>

---

## Order and why
1. `{{core-context}}` first — the core domain; its pivotal event `{{event-id}}` is what the business pays for.
2. Then the policies that connect it to `{{next context}}` ({{flow id}}), then supporting, then generic/bought contexts as adapters.
3. Read models and UI last — they only project what the slices above emit.

Each slice is a vertical slice (Event Modeling): one command or one view, specified Given/When/Then, tests first, done when the tests pass and the fitness test still passes.

## Slice 0 — Walking skeleton
- Goal: every context's module folders exist (design.md §1), the architecture fitness test runs in CI, one composition root per deployable starts.
- Files/modules: {{module paths}}; `{{tests/architecture/…}}`; `{{apps/<deployable>/main}}`.
- Tests (write first): {{fitness test: domain imports nothing outward}}.
- Done when: `{{test command}}` is green with zero business logic.

## Slice 1 — `{{core-context}}`: `{{command-id}}` → `{{pivotal-event-id}}`
- Implements: `{{ddd/08-code/<ctx>/aggregate-canvas-<id>.md}}` (invariants {{I1, I2}}), flow `{{F1}}` steps {{1–2}}, policy `{{policy-id}}`.
- Files/modules: `{{module_path}}/domain/{{aggregate}}`, `application/commands/{{UseCase}}`, `application/ports/driven/{{Repository}}`, `adapters/driven/persistence/InMemory{{…}}`.
- Tests (write first): `{{rejects …}}`, `{{given … when … then …}}`, `contract: {{event-id}}`.
- Done when: the use case emits `{{event-id}}` through the in-memory adapters; no HTTP yet.

## Slice 2 — `{{context}}`: {{driving adapter / persistence adapter / next command}}
- Implements: {{…}}
- Files/modules: {{…}}
- Tests (write first): {{…}}
- Done when: {{…}}

## Slice N — …

## Not in this plan
- {{things deliberately deferred, with the open-question id}}

## Hand-off
1. Run `superpowers:writing-plans` (or `dev-create-plan`) on this file to expand each slice into tasks with exact paths, code and commands.
2. Implement slice by slice with `superpowers:test-driven-development` / `dev-tdd`: invariant tests first, watch them fail, then the minimum code.
3. If implementation changes an aggregate boundary or a message contract, update the canvas / `code.json` and re-run `ddd validate ddd --step code`; upstream changes → `ddd-workflow` marks steps stale.
