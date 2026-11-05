# Build — stack references (former `stack` plugin)

What does this library get wrong? Twenty-four references for specific libraries, frameworks and
languages, each carrying the API detail and the gotchas a model otherwise guesses at. Twenty-three
are topics of four router skills — `animation`, `react-typescript`, `data` and `systems` — that
read only the topic's `topics/<topic>/GUIDE.md`; `dotnet-backend-patterns` stays a skill of its
own. Start with the topic named after the library you are touching (`gsap-core` for any GSAP
question, `motion-foundations` before the other motion topics). Twenty-three are vendored from
upstream projects — several are the library authors' own official skills — and maintained here;
`server-component-rules` is first-party. Patterns that are not tied to one library live
elsewhere: saga orchestration in [Shape](architecture.md), principles in [craft](craft.md).

This area is part of the `software` plugin; see the [plugin README](../../README.md). Cite a topic
as `software:<router>` (topic `<topic>`), for example `software:animation` (topic `gsap-core`).

## Skills

### Animation and video

| Skill | Use it when |
|---|---|
| `animation` | Animation and motion for the web and video. Router over the eleven topics below. |

| Topic | Use it when |
|---|---|
| `gsap-core` | Writing or reviewing GSAP tweens: `to`/`from`/`fromTo`, transform aliases vs raw `transform`, `autoAlpha`, `immediateRender` on stacked `from()` tweens, directional rotation, `clearProps`, the full ease table, `gsap.matchMedia()` for breakpoints and reduced motion. Start here for any GSAP question. |
| `gsap-timeline` | Sequencing several tweens: the position parameter (`+=`, `<`, labels), timeline defaults, nesting, playback control, and the rule that ScrollTrigger goes on the timeline, not its children. |
| `gsap-scrolltrigger` | Scroll-linked animation, pinning, scrub, `batch()`, `scrollerProxy` for third-party smooth scroll, fake horizontal scroll with `containerAnimation`, `refreshPriority` ordering. |
| `gsap-plugins` | Any GSAP plugin: Flip, Draggable and Inertia, Observer, SplitText, DrawSVG, MorphSVG, MotionPath, physics, CustomEase, GSDevTools, Pixi; registration and the current (all-free) licensing. |
| `gsap-utils` | `gsap.utils` helpers: clamp, mapRange, normalize, interpolate, random, snap, distribute, toArray, wrap, pipe, selector. |
| `gsap-react` | GSAP in React or Next.js: the `useGSAP` hook, scope, `contextSafe`, `gsap.context()` + `ctx.revert()` fallback, SSR rules. |
| `gsap-frameworks` | GSAP in Vue, Nuxt, Svelte or SvelteKit: create on mount, revert on unmount, scoped selectors, SSR-safe plugin registration. Ships small runnable Vue and Nuxt examples under `references/examples/`. |
| `motion-foundations` | Setting up `motion/react` in a React or Next.js app: token and spring presets, a `shouldAnimate` gate, reduced-motion and SSR hydration rules. The base the other two motion topics import from. |
| `motion-patterns` | Animating a specific UI element with `motion/react`: AnimatePresence, stagger, page transitions, scroll reveal, layout animations, modal accessibility requirements. |
| `motion-advanced` | Drag and gestures, text and SVG animation, `useAnimate` sequences, loaders, custom hooks with `motion/react`. |
| `remotion-best-practices` | Writing or reviewing Remotion code: compositions, sequencing, timing, audio, captions, charts, transitions, fonts, 3D, FFmpeg. Forty-one rule files loaded on demand. |

### React, UI and TypeScript

| Skill | Use it when |
|---|---|
| `react-typescript` | React, Next.js and TypeScript rules a model gets wrong. Router over the five topics below; `typescript-best-practices` applies to every `.ts` or `.tsx` edit, the React topics as needed. |

| Topic | Use it when |
|---|---|
| `react-best-practices` | Writing, reviewing or refactoring React and Next.js code for performance: 45 prioritized rules on waterfalls, bundle size, server-side work, data fetching, re-renders and rendering, one file per rule plus a compiled `AGENTS.md`. |
| `react-useeffect` | Writing or reviewing a `useEffect`, or storing derived values in state. A decision table and tree for when not to use an Effect, with anti-pattern and alternatives references. |
| `server-component-rules` | Writing Next.js App Router components or Server Actions for data access, or deciding between server and client components. House rules: a fixed execution order for DAL Server Actions (flatten the payload, validate, query, paginate, serialize, `returnResponse()`, `handleError()`), server-by-default with `'use client'` only when needed, and two security rules (`server-only` imports, `NEXT_PUBLIC_*` exposure). Assumes a `src/dal/` layer and MongoDB; adapt the helper names to your project. |
| `shadcn` | Adding, composing, styling or debugging shadcn/ui components, initializing a project or switching presets. Enforced styling, form, composition and icon rules with wrong/right pairs; CLI and customization references. Runs the shadcn CLI, see below. |
| `typescript-best-practices` | Reading or editing `.ts` or `.tsx`. Sixteen rules (discriminated unions, branded types, constructive modeling, simplest total type, `unknown` over `any`, narrowing hierarchy, `satisfies` over `as`, exhaustiveness, boundary validation) with before/after code in `references/patterns.md`. The TypeScript form of `software:principles` (topic `principle-type-system-discipline`). |

### Databases

| Skill | Use it when |
|---|---|
| `data` | Relational data rules. Router over the four topics below. |

| Topic | Use it when |
|---|---|
| `postgres-best-practices` | Writing, reviewing or optimizing Postgres queries, schemas, connection pooling or RLS. Supabase's rule set: 37 rule files with wrong/right SQL and EXPLAIN notes, plus a compiled `AGENTS.md`. |
| `postgresql-table-design` | Designing or reviewing a PostgreSQL schema: identity vs UUID, TEXT with CHECK, timestamptz, constraints, index types, JSONB indexing, partitioning, with worked DDL in `references/details.md`. |
| `prisma-patterns` | Writing a Prisma schema or query, or debugging transactions, migrations or serverless connection limits. Version-aware, with the traps spelled out: `updateMany` returns a count, `@updatedAt` is skipped on bulk writes, `migrate dev` can reset the database. |
| `database-migrations` | Any schema or data migration on a live database: safety checklist, expand-contract, `CREATE INDEX CONCURRENTLY`, batched backfills, per-tool workflows for Postgres, Prisma, Drizzle, Kysely, Django and golang-migrate. |

### Systems languages

| Skill | Use it when |
|---|---|
| `systems` | Systems-language references. Router over the three topics below. |

| Topic | Use it when |
|---|---|
| `cpp-coding-standards` | Writing, reviewing or refactoring C++: the C++ Core Guidelines distilled by section with rule IDs, DO/DON'T pairs and a completion checklist. |
| `boost-asio-pro` | Async C++ networking with Boost.Asio or standalone Asio. Picks the style (coroutines, callbacks, classic `io_service`) from the user's actual Boost version with compile-verified feature floors; references for each style, SSL and CMake. |
| `swift-concurrency-expert` | Reviewing Swift concurrency or fixing strict-concurrency diagnostics: actor isolation, Sendable, `@MainActor`, `@concurrent`, with Swift 6.2, approachable-concurrency and SwiftUI references. |

### Backend patterns

| Skill | Use it when |
|---|---|
| `dotnet-backend-patterns` | Building or reviewing a C#/.NET backend: minimal APIs, DI lifetimes, EF Core and Dapper, IOptions, caching, resilience, xUnit; EF Core and Dapper references and C# templates. |

## What these write and where they reach

None of these ships a script, installs a hook, or registers an MCP server. Two reach
outside the conversation through commands they tell Claude to run:

- `shadcn` starts by running `npx shadcn@latest info --json` in the current project to read its
  config and installed components (`npx` may download the `shadcn` package the first time);
  nothing runs when the skill or topic merely loads. The topic then directs further
  `npx shadcn@latest` calls (`search`, `docs`, `add`, `init`) that fetch from component
  registries and write component source into the project, as the CLI is designed to.
- `remotion-best-practices` describes FFmpeg and Remotion CLI commands for the user's own
  project; it runs nothing on load.

`boost-asio-pro` links to its worked examples on GitHub rather than bundling them. The
`typescript-best-practices` guide keeps upstream's `paths` glob (`**/*.ts`, `**/*.tsx`) under
`metadata` in its `GUIDE.md` frontmatter; it is not a hook and runs nothing. Everything else is
prose and code samples read from the skill directory.

## How it works with the rest of the plugin and the others

| Direction | Handoff |
|---|---|
| In | `software:principles` (topic `principle-type-system-discipline`) points TypeScript work at `software:react-typescript` (topic `typescript-best-practices`), which applies that principle and `software:principles` (topic `principle-boundary-discipline`) first. |
| In | The Build pipeline builds the change and Verify reviews it; when either touches a library here, the matching topic holds the library's rules. `software:react-testing` covers tests for the React code that the `react-best-practices`, `react-useeffect` and `server-component-rules` topics of `software:react-typescript` shape. |
| Split | `software:data` (topic `database-migrations`) owns the per-tool migration workflow; `software:migration-architect` owns system-level migration and `software:deprecation-and-migration` code-level deprecation. Saga orchestration is a pattern, not a library, so it lives at `software:saga-orchestration`. |

## Credits

Every vendored reference here is a supply-chain-controlled copy: the upstream repository, path,
commit, date and license for each are recorded in the plugin's [NOTICE.md](../../NOTICE.md)
(section "From the former `stack` plugin"; a row naming a former skill credits that topic), along
with every change made in this copy. Upstream is re-pulled deliberately, by diffing against the
recorded commit, not tracked live. `typescript-best-practices` is from Lauren Tan's pstack in
[cursor/plugins](https://github.com/cursor/plugins) at commit `9d76bca` (2026-10-11), MIT
([`LICENSE-pstack.txt`](../../LICENSE-pstack.txt)). `server-component-rules` came from the former
`dev` plugin, whose README said parts of that plugin are adapted from obra/superpowers,
HumanLayer, wshobson/agents and BMAD-METHOD with credit in the skill files; this file names no
upstream. The GSAP set is GreenSock's official skills; `shadcn` is shadcn/ui's,
`postgres-best-practices` is Supabase's, `react-best-practices` is Vercel's and
`remotion-best-practices` is Remotion's, each reached through a mirror repository named in
NOTICE.md. The other sources are affaan-m/ECC (`prisma-patterns`, `database-migrations`,
`cpp-coding-standards`, the three motion topics), davila7/claude-code-templates
(`react-useeffect`, `swift-concurrency-expert`), alirezarezvani/claude-skills (`boost-asio-pro`)
and wshobson/agents (`postgresql-table-design`, `dotnet-backend-patterns`).

## Invoking

`/software:animation`, `/software:react-typescript`, `/software:data`, `/software:systems` and
`/software:dotnet-backend-patterns`; name the topic you want, or let the router pick it from the
files you touch. Skills cross-reference the topics as `software:animation` (topic `gsap-timeline`),
`software:animation` (topic `motion-foundations`), and so on.
