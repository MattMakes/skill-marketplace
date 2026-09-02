# Architecture, ports & adapters, module layout, tests

How a bounded context becomes folders, interfaces and tests. Default vocabulary is **hexagonal**
(Cockburn): *driving* ports on the left (what calls us), *driven* ports on the right (what we call).
Onion (Palermo) and Clean (Martin) say the same thing with layers; the mapping is in §1.

## 1. One rule, three vocabularies

| Hexagonal (default) | Onion | Clean | In this skill |
|---|---|---|---|
| Application core (domain + application) | Domain model + domain services + application services | Entities + use cases | `domain/` + `application/` |
| Driving (primary) port | Application service interface | Input boundary | `application/ports/driving/*` (or the use-case classes themselves) |
| Driven (secondary) port | Repository / infrastructure interface, *declared in the core* | Output boundary | `application/ports/driven/*` (repository interfaces may live in `domain/`) |
| Adapter | Infrastructure implementation | Interface adapter / framework & driver | `adapters/driving/*`, `adapters/driven/*` |

The rule all three share (Martin's Dependency Rule): **source-code dependencies point inward only.**
Nothing in `domain/` imports from `application/` or `adapters/`; nothing in `application/` imports
from `adapters/`. Data crossing a boundary is a plain structure (command, DTO, event), never an ORM
entity, an HTTP request or a framework type. Cockburn's intent: the application can "equally be
driven by users, programs, automated tests or batch scripts, and developed and tested in isolation
from its eventual run-time devices and databases." Test adapters are first-class adapters.

2–4 driving and 2–4 driven ports is typical (Cockburn counted purposes of conversation, not
interfaces); core contexts may need more. Every port must be justified by a message row in the
pre-fill brief or an infrastructure need (`Clock`, `IdGenerator` count). Ten ports for one aggregate
means you are naming methods, not purposes of conversation.

## 2. Ports — derive them from the upstream JSON

A port is a *purpose of conversation*. Derive them, do not invent them:

| Upstream fact | Port (kind) | Adapter(s) |
|---|---|---|
| Context owns commands with a human/system actor (`discover.commands[].actor`), inbound `via: http` | `<Context>Commands` (driving) — one method per application service | `Http<Context>Controller`; tests call the port directly |
| Read models this context owns: discover read models informing its commands (`discover.read_models[].informs`) that no query of ours fetches from another context, plus `query` messages it answers | `<Context>Queries` (driving) | `Http<Context>QueryController` |
| Events consumed (`connect.messages[].consumers` ∋ context) + policies with `then` in this context | `<Context>EventHandlers` (driving) — one handler per policy | one consumer adapter per transport of the edges: `InProcess<Context>EventConsumer` for same-deployable edges, `<Bus><Context>EventConsumer` for bus edges — a context may have both |
| External system *initiates* a command or event toward us (flow step or message from an external system with kind `command`/`event`; a `response` to our own call never counts) | `<Context>Callbacks` (driving) | `<System>WebhookHandler` |
| `query` message this context sends to another context (`connect.messages[].kind == query`, producer == context) — also when the query id reuses a discover read-model id | `<ContextAsked>Gateway` (driven) — name by purpose; the answer is translated into our terms, it is **not** a local read model | `Fake<…>Gateway` (tests), `Http<…>Gateway` / `InProcess<…>Gateway` |
| Each aggregate (domain-model contexts) | `<Aggregate>Repository` (driven): `get(id)`, `save(aggregate, expectedVersion)` — returns roots only | `InMemory<Aggregate>Repository` (tests), `<Db><Aggregate>Repository` |
| Transaction-script / active-record context with commands | `<Context>Store` (driven) — the tables/records of this context only | `InMemory<Context>Store`, `<Db><Context>Store` |
| Events produced (`connect.messages[].producer == context`) | `EventPublisher` (driven) | `InMemoryEventPublisher` (tests), `InProcessEventPublisher` / `<Bus>EventPublisher` + outbox |
| External system we call (flow step to an external system) | `<Purpose>Gateway` (driven) — the anti-corruption layer; name by purpose (`PaymentGateway`), not vendor | `Fake<Purpose>Gateway` (tests), `Http<Vendor>Gateway` |
| Invariant depends on time / ids / randomness | `Clock`, `IdGenerator` (driven) | `SystemClock`, `FixedClock` (tests) |

Upstream contexts with `conformist` or `anticorruption-layer` relationships (`decompose.relationships`)
also get a gateway port — the ACL translates *their* published language into *our* model in the
adapter, so the domain never sees their types.

## 3. Module layout per implementation pattern

Root = `module_path` from `code.json` (one per context, inside its deployable — §4). Language
specifics (file names, casing, build files) are in `lang-*.md`; the shape is the same everywhere.

**Domain model** (and event-sourced, see `event-sourcing.md`):

```
<module_path>/
  domain/                 # pure: no framework, ORM, HTTP, logging or DI imports
    <aggregate>/          # one folder (or file) per aggregate: root, entities, value objects, events, errors
    services/             # domain services (stateless, cross-aggregate rules)
    ports/                # repository interfaces (if you keep them in domain rather than application)
  application/
    commands/<UseCase>    # one application service per command: load → call root → save → publish
    queries/<ReadModel>   # read-model queries (no aggregates loaded)
    policies/             # event handlers that turn events into commands (in this context)
    ports/driving, ports/driven
  adapters/
    driving/http|cli|messaging   # controllers, consumers, webhook handlers
    driven/persistence|messaging|gateways|time
  tests/  (or the language's convention)
    domain/               # one test per invariant, one per state transition — no I/O
    application/          # use cases with in-memory adapters (Given events / When command / Then events)
    contracts/            # published-event contract tests; consumer idempotency tests
    adapters/             # repository round-trips, HTTP mapping, gateway ACL translation
```

**Transaction script** — vertical slices, no domain folder:

```
<module_path>/
  <use-case>/             # handler + request/response types + the SQL/records it touches
  shared/store            # the driven Store port + adapters
  policies/               # event → command handlers
  tests/<use-case>        # integration tests through the store (reversed pyramid)
```

**Active record** — records with persistence + simple behaviour, use cases orchestrate them:

```
<module_path>/
  records/                # ORM-mapped classes; validation and small behaviour live here
  use-cases/              # one per command
  adapters/               # controllers, consumers, publisher
  tests/
```

Composition root (DI wiring, config, migrations, main) belongs to the **deployable**, not the
context: `apps/<deployable>/main.*` (or the language's equivalent). Contexts never wire themselves.

## 4. Module paths follow the deployables

`organise.json` decided how many deployables exist and which contexts live in each. Encode it:

| Language | Single deployable | Several deployables |
|---|---|---|
| TypeScript/JS | `src/<context>` | `apps/<deployable>/src/<context>` (+ `packages/` for shared kernels) |
| Python | `src/<project>/<context>` | `services/<deployable>/src/<project>/<context>` |
| Go | `internal/<context>` | `services/<deployable>/internal/<context>` (+ `cmd/<deployable>`) |
| Java/Kotlin | `src/main/<lang>/<project>/<context>` (one package = one module) | `<deployable>/src/main/<lang>/<project>/<context>` |
| C# | `src/<Project>.<Context>/` | `src/<Deployable>/<Project>.<Context>/` |

`ddd code prefill --skeleton` proposes these; a brownfield repo's existing convention wins
(look at the top-level folders before proposing). Two contexts never share a module path; a
`shared-kernel` relationship gets its own small package that both import. A context whose runtime
a `frontend` deployable also hosts (`organise.deployables[].hosts_runtime_of`) is compiled into two
deployables: `module_path` is the shared domain package (`packages/<context>/src`, `pkg/<context>`,
`<context>-domain/…`), `deployable` stays the server-side owner and the frontend is listed in
`also_compiled_into` (contract §4.8).

## 5. Adapters: what the transport in `connect.json` implies

Decide the transport **per (producer → consumer) edge**: the flow step's `via`; else the integration
decision of the relationship (`in-process-call` → in-process, `sync-api` → http, `async-events` →
message-bus, `shared-db` → db, `batch` → file); else the deployables (same → in-process, different →
message-bus). One context may consume in-process from a sibling and over a bus from another
deployable — that is normal and gives it one consumer adapter per transport. Only an edge that is
in-process *across* deployables is a `ddd-connect` problem (assumption + open question).

| `via` / `delivery` | Driving side | Driven side |
|---|---|---|
| `http`, `sync` | Controller maps request → command, result → status; validation of shape only (domain validates meaning) | Gateway with timeouts, retries, circuit breaker in the adapter, never in the domain |
| `message-bus`, `at-least-once` | Consumer must be **idempotent** (dedupe by message id or by aggregate version) | Publish via **outbox** in the same transaction as the aggregate save; a relay ships it |
| `in-process` (modular monolith) | In-process dispatcher calls handlers **after commit**, in their own transaction each | In-process publisher writes to an outbox table or an in-memory queue drained after commit |
| `db`, `file`, `batch` | Importer/job as a driving adapter that issues commands one aggregate at a time | Export adapter |
| `grpc` | gRPC service adapter | gRPC client gateway |

Domain events published across contexts are **integration events** in the published language:
their payload is exactly `connect.messages[].payload` — translate from the internal domain event in
the publisher adapter, never leak internal types. Version them from day one (`v1` in the name or a
`version` field).

## 6. Read models and the command → event → view chain

Every read model in `discover.read_models` (and every `query` message in connect) becomes:
name, the events that feed it (`source_events` — discover ids), who reads it, where it lives
(same DB view/table for a monolith; separate projection table or cache when fed by another
context's events). Read models are built by projectors reacting to events; they are rebuildable.
Do not load aggregates to answer queries. Specify each slice Event-Modeling style:
*Given* these events, *When* this command / this query, *Then* these events / this view.

## 7. Tests — what must exist, by name

| Kind | One per | Name pattern | Lives in |
|---|---|---|---|
| Invariant test | aggregate invariant | `rejects <violation>` / `keeps <rule>` — wording identical to `code.json` `aggregates[].invariants[]` | `tests/domain` |
| Transition test | allowed and rejected state transition | `moves from <a> to <b> on <command>`, `cannot <command> when <state>` | `tests/domain` |
| Use-case test | application service | `Given <events> when <command> then <events>` with in-memory adapters | `tests/application` |
| Contract test | published event | `contract: <event-id>` — payload equals the connect contract, nothing more | `tests/contracts` |
| Idempotency test | consumed at-least-once event | `idempotent: <event-id>` — handling twice = once | `tests/contracts` |
| Adapter test | driven adapter | repository round-trip, gateway translation against a fake/recorded vendor response | `tests/adapters` |
| Fitness test | module | "domain imports nothing from adapters/framework" (§8) | `tests/architecture` |

Pattern shapes (Khononov): domain model → pyramid (mostly domain/use-case tests); transaction
script/active record → reversed pyramid (mostly store-backed integration tests); event-sourced →
diamond (aggregate decision tests + projection/replay tests).

## 8. Guardrails for AI coding agents (2025–2026 practice)

Coding agents optimise for making the immediate feature work, not for preserving boundaries. What
holds the design together when an agent writes the code:

1. **A dependency-free domain layer, enforced by a test that runs in CI**: ArchUnit (Java/Kotlin),
   Spring Modulith `verify()`, NetArchTest / ArchUnitNET (C#), dependency-cruiser or
   eslint-plugin-boundaries (TS), import-linter (Python), `internal/` packages + go-arch-lint (Go).
   Start with 3–5 rules on the critical boundaries: domain → nothing outward; application →
   domain only; adapters → anything; contexts → only each other's published API.
2. **Rules the agent can read**: put the layout of §3, the forbidden imports and the port/adapter
   naming into `CLAUDE.md` / `AGENTS.md` / rules files. Say "one interface per use case",
   "never import the ORM/framework in `domain/`", "in-memory adapter for every driven port".
3. **Invariants as failing tests before implementation** — the plan's slices name the tests; the
   agent must see them fail first (superpowers:test-driven-development / dev-tdd).
4. **Small units**: one aggregate per file/folder, one use case per file, so an edit fits one
   bounded concern in the context window.
5. **Review for drift**, not just for correctness: a passing feature that added a repository call
   inside an aggregate is a regression.

## Sources (accessed 2026-08-29)

- Alistair Cockburn, *Hexagonal Architecture* — https://alistair.cockburn.us/hexagonal-architecture/
  (intent, primary/secondary ports, "port = purpose of conversation", 2–4 ports, test adapters);
  Juan Manuel Garrido de Paz, *Hexagonal Me* — https://jmgarridopaz.github.io/ (one port, many
  adapters; back-door vs round-trip tests); book: Cockburn & Garrido de Paz, *Hexagonal Architecture
  Explained* (2024)
- Jeffrey Palermo, *The Onion Architecture, part 1* — https://jeffreypalermo.com/2008/07/the-onion-architecture-part-1/
- Robert C. Martin, *The Clean Architecture* — https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html
- Adam Dymitruk, *Event Modeling* — https://eventmodeling.org/ (slices = one command or one view; GWT per slice)
- Alberto Brandolini, *EventStorming* — https://www.eventstorming.com/ ; https://ddd-crew.github.io/eventstorming-glossary-cheat-sheet/
- Vlad Khononov, *Learning DDD* ch. 10 (pattern ↔ architecture ↔ test shape) — https://www.oreilly.com/library/view/learning-domain-driven-design/9781098100124/
- Thoughtworks Technology Radar, *AI-friendly code design* (Apr 2025) — https://www.thoughtworks.com/radar/techniques/ai-friendly-code-design
- Darko Špoljarić, *Claude Code meets hexagonal architecture* (Oct 2025) — https://wearenotch.com/blog/claude-code-meets-hexagonal-architecture/
- Loiane Groner, *Architecture testing for Java with ArchUnit* (Jul 2026) — https://loiane.com/2026/07/architecture-testing-java-archunit/
- ddd-crew, *ai-ddd-prompts-and-rules* — https://github.com/ddd-crew/ai-ddd-prompts-and-rules
- Bardia Khosravi, *Backend coding rules for AI coding agents: DDD and hexagonal architecture* (Jul 2025) — https://medium.com/@bardia.khosravi/backend-coding-rules-for-ai-coding-agents-ddd-and-hexagonal-architecture-ecafe91c753f
