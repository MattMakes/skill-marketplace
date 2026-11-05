# stack — Stack References

What does this library get wrong? Twenty-four reference skills for specific libraries,
frameworks and languages, each carrying the API detail and the gotchas a model otherwise guesses
at. Start with the skill named after the library you are touching (`gsap-core` for any GSAP
question, `motion-foundations` before the other motion skills). Twenty-three are vendored from
upstream projects — several are the library authors' own official skills — and maintained here;
`server-component-rules` is first-party. Patterns that are not tied to one library
live elsewhere: saga orchestration in `architecture`, principles in `craft`.

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
| `server-component-rules` | Writing Next.js App Router components or Server Actions for data access, or deciding between server and client components. House rules: a fixed execution order for DAL Server Actions (flatten the payload, validate, query, paginate, serialize, `returnResponse()`, `handleError()`), server-by-default with `'use client'` only when needed, and two security rules (`server-only` imports, `NEXT_PUBLIC_*` exposure). Assumes a `src/dal/` layer and MongoDB; adapt the helper names to your project. |
| `shadcn` | Adding, composing, styling or debugging shadcn/ui components, initializing a project or switching presets. Enforced styling, form, composition and icon rules with wrong/right pairs; CLI and customization references. Runs the shadcn CLI, see below. |

### TypeScript

| Skill | Use it when |
|---|---|
| `typescript-best-practices` | Reading or editing `.ts` or `.tsx`. Sixteen rules (discriminated unions, branded types, constructive modeling, simplest total type, `unknown` over `any`, narrowing hierarchy, `satisfies` over `as`, exhaustiveness, boundary validation) with before/after code in `references/patterns.md`. The TypeScript form of `craft:principle-type-system-discipline`. |

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

`boost-asio-pro` links to its worked examples on GitHub rather than bundling them.
`typescript-best-practices` carries a `paths` glob (`**/*.ts`, `**/*.tsx`) under `metadata`; it
is not a hook and runs nothing. Everything else is prose and code samples read from the skill
directory.

## How it works with the other plugins

| Direction | Handoff |
|---|---|
| In | `craft:principle-type-system-discipline` points TypeScript work at `stack:typescript-best-practices`, which applies that principle and `craft:principle-boundary-discipline` first. |
| In | `dev` builds the change and `verify` reviews it; when either touches a library here, the matching `stack` skill holds the library's rules. `verify:react-testing` covers tests for the React code that `react-best-practices`, `react-useeffect` and `server-component-rules` shape. |
| Split | `stack:database-migrations` owns the per-tool migration workflow; `ops:migration-architect` owns system-level migration and `craft:deprecation-and-migration` code-level deprecation. Saga orchestration is a pattern, not a library, so it lives at `architecture:saga-orchestration`. |

## Credits

Every vendored skill here is a supply-chain-controlled copy: the upstream repository, path,
commit, date and license for each are recorded in [NOTICE.md](NOTICE.md), along with every
change made in this copy. Upstream is re-pulled deliberately, by diffing against the recorded
commit, not tracked live. `typescript-best-practices` is from Lauren Tan's pstack in
[cursor/plugins](https://github.com/cursor/plugins) at commit `9d76bca` (2026-10-11), MIT
(`LICENSE-pstack.txt`). `server-component-rules` came from `dev`, whose README says parts of that
plugin are adapted from obra/superpowers, HumanLayer, wshobson/agents and BMAD-METHOD with credit
in the skill files; this skill file names no upstream. The GSAP set is
GreenSock's official skills; `shadcn` is shadcn/ui's, `postgres-best-practices` is Supabase's,
`react-best-practices` is Vercel's and `remotion-best-practices` is Remotion's, each reached
through a mirror repository named in NOTICE.md.

## Moved in v3

| Before | After |
|---|---|
| `dev:server-component-rules` | `stack:server-component-rules` |
| `pstack:typescript-best-practices` | `stack:typescript-best-practices` |
| `stack:saga-orchestration` | `architecture:saga-orchestration` |

## Invoking

Namespaced under the plugin: `/stack:gsap-core`, `/stack:react-best-practices`,
`/stack:typescript-best-practices`, and so on. The skills cross-reference each other in that form (`stack:gsap-timeline`,
`stack:motion-foundations`).
