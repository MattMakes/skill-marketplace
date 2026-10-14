# stack — Stack References

Twenty-three reference skills for specific libraries, frameworks and languages, each carrying the
API detail and the gotchas a model otherwise guesses at. All of them are vendored from upstream
projects — several are the library authors' own official skills — and maintained here.

```bash
claude plugin install stack@skill-marketplace
```

## Skills

### Animation and video

| Skill | Use it when |
|---|---|
| `gsap-core` | Writing or reviewing GSAP tweens: `to`/`from`/`fromTo`, transform aliases vs raw `transform`, `autoAlpha`, `immediateRender` on stacked `from()` tweens, directional rotation, `clearProps`, the full ease table, `gsap.matchMedia()` for breakpoints and reduced motion. Start here for any GSAP question. |
| `gsap-timeline` | Sequencing several tweens: the position parameter (`+=`, `<`, labels), timeline defaults, nesting, playback control, and the rule that ScrollTrigger goes on the timeline, not its children. |
| `gsap-scrolltrigger` | Scroll-linked animation, pinning, scrub, `batch()`, `scrollerProxy` for third-party smooth scroll, fake horizontal scroll with `containerAnimation`, `refreshPriority` ordering. |
| `gsap-plugins` | Any GSAP plugin: Flip, Draggable and Inertia, Observer, SplitText, DrawSVG, MorphSVG, MotionPath, physics, CustomEase, GSDevTools, Pixi; registration and the current (all-free) licensing. |
| `gsap-utils` | `gsap.utils` helpers: clamp, mapRange, normalize, interpolate, random, snap, distribute, toArray, wrap, pipe, selector. |
| `gsap-react` | GSAP in React or Next.js: the `useGSAP` hook, scope, `contextSafe`, `gsap.context()` + `ctx.revert()` fallback, SSR rules. |
| `gsap-frameworks` | GSAP in Vue, Nuxt, Svelte or SvelteKit: create on mount, revert on unmount, scoped selectors, SSR-safe plugin registration. Ships small runnable Vue and Nuxt examples under `references/examples/`. |
| `motion-foundations` | Setting up `motion/react` in a React or Next.js app: token and spring presets, a `shouldAnimate` gate, reduced-motion and SSR hydration rules. The base the other two motion skills import from. |
| `motion-patterns` | Animating a specific UI element with `motion/react`: AnimatePresence, stagger, page transitions, scroll reveal, layout animations, modal accessibility requirements. |
| `motion-advanced` | Drag and gestures, text and SVG animation, `useAnimate` sequences, loaders, custom hooks with `motion/react`. |
| `remotion-best-practices` | Writing or reviewing Remotion code: compositions, sequencing, timing, audio, captions, charts, transitions, fonts, 3D, FFmpeg. Forty-one rule files loaded on demand. |

### React and UI

| Skill | Use it when |
|---|---|
| `react-best-practices` | Writing, reviewing or refactoring React and Next.js code for performance: 45 prioritized rules on waterfalls, bundle size, server-side work, data fetching, re-renders and rendering, one file per rule plus a compiled `AGENTS.md`. |
| `react-useeffect` | Writing or reviewing a `useEffect`, or storing derived values in state. A decision table and tree for when not to use an Effect, with anti-pattern and alternatives references. |
| `shadcn` | Adding, composing, styling or debugging shadcn/ui components, initializing a project or switching presets. Enforced styling, form, composition and icon rules with wrong/right pairs; CLI and customization references. Runs the shadcn CLI, see below. |

### Databases

| Skill | Use it when |
|---|---|
| `postgres-best-practices` | Writing, reviewing or optimizing Postgres queries, schemas, connection pooling or RLS. Supabase's rule set: 37 rule files with wrong/right SQL and EXPLAIN notes, plus a compiled `AGENTS.md`. |
| `postgresql-table-design` | Designing or reviewing a PostgreSQL schema: identity vs UUID, TEXT with CHECK, timestamptz, constraints, index types, JSONB indexing, partitioning, with worked DDL in `references/details.md`. |
| `prisma-patterns` | Writing a Prisma schema or query, or debugging transactions, migrations or serverless connection limits. Version-aware, with the traps spelled out: `updateMany` returns a count, `@updatedAt` is skipped on bulk writes, `migrate dev` can reset the database. |
| `database-migrations` | Any schema or data migration on a live database: safety checklist, expand-contract, `CREATE INDEX CONCURRENTLY`, batched backfills, per-tool workflows for Postgres, Prisma, Drizzle, Kysely, Django and golang-migrate. |

### Systems languages

| Skill | Use it when |
|---|---|
| `cpp-coding-standards` | Writing, reviewing or refactoring C++: the C++ Core Guidelines distilled by section with rule IDs, DO/DON'T pairs and a completion checklist. |
| `boost-asio-pro` | Async C++ networking with Boost.Asio or standalone Asio. Picks the style (coroutines, callbacks, classic `io_service`) from the user's actual Boost version with compile-verified feature floors; references for each style, SSL and CMake. |
| `swift-concurrency-expert` | Reviewing Swift concurrency or fixing strict-concurrency diagnostics: actor isolation, Sendable, `@MainActor`, `@concurrent`, with Swift 6.2, approachable-concurrency and SwiftUI references. |

### Backend patterns

| Skill | Use it when |
|---|---|
| `dotnet-backend-patterns` | Building or reviewing a C#/.NET backend: minimal APIs, DI lifetimes, EF Core and Dapper, IOptions, caching, resilience, xUnit; EF Core and Dapper references and C# templates. |
| `saga-orchestration` | Distributed transactions without 2PC: orchestration vs choreography, compensation design, idempotent steps, per-step timeouts, stuck-saga troubleshooting, with full orchestrator implementations in `references/`. |

## What these write and where they reach

None of these skills ships a script, installs a hook, or registers an MCP server. Two reach
outside the conversation through commands they tell Claude to run:

- `shadcn` starts by running `npx shadcn@latest info --json` in the current project to read its
  config and installed components (`npx` may download the `shadcn` package the first time);
  nothing runs when the skill merely loads. The skill then directs further `npx shadcn@latest`
  calls (`search`, `docs`, `add`, `init`) that fetch from component registries and write
  component source into the project, as the CLI is designed to.
- `remotion-best-practices` describes FFmpeg and Remotion CLI commands for the user's own
  project; it runs nothing on load.

`boost-asio-pro` links to its worked examples on GitHub rather than bundling them. Everything
else is prose and code samples read from the skill directory.

## Credits

Every skill here is a vendored, supply-chain-controlled copy: the upstream repository, path,
commit, date and license for each are recorded in [NOTICE.md](NOTICE.md), along with every
change made in this copy. Upstream is re-pulled deliberately, by diffing against the recorded
commit, not tracked live. The GSAP set is GreenSock's official skills; `shadcn` is shadcn/ui's,
`postgres-best-practices` is Supabase's, `react-best-practices` is Vercel's and
`remotion-best-practices` is Remotion's, each reached through a mirror repository named in
NOTICE.md.

## Invoking

Namespaced under the plugin: `stack:gsap-core`, `stack:react-best-practices`, `stack:prisma-patterns`,
and so on. The skills cross-reference each other in that form (`stack:gsap-timeline`,
`stack:motion-foundations`).
